import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AchievementService } from '../src/services/achievement-service';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Property-Based Tests for Achievement Service
 */

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Achievement Service Property Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  /**
   * Property 1: Streak is always >= 0
   */
  test('Property 1: Streak is always >= 0', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 365 }),
        async (currentStreak, longestStreak, daysSinceLastTraining) => {
          ddbMock.reset();

          const lastDate = new Date();
          lastDate.setDate(lastDate.getDate() - daysSinceLastTraining);
          const lastDateStr = lastDate.toISOString().substring(0, 10);

          if (currentStreak > 0) {
            ddbMock
              .on(QueryCommand, {
                KeyConditionExpression: 'userId = :userId AND id = :id',
              })
              .resolves({
                Items: [
                  {
                    userId: 'user-prop',
                    id: 'STREAK',
                    currentStreak,
                    longestStreak: Math.max(longestStreak, currentStreak),
                    lastTrainingDate: lastDateStr,
                    totalTrainingDays: currentStreak,
                  },
                ],
              });
          } else {
            ddbMock
              .on(QueryCommand, {
                KeyConditionExpression: 'userId = :userId AND id = :id',
              })
              .resolves({ Items: [] });
          }

          ddbMock
            .on(QueryCommand, {
              KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
            })
            .resolves({ Items: [] });

          ddbMock
            .on(QueryCommand, {
              IndexName: 'userId-nextReviewAt-index',
            })
            .resolves({ Items: [] });

          ddbMock.on(PutCommand).resolves({});

          const service = AchievementService.getInstance();
          await service.recordTrainingCompleted('user-prop', {
            correctCount: 5,
            incorrectCount: 1,
          });

          // Find the streak put command
          const putCalls = ddbMock.commandCalls(PutCommand);
          const streakPut = putCalls.find(
            (call) => call.args[0].input.Item && (call.args[0].input.Item as Record<string, unknown>).id === 'STREAK',
          );
          expect(streakPut).toBeDefined();
          const item = streakPut!.args[0].input.Item as Record<string, unknown>;
          expect(item.currentStreak).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 2: longestStreak >= currentStreak always holds
   */
  test('Property 2: longestStreak >= currentStreak', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        fc.constantFrom(0, 1, 2, 5),
        async (currentStreak, longestStreak, daysSinceLastTraining) => {
          ddbMock.reset();

          const effectiveLongest = Math.max(longestStreak, currentStreak);
          const lastDate = new Date();
          lastDate.setDate(lastDate.getDate() - daysSinceLastTraining);
          const lastDateStr = lastDate.toISOString().substring(0, 10);

          ddbMock
            .on(QueryCommand, {
              KeyConditionExpression: 'userId = :userId AND id = :id',
            })
            .resolves({
              Items: [
                {
                  userId: 'user-prop',
                  id: 'STREAK',
                  currentStreak,
                  longestStreak: effectiveLongest,
                  lastTrainingDate: lastDateStr,
                  totalTrainingDays: currentStreak + 5,
                },
              ],
            });

          ddbMock
            .on(QueryCommand, {
              KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
            })
            .resolves({ Items: [] });

          ddbMock
            .on(QueryCommand, {
              IndexName: 'userId-nextReviewAt-index',
            })
            .resolves({ Items: [] });

          ddbMock.on(PutCommand).resolves({});

          const service = AchievementService.getInstance();
          await service.recordTrainingCompleted('user-prop', {
            correctCount: 3,
            incorrectCount: 2,
          });

          const putCalls = ddbMock.commandCalls(PutCommand);
          const streakPut = putCalls.find(
            (call) => call.args[0].input.Item && (call.args[0].input.Item as Record<string, unknown>).id === 'STREAK',
          );
          expect(streakPut).toBeDefined();
          const item = streakPut!.args[0].input.Item as Record<string, unknown>;
          expect(item.longestStreak).toBeGreaterThanOrEqual(item.currentStreak as number);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 3: Achievements are never duplicated
   */
  test('Property 3: No duplicate achievements', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 30 }), async (currentStreak) => {
        ddbMock.reset();

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().substring(0, 10);

        ddbMock
          .on(QueryCommand, {
            KeyConditionExpression: 'userId = :userId AND id = :id',
          })
          .resolves({
            Items: [
              {
                userId: 'user-prop',
                id: 'STREAK',
                currentStreak,
                longestStreak: currentStreak,
                lastTrainingDate: yesterdayStr,
                totalTrainingDays: currentStreak,
              },
            ],
          });

        // Simulate already having FIRST_TRAINING and STREAK_3
        ddbMock
          .on(QueryCommand, {
            KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
          })
          .resolves({
            Items: [
              {
                id: 'ACH#FIRST_TRAINING',
                userId: 'user-prop',
                type: 'FIRST_TRAINING',
                unlockedAt: '2024-01-01T00:00:00.000Z',
              },
              { id: 'ACH#STREAK_3', userId: 'user-prop', type: 'STREAK_3', unlockedAt: '2024-01-03T00:00:00.000Z' },
            ],
          });

        ddbMock
          .on(QueryCommand, {
            IndexName: 'userId-nextReviewAt-index',
          })
          .resolves({ Items: [] });

        ddbMock.on(PutCommand).resolves({});

        const service = AchievementService.getInstance();
        await service.recordTrainingCompleted('user-prop', {
          correctCount: 5,
          incorrectCount: 0,
        });

        // Verify no attempt to unlock FIRST_TRAINING or STREAK_3 again
        const putCalls = ddbMock.commandCalls(PutCommand);
        const achievementPuts = putCalls.filter((call) => {
          const item = call.args[0].input.Item as Record<string, unknown>;
          return item && typeof item.id === 'string' && (item.id as string).startsWith('ACH#');
        });

        const achievementIds = achievementPuts.map((call) => (call.args[0].input.Item as Record<string, unknown>).id);

        // No duplicates in the IDs we try to write
        const uniqueIds = new Set(achievementIds);
        expect(achievementIds.length).toBe(uniqueIds.size);

        // Specifically, FIRST_TRAINING and STREAK_3 should not appear
        expect(achievementIds).not.toContain('ACH#FIRST_TRAINING');
        expect(achievementIds).not.toContain('ACH#STREAK_3');
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 4: Multiple completions on same day do not double-increment streak
   */
  test('Property 4: Same-day completions do not double-increment streak', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 10 }),
        async (currentStreak, completionsToday) => {
          ddbMock.reset();

          const today = new Date().toISOString().substring(0, 10);

          ddbMock
            .on(QueryCommand, {
              KeyConditionExpression: 'userId = :userId AND id = :id',
            })
            .resolves({
              Items: [
                {
                  userId: 'user-prop',
                  id: 'STREAK',
                  currentStreak,
                  longestStreak: currentStreak,
                  lastTrainingDate: today,
                  totalTrainingDays: currentStreak,
                },
              ],
            });

          ddbMock
            .on(QueryCommand, {
              KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
            })
            .resolves({ Items: [] });

          ddbMock
            .on(QueryCommand, {
              IndexName: 'userId-nextReviewAt-index',
            })
            .resolves({ Items: [] });

          ddbMock.on(PutCommand).resolves({});

          const service = AchievementService.getInstance();

          // Simulate multiple completions on same day
          for (let i = 0; i < completionsToday; i++) {
            await service.recordTrainingCompleted('user-prop', {
              correctCount: 5,
              incorrectCount: 1,
            });
          }

          // Each call should produce a streak put - check that the streak value stays the same
          const putCalls = ddbMock.commandCalls(PutCommand);
          const streakPuts = putCalls.filter(
            (call) => call.args[0].input.Item && (call.args[0].input.Item as Record<string, unknown>).id === 'STREAK',
          );

          // All streak writes should have same currentStreak (no increment for same day)
          for (const put of streakPuts) {
            const item = put.args[0].input.Item as Record<string, unknown>;
            expect(item.currentStreak).toBe(currentStreak);
            expect(item.totalTrainingDays).toBe(currentStreak);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
