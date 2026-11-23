import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlaybackState, Role } from '../types';
import { VolumeX, Volume2, Play, Pause, RotateCcw, ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName?: string;
  x: number;
}

interface VideoPlayerProps {
  playbackState: PlaybackState;
  userRole: Role;
  onLocalPlay?: (time: number) => void;
  onLocalPause?: (time: number) => void;
  onLocalSeek?: (time: number) => void;
  onVideoInfo?: (info: { title: string; duration: number }) => void;
  reactions?: FloatingReaction[];
  onSendReaction?: (emoji: string) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  playbackState,
  userRole,
  onLocalPlay,
  onLocalPause,
  onLocalSeek,
  onVideoInfo,
  reactions,
  onSendReaction,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isApiReadyRef = useRef<boolean>(false);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const driftIntervalRef = useRef<any>(null);
  const currentVideoIdRef = useRef<string | null>(null);

  const canControl = userRole === 'HOST' || userRole === 'MODERATOR';
  const canControlRef = useRef<boolean>(canControl);
  canControlRef.current = canControl;

  const onLocalPlayRef = useRef(onLocalPlay);
  onLocalPlayRef.current = onLocalPlay;

  const onLocalPauseRef = useRef(onLocalPause);
  onLocalPauseRef.current = onLocalPause;

  const onLocalSeekRef = useRef(onLocalSeek);
  onLocalSeekRef.current = onLocalSeek;

