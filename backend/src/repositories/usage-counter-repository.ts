import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { UsageCounter } from '../model/domain/UsageCounter';

/**
 * Repository for managing UsageCounter entities in DynamoDB
 * Tracks per-user usage of limited resources (image scans, vocabulary lists)
 */
export class UsageCounterRepository {
  private static instance: UsageCounterRepository;
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  private constructor() {
    const client = new DynamoDBClient({});
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.USAGE_COUNTERS_TABLE_NAME || 'train-with-joe-usage-counters-sandbox';
  }

  public static getInstance(): UsageCounterRepository {
    if (!UsageCounterRepository.instance) {
      UsageCounterRepository.instance = new UsageCounterRepository();
    }
    return UsageCounterRepository.instance;
  }

  /**
   * Get usage counter by user ID
   * @param userId User ID
   * @returns UsageCounter if found, null otherwise
   * @throws Error if retrieval fails
   */
  async getByUserId(userId: string): Promise<UsageCounter | null> {
    try {
      const response = await this.dynamoClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { userId },
        }),
      );

      if (!response.Item) {
        return null;
      }

      return response.Item as UsageCounter;
    } catch (error) {
      const err = error as Error;
      console.error('Error getting usage counter by userId:', error);
      throw new Error(`Failed to get usage counter: ${err.message}`);
    }
  }

  /**
   * Increment image scan counter using atomic ADD expression
   * Creates the record if it doesn't exist
   * @param userId User ID
   * @param count Number of scans to add
   * @throws Error if update fails
   */
  async incrementImageScans(userId: string, count: number): Promise<void> {
    const now = new Date().toISOString();
    try {
      await this.dynamoClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { userId },
          UpdateExpression:
            'ADD #imageScansCount :count SET #updatedAt = :now, #vocabularyListsCount = if_not_exists(#vocabularyListsCount, :zero)',
          ExpressionAttributeNames: {
            '#imageScansCount': 'imageScansCount',
            '#updatedAt': 'updatedAt',
            '#vocabularyListsCount': 'vocabularyListsCount',
          },
          ExpressionAttributeValues: {
            ':count': count,
            ':now': now,
            ':zero': 0,
          },
        }),
      );
    } catch (error) {
      const err = error as Error;
      console.error('Error incrementing image scans:', error);
      throw new Error(`Failed to increment image scans: ${err.message}`);
    }
  }

  /**
   * Increment vocabulary list counter by 1 using atomic ADD expression
   * Creates the record if it doesn't exist
   * @param userId User ID
   * @throws Error if update fails
   */
  async incrementVocabularyLists(userId: string): Promise<void> {
    const now = new Date().toISOString();
    try {
      await this.dynamoClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { userId },
          UpdateExpression:
            'ADD #vocabularyListsCount :one SET #updatedAt = :now, #imageScansCount = if_not_exists(#imageScansCount, :zero)',
          ExpressionAttributeNames: {
            '#vocabularyListsCount': 'vocabularyListsCount',
            '#updatedAt': 'updatedAt',
            '#imageScansCount': 'imageScansCount',
          },
          ExpressionAttributeValues: {
            ':one': 1,
            ':now': now,
            ':zero': 0,
          },
        }),
      );
    } catch (error) {
      const err = error as Error;
      console.error('Error incrementing vocabulary lists:', error);
      throw new Error(`Failed to increment vocabulary lists: ${err.message}`);
    }
  }

  /**
   * Decrement vocabulary list counter by 1, clamping to 0 (cannot go negative)
   * @param userId User ID
   * @throws Error if update fails
   */
  async decrementVocabularyLists(userId: string): Promise<void> {
    const now = new Date().toISOString();
    try {
      // First try to decrement with a condition that count > 0
      await this.dynamoClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { userId },
          UpdateExpression: 'SET #vocabularyListsCount = #vocabularyListsCount - :one, #updatedAt = :now',
          ConditionExpression: 'attribute_exists(#vocabularyListsCount) AND #vocabularyListsCount > :zero',
          ExpressionAttributeNames: {
            '#vocabularyListsCount': 'vocabularyListsCount',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':one': 1,
            ':now': now,
            ':zero': 0,
          },
        }),
      );
    } catch (error) {
      const err = error as Error & { name?: string };
      // If condition check fails, the count is already 0 (or record doesn't exist) — nothing to do
      if (err.name === 'ConditionalCheckFailedException') {
        return;
      }
      console.error('Error decrementing vocabulary lists:', error);
      throw new Error(`Failed to decrement vocabulary lists: ${err.message}`);
    }
  }

  /**
   * Reset image scan counter to 0 and set new period start
   * @param userId User ID
   * @param periodStart ISO timestamp for the new billing period start
   * @throws Error if update fails
   */
  async resetImageScanCounter(userId: string, periodStart: string): Promise<void> {
    const now = new Date().toISOString();
    try {
      await this.dynamoClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { userId },
          UpdateExpression:
            'SET #imageScansCount = :zero, #imageScanPeriodStart = :periodStart, #updatedAt = :now, #vocabularyListsCount = if_not_exists(#vocabularyListsCount, :zero)',
          ExpressionAttributeNames: {
            '#imageScansCount': 'imageScansCount',
            '#imageScanPeriodStart': 'imageScanPeriodStart',
            '#updatedAt': 'updatedAt',
            '#vocabularyListsCount': 'vocabularyListsCount',
          },
          ExpressionAttributeValues: {
            ':zero': 0,
            ':periodStart': periodStart,
            ':now': now,
          },
        }),
      );
    } catch (error) {
      const err = error as Error;
      console.error('Error resetting image scan counter:', error);
      throw new Error(`Failed to reset image scan counter: ${err.message}`);
    }
  }
}
