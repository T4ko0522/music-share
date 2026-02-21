import type { MusicService } from '../types/index.js';
import type { ISourceResolver } from './ISourceResolver.js';

export class ResolverRegistry {
  private readonly resolvers = new Map<MusicService, ISourceResolver>();

  register(resolver: ISourceResolver): void {
    this.resolvers.set(resolver.service, resolver);
  }

  get(service: MusicService): ISourceResolver | undefined {
    return this.resolvers.get(service);
  }

  has(service: MusicService): boolean {
    return this.resolvers.has(service);
  }
}
