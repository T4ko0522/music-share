import { MusicService, type ParsedUrl } from '../types/index.js';

interface UrlPattern {
  service: MusicService;
  regex: RegExp;
  idExtractor: (match: RegExpMatchArray) => string | null;
}

const URL_PATTERNS: UrlPattern[] = [
  // Spotify track: open.spotify.com/track/{id} or open.spotify.com/intl-xx/track/{id}
  {
    service: MusicService.Spotify,
    regex: /https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]+)/,
    idExtractor: (m) => m[1] ?? null,
  },
  // YouTube Music: music.youtube.com/watch?v={id}
  {
    service: MusicService.YouTubeMusic,
    regex: /https?:\/\/music\.youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
    idExtractor: (m) => m[1] ?? null,
  },
  // Regular YouTube: youtube.com/watch?v={id} or youtu.be/{id}
  {
    service: MusicService.YouTubeMusic,
    regex: /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
    idExtractor: (m) => m[1] ?? null,
  },
  {
    service: MusicService.YouTubeMusic,
    regex: /https?:\/\/youtu\.be\/([A-Za-z0-9_-]+)/,
    idExtractor: (m) => m[1] ?? null,
  },
  // Apple Music（対応予定）: music.apple.com/{storefront}/album/.../{id} 等
  {
    service: MusicService.AppleMusic,
    regex: /https?:\/\/music\.apple\.com\/([a-z]{2})\/(?:album|song)\/[^/]+\/(\d+)(?:\?i=(\d+))?/,
    idExtractor: (m) => m[3] ?? m[2] ?? null,
  },
];

/** Extract all music URLs from a message string */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>]+/g;
  return text.match(urlRegex) ?? [];
}

/** Parse a single URL into a ParsedUrl, or null if unsupported */
export function parseUrl(url: string): ParsedUrl | null {
  for (const pattern of URL_PATTERNS) {
    const match = url.match(pattern.regex);
    if (match) {
      const id = pattern.idExtractor(match);
      if (id) {
        return {
          service: pattern.service,
          id,
          originalUrl: url,
        };
      }
    }
  }
  return null;
}

/** Parse all supported URLs from a text message */
export function parseMessage(text: string): ParsedUrl[] {
  const urls = extractUrls(text);
  const results: ParsedUrl[] = [];
  for (const url of urls) {
    const parsed = parseUrl(url);
    if (parsed) {
      results.push(parsed);
    }
  }
  return results;
}
