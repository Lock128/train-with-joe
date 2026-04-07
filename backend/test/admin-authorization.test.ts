import { describe, test, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { handler as getTrainingStatisticsHandler } from '../src/gql-lambda-functions/Query.getTrainingStatistics';
import { handler as getTrainingOverviewStatisticsHandler } from '../src/gql-lambda-functions/Query.getTrainingOverviewStatistics';
import { handler as getTrainingDayStatisticsHandler } from '../src/gql-lambda-functions/Query.getTrainingDayStatistics';

const ddbMock = mockClient(DynamoDBDocumentClient);

const USERS_TABLE = 'train-with-joe-users-sandbox';
const TRAININGS_TABLE = 'train-with-joe-trainings-sandbox';

const ADMIN_EMAIL = 'johannes.koch@gmail.com';
const NON_ADMIN_EMAIL = 'regular-user@example.com';

const makeUser = (id: string, email: string) => ({
  id,
  email,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

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

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === USERS_TABLE) {
          return { Item: makeUser(callerId, NON_ADMIN_EMAIL) };
        }
        return {};
      });

      const result = await getTrainingStatisticsHandler({
        arguments: { trainingId: 'training-1', userId: 'other-user-456' },
        identity: { sub: callerId },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should deny when caller user not found in DynamoDB', async () => {
      const callerId = 'non-existent-user';

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === USERS_TABLE) {
          return {};
        }
        return {};
      });

      const result = await getTrainingStatisticsHandler({
        arguments: { trainingId: 'training-1', userId: 'other-user-456' },
        identity: { sub: callerId },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should allow admin user to view other user statistics', async () => {
      const callerId = 'admin-123';
      const targetUserId = 'target-456';

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === USERS_TABLE) {
          return { Item: makeUser(callerId, ADMIN_EMAIL) };
        }
        if (input.TableName === TRAININGS_TABLE) {
          return {};
        }
        return {};
      });

      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await getTrainingStatisticsHandler({
        arguments: { trainingId: 'training-1', userId: targetUserId },
        identity: { sub: callerId },
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

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === USERS_TABLE) {
          return { Item: makeUser(callerId, NON_ADMIN_EMAIL) };
        }
        return {};
      });

      const result = await getTrainingOverviewStatisticsHandler({
        arguments: { fromDate: '2024-01-01', toDate: '2024-01-31', userId: 'other-user-456' },
        identity: { sub: callerId },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should deny when caller user not found in DynamoDB', async () => {
      const callerId = 'non-existent-user';

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === USERS_TABLE) {
          return {};
        }
        return {};
      });

      const result = await getTrainingOverviewStatisticsHandler({
        arguments: { fromDate: '2024-01-01', toDate: '2024-01-31', userId: 'other-user-456' },
        identity: { sub: callerId },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should allow admin user to view other user statistics', async () => {
      const callerId = 'admin-123';
      const targetUserId = 'target-456';

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === USERS_TABLE) {
          return { Item: makeUser(callerId, ADMIN_EMAIL) };
        }
        return {};
      });

      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await getTrainingOverviewStatisticsHandler({
        arguments: { fromDate: '2024-01-01', toDate: '2024-01-31', userId: targetUserId },
        identity: { sub: callerId },
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

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === USERS_TABLE) {
          return { Item: makeUser(callerId, NON_ADMIN_EMAIL) };
        }
        return {};
      });

      const result = await getTrainingDayStatisticsHandler({
        arguments: { date: '2024-01-15', userId: 'other-user-456' },
        identity: { sub: callerId },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should deny when caller user not found in DynamoDB', async () => {
      const callerId = 'non-existent-user';

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === USERS_TABLE) {
          return {};
        }
        return {};
      });

      const result = await getTrainingDayStatisticsHandler({
        arguments: { date: '2024-01-15', userId: 'other-user-456' },
        identity: { sub: callerId },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized to view other users' statistics");
    });

    test('should allow admin user to view other user statistics', async () => {
      const callerId = 'admin-123';
      const targetUserId = 'target-456';

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === USERS_TABLE) {
          return { Item: makeUser(callerId, ADMIN_EMAIL) };
        }
        return {};
      });

      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await getTrainingDayStatisticsHandler({
        arguments: { date: '2024-01-15', userId: targetUserId },
        identity: { sub: callerId },
      } as any);

      expect(result.error).not.toBe("Not authorized to view other users' statistics");
    });
  });
});
