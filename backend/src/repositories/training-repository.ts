import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Training, TrainingExecution } from '../model/domain/Training';
import { BaseRepository } from './base-repository';

/**
 * Repository for managing Training and TrainingExecution entities in DynamoDB
 * Provides CRUD operations with GSI support for userId and trainingId lookup
 */
export class TrainingRepository extends BaseRepository<Training> {
  private static instance: TrainingRepository;

  private constructor() {
    super({
      tableName: process.env.TRAININGS_TABLE_NAME || 'train-with-joe-trainings-sandbox',
      keyField: 'id',
      entityName: 'Training',
      setTimestampsOnCreate: false,
    });
  }

  public static getInstance(): TrainingRepository {
    if (!TrainingRepository.instance) {
      TrainingRepository.instance = new TrainingRepository();
    }
    return TrainingRepository.instance;
  }

  /**
   * Get all trainings by user ID using GSI
   * @param userId User ID
   * @returns Array of trainings for the user
   * @throws Error if retrieval fails
   */
  async getAllByUserId(userId: string): Promise<Training[]> {
    try {
      const response = await this.dynamoClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :userId',
          FilterExpression:
            'attribute_exists(#name) AND attribute_exists(#mode) AND attribute_exists(vocabularyListIds) AND attribute_exists(words) AND attribute_exists(createdAt) AND attribute_exists(updatedAt)',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
          ExpressionAttributeNames: {
            '#name': 'name',
            '#mode': 'mode',
          },
        }),
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items as Training[];
    } catch (error) {
      const err = error as Error;
      console.error('Error getting trainings by userId:', error);
      throw new Error(`Failed to get trainings by userId: ${err.message}`);
    }
  }

  /**
   * Create a new training execution
   * @param execution TrainingExecution data to create
   * @returns Created training execution
   * @throws Error if creation fails
   */
  async createExecution(execution: TrainingExecution): Promise<TrainingExecution> {
    try {
      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: execution,
          ConditionExpression: 'attribute_not_exists(id)',
        }),
      );
      return execution;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(`Training execution with id ${execution.id} already exists`);
      }
      console.error('Error creating training execution:', error);
      throw new Error(`Failed to create training execution: ${err.message}`);
    }
  }

  /**
   * Get training execution by ID
   * @param id TrainingExecution ID
   * @returns TrainingExecution if found, null otherwise
   * @throws Error if retrieval fails
   */
  async getExecutionById(id: string): Promise<TrainingExecution | null> {
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

      return response.Item as TrainingExecution;
    } catch (error) {
      const err = error as Error;
      console.error('Error getting training execution by id:', error);
      throw new Error(`Failed to get training execution: ${err.message}`);
    }
  }

  /**
   * Get all executions for a training by training ID using GSI
   * @param trainingId Training ID
   * @returns Array of training executions
   * @throws Error if retrieval fails
   */
  async getExecutionsByTrainingId(trainingId: string): Promise<TrainingExecution[]> {
    try {
      const response = await this.dynamoClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'trainingId-index',
          KeyConditionExpression: 'trainingId = :trainingId',
          ExpressionAttributeValues: {
            ':trainingId': trainingId,
          },
        }),
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items as TrainingExecution[];
    } catch (error) {
      const err = error as Error;
      console.error('Error getting training executions by trainingId:', error);
      throw new Error(`Failed to get training executions by trainingId: ${err.message}`);
    }
  }

  /**
   * Update training execution by ID
   * @param id TrainingExecution ID
   * @param updates Partial training execution data to update
   * @returns Updated training execution
   * @throws Error if update fails or execution not found
   */
  async updateExecution(id: string, updates: Partial<TrainingExecution>): Promise<TrainingExecution> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    // Build update expression dynamically
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'trainingId') {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    if (updateExpressions.length === 0) {
      const existing = await this.getExecutionById(id);
      if (!existing) {
        throw new Error(`Training execution with id ${id} not found`);
      }
      return existing;
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

      return response.Attributes as TrainingExecution;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(`Training execution with id ${id} not found`);
      }
      console.error('Error updating training execution:', error);
      throw new Error(`Failed to update training execution: ${err.message}`);
    }
  }
}
