import crypto from 'node:crypto';
import { Room } from './Room.js';
import { Participant } from './Participant.js';

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, Room>;
  // Socket ID -> room code mapping for quick lookups on disconnect
  private socketToRoomMap: Map<string, string>;
  // Grace period timeouts for empty rooms to avoid instant deletion on refresh
  private emptyRoomTimeouts: Map<string, NodeJS.Timeout>;

  private constructor() {
    this.rooms = new Map();
    this.socketToRoomMap = new Map();
    this.emptyRoomTimeouts = new Map();
  }

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Generates a clean 6-character uppercase alphanumeric room code (e.g. WX9J2K).
   */
  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let code: string;
    let attempts = 0;

    do {
      code = '';
      const bytes = crypto.randomBytes(6);
      for (let i = 0; i < 6; i++) {
        code += chars[bytes[i] % chars.length];
      }
      attempts++;
      if (attempts > 100) {
        code = `${code}${Date.now().toString().slice(-2)}`;
        break;
      }
    } while (this.rooms.has(code));

    return code;
  }

  public createRoom(socketId: string, displayName: string): { room: Room; host: Participant } {
    const cleanName = displayName.trim() || 'Host';
    const roomCode = this.generateRoomCode();
    const host = new Participant(socketId, cleanName, 'HOST');
    const room = new Room(roomCode, host);

    this.rooms.set(roomCode, room);
    this.socketToRoomMap.set(socketId, roomCode);

    return { room, host };
  }

  public getRoom(roomCode: string): Room | undefined {
    if (!roomCode) return undefined;
    return this.rooms.get(roomCode.trim().toUpperCase());
  }

  public joinRoom(
    roomCode: string,
    socketId: string,
    displayName: string,
    hostToken?: string
  ): { room: Room; participant: Participant } | { error: string } {
    const cleanCode = roomCode ? roomCode.trim().toUpperCase() : '';
    const room = this.rooms.get(cleanCode);

    if (!room) {
      return { error: 'Room does not exist or has expired.' };
    }

    // Cancel any scheduled deletion for this room
    if (this.emptyRoomTimeouts.has(cleanCode)) {
      clearTimeout(this.emptyRoomTimeouts.get(cleanCode)!);
      this.emptyRoomTimeouts.delete(cleanCode);
    }

    const isHost = Boolean(hostToken && hostToken === room.hostToken);
    if (isHost) {
      room.hostId = socketId;
    }

    // If participant is already in room (e.g. host who just created it, or reconnecting socket), preserve their role
    const existing = room.getParticipant(socketId);
    if (existing) {
      if (displayName && displayName.trim()) {
        existing.displayName = displayName.trim();
      }
      if (isHost) {
        existing.setRole('HOST');
      }
      existing.setOnline(true);
      return { room, participant: existing };
    }

    // Handle duplicate or missing display names
    let baseName = displayName ? displayName.trim() : '';
    if (!baseName) {
      baseName = isHost ? 'Host' : `User_${socketId.slice(-4)}`;
    }

    // Collect existing names in room (case-insensitive) to prevent collisions
    const existingNames = new Set(
      Array.from(room.participants.values()).map((p) => p.displayName.trim().toLowerCase())
    );

    let finalName = baseName;
    if (existingNames.has(finalName.toLowerCase())) {
      let counter = 2;
      while (existingNames.has(`${baseName.toLowerCase()} (${counter})`)) {
        counter++;
      }
      finalName = `${baseName} (${counter})`;
    }

    const participant = new Participant(socketId, finalName, isHost ? 'HOST' : 'PARTICIPANT');

    room.addParticipant(participant);
    this.socketToRoomMap.set(socketId, cleanCode);

    return { room, participant };
  }

  public getRoomCodeForSocket(socketId: string): string | undefined {
    return this.socketToRoomMap.get(socketId);
  }

  public removeParticipantFromRoom(
    socketId: string,
    roomCode?: string
  ): { room: Room; participant: Participant | null } | null {
    const targetCode = roomCode || this.socketToRoomMap.get(socketId);
    if (!targetCode) return null;

    const room = this.rooms.get(targetCode);
    if (!room) {
      this.socketToRoomMap.delete(socketId);
      return null;
    }

    const participant = room.removeParticipant(socketId);
    this.socketToRoomMap.delete(socketId);

    // If room is empty, keep it alive for a 1-hour grace period before cleaning up
    if (room.isEmpty()) {
      if (this.emptyRoomTimeouts.has(targetCode)) {
        clearTimeout(this.emptyRoomTimeouts.get(targetCode)!);
      }
      const timer = setTimeout(() => {
        const currentRoom = this.rooms.get(targetCode);
        if (currentRoom && currentRoom.isEmpty()) {
          this.rooms.delete(targetCode);
        }
        this.emptyRoomTimeouts.delete(targetCode);
      }, 60 * 60 * 1000); // 1 hour expiry when completely empty

      this.emptyRoomTimeouts.set(targetCode, timer);
    }

    return { room, participant };
  }

  public endRoom(roomCode: string): boolean {
    const cleanCode = roomCode ? roomCode.trim().toUpperCase() : '';
    if (this.emptyRoomTimeouts.has(cleanCode)) {
      clearTimeout(this.emptyRoomTimeouts.get(cleanCode)!);
      this.emptyRoomTimeouts.delete(cleanCode);
    }
    return this.rooms.delete(cleanCode);
  }

  public getActiveRoomCount(): number {
    return this.rooms.size;
  }
}
