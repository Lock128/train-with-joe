import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Achievement, UserStreak } from '../model/domain/Achievement';
import type { AchievementType } from '../model/domain/Achievement';
import { BaseRepository } from './base-repository';

/**
 * DynamoDB record shape for the Achievements table.
 * Uses composite key pattern:
 * - Partition key: userId
 * - Sort key: id ('STREAK' for streak record, 'ACH#<type>' for achievements)
 */
interface AchievementRecord {
  userId: string;
  id: string;
  [key: string]: unknown;
}

/**
 * Repository for managing UserStreak and Achievement entities in DynamoDB.
 * Uses a single table with composite sort key pattern.
 */
export class AchievementRepository extends BaseRepository<AchievementRecord> {
  private static instance: AchievementRepository;

  private constructor() {
    super({
      tableName: process.env.ACHIEVEMENTS_TABLE_NAME || 'train-with-joe-achievements-sandbox',
      keyField: 'userId',
      entityName: 'Achievement',
      setTimestampsOnCreate: false,
    });
  }

  public static getInstance(): AchievementRepository {
    if (!AchievementRepository.instance) {
      AchievementRepository.instance = new AchievementRepository();
    }
    return AchievementRepository.instance;
  }

  /**
   * Get the streak record for a user.
   * @param userId User ID
   * @returns UserStreak if found, null otherwise
   */
  async getStreak(userId: string): Promise<UserStreak | null> {
    try {
      const response = await this.dynamoClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'userId = :userId AND id = :id',
          ExpressionAttributeValues: {
            ':userId': userId,
            ':id': 'STREAK',
          },
        }),
      );

      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      const item = response.Items[0];
      return {
        userId: item.userId as string,
        currentStreak: item.currentStreak as number,
        longestStreak: item.longestStreak as number,
        lastTrainingDate: item.lastTrainingDate as string,
        totalTrainingDays: item.totalTrainingDays as number,
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error getting streak:', error);
      throw new Error(`Failed to get streak: ${err.message}`);
    }
  }

  /**
   * Update (or create) the streak record for a user.
   * @param streak UserStreak data to persist
   * @returns The saved UserStreak
   */
  async updateStreak(streak: UserStreak): Promise<UserStreak> {
    try {
      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            userId: streak.userId,
            id: 'STREAK',
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastTrainingDate: streak.lastTrainingDate,
            totalTrainingDays: streak.totalTrainingDays,
          },
        }),
      );
      return streak;
    } catch (error) {
      const err = error as Error;
      console.error('Error updating streak:', error);
      throw new Error(`Failed to update streak: ${err.message}`);
    }
  }

  /**
   * Get all achievements for a user.
   * @param userId User ID
   * @returns Array of Achievement records
   */
  async getAchievements(userId: string): Promise<Achievement[]> {
    try {
      const response = await this.dynamoClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'userId = :userId AND begins_with(id, :prefix)',
          ExpressionAttributeValues: {
            ':userId': userId,
            ':prefix': 'ACH#',
          },
        }),
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map((item) => ({
        id: item.id as string,
        userId: item.userId as string,
        type: item.type as AchievementType,
        unlockedAt: item.unlockedAt as string,
        metadata: item.metadata as Record<string, unknown> | undefined,
      }));
    } catch (error) {
      const err = error as Error;
      console.error('Error getting achievements:', error);
      throw new Error(`Failed to get achievements: ${err.message}`);
    }
  }

  /**
   * Unlock an achievement for a user (idempotent - will not overwrite existing).
   * @param userId User ID
   * @param type AchievementType to unlock
   * @param metadata Optional metadata about the unlock context
   * @returns The Achievement record (existing or newly created)
   */
  async unlockAchievement(
    userId: string,
    type: AchievementType,
    metadata?: Record<string, unknown>,
  ): Promise<Achievement> {
    const id = `ACH#${type}`;

    const achievement: Achievement = {
      id,
      userId,
      type,
      unlockedAt: new Date().toISOString(),
      metadata,
    };

    try {
      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            userId: achievement.userId,
            id: achievement.id,
            type: achievement.type,
            unlockedAt: achievement.unlockedAt,
            ...(achievement.metadata ? { metadata: achievement.metadata } : {}),
          },
          ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(id)',
        }),
      );
      return achievement;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        // Achievement already exists - return existing
        const existing = await this.getAchievements(userId);
        return existing.find((a) => a.type === type) || achievement;
      }
      console.error('Error unlocking achievement:', error);
      throw new Error(`Failed to unlock achievement: ${err.message}`);
    }
  }
}
