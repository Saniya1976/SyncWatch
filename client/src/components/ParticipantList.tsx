import React, { useState } from 'react';
import { ParticipantSummary, Role } from '../types';
import { RoleBadge } from './RoleBadge';
import {
  Users,
  Copy,
  Check,
  ShieldCheck,
  ShieldX,
  UserX,
  Share2,
  AlertTriangle,
} from 'lucide-react';

interface ParticipantListProps {
  roomCode: string;
  currentParticipantId: string;
  userRole: Role;
  participants: ParticipantSummary[];
  onAssignRole: (targetId: string, newRole: 'MODERATOR' | 'PARTICIPANT') => void;
  onRemoveParticipant: (targetId: string) => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  roomCode,
  currentParticipantId,
  userRole,
  participants,
  onAssignRole,
  onRemoveParticipant,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

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

  const targetToRemove = participants.find((p) => p.id === confirmRemoveId);

  return (
    <div className="flex flex-col h-full bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header & Room Code Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
            <Users className="w-4 h-4 text-red-500" />
            <span>Room Party ({participants.length})</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </div>

        {/* Code & Share Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-medium text-slate-200 transition"
            title="Click to copy Room Code"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{roomCode}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-xs font-medium text-red-400 transition"
            title="Click to copy Invite Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-red-400" />}
            <span>{copiedLink ? 'Link Copied' : 'Share Link'}</span>
          </button>
        </div>
      </div>

      {/* Participant List Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {participants.map((p) => {
          const isSelf = p.id === currentParticipantId;
          const canManage = isHost && !isSelf;

          return (
            <div
              key={p.id}
              className={`group flex items-center justify-between p-2.5 rounded-xl transition ${
                isSelf ? 'bg-slate-800/50 border border-slate-700/60' : 'hover:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-white shadow">
                    {p.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  {p.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#111827]" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-200 truncate">
                      {p.displayName}
                    </span>
                    {isSelf && (
                      <span className="text-[10px] text-slate-500 font-mono">(you)</span>
                    )}
                  </div>
                  <RoleBadge role={p.role} size="sm" />
                </div>
              </div>

              {/* Host management actions */}
              {canManage && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {p.role === 'PARTICIPANT' ? (
                    <button
                      onClick={() => onAssignRole(p.id, 'MODERATOR')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition"
                      title="Promote to Moderator"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onAssignRole(p.id, 'PARTICIPANT')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
                      title="Demote to Participant"
                    >
                      <ShieldX className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setConfirmRemoveId(p.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
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

      {/* Confirmation Modal for Removing Participant */}
      {confirmRemoveId && targetToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Remove Participant</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-6">
              Are you sure you want to remove <span className="font-bold text-white">"{targetToRemove.displayName}"</span> from the watch party?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRemoveParticipant(confirmRemoveId);
                  setConfirmRemoveId(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-red-600 hover:bg-red-500 text-white transition shadow-lg shadow-red-600/30"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

