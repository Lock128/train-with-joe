import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Configuration for the base repository
 */
export interface BaseRepositoryConfig {
  tableName: string;
  keyField: string;
  entityName: string;
  setTimestampsOnCreate?: boolean;
}

/**
 * Generic base repository providing shared DynamoDB CRUD operations.
 * Extracts common patterns (create with ConditionExpression, getById, dynamic update, delete)
 * to eliminate duplication across the 5 domain repositories.
 */
export abstract class BaseRepository<T extends Record<string, unknown>> {
  private static sharedClient: DynamoDBDocumentClient | null = null;

  protected dynamoClient: DynamoDBDocumentClient;
  protected tableName: string;
  protected keyField: string;
  protected entityName: string;
  protected setTimestampsOnCreate: boolean;

  private static getSharedClient(): DynamoDBDocumentClient {
    if (!BaseRepository.sharedClient) {
      const client = new DynamoDBClient({});
      BaseRepository.sharedClient = DynamoDBDocumentClient.from(client);
    }
    return BaseRepository.sharedClient;
  }

  protected constructor(config: BaseRepositoryConfig) {
    this.dynamoClient = BaseRepository.getSharedClient();
    this.tableName = config.tableName;
    this.keyField = config.keyField;
    this.entityName = config.entityName;
    this.setTimestampsOnCreate = config.setTimestampsOnCreate ?? true;
  }

  /**
   * Create a new entity with a uniqueness condition on the key field.
   * Optionally sets createdAt/updatedAt timestamps.
   * @param item Entity data to create
   * @returns Created entity (with timestamps if configured)
   * @throws Error if entity already exists or creation fails
   */
  async create(item: T): Promise<T> {
    const now = new Date().toISOString();
    const record: T = this.setTimestampsOnCreate ? { ...item, createdAt: now, updatedAt: now } : item;

    try {
      await this.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: record,
          ConditionExpression: `attribute_not_exists(${this.keyField})`,
        }),
      );
      return record;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(
          `${this.entityName} with ${this.keyField} ${(item as Record<string, unknown>)[this.keyField]} already exists`,
        );
      }
      console.error(`Error creating ${this.entityName.toLowerCase()}:`, error);
      throw new Error(`Failed to create ${this.entityName.toLowerCase()}: ${err.message}`);
    }
  }

  /**
   * Get an entity by its primary key.
   * @param id Primary key value
   * @returns Entity if found, null otherwise
   * @throws Error if retrieval fails
   */
  async getById(id: string): Promise<T | null> {
    try {
      const response = await this.dynamoClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { [this.keyField]: id },
        }),
      );

      if (!response.Item) {
        return null;
      }

      return response.Item as T;
    } catch (error) {
      const err = error as Error;
      console.error(`Error getting ${this.entityName.toLowerCase()} by ${this.keyField}:`, error);
      throw new Error(`Failed to get ${this.entityName.toLowerCase()}: ${err.message}`);
    }
  }

  /**
   * Update an entity by ID using a dynamic expression builder.
   * Automatically skips the key field and createdAt, and always updates updatedAt.
   * @param id Primary key value
   * @param updates Partial entity data to update
   * @returns Updated entity
   * @throws Error if update fails or entity not found
   */
  async update(id: string, updates: Partial<T>): Promise<T> {
    const now = new Date().toISOString();
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    // Build update expression dynamically
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== this.keyField && key !== 'createdAt') {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    // Only update the updatedAt timestamp if timestamps are enabled
    if (this.setTimestampsOnCreate) {
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = now;
    }

    if (updateExpressions.length === 0) {
      // Nothing meaningful to update
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`${this.entityName} with ${this.keyField} ${id} not found`);
      }
      return existing;
    }

    if (updateExpressions.length === 1 && this.setTimestampsOnCreate) {
      // Only updatedAt, nothing meaningful to update
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`${this.entityName} with ${this.keyField} ${id} not found`);
      }
      return { ...existing, updatedAt: now };
    }

    try {
      const response = await this.dynamoClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { [this.keyField]: id },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: `attribute_exists(${this.keyField})`,
          ReturnValues: 'ALL_NEW',
        }),
      );

      return response.Attributes as T;
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(`${this.entityName} with ${this.keyField} ${id} not found`);
      }
      console.error(`Error updating ${this.entityName.toLowerCase()}:`, error);
      throw new Error(`Failed to update ${this.entityName.toLowerCase()}: ${err.message}`);
    }
  }

  /**
   * Delete an entity by its primary key.
   * @param id Primary key value
   * @throws Error if deletion fails
   */
  async delete(id: string): Promise<void> {
    try {
      await this.dynamoClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { [this.keyField]: id },
        }),
      );
    } catch (error) {
      const err = error as Error;
      console.error(`Error deleting ${this.entityName.toLowerCase()}:`, error);
      throw new Error(`Failed to delete ${this.entityName.toLowerCase()}: ${err.message}`);
    }
  }
}
