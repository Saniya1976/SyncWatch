import crypto from 'node:crypto';
import { Room } from './Room.js';
import { Participant } from './Participant.js';

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, Room>;
  // Socket ID -> room code mapping for quick lookups on disconnect
  private socketToRoomMap: Map<string, string>;

  private constructor() {
    this.rooms = new Map();
    this.socketToRoomMap = new Map();
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
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars like 0, O, 1, I
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
    displayName: string
  ): { room: Room; participant: Participant } | { error: string } {
    const cleanCode = roomCode ? roomCode.trim().toUpperCase() : '';
    const room = this.rooms.get(cleanCode);

    if (!room) {
      return { error: 'Room does not exist or has expired.' };
    }

    // If participant is already in room (e.g. host who just created it), preserve their role
    const existing = room.getParticipant(socketId);
    if (existing) {
      if (displayName && displayName.trim()) {
        existing.displayName = displayName.trim();
      }
      existing.setOnline(true);
      return { room, participant: existing };
    }

    const cleanName = displayName.trim() || `User_${socketId.slice(-4)}`;
    const participant = new Participant(socketId, cleanName, 'PARTICIPANT');

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

    // If room is empty, safely clean it up
    if (room.isEmpty()) {
      this.rooms.delete(targetCode);
    }

    return { room, participant };
  }

  public getActiveRoomCount(): number {
    return this.rooms.size;
  }
}

