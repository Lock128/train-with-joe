import * as crypto from 'crypto';
import { WordMasteryRepository } from '../repositories/word-mastery-repository';
import type { WordMastery } from '../model/domain/WordMastery';
import { BOX_INTERVALS } from '../model/domain/WordMastery';

/**
 * Service implementing a Leitner-box spaced repetition algorithm.
 *
 * Box levels:
 * - Box 1: new/struggling words (review every session)
 * - Box 2: review after 1 day
 * - Box 3: review after 3 days
 * - Box 4: review after 7 days
 * - Box 5: mastered (review after 14 days)
 *
 * Correct answer: move word up one box (max 5)
 * Incorrect answer: move word back to box 1
 */
export class SpacedRepetitionService {
  private static instance: SpacedRepetitionService;

  private constructor() {}

  public static getInstance(): SpacedRepetitionService {
    if (!SpacedRepetitionService.instance) {
      SpacedRepetitionService.instance = new SpacedRepetitionService();
    }
    return SpacedRepetitionService.instance;
  }

  /**
   * Calculate the next review date based on the box level.
   * @param box Current box level (1-5)
   * @param fromDate Base date for calculation
   * @returns ISO date string for the next review
   */
  calculateNextReviewAt(box: number, fromDate: Date = new Date()): string {
    const intervalDays = BOX_INTERVALS[box] ?? 0;
    const next = new Date(fromDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    return next.toISOString();
  }

  /**
   * Get words due for review, prioritized by box level (lower first) and overdue time.
   * @param userId User ID
   * @param vocabularyListIds Vocabulary list IDs to draw from
   * @param count Maximum number of words to return
   * @returns Array of WordMastery records to review
   */
  async getWordsForReview(userId: string, vocabularyListIds: string[], count: number): Promise<WordMastery[]> {
    const repo = WordMasteryRepository.getInstance();
    const now = new Date().toISOString();
    const dueWords = await repo.getDueForReview(userId, now, vocabularyListIds);

    // Sort by box (lower first), then by nextReviewAt (most overdue first)
    dueWords.sort((a, b) => {
      if (a.box !== b.box) return a.box - b.box;
      return a.nextReviewAt.localeCompare(b.nextReviewAt);
    });

    return dueWords.slice(0, count);
  }

  /**
   * Record a review result for a word.
   * - Correct: move up one box (max 5), increment correct streak
   * - Incorrect: move back to box 1, reset streak
   * @param userId User ID
   * @param word The word being reviewed
   * @param vocabularyListId The vocabulary list the word belongs to
   * @param correct Whether the answer was correct
   * @returns Updated WordMastery record
   */
  async recordResult(userId: string, word: string, vocabularyListId: string, correct: boolean): Promise<WordMastery> {
    const repo = WordMasteryRepository.getInstance();
    const allRecords = await repo.getByUserId(userId, [vocabularyListId]);
    const existing = allRecords.find((r) => r.word === word && r.vocabularyListId === vocabularyListId);

    const now = new Date();
    const nowIso = now.toISOString();

    if (existing) {
      const newBox = correct ? Math.min(existing.box + 1, 5) : 1;
      const newStreak = correct ? existing.correctStreak + 1 : 0;

      const updated: WordMastery = {
        ...existing,
        box: newBox,
        correctStreak: newStreak,
        lastReviewedAt: nowIso,
        nextReviewAt: this.calculateNextReviewAt(newBox, now),
        totalAttempts: existing.totalAttempts + 1,
        totalCorrect: existing.totalCorrect + (correct ? 1 : 0),
      };

      return repo.upsert(updated);
    }

    // First time seeing this word
    const newBox = correct ? 2 : 1;
    const mastery: WordMastery = {
      id: crypto.randomUUID(),
      userId,
      word,
      vocabularyListId,
      box: newBox,
      correctStreak: correct ? 1 : 0,
      lastReviewedAt: nowIso,
      nextReviewAt: this.calculateNextReviewAt(newBox, now),
      totalAttempts: 1,
      totalCorrect: correct ? 1 : 0,
    };

    return repo.upsert(mastery);
  }

  /**
   * Get mastery statistics for a user across vocabulary lists.
   * @param userId User ID
   * @param vocabularyListIds Vocabulary list IDs to query
   * @returns Mastery statistics
   */
  async getWordMastery(
    userId: string,
    vocabularyListIds: string[],
  ): Promise<{
    totalWords: number;
    masteredCount: number;
    strugglingCount: number;
    averageBox: number;
    words: WordMastery[];
  }> {
    const repo = WordMasteryRepository.getInstance();
    const records = await repo.getByUserId(userId, vocabularyListIds);

    const totalWords = records.length;
    const masteredCount = records.filter((r) => r.box >= 4).length;
    const strugglingCount = records.filter((r) => r.box === 1).length;
    const averageBox = totalWords > 0 ? records.reduce((sum, r) => sum + r.box, 0) / totalWords : 0;

    return {
      totalWords,
      masteredCount,
      strugglingCount,
      averageBox,
      words: records,
    };
  }
}
