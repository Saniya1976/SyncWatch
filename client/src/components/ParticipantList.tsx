import React, { useState } from 'react';
import { ParticipantSummary, Role } from '../types';
import { RoleBadge } from './RoleBadge';
import { getUserAvatar } from '../utils/avatar';
import {
  Users,
  Copy,
  Check,
  ShieldCheck,
  ShieldX,
  UserX,
  Crown,
  AlertTriangle,
  Share2,
} from 'lucide-react';

interface ParticipantListProps {
  roomCode: string;
  currentParticipantId: string;
  userRole: Role;
  participants: ParticipantSummary[];
  onAssignRole: (targetId: string, newRole: 'MODERATOR' | 'PARTICIPANT') => void;
  onRemoveParticipant: (targetId: string) => void;
  onTransferHost: (targetId: string) => void;
}

function getAvatarStyle(role: Role) {
  switch (role) {
    case 'HOST':
      return 'bg-gradient-to-tr from-amber-500 via-rose-500 to-red-600 ring-2 ring-amber-500/60 shadow-lg text-white';
    case 'MODERATOR':
      return 'bg-gradient-to-tr from-purple-600 to-indigo-600 ring-1 ring-purple-400/50 shadow-md text-white';
    case 'PARTICIPANT':
    default:
      return 'bg-gradient-to-tr from-slate-700 to-slate-600 text-slate-200';
  }
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  roomCode,
  currentParticipantId,
  userRole,
  participants,
  onAssignRole,
  onRemoveParticipant,
  onTransferHost,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmTransferHostId, setConfirmTransferHostId] = useState<string | null>(null);

  const isHost = userRole === 'HOST';

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      const inviteUrl = `${window.location.origin}/room/${roomCode}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  // Sort: Host first, then Moderators, then Participants
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.role === 'HOST') return -1;
    if (b.role === 'HOST') return 1;
    if (a.role === 'MODERATOR' && b.role !== 'MODERATOR') return -1;
    if (b.role === 'MODERATOR' && a.role !== 'MODERATOR') return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const targetToRemove = participants.find((p) => p.id === confirmRemoveId);
  const targetToTransferHost = participants.find((p) => p.id === confirmTransferHostId);

  return (
    <div className="flex flex-col h-full bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header & Room Code Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs">
            <Users className="w-4 h-4 text-red-500" />
            <span>Room Party ({participants.length})</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </div>

        {/* Code & Share Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-medium text-slate-200 transition"
            title="Click to copy Room Code"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{roomCode}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-xs font-medium text-red-400 transition"
            title="Click to copy Invite Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-red-400" />}
            <span>{copiedLink ? 'Copied' : 'Share Link'}</span>
          </button>
        </div>
      </div>

      {/* Participant List Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {sortedParticipants.map((p) => {
          const isSelf = p.id === currentParticipantId;
          const canManage = isHost && !isSelf;
          const userTag = `@${p.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}#${p.id.slice(-4)}`;
          const avatar = getUserAvatar(p.id, p.displayName);

          return (
            <div
              key={p.id}
              className={`group flex items-center justify-between p-2 rounded-xl transition ${
                isSelf ? 'bg-slate-800/60 border border-slate-700/70' : 'hover:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold bg-gradient-to-tr ${avatar.gradient} shadow-md border border-white/10`}
                  >
                    <span>{avatar.initial}</span>
                  </div>
                  {p.role === 'HOST' && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center bg-black/60 rounded-full p-0.5" title="Room Host">
                      <Crown className="w-3 h-3 text-amber-400 fill-amber-400 drop-shadow" />
                    </span>
                  )}
                  {p.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#111827]" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-100 truncate">
                      {p.displayName}
                    </span>
                    {p.role === 'HOST' && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1 rounded border border-amber-500/20">
                        <Crown className="w-3 h-3 fill-amber-400" />
                        Host
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-[10px] text-slate-500 font-mono">(you)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-mono truncate">{userTag}</span>
                    <RoleBadge role={p.role} size="sm" />
                  </div>
                </div>
              </div>

              {/* Host management actions: Always visible on touch/mobile, hover on desktop */}
              {canManage && (
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                  <button
                    onClick={() => setConfirmTransferHostId(p.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
                    title="Transfer Host to this user"
                  >
                    <Crown className="w-3.5 h-3.5" />
                  </button>

                  {p.role === 'PARTICIPANT' ? (
                    <button
                      onClick={() => onAssignRole(p.id, 'MODERATOR')}
                      className="p-1 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition"
                      title="Promote to Moderator"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onAssignRole(p.id, 'PARTICIPANT')}
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
                      title="Demote to Participant"
                    >
                      <ShieldX className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setConfirmRemoveId(p.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Remove participant"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal before removing user */}
      {confirmRemoveId && targetToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Remove Participant</h4>
                <p className="text-xs text-slate-400">Disconnect {targetToRemove.displayName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-white">{targetToRemove.displayName}</span>? They will be immediately disconnected from the room.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRemoveParticipant(confirmRemoveId);
                  setConfirmRemoveId(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition shadow-lg shadow-red-600/30"
              >
                Remove User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal before transferring host */}
      {confirmTransferHostId && targetToTransferHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Transfer Host Ownership</h4>
                <p className="text-xs text-slate-400">Make {targetToTransferHost.displayName} the new Host</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to pass Host ownership to <span className="font-semibold text-white">{targetToTransferHost.displayName}</span>? You will become a <span className="font-semibold text-purple-400">Moderator</span>.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmTransferHostId(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onTransferHost(confirmTransferHostId);
                  setConfirmTransferHostId(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-amber-500 hover:bg-amber-400 text-black font-semibold transition shadow-lg shadow-amber-500/30"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
