/** Supported music services */
export enum MusicService {
  Spotify = 'spotify',
  YouTubeMusic = 'ytmusic',
  AppleMusic = 'apple',   // 対応予定
}

/** Result of URL parsing */
export interface ParsedUrl {
  service: MusicService;
  id: string;
  originalUrl: string;
}

/** Canonical track metadata from any service */
export interface TrackMetadata {
  title: string;
  artists: string[];
  durationMs: number;
  isrc?: string;
  albumName?: string;
  releaseYear?: number;
  explicit?: boolean;
  sourceService: MusicService;
  sourceUrl: string;
  thumbnailUrl?: string;
}

/** A candidate match from a target service */
export interface MatchCandidate {
  service: MusicService;
  url: string;
  title: string;
  artists: string[];
  durationMs: number;
  albumName?: string;
  releaseYear?: number;
  explicit?: boolean;
}

/** A scored match candidate */
export interface ScoredMatch {
  candidate: MatchCandidate;
  score: number;
  confidence: MatchConfidence;
}

/** Confidence levels for match quality */
export enum MatchConfidence {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

/** Final conversion result for one target service */
export interface ServiceLink {
  service: MusicService;
  url: string;
  confidence: MatchConfidence;
}

/** Complete conversion result */
export interface ConversionResult {
  source: TrackMetadata;
  links: ServiceLink[];
}
