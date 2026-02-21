import type { MusicService, TrackMetadata } from '../types/index.js';

/** Resolves a track ID from a music service into canonical metadata */
export interface ISourceResolver {
  readonly service: MusicService;
  resolve(id: string): Promise<TrackMetadata>;
}
