import React, { useState } from 'react';
import { ActionType, ActionPayload } from '../types';
import { X, Play, Pause, FastForward, Youtube, Send } from 'lucide-react';

interface RequestActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (actionType: ActionType, payload?: ActionPayload) => void;
}

export const RequestActionModal: React.FC<RequestActionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedType, setSelectedType] = useState<ActionType>('PAUSE');
  const [seekMinutes, setSeekMinutes] = useState('0');
  const [seekSeconds, setSeekSeconds] = useState('30');
  const [videoUrl, setVideoUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let payload: ActionPayload | undefined;

    if (selectedType === 'SEEK') {
      const mins = parseInt(seekMinutes, 10) || 0;
      const secs = parseInt(seekSeconds, 10) || 0;
      payload = { currentTime: mins * 60 + secs };
    } else if (selectedType === 'CHANGE_VIDEO') {
      payload = { videoUrlOrId: videoUrl.trim() };
    }

    onSubmit(selectedType, payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white">Request Playback Action</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              The Host or Moderator must approve your request before it takes effect.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Action Type selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedType('PLAY')}
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                selectedType === 'PLAY'
                  ? 'bg-red-600/10 border-red-500 text-red-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Play</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('PAUSE')}
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                selectedType === 'PAUSE'
                  ? 'bg-red-600/10 border-red-500 text-red-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause Video</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('SEEK')}
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                selectedType === 'SEEK'
                  ? 'bg-red-600/10 border-red-500 text-red-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <FastForward className="w-4 h-4" />
              <span>Seek to Time</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('CHANGE_VIDEO')}
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                selectedType === 'CHANGE_VIDEO'
                  ? 'bg-red-600/10 border-red-500 text-red-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Youtube className="w-4 h-4" />
              <span>Change Video</span>
            </button>
          </div>

          {/* Conditional Input Fields */}
          {selectedType === 'SEEK' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Target Time</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="Mins"
                    value={seekMinutes}
                    onChange={(e) => setSeekMinutes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Minutes</span>
                </div>
                <span className="text-slate-500 font-bold mb-4">:</span>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="Secs"
                    value={seekSeconds}
                    onChange={(e) => setSeekSeconds(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Seconds</span>
                </div>
              </div>
            </div>
          )}

          {selectedType === 'CHANGE_VIDEO' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">YouTube Video URL or ID</label>
              <input
                type="text"
                placeholder="https://youtu.be/... or video ID"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium rounded-xl bg-red-600 hover:bg-red-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-red-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

