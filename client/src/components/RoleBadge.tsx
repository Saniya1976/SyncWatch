import React from 'react';
import { ShieldAlert, ShieldCheck, User } from 'lucide-react';
import { Role } from '../types';

interface RoleBadgeProps {
  role: Role;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const isSm = size === 'sm';

  switch (role) {
    case 'HOST':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <ShieldAlert className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          HOST
        </span>
      );
    case 'MODERATOR':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <ShieldCheck className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          MOD
        </span>
      );
    case 'PARTICIPANT':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-slate-800 text-slate-400 border border-slate-700 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <User className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          VIEWER
        </span>
      );
  }
};

