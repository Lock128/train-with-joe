import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Subscription } from '../model/domain/Subscription';
import { BaseRepository } from './base-repository';

/**
 * Repository for managing Subscription entities in DynamoDB
 * Provides CRUD operations with GSI support for userId lookup
 */
export class SubscriptionRepository extends BaseRepository<Subscription> {
  private static instance: SubscriptionRepository;

  private constructor() {
    super({
      tableName: process.env.SUBSCRIPTIONS_TABLE_NAME || 'train-with-joe-subscriptions-sandbox',
      keyField: 'id',
      entityName: 'Subscription',
      setTimestampsOnCreate: true,
    });
  }

  public static getInstance(): SubscriptionRepository {
    if (!SubscriptionRepository.instance) {
      SubscriptionRepository.instance = new SubscriptionRepository();
    }
    return SubscriptionRepository.instance;
  }

  /**
   * Get subscription by user ID using GSI
   * @param userId User ID
   * @returns Subscription if found, null otherwise
   * @throws Error if retrieval fails
   */
  async getByUserId(userId: string): Promise<Subscription | null> {
    try {
      const response = await this.dynamoClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
          Limit: 1,
        }),
      );

      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      return response.Items[0] as Subscription;
    } catch (error) {
      const err = error as Error;
      console.error('Error getting subscription by userId:', error);
      throw new Error(`Failed to get subscription by userId: ${err.message}`);
    }
  }
}
