import { Participant } from './Participant.js';
import {
  PlaybackState,
  PendingActionRequest,
  Role,
  RoomStateResponse,
  ParticipantSummary,
  RequestStatus,
} from '../types/index.js';

export class Room {
  public readonly roomCode: string;
  public hostId: string;
  public playbackState: PlaybackState;
  public participants: Map<string, Participant>;
  public pendingRequests: Map<string, PendingActionRequest>;
  public readonly createdAt: number;

  constructor(roomCode: string, hostParticipant: Participant) {
    this.roomCode = roomCode;
    this.hostId = hostParticipant.id;
    this.createdAt = Date.now();
    this.participants = new Map();
    this.pendingRequests = new Map();

    // Default playback state (initial default sample video can be empty or a standard default)
    this.playbackState = {
      videoId: 'dQw4w9WgXcQ', // default video: Rick Astley - Never Gonna Give You Up (classic test video)
      isPlaying: false,
      currentTime: 0,
      updatedAt: Date.now(),
    };

    this.participants.set(hostParticipant.id, hostParticipant);
  }

  public addParticipant(participant: Participant): void {
    this.participants.set(participant.id, participant);
  }

  public removeParticipant(participantId: string): Participant | null {
    const participant = this.participants.get(participantId);
    if (!participant) return null;
    this.participants.delete(participantId);

    // Also remove any pending requests submitted by this participant
    for (const [requestId, req] of this.pendingRequests.entries()) {
      if (req.requesterId === participantId) {
        this.pendingRequests.delete(requestId);
      }
    }

    return participant;
  }

  public getParticipant(participantId: string): Participant | undefined {
    return this.participants.get(participantId);
  }

  public setRole(participantId: string, newRole: Role): boolean {
    const participant = this.participants.get(participantId);
    if (!participant) return false;
    participant.setRole(newRole);
    return true;
  }

  /**
   * Calculates the authoritative current playback time accounting for elapsed time while playing.
   */
  public getEstimatedCurrentTime(): number {
    if (!this.playbackState.isPlaying) {
      return this.playbackState.currentTime;
    }
    const elapsedSeconds = (Date.now() - this.playbackState.updatedAt) / 1000;
    return Math.max(0, this.playbackState.currentTime + elapsedSeconds);
  }

  /**
   * Updates the authoritative playback state.
   */
  public updatePlaybackState(partial: Partial<PlaybackState>): PlaybackState {
    const now = Date.now();

    // If currentTime was not passed but isPlaying status changed, calculate current estimated time
    let newTime = partial.currentTime;
    if (newTime === undefined) {
      newTime = this.getEstimatedCurrentTime();
    }

    this.playbackState = {
      ...this.playbackState,
      ...partial,
      currentTime: Math.max(0, newTime),
      updatedAt: now,
    };

    return { ...this.playbackState };
  }

  public addRequest(request: PendingActionRequest): void {
    this.pendingRequests.set(request.id, request);
  }

  public getRequest(requestId: string): PendingActionRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  public resolveRequest(
    requestId: string,
    status: RequestStatus,
    resolvedBy: string
  ): PendingActionRequest | null {
    const request = this.pendingRequests.get(requestId);
    if (!request) return null;

    request.status = status;
    request.resolvedAt = Date.now();
    request.resolvedBy = resolvedBy;

    // Remove from active pending requests
    this.pendingRequests.delete(requestId);
    return request;
  }

  public getParticipantsList(): ParticipantSummary[] {
    return Array.from(this.participants.values()).map((p) => p.toSummary());
  }

  public getPendingRequestsList(): PendingActionRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  public getStateResponse(forParticipantId: string): RoomStateResponse {
    const participant = this.participants.get(forParticipantId);
    return {
      roomCode: this.roomCode,
      hostId: this.hostId,
      currentParticipantId: forParticipantId,
      currentRole: participant ? participant.role : 'PARTICIPANT',
      playbackState: {
        ...this.playbackState,
        currentTime: this.getEstimatedCurrentTime(),
      },
      participants: this.getParticipantsList(),
      pendingRequests: this.getPendingRequestsList(),
    };
  }

  public isEmpty(): boolean {
    return this.participants.size === 0;
  }
}

