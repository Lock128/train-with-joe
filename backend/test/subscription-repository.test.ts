import { describe, test, expect, beforeEach } from 'vitest';
import { SubscriptionRepository } from '../src/repositories/subscription-repository';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Subscription } from '../src/model/domain/Subscription';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('SubscriptionRepository', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('create', () => {
    test('should create a new subscription successfully', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionData: Subscription = {
        id: 'sub-123',
        userId: 'user-123',
        provider: 'STRIPE' as any,
        status: 'ACTIVE' as any,
        planId: 'plan-monthly',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create(subscriptionData);

      expect(result).toBeDefined();
      expect(result.id).toBe(subscriptionData.id);
      expect(result.userId).toBe(subscriptionData.userId);
      expect(result.provider).toBe(subscriptionData.provider);
      expect(result.status).toBe(subscriptionData.status);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    test('should throw error when subscription already exists', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionData: Subscription = {
        id: 'sub-123',
        userId: 'user-123',
        provider: 'STRIPE' as any,
        status: 'ACTIVE' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).rejects({
        name: 'ConditionalCheckFailedException',
        message: 'Item already exists',
      });

      await expect(repository.create(subscriptionData)).rejects.toThrow('already exists');
    });
  });

  describe('getById', () => {
    test('should retrieve subscription by id', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionId = 'sub-123';
      const mockSubscription: Subscription = {
        id: subscriptionId,
        userId: 'user-123',
        provider: 'STRIPE' as any,
        status: 'ACTIVE' as any,
        planId: 'plan-monthly',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).resolves({
        Item: mockSubscription,
      });

      const result = await repository.getById(subscriptionId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(subscriptionId);
      expect(result?.userId).toBe(mockSubscription.userId);
      expect(result?.provider).toBe(mockSubscription.provider);
      expect(result?.status).toBe(mockSubscription.status);
    });

    test('should return null when subscription not found', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionId = 'non-existent';

      ddbMock.on(GetCommand).resolves({});

      const result = await repository.getById(subscriptionId);

      expect(result).toBeNull();
    });

    test('should throw error on DynamoDB failure', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionId = 'sub-123';

      ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

      await expect(repository.getById(subscriptionId)).rejects.toThrow('Failed to get subscription');
    });
  });

  describe('getByUserId', () => {
    test('should retrieve subscription by userId using GSI', async () => {
      const repository = SubscriptionRepository.getInstance();
      const userId = 'user-123';
      const mockSubscription: Subscription = {
        id: 'sub-123',
        userId: userId,
        provider: 'STRIPE' as any,
        status: 'ACTIVE' as any,
        planId: 'plan-monthly',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(QueryCommand).resolves({
        Items: [mockSubscription],
      });

      const result = await repository.getByUserId(userId);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
      expect(result?.id).toBe(mockSubscription.id);
    });

    test('should return null when no subscription found for userId', async () => {
      const repository = SubscriptionRepository.getInstance();
      const userId = 'user-without-subscription';

      ddbMock.on(QueryCommand).resolves({
        Items: [],
      });

      const result = await repository.getByUserId(userId);

      expect(result).toBeNull();
    });

    test('should throw error on DynamoDB failure', async () => {
      const repository = SubscriptionRepository.getInstance();
      const userId = 'user-123';

      ddbMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

      await expect(repository.getByUserId(userId)).rejects.toThrow('Failed to get subscription by userId');
    });
  });

  describe('update', () => {
    test('should update subscription successfully', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionId = 'sub-123';
      const updates = { status: 'CANCELLED' as any };
      const updatedSubscription: Subscription = {
        id: subscriptionId,
        userId: 'user-123',
        provider: 'STRIPE' as any,
        status: 'CANCELLED' as any,
        planId: 'plan-monthly',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(UpdateCommand).resolves({
        Attributes: updatedSubscription,
      });

      const result = await repository.update(subscriptionId, updates);

      expect(result).toBeDefined();
      expect(result.id).toBe(subscriptionId);
      expect(result.status).toBe(updates.status);
      expect(result.updatedAt).toBeDefined();
    });

    test('should throw error when subscription not found', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionId = 'non-existent';
      const updates = { status: 'CANCELLED' as any };

      ddbMock.on(UpdateCommand).rejects({
        name: 'ConditionalCheckFailedException',
        message: 'Item does not exist',
      });

      await expect(repository.update(subscriptionId, updates)).rejects.toThrow('not found');
    });

    test('should handle empty updates gracefully', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionId = 'sub-123';
      const existingSubscription: Subscription = {
        id: subscriptionId,
        userId: 'user-123',
        provider: 'STRIPE' as any,
        status: 'ACTIVE' as any,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).resolves({
        Item: existingSubscription,
      });

      const result = await repository.update(subscriptionId, {});

      expect(result).toBeDefined();
      expect(result.id).toBe(subscriptionId);
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('delete', () => {
    test('should delete subscription successfully', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionId = 'sub-123';

      ddbMock.on(DeleteCommand).resolves({});

      await expect(repository.delete(subscriptionId)).resolves.not.toThrow();
    });

    test('should throw error on DynamoDB failure', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionId = 'sub-123';

      ddbMock.on(DeleteCommand).rejects(new Error('DynamoDB error'));

      await expect(repository.delete(subscriptionId)).rejects.toThrow('Failed to delete subscription');
    });
  });

  describe('edge cases', () => {
    test('should handle subscription with minimal fields', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionData: Subscription = {
        id: 'sub-123',
        userId: 'user-123',
        provider: 'STRIPE' as any,
        status: 'ACTIVE' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create(subscriptionData);

      expect(result).toBeDefined();
      expect(result.id).toBe(subscriptionData.id);
      expect(result.planId).toBeUndefined();
      expect(result.externalId).toBeUndefined();
    });

    test('should handle subscription with all optional fields', async () => {
      const repository = SubscriptionRepository.getInstance();
      const subscriptionData: Subscription = {
        id: 'sub-123',
        userId: 'user-123',
        provider: 'APPLE_APP_STORE' as any,
        status: 'ACTIVE' as any,
        planId: 'plan-monthly',
        externalId: 'ext-123',
        currentPeriodEnd: '2024-12-31T23:59:59.000Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create(subscriptionData);

      expect(result).toBeDefined();
      expect(result.planId).toBe(subscriptionData.planId);
      expect(result.externalId).toBe(subscriptionData.externalId);
      expect(result.currentPeriodEnd).toBe(subscriptionData.currentPeriodEnd);
    });

    test('should handle different payment providers', async () => {
      const repository = SubscriptionRepository.getInstance();
      const providers = ['STRIPE', 'APPLE_APP_STORE', 'GOOGLE_PLAY_STORE'];

      for (const provider of providers) {
        const subscriptionData: Subscription = {
          id: `sub-${provider}`,
          userId: 'user-123',
          provider: provider as any,
          status: 'ACTIVE' as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        ddbMock.on(PutCommand).resolves({});

        const result = await repository.create(subscriptionData);

        expect(result).toBeDefined();
        expect(result.provider).toBe(provider);
      }
    });

    test('should handle different subscription statuses', async () => {
      const repository = SubscriptionRepository.getInstance();
      const statuses = ['ACTIVE', 'INACTIVE', 'CANCELLED', 'PAST_DUE'];

      for (const status of statuses) {
        const subscriptionData: Subscription = {
          id: `sub-${status}`,
          userId: 'user-123',
          provider: 'STRIPE' as any,
          status: status as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        ddbMock.on(PutCommand).resolves({});

        const result = await repository.create(subscriptionData);

        expect(result).toBeDefined();
        expect(result.status).toBe(status);
      }
    });
  });
});
