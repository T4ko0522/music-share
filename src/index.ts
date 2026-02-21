import YTMusic from 'ytmusic-api';
import { loadConfig } from './config.js';
import { Logger, LogLevel } from './logger/index.js';
import { SpotifyClient } from './resolver/SpotifyClient.js';
import { SpotifyResolver } from './resolver/SpotifyResolver.js';
import { YTMusicResolver } from './resolver/YTMusicResolver.js';
import { ResolverRegistry } from './resolver/ResolverRegistry.js';
import { SpotifyMatcher } from './matcher/SpotifyMatcher.js';
import { YTMusicMatcher } from './matcher/YTMusicMatcher.js';
import { CrossServiceMatcher } from './matcher/CrossServiceMatcher.js';
import { TtlCache } from './cache/TtlCache.js';
import { RateLimiter } from './ratelimit/RateLimiter.js';
import { DiscordBot } from './discord/DiscordBot.js';
import type { ConversionResult } from './types/index.js';
import type { IServiceMatcher } from './matcher/IServiceMatcher.js';

const logger = new Logger('Main');

async function main(): Promise<void> {
  // Set log level from environment
  if (process.env['LOG_LEVEL'] === 'debug') {
    Logger.setLevel(LogLevel.Debug);
  }

  const config = loadConfig();
  logger.info('Configuration loaded');

  // --- Spotify ---
  const spotifyClient = new SpotifyClient(config.spotifyClientId, config.spotifyClientSecret);
  const spotifyResolver = new SpotifyResolver(spotifyClient);
  const spotifyMatcher = new SpotifyMatcher(spotifyClient);

  // --- YouTube Music ---
  const ytmusic = new YTMusic();
  const ytmusicResolver = new YTMusicResolver(ytmusic);
  const ytmusicMatcher = new YTMusicMatcher(ytmusic);

  // --- Resolver Registry ---
  const resolverRegistry = new ResolverRegistry();
  resolverRegistry.register(spotifyResolver);
  if (!config.disableYtmusic) {
    resolverRegistry.register(ytmusicResolver);
  }

  // --- Matchers ---
  const matchers: IServiceMatcher[] = [spotifyMatcher];
  if (!config.disableYtmusic) {
    matchers.push(ytmusicMatcher);
  }
  const crossMatcher = new CrossServiceMatcher(matchers);

  // --- Cache & Rate Limiter ---
  const cache = new TtlCache<ConversionResult>(24 * 60 * 60 * 1000); // 24h TTL
  const rateLimiter = new RateLimiter();

  // --- Discord Bot ---
  const bot = new DiscordBot({
    token: config.discordBotToken,
    resolverRegistry,
    crossMatcher,
    cache,
    rateLimiter,
  });

  // --- Graceful Shutdown ---
  const shutdown = async (signal: string) => {
    logger.info('Shutting down', { signal });
    await bot.stop();
    cache.destroy();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // --- Start ---
  logger.info('Starting bot...');
  await bot.start();
}

main().catch((error) => {
  logger.error('Fatal error', { error: String(error) });
  process.exit(1);
});
