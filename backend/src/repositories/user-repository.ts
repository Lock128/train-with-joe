import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { User } from '../model/domain/User';

/**
 * Repository for managing User entities in DynamoDB
 * Provides CRUD operations with consistent error handling
 */
export class UserRepository {
  private static instance: UserRepository;
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  private constructor() {
    const client = new DynamoDBClient({});
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.USERS_TABLE_NAME || 'train-with-joe-users-sandbox';
  }

  public static getInstance(): UserRepository {
    if (!UserRepository.instance) {
      UserRepository.instance = new UserRepository();
    }
    return UserRepository.instance;
  }

  /**
   * Create a new user
   * @param user User data to create
   * @returns Created user
   * @throws Error if creation fails
   */
  async create(user: User): Promise<User> {
    const now = new Date().toISOString();
    const userRecord: User = {
      ...user,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: userRecord,
          ConditionExpression: 'attribute_not_exists(id)',
        }),
      );
      return userRecord;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(`User with id ${user.id} already exists`);
      }
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${err.message}`);
    }
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
   * Get user by ID
   * @param id User ID
   * @returns User if found, null otherwise
   * @throws Error if retrieval fails
   */
  async getById(id: string): Promise<User | null> {
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

      return response.Item as User;
    } catch (error) {
      const err = error as Error;
      console.error('Error getting user by id:', error);
      throw new Error(`Failed to get user: ${err.message}`);
    }
  }

  /**
   * Update user by ID
   * @param id User ID
   * @param updates Partial user data to update
   * @returns Updated user
   * @throws Error if update fails or user not found
   */
  async update(id: string, updates: Partial<User>): Promise<User> {
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
        throw new Error(`User with id ${id} not found`);
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

      return response.Attributes as User;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(`User with id ${id} not found`);
      }
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${err.message}`);
    }
  }

  /**
   * Get all users (admin only — performs a full table scan)
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

  /**
   * Delete user by ID
   * @param id User ID
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
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${err.message}`);
    }
  }
}
