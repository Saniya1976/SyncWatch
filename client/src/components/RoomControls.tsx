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
} from 'lucide-react';

interface RoomControlsProps {
  playbackState: PlaybackState;
  userRole: Role;
  onPlay: (currentTime?: number) => void;
  onPause: (currentTime?: number) => void;
  onSeek: (seconds: number) => void;
  onChangeVideo: (videoUrlOrId: string) => void;
  onRequestActionOpen: () => void;
}

export const RoomControls: React.FC<RoomControlsProps> = ({
  playbackState,
  userRole,
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
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* If User Can Control Playback (Host or Moderator) */}
      {canControl ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Play / Pause & Quick Seek */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  playbackState.isPlaying
                    ? onPause(playbackState.currentTime)
                    : onPlay(playbackState.currentTime)
                }
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg ${
                  playbackState.isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                }`}
              >
                {playbackState.isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Video</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleRelativeSeek(-10)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Rewind 10 seconds"
              >
                <Rewind className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleRelativeSeek(10)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Fast forward 10 seconds"
              >
                <FastForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => onSeek(0)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Restart from beginning"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Quick status badge */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${playbackState.isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{playbackState.isPlaying ? 'PLAYING' : 'PAUSED'}</span>
              <span>•</span>
              <span>{Math.floor(playbackState.currentTime / 60)}:{(Math.floor(playbackState.currentTime % 60)).toString().padStart(2, '0')}</span>
            </div>
          </div>

          {/* Change Video Input Bar */}
          <form onSubmit={handleVideoSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Youtube className="w-4 h-4 text-red-500" />
              </div>
              <input
                type="text"
                placeholder="Paste YouTube Video URL or ID (e.g. youtu.be/... or watch?v=...)"
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={!videoInput.trim() || isSubmittingVideo}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Load Video</span>
            </button>
          </form>
        </div>
      ) : (
        /* Regular Participant Bar */
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-1">
          <div className="flex items-center gap-2.5 text-slate-300 text-sm">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>You are viewing in sync with the Host. Playback is controlled by the room host.</span>
          </div>

          <button
            onClick={onRequestActionOpen}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-red-600/20 transition flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Request Playback Action</span>
          </button>
        </div>
      )}
    </div>
  );
};

