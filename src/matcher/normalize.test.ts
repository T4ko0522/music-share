import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  normalizeTitle,
  normalizeArtists,
  diceCoefficient,
  artistSimilarity,
} from './normalize.js';

describe('normalizeText', () => {
  it('lowercases and trims', () => {
    expect(normalizeText('  Hello World  ')).toBe('hello world');
  });

  it('strips diacritics', () => {
    expect(normalizeText('Café résumé')).toBe('cafe resume');
  });

  it('collapses whitespace', () => {
    expect(normalizeText('a   b\tc')).toBe('a b c');
  });

  it('preserves CJK characters', () => {
    expect(normalizeText('紅蓮華 LiSA')).toBe('紅蓮華 lisa');
  });

  it('replaces punctuation with space', () => {
    expect(normalizeText("don't stop")).toBe('don t stop');
  });
});

describe('normalizeTitle', () => {
  it('strips (Remastered 2021)', () => {
    expect(normalizeTitle('Bohemian Rhapsody (Remastered 2021)')).toBe('bohemian rhapsody');
  });

  it('strips - Remastered', () => {
    expect(normalizeTitle('Bohemian Rhapsody - Remastered')).toBe('bohemian rhapsody');
  });

  it('strips feat. from title', () => {
    expect(normalizeTitle('Song Title feat. Some Artist')).toBe('song title');
  });

  it('strips (Deluxe Edition)', () => {
    expect(normalizeTitle('Album Track (Deluxe Edition)')).toBe('album track');
  });

  it('handles combined noise', () => {
    expect(normalizeTitle('Song (feat. X) [Remastered 2020]')).toBe('song');
  });
});

describe('normalizeArtists', () => {
  it('splits by comma', () => {
    expect(normalizeArtists(['Artist A, Artist B'])).toEqual(['artist a', 'artist b']);
  });

  it('splits by ampersand', () => {
    expect(normalizeArtists(['Artist A & Artist B'])).toEqual(['artist a', 'artist b']);
  });

  it('deduplicates', () => {
    expect(normalizeArtists(['Artist A', 'Artist A'])).toEqual(['artist a']);
  });

  it('sorts alphabetically', () => {
    expect(normalizeArtists(['Zed', 'Alpha'])).toEqual(['alpha', 'zed']);
  });

  it('handles multiple artists array', () => {
    expect(normalizeArtists(['Alpha', 'Beta & Gamma'])).toEqual(['alpha', 'beta', 'gamma']);
  });
});

describe('diceCoefficient', () => {
  it('returns 1 for identical strings', () => {
    expect(diceCoefficient('hello', 'hello')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(diceCoefficient('ab', 'cd')).toBe(0);
  });

  it('returns 0 for single-char different strings', () => {
    expect(diceCoefficient('a', 'b')).toBe(0);
  });

  it('returns partial similarity for similar strings', () => {
    const score = diceCoefficient('night', 'nite');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe('artistSimilarity', () => {
  it('returns 1 for identical artist sets', () => {
    expect(artistSimilarity(['artist a'], ['artist a'])).toBe(1);
  });

  it('returns 0 for empty vs non-empty', () => {
    expect(artistSimilarity([], ['artist a'])).toBe(0);
  });

  it('returns 1 for both empty', () => {
    expect(artistSimilarity([], [])).toBe(1);
  });

  it('handles partial matches', () => {
    const score = artistSimilarity(['the beatles'], ['beatles']);
    expect(score).toBeGreaterThan(0.5);
  });
});
