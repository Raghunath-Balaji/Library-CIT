import { Book } from '../types';

/**
 * Normalizes text by removing punctuation, extra spaces, and converting to lowercase tokens.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Calculates Levenshtein edit distance between two short strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Computes token similarity between 0 and 1.
 */
function tokenSimilarity(t1: string, t2: string): number {
  if (t1 === t2) return 1.0;
  if (t2.includes(t1) || t1.includes(t2)) return 0.85;

  const maxLen = Math.max(t1.length, t2.length);
  if (maxLen <= 2) return 0.0;

  const dist = levenshteinDistance(t1, t2);
  const similarity = 1.0 - dist / maxLen;
  return similarity >= 0.65 ? similarity : 0.0;
}

/**
 * Evaluates similarity score between a multi-word search query and a target text.
 * Word order is obsolete because each query token searches for the best matching token in the target.
 */
export function calculateSimilarityScore(query: string, targetText: string): number {
  const queryTokens = tokenize(query);
  const targetTokens = tokenize(targetText);

  if (queryTokens.length === 0) return 1.0;
  if (targetTokens.length === 0) return 0.0;

  let totalScore = 0;

  for (const qToken of queryTokens) {
    let bestMatch = 0;
    for (const tToken of targetTokens) {
      const sim = tokenSimilarity(qToken, tToken);
      if (sim > bestMatch) {
        bestMatch = sim;
      }
    }
    totalScore += bestMatch;
  }

  // Average matched token score
  return totalScore / queryTokens.length;
}

/**
 * Searches and ranks books using word-order independent similarity matching across title and author.
 */
export function searchBooksBySimilarity(books: Book[], query: string, threshold = 0.35): Book[] {
  const trimmed = query.trim();
  if (!trimmed) return books;

  const scoredBooks = books.map((book) => {
    const titleScore = calculateSimilarityScore(trimmed, book.title) * 1.3;
    const authorScore = calculateSimilarityScore(trimmed, book.author) * 0.9;
    const categoryScore = calculateSimilarityScore(trimmed, book.category) * 0.6;
    const bestScore = Math.max(titleScore, authorScore, categoryScore);

    return { book, score: bestScore };
  });

  return scoredBooks
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.book);
}
