import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlaybackState, Role } from '../types';
import { VolumeX } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoPlayerProps {
  playbackState: PlaybackState;
  userRole: Role;
  onLocalPlay?: (time: number) => void;
  onLocalPause?: (time: number) => void;
  onLocalSeek?: (time: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  playbackState,
  userRole,
  onLocalPlay,
  onLocalPause,
  onLocalSeek,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isApiReadyRef = useRef<boolean>(false);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const driftIntervalRef = useRef<any>(null);
  const currentVideoIdRef = useRef<string | null>(null);

  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [hasAutoplayBlocked, setHasAutoplayBlocked] = useState<boolean>(false);

  const canControl = userRole === 'HOST' || userRole === 'MODERATOR';

  // Synchronize player with authoritative state
  const syncPlayerWithState = useCallback((state: PlaybackState, isInitial = false) => {
    const player = playerRef.current;
    if (!player || typeof player.getPlayerState !== 'function') return;

    isApplyingRemoteRef.current = true;

    try {
      // Calculate estimated time if currently playing
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
      } else {
        // Drift correction: if local time differs by > 1.5s, seek
        const currentLocalTime = player.getCurrentTime ? player.getCurrentTime() : 0;
        const drift = Math.abs(currentLocalTime - targetTime);

        if (drift > 1.5) {
          player.seekTo(Math.max(0, targetTime), true);
        }

        // Apply play/pause state
        const playerState = player.getPlayerState();
        // 1 = PLAYING, 2 = PAUSED
        if (state.isPlaying && playerState !== 1) {
          const playPromise = player.playVideo();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => setHasAutoplayBlocked(true));
          }
        } else if (!state.isPlaying && playerState === 1) {
          player.pauseVideo();
        }
      }
    } catch (err) {
      console.warn('[YouTube Player] Error during sync:', err);
    } finally {
      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 500);
    }
  }, []);

  // Handle local user actions on player
  const handlePlayerStateChange = useCallback((event: any) => {
    if (isApplyingRemoteRef.current) return;
    if (!canControl) return;

    const state = event.data;
    const player = playerRef.current;
    if (!player || typeof player.getCurrentTime !== 'function') return;

    try {
      const currentTime = player.getCurrentTime() || 0;

      // YT.PlayerState.PLAYING = 1
      if (state === 1) {
        onLocalPlay?.(currentTime);
      }
      // YT.PlayerState.PAUSED = 2
      else if (state === 2) {
        onLocalPause?.(currentTime);
      }
    } catch (err) {
      console.warn('[YouTube Player] Error handling state change:', err);
    }
  }, [canControl, onLocalPlay, onLocalPause]);

  // Safely initialize YouTube player without React DOM collision
  const initPlayer = useCallback(() => {
    if (!isApiReadyRef.current || !wrapperRef.current || playerRef.current) return;

    try {
      // Clear container and create an inner unmanaged element for YouTube to replace
      wrapperRef.current.innerHTML = '';
      const mountElement = document.createElement('div');
      mountElement.style.width = '100%';
      mountElement.style.height = '100%';
      wrapperRef.current.appendChild(mountElement);

      const initialVideoId = playbackState.videoId || 'dQw4w9WgXcQ';
      currentVideoIdRef.current = initialVideoId;

      playerRef.current = new window.YT.Player(mountElement, {
        videoId: initialVideoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: playbackState.isPlaying ? 1 : 0,
          controls: canControl ? 1 : 0,
          disablekb: canControl ? 0 : 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            setIsPlayerReady(true);
            syncPlayerWithState(playbackState, true);
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
  }, [canControl, handlePlayerStateChange, playbackState, syncPlayerWithState]);

  // Load YouTube script once
  useEffect(() => {
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
  }, [initPlayer]);

  // Watch for state changes from backend
  useEffect(() => {
    if (isPlayerReady) {
      syncPlayerWithState(playbackState);
    }
  }, [playbackState, isPlayerReady, syncPlayerWithState]);

  // Periodic drift check
  useEffect(() => {
    driftIntervalRef.current = setInterval(() => {
      if (!isPlayerReady || !playbackState.isPlaying || isApplyingRemoteRef.current) return;
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;

      try {
        const elapsed = (Date.now() - playbackState.updatedAt) / 1000;
        const expectedTime = playbackState.currentTime + elapsed;
        const actualTime = player.getCurrentTime();

        if (Math.abs(actualTime - expectedTime) > 2.5) {
          isApplyingRemoteRef.current = true;
          player.seekTo(expectedTime, true);
          setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 400);
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
    };
  }, [isPlayerReady, playbackState]);

  const handleManualUnmute = () => {
    if (playerRef.current) {
      try {
        playerRef.current.unMute();
        playerRef.current.playVideo();
        setHasAutoplayBlocked(false);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Outer unmanaged container: React owns wrapperRef, inner mountElement is owned by YouTube */}
      <div ref={wrapperRef} className="w-full h-full" />

      {/* Overlay barrier for non-moderators */}
      {!canControl && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed bg-transparent"
          title="Playback is synchronized by the Room Host."
        />
      )}

      {/* Browser Autoplay Blocked Banner */}
      {hasAutoplayBlocked && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white text-sm font-medium rounded-full shadow-lg backdrop-blur cursor-pointer transition"
          onClick={handleManualUnmute}
        >
          <VolumeX className="w-4 h-4 animate-pulse" />
          <span>Click to enable sound & start video</span>
        </div>
      )}

      {/* Non-controller overlay info badge */}
      {!canControl && (
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none opacity-80 hover:opacity-100 transition">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-black/70 backdrop-blur text-gray-300 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Synchronized with Host
          </span>
        </div>
      )}
    </div>
  );
};
