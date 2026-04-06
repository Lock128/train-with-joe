import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { VocabularyList } from '../model/domain/VocabularyList';

/**
 * Repository for managing VocabularyList entities in DynamoDB
 * Provides CRUD operations with GSI support for userId lookup
 */
export class VocabularyListRepository {
  private static instance: VocabularyListRepository;
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  private constructor() {
    const client = new DynamoDBClient({});
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.VOCABULARY_LISTS_TABLE_NAME || 'train-with-joe-vocabulary-lists-sandbox';
  }

  public static getInstance(): VocabularyListRepository {
    if (!VocabularyListRepository.instance) {
      VocabularyListRepository.instance = new VocabularyListRepository();
    }
    return VocabularyListRepository.instance;
  }

  /**
   * Create a new vocabulary list
   * @param list VocabularyList data to create
   * @returns Created vocabulary list
   * @throws Error if creation fails
   */
  async create(list: VocabularyList): Promise<VocabularyList> {
    const now = new Date().toISOString();
    const record: VocabularyList = {
      ...list,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: record,
          ConditionExpression: 'attribute_not_exists(id)',
        }),
      );
      return record;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(`Vocabulary list with id ${list.id} already exists`);
      }
      console.error('Error creating vocabulary list:', error);
      throw new Error(`Failed to create vocabulary list: ${err.message}`);
    }
  }

  /**
   * Get vocabulary list by ID
   * @param id VocabularyList ID
   * @returns VocabularyList if found, null otherwise
   * @throws Error if retrieval fails
   */
  async getById(id: string): Promise<VocabularyList | null> {
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

      return response.Item as VocabularyList;
    } catch (error) {
      const err = error as Error;
      console.error('Error getting vocabulary list by id:', error);
      throw new Error(`Failed to get vocabulary list: ${err.message}`);
    }
  }

  /**
   * Get all vocabulary lists by user ID using GSI
   * @param userId User ID
   * @returns Array of vocabulary lists for the user
   * @throws Error if retrieval fails
   */
  async getAllByUserId(userId: string): Promise<VocabularyList[]> {
    try {
      const response = await this.dynamoClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
        }),
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items as VocabularyList[];
    } catch (error) {
      const err = error as Error;
      console.error('Error getting vocabulary lists by userId:', error);
      throw new Error(`Failed to get vocabulary lists by userId: ${err.message}`);
    }
  }

  /**
   * Update vocabulary list by ID
   * @param id VocabularyList ID
   * @param updates Partial vocabulary list data to update
   * @returns Updated vocabulary list
   * @throws Error if update fails or vocabulary list not found
   */
  async update(id: string, updates: Partial<VocabularyList>): Promise<VocabularyList> {
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
        throw new Error(`Vocabulary list with id ${id} not found`);
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

      return response.Attributes as VocabularyList;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(`Vocabulary list with id ${id} not found`);
      }
      console.error('Error updating vocabulary list:', error);
      throw new Error(`Failed to update vocabulary list: ${err.message}`);
    }
  }

  /**
   * Delete vocabulary list by ID
   * @param id VocabularyList ID
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
      console.error('Error deleting vocabulary list:', error);
      throw new Error(`Failed to delete vocabulary list: ${err.message}`);
    }
  }

  /**
   * Get all public vocabulary lists (with COMPLETED status), ordered by createdAt descending
   * @returns Array of public vocabulary lists
   * @throws Error if retrieval fails
   */
  async getPublicLists(): Promise<VocabularyList[]> {
    try {
      const response = await this.dynamoClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'isPublic-createdAt-index',
          KeyConditionExpression: 'isPublic = :isPublic',
          FilterExpression: '#status = :status',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':isPublic': 'true',
            ':status': 'COMPLETED',
          },
          ScanIndexForward: false,
        }),
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items as VocabularyList[];
    } catch (error) {
      const err = error as Error;
      console.error('Error getting public vocabulary lists:', error);
      throw new Error(`Failed to get public vocabulary lists: ${err.message}`);
    }
  }
}
