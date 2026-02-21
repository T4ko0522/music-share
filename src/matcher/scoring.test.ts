import { describe, it, expect } from 'vitest';
import { scoreMatch, getConfidence, selectBestMatch } from './scoring.js';
import { MusicService, MatchConfidence, type TrackMetadata, type MatchCandidate } from '../types/index.js';

const makeSource = (overrides: Partial<TrackMetadata> = {}): TrackMetadata => ({
  title: 'Bohemian Rhapsody',
  artists: ['Queen'],
  durationMs: 354000,
  sourceService: MusicService.Spotify,
  sourceUrl: 'https://open.spotify.com/track/abc',
  ...overrides,
});

const makeCandidate = (overrides: Partial<MatchCandidate> = {}): MatchCandidate => ({
  service: MusicService.YouTubeMusic,
  url: 'https://music.youtube.com/watch?v=xyz',
  title: 'Bohemian Rhapsody',
  artists: ['Queen'],
  durationMs: 354000,
  ...overrides,
});

describe('scoreMatch', () => {
  it('returns 90+ for identical metadata', () => {
    const score = scoreMatch(makeSource(), makeCandidate());
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('returns lower score for different title', () => {
    const score = scoreMatch(makeSource(), makeCandidate({ title: 'We Will Rock You' }));
    expect(score).toBeLessThan(70);
  });

  it('returns lower score for different artist', () => {
    const score = scoreMatch(makeSource(), makeCandidate({ artists: ['The Beatles'] }));
    expect(score).toBeLessThan(70);
  });

  it('handles duration difference within tolerance', () => {
    const score = scoreMatch(makeSource(), makeCandidate({ durationMs: 357000 }));
    expect(score).toBeGreaterThan(80);
  });

  it('penalizes large duration difference', () => {
    const exact = scoreMatch(makeSource(), makeCandidate());
    const far = scoreMatch(makeSource(), makeCandidate({ durationMs: 400000 }));
    expect(far).toBeLessThan(exact);
  });

  it('gives bonus for matching explicit flag', () => {
    const withExplicit = scoreMatch(
      makeSource({ explicit: true }),
      makeCandidate({ explicit: true }),
    );
    const withoutExplicit = scoreMatch(makeSource(), makeCandidate());
    expect(withExplicit).toBeGreaterThan(withoutExplicit);
  });

  it('gives bonus for matching album name', () => {
    const withAlbum = scoreMatch(
      makeSource({ albumName: 'A Night at the Opera' }),
      makeCandidate({ albumName: 'A Night at the Opera' }),
    );
    const withoutAlbum = scoreMatch(makeSource(), makeCandidate());
    expect(withAlbum).toBeGreaterThan(withoutAlbum);
  });

  it('handles remastered variant in title', () => {
    const score = scoreMatch(
      makeSource({ title: 'Bohemian Rhapsody - Remastered 2011' }),
      makeCandidate({ title: 'Bohemian Rhapsody' }),
    );
    expect(score).toBeGreaterThanOrEqual(90);
  });
});

describe('getConfidence', () => {
  it('returns High for score >= 85', () => {
    expect(getConfidence(85)).toBe(MatchConfidence.High);
    expect(getConfidence(100)).toBe(MatchConfidence.High);
  });

  it('returns Medium for score 70-84', () => {
    expect(getConfidence(70)).toBe(MatchConfidence.Medium);
    expect(getConfidence(84)).toBe(MatchConfidence.Medium);
  });

  it('returns Low for score < 70', () => {
    expect(getConfidence(69)).toBe(MatchConfidence.Low);
    expect(getConfidence(0)).toBe(MatchConfidence.Low);
  });
});

describe('selectBestMatch', () => {
  it('returns null for empty candidates', () => {
    expect(selectBestMatch(makeSource(), [])).toBeNull();
  });

  it('selects the highest scoring candidate', () => {
    const candidates = [
      makeCandidate({ title: 'Something Else', artists: ['Other'] }),
      makeCandidate({ title: 'Bohemian Rhapsody', artists: ['Queen'] }),
    ];
    const result = selectBestMatch(makeSource(), candidates);
    expect(result).not.toBeNull();
    expect(result!.candidate.title).toBe('Bohemian Rhapsody');
  });
});
