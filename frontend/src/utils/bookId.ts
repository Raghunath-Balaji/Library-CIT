import { Book } from '../types';

// Monotonic per-prefix counter so deleted copy numbers are never reused within a session
const sessionHighWaterMark = new Map<string, number>();

function normalizeShelfPrefix(shelfId: string): string {
  const cleaned = shelfId.trim().toUpperCase().replace(/^SH-/, '');
  const parts = cleaned.split('-').filter(Boolean);

  if (parts.length === 2 && /^\d+$/.test(parts[1])) {
    const paddedNum = parts[1].padStart(2, '0');
    return `LIB1:${parts[0]}${paddedNum}`;
  }

  return `LIB1:${cleaned.replace(/-/g, '') || 'GEN01'}`;
}

/**
 * Generates a collision-safe Copy ID (e.g. "LIB1:CS01-5") matching catalog format,
 * scanning highest existing suffixes and enforcing monotonic sequence numbers.
 */
export function generateNextBookId(existingBooks: Book[], shelfId: string): string {
  const shelfPrefix = normalizeShelfPrefix(shelfId);
  let maxSeq = sessionHighWaterMark.get(shelfPrefix) || 0;

  for (const book of existingBooks) {
    if (book.id.toUpperCase().startsWith(shelfPrefix)) {
      const trailingMatch = book.id.match(/-(\d+)$/);
      if (trailingMatch) {
        const copyNum = parseInt(trailingMatch[1], 10);
        if (copyNum > maxSeq) {
          maxSeq = copyNum;
        }
      }
    }
  }

  const existingIds = new Set(existingBooks.map((b) => b.id.toUpperCase()));
  let nextNum = maxSeq + 1;
  let candidateId = `${shelfPrefix}-${nextNum}`;

  while (existingIds.has(candidateId.toUpperCase())) {
    nextNum += 1;
    candidateId = `${shelfPrefix}-${nextNum}`;
  }

  sessionHighWaterMark.set(shelfPrefix, nextNum);
  return candidateId;
}
