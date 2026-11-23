import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { RoomStateResponse, SocketAckResponse } from '../types';
import {
  Users,
  ArrowRight,
  AlertCircle,
  Play,
  Crown,
  Sparkles,
  Sun,
  Moon,
  Tv,
  Ticket,
  Zap,
  Film,
  MessageSquare,
} from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Theme state: defaults to dark (YouTube dark), can switch to light (YouTube white)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('syncwatch_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('syncwatch_theme', nextTheme);
  };

  useEffect(() => {
    const savedName = localStorage.getItem('syncwatch_display_name') || '';
    if (savedName) {
      setCreateDisplayName(savedName);
      setJoinDisplayName(savedName);
    }
  }, []);

  const handleCreateRoom = () => {
    const name = createDisplayName.trim() || 'Host';
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
          if (res.data.hostToken) {
            localStorage.setItem(`syncwatch_host_token_${res.data.roomCode}`, res.data.hostToken);
          }
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

    const name = joinDisplayName.trim() || 'Viewer';
    localStorage.setItem('syncwatch_display_name', name);
    setIsJoining(true);
    setErrorMessage(null);

    navigate(`/room/${code}`);
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between selection:bg-red-600/30 transition-colors duration-200 ${
        isDark ? 'bg-[#0f0f0f] text-[#f1f1f1]' : 'bg-[#f9f9f9] text-[#0f0f0f]'
      }`}
    >
      {/* Top Navbar */}
      <header
        className={`border-b sticky top-0 z-40 transition-colors duration-200 ${
          isDark ? 'border-[#272727] bg-[#0f0f0f]' : 'border-[#e5e5e5] bg-[#ffffff]'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#cc0000] flex items-center justify-center shadow text-white font-bold text-base">
              <Tv className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-black text-base sm:text-lg tracking-tight ${
                  isDark ? 'text-white' : 'text-[#0f0f0f]'
                }`}
              >
                Sync<span className="text-[#ff0000]">Watch</span>
              </span>
              <span
                className={`hidden md:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isDark
                    ? 'text-[#aaaaaa] bg-[#212121] border-[#303030]'
                    : 'text-[#606060] bg-[#f2f2f2] border-[#e5e5e5]'
                }`}
              >
                YouTube Party
              </span>
            </div>
          </div>

          {/* Top Right: Badges & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] ${
                isDark
                  ? 'bg-[#181818] border-[#272727] text-[#aaaaaa]'
                  : 'bg-[#f2f2f2] border-[#e5e5e5] text-[#606060]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              No Login Required
            </span>

            {/* Working Theme Toggle (YouTube Dark / White) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-medium transition shadow-sm cursor-pointer ${
                isDark
                  ? 'bg-[#212121] hover:bg-[#282828] border-[#303030] text-[#f1f1f1]'
                  : 'bg-[#ffffff] hover:bg-[#f2f2f2] border-[#e5e5e5] text-[#0f0f0f]'
              }`}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} theme`}
            >
              {isDark ? (
                <Moon className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span
                className={`text-[11px] font-medium hidden sm:inline ${
                  isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'
                }`}
              >
                {isDark ? 'Dark Theme' : 'Light Theme'}
              </span>
              <div
                className={`w-7 h-4 rounded-full p-0.5 transition duration-200 ease-in-out ${
                  isDark ? 'bg-[#cc0000]' : 'bg-[#cccccc]'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transition duration-200 ease-in-out ${
                    isDark ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Actions Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col justify-center">
        {/* TOP & CENTERED: Headline & Subtitle */}
        <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
          <div
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-2.5 shadow-sm ${
              isDark
                ? 'bg-[#212121] border-[#303030] text-red-500'
                : 'bg-[#f2f2f2] border-[#e5e5e5] text-[#cc0000]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Virtual Movie Nights With Friends</span>
          </div>

          <h1
            className={`text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2 leading-tight ${
              isDark ? 'text-white' : 'text-[#0f0f0f]'
            }`}
          >
            Watch YouTube together, <br />
            <span className="text-[#ff0000]">in perfect sync.</span>
          </h1>

          <p
            className={`text-xs sm:text-sm max-w-lg mx-auto leading-relaxed px-2 ${
              isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'
            }`}
          >
            Stream movies, music, and videos with friends without any delay. One person pauses or
            skips — everyone stays on the exact same frame.
          </p>
        </div>

        {/* Global Error Notice */}
        {errorMessage && (
          <div className="max-w-md mx-auto mb-4 p-3.5 rounded-2xl bg-[#2b1818] border border-red-500/40 text-red-400 text-xs flex items-center gap-2.5 shadow-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 2-Column Responsive Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch w-full">
          {/* Action Cards (Host & Join): Show first on mobile for immediate access */}
          <div className="order-1 lg:order-2 lg:col-span-5 flex flex-col justify-between gap-4 h-full">
            {/* Card 1: Create Watch Party */}
            <div
              className={`flex-1 flex flex-col justify-between border rounded-3xl p-5 shadow-xl transition group ${
                isDark
                  ? 'bg-[#181818] border-[#272727] hover:border-[#383838]'
                  : 'bg-white border-[#e5e5e5] hover:border-[#cccccc]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xl shadow ${
                        isDark
                          ? 'bg-[#222222] border-[#303030] text-red-500'
                          : 'bg-red-50 border-red-100 text-[#cc0000]'
                      }`}
                    >
                      <Tv className="w-4 h-4" />
                    </div>
                    <div>
                      <h2
                        className={`text-base font-bold leading-tight ${
                          isDark ? 'text-white' : 'text-[#0f0f0f]'
                        }`}
                      >
                        Host a Watch Party
                      </h2>
                      <p
                        className={`text-[11px] ${isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'}`}
                      >
                        Start a room and invite your friends
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                    <Crown className="w-3 h-3 fill-amber-400" />
                    Host
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  <label
                    className={`text-[11px] font-semibold ${
                      isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'
                    }`}
                  >
                    Your Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex"
                    value={createDisplayName}
                    onChange={(e) => setCreateDisplayName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition focus:outline-none focus:ring-1 focus:ring-[#ff0000] focus:border-[#ff0000] ${
                      isDark
                        ? 'bg-[#222222] border-[#303030] text-white placeholder-[#717171]'
                        : 'bg-[#f8f8f8] border-[#cccccc] text-[#0f0f0f] placeholder-[#909090]'
                    }`}
                  />
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full py-2.5 px-4 rounded-xl bg-[#cc0000] hover:bg-[#ff0000] disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isCreating ? (
                  <span>Launching Theater...</span>
                ) : (
                  <>
                    <span>Create Watch Party</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Card 2: Join a Friend's Party */}
            <div
              className={`flex-1 flex flex-col justify-between border rounded-3xl p-5 shadow-xl transition group ${
                isDark
                  ? 'bg-[#181818] border-[#272727] hover:border-[#383838]'
                  : 'bg-white border-[#e5e5e5] hover:border-[#cccccc]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xl shadow ${
                        isDark
                          ? 'bg-[#222222] border-[#303030] text-red-500'
                          : 'bg-red-50 border-red-100 text-[#cc0000]'
                      }`}
                    >
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <h2
                        className={`text-base font-bold leading-tight ${
                          isDark ? 'text-white' : 'text-[#0f0f0f]'
                        }`}
                      >
                        Join Friend's Party
                      </h2>
                      <p
                        className={`text-[11px] ${isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'}`}
                      >
                        Enter with a 6-letter room code
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      isDark
                        ? 'text-[#aaaaaa] bg-[#222222] border-[#303030]'
                        : 'text-[#606060] bg-[#f2f2f2] border-[#e5e5e5]'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    Friends
                  </span>
                </div>

                <form onSubmit={handleJoinRoom} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label
                        className={`text-[11px] font-semibold ${
                          isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'
                        }`}
                      >
                        Your Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Jordan"
                        value={joinDisplayName}
                        onChange={(e) => setJoinDisplayName(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs transition focus:outline-none focus:ring-1 focus:ring-[#ff0000] focus:border-[#ff0000] ${
                          isDark
                            ? 'bg-[#222222] border-[#303030] text-white placeholder-[#717171]'
                            : 'bg-[#f8f8f8] border-[#cccccc] text-[#0f0f0f] placeholder-[#909090]'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        className={`text-[11px] font-semibold ${
                          isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'
                        }`}
                      >
                        Room Code
                      </label>
                      <input
                        type="text"
                        placeholder="WX9J2K"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={10}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-mono tracking-widest uppercase transition focus:outline-none focus:ring-1 focus:ring-[#ff0000] focus:border-[#ff0000] ${
                          isDark
                            ? 'bg-[#222222] border-[#303030] text-white placeholder-[#717171]'
                            : 'bg-[#f8f8f8] border-[#cccccc] text-[#0f0f0f] placeholder-[#909090]'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isJoining || !joinCode.trim()}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-2 cursor-pointer mt-2 shadow disabled:opacity-40 ${
                      isDark
                        ? 'bg-[#272727] hover:bg-[#383838] hover:text-white text-[#f1f1f1] border-[#383838]'
                        : 'bg-[#f2f2f2] hover:bg-[#e5e5e5] text-[#0f0f0f] border-[#d9d9d9]'
                    }`}
                  >
                    <span>Enter Watch Party</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Visual Showcase: Appears side-by-side on desktop, below cards on mobile */}
          <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col h-full">
            <div
              className={`relative rounded-3xl overflow-hidden border p-3 shadow-xl h-full flex flex-col justify-center transition-colors duration-200 ${
                isDark ? 'border-[#272727] bg-[#181818]' : 'border-[#e5e5e5] bg-white'
              }`}
            >
              <div className="relative aspect-video min-h-[220px] sm:min-h-[300px] lg:h-full rounded-2xl overflow-hidden bg-[#0f0f0f] border border-[#272727] flex items-center justify-center group shadow-inner">
                <img
                  src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80"
                  alt="Cinema Theater ambiance"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 filter brightness-75 group-hover:scale-105 transition duration-700"
                />

                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-[#0f0f0f]/80 backdrop-blur border border-[#303030] text-white font-bold text-[10px] flex items-center gap-1.5 shadow">
                    <span className="w-2 h-2 rounded-full bg-[#ff0000] animate-pulse" />
                    LIVE THEATER
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#0f0f0f]/80 backdrop-blur border border-[#303030] text-[#aaaaaa] font-mono text-[10px]">
                    0s DELAY SYNC
                  </span>
                </div>

                <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#cc0000] hover:bg-[#ff0000] text-white flex items-center justify-center shadow-2xl shadow-red-600/50 cursor-pointer transition transform hover:scale-110">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white translate-x-0.5" />
                </div>

                {/* Floating chat pills (hidden on very small phone screens to prevent clutter) */}
                <div className="hidden sm:flex absolute bottom-3 left-3 right-3 items-center justify-between pointer-events-none">
                  <div className="space-y-1.5 max-w-[70%]">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0f0f0f]/85 backdrop-blur border border-[#303030] text-xs text-white shadow">
                      <Film className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <span className="font-semibold text-amber-400">Alex:</span>
                      <span className="text-[11px] text-[#f1f1f1]">Bro pause real quick getting snacks!</span>
                    </div>
                  </div>

                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 to-rose-700 border-2 border-[#0f0f0f] flex items-center justify-center text-[10px] font-bold text-white shadow">
                      AL
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-700 border-2 border-[#0f0f0f] flex items-center justify-center text-[10px] font-bold text-white shadow">
                      JD
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Human-Friendly Features Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-6">
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-colors duration-200 ${
              isDark ? 'bg-[#181818] border-[#272727]' : 'bg-white border-[#e5e5e5] shadow-sm'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isDark ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-red-50 text-[#cc0000] border border-red-100'
              }`}
            >
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4
                className={`text-xs font-bold mb-0.5 ${isDark ? 'text-white' : 'text-[#0f0f0f]'}`}
              >
                Frame-Perfect Sync
              </h4>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'}`}>
                When the host pauses, seeks, or plays, everyone is kept on the exact same second.
              </p>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-colors duration-200 ${
              isDark ? 'bg-[#181818] border-[#272727]' : 'bg-white border-[#e5e5e5] shadow-sm'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isDark
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-amber-50 text-amber-600 border border-amber-100'
              }`}
            >
              <Crown className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h4
                className={`text-xs font-bold mb-0.5 ${isDark ? 'text-white' : 'text-[#0f0f0f]'}`}
              >
                Pass the Remote
              </h4>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'}`}>
                Host can promote friends to Moderator or transfer complete room ownership anytime.
              </p>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-colors duration-200 ${
              isDark ? 'bg-[#181818] border-[#272727]' : 'bg-white border-[#e5e5e5] shadow-sm'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isDark
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'bg-sky-50 text-sky-600 border border-sky-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4
                className={`text-xs font-bold mb-0.5 ${isDark ? 'text-white' : 'text-[#0f0f0f]'}`}
              >
                Live Chat & Reactions
              </h4>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'}`}>
                Send messages and live reactions in real-time without leaving full-screen viewing.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-4 text-center text-xs transition-colors duration-200 ${
          isDark ? 'border-[#272727] text-[#717171]' : 'border-[#e5e5e5] text-[#606060]'
        }`}
      >
        <p className="flex items-center justify-center gap-1.5">
          <Tv className="w-3.5 h-3.5 text-[#cc0000]" />
          <span>SyncWatch • Made for movie nights, music streams & watching together with friends</span>
        </p>
      </footer>
    </div>
  );
};
