import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { RoomStateResponse, SocketAckResponse } from '../types';
import {
  Tv,
  Play,
  Users,
  Shield,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Film,
} from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('syncwatch_display_name') || '';
    if (savedName) setDisplayName(savedName);
  }, []);

  const handleCreateRoom = () => {
    const name = displayName.trim() || 'Host';
    localStorage.setItem('syncwatch_display_name', name);
    setIsCreating(true);
    setErrorMessage(null);

    const socket = getSocket();
    socket.emit(
      'create_room',
      { displayName: name },
      (res: SocketAckResponse<RoomStateResponse>) => {
        setIsCreating(false);
        if (res.success && res.data) {
          navigate(`/room/${res.data.roomCode}`, { state: { initialRoomState: res.data } });
        } else {
          setErrorMessage(res.error || 'Failed to create room. Please try again.');
        }
      }
    );
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Please enter a room code.');
      return;
    }

    const name = displayName.trim() || 'Viewer';
    localStorage.setItem('syncwatch_display_name', name);
    setIsJoining(true);
    setErrorMessage(null);

    navigate(`/room/${code}`);
  };

  return (
    <div className="min-h-screen bg-[#080C15] text-slate-100 flex flex-col justify-between selection:bg-red-500/20">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Sync<span className="text-red-500">Watch</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Socket.IO Engine Ready
            </span>
          </div>
        </div>
      </header>

      {/* Hero Body */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-Time Synchronized YouTube Parties</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-5 leading-tight">
            Watch YouTube together, <br />
            <span className="bg-gradient-to-r from-red-500 via-rose-500 to-amber-400 bg-clip-text text-transparent">
              in absolute synchronization.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Host watch parties with authoritative play/pause/seek sync, strict role-based controls, and a participant action-request approval system.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Action Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
          {/* Card 1: Create a Room */}
          <div className="bg-[#101726] border border-slate-800/90 hover:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between transition group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 group-hover:scale-105 transition">
                <Film className="w-6 h-6" />
              </div>

              <h2 className="text-xl font-bold text-white mb-2">Create Watch Party</h2>
              <p className="text-sm text-slate-400 mb-6">
                Start a new shared room as the Host. You control playback, assign moderators, and approve participant requests.
              </p>

              <div className="space-y-3 mb-6">
                <label className="text-xs font-medium text-slate-300">Your Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition"
                />
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-red-600/25 transition flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <span>Generating Room...</span>
              ) : (
                <>
                  <span>Create Room</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Card 2: Join a Room */}
          <div className="bg-[#101726] border border-slate-800/90 hover:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between transition group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-105 transition">
                <Users className="w-6 h-6" />
              </div>

              <h2 className="text-xl font-bold text-white mb-2">Join Watch Party</h2>
              <p className="text-sm text-slate-400 mb-6">
                Enter an existing party with a room code. Watch in real-time sync and request actions when you want to intervene.
              </p>

              <form onSubmit={handleJoinRoom} className="space-y-4 mb-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Room Code</label>
                  <input
                    type="text"
                    placeholder="e.g. WX9J2K"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white font-mono tracking-wider placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isJoining || !joinCode.trim()}
                  className="w-full py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-sm border border-slate-700 transition flex items-center justify-center gap-2"
                >
                  <span>Join Party</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                Role-gated security
              </span>
              <span>In-memory room state</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Footer Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-12 w-full">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center">
            <h4 className="text-sm font-semibold text-slate-200 mb-1">Authoritative Playback</h4>
            <p className="text-xs text-slate-400">Zero client-side broadcast loops. The server commands synchronized play, pause & seek.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center">
            <h4 className="text-sm font-semibold text-slate-200 mb-1">Host & Mod Permissions</h4>
            <p className="text-xs text-slate-400">Strict backend permission validation stops unauthorized play/pause events directly.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center">
            <h4 className="text-sm font-semibold text-slate-200 mb-1">Approval Queue</h4>
            <p className="text-xs text-slate-400">Viewers submit action requests that only execute when approved by Host or Moderator.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>SyncWatch • YouTube Watch Party Full-Stack Application</p>
      </footer>
    </div>
  );
};

