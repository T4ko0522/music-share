import { type TrackMetadata, type MatchCandidate, type ScoredMatch, MatchConfidence } from '../types/index.js';
import { normalizeTitle, normalizeArtists, diceCoefficient, artistSimilarity } from './normalize.js';

/** Max points per scoring dimension */
const TITLE_MAX = 40;
const ARTIST_MAX = 35;
const DURATION_MAX = 15;
const BONUS_MAX = 10;

/** Duration tolerance in milliseconds */
const DURATION_TOLERANCE_MS = 10_000;

/** タイトルに含まれていたら候補から除外する語（カラオケ版などを除く） */
const TITLE_BLACKLIST = ['カラオケ'];

/**
 * Score a match candidate against source metadata.
 * Returns a score from 0 to 100.
 */
export function scoreMatch(source: TrackMetadata, candidate: MatchCandidate): number {
  const titleScore = scoreTitleMatch(source.title, candidate.title);
  const artistScore = scoreArtistMatch(source.artists, candidate.artists);
  const durationScore = scoreDurationMatch(source.durationMs, candidate.durationMs);
  const bonusScore = scoreBonusSignals(source, candidate);

  return Math.round(titleScore + artistScore + durationScore + bonusScore);
}

function scoreTitleMatch(sourceTitle: string, candidateTitle: string): number {
  const normSource = normalizeTitle(sourceTitle);
  const normCandidate = normalizeTitle(candidateTitle);

  if (normSource === normCandidate) return TITLE_MAX;

  const similarity = diceCoefficient(normSource, normCandidate);
  return similarity * TITLE_MAX;
}

function scoreArtistMatch(sourceArtists: string[], candidateArtists: string[]): number {
  const normSource = normalizeArtists(sourceArtists);
  const normCandidate = normalizeArtists(candidateArtists);

  const similarity = artistSimilarity(normSource, normCandidate);
  return similarity * ARTIST_MAX;
}

function scoreDurationMatch(sourceMs: number, candidateMs: number): number {
  if (sourceMs <= 0 || candidateMs <= 0) return DURATION_MAX * 0.5;

  const diff = Math.abs(sourceMs - candidateMs);
  if (diff <= 1000) return DURATION_MAX;
  if (diff >= DURATION_TOLERANCE_MS) return 0;

  return DURATION_MAX * (1 - diff / DURATION_TOLERANCE_MS);
}

function scoreBonusSignals(source: TrackMetadata, candidate: MatchCandidate): number {
  let bonus = 0;

  // Explicit flag match
  if (source.explicit !== undefined && candidate.explicit !== undefined) {
    if (source.explicit === candidate.explicit) {
      bonus += 3;
    }
  }

  // Album name similarity
  if (source.albumName && candidate.albumName) {
    const normSourceAlbum = normalizeTitle(source.albumName);
    const normCandidateAlbum = normalizeTitle(candidate.albumName);
    const albumSim = diceCoefficient(normSourceAlbum, normCandidateAlbum);
    bonus += albumSim * 4;
  }

  // Release year match
  if (source.releaseYear && candidate.releaseYear) {
    if (source.releaseYear === candidate.releaseYear) {
      bonus += 3;
    }
  }

  return Math.min(bonus, BONUS_MAX);
}

/** Determine confidence level from a score */
export function getConfidence(score: number): MatchConfidence {
  if (score >= 85) return MatchConfidence.High;
  if (score >= 70) return MatchConfidence.Medium;
  return MatchConfidence.Low;
}

/** Score a candidate and wrap in ScoredMatch */
export function createScoredMatch(source: TrackMetadata, candidate: MatchCandidate): ScoredMatch {
  const score = scoreMatch(source, candidate);
  return {
    candidate,
    score,
    confidence: getConfidence(score),
  };
}

function isBlacklisted(title: string): boolean {
  const lower = title.toLowerCase();
  return TITLE_BLACKLIST.some((word) => lower.includes(word.toLowerCase()));
}

export interface SelectBestMatchOptions {
  /** 除外する YouTube チャンネルID の集合 */
  youtubeChannelBlacklist?: Set<string>;
}

/** Select the best match from a list of candidates. タイトル語ブラックリストと YouTube チャンネルブラックリストで除外。 */
export function selectBestMatch(
  source: TrackMetadata,
  candidates: MatchCandidate[],
  options?: SelectBestMatchOptions,
): ScoredMatch | null {
  let filtered = candidates.filter((c) => !isBlacklisted(c.title));
  if (options?.youtubeChannelBlacklist?.size) {
    filtered = filtered.filter(
      (c) => !c.youtubeChannelId || !options.youtubeChannelBlacklist!.has(c.youtubeChannelId!),
    );
  }
  if (filtered.length === 0) return null;

  let best: ScoredMatch | null = null;
  for (const candidate of filtered) {
    const scored = createScoredMatch(source, candidate);
    if (!best || scored.score > best.score) {
      best = scored;
    }
  }
  return best;
}
