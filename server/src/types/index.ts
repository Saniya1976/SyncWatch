export type Role = 'HOST' | 'MODERATOR' | 'PARTICIPANT';

export interface PlaybackState {
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number; // Unix timestamp in ms
}

export type ActionType = 'PLAY' | 'PAUSE' | 'SEEK' | 'CHANGE_VIDEO';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ActionPayload {
  currentTime?: number;
  videoUrlOrId?: string;
  videoId?: string;
}

export interface PendingActionRequest {
  id: string;
  roomCode: string;
  requesterId: string;
  requesterName: string;
  actionType: ActionType;
  payload?: ActionPayload;
  status: RequestStatus;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface ParticipantSummary {
  id: string;
  displayName: string;
  role: Role;
  joinedAt: number;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername?: string;
  senderRole: Role;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface SendChatPayload {
  roomCode: string;
  text: string;
}

export interface RoomStateResponse {
  roomCode: string;
  hostId: string;
  currentParticipantId: string;
  currentRole: Role;
  playbackState: PlaybackState;
  participants: ParticipantSummary[];
  pendingRequests: PendingActionRequest[];
  chatMessages: ChatMessage[];
  hostToken?: string;
}

export interface OperationErrorPayload {
  code: string;
  message: string;
}

// Client to Server payloads
export interface CreateRoomPayload {
  displayName: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  displayName: string;
  hostToken?: string;
}

export interface LeaveRoomPayload {
  roomCode: string;
}

export interface PlaybackControlPayload {
  roomCode: string;
  currentTime?: number;
}

export interface SeekPayload {
  roomCode: string;
  currentTime: number;
}

export interface ChangeVideoPayload {
  roomCode: string;
  videoUrlOrId: string;
}

export interface AssignRolePayload {
  roomCode: string;
  targetParticipantId: string;
  newRole: 'MODERATOR' | 'PARTICIPANT';
}

export interface RemoveParticipantPayload {
  roomCode: string;
  targetParticipantId: string;
}

export interface TransferHostPayload {
  roomCode: string;
  newHostParticipantId: string;
}

export interface RequestActionPayload {
  roomCode: string;
  actionType: ActionType;
  payload?: ActionPayload;
}

export interface ResolveRequestPayload {
  roomCode: string;
  requestId: string;
}

export interface EndRoomPayload {
  roomCode: string;
}

// Standard response callback
export interface SocketAckResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

