import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { WordMastery } from '../model/domain/WordMastery';
import { BaseRepository } from './base-repository';

/**
 * Repository for managing WordMastery entities in DynamoDB
 * Supports GSI on userId+nextReviewAt for efficient due-word queries
 */
export class WordMasteryRepository extends BaseRepository<WordMastery> {
  private static instance: WordMasteryRepository;

  private constructor() {
    super({
      tableName: process.env.WORD_MASTERY_TABLE_NAME || 'train-with-joe-word-mastery-sandbox',
      keyField: 'id',
      entityName: 'Word mastery',
      setTimestampsOnCreate: false,
    });
  }

  public static getInstance(): WordMasteryRepository {
    if (!WordMasteryRepository.instance) {
      WordMasteryRepository.instance = new WordMasteryRepository();
    }
    return WordMasteryRepository.instance;
  }

  /**
   * Get all word mastery records for a user, optionally filtered by vocabulary list IDs.
   * Uses the GSI userId-nextReviewAt-index for efficient retrieval.
   * @param userId User ID
   * @param vocabularyListIds Optional list IDs to filter by
   * @returns Array of WordMastery records
   */
  async getByUserId(userId: string, vocabularyListIds?: string[]): Promise<WordMastery[]> {
    try {
      const response = await this.dynamoClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'userId-nextReviewAt-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
        }),
      );

      let items = (response.Items || []) as WordMastery[];

      if (vocabularyListIds && vocabularyListIds.length > 0) {
        items = items.filter((item) => vocabularyListIds.includes(item.vocabularyListId));
      }

      return items;
    } catch (error) {
      const err = error as Error;
      console.error('Error getting word mastery by userId:', error);
      throw new Error(`Failed to get word mastery by userId: ${err.message}`);
    }
  }

  /**
   * Get word mastery records due for review (nextReviewAt <= now).
   * Uses the GSI userId-nextReviewAt-index with a sort key condition.
   * @param userId User ID
   * @param now ISO date string representing current time
   * @param vocabularyListIds Optional list IDs to filter by
   * @returns Array of WordMastery records due for review
   */
  async getDueForReview(userId: string, now: string, vocabularyListIds?: string[]): Promise<WordMastery[]> {
    try {
      const response = await this.dynamoClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'userId-nextReviewAt-index',
          KeyConditionExpression: 'userId = :userId AND nextReviewAt <= :now',
          ExpressionAttributeValues: {
            ':userId': userId,
            ':now': now,
          },
        }),
      );

      let items = (response.Items || []) as WordMastery[];

      if (vocabularyListIds && vocabularyListIds.length > 0) {
        items = items.filter((item) => vocabularyListIds.includes(item.vocabularyListId));
      }

      return items;
    } catch (error) {
      const err = error as Error;
      console.error('Error getting due word mastery records:', error);
      throw new Error(`Failed to get due word mastery records: ${err.message}`);
    }
  }

  /**
   * Upsert a word mastery record (create or overwrite).
   * @param mastery WordMastery data
   * @returns The saved WordMastery record
   */
  async upsert(mastery: WordMastery): Promise<WordMastery> {
    try {
      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: mastery,
        }),
      );
      return mastery;
    } catch (error) {
      const err = error as Error;
      console.error('Error upserting word mastery:', error);
      throw new Error(`Failed to upsert word mastery: ${err.message}`);
    }
  }
}
