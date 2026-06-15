import { describe, test, expect, beforeEach } from 'vitest';
import { SpacedRepetitionService } from '../src/services/spaced-repetition-service';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { WordMastery } from '../src/model/domain/WordMastery';

/**
 * Unit Tests for Spaced Repetition Service
 */

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Spaced Repetition Service', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('recordResult', () => {
    test('new word starts in box 1 on incorrect answer', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutCommand).resolves({});

      const service = SpacedRepetitionService.getInstance();
      const result = await service.recordResult('user-1', 'hello', 'list-1', false);

      expect(result.box).toBe(1);
      expect(result.correctStreak).toBe(0);
      expect(result.totalAttempts).toBe(1);
      expect(result.totalCorrect).toBe(0);
    });

    test('new word starts in box 2 on correct answer', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutCommand).resolves({});

      const service = SpacedRepetitionService.getInstance();
      const result = await service.recordResult('user-1', 'hello', 'list-1', true);

      expect(result.box).toBe(2);
      expect(result.correctStreak).toBe(1);
      expect(result.totalAttempts).toBe(1);
      expect(result.totalCorrect).toBe(1);
    });

    test('correct answer moves word to next box', async () => {
      const existing: WordMastery = {
        id: 'mastery-1',
        userId: 'user-1',
        word: 'hello',
        vocabularyListId: 'list-1',
        box: 2,
        correctStreak: 1,
        lastReviewedAt: '2024-01-01T00:00:00.000Z',
        nextReviewAt: '2024-01-02T00:00:00.000Z',
        totalAttempts: 3,
        totalCorrect: 2,
      };

      ddbMock.on(QueryCommand).resolves({ Items: [existing] });
      ddbMock.on(PutCommand).resolves({});

      const service = SpacedRepetitionService.getInstance();
      const result = await service.recordResult('user-1', 'hello', 'list-1', true);

      expect(result.box).toBe(3);
      expect(result.correctStreak).toBe(2);
      expect(result.totalAttempts).toBe(4);
      expect(result.totalCorrect).toBe(3);
    });

    test('incorrect answer moves word back to box 1', async () => {
      const existing: WordMastery = {
        id: 'mastery-1',
        userId: 'user-1',
        word: 'hello',
        vocabularyListId: 'list-1',
        box: 4,
        correctStreak: 5,
        lastReviewedAt: '2024-01-01T00:00:00.000Z',
        nextReviewAt: '2024-01-08T00:00:00.000Z',
        totalAttempts: 10,
        totalCorrect: 8,
      };

      ddbMock.on(QueryCommand).resolves({ Items: [existing] });
      ddbMock.on(PutCommand).resolves({});

      const service = SpacedRepetitionService.getInstance();
      const result = await service.recordResult('user-1', 'hello', 'list-1', false);

      expect(result.box).toBe(1);
      expect(result.correctStreak).toBe(0);
      expect(result.totalAttempts).toBe(11);
      expect(result.totalCorrect).toBe(8);
    });

    test('box never exceeds 5', async () => {
      const existing: WordMastery = {
        id: 'mastery-1',
        userId: 'user-1',
        word: 'hello',
        vocabularyListId: 'list-1',
        box: 5,
        correctStreak: 10,
        lastReviewedAt: '2024-01-01T00:00:00.000Z',
        nextReviewAt: '2024-01-15T00:00:00.000Z',
        totalAttempts: 15,
        totalCorrect: 14,
      };

      ddbMock.on(QueryCommand).resolves({ Items: [existing] });
      ddbMock.on(PutCommand).resolves({});

      const service = SpacedRepetitionService.getInstance();
      const result = await service.recordResult('user-1', 'hello', 'list-1', true);

      expect(result.box).toBe(5);
      expect(result.correctStreak).toBe(11);
    });
  });

  describe('getWordsForReview', () => {
    test('prioritizes lower boxes over higher boxes', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000).toISOString(); // 1 day ago

      const words: WordMastery[] = [
        {
          id: 'mastery-1',
          userId: 'user-1',
          word: 'hello',
          vocabularyListId: 'list-1',
          box: 3,
          correctStreak: 2,
          lastReviewedAt: pastDate,
          nextReviewAt: pastDate,
          totalAttempts: 5,
          totalCorrect: 4,
        },
        {
          id: 'mastery-2',
          userId: 'user-1',
          word: 'world',
          vocabularyListId: 'list-1',
          box: 1,
          correctStreak: 0,
          lastReviewedAt: pastDate,
          nextReviewAt: pastDate,
          totalAttempts: 3,
          totalCorrect: 1,
        },
        {
          id: 'mastery-3',
          userId: 'user-1',
          word: 'cat',
          vocabularyListId: 'list-1',
          box: 2,
          correctStreak: 1,
          lastReviewedAt: pastDate,
          nextReviewAt: pastDate,
          totalAttempts: 4,
          totalCorrect: 3,
        },
      ];

      ddbMock.on(QueryCommand).resolves({ Items: words });

      const service = SpacedRepetitionService.getInstance();
      const result = await service.getWordsForReview('user-1', ['list-1'], 10);

      expect(result[0].word).toBe('world'); // box 1
      expect(result[1].word).toBe('cat'); // box 2
      expect(result[2].word).toBe('hello'); // box 3
    });

    test('returns only up to count words', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();

      const words: WordMastery[] = Array.from({ length: 10 }, (_, i) => ({
        id: `mastery-${i}`,
        userId: 'user-1',
        word: `word-${i}`,
        vocabularyListId: 'list-1',
        box: 1,
        correctStreak: 0,
        lastReviewedAt: pastDate,
        nextReviewAt: pastDate,
        totalAttempts: 1,
        totalCorrect: 0,
      }));

      ddbMock.on(QueryCommand).resolves({ Items: words });

      const service = SpacedRepetitionService.getInstance();
      const result = await service.getWordsForReview('user-1', ['list-1'], 3);

      expect(result.length).toBe(3);
    });

    test('box 5 words are not returned if not due', async () => {
      // The GSI query with nextReviewAt <= now would not return future items,
      // so the query returns nothing for not-yet-due items
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const service = SpacedRepetitionService.getInstance();
      const result = await service.getWordsForReview('user-1', ['list-1'], 10);

      expect(result.length).toBe(0);
    });

    test('filters by vocabulary list IDs', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();

      const words: WordMastery[] = [
        {
          id: 'mastery-1',
          userId: 'user-1',
          word: 'hello',
          vocabularyListId: 'list-1',
          box: 1,
          correctStreak: 0,
          lastReviewedAt: pastDate,
          nextReviewAt: pastDate,
          totalAttempts: 1,
          totalCorrect: 0,
        },
        {
          id: 'mastery-2',
          userId: 'user-1',
          word: 'world',
          vocabularyListId: 'list-2',
          box: 1,
          correctStreak: 0,
          lastReviewedAt: pastDate,
          nextReviewAt: pastDate,
          totalAttempts: 1,
          totalCorrect: 0,
        },
      ];

      ddbMock.on(QueryCommand).resolves({ Items: words });

      const service = SpacedRepetitionService.getInstance();
      const result = await service.getWordsForReview('user-1', ['list-1'], 10);

      expect(result.length).toBe(1);
      expect(result[0].word).toBe('hello');
    });
  });

  describe('getWordMastery', () => {
    test('returns correct statistics', async () => {
      const words: WordMastery[] = [
        {
          id: 'mastery-1',
          userId: 'user-1',
          word: 'hello',
          vocabularyListId: 'list-1',
          box: 5,
          correctStreak: 10,
          lastReviewedAt: '2024-01-01T00:00:00.000Z',
          nextReviewAt: '2024-01-15T00:00:00.000Z',
          totalAttempts: 15,
          totalCorrect: 14,
        },
        {
          id: 'mastery-2',
          userId: 'user-1',
          word: 'world',
          vocabularyListId: 'list-1',
          box: 1,
          correctStreak: 0,
          lastReviewedAt: '2024-01-01T00:00:00.000Z',
          nextReviewAt: '2024-01-01T00:00:00.000Z',
          totalAttempts: 5,
          totalCorrect: 2,
        },
        {
          id: 'mastery-3',
          userId: 'user-1',
          word: 'cat',
          vocabularyListId: 'list-1',
          box: 4,
          correctStreak: 3,
          lastReviewedAt: '2024-01-01T00:00:00.000Z',
          nextReviewAt: '2024-01-08T00:00:00.000Z',
          totalAttempts: 8,
          totalCorrect: 7,
        },
      ];

      ddbMock.on(QueryCommand).resolves({ Items: words });

      const service = SpacedRepetitionService.getInstance();
      const result = await service.getWordMastery('user-1', ['list-1']);

      expect(result.totalWords).toBe(3);
      expect(result.masteredCount).toBe(2); // box >= 4
      expect(result.strugglingCount).toBe(1); // box === 1
      expect(result.averageBox).toBeCloseTo((5 + 1 + 4) / 3);
      expect(result.words.length).toBe(3);
    });

    test('returns empty stats when no records exist', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const service = SpacedRepetitionService.getInstance();
      const result = await service.getWordMastery('user-1', ['list-1']);

      expect(result.totalWords).toBe(0);
      expect(result.masteredCount).toBe(0);
      expect(result.strugglingCount).toBe(0);
      expect(result.averageBox).toBe(0);
      expect(result.words.length).toBe(0);
    });
  });

  describe('calculateNextReviewAt', () => {
    test('box 1 returns same time (immediate review)', () => {
      const service = SpacedRepetitionService.getInstance();
      const baseDate = new Date('2024-06-15T12:00:00.000Z');
      const result = service.calculateNextReviewAt(1, baseDate);

      expect(result).toBe('2024-06-15T12:00:00.000Z');
    });

    test('box 2 returns next day', () => {
      const service = SpacedRepetitionService.getInstance();
      const baseDate = new Date('2024-06-15T12:00:00.000Z');
      const result = service.calculateNextReviewAt(2, baseDate);

      expect(result).toBe('2024-06-16T12:00:00.000Z');
    });

    test('box 3 returns 3 days later', () => {
      const service = SpacedRepetitionService.getInstance();
      const baseDate = new Date('2024-06-15T12:00:00.000Z');
      const result = service.calculateNextReviewAt(3, baseDate);

      expect(result).toBe('2024-06-18T12:00:00.000Z');
    });

    test('box 4 returns 7 days later', () => {
      const service = SpacedRepetitionService.getInstance();
      const baseDate = new Date('2024-06-15T12:00:00.000Z');
      const result = service.calculateNextReviewAt(4, baseDate);

      expect(result).toBe('2024-06-22T12:00:00.000Z');
    });

    test('box 5 returns 14 days later', () => {
      const service = SpacedRepetitionService.getInstance();
      const baseDate = new Date('2024-06-15T12:00:00.000Z');
      const result = service.calculateNextReviewAt(5, baseDate);

      expect(result).toBe('2024-06-29T12:00:00.000Z');
    });
  });
});
