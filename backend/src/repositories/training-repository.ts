import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Training, TrainingExecution } from '../model/domain/Training';

/**
 * Repository for managing Training and TrainingExecution entities in DynamoDB
 * Provides CRUD operations with GSI support for userId and trainingId lookup
 */
export class TrainingRepository {
  private static instance: TrainingRepository;
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  private constructor() {
    const client = new DynamoDBClient({});
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.TRAININGS_TABLE_NAME || 'train-with-joe-trainings-sandbox';
  }

  public static getInstance(): TrainingRepository {
    if (!TrainingRepository.instance) {
      TrainingRepository.instance = new TrainingRepository();
    }
    return TrainingRepository.instance;
  }

  /**
   * Create a new training
   * @param training Training data to create
   * @returns Created training
   * @throws Error if creation fails
   */
  async create(training: Training): Promise<Training> {
    try {
      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: training,
          ConditionExpression: 'attribute_not_exists(id)',
        }),
      );
      return training;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(`Training with id ${training.id} already exists`);
      }
      console.error('Error creating training:', error);
      throw new Error(`Failed to create training: ${err.message}`);
    }
  }

  /**
   * Get training by ID
   * @param id Training ID
   * @returns Training if found, null otherwise
   * @throws Error if retrieval fails
   */
  async getById(id: string): Promise<Training | null> {
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

      return response.Item as Training;
    } catch (error) {
      const err = error as Error;
      console.error('Error getting training by id:', error);
      throw new Error(`Failed to get training: ${err.message}`);
    }
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
          FilterExpression: 'attribute_exists(#mode) AND attribute_exists(vocabularyListIds)',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
          ExpressionAttributeNames: {
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
   * Update training by ID
   * @param id Training ID
   * @param updates Partial training data to update
   * @returns Updated training
   * @throws Error if update fails or training not found
   */
  async update(id: string, updates: Partial<Training>): Promise<Training> {
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
        throw new Error(`Training with id ${id} not found`);
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

      return response.Attributes as Training;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(`Training with id ${id} not found`);
      }
      console.error('Error updating training:', error);
      throw new Error(`Failed to update training: ${err.message}`);
    }
  }

  /**
   * Delete training by ID
   * @param id Training ID
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
      console.error('Error deleting training:', error);
      throw new Error(`Failed to delete training: ${err.message}`);
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
