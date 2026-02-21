declare module 'spotify-web-api-node' {
  interface ExternalIds {
    isrc?: string;
    ean?: string;
    upc?: string;
  }

  interface SpotifyImage {
    url: string;
    height: number | null;
    width: number | null;
  }

  interface SpotifyArtist {
    id: string;
    name: string;
    uri: string;
    external_urls: { spotify: string };
  }

  interface SpotifyAlbum {
    id: string;
    name: string;
    release_date: string;
    images: SpotifyImage[];
    uri: string;
  }

  interface SpotifyTrack {
    id: string;
    name: string;
    artists: SpotifyArtist[];
    album: SpotifyAlbum;
    duration_ms: number;
    explicit: boolean;
    external_ids: ExternalIds;
    external_urls: { spotify: string };
    uri: string;
  }

  interface SpotifyPagingObject<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  }

  interface SpotifyResponse<T> {
    body: T;
    headers: Record<string, string>;
    statusCode: number;
  }

  interface ClientCredentialsResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
  }

  interface SearchTracksResponse {
    tracks: SpotifyPagingObject<SpotifyTrack>;
  }

  class SpotifyWebApi {
    constructor(options?: {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
      accessToken?: string;
    });

    setAccessToken(token: string): void;
    getAccessToken(): string | undefined;

    clientCredentialsGrant(): Promise<SpotifyResponse<ClientCredentialsResponse>>;

    getTrack(trackId: string): Promise<SpotifyResponse<SpotifyTrack>>;

    searchTracks(
      query: string,
      options?: { limit?: number; offset?: number; market?: string },
    ): Promise<SpotifyResponse<SearchTracksResponse>>;
  }

  export = SpotifyWebApi;
}
