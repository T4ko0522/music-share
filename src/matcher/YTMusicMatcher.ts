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

      return results.slice(0, 5).map((song) => {
        const s = song as { videoId: string; name: string; artist: { name: string; artistId?: string | null }; duration?: number; album?: { name?: string } };
        const youtubeChannelId = s.artist?.artistId ?? undefined;
        return {
          service: MusicService.YouTubeMusic,
          url: `https://music.youtube.com/watch?v=${s.videoId}`,
          title: s.name,
          artists: [s.artist.name],
          durationMs: (s.duration ?? 0) * 1000,
          albumName: s.album?.name,
          ...(youtubeChannelId && { youtubeChannelId }),
        };
      });
    } catch (error) {
      // Partial success: return empty array instead of throwing
      this.logger.error('YT Music search failed', { error: String(error) });
      return [];
    }
  }
}
