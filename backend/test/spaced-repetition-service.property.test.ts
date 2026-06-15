import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SpacedRepetitionService } from '../src/services/spaced-repetition-service';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { WordMastery } from '../src/model/domain/WordMastery';
import { BOX_INTERVALS } from '../src/model/domain/WordMastery';

/**
 * Property-Based Tests for Spaced Repetition Service
 */

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Spaced Repetition Service Property Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  /**
   * Property 1: Box never goes below 1 or above 5
   */
  test('Property 1: Box is always between 1 and 5', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        async (currentBox, correct, totalAttempts, totalCorrect) => {
          ddbMock.reset();

          const existing: WordMastery = {
            id: 'mastery-1',
            userId: 'user-1',
            word: 'hello',
            vocabularyListId: 'list-1',
            box: currentBox,
            correctStreak: 0,
            lastReviewedAt: '2024-01-01T00:00:00.000Z',
            nextReviewAt: '2024-01-01T00:00:00.000Z',
            totalAttempts,
            totalCorrect: Math.min(totalCorrect, totalAttempts),
          };

          ddbMock.on(QueryCommand).resolves({ Items: [existing] });
          ddbMock.on(PutCommand).resolves({});

          const service = SpacedRepetitionService.getInstance();
          const result = await service.recordResult('user-1', 'hello', 'list-1', correct);

          expect(result.box).toBeGreaterThanOrEqual(1);
          expect(result.box).toBeLessThanOrEqual(5);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: Correct answer never decreases box
   */
  test('Property 2: Correct answer never decreases box', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5 }), async (currentBox) => {
        ddbMock.reset();

        const existing: WordMastery = {
          id: 'mastery-1',
          userId: 'user-1',
          word: 'hello',
          vocabularyListId: 'list-1',
          box: currentBox,
          correctStreak: 0,
          lastReviewedAt: '2024-01-01T00:00:00.000Z',
          nextReviewAt: '2024-01-01T00:00:00.000Z',
          totalAttempts: 5,
          totalCorrect: 3,
        };

        ddbMock.on(QueryCommand).resolves({ Items: [existing] });
        ddbMock.on(PutCommand).resolves({});

        const service = SpacedRepetitionService.getInstance();
        const result = await service.recordResult('user-1', 'hello', 'list-1', true);

        expect(result.box).toBeGreaterThanOrEqual(currentBox);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: Incorrect answer always resets to box 1
   */
  test('Property 3: Incorrect answer always resets to box 1', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 20 }),
        async (currentBox, correctStreak) => {
          ddbMock.reset();

          const existing: WordMastery = {
            id: 'mastery-1',
            userId: 'user-1',
            word: 'hello',
            vocabularyListId: 'list-1',
            box: currentBox,
            correctStreak,
            lastReviewedAt: '2024-01-01T00:00:00.000Z',
            nextReviewAt: '2024-01-01T00:00:00.000Z',
            totalAttempts: 10,
            totalCorrect: 5,
          };

          ddbMock.on(QueryCommand).resolves({ Items: [existing] });
          ddbMock.on(PutCommand).resolves({});

          const service = SpacedRepetitionService.getInstance();
          const result = await service.recordResult('user-1', 'hello', 'list-1', false);

          expect(result.box).toBe(1);
          expect(result.correctStreak).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4: nextReviewAt always advances (or stays same for box 1) after correct answer
   */
  test('Property 4: nextReviewAt advances after correct answer', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 4 }), // Boxes 1-4 can advance
        async (currentBox) => {
          ddbMock.reset();

          const existing: WordMastery = {
            id: 'mastery-1',
            userId: 'user-1',
            word: 'hello',
            vocabularyListId: 'list-1',
            box: currentBox,
            correctStreak: 0,
            lastReviewedAt: '2024-01-01T00:00:00.000Z',
            nextReviewAt: '2024-01-01T00:00:00.000Z',
            totalAttempts: 5,
            totalCorrect: 3,
          };

          ddbMock.on(QueryCommand).resolves({ Items: [existing] });
          ddbMock.on(PutCommand).resolves({});

          const service = SpacedRepetitionService.getInstance();
          const result = await service.recordResult('user-1', 'hello', 'list-1', true);

          // After a correct answer, the new box is currentBox + 1,
          // and nextReviewAt should be at least BOX_INTERVALS[newBox] days from now
          const newBox = currentBox + 1;
          const expectedIntervalDays = BOX_INTERVALS[newBox];
          const nextReviewDate = new Date(result.nextReviewAt);
          const now = new Date();
          const diffMs = nextReviewDate.getTime() - now.getTime();
          const diffDays = diffMs / (24 * 60 * 60 * 1000);

          // The interval should be approximately expectedIntervalDays (within 1 second tolerance)
          expect(diffDays).toBeCloseTo(expectedIntervalDays, 0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5: totalAttempts always increases by exactly 1
   */
  test('Property 5: totalAttempts always increases by exactly 1', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 100 }),
        async (currentBox, correct, totalAttempts) => {
          ddbMock.reset();

          const existing: WordMastery = {
            id: 'mastery-1',
            userId: 'user-1',
            word: 'hello',
            vocabularyListId: 'list-1',
            box: currentBox,
            correctStreak: 0,
            lastReviewedAt: '2024-01-01T00:00:00.000Z',
            nextReviewAt: '2024-01-01T00:00:00.000Z',
            totalAttempts,
            totalCorrect: Math.min(totalAttempts, totalAttempts),
          };

          ddbMock.on(QueryCommand).resolves({ Items: [existing] });
          ddbMock.on(PutCommand).resolves({});

          const service = SpacedRepetitionService.getInstance();
          const result = await service.recordResult('user-1', 'hello', 'list-1', correct);

          expect(result.totalAttempts).toBe(totalAttempts + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6: New words always start at either box 1 or box 2
   */
  test('Property 6: New words start at box 1 (incorrect) or box 2 (correct)', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 20 }), fc.boolean(), async (word, correct) => {
        ddbMock.reset();

        ddbMock.on(QueryCommand).resolves({ Items: [] });
        ddbMock.on(PutCommand).resolves({});

        const service = SpacedRepetitionService.getInstance();
        const result = await service.recordResult('user-1', word, 'list-1', correct);

        if (correct) {
          expect(result.box).toBe(2);
          expect(result.correctStreak).toBe(1);
          expect(result.totalCorrect).toBe(1);
        } else {
          expect(result.box).toBe(1);
          expect(result.correctStreak).toBe(0);
          expect(result.totalCorrect).toBe(0);
        }
        expect(result.totalAttempts).toBe(1);
      }),
      { numRuns: 100 },
    );
  });
});
