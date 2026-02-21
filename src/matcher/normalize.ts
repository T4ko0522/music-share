/**
 * Text normalization utilities for matching track titles and artist names
 * across music services.
 */

/** Patterns to strip from titles (remastered, live versions, etc.) */
const TITLE_NOISE_PATTERNS = [
  /\s*[\-–—]\s*remaster(ed)?\s*(\d{4})?\s*/gi,
  /\s*\(remaster(ed)?\s*(\d{4})?\)\s*/gi,
  /\s*\[remaster(ed)?\s*(\d{4})?\]\s*/gi,
  /\s*\(deluxe\s*(edition)?\)\s*/gi,
  /\s*\[deluxe\s*(edition)?\]\s*/gi,
  /\s*\(bonus\s*track\s*(version)?\)\s*/gi,
  /\s*\(single\s*(version)?\)\s*/gi,
];

/** Patterns for splitting featured artists */
const FEAT_PATTERNS = [
  /\s*\(feat\.?\s+/gi,
  /\s*\(ft\.?\s+/gi,
  /\s*\[feat\.?\s+/gi,
  /\s*\[ft\.?\s+/gi,
  /\s+feat\.?\s+/gi,
  /\s+ft\.?\s+/gi,
];

/** Normalize a text string: lowercase, strip accents, collapse whitespace */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')  // strip combining diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')  // non-letter/non-digit → space (keep CJK)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize a track title: strip noise, then normalizeText */
export function normalizeTitle(title: string): string {
  let cleaned = title;
  for (const pattern of TITLE_NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  // Strip feat/ft from title (leave featured artist extraction to normalizeArtists)
  for (const pattern of FEAT_PATTERNS) {
    const idx = cleaned.search(pattern);
    if (idx !== -1) {
      cleaned = cleaned.substring(0, idx);
    }
  }
  // Remove trailing parentheses/brackets left from stripping
  cleaned = cleaned.replace(/\s*[\(\[]\s*[\)\]]\s*/g, '');
  return normalizeText(cleaned);
}

/** Normalize artist names: split by common delimiters, normalize each, sort */
export function normalizeArtists(artists: string[]): string[] {
  const all: string[] = [];
  for (const artist of artists) {
    // Split by &, /, , (comma), "and"
    const parts = artist.split(/\s*[,&\/]\s*|\s+and\s+/i);
    for (const part of parts) {
      const normalized = normalizeText(part);
      if (normalized) {
        all.push(normalized);
      }
    }
  }
  return [...new Set(all)].sort();
}

/**
 * Compute Dice coefficient (bigram similarity) between two strings.
 * Returns a value between 0 and 1.
 */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramsA = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2);
    bigramsA.set(bigram, (bigramsA.get(bigram) ?? 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    const count = bigramsA.get(bigram);
    if (count && count > 0) {
      intersection++;
      bigramsA.set(bigram, count - 1);
    }
  }

  return (2 * intersection) / (a.length - 1 + b.length - 1);
}

/**
 * Compute similarity between two sets of normalized artist names.
 * Uses best-match pairing: for each source artist, find the best dice match in target.
 * Returns 0-1.
 */
export function artistSimilarity(sourceArtists: string[], targetArtists: string[]): number {
  if (sourceArtists.length === 0 && targetArtists.length === 0) return 1;
  if (sourceArtists.length === 0 || targetArtists.length === 0) return 0;

  // Check primary artist (first in each list) with higher weight
  let totalScore = 0;
  let count = 0;

  for (const src of sourceArtists) {
    let best = 0;
    for (const tgt of targetArtists) {
      const score = diceCoefficient(src, tgt);
      if (score > best) best = score;
    }
    totalScore += best;
    count++;
  }

  return totalScore / count;
}
