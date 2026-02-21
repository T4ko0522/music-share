import 'dotenv/config';
import { AppError, ErrorCategory } from './errors/index.js';

export interface Config {
  discordBotToken: string;
  spotifyClientId: string;
  spotifyClientSecret: string;
  ytmusicAuthCookie?: string;
  disableYtmusic: boolean;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new AppError(
      `Missing required environment variable: ${key}`,
      ErrorCategory.Config,
      { key },
    );
  }
  return value;
}

export function loadConfig(): Config {
  return {
    discordBotToken: requireEnv('DISCORD_BOT_TOKEN'),
    spotifyClientId: requireEnv('SPOTIFY_CLIENT_ID'),
    spotifyClientSecret: requireEnv('SPOTIFY_CLIENT_SECRET'),
    ytmusicAuthCookie: process.env['YTMUSIC_AUTH_COOKIE'] || undefined,
    disableYtmusic: process.env['DISABLE_YTMUSIC'] === 'true',
  };
}
