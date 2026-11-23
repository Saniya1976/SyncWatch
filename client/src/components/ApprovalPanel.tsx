import React from 'react';
import { PendingActionRequest, Role } from '../types';
import {
  Bell,
  Check,
  X,
  Play,
  Pause,
  FastForward,
  Youtube,
  Clock,
} from 'lucide-react';

interface ApprovalPanelProps {
  userRole: Role;
  pendingRequests: PendingActionRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  userRole,
  pendingRequests,
  onApprove,
  onReject,
}) => {
  const canApprove = userRole === 'HOST' || userRole === 'MODERATOR';

  if (!canApprove || pendingRequests.length === 0) {
    return null;
  }

  const renderActionBadge = (req: PendingActionRequest) => {
    switch (req.actionType) {
      case 'PLAY':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <Play className="w-3 h-3 fill-current" /> Play
          </span>
        );
      case 'PAUSE':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <Pause className="w-3 h-3 fill-current" /> Pause
          </span>
        );
      case 'SEEK':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
            <FastForward className="w-3 h-3" /> Seek to {Math.floor((req.payload?.currentTime || 0) / 60)}:{(Math.floor((req.payload?.currentTime || 0) % 60)).toString().padStart(2, '0')}
          </span>
        );
      case 'CHANGE_VIDEO':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
            <Youtube className="w-3 h-3" /> Change Video ({req.payload?.videoId || 'New'})
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#111827] border border-amber-500/30 rounded-2xl p-4 shadow-2xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <h3 className="font-semibold text-sm text-slate-100">
            Participant Action Requests ({pendingRequests.length})
          </h3>
        </div>
        <span className="text-xs text-amber-400/90 font-medium">Requires Host / Mod Approval</span>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {pendingRequests.map((req) => (
          <div
            key={req.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{req.requesterName}</span>
                {renderActionBadge(req)}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Clock className="w-3 h-3" />
                <span>Just now</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onApprove(req.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-md shadow-emerald-600/20"
                title="Approve & execute action"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => onReject(req.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700"
                title="Reject request"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

