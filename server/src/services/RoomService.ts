import crypto from 'node:crypto';
import { Room } from '../classes/Room.js';
import { Participant } from '../classes/Participant.js';
import { RoomManager } from '../classes/RoomManager.js';
import { PlaybackService } from './PlaybackService.js';
import {
  ActionType,
  ActionPayload,
  PendingActionRequest,
  RequestStatus,
  Role,
  PlaybackState,
} from '../types/index.js';
import {
  canAssignRoles,
  canRemoveParticipant,
  canResolveRequests,
  canRequestAction,
} from '../middleware/permissions.js';
import { extractYouTubeVideoId } from '../utils/youtube.js';

export class RoomService {
  private static instance: RoomService;
  private roomManager: RoomManager;
  private playbackService: PlaybackService;

  private constructor() {
    this.roomManager = RoomManager.getInstance();
    this.playbackService = PlaybackService.getInstance();
  }

  public static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  /**
   * Assigns or changes a participant's role (Host only).
   */
  public assignRole(
    room: Room,
    actor: Participant,
    targetParticipantId: string,
    newRole: 'MODERATOR' | 'PARTICIPANT'
  ): { success: boolean; target?: Participant; error?: string } {
    if (!canAssignRoles(actor.role)) {
      return { success: false, error: 'Unauthorized: Only the Host can assign or change roles.' };
    }

    const target = room.getParticipant(targetParticipantId);
    if (!target) {
      return { success: false, error: 'Target participant not found in this room.' };
    }

    if (target.id === room.hostId) {
      return { success: false, error: 'Cannot change the Host role.' };
    }

    if (newRole !== 'MODERATOR' && newRole !== 'PARTICIPANT') {
      return { success: false, error: 'Invalid role requested.' };
    }

    room.setRole(targetParticipantId, newRole);
    return { success: true, target };
  }

  /**
   * Removes a participant from the room.
   */
  public removeParticipant(
    room: Room,
    actor: Participant,
    targetParticipantId: string
  ): { success: boolean; target?: Participant; error?: string } {
    const target = room.getParticipant(targetParticipantId);
    if (!target) {
      return { success: false, error: 'Target participant not found in room.' };
    }

    const isSelf = actor.id === targetParticipantId;
    if (!canRemoveParticipant(actor.role, target.role, isSelf)) {
      return { success: false, error: 'Unauthorized: You do not have permission to remove this user.' };
    }

    const removed = room.removeParticipant(targetParticipantId);
    if (!removed) {
      return { success: false, error: 'Failed to remove participant.' };
    }

    return { success: true, target: removed };
  }

  /**
   * Submits a new participant action request.
   */
  public createActionRequest(
    room: Room,
    requester: Participant,
    actionType: ActionType,
    payload?: ActionPayload
  ): { success: boolean; request?: PendingActionRequest; error?: string } {
    if (!canRequestAction(requester.role)) {
      return { success: false, error: 'Unauthorized: You cannot submit requests.' };
    }

    // Pre-validate payloads
    if (actionType === 'CHANGE_VIDEO') {
      const videoInput = payload?.videoUrlOrId || payload?.videoId || '';
      const validId = extractYouTubeVideoId(videoInput);
      if (!validId) {
        return { success: false, error: 'Invalid YouTube URL or Video ID in request.' };
      }
      payload = { ...payload, videoId: validId };
    } else if (actionType === 'SEEK') {
      if (typeof payload?.currentTime !== 'number' || payload.currentTime < 0 || isNaN(payload.currentTime)) {
        return { success: false, error: 'Invalid seek time in request.' };
      }
    }

    const request: PendingActionRequest = {
      id: crypto.randomUUID(),
      roomCode: room.roomCode,
      requesterId: requester.id,
      requesterName: requester.displayName,
      actionType,
      payload,
      status: 'PENDING',
      createdAt: Date.now(),
    };

    room.addRequest(request);
    return { success: true, request };
  }

  /**
   * Resolves a pending action request (APPROVE or REJECT).
   */
  public resolveActionRequest(
    room: Room,
    actor: Participant,
    requestId: string,
    status: 'APPROVED' | 'REJECTED'
  ): {
    success: boolean;
    request?: PendingActionRequest;
    resultingPlaybackState?: PlaybackState;
    error?: string;
  } {
    if (!canResolveRequests(actor.role)) {
      return { success: false, error: 'Unauthorized: Only Host and Moderators can resolve requests.' };
    }

    const existingRequest = room.getRequest(requestId);
    if (!existingRequest) {
      return { success: false, error: 'Request not found or already resolved.' };
    }

    // Prevent approving one's own request
    if (existingRequest.requesterId === actor.id) {
      return { success: false, error: 'Users cannot approve or reject their own requests.' };
    }

    const resolved = room.resolveRequest(requestId, status, actor.displayName);
    if (!resolved) {
      return { success: false, error: 'Failed to resolve request.' };
    }

    let resultingPlaybackState: PlaybackState | undefined;

    // If APPROVED, execute the requested action authoritatively
    if (status === 'APPROVED') {
      // Create a temporary execution context with actor's authority
      if (resolved.actionType === 'PLAY') {
        const res = this.playbackService.handlePlay(room, actor, resolved.payload?.currentTime);
        if (res.success) resultingPlaybackState = res.state;
      } else if (resolved.actionType === 'PAUSE') {
        const res = this.playbackService.handlePause(room, actor, resolved.payload?.currentTime);
        if (res.success) resultingPlaybackState = res.state;
      } else if (resolved.actionType === 'SEEK') {
        const targetTime = resolved.payload?.currentTime ?? 0;
        const res = this.playbackService.handleSeek(room, actor, targetTime);
        if (res.success) resultingPlaybackState = res.state;
      } else if (resolved.actionType === 'CHANGE_VIDEO') {
        const vid = resolved.payload?.videoId || resolved.payload?.videoUrlOrId || '';
        const res = this.playbackService.handleChangeVideo(room, actor, vid);
        if (res.success) resultingPlaybackState = res.state;
      }
    }

    return {
      success: true,
      request: resolved,
      resultingPlaybackState,
    };
  }
}

