import YTMusic from 'ytmusic-api';
import { MusicService, type TrackMetadata } from '../types/index.js';
import type { ISourceResolver } from './ISourceResolver.js';
import { Logger } from '../logger/index.js';
import { AppError, ErrorCategory } from '../errors/index.js';

export class YTMusicResolver implements ISourceResolver {
  readonly service = MusicService.YouTubeMusic;
  private readonly ytmusic: YTMusic;
  private initialized = false;
  private readonly logger = new Logger('YTMusicResolver');

  constructor(ytmusic: YTMusic) {
    this.ytmusic = ytmusic;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.ytmusic.initialize();
      this.initialized = true;
    }
  }

  async resolve(videoId: string): Promise<TrackMetadata> {
    try {
      await this.ensureInitialized();
      this.logger.debug('Fetching YT Music song', { videoId });

      const song = await this.ytmusic.getSong(videoId);

      return {
        title: song.name,
        artists: [song.artist.name],
        durationMs: song.duration * 1000, // ytmusic-api returns seconds
        sourceService: MusicService.YouTubeMusic,
        sourceUrl: `https://music.youtube.com/watch?v=${song.videoId}`,
        thumbnailUrl: song.thumbnails[song.thumbnails.length - 1]?.url,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('Failed to resolve YT Music song', { videoId, error: String(error) });
      throw new AppError(
        `Failed to fetch YT Music song: ${videoId}`,
        ErrorCategory.Api,
        { videoId, error: String(error) },
      );
    }
  }
}
