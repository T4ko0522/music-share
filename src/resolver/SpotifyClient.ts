import SpotifyWebApi from 'spotify-web-api-node';
import { Logger } from '../logger/index.js';
import { AppError, ErrorCategory } from '../errors/index.js';

const TOKEN_REFRESH_BUFFER_MS = 60_000; // refresh 1 minute before expiry

export class SpotifyClient {
  readonly api: SpotifyWebApi;
  private tokenExpiresAt = 0;
  private refreshPromise: Promise<void> | null = null;
  private readonly logger = new Logger('SpotifyClient');

  constructor(clientId: string, clientSecret: string) {
    this.api = new SpotifyWebApi({ clientId, clientSecret });
  }

  /** Ensure we have a valid access token before making API calls */
  async ensureToken(): Promise<void> {
    if (Date.now() < this.tokenExpiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return;
    }

    // Coalesce concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshToken();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      this.logger.info('Refreshing Spotify access token');
      const result = await this.api.clientCredentialsGrant();
      this.api.setAccessToken(result.body.access_token);
      this.tokenExpiresAt = Date.now() + result.body.expires_in * 1000;
      this.logger.info('Spotify token refreshed', { expiresIn: result.body.expires_in });
    } catch (error) {
      throw new AppError(
        'Failed to refresh Spotify access token',
        ErrorCategory.Api,
        { error: String(error) },
      );
    }
  }
}
