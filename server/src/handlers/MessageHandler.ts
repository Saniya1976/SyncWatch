import { Server, Socket } from 'socket.io';
import { RoomManager } from '../classes/RoomManager.js';
import { RoomService } from '../services/RoomService.js';
import { PlaybackService } from '../services/PlaybackService.js';
import {
  CreateRoomPayload,
  JoinRoomPayload,
  LeaveRoomPayload,
  PlaybackControlPayload,
  SeekPayload,
  ChangeVideoPayload,
  AssignRolePayload,
  RemoveParticipantPayload,
  RequestActionPayload,
  ResolveRequestPayload,
  SocketAckResponse,
  RoomStateResponse,
} from '../types/index.js';

export class MessageHandler {
  private io: Server;
  private roomManager: RoomManager;
  private roomService: RoomService;
  private playbackService: PlaybackService;

  constructor(io: Server) {
    this.io = io;
    this.roomManager = RoomManager.getInstance();
    this.roomService = RoomService.getInstance();
    this.playbackService = PlaybackService.getInstance();
  }

  public registerEvents(socket: Socket): void {
    // Room creation
    socket.on(
      'create_room',
      (payload: CreateRoomPayload, callback?: (res: SocketAckResponse<RoomStateResponse>) => void) => {
        try {
          const { room } = this.roomManager.createRoom(socket.id, payload?.displayName || 'Host');
          const roomChannel = `room:${room.roomCode}`;
          socket.join(roomChannel);

          const state = room.getStateResponse(socket.id);
          socket.emit('room_created', state);
          if (callback) callback({ success: true, data: state });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create room';
          socket.emit('operation_error', { code: 'CREATE_ROOM_FAILED', message });
          if (callback) callback({ success: false, error: message });
        }
      }
    );

    // Join Room
    socket.on(
      'join_room',
      (payload: JoinRoomPayload, callback?: (res: SocketAckResponse<RoomStateResponse>) => void) => {
        try {
          if (!payload?.roomCode) {
            if (callback) callback({ success: false, error: 'Room code is required' });
            return;
          }

          const result = this.roomManager.joinRoom(
            payload.roomCode,
            socket.id,
            payload?.displayName || 'User'
          );

          if ('error' in result) {
            socket.emit('operation_error', { code: 'JOIN_ROOM_FAILED', message: result.error });
            if (callback) callback({ success: false, error: result.error });
            return;
          }

          const { room, participant } = result;
          const roomChannel = `room:${room.roomCode}`;
          socket.join(roomChannel);

          const roomState = room.getStateResponse(socket.id);

          // Notify existing room members
          socket.to(roomChannel).emit('user_joined', { participant: participant.toSummary() });

          // Notify joined user
          socket.emit('room_joined', roomState);
          if (callback) callback({ success: true, data: roomState });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to join room';
          socket.emit('operation_error', { code: 'JOIN_ROOM_FAILED', message });
          if (callback) callback({ success: false, error: message });
        }
      }
    );

    // Leave Room
    socket.on('leave_room', (payload: LeaveRoomPayload, callback?: (res: SocketAckResponse) => void) => {
      this.handleParticipantLeave(socket, payload?.roomCode);
      if (callback) callback({ success: true });
    });

    // Play
    socket.on('play', (payload: PlaybackControlPayload, callback?: (res: SocketAckResponse) => void) => {
      const room = this.roomManager.getRoom(payload?.roomCode);
      if (!room) return;
      const participant = room.getParticipant(socket.id);
      if (!participant) return;

      const result = this.playbackService.handlePlay(room, participant, payload.currentTime);
      if (result.success && result.state) {
        this.io.to(`room:${room.roomCode}`).emit('sync_state', result.state);
        if (callback) callback({ success: true, data: result.state });
      } else {
        socket.emit('operation_error', { code: 'UNAUTHORIZED_PLAY', message: result.error || 'Play failed' });
        if (callback) callback({ success: false, error: result.error });
      }
    });

    // Pause
    socket.on('pause', (payload: PlaybackControlPayload, callback?: (res: SocketAckResponse) => void) => {
      const room = this.roomManager.getRoom(payload?.roomCode);
      if (!room) return;
      const participant = room.getParticipant(socket.id);
      if (!participant) return;

      const result = this.playbackService.handlePause(room, participant, payload.currentTime);
      if (result.success && result.state) {
        this.io.to(`room:${room.roomCode}`).emit('sync_state', result.state);
        if (callback) callback({ success: true, data: result.state });
      } else {
        socket.emit('operation_error', { code: 'UNAUTHORIZED_PAUSE', message: result.error || 'Pause failed' });
        if (callback) callback({ success: false, error: result.error });
      }
    });

    // Seek
    socket.on('seek', (payload: SeekPayload, callback?: (res: SocketAckResponse) => void) => {
      const room = this.roomManager.getRoom(payload?.roomCode);
      if (!room) return;
      const participant = room.getParticipant(socket.id);
      if (!participant) return;

      const result = this.playbackService.handleSeek(room, participant, payload.currentTime);
      if (result.success && result.state) {
        this.io.to(`room:${room.roomCode}`).emit('sync_state', result.state);
        if (callback) callback({ success: true, data: result.state });
      } else {
        socket.emit('operation_error', { code: 'UNAUTHORIZED_SEEK', message: result.error || 'Seek failed' });
        if (callback) callback({ success: false, error: result.error });
      }
    });

    // Change Video
    socket.on('change_video', (payload: ChangeVideoPayload, callback?: (res: SocketAckResponse) => void) => {
      const room = this.roomManager.getRoom(payload?.roomCode);
      if (!room) return;
      const participant = room.getParticipant(socket.id);
      if (!participant) return;

      const result = this.playbackService.handleChangeVideo(room, participant, payload.videoUrlOrId);
      if (result.success && result.state) {
        this.io.to(`room:${room.roomCode}`).emit('sync_state', result.state);
        if (callback) callback({ success: true, data: result.state });
      } else {
        socket.emit('operation_error', { code: 'CHANGE_VIDEO_FAILED', message: result.error || 'Change video failed' });
        if (callback) callback({ success: false, error: result.error });
      }
    });

    // Assign Role (Host only)
    socket.on('assign_role', (payload: AssignRolePayload, callback?: (res: SocketAckResponse) => void) => {
      const room = this.roomManager.getRoom(payload?.roomCode);
      if (!room) return;
      const actor = room.getParticipant(socket.id);
      if (!actor) return;

      const result = this.roomService.assignRole(room, actor, payload.targetParticipantId, payload.newRole);
      if (result.success && result.target) {
        this.io.to(`room:${room.roomCode}`).emit('role_assigned', {
          participantId: result.target.id,
          role: result.target.role,
          assignedBy: actor.displayName,
        });
        if (callback) callback({ success: true, data: result.target.toSummary() });
      } else {
        socket.emit('operation_error', { code: 'ASSIGN_ROLE_FAILED', message: result.error || 'Role assignment failed' });
        if (callback) callback({ success: false, error: result.error });
      }
    });

    // Remove Participant
    socket.on('remove_participant', (payload: RemoveParticipantPayload, callback?: (res: SocketAckResponse) => void) => {
      const room = this.roomManager.getRoom(payload?.roomCode);
      if (!room) return;
      const actor = room.getParticipant(socket.id);
      if (!actor) return;

      const result = this.roomService.removeParticipant(room, actor, payload.targetParticipantId);
      if (result.success && result.target) {
        const targetSocket = this.io.sockets.sockets.get(payload.targetParticipantId);
        if (targetSocket) {
          targetSocket.emit('participant_removed', {
            participantId: result.target.id,
            reason: `Removed by ${actor.displayName}`,
          });
          targetSocket.leave(`room:${room.roomCode}`);
        }

        this.io.to(`room:${room.roomCode}`).emit('user_left', {
          participantId: result.target.id,
          displayName: result.target.displayName,
          reason: 'Removed by host/moderator',
        });

        if (callback) callback({ success: true });
      } else {
        socket.emit('operation_error', { code: 'REMOVE_PARTICIPANT_FAILED', message: result.error || 'Failed to remove' });
        if (callback) callback({ success: false, error: result.error });
      }
    });

    // Request Action (Participant to Host/Mods)
    socket.on('request_action', (payload: RequestActionPayload, callback?: (res: SocketAckResponse) => void) => {
      const room = this.roomManager.getRoom(payload?.roomCode);
      if (!room) return;
      const requester = room.getParticipant(socket.id);
      if (!requester) return;

      const result = this.roomService.createActionRequest(
        room,
        requester,
        payload.actionType,
        payload.payload
      );

      if (result.success && result.request) {
        this.io.to(`room:${room.roomCode}`).emit('action_requested', result.request);
        if (callback) callback({ success: true, data: result.request });
      } else {
        socket.emit('operation_error', { code: 'REQUEST_ACTION_FAILED', message: result.error || 'Request failed' });
        if (callback) callback({ success: false, error: result.error });
      }
    });

    // Approve Request
    socket.on('approve_request', (payload: ResolveRequestPayload, callback?: (res: SocketAckResponse) => void) => {
      const room = this.roomManager.getRoom(payload?.roomCode);
      if (!room) return;
      const actor = room.getParticipant(socket.id);
      if (!actor) return;

      const result = this.roomService.resolveActionRequest(room, actor, payload.requestId, 'APPROVED');
      if (result.success && result.request) {
        this.io.to(`room:${room.roomCode}`).emit('request_resolved', {
          requestId: result.request.id,
          status: 'APPROVED',
          resolvedBy: actor.displayName,
          actionType: result.request.actionType,
        });

        if (result.resultingPlaybackState) {
          this.io.to(`room:${room.roomCode}`).emit('sync_state', result.resultingPlaybackState);
        }

        if (callback) callback({ success: true, data: result.request });
      } else {
        socket.emit('operation_error', { code: 'APPROVE_FAILED', message: result.error || 'Approval failed' });
        if (callback) callback({ success: false, error: result.error });
      }
    });

    // Reject Request
    socket.on('reject_request', (payload: ResolveRequestPayload, callback?: (res: SocketAckResponse) => void) => {
      const room = this.roomManager.getRoom(payload?.roomCode);
      if (!room) return;
      const actor = room.getParticipant(socket.id);
      if (!actor) return;

      const result = this.roomService.resolveActionRequest(room, actor, payload.requestId, 'REJECTED');
      if (result.success && result.request) {
        this.io.to(`room:${room.roomCode}`).emit('request_resolved', {
          requestId: result.request.id,
          status: 'REJECTED',
          resolvedBy: actor.displayName,
          actionType: result.request.actionType,
        });

        if (callback) callback({ success: true, data: result.request });
      } else {
        socket.emit('operation_error', { code: 'REJECT_FAILED', message: result.error || 'Rejection failed' });
        if (callback) callback({ success: false, error: result.error });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      this.handleParticipantLeave(socket);
    });
  }

  private handleParticipantLeave(socket: Socket, roomCode?: string): void {
    const removal = this.roomManager.removeParticipantFromRoom(socket.id, roomCode);
    if (removal && removal.participant) {
      const roomChannel = `room:${removal.room.roomCode}`;
      socket.leave(roomChannel);
      this.io.to(roomChannel).emit('user_left', {
        participantId: removal.participant.id,
        displayName: removal.participant.displayName,
        reason: 'User disconnected or left room',
      });
    }
  }
}

