import type { MusicService, TrackMetadata, MatchCandidate } from '../types/index.js';

/** Searches a target service for candidates matching the source track */
export interface IServiceMatcher {
  readonly service: MusicService;
  search(source: TrackMetadata): Promise<MatchCandidate[]>;
}
