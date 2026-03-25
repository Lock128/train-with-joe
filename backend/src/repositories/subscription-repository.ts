import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Subscription } from '../model/domain/Subscription';

/**
 * Repository for managing Subscription entities in DynamoDB
 * Provides CRUD operations with GSI support for userId lookup
 */
export class SubscriptionRepository {
  private static instance: SubscriptionRepository;
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  private constructor() {
    const client = new DynamoDBClient({});
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.SUBSCRIPTIONS_TABLE_NAME || 'minimal-saas-subscriptions-sandbox';
  }

  public static getInstance(): SubscriptionRepository {
    if (!SubscriptionRepository.instance) {
      SubscriptionRepository.instance = new SubscriptionRepository();
    }
    return SubscriptionRepository.instance;
  }

  /**
   * Create a new subscription
   * @param subscription Subscription data to create
   * @returns Created subscription
   * @throws Error if creation fails
   */
  async create(subscription: Subscription): Promise<Subscription> {
    const now = new Date().toISOString();
    const subscriptionRecord: Subscription = {
      ...subscription,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: subscriptionRecord,
          ConditionExpression: 'attribute_not_exists(id)',
        }),
      );
      return subscriptionRecord;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(`Subscription with id ${subscription.id} already exists`);
      }
      console.error('Error creating subscription:', error);
      throw new Error(`Failed to create subscription: ${err.message}`);
    }
  }

  /**
   * Get subscription by ID
   * @param id Subscription ID
   * @returns Subscription if found, null otherwise
   * @throws Error if retrieval fails
   */
  async getById(id: string): Promise<Subscription | null> {
    try {
      const response = await this.dynamoClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { id },
        }),
      );

      if (!response.Item) {
        return null;
      }

      return response.Item as Subscription;
    } catch (error) {
      const err = error as Error;
      console.error('Error getting subscription by id:', error);
      throw new Error(`Failed to get subscription: ${err.message}`);
    }
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

  /**
   * Update subscription by ID
   * @param id Subscription ID
   * @param updates Partial subscription data to update
   * @returns Updated subscription
   * @throws Error if update fails or subscription not found
   */
  async update(id: string, updates: Partial<Subscription>): Promise<Subscription> {
    const now = new Date().toISOString();
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    // Build update expression dynamically
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    if (updateExpressions.length === 1) {
      // Only updatedAt, nothing to update
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Subscription with id ${id} not found`);
      }
      return { ...existing, updatedAt: now };
    }

    try {
      const response = await this.dynamoClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { id },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: 'attribute_exists(id)',
          ReturnValues: 'ALL_NEW',
        }),
      );

      return response.Attributes as Subscription;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(`Subscription with id ${id} not found`);
      }
      console.error('Error updating subscription:', error);
      throw new Error(`Failed to update subscription: ${err.message}`);
    }
  }

  /**
   * Delete subscription by ID
   * @param id Subscription ID
   * @throws Error if deletion fails
   */
  async delete(id: string): Promise<void> {
    try {
      await this.dynamoClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { id },
        }),
      );
    } catch (error) {
      const err = error as Error;
      console.error('Error deleting subscription:', error);
      throw new Error(`Failed to delete subscription: ${err.message}`);
    }
  }
}
