import { describe, test, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { handler as getTrainingStatisticsHandler } from '../src/gql-lambda-functions/Query.getTrainingStatistics';
import { handler as getTrainingOverviewStatisticsHandler } from '../src/gql-lambda-functions/Query.getTrainingOverviewStatistics';
import { handler as getTrainingDayStatisticsHandler } from '../src/gql-lambda-functions/Query.getTrainingDayStatistics';
import { handler as adminSetUserTierHandler } from '../src/gql-lambda-functions/Mutation.adminSetUserTier';
import { handler as getTierStatisticsHandler } from '../src/gql-lambda-functions/Query.getTierStatistics';

const ddbMock = mockClient(DynamoDBDocumentClient);

const TRAININGS_TABLE = 'train-with-joe-trainings-sandbox';

const ADMIN_EMAIL = 'johannes.koch@gmail.com';
const NON_ADMIN_EMAIL = 'regular-user@example.com';

describe('Admin Authorization', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('Query.getTrainingStatistics', () => {
    test('should return authentication error when no identity.sub', async () => {
      const result = await getTrainingStatisticsHandler({
        arguments: { trainingId: 'training-1' },
        identity: { sub: '' },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    test('should deny non-admin user from viewing other user statistics', async () => {
      const callerId = 'caller-123';

      const result = await getTrainingStatisticsHandler({
        arguments: { trainingId: 'training-1', userId: 'other-user-456' },
        identity: { sub: callerId, claims: { email: NON_ADMIN_EMAIL } },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should deny when caller has no email claim', async () => {
      const callerId = 'non-existent-user';

      // DB fallback lookup should return no user
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const result = await getTrainingStatisticsHandler({
        arguments: { trainingId: 'training-1', userId: 'other-user-456' },
        identity: { sub: callerId, claims: {} },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should allow admin user to view other user statistics', async () => {
      const callerId = 'admin-123';
      const targetUserId = 'target-456';

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === TRAININGS_TABLE) {
          return {};
        }
        return {};
      });

      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await getTrainingStatisticsHandler({
        arguments: { trainingId: 'training-1', userId: targetUserId },
        identity: { sub: callerId, claims: { email: ADMIN_EMAIL } },
      } as any);

      // Should not return the authorization error
      expect(result.error).not.toBe("Not authorized to view other users' statistics");
    });
  });

  describe('Query.getTrainingOverviewStatistics', () => {
    test('should return authentication error when no identity.sub', async () => {
      const result = await getTrainingOverviewStatisticsHandler({
        arguments: { fromDate: '2024-01-01', toDate: '2024-01-31' },
        identity: { sub: '' },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    test('should deny non-admin user from viewing other user statistics', async () => {
      const callerId = 'caller-123';

      const result = await getTrainingOverviewStatisticsHandler({
        arguments: { fromDate: '2024-01-01', toDate: '2024-01-31', userId: 'other-user-456' },
        identity: { sub: callerId, claims: { email: NON_ADMIN_EMAIL } },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should deny when caller has no email claim', async () => {
      const callerId = 'non-existent-user';

      // DB fallback lookup should return no user
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const result = await getTrainingOverviewStatisticsHandler({
        arguments: { fromDate: '2024-01-01', toDate: '2024-01-31', userId: 'other-user-456' },
        identity: { sub: callerId, claims: {} },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should allow admin user to view other user statistics', async () => {
      const callerId = 'admin-123';
      const targetUserId = 'target-456';

      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await getTrainingOverviewStatisticsHandler({
        arguments: { fromDate: '2024-01-01', toDate: '2024-01-31', userId: targetUserId },
        identity: { sub: callerId, claims: { email: ADMIN_EMAIL } },
      } as any);

      expect(result.error).not.toBe("Not authorized to view other users' statistics");
    });
  });

  describe('Query.getTrainingDayStatistics', () => {
    test('should return authentication error when no identity.sub', async () => {
      const result = await getTrainingDayStatisticsHandler({
        arguments: { date: '2024-01-15' },
        identity: { sub: '' },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    test('should deny non-admin user from viewing other user statistics', async () => {
      const callerId = 'caller-123';

      const result = await getTrainingDayStatisticsHandler({
        arguments: { date: '2024-01-15', userId: 'other-user-456' },
        identity: { sub: callerId, claims: { email: NON_ADMIN_EMAIL } },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should deny when caller has no email claim', async () => {
      const callerId = 'non-existent-user';

      // DB fallback lookup should return no user
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const result = await getTrainingDayStatisticsHandler({
        arguments: { date: '2024-01-15', userId: 'other-user-456' },
        identity: { sub: callerId, claims: {} },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should allow admin user to view other user statistics', async () => {
      const callerId = 'admin-123';
      const targetUserId = 'target-456';

      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await getTrainingDayStatisticsHandler({
        arguments: { date: '2024-01-15', userId: targetUserId },
        identity: { sub: callerId, claims: { email: ADMIN_EMAIL } },
      } as any);

      expect(result.error).not.toBe("Not authorized to view other users' statistics");
    });
  });

  describe('Mutation.adminSetUserTier', () => {
    test('should return authentication error when no identity.sub', async () => {
      const result = await adminSetUserTierHandler({
        arguments: { input: { userId: 'user-1', tier: 'PRO' } },
        identity: { sub: '' },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    test('should deny non-admin user', async () => {
      const result = await adminSetUserTierHandler({
        arguments: { input: { userId: 'user-1', tier: 'PRO' } },
        identity: { sub: 'caller-123', claims: { email: NON_ADMIN_EMAIL } },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authorized');
    });

    test('should deny when caller has no email claim', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const result = await adminSetUserTierHandler({
        arguments: { input: { userId: 'user-1', tier: 'PRO' } },
        identity: { sub: 'caller-123', claims: {} },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authorized');
    });
  });

  describe('Query.getTierStatistics', () => {
    test('should return authentication error when no identity.sub', async () => {
      const result = await getTierStatisticsHandler({
        identity: { sub: '' },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    test('should deny non-admin user', async () => {
      const result = await getTierStatisticsHandler({
        identity: { sub: 'caller-123', claims: { email: NON_ADMIN_EMAIL } },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authorized');
    });

    test('should deny when caller has no email claim', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const result = await getTierStatisticsHandler({
        identity: { sub: 'caller-123', claims: {} },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authorized');
    });
  });
});
