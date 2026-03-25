import { describe, test, expect, beforeEach } from 'vitest';
import { UserRepository } from '../src/repositories/user-repository';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { User } from '../src/model/domain/User';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('UserRepository', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('create', () => {
    test('should create a new user successfully', async () => {
      const repository = UserRepository.getInstance();
      const userData: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create(userData);

      expect(result).toBeDefined();
      expect(result.id).toBe(userData.id);
      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    test('should throw error when user already exists', async () => {
      const repository = UserRepository.getInstance();
      const userData: User = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).rejects({
        name: 'ConditionalCheckFailedException',
        message: 'Item already exists',
      });

      await expect(repository.create(userData)).rejects.toThrow('already exists');
    });
  });

  describe('getById', () => {
    test('should retrieve user by id', async () => {
      const repository = UserRepository.getInstance();
      const userId = 'user-123';
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).resolves({
        Item: mockUser,
      });

      const result = await repository.getById(userId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(userId);
      expect(result?.email).toBe(mockUser.email);
      expect(result?.name).toBe(mockUser.name);
    });

    test('should return null when user not found', async () => {
      const repository = UserRepository.getInstance();
      const userId = 'non-existent';

      ddbMock.on(GetCommand).resolves({});

      const result = await repository.getById(userId);

      expect(result).toBeNull();
    });

    test('should throw error on DynamoDB failure', async () => {
      const repository = UserRepository.getInstance();
      const userId = 'user-123';

      ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

      await expect(repository.getById(userId)).rejects.toThrow('Failed to get user');
    });
  });

  describe('update', () => {
    test('should update user successfully', async () => {
      const repository = UserRepository.getInstance();
      const userId = 'user-123';
      const updates = { name: 'Updated Name' };
      const updatedUser: User = {
        id: userId,
        email: 'test@example.com',
        name: 'Updated Name',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(UpdateCommand).resolves({
        Attributes: updatedUser,
      });

      const result = await repository.update(userId, updates);

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
      expect(result.name).toBe(updates.name);
      expect(result.updatedAt).toBeDefined();
    });

    test('should throw error when user not found', async () => {
      const repository = UserRepository.getInstance();
      const userId = 'non-existent';
      const updates = { name: 'Updated Name' };

      ddbMock.on(UpdateCommand).rejects({
        name: 'ConditionalCheckFailedException',
        message: 'Item does not exist',
      });

      await expect(repository.update(userId, updates)).rejects.toThrow('not found');
    });

    test('should handle empty updates gracefully', async () => {
      const repository = UserRepository.getInstance();
      const userId = 'user-123';
      const existingUser: User = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).resolves({
        Item: existingUser,
      });

      const result = await repository.update(userId, {});

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('delete', () => {
    test('should delete user successfully', async () => {
      const repository = UserRepository.getInstance();
      const userId = 'user-123';

      ddbMock.on(DeleteCommand).resolves({});

      await expect(repository.delete(userId)).resolves.not.toThrow();
    });

    test('should throw error on DynamoDB failure', async () => {
      const repository = UserRepository.getInstance();
      const userId = 'user-123';

      ddbMock.on(DeleteCommand).rejects(new Error('DynamoDB error'));

      await expect(repository.delete(userId)).rejects.toThrow('Failed to delete user');
    });
  });

  describe('edge cases', () => {
    test('should handle user with minimal fields', async () => {
      const repository = UserRepository.getInstance();
      const userData: User = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create(userData);

      expect(result).toBeDefined();
      expect(result.id).toBe(userData.id);
      expect(result.email).toBe(userData.email);
      expect(result.name).toBeUndefined();
    });

    test('should handle user with subscription fields', async () => {
      const repository = UserRepository.getInstance();
      const userData: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionStatus: 'ACTIVE' as any,
        subscriptionProvider: 'STRIPE' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create(userData);

      expect(result).toBeDefined();
      expect(result.subscriptionStatus).toBe('ACTIVE');
      expect(result.subscriptionProvider).toBe('STRIPE');
    });
  });
});
