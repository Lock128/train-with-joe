/**
 * Domain model for Word Mastery (Spaced Repetition System)
 *
 * Uses a Leitner-box approach:
 * - Box 1: new/struggling words (review every session)
 * - Box 2: review after 1 day
 * - Box 3: review after 3 days
 * - Box 4: review after 7 days
 * - Box 5: mastered (review after 14 days)
 */

export interface WordMastery {
  id: string;
  userId: string;
  word: string;
  vocabularyListId: string;
  box: number; // 1-5
  correctStreak: number;
  lastReviewedAt: string;
  nextReviewAt: string;
  totalAttempts: number;
  totalCorrect: number;
}

/** Review intervals in days for each box level */
export const BOX_INTERVALS: Record<number, number> = {
  1: 0, // review every session
  2: 1, // review after 1 day
  3: 3, // review after 3 days
  4: 7, // review after 7 days
  5: 14, // review after 14 days
};
