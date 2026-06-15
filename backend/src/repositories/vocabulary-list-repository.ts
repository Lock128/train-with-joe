import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { VocabularyList } from '../model/domain/VocabularyList';
import { BaseRepository } from './base-repository';

/**
 * Repository for managing VocabularyList entities in DynamoDB
 * Provides CRUD operations with GSI support for userId lookup
 */
export class VocabularyListRepository extends BaseRepository<VocabularyList> {
  private static instance: VocabularyListRepository;

  private constructor() {
    super({
      tableName: process.env.VOCABULARY_LISTS_TABLE_NAME || 'train-with-joe-vocabulary-lists-sandbox',
      keyField: 'id',
      entityName: 'Vocabulary list',
      setTimestampsOnCreate: true,
    });
  }

  public static getInstance(): VocabularyListRepository {
    if (!VocabularyListRepository.instance) {
      VocabularyListRepository.instance = new VocabularyListRepository();
    }
    return VocabularyListRepository.instance;
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
