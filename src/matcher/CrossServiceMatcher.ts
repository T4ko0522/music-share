import type { TrackMetadata, ServiceLink } from '../types/index.js';
import type { IServiceMatcher } from './IServiceMatcher.js';
import type { YouTubeChannelBlacklist } from './YouTubeChannelBlacklist.js';
import { selectBestMatch } from './scoring.js';
import { Logger } from '../logger/index.js';

export class CrossServiceMatcher {
  private readonly matchers: IServiceMatcher[];
  private readonly youtubeChannelBlacklist: YouTubeChannelBlacklist | null;
  private readonly logger = new Logger('CrossServiceMatcher');

  constructor(matchers: IServiceMatcher[], youtubeChannelBlacklist?: YouTubeChannelBlacklist | null) {
    this.matchers = matchers;
    this.youtubeChannelBlacklist = youtubeChannelBlacklist ?? null;
  }

  /**
   * Search all registered matchers (except the source service) in parallel.
   * Returns the best match from each service.
   */
  async match(source: TrackMetadata): Promise<ServiceLink[]> {
    // Filter out matchers for the source service
    const targetMatchers = this.matchers.filter(
      (m) => m.service !== source.sourceService,
    );

    if (targetMatchers.length === 0) return [];

    // Search all target services in parallel using Promise.allSettled
    const results = await Promise.allSettled(
      targetMatchers.map(async (matcher) => {
        this.logger.debug('Searching service', { service: matcher.service });
        const candidates = await matcher.search(source);
        const ytBlacklist = this.youtubeChannelBlacklist?.getAll();
        const best = selectBestMatch(source, candidates, {
          youtubeChannelBlacklist: ytBlacklist?.length ? new Set(ytBlacklist) : undefined,
        });
        return best
          ? {
              service: matcher.service,
              url: best.candidate.url,
              confidence: best.confidence,
            }
          : null;
      }),
    );

    const links: ServiceLink[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        links.push(result.value);
      } else if (result.status === 'rejected') {
        this.logger.warn('Matcher failed', { reason: String(result.reason) });
      }
    }

    return links;
  }
}
