import { UserRepository } from '../repositories/user-repository';
import { SubscriptionRepository } from '../repositories/subscription-repository';
import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';
import { TrainingRepository } from '../repositories/training-repository';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cognitoClient = new CognitoIdentityProviderClient({});

const USAGE_COUNTERS_TABLE_NAME = process.env.USAGE_COUNTERS_TABLE_NAME || '';
const USER_POOL_ID = process.env.USER_POOL_ID || '';

/**
 * Lambda resolver for Mutation.deleteUser
 *
 * Permanently deletes the authenticated user's account and all associated data:
 * - User record (DynamoDB)
 * - Subscription records
 * - Vocabulary lists
 * - Trainings and executions
 * - Usage counters
 * - Cognito user pool entry
 *
 * Required by App Store Guideline 5.1.1(v).
 */

interface Event {
  identity: {
    sub: string;
    username: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const username = event.identity?.username;

  if (!userId) {
    return {
      success: false,
      user: null,
      error: 'Authentication required',
    };
  }

  try {
    const userRepository = UserRepository.getInstance();
    const subscriptionRepository = SubscriptionRepository.getInstance();
    const vocabularyListRepository = VocabularyListRepository.getInstance();
    const trainingRepository = TrainingRepository.getInstance();

    // Verify user exists
    const user = await userRepository.getById(userId);
    if (!user) {
      return {
        success: false,
        user: null,
        error: 'User not found',
      };
    }

    // Delete subscription if exists
    const subscription = await subscriptionRepository.getByUserId(userId);
    if (subscription) {
      await subscriptionRepository.delete(subscription.id);
    }

    // Delete all vocabulary lists
    const vocabularyLists = await vocabularyListRepository.getAllByUserId(userId);
    for (const list of vocabularyLists) {
      await vocabularyListRepository.delete(list.id);
    }

    // Delete all trainings
    const trainings = await trainingRepository.getAllByUserId(userId);
    for (const training of trainings) {
      await trainingRepository.delete(training.id);
    }

    // Delete usage counters
    if (USAGE_COUNTERS_TABLE_NAME) {
      try {
        await dynamoClient.send(
          new DeleteCommand({
            TableName: USAGE_COUNTERS_TABLE_NAME,
            Key: { userId },
          }),
        );
      } catch (e) {
        console.warn('Failed to delete usage counters (non-fatal):', e);
      }
    }

    // Delete user record from DynamoDB
    await userRepository.delete(userId);

    // Delete Cognito user
    if (USER_POOL_ID && username) {
      try {
        await cognitoClient.send(
          new AdminDeleteUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: username,
          }),
        );
      } catch (e) {
        console.warn('Failed to delete Cognito user (non-fatal):', e);
      }
    }

    return {
      success: true,
      user,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      user: null,
      error: error instanceof Error ? error.message : 'Failed to delete user account',
    };
  }
};
