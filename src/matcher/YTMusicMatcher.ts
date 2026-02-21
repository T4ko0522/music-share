import YTMusic from 'ytmusic-api';
import { MusicService, type TrackMetadata, type MatchCandidate } from '../types/index.js';
import type { IServiceMatcher } from './IServiceMatcher.js';
import { Logger } from '../logger/index.js';

export class YTMusicMatcher implements IServiceMatcher {
  readonly service = MusicService.YouTubeMusic;
  private readonly ytmusic: YTMusic;
  private initialized = false;
  private readonly logger = new Logger('YTMusicMatcher');

  constructor(ytmusic: YTMusic) {
    this.ytmusic = ytmusic;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.ytmusic.initialize();
      this.initialized = true;
    }
  }

  async search(source: TrackMetadata): Promise<MatchCandidate[]> {
    try {
      await this.ensureInitialized();

      const artist = source.artists[0] ?? '';
      const query = `${source.title} ${artist}`;
      this.logger.debug('Searching YT Music', { query });

      const results = await this.ytmusic.searchSongs(query);

      return results.slice(0, 5).map((song) => ({
        service: MusicService.YouTubeMusic,
        url: `https://music.youtube.com/watch?v=${song.videoId}`,
        title: song.name,
        artists: [song.artist.name],
        durationMs: (song.duration ?? 0) * 1000,  // seconds → ms
        albumName: song.album?.name,
      }));
    } catch (error) {
      // Partial success: return empty array instead of throwing
      this.logger.error('YT Music search failed', { error: String(error) });
      return [];
    }
  }
}