  const onVideoInfoRef = useRef(onVideoInfo);
  onVideoInfoRef.current = onVideoInfo;

  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [hasAutoplayBlocked, setHasAutoplayBlocked] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [localDisplayTime, setLocalDisplayTime] = useState<number>(playbackState.currentTime);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubValue, setScrubValue] = useState<number>(playbackState.currentTime);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Extract and emit video title & duration
  const reportVideoInfo = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      const data = typeof player.getVideoData === 'function' ? player.getVideoData() : null;
      const dur = typeof player.getDuration === 'function' ? player.getDuration() : 0;
      const title = data?.title || 'YouTube Video';
      if (dur > 0) setDuration(dur);
      if (onVideoInfoRef.current) {
        onVideoInfoRef.current({ title, duration: Math.max(0, dur) });
      }
    } catch {
      // ignore
    }
  }, []);

  // Synchronize player with authoritative state without reloading iframe
  const syncPlayerWithState = useCallback((state: PlaybackState, isInitial = false) => {
    const player = playerRef.current;
    if (!player || typeof player.getPlayerState !== 'function') return;

    isApplyingRemoteRef.current = true;

    try {
      let targetTime = state.currentTime || 0;
      if (state.isPlaying && state.updatedAt) {
        const elapsed = (Date.now() - state.updatedAt) / 1000;
        targetTime += elapsed;
      }

      const nextVideoId = state.videoId || 'dQw4w9WgXcQ';
      const isNewVideo = currentVideoIdRef.current !== nextVideoId;

      if (isNewVideo || isInitial) {
        currentVideoIdRef.current = nextVideoId;
        if (state.isPlaying) {
          if (typeof player.loadVideoById === 'function') {
            player.loadVideoById(nextVideoId, Math.max(0, targetTime));
          }
        } else {
          if (typeof player.cueVideoById === 'function') {
            player.cueVideoById(nextVideoId, Math.max(0, targetTime));
          }
        }
        setTimeout(reportVideoInfo, 1000);
      } else {
        // Drift correction: if local time differs by > 1.5s, seek
        const currentLocalTime = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
        const drift = Math.abs(currentLocalTime - targetTime);

        if (drift > 1.5 && typeof player.seekTo === 'function') {
          player.seekTo(Math.max(0, targetTime), true);
        }

        // Apply play/pause state
        if (!state.isPlaying) {
          if (typeof player.pauseVideo === 'function') {
            player.pauseVideo();
          }
        } else {
          const playerState = typeof player.getPlayerState === 'function' ? player.getPlayerState() : -1;
          if (playerState !== 1 && playerState !== 3) {
            const playPromise = player.playVideo?.();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(() => setHasAutoplayBlocked(true));
            }
          }
        }
      }
    } catch (err) {
      console.warn('[YouTube Player] Error during sync:', err);
    } finally {
      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 350);
    }
  }, [reportVideoInfo]);

  // Handle local user actions on player
  const handlePlayerStateChange = useCallback((event: any) => {
    if (isApplyingRemoteRef.current) return;
    const state = event.data;
    const player = playerRef.current;
    if (!player || typeof player.getCurrentTime !== 'function') return;

    try {
      const currentTime = player.getCurrentTime() || 0;
      reportVideoInfo();

      if (!canControlRef.current) {
        // Non-controllers should not trigger local state emissions
        return;
      }

      // Note: Deliberate Play/Pause by the Host or Moderator is initiated through
      // the interactive video overlay or RoomControls buttons.
      // We do NOT emit pause on iframe state change (2) because Chrome/Edge automatically
      // pauses/throttles background iframes when switching browser tabs or windows,
      // which would incorrectly stop the video for the entire watch party!
      if (state === 1 && !playbackState.isPlaying) {
        onLocalPlayRef.current?.(currentTime);
      }
    } catch (err) {
      console.warn('[YouTube Player] Error handling state change:', err);
    }
  }, [reportVideoInfo]);

  // Safely initialize YouTube player exactly once
  const initPlayer = useCallback(() => {
    if (!isApiReadyRef.current || !wrapperRef.current || playerRef.current) return;

    try {
      wrapperRef.current.innerHTML = '';
      const mountElement = document.createElement('div');
      mountElement.style.width = '100%';
      mountElement.style.height = '100%';
      wrapperRef.current.appendChild(mountElement);

      const initialVideoId = currentVideoIdRef.current || 'dQw4w9WgXcQ';

      playerRef.current = new window.YT.Player(mountElement, {
        videoId: initialVideoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          modestbranding: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => {
            setIsPlayerReady(true);
            const p = playerRef.current;
            if (p) {
              if (playbackState.isPlaying) {
                p.loadVideoById(initialVideoId, playbackState.currentTime || 0);
              } else {
                p.cueVideoById(initialVideoId, playbackState.currentTime || 0);
              }
            }
            reportVideoInfo();
          },
          onStateChange: handlePlayerStateChange,
          onError: (err: any) => {
            console.warn('[YouTube Player] Player error:', err);
          },
        },
      });
    } catch (err) {
      console.error('[YouTube Player] Initialization exception:', err);
    }
  }, [handlePlayerStateChange, playbackState.currentTime, playbackState.isPlaying, reportVideoInfo]);

  // Load YouTube script once
  useEffect(() => {
    currentVideoIdRef.current = playbackState.videoId || 'dQw4w9WgXcQ';

    if (window.YT && window.YT.Player) {
      isApiReadyRef.current = true;
      initPlayer();
      return;
    }

    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousOnReady) previousOnReady();
      isApiReadyRef.current = true;
      initPlayer();
    };

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Apply authoritative state when player is ready or state changes
  useEffect(() => {
    if (isPlayerReady) {
      syncPlayerWithState(playbackState);
    }
  }, [isPlayerReady, playbackState, syncPlayerWithState]);

  // Periodic drift check & time updates
  useEffect(() => {
    driftIntervalRef.current = setInterval(() => {
      if (!isPlayerReady) return;
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;

      reportVideoInfo();

      const actualTime = player.getCurrentTime() || 0;
      if (!isScrubbing) {
        setLocalDisplayTime(actualTime);
      }

      if (!playbackState.isPlaying || isApplyingRemoteRef.current) return;

      try {
        const elapsed = (Date.now() - playbackState.updatedAt) / 1000;
        const expectedTime = playbackState.currentTime + elapsed;

        // Auto-resume if the browser throttled/paused the iframe while switching tabs or in background
        if (typeof player.getPlayerState === 'function' && player.getPlayerState() !== 1 && typeof player.playVideo === 'function') {
          player.playVideo();
        }

        if (Math.abs(actualTime - expectedTime) > 2.0 && typeof player.seekTo === 'function') {
          isApplyingRemoteRef.current = true;
          player.seekTo(expectedTime, true);
          setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 350);
        }
      } catch {
        // ignore
      }
    }, 1000);

    return () => {
      if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
    };
  }, [isPlayerReady, isScrubbing, playbackState, reportVideoInfo]);

  // Direct Scrubber Drag on Video
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScrubValue(parseFloat(e.target.value));
  };

  const handleScrubberCommit = () => {
    setIsScrubbing(false);
    if (canControl) {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(scrubValue, true);
      }
      onLocalSeekRef.current?.(scrubValue);
    }
  };

  const togglePlayPause = () => {
    if (!canControlRef.current) return;
    const player = playerRef.current;
    if (!player) return;
    const currentTime = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : localDisplayTime;

    if (playbackState.isPlaying) {
      if (typeof player.pauseVideo === 'function') {
        player.pauseVideo();
      }
      onLocalPauseRef.current?.(currentTime);
    } else {
      if (typeof player.playVideo === 'function') {
        const p = player.playVideo();
        if (p && typeof p.catch === 'function') {
          p.catch(() => setHasAutoplayBlocked(true));
        }
      }
      onLocalPlayRef.current?.(currentTime);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const player = playerRef.current;
    if (!player) return;
    if (isMuted) {
      player.unMute?.();
      setIsMuted(false);
    } else {
      player.mute?.();
      setIsMuted(true);
    }
  };

  const handleManualUnmute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.unMute === 'function') playerRef.current.unMute();
        if (typeof playerRef.current.playVideo === 'function') playerRef.current.playVideo();
        setHasAutoplayBlocked(false);
      } catch {
        // ignore
      }
    }
  };

  const maxDuration = duration > 0 ? duration : Math.max(localDisplayTime + 60, 240);

  return (
    <div className="relative w-full h-full min-h-[180px] bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 group select-none flex items-center justify-center">
      {/* Outer unmanaged container for YouTube IFrame */}
      <div ref={wrapperRef} className="w-full h-full pointer-events-none" />

      {/* Clickable Backdrop across the entire video player to Toggle Play/Pause */}
      {canControl && (
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={togglePlayPause}
          title={playbackState.isPlaying ? 'Click to Pause' : 'Click to Play'}
        />
      )}

      {/* Center Big Play Button when paused and user can control */}
      {canControl && !playbackState.isPlaying && (
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-red-600/90 hover:bg-red-500 hover:scale-110 text-white flex items-center justify-center shadow-2xl transition z-20 cursor-pointer"
          title="Play video"
        >
          <Play className="w-8 h-8 fill-current ml-1" />
        </button>
      )}

      {/* Browser Autoplay Blocked Banner */}
      {hasAutoplayBlocked && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold rounded-full shadow-lg backdrop-blur cursor-pointer transition animate-in fade-in"
          onClick={handleManualUnmute}
        >
          <VolumeX className="w-4 h-4 animate-pulse" />
          <span>Click to start playback & enable audio</span>
        </div>
      )}

      {/* Floating Animated Reaction Emojis on Key Moments */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {reactions && reactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.x}%`, bottom: '22%' }}
            className="absolute flex flex-col items-center animate-reaction-float select-none pointer-events-none"
          >
            <span className="text-3xl sm:text-4xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] transform hover:scale-125">
              {r.emoji}
            </span>
            {r.senderName && (
              <span className="text-[10px] font-bold text-white bg-black/70 px-1.5 py-0.5 rounded-full border border-white/20 mt-1 whitespace-nowrap shadow">
                {r.senderName}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Floating On-Video Scrubber and Controls Bar (Directly on Video) */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 py-2 space-y-1.5 transition-opacity duration-300 opacity-95 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* The Draggable Timeline Progress Bar right on the video */}
        <div className="relative flex items-center w-full">
          <input
            type="range"
            min={0}
            max={maxDuration}
            step={0.5}
            value={isScrubbing ? scrubValue : localDisplayTime}
            disabled={!canControl}
            onMouseDown={() => canControl && setIsScrubbing(true)}
            onTouchStart={() => canControl && setIsScrubbing(true)}
            onChange={handleScrubberChange}
            onMouseUp={handleScrubberCommit}
            onTouchEnd={handleScrubberCommit}
            className={`w-full h-1.5 hover:h-2 rounded-lg appearance-none cursor-pointer transition-all ${
              canControl
                ? 'accent-red-500 bg-slate-700/80 hover:bg-slate-600'
                : 'accent-slate-500 bg-slate-800 cursor-not-allowed opacity-75'
            }`}
          />
        </div>

        {/* Bottom controls row on video */}
        <div className="flex items-center justify-between text-xs text-slate-200">
          <div className="flex items-center gap-2">
            {canControl ? (
              <button
                onClick={togglePlayPause}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition"
                title={playbackState.isPlaying ? 'Pause' : 'Play'}
              >
                {playbackState.isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-black/60 px-2 py-0.5 rounded-md border border-white/10 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                In Sync
              </span>
            )}

            <button
              onClick={toggleMute}
              className="p-1 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <span className="font-mono text-[11px] text-slate-300">
              {formatTime(isScrubbing ? scrubValue : localDisplayTime)} / {duration > 0 ? formatTime(duration) : '--:--'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            {/* Quick Emoji Reaction Buttons on Key Moments */}
            {onSendReaction && (
              <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-full px-2 py-0.5 backdrop-blur-sm">
                {['🔥', '🍿', '❤️', '😂', '🎉', '👏'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendReaction(emoji);
                    }}
                    className="hover:scale-135 transition transform text-xs sm:text-sm active:scale-90"
                    title={`React ${emoji} to this moment!`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {canControl ? (
              <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-md text-[10px]">
                CONTROLLER
              </span>
            ) : (
              <span className="text-slate-400 text-[10px]">Host Sync Active</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
