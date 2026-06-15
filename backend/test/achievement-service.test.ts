import { describe, test, expect, beforeEach } from 'vitest';
import { AchievementService } from '../src/services/achievement-service';
import { AchievementType } from '../src/model/domain/Achievement';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Unit Tests for Achievement Service
 */

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Achievement Service', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('recordTrainingCompleted', () => {
    test('first training creates streak with currentStreak=1', async () => {
      // getStreak returns null (no existing streak)
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      // updateStreak + unlockAchievement PutCommands
      ddbMock.on(PutCommand).resolves({});

      const service = AchievementService.getInstance();
      await service.recordTrainingCompleted('user-1', {
        correctCount: 5,
        incorrectCount: 1,
      });

      // Verify streak was saved with the PutCommand
      const putCalls = ddbMock.commandCalls(PutCommand);
      const streakPut = putCalls.find(
        (call) => call.args[0].input.Item && (call.args[0].input.Item as Record<string, unknown>).id === 'STREAK',
      );
      expect(streakPut).toBeDefined();
      const streakItem = streakPut!.args[0].input.Item as Record<string, unknown>;
      expect(streakItem.currentStreak).toBe(1);
      expect(streakItem.longestStreak).toBe(1);
      expect(streakItem.totalTrainingDays).toBe(1);
    });

    test('consecutive days increment streak', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().substring(0, 10);

      // getStreak returns existing streak
      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND id = :id',
        })
        .resolves({
          Items: [
            {
              userId: 'user-1',
              id: 'STREAK',
              currentStreak: 3,
              longestStreak: 5,
              lastTrainingDate: yesterdayStr,
              totalTrainingDays: 10,
            },
          ],
        });

      // getAchievements returns some existing
      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
        })
        .resolves({
          Items: [
            {
              id: 'ACH#FIRST_TRAINING',
              userId: 'user-1',
              type: 'FIRST_TRAINING',
              unlockedAt: '2024-01-01T00:00:00.000Z',
            },
            { id: 'ACH#STREAK_3', userId: 'user-1', type: 'STREAK_3', unlockedAt: '2024-01-03T00:00:00.000Z' },
          ],
        });

      ddbMock.on(PutCommand).resolves({});

      const service = AchievementService.getInstance();
      await service.recordTrainingCompleted('user-1', {
        correctCount: 5,
        incorrectCount: 0,
      });

      const putCalls = ddbMock.commandCalls(PutCommand);
      const streakPut = putCalls.find(
        (call) => call.args[0].input.Item && (call.args[0].input.Item as Record<string, unknown>).id === 'STREAK',
      );
      expect(streakPut).toBeDefined();
      const streakItem = streakPut!.args[0].input.Item as Record<string, unknown>;
      expect(streakItem.currentStreak).toBe(4);
      expect(streakItem.longestStreak).toBe(5);
      expect(streakItem.totalTrainingDays).toBe(11);
    });

    test('missed day resets streak but preserves longestStreak', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().substring(0, 10);

      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND id = :id',
        })
        .resolves({
          Items: [
            {
              userId: 'user-1',
              id: 'STREAK',
              currentStreak: 7,
              longestStreak: 14,
              lastTrainingDate: threeDaysAgoStr,
              totalTrainingDays: 20,
            },
          ],
        });

      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
        })
        .resolves({ Items: [] });

      ddbMock.on(PutCommand).resolves({});

      const service = AchievementService.getInstance();
      await service.recordTrainingCompleted('user-1', {
        correctCount: 3,
        incorrectCount: 2,
      });

      const putCalls = ddbMock.commandCalls(PutCommand);
      const streakPut = putCalls.find(
        (call) => call.args[0].input.Item && (call.args[0].input.Item as Record<string, unknown>).id === 'STREAK',
      );
      expect(streakPut).toBeDefined();
      const streakItem = streakPut!.args[0].input.Item as Record<string, unknown>;
      expect(streakItem.currentStreak).toBe(1);
      expect(streakItem.longestStreak).toBe(14); // preserved
      expect(streakItem.totalTrainingDays).toBe(21);
    });

    test('same-day completions do not increment streak', async () => {
      const today = new Date().toISOString().substring(0, 10);

      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND id = :id',
        })
        .resolves({
          Items: [
            {
              userId: 'user-1',
              id: 'STREAK',
              currentStreak: 5,
              longestStreak: 5,
              lastTrainingDate: today,
              totalTrainingDays: 5,
            },
          ],
        });

      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
        })
        .resolves({ Items: [] });

      ddbMock.on(PutCommand).resolves({});

      const service = AchievementService.getInstance();
      await service.recordTrainingCompleted('user-1', {
        correctCount: 3,
        incorrectCount: 0,
      });

      const putCalls = ddbMock.commandCalls(PutCommand);
      const streakPut = putCalls.find(
        (call) => call.args[0].input.Item && (call.args[0].input.Item as Record<string, unknown>).id === 'STREAK',
      );
      expect(streakPut).toBeDefined();
      const streakItem = streakPut!.args[0].input.Item as Record<string, unknown>;
      expect(streakItem.currentStreak).toBe(5); // unchanged
      expect(streakItem.totalTrainingDays).toBe(5); // unchanged
    });
  });

  describe('checkAndUnlockAchievements', () => {
    test('first training unlocks FIRST_TRAINING', async () => {
      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND id = :id',
        })
        .resolves({
          Items: [
            {
              userId: 'user-1',
              id: 'STREAK',
              currentStreak: 1,
              longestStreak: 1,
              lastTrainingDate: '2024-06-01',
              totalTrainingDays: 1,
            },
          ],
        });

      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
        })
        .resolves({ Items: [] });

      // Word mastery query - userId-nextReviewAt-index
      ddbMock
        .on(QueryCommand, {
          IndexName: 'userId-nextReviewAt-index',
        })
        .resolves({ Items: [] });

      ddbMock.on(PutCommand).resolves({});

      const service = AchievementService.getInstance();
      await service.checkAndUnlockAchievements('user-1', { correctCount: 5, incorrectCount: 0 });

      const putCalls = ddbMock.commandCalls(PutCommand);
      const achievementPut = putCalls.find(
        (call) =>
          call.args[0].input.Item && (call.args[0].input.Item as Record<string, unknown>).id === 'ACH#FIRST_TRAINING',
      );
      expect(achievementPut).toBeDefined();
    });

    test('streak of 7 unlocks STREAK_7', async () => {
      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND id = :id',
        })
        .resolves({
          Items: [
            {
              userId: 'user-1',
              id: 'STREAK',
              currentStreak: 7,
              longestStreak: 7,
              lastTrainingDate: '2024-06-07',
              totalTrainingDays: 7,
            },
          ],
        });

      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
        })
        .resolves({
          Items: [
            {
              id: 'ACH#FIRST_TRAINING',
              userId: 'user-1',
              type: 'FIRST_TRAINING',
              unlockedAt: '2024-06-01T00:00:00.000Z',
            },
            { id: 'ACH#STREAK_3', userId: 'user-1', type: 'STREAK_3', unlockedAt: '2024-06-03T00:00:00.000Z' },
          ],
        });

      ddbMock
        .on(QueryCommand, {
          IndexName: 'userId-nextReviewAt-index',
        })
        .resolves({ Items: [] });

      ddbMock.on(PutCommand).resolves({});

      const service = AchievementService.getInstance();
      await service.checkAndUnlockAchievements('user-1', { correctCount: 5, incorrectCount: 1 });

      const putCalls = ddbMock.commandCalls(PutCommand);
      const streak7Put = putCalls.find(
        (call) => call.args[0].input.Item && (call.args[0].input.Item as Record<string, unknown>).id === 'ACH#STREAK_7',
      );
      expect(streak7Put).toBeDefined();
    });

    test('achievements are only unlocked once (idempotent)', async () => {
      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND id = :id',
        })
        .resolves({
          Items: [
            {
              userId: 'user-1',
              id: 'STREAK',
              currentStreak: 7,
              longestStreak: 7,
              lastTrainingDate: '2024-06-07',
              totalTrainingDays: 7,
            },
          ],
        });

      // All streak achievements already unlocked
      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
        })
        .resolves({
          Items: [
            {
              id: 'ACH#FIRST_TRAINING',
              userId: 'user-1',
              type: 'FIRST_TRAINING',
              unlockedAt: '2024-06-01T00:00:00.000Z',
            },
            { id: 'ACH#STREAK_3', userId: 'user-1', type: 'STREAK_3', unlockedAt: '2024-06-03T00:00:00.000Z' },
            { id: 'ACH#STREAK_7', userId: 'user-1', type: 'STREAK_7', unlockedAt: '2024-06-07T00:00:00.000Z' },
            {
              id: 'ACH#PERFECT_SCORE',
              userId: 'user-1',
              type: 'PERFECT_SCORE',
              unlockedAt: '2024-06-05T00:00:00.000Z',
            },
          ],
        });

      ddbMock
        .on(QueryCommand, {
          IndexName: 'userId-nextReviewAt-index',
        })
        .resolves({ Items: [] });

      ddbMock.on(PutCommand).resolves({});

      const service = AchievementService.getInstance();
      await service.checkAndUnlockAchievements('user-1', { correctCount: 5, incorrectCount: 0 });

      // No new PutCommands for achievements should be made (only existing ones are present)
      const putCalls = ddbMock.commandCalls(PutCommand);
      const achievementPuts = putCalls.filter((call) => {
        const item = call.args[0].input.Item as Record<string, unknown>;
        return item && typeof item.id === 'string' && (item.id as string).startsWith('ACH#');
      });
      // Should not try to unlock any already-unlocked achievements
      // (FIRST_TRAINING, STREAK_3, STREAK_7, PERFECT_SCORE are all in the set)
      expect(achievementPuts.length).toBe(0);
    });

    test('perfect score unlocks PERFECT_SCORE', async () => {
      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND id = :id',
        })
        .resolves({
          Items: [
            {
              userId: 'user-1',
              id: 'STREAK',
              currentStreak: 1,
              longestStreak: 1,
              lastTrainingDate: '2024-06-01',
              totalTrainingDays: 1,
            },
          ],
        });

      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
        })
        .resolves({
          Items: [
            {
              id: 'ACH#FIRST_TRAINING',
              userId: 'user-1',
              type: 'FIRST_TRAINING',
              unlockedAt: '2024-06-01T00:00:00.000Z',
            },
          ],
        });

      ddbMock
        .on(QueryCommand, {
          IndexName: 'userId-nextReviewAt-index',
        })
        .resolves({ Items: [] });

      ddbMock.on(PutCommand).resolves({});

      const service = AchievementService.getInstance();
      await service.checkAndUnlockAchievements('user-1', { correctCount: 10, incorrectCount: 0 });

      const putCalls = ddbMock.commandCalls(PutCommand);
      const perfectScorePut = putCalls.find(
        (call) =>
          call.args[0].input.Item && (call.args[0].input.Item as Record<string, unknown>).id === 'ACH#PERFECT_SCORE',
      );
      expect(perfectScorePut).toBeDefined();
    });

    test('SPEED_DEMON unlocks when training completed under 60 seconds', async () => {
      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND id = :id',
        })
        .resolves({
          Items: [
            {
              userId: 'user-1',
              id: 'STREAK',
              currentStreak: 1,
              longestStreak: 1,
              lastTrainingDate: '2024-06-01',
              totalTrainingDays: 1,
            },
          ],
        });

      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
        })
        .resolves({
          Items: [
            {
              id: 'ACH#FIRST_TRAINING',
              userId: 'user-1',
              type: 'FIRST_TRAINING',
              unlockedAt: '2024-06-01T00:00:00.000Z',
            },
          ],
        });

      ddbMock
        .on(QueryCommand, {
          IndexName: 'userId-nextReviewAt-index',
        })
        .resolves({ Items: [] });

      ddbMock.on(PutCommand).resolves({});

      const service = AchievementService.getInstance();
      await service.checkAndUnlockAchievements('user-1', {
        correctCount: 5,
        incorrectCount: 2,
        durationSeconds: 45,
      });

      const putCalls = ddbMock.commandCalls(PutCommand);
      const speedDemonPut = putCalls.find(
        (call) =>
          call.args[0].input.Item && (call.args[0].input.Item as Record<string, unknown>).id === 'ACH#SPEED_DEMON',
      );
      expect(speedDemonPut).toBeDefined();
    });
  });

  describe('getProgress', () => {
    test('returns streak and achievements for user', async () => {
      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND id = :id',
        })
        .resolves({
          Items: [
            {
              userId: 'user-1',
              id: 'STREAK',
              currentStreak: 5,
              longestStreak: 10,
              lastTrainingDate: '2024-06-05',
              totalTrainingDays: 15,
            },
          ],
        });

      ddbMock
        .on(QueryCommand, {
          KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
        })
        .resolves({
          Items: [
            {
              id: 'ACH#FIRST_TRAINING',
              userId: 'user-1',
              type: AchievementType.FIRST_TRAINING,
              unlockedAt: '2024-06-01T00:00:00.000Z',
            },
            {
              id: 'ACH#STREAK_3',
              userId: 'user-1',
              type: AchievementType.STREAK_3,
              unlockedAt: '2024-06-03T00:00:00.000Z',
            },
          ],
        });

      const service = AchievementService.getInstance();
      const progress = await service.getProgress('user-1');

      expect(progress.streak).not.toBeNull();
      expect(progress.streak!.currentStreak).toBe(5);
      expect(progress.streak!.longestStreak).toBe(10);
      expect(progress.streak!.totalTrainingDays).toBe(15);
      expect(progress.achievements).toHaveLength(2);
      expect(progress.achievements[0].type).toBe(AchievementType.FIRST_TRAINING);
      expect(progress.achievements[1].type).toBe(AchievementType.STREAK_3);
    });

    test('returns null streak when no training history', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const service = AchievementService.getInstance();
      const progress = await service.getProgress('user-new');

      expect(progress.streak).toBeNull();
      expect(progress.achievements).toHaveLength(0);
    });
  });
});
