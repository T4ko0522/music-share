import { describe, it, expect } from 'vitest';
import { parseUrl, extractUrls, parseMessage } from './UrlParser.js';
import { MusicService } from '../types/index.js';

describe('parseUrl', () => {
  describe('Spotify', () => {
    it('parses standard Spotify track URL', () => {
      const result = parseUrl('https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6');
      expect(result).toEqual({
        service: MusicService.Spotify,
        id: '6rqhFgbbKwnb9MLmUQDhG6',
        originalUrl: 'https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6',
      });
    });

    it('parses Spotify URL with intl prefix', () => {
      const result = parseUrl('https://open.spotify.com/intl-jp/track/6rqhFgbbKwnb9MLmUQDhG6');
      expect(result).toEqual({
        service: MusicService.Spotify,
        id: '6rqhFgbbKwnb9MLmUQDhG6',
        originalUrl: 'https://open.spotify.com/intl-jp/track/6rqhFgbbKwnb9MLmUQDhG6',
      });
    });

    it('parses Spotify URL with query params', () => {
      const result = parseUrl('https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6?si=abc123');
      expect(result).not.toBeNull();
      expect(result!.service).toBe(MusicService.Spotify);
      expect(result!.id).toBe('6rqhFgbbKwnb9MLmUQDhG6');
    });
  });

  describe('YouTube Music', () => {
    it('parses YouTube Music URL', () => {
      const result = parseUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toEqual({
        service: MusicService.YouTubeMusic,
        id: 'dQw4w9WgXcQ',
        originalUrl: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
      });
    });

    it('parses regular YouTube URL as YouTubeMusic', () => {
      const result = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toEqual({
        service: MusicService.YouTubeMusic,
        id: 'dQw4w9WgXcQ',
        originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      });
    });

    it('parses youtu.be short URL', () => {
      const result = parseUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(result).toEqual({
        service: MusicService.YouTubeMusic,
        id: 'dQw4w9WgXcQ',
        originalUrl: 'https://youtu.be/dQw4w9WgXcQ',
      });
    });
  });

  describe('Apple Music（対応予定）', () => {
    it('parses Apple Music album URL with song param', () => {
      const result = parseUrl('https://music.apple.com/jp/album/some-album/123456?i=789012');
      expect(result).toEqual({
        service: MusicService.AppleMusic,
        id: '789012',
        originalUrl: 'https://music.apple.com/jp/album/some-album/123456?i=789012',
      });
    });

    it('parses Apple Music album URL without song param', () => {
      const result = parseUrl('https://music.apple.com/us/album/some-album/123456');
      expect(result).toEqual({
        service: MusicService.AppleMusic,
        id: '123456',
        originalUrl: 'https://music.apple.com/us/album/some-album/123456',
      });
    });
  });

  describe('unsupported URLs', () => {
    it('returns null for non-music URLs', () => {
      expect(parseUrl('https://example.com')).toBeNull();
    });

    it('returns null for Spotify album URL', () => {
      expect(parseUrl('https://open.spotify.com/album/xyz')).toBeNull();
    });
  });
});

describe('extractUrls', () => {
  it('extracts multiple URLs from text', () => {
    const text = 'Check out https://open.spotify.com/track/abc and https://music.youtube.com/watch?v=xyz';
    const urls = extractUrls(text);
    expect(urls).toHaveLength(2);
  });

  it('returns empty array for no URLs', () => {
    expect(extractUrls('no links here')).toEqual([]);
  });
});

describe('parseMessage', () => {
  it('parses all supported URLs from a message', () => {
    const text = '<@123> https://open.spotify.com/track/abc https://music.youtube.com/watch?v=xyz https://example.com';
    const results = parseMessage(text);
    expect(results).toHaveLength(2);
    expect(results[0]!.service).toBe(MusicService.Spotify);
    expect(results[1]!.service).toBe(MusicService.YouTubeMusic);
  });
});
