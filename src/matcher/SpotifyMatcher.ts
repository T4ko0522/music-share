import { MusicService, type TrackMetadata, type MatchCandidate } from '../types/index.js';
import type { IServiceMatcher } from './IServiceMatcher.js';
import type { SpotifyClient } from '../resolver/SpotifyClient.js';
import { Logger } from '../logger/index.js';

export class SpotifyMatcher implements IServiceMatcher {
  readonly service = MusicService.Spotify;
  private readonly client: SpotifyClient;
  private readonly logger = new Logger('SpotifyMatcher');

  constructor(client: SpotifyClient) {
    this.client = client;
  }

  async search(source: TrackMetadata): Promise<MatchCandidate[]> {
    try {
      await this.client.ensureToken();

      // Try ISRC search first (most accurate)
      if (source.isrc) {
        const isrcResults = await this.searchByIsrc(source.isrc);
        if (isrcResults.length > 0) {
          this.logger.debug('Found Spotify match via ISRC', { isrc: source.isrc });
          return isrcResults;
        }
      }

      // Fall back to text search
      return await this.searchByText(source);
    } catch (error) {
      this.logger.error('Spotify search failed', { error: String(error) });
      return [];
    }
  }

  private async searchByIsrc(isrc: string): Promise<MatchCandidate[]> {
    const response = await this.client.api.searchTracks(`isrc:${isrc}`, { limit: 5 });
    return this.mapTracks(response.body.tracks.items);
  }

  private async searchByText(source: TrackMetadata): Promise<MatchCandidate[]> {
    const artist = source.artists[0] ?? '';
    const query = `track:${source.title} artist:${artist}`;
    this.logger.debug('Searching Spotify by text', { query });

    const response = await this.client.api.searchTracks(query, { limit: 5 });
    return this.mapTracks(response.body.tracks.items);
  }

  private mapTracks(tracks: Array<{
    name: string;
    artists: Array<{ name: string }>;
    duration_ms: number;
    external_urls: { spotify: string };
    album: { name: string; release_date: string };
    explicit: boolean;
  }>): MatchCandidate[] {
    return tracks.map((track) => ({
      service: MusicService.Spotify,
      url: track.external_urls.spotify,
      title: track.name,
      artists: track.artists.map((a) => a.name),
      durationMs: track.duration_ms,
      albumName: track.album.name,
      releaseYear: track.album.release_date
        ? parseInt(track.album.release_date.substring(0, 4), 10)
        : undefined,
      explicit: track.explicit,
    }));
  }
}
