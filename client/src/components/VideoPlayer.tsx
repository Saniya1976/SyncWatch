import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlaybackState, Role } from '../types';
import { Volume2, VolumeX, AlertCircle } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isApiReadyRef = useRef<boolean>(false);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const lastKnownTimeRef = useRef<number>(0);
  const driftIntervalRef = useRef<any>(null);

  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasAutoplayBlocked, setHasAutoplayBlocked] = useState<boolean>(false);

  const canControl = userRole === 'HOST' || userRole === 'MODERATOR';

  // Load YouTube IFrame API script once
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
  }, []);

  const initPlayer = useCallback(() => {
    if (!isApiReadyRef.current || !containerRef.current || playerRef.current) return;

    const initialVideoId = playbackState.videoId || 'dQw4w9WgXcQ';

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: initialVideoId,
      playerVars: {
        autoplay: playbackState.isPlaying ? 1 : 0,
        controls: canControl ? 1 : 0, // Disable native YouTube controls for regular participants to enforce backend sync
        disablekb: canControl ? 0 : 1, // Disable keyboard controls if not host/mod
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: any) => {
          setIsPlayerReady(true);
          syncPlayerWithState(playbackState, true);
        },
        onStateChange: handlePlayerStateChange,
        onError: (err: any) => {
          console.warn('[YouTube Player] Error:', err);
        },
      },
    });
  }, [canControl]);

  // Handle local user actions on player
  const handlePlayerStateChange = (event: any) => {
    // If the state change was initiated by a server sync, ignore it to prevent loop
    if (isApplyingRemoteRef.current) return;
    if (!canControl) return;

    const state = event.data;
    const player = playerRef.current;
    if (!player || typeof player.getCurrentTime !== 'function') return;

    const currentTime = player.getCurrentTime();
    lastKnownTimeRef.current = currentTime;

    // YT.PlayerState.PLAYING = 1
    if (state === 1) {
      onLocalPlay?.(currentTime);
    }
    // YT.PlayerState.PAUSED = 2
    else if (state === 2) {
      onLocalPause?.(currentTime);
    }
  };

  // Synchronize player with authoritative state
  const syncPlayerWithState = useCallback((state: PlaybackState, isInitial = false) => {
    const player = playerRef.current;
    if (!player || typeof player.getPlayerState !== 'function') return;

    isApplyingRemoteRef.current = true;

    try {
      // Calculate estimated time if currently playing
      let targetTime = state.currentTime;
      if (state.isPlaying && state.updatedAt) {
        const elapsed = (Date.now() - state.updatedAt) / 1000;
        targetTime += elapsed;
      }

      // Check if video changed
      const currentUrl = player.getVideoUrl ? player.getVideoUrl() : '';
      const currentVideoId = state.videoId;

      if (currentVideoId && (!currentUrl.includes(currentVideoId) || isInitial)) {
        if (state.isPlaying) {
          player.loadVideoById({
            videoId: currentVideoId,
            startSeconds: Math.max(0, targetTime),
          });
        } else {
          player.cueVideoById({
            videoId: currentVideoId,
            startSeconds: Math.max(0, targetTime),
          });
        }
      } else {
        // Drift correction: if local time differs by > 1.5s, seek
        const currentLocalTime = player.getCurrentTime() || 0;
        const drift = Math.abs(currentLocalTime - targetTime);

        if (drift > 1.5 || isInitial) {
          player.seekTo(Math.max(0, targetTime), true);
        }

        // Apply play/pause state
        const playerState = player.getPlayerState();
        if (state.isPlaying && playerState !== 1) {
          const playPromise = player.playVideo();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              setHasAutoplayBlocked(true);
            });
          }
        } else if (!state.isPlaying && playerState === 1) {
          player.pauseVideo();
        }
      }
    } finally {
      // Release lock after a short buffer to allow YouTube API to settle
      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 500);
    }
  }, []);

  // Watch for state changes from backend
  useEffect(() => {
    if (isPlayerReady) {
      syncPlayerWithState(playbackState);
    }
  }, [playbackState, isPlayerReady, syncPlayerWithState]);

  // Periodic drift check (every 3 seconds)
  useEffect(() => {
    driftIntervalRef.current = setInterval(() => {
      if (!isPlayerReady || !playbackState.isPlaying || isApplyingRemoteRef.current) return;
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;

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
    }, 3000);

    return () => {
      if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
    };
  }, [isPlayerReady, playbackState]);

  const handleManualUnmute = () => {
    if (playerRef.current) {
      playerRef.current.unMute();
      playerRef.current.playVideo();
      setIsMuted(false);
      setHasAutoplayBlocked(false);
    }
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Player container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Overlay barrier for non-moderators so clicks do not desync the YouTube player */}
      {!canControl && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed bg-transparent"
          title="Playback is synchronized by the Room Host. Submit a request to change playback."
        />
      )}

      {/* Browser Autoplay Blocked Banner */}
      {hasAutoplayBlocked && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white text-sm font-medium rounded-full shadow-lg backdrop-blur cursor-pointer transition"
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

