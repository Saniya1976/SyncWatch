import React, { useState } from 'react';
import { PlaybackState, Role } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Youtube,
  Send,
  Radio,
  Film,
} from 'lucide-react';

interface RoomControlsProps {
  playbackState: PlaybackState;
  userRole: Role;
  videoTitle?: string;
  duration?: number;
  onPlay: (currentTime?: number) => void;
  onPause: (currentTime?: number) => void;
  onSeek: (seconds: number) => void;
  onChangeVideo: (videoUrlOrId: string) => void;
  onRequestActionOpen: () => void;
}

export const RoomControls: React.FC<RoomControlsProps> = ({
  playbackState,
  userRole,
  videoTitle,
  onPlay,
  onPause,
  onSeek,
  onChangeVideo,
  onRequestActionOpen,
}) => {
  const [videoInput, setVideoInput] = useState('');
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);

  const canControl = userRole === 'HOST' || userRole === 'MODERATOR';

  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim()) return;
    setIsSubmittingVideo(true);
    onChangeVideo(videoInput.trim());
    setVideoInput('');
    setIsSubmittingVideo(false);
  };

  const handleRelativeSeek = (deltaSeconds: number) => {
    const target = Math.max(0, playbackState.currentTime + deltaSeconds);
    onSeek(target);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl px-4 py-3 shadow-xl space-y-2.5 flex-shrink-0">
      {/* Video Title Header */}
      {videoTitle && (
        <div className="flex items-center gap-2 text-xs">
          <Film className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="font-medium text-slate-300 truncate" title={videoTitle}>
            {videoTitle}
          </span>
          <span className="text-[10px] text-slate-500 font-mono flex-shrink-0 ml-auto">
            {playbackState.videoId || 'Default'}
          </span>
        </div>
      )}

      {/* If User Can Control Playback (Host or Moderator) */}
      {canControl ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Quick playback buttons */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5">
            <button
              onClick={() =>
                playbackState.isPlaying
                  ? onPause(playbackState.currentTime)
                  : onPlay(playbackState.currentTime)
              }
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition shadow-md ${
                playbackState.isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
              }`}
            >
              {playbackState.isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleRelativeSeek(-10)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Rewind 10 seconds"
            >
              <Rewind className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleRelativeSeek(10)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Fast forward 10 seconds"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onSeek(0)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Restart from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Change Video Input Bar */}
          <form onSubmit={handleVideoSubmit} className="w-full sm:flex-1 flex gap-2 min-w-0">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Youtube className="w-3.5 h-3.5 text-red-500" />
              </div>
              <input
                type="text"
                placeholder="Paste YouTube Video URL or ID"
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={!videoInput.trim() || isSubmittingVideo}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>Load</span>
            </button>
          </form>
        </div>
      ) : (
        /* Regular Participant Bar */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-0.5">
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[11px] sm:text-xs">Synchronized with Host. Use the button to ask for play/pause/seek.</span>
          </div>

          <button
            onClick={onRequestActionOpen}
            className="w-full sm:w-auto px-4 py-2 sm:py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium text-xs rounded-xl shadow-md shadow-red-600/20 transition flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            <Send className="w-3 h-3" />
            <span>Request Action</span>
          </button>
        </div>
      )}
    </div>
  );
};
