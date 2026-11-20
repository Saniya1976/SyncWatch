import { Room } from '../classes/Room.js';
import { Participant } from '../classes/Participant.js';
import { PlaybackState } from '../types/index.js';
import { canControlPlayback } from '../middleware/permissions.js';
import { extractYouTubeVideoId } from '../utils/youtube.js';

export class PlaybackService {
  private static instance: PlaybackService;

  private constructor() {}

  public static getInstance(): PlaybackService {
    if (!PlaybackService.instance) {
      PlaybackService.instance = new PlaybackService();
    }
    return PlaybackService.instance;
  }

  /**
   * Authoritatively updates playback to PLAY.
   */
  public handlePlay(
    room: Room,
    actor: Participant,
    currentTime?: number
  ): { success: boolean; state?: PlaybackState; error?: string } {
    if (!canControlPlayback(actor.role)) {
      return { success: false, error: 'Unauthorized: Only Host and Moderators can start playback.' };
    }

    const state = room.updatePlaybackState({
      isPlaying: true,
      currentTime: typeof currentTime === 'number' && currentTime >= 0 ? currentTime : undefined,
    });

    return { success: true, state };
  }

  /**
   * Authoritatively updates playback to PAUSE.
   */
  public handlePause(
    room: Room,
    actor: Participant,
    currentTime?: number
  ): { success: boolean; state?: PlaybackState; error?: string } {
    if (!canControlPlayback(actor.role)) {
      return { success: false, error: 'Unauthorized: Only Host and Moderators can pause playback.' };
    }

    const state = room.updatePlaybackState({
      isPlaying: false,
      currentTime: typeof currentTime === 'number' && currentTime >= 0 ? currentTime : undefined,
    });

    return { success: true, state };
  }

  /**
   * Authoritatively seeks to a specific time.
   */
  public handleSeek(
    room: Room,
    actor: Participant,
    currentTime: number
  ): { success: boolean; state?: PlaybackState; error?: string } {
    if (!canControlPlayback(actor.role)) {
      return { success: false, error: 'Unauthorized: Only Host and Moderators can seek video.' };
    }

    if (typeof currentTime !== 'number' || currentTime < 0 || isNaN(currentTime)) {
      return { success: false, error: 'Invalid seek position.' };
    }

    const state = room.updatePlaybackState({
      currentTime,
    });

    return { success: true, state };
  }

  /**
   * Authoritatively changes the current video.
   */
  public handleChangeVideo(
    room: Room,
    actor: Participant,
    videoUrlOrId: string
  ): { success: boolean; state?: PlaybackState; error?: string } {
    if (!canControlPlayback(actor.role)) {
      return { success: false, error: 'Unauthorized: Only Host and Moderators can change the video.' };
    }

    const videoId = extractYouTubeVideoId(videoUrlOrId);
    if (!videoId) {
      return { success: false, error: 'Invalid YouTube URL or Video ID.' };
    }

    const state = room.updatePlaybackState({
      videoId,
      currentTime: 0,
      isPlaying: true, // Auto-play when changing video
    });

    return { success: true, state };
  }
}

