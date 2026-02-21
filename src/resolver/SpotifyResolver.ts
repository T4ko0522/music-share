import { MusicService, type TrackMetadata } from '../types/index.js';
import type { ISourceResolver } from './ISourceResolver.js';
import type { SpotifyClient } from './SpotifyClient.js';
import { Logger } from '../logger/index.js';
import { AppError, ErrorCategory } from '../errors/index.js';

export class SpotifyResolver implements ISourceResolver {
  readonly service = MusicService.Spotify;
  private readonly client: SpotifyClient;
  private readonly logger = new Logger('SpotifyResolver');

  constructor(client: SpotifyClient) {
    this.client = client;
  }

  async resolve(trackId: string): Promise<TrackMetadata> {
    try {
      await this.client.ensureToken();
      this.logger.debug('Fetching Spotify track', { trackId });

      const response = await this.client.api.getTrack(trackId);
      const track = response.body;

      return {
        title: track.name,
        artists: track.artists.map((a) => a.name),
        durationMs: track.duration_ms,
        isrc: track.external_ids?.isrc,
        albumName: track.album.name,
        releaseYear: track.album.release_date
          ? parseInt(track.album.release_date.substring(0, 4), 10)
          : undefined,
        explicit: track.explicit,
        sourceService: MusicService.Spotify,
        sourceUrl: track.external_urls.spotify,
        thumbnailUrl: track.album.images[0]?.url,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('Failed to resolve Spotify track', { trackId, error: String(error) });
      throw new AppError(
        `Failed to fetch Spotify track: ${trackId}`,
        ErrorCategory.Api,
        { trackId, error: String(error) },
      );
    }
  }
}
