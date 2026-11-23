import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ChatMessage,
  SocketAckResponse,
} from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import { ParticipantList } from '../components/ParticipantList';
import { RoomControls } from '../components/RoomControls';
import { ApprovalPanel } from '../components/ApprovalPanel';
import { ChatPanel } from '../components/ChatPanel';
import { RequestActionModal } from '../components/RequestActionModal';
import { Modal } from '../components/Modal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  Tv,
  ArrowLeft,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  Users,
  MessageSquare,
  ShieldAlert,
  Power,
  Copy,
  X,
} from 'lucide-react';

export const WatchRoom: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialRoomState = (location.state as any)?.initialRoomState as RoomStateResponse | undefined;

  const [isLoading, setIsLoading] = useState(!initialRoomState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type?: 'info' | 'warning' | 'danger' | 'success';
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Connection state & Host disconnect state
  const [isConnected, setIsConnected] = useState(false);
  const [isHostDisconnected, setIsHostDisconnected] = useState(false);

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    initialRoomState?.chatMessages || []
  );
  const [userRole, setUserRole] = useState<Role>(initialRoomState?.currentRole || 'PARTICIPANT');
  const [currentParticipantId, setCurrentParticipantId] = useState<string>(
    initialRoomState?.currentParticipantId || ''
  );

  // Video metadata
  const [videoInfo, setVideoInfo] = useState<{ title: string; duration: number }>({
    title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
    duration: 213,
  });

  // Sidebar / Mobile Tab State (380px wide)
  const [sidebarTab, setSidebarTab] = useState<'participants' | 'chat'>('participants');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // Live Floating Emoji Reactions
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; senderName: string; x: number }>>([]);

  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
  const [promptName, setPromptName] = useState('');

  const sidebarTabRef = useRef(sidebarTab);
  sidebarTabRef.current = sidebarTab;

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    const socket = getSocket();
    if (roomCode) {
      socket.emit('leave_room', { roomCode: roomCode.trim().toUpperCase() });
    }
    navigate('/');
  }, [roomCode, navigate]);

  // Connect & Join Room
  const joinCurrentRoom = useCallback((displayName: string) => {
    if (!roomCode) return;
    const socket = getSocket();
    const cleanCode = roomCode.trim().toUpperCase();
    const hostToken = localStorage.getItem(`syncwatch_host_token_${cleanCode}`) || undefined;

    setIsLoading(true);
    setErrorMessage(null);

    socket.emit(
      'join_room',
      { roomCode: cleanCode, displayName, hostToken },
      (res: SocketAckResponse<RoomStateResponse>) => {
        setIsLoading(false);
        if (res.success && res.data) {
          const data = res.data;
          if (data.hostToken) {
            localStorage.setItem(`syncwatch_host_token_${cleanCode}`, data.hostToken);
          }
          setRoomState(data);
          setPlaybackState(data.playbackState);
          setParticipants(data.participants);
          setPendingRequests(data.pendingRequests || []);
          if (data.chatMessages) setChatMessages(data.chatMessages);
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

    // Check socket connection & Auto-Reconnection re-subscription
    setIsConnected(socket.connected);
    const onConnect = () => {
      setIsConnected(true);
      const storedName = localStorage.getItem('syncwatch_display_name') || 'Viewer';
      if (roomCode) {
        const cleanCode = roomCode.trim().toUpperCase();
        const hostToken = localStorage.getItem(`syncwatch_host_token_${cleanCode}`) || undefined;
        socket.emit(
          'join_room',
          { roomCode: cleanCode, displayName: storedName, hostToken },
          (res: SocketAckResponse<RoomStateResponse>) => {
            if (res.success && res.data) {
              const data = res.data;
              if (data.hostToken) {
                localStorage.setItem(`syncwatch_host_token_${cleanCode}`, data.hostToken);
              }
              setRoomState(data);
              setPlaybackState(data.playbackState);
              setParticipants(data.participants);
              setPendingRequests(data.pendingRequests || []);
              if (data.chatMessages) setChatMessages(data.chatMessages);
              setUserRole(data.currentRole);
              setCurrentParticipantId(data.currentParticipantId);
            }
          }
        );
      }
    };

    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Initial check for display name
    const storedName = localStorage.getItem('syncwatch_display_name');
    if (!storedName) {
      setIsNamePromptOpen(true);
      setIsLoading(false);
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

    // BUG FIX: Filter by participantId rather than displayName!
    socket.on('user_left', ({ participantId, displayName }: { participantId: string; displayName: string }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      showToast(`${displayName} left the party.`, 'warning');
    });

    // Host disconnect notice
    socket.on('host_disconnected', ({ hostName, message }: { hostName: string; message: string }) => {
      setIsHostDisconnected(true);
      showToast(message || `Room Host (${hostName}) disconnected.`, 'warning');
    });

    // Room expired / ended by Host
    socket.on('room_ended', ({ message }: { message?: string }) => {
      setModalConfig({
        isOpen: true,
        type: 'warning',
        title: 'Watch Party Ended',
        message: message || 'The Host has closed and ended this watch party.',
        confirmLabel: 'Return Home',
        onConfirm: () => {
          setModalConfig(null);
          navigate('/');
        },
      });
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
      setModalConfig({
        isOpen: true,
        type: 'danger',
        title: 'Removed from Party',
        message: reason || 'You were removed from this room by the host.',
        confirmLabel: 'Return Home',
        onConfirm: () => {
          setModalConfig(null);
          navigate('/');
        },
      });
    });

    socket.on('host_transferred', ({ newHostId, newHostDisplayName, oldHostDisplayName }: {
      newHostId: string;
      newHostDisplayName: string;
      oldHostDisplayName: string;
    }) => {
      setRoomState((prev) => prev ? { ...prev, hostId: newHostId } : null);
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.id === newHostId) return { ...p, role: 'HOST' as Role };
          if (p.role === 'HOST') return { ...p, role: 'MODERATOR' as Role };
          return p;
        })
      );
      showToast(`${newHostDisplayName} is now the Host (transferred by ${oldHostDisplayName})`, 'info');
    });

    socket.on('you_are_host', ({ hostToken, roomCode: tokenRoomCode }: { hostToken: string; roomCode: string }) => {
      if (tokenRoomCode && hostToken) {
        localStorage.setItem(`syncwatch_host_token_${tokenRoomCode.trim().toUpperCase()}`, hostToken);
      }
      setUserRole('HOST');
      showToast('👑 You are now the Room Host! You have full control of this watch party.', 'success');
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

    // Live chat message
    socket.on('new_chat', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
      if (sidebarTabRef.current !== 'chat' && msg.senderId !== socket.id) {
        setUnreadChatCount((c) => c + 1);
      }
    });

    // Live floating reaction emojis
    socket.on('new_reaction', (reaction: { id: string; emoji: string; senderName: string; timestamp: number }) => {
      const newReaction = {
        id: reaction.id || crypto.randomUUID(),
        emoji: reaction.emoji,
        senderName: reaction.senderName,
        x: Math.floor(Math.random() * 65) + 15,
      };
      setReactions((prev) => [...prev.slice(-15), newReaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 2600);
    });

    socket.on('operation_error', ({ message }: { code: string; message: string }) => {
      showToast(message, 'warning');
    });

    return () => {
      if (roomCode) {
        socket.emit('leave_room', { roomCode: roomCode.trim().toUpperCase() });
      }
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sync_state');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('host_disconnected');
      socket.off('room_ended');
      socket.off('role_assigned');
      socket.off('participant_removed');
      socket.off('host_transferred');
      socket.off('you_are_host');
      socket.off('action_requested');
      socket.off('request_resolved');
      socket.off('new_chat');
      socket.off('new_reaction');
      socket.off('operation_error');
    };
  }, [joinCurrentRoom, navigate, roomCode, showToast]);

  const handleSendReaction = (emoji: string) => {
    const socket = getSocket();
    const cleanCode = (roomCode || roomState?.roomCode || '').trim().toUpperCase();
    if (!cleanCode) return;
    socket.emit('send_reaction', { roomCode: cleanCode, emoji });
  };

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

  const handleTransferHost = (newHostParticipantId: string) => {
    const socket = getSocket();
    const cleanCode = (roomCode || roomState?.roomCode || '').trim().toUpperCase();
    socket.emit('transfer_host', { roomCode: cleanCode, newHostParticipantId }, (res?: SocketAckResponse) => {
      if (res && !res.success) {
        showToast(res.error || 'Failed to transfer host', 'warning');
      } else {
        showToast('Host ownership transferred successfully!', 'success');
        setUserRole('MODERATOR');
      }
    });
  };

  // Host Option to Expire / End Room
  const handleEndRoom = () => {
    const cleanCode = (roomCode || roomState?.roomCode || '').trim().toUpperCase();
    setModalConfig({
      isOpen: true,
      type: 'danger',
      title: 'End Watch Party',
      message: 'Are you sure you want to end and close this watch party for everyone? This action cannot be undone and will expire the room immediately.',
      confirmLabel: 'End Party',
      cancelLabel: 'Cancel',
      onCancel: () => setModalConfig(null),
      onConfirm: () => {
        setModalConfig(null);
        const socket = getSocket();
        socket.emit('end_room', { roomCode: cleanCode });
      },
    });
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

  // Send Chat Message
  const handleSendMessage = (text: string) => {
    const socket = getSocket();
    const cleanCode = (roomCode || roomState?.roomCode || '').trim().toUpperCase();
    if (!cleanCode) {
      showToast('Cannot send message: room code is missing', 'warning');
      return;
    }
    socket.emit('send_chat', { roomCode: cleanCode, text }, (res?: SocketAckResponse<ChatMessage>) => {
      if (res && !res.success) {
        showToast(res.error || 'Failed to send message', 'warning');
      }
    });
  };

  const handleNamePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = promptName.trim() || 'Viewer';
    localStorage.setItem('syncwatch_display_name', name);
    setIsNamePromptOpen(false);
    joinCurrentRoom(name);
  };

  // Loading Room State Screen
  if (isLoading && !isNamePromptOpen) {
    return (
      <div className="h-screen bg-[#0f0f0f] flex flex-col items-center justify-center p-6 text-center text-[#f1f1f1]">
        <div className="w-16 h-16 rounded-3xl bg-[#cc0000]/10 border border-[#cc0000]/20 flex items-center justify-center text-[#cc0000] mb-4 shadow-xl">
          <Tv className="w-8 h-8 animate-pulse text-[#ff0000]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Entering Watch Party...</h2>
        <p className="text-sm text-[#aaaaaa] max-w-sm">
          Connecting to room <span className="font-mono text-white font-semibold">{roomCode?.toUpperCase()}</span> and synchronizing video playback
        </p>
      </div>
    );
  }

  // If Error or Room Not Found
  if (errorMessage) {
    return (
      <div className="h-screen bg-[#080C15] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Room Not Found</h2>
            <p className="text-sm text-slate-400">{errorMessage}</p>
          </div>
          <button
            onClick={handleLeaveRoom}
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
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-[#0f0f0f] text-[#f1f1f1] flex flex-col">
      {/* Room Header */}
      <header className="h-14 flex-shrink-0 border-b border-[#272727] bg-[#0f0f0f] sticky top-0 z-40">
        <div className="max-w-[1750px] mx-auto px-3 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleLeaveRoom}
              className="p-1.5 rounded-xl text-[#aaaaaa] hover:text-white hover:bg-[#212121] transition"
              title="Leave room"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#cc0000] flex items-center justify-center shadow text-sm font-bold text-white">
                <Tv className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-sm hidden sm:inline text-white">
                Sync<span className="text-[#ff0000]">Watch</span>
              </span>
            </div>
          </div>

          {/* Center: Room Code pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (roomCode) {
                  navigator.clipboard.writeText(roomCode);
                  showToast('Room code copied to clipboard!', 'success');
                }
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-[#181818] hover:bg-[#212121] border border-[#272727] text-xs shadow-inner transition cursor-pointer"
              title="Click to copy room code"
            >
              <span className="text-[#aaaaaa] hidden xs:inline">Room:</span>
              <span className="font-mono font-bold text-white tracking-widest">{roomCode}</span>
              <Copy className="w-3 h-3 text-[#aaaaaa]" />
            </button>
          </div>

          {/* Right: Mobile Toggle, End Room (Host), Connection & Status */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Mobile Party/Chat Quick Button */}
            <button
              onClick={() => {
                const el = document.getElementById('mobile-party-chat');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else setIsMobilePanelOpen(true);
              }}
              className="lg:hidden flex items-center gap-1 px-2 py-1 rounded-lg bg-[#181818] hover:bg-[#212121] border border-[#272727] text-xs font-medium text-white transition shadow"
              title="View Party and Chat"
            >
              <Users className="w-3.5 h-3.5 text-red-500" />
              <span>Party ({participants.length})</span>
              {unreadChatCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {userRole === 'HOST' && (
              <button
                onClick={handleEndRoom}
                className="px-2 sm:px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-[#cc0000] text-red-400 hover:text-white border border-red-500/30 text-xs font-medium flex items-center gap-1 transition shadow"
                title="Expire and close this watch party for everyone"
              >
                <Power className="w-3.5 h-3.5" />
                <span className="hidden md:inline">End Party</span>
              </button>
            )}

            <div className="flex items-center gap-1 text-xs text-[#aaaaaa]">
              {isConnected ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Connected</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                  <span className="hidden md:inline">Reconnecting...</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Host Disconnected Alert Banner */}
      {isHostDisconnected && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-xs text-amber-300 flex items-center justify-center gap-2 flex-shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
          <span>The Room Host has disconnected. Playback remains synchronized with the last active state.</span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-xs text-slate-100 animate-in slide-in-from-top-2">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
          {toastMessage.type === 'info' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Room Layout: Single-Screen on Desktop, Vertically scrollable on Mobile */}
      <main className="max-w-[1850px] mx-auto w-full p-2 sm:p-3.5 flex-1 flex flex-col lg:flex-row gap-3 items-stretch overflow-y-auto lg:overflow-hidden">
        {/* Left Column: Video Player & Controls (Widescreen 16:9 on mobile, expanded on desktop) */}
        <div className="flex-1 min-h-0 w-full flex flex-col justify-start lg:justify-between space-y-2.5 overflow-visible lg:overflow-hidden lg:h-full">
          {/* Video Player (16:9 aspect on mobile, flex-1 on desktop) */}
          <div className="w-full aspect-video rounded-2xl bg-black border border-slate-800 shadow-2xl relative flex-shrink-0 flex items-center justify-center overflow-hidden lg:flex-1 lg:min-h-0">
            <ErrorBoundary fallbackTitle="YouTube Video Player">
              <VideoPlayer
                playbackState={playbackState}
                userRole={userRole}
                onLocalPlay={handlePlay}
                onLocalPause={handlePause}
                onLocalSeek={handleSeek}
                onVideoInfo={(info) => setVideoInfo(info)}
                reactions={reactions}
                onSendReaction={handleSendReaction}
              />
            </ErrorBoundary>
          </div>

          {/* Compact Controls Bar */}
          <RoomControls
            playbackState={playbackState}
            userRole={userRole}
            videoTitle={videoInfo.title}
            duration={videoInfo.duration}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onChangeVideo={handleChangeVideo}
            onRequestActionOpen={() => setIsRequestModalOpen(true)}
          />

          {/* Compact Scrollable Approval Panel for Host and Moderators if requests pending */}
          {pendingRequests.length > 0 && (
            <div className="flex-shrink-0 max-h-[140px] overflow-y-auto">
              <ApprovalPanel
                userRole={userRole}
                pendingRequests={pendingRequests}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
              />
            </div>
          )}

          {/* Mobile Party & Live Chat Section (Directly visible below player on mobile screens) */}
          <div id="mobile-party-chat" className="lg:hidden w-full flex-shrink-0 flex flex-col mt-2 h-[450px]">
            {/* Mobile Tab Selector */}
            <div className="flex rounded-xl bg-[#181818] border border-[#272727] p-1 mb-2 flex-shrink-0">
              <button
                onClick={() => setSidebarTab('participants')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === 'participants'
                    ? 'bg-[#272727] text-white shadow'
                    : 'text-[#aaaaaa] hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-red-500" />
                <span>Party ({participants.length})</span>
              </button>

              <button
                onClick={() => {
                  setSidebarTab('chat');
                  setUnreadChatCount(0);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition relative ${
                  sidebarTab === 'chat'
                    ? 'bg-[#272727] text-white shadow'
                    : 'text-[#aaaaaa] hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                <span>Live Chat</span>
                {unreadChatCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadChatCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Tab Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {sidebarTab === 'participants' ? (
                <ParticipantList
                  roomCode={roomCode || ''}
                  currentParticipantId={currentParticipantId}
                  userRole={userRole}
                  participants={participants}
                  onAssignRole={handleAssignRole}
                  onRemoveParticipant={handleRemoveParticipant}
                  onTransferHost={handleTransferHost}
                />
              ) : (
                <ChatPanel
                  messages={chatMessages}
                  currentParticipantId={currentParticipantId}
                  currentUserDisplayName={
                    participants.find((p) => p.id === currentParticipantId || p.id === getSocket().id)?.displayName ||
                    localStorage.getItem('syncwatch_display_name') ||
                    ''
                  }
                  onSendMessage={handleSendMessage}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Desktop Party & Chat Sidebar (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-[390px] flex-shrink-0 h-full flex-col overflow-hidden">
          {/* Tab Selector */}
          <div className="flex rounded-xl bg-[#181818] border border-[#272727] p-1 mb-2 flex-shrink-0">
            <button
              onClick={() => setSidebarTab('participants')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                sidebarTab === 'participants'
                  ? 'bg-[#272727] text-white shadow'
                  : 'text-[#aaaaaa] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-red-500" />
              <span>Party ({participants.length})</span>
            </button>

            <button
              onClick={() => {
                setSidebarTab('chat');
                setUnreadChatCount(0);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition relative ${
                sidebarTab === 'chat'
                  ? 'bg-[#272727] text-white shadow'
                  : 'text-[#aaaaaa] hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
              <span>Live Chat</span>
              {unreadChatCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadChatCount}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content fills remaining column height */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {sidebarTab === 'participants' ? (
              <ParticipantList
                roomCode={roomCode || ''}
                currentParticipantId={currentParticipantId}
                userRole={userRole}
                participants={participants}
                onAssignRole={handleAssignRole}
                onRemoveParticipant={handleRemoveParticipant}
                onTransferHost={handleTransferHost}
              />
            ) : (
              <ChatPanel
                messages={chatMessages}
                currentParticipantId={currentParticipantId}
                currentUserDisplayName={
                  participants.find((p) => p.id === currentParticipantId || p.id === getSocket().id)?.displayName ||
                  localStorage.getItem('syncwatch_display_name') ||
                  ''
                }
                onSendMessage={handleSendMessage}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Collapsible Side Panel (Bottom Sheet / Drawer) */}
      {isMobilePanelOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111827] border-t border-slate-800 rounded-t-3xl max-h-[85vh] h-[80vh] flex flex-col p-3 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Mobile Drawer Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Party & Live Chat</span>
                <span className="text-xs text-slate-400">({participants.length} connected)</span>
              </div>
              <button
                onClick={() => setIsMobilePanelOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Tab Selector */}
            <div className="flex rounded-xl bg-[#181818] border border-[#272727] p-1 mb-2 flex-shrink-0">
              <button
                onClick={() => setSidebarTab('participants')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === 'participants'
                    ? 'bg-[#272727] text-white shadow'
                    : 'text-[#aaaaaa] hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-red-500" />
                <span>Party ({participants.length})</span>
              </button>

              <button
                onClick={() => {
                  setSidebarTab('chat');
                  setUnreadChatCount(0);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition relative ${
                  sidebarTab === 'chat'
                    ? 'bg-[#272727] text-white shadow'
                    : 'text-[#aaaaaa] hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                <span>Live Chat</span>
                {unreadChatCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadChatCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Tab Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {sidebarTab === 'participants' ? (
                <ParticipantList
                  roomCode={roomCode || ''}
                  currentParticipantId={currentParticipantId}
                  userRole={userRole}
                  participants={participants}
                  onAssignRole={handleAssignRole}
                  onRemoveParticipant={handleRemoveParticipant}
                  onTransferHost={handleTransferHost}
                />
              ) : (
                <ChatPanel
                  messages={chatMessages}
                  currentParticipantId={currentParticipantId}
                  currentUserDisplayName={
                    participants.find((p) => p.id === currentParticipantId || p.id === getSocket().id)?.displayName ||
                    localStorage.getItem('syncwatch_display_name') ||
                    ''
                  }
                  onSendMessage={handleSendMessage}
                />
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Styled System Alert / Confirmation Modal */}
      {modalConfig && modalConfig.isOpen && (
        <Modal
          isOpen={modalConfig.isOpen}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmLabel={modalConfig.confirmLabel}
          cancelLabel={modalConfig.cancelLabel}
          onConfirm={modalConfig.onConfirm}
          onCancel={modalConfig.onCancel}
        />
      )}
    </div>
  );
};
