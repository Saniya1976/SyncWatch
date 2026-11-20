import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getSocket } from '../services/socket';
import {
  RoomStateResponse,
  PlaybackState,
  ParticipantSummary,
  PendingActionRequest,
  Role,
  ActionType,
  ActionPayload,
  SocketAckResponse,
} from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import { ParticipantList } from '../components/ParticipantList';
import { RoomControls } from '../components/RoomControls';
import { ApprovalPanel } from '../components/ApprovalPanel';
import { RequestActionModal } from '../components/RequestActionModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  Tv,
  ArrowLeft,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';

export const WatchRoom: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialRoomState = (location.state as any)?.initialRoomState as RoomStateResponse | undefined;

  const [isLoading, setIsLoading] = useState(!initialRoomState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);

  // Authoritative Room state
  const [roomState, setRoomState] = useState<RoomStateResponse | null>(initialRoomState || null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>(
    initialRoomState?.playbackState || {
      videoId: 'dQw4w9WgXcQ',
      isPlaying: false,
      currentTime: 0,
      updatedAt: Date.now(),
    }
  );
  const [participants, setParticipants] = useState<ParticipantSummary[]>(
    initialRoomState?.participants || []
  );
  const [pendingRequests, setPendingRequests] = useState<PendingActionRequest[]>(
    initialRoomState?.pendingRequests || []
  );
  const [userRole, setUserRole] = useState<Role>(initialRoomState?.currentRole || 'PARTICIPANT');
  const [currentParticipantId, setCurrentParticipantId] = useState<string>(
    initialRoomState?.currentParticipantId || ''
  );

  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
  const [promptName, setPromptName] = useState('');

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Connect & Join Room
  const joinCurrentRoom = useCallback((displayName: string) => {
    if (!roomCode) return;
    const socket = getSocket();

    setIsLoading(true);
    setErrorMessage(null);

    socket.emit(
      'join_room',
      { roomCode: roomCode.trim().toUpperCase(), displayName },
      (res: SocketAckResponse<RoomStateResponse>) => {
        setIsLoading(false);
        if (res.success && res.data) {
          const data = res.data;
          setRoomState(data);
          setPlaybackState(data.playbackState);
          setParticipants(data.participants);
          setPendingRequests(data.pendingRequests || []);
          setUserRole(data.currentRole);
          setCurrentParticipantId(data.currentParticipantId);
        } else {
          setErrorMessage(res.error || 'Failed to join room. Room might not exist.');
        }
      }
    );
  }, [roomCode]);

  useEffect(() => {
    const socket = getSocket();

    // Check socket connection
    setIsConnected(socket.connected);
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Initial check for display name
    const storedName = localStorage.getItem('syncwatch_display_name');
    if (!storedName) {
      setIsNamePromptOpen(true);
    } else {
      joinCurrentRoom(storedName);
    }

    // Socket Event Listeners
    socket.on('sync_state', (newPlaybackState: PlaybackState) => {
      setPlaybackState(newPlaybackState);
    });

    socket.on('user_joined', ({ participant }: { participant: ParticipantSummary }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.id === participant.id)) return prev;
        return [...prev, participant];
      });
      showToast(`${participant.displayName} joined the party!`, 'info');
    });

    socket.on('user_left', ({ displayName, reason }: { participantId: string; displayName: string; reason?: string }) => {
      setParticipants((prev) => prev.filter((p) => p.displayName !== displayName));
      showToast(`${displayName} left the party.`, 'warning');
    });

    socket.on('role_assigned', ({ participantId, role, assignedBy }: { participantId: string; role: Role; assignedBy: string }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, role } : p))
      );

      if (socket.id === participantId) {
        setUserRole(role);
        showToast(`You were promoted to ${role} by ${assignedBy}!`, 'success');
      }
    });

    socket.on('participant_removed', ({ reason }: { participantId: string; reason?: string }) => {
      alert(reason || 'You were removed from this room by the host.');
      navigate('/');
    });

    socket.on('action_requested', (request: PendingActionRequest) => {
      setPendingRequests((prev) => [...prev, request]);
      showToast(`New action request from ${request.requesterName}`, 'info');
    });

    socket.on('request_resolved', ({ requestId, status, resolvedBy, actionType }: {
      requestId: string;
      status: 'APPROVED' | 'REJECTED';
      resolvedBy: string;
      actionType: ActionType;
    }) => {
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      showToast(`Request for ${actionType} was ${status.toLowerCase()} by ${resolvedBy}`, status === 'APPROVED' ? 'success' : 'warning');
    });

    socket.on('operation_error', ({ message }: { code: string; message: string }) => {
      showToast(message, 'warning');
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sync_state');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('role_assigned');
      socket.off('participant_removed');
      socket.off('action_requested');
      socket.off('request_resolved');
      socket.off('operation_error');
    };
  }, [joinCurrentRoom, navigate, showToast]);

  // Host/Mod Playback Commands
  const handlePlay = (time?: number) => {
    const socket = getSocket();
    socket.emit('play', { roomCode, currentTime: time });
  };

  const handlePause = (time?: number) => {
    const socket = getSocket();
    socket.emit('pause', { roomCode, currentTime: time });
  };

  const handleSeek = (seconds: number) => {
    const socket = getSocket();
    socket.emit('seek', { roomCode, currentTime: seconds });
  };

  const handleChangeVideo = (videoUrlOrId: string) => {
    const socket = getSocket();
    socket.emit('change_video', { roomCode, videoUrlOrId });
  };

  // Host Participant Management
  const handleAssignRole = (targetParticipantId: string, newRole: 'MODERATOR' | 'PARTICIPANT') => {
    const socket = getSocket();
    socket.emit('assign_role', { roomCode, targetParticipantId, newRole });
  };

  const handleRemoveParticipant = (targetParticipantId: string) => {
    const socket = getSocket();
    socket.emit('remove_participant', { roomCode, targetParticipantId });
  };

  // Action Request Handling
  const handleSubmitActionRequest = (actionType: ActionType, payload?: ActionPayload) => {
    const socket = getSocket();
    socket.emit('request_action', { roomCode, actionType, payload }, (res: SocketAckResponse) => {
      if (res.success) {
        showToast('Request sent to room Host and Moderators!', 'success');
      } else {
        showToast(res.error || 'Failed to submit request', 'warning');
      }
    });
  };

  const handleApproveRequest = (requestId: string) => {
    const socket = getSocket();
    socket.emit('approve_request', { roomCode, requestId });
  };

  const handleRejectRequest = (requestId: string) => {
    const socket = getSocket();
    socket.emit('reject_request', { roomCode, requestId });
  };

  const handleNamePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = promptName.trim() || 'Viewer';
    localStorage.setItem('syncwatch_display_name', name);
    setIsNamePromptOpen(false);
    joinCurrentRoom(name);
  };

  // If Error or Room Not Found
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#080C15] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Room Not Found</h2>
            <p className="text-sm text-slate-400">{errorMessage}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Landing Page</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C15] text-slate-100 flex flex-col">
      {/* Room Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              title="Leave room"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow">
                <Tv className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base hidden sm:inline text-white">
                Sync<span className="text-red-500">Watch</span>
              </span>
            </div>
          </div>

          {/* Center: Room Code pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Room:</span>
            <span className="font-mono font-bold text-white">{roomCode}</span>
          </div>

          {/* Right: Connection & Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {isConnected ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Connected</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reconnecting...</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-sm text-slate-100 animate-in slide-in-from-top-2">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
          {toastMessage.type === 'info' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Room Layout */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col lg:flex-row gap-6">
        {/* Left: Video Player & Playback Controls */}
        <div className="flex-1 flex flex-col space-y-4">
          <ErrorBoundary fallbackTitle="YouTube Video Player">
            <VideoPlayer
              playbackState={playbackState}
              userRole={userRole}
              onLocalPlay={handlePlay}
              onLocalPause={handlePause}
              onLocalSeek={handleSeek}
            />
          </ErrorBoundary>

          <RoomControls
            playbackState={playbackState}
            userRole={userRole}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onChangeVideo={handleChangeVideo}
            onRequestActionOpen={() => setIsRequestModalOpen(true)}
          />

          {/* Approval Panel for Host and Moderators */}
          <ApprovalPanel
            userRole={userRole}
            pendingRequests={pendingRequests}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
          />
        </div>

        {/* Right: Participant List and Management */}
        <div className="w-full lg:w-80 flex flex-col h-[500px] lg:h-auto">
          <ParticipantList
            roomCode={roomCode || ''}
            currentParticipantId={currentParticipantId}
            userRole={userRole}
            participants={participants}
            onAssignRole={handleAssignRole}
            onRemoveParticipant={handleRemoveParticipant}
          />
        </div>
      </main>

      {/* Modal for Requesting Actions */}
      <RequestActionModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmit={handleSubmitActionRequest}
      />

      {/* Modal for Prompting Display Name if joined via direct link */}
      {isNamePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Join Watch Party</h3>
                <p className="text-xs text-slate-400">Choose your name for this room</p>
              </div>
            </div>

            <form onSubmit={handleNamePromptSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="Your Display Name"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />

              <button
                type="submit"
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-red-600/20 transition"
              >
                Join Now
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

