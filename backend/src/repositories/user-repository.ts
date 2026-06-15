import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { User } from '../model/domain/User';
import { BaseRepository } from './base-repository';

/**
 * Repository for managing User entities in DynamoDB
 * Provides CRUD operations with consistent error handling
 */
export class UserRepository extends BaseRepository<User> {
  private static instance: UserRepository;

  private constructor() {
    super({
      tableName: process.env.USERS_TABLE_NAME || 'train-with-joe-users-sandbox',
      keyField: 'id',
      entityName: 'User',
      setTimestampsOnCreate: true,
    });
  }

  public static getInstance(): UserRepository {
    if (!UserRepository.instance) {
      UserRepository.instance = new UserRepository();
    }
    return UserRepository.instance;
  }

  /**
   * Get user by email (uses email-index GSI)
   * @param email User email
   * @returns User if found, null otherwise
   * @throws Error if retrieval fails
   */
  async getByEmail(email: string): Promise<User | null> {
    try {
      const response = await this.dynamoClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: { ':email': email },
          Limit: 1,
        }),
      );

      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      return response.Items[0] as User;
    } catch (error) {
      const err = error as Error;
      console.error('Error getting user by email:', error);
      throw new Error(`Failed to get user by email: ${err.message}`);
    }
  }

  /**
   * Get all users (admin only - performs a full table scan)
   * @returns Array of all users
   * @throws Error if retrieval fails
   */
  async getAll(): Promise<User[]> {
    try {
      const items: User[] = [];
      let lastKey: Record<string, unknown> | undefined;
      do {
        const response = await this.dynamoClient.send(
          new ScanCommand({
            TableName: this.tableName,
            ExclusiveStartKey: lastKey,
          }),
        );
        if (response.Items) {
          items.push(...(response.Items as User[]));
        }
        lastKey = response.LastEvaluatedKey;
      } while (lastKey);
      return items;
    } catch (error) {
      const err = error as Error;
      console.error('Error scanning users:', error);
      throw new Error(`Failed to get users: ${err.message}`);
    }
  }
}
