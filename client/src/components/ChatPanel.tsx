import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Role } from '../types';
import { getSocket } from '../services/socket';
import { getUserAvatar } from '../utils/avatar';
import { Send, MessageSquare, Smile, Crown, ShieldCheck } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentParticipantId: string;
  currentUserDisplayName?: string;
  onSendMessage: (text: string) => void;
}

const QUICK_REACTIONS = ['🍿', '🔥', '😂', '❤️', '👏', '😱', '🎉'];

function formatChatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getRoleColor(role: Role): string {
  switch (role) {
    case 'HOST':
      return 'text-red-400 font-bold';
    case 'MODERATOR':
      return 'text-purple-400 font-semibold';
    case 'PARTICIPANT':
    default:
      return 'text-slate-300 font-medium';
  }
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentParticipantId,
  currentUserDisplayName,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;
    onSendMessage(clean);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-xs tracking-wide">
          <MessageSquare className="w-4 h-4 text-red-500" />
          <span>Room Chat</span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <MessageSquare className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
            <p className="text-xs font-medium text-slate-400">No chat messages yet</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Send a reaction or message to start chatting!</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center py-1 text-[11px] text-slate-500 italic">
                  {msg.text}
                </div>
              );
            }

            const socket = getSocket();
            const storedName = (currentUserDisplayName || localStorage.getItem('syncwatch_display_name') || '').trim().toLowerCase();
            const isSelf = Boolean(
              (msg.senderId && currentParticipantId && msg.senderId === currentParticipantId) ||
              (msg.senderId && socket?.id && msg.senderId === socket.id) ||
              (storedName && msg.senderName && msg.senderName.trim().toLowerCase() === storedName)
            );

            const senderTag =
              msg.senderUsername ||
              (msg.senderId
                ? `@${(msg.senderName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}#${msg.senderId.slice(-4)}`
                : '');

            const avatar = getUserAvatar(msg.senderId, msg.senderName);

            return (
              <div
                key={msg.id}
                className={`flex flex-col w-full ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`flex items-center gap-1.5 mb-1 px-1 ${
                    isSelf ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <span className={`text-[11px] font-semibold ${isSelf ? 'text-red-400' : getRoleColor(msg.senderRole)}`}>
                    {isSelf ? `${msg.senderName} (You)` : msg.senderName}
                  </span>
                  {senderTag && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {senderTag}
                    </span>
                  )}
                  {msg.senderRole === 'HOST' && (
                    <span className="px-1 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 fill-amber-400" /> HOST
                    </span>
                  )}
                  {msg.senderRole === 'MODERATOR' && (
                    <span className="px-1 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5 text-purple-400" /> MOD
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">{formatChatTime(msg.timestamp)}</span>
                </div>

                <div
                  className={`flex items-end gap-1.5 max-w-[88%] ${
                    isSelf ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold bg-gradient-to-tr ${avatar.gradient} flex-shrink-0 shadow border border-white/10`}
                  >
                    <span>{avatar.initial}</span>
                  </div>

                  <div
                    className={`px-3.5 py-2 rounded-2xl text-xs break-words leading-relaxed shadow-md ${
                      isSelf
                        ? 'bg-red-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reactions Bar */}
      <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[10px] text-slate-500 font-medium mr-0.5 flex items-center gap-1">
          <Smile className="w-3 h-3 text-slate-400" />
        </span>
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendMessage(emoji)}
            className="px-1.5 py-0.5 rounded-lg text-sm hover:bg-slate-800 hover:scale-125 transition transform active:scale-95"
            title={`Send ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-slate-800 bg-slate-900/60 flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          maxLength={500}
          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl transition shadow"
          title="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

