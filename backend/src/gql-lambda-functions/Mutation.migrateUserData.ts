import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';
import { TrainingRepository } from '../repositories/training-repository';
import { UserRepository } from '../repositories/user-repository';

const ADMIN_EMAILS = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info', 'lockhead@lockhead.info'];

/**
 * Lambda resolver for Mutation.migrateUserData
 * Migrates all vocabulary lists, trainings, and training executions from one userId to another.
 * Admin only.
 */

interface Event {
  arguments: {
    input: {
      sourceUserId: string;
      targetUserId: string;
    };
  };
  identity: {
    sub: string;
    username?: string;
    claims: Record<string, string>;
  };
}

interface MigrateUserDataResponse {
  success: boolean;
  migratedVocabularyLists: number;
  migratedTrainings: number;
  migratedExecutions: number;
  error: string | null;
}

export const handler = async (event: Event): Promise<MigrateUserDataResponse> => {
  const callerUserId = event.identity?.sub;

  if (!callerUserId) {
    return {
      success: false,
      migratedVocabularyLists: 0,
      migratedTrainings: 0,
      migratedExecutions: 0,
      error: 'Authentication required',
    };
  }

  // Access tokens don't carry an email claim, so also check the username claim
  // (which Cognito sets to the email when email is used as the sign-in alias).
  const claims = event.identity?.claims ?? {};
  let callerEmail: string | undefined =
    claims.email ?? claims['cognito:email'] ?? claims['custom:email'] ?? claims.username ?? event.identity?.username;
  console.log('[AdminAuth] migrateUserData — callerUserId:', callerUserId, 'jwtEmail:', callerEmail);
  if (!callerEmail) {
    console.log('[AdminAuth] JWT email claim missing, falling back to DB lookup');
    const userRepo = UserRepository.getInstance();
    const callerUser = await userRepo.getById(callerUserId);
    callerEmail = callerUser?.email;
    console.log('[AdminAuth] DB email lookup result:', callerEmail);
  }
  const isAdmin = callerEmail != null && ADMIN_EMAILS.includes(callerEmail);
  console.log('[AdminAuth] email:', callerEmail, 'isAdmin:', isAdmin);
  if (!callerEmail || !isAdmin) {
    console.warn('[AdminAuth] DENIED — migrateUserData');
    return {
      success: false,
      migratedVocabularyLists: 0,
      migratedTrainings: 0,
      migratedExecutions: 0,
      error: 'Not authorized',
    };
  }
  console.log('[AdminAuth] GRANTED — migrating user data');

  const { sourceUserId, targetUserId } = event.arguments.input;

  if (!sourceUserId || !targetUserId) {
    return {
      success: false,
      migratedVocabularyLists: 0,
      migratedTrainings: 0,
      migratedExecutions: 0,
      error: 'sourceUserId and targetUserId are required',
    };
  }

  if (sourceUserId === targetUserId) {
    return {
      success: false,
      migratedVocabularyLists: 0,
      migratedTrainings: 0,
      migratedExecutions: 0,
      error: 'sourceUserId and targetUserId must be different',
    };
  }

  const vocabRepo = VocabularyListRepository.getInstance();
  const trainingRepo = TrainingRepository.getInstance();

  let migratedVocabularyLists = 0;
  let migratedTrainings = 0;
  let migratedExecutions = 0;

  try {
    // Migrate vocabulary lists
    const vocabLists = await vocabRepo.getAllByUserId(sourceUserId);
    for (const list of vocabLists) {
      await vocabRepo.update(list.id, { userId: targetUserId });
      migratedVocabularyLists++;
    }

    // Migrate trainings
    const trainings = await trainingRepo.getAllByUserId(sourceUserId);
    for (const training of trainings) {
      await trainingRepo.update(training.id, { userId: targetUserId });
      migratedTrainings++;

      // Migrate all executions for this training
      const executions = await trainingRepo.getExecutionsByTrainingId(training.id);
      for (const execution of executions) {
        if (execution.userId === sourceUserId) {
          await trainingRepo.updateExecution(execution.id, { userId: targetUserId });
          migratedExecutions++;
        }
      }
    }

    console.log(
      `Migration complete: ${migratedVocabularyLists} lists, ${migratedTrainings} trainings, ${migratedExecutions} executions migrated from ${sourceUserId} to ${targetUserId}`,
    );

    return {
      success: true,
      migratedVocabularyLists,
      migratedTrainings,
      migratedExecutions,
      error: null,
    };
  } catch (error) {
    console.error('Error migrating user data:', error);
    return {
      success: false,
      migratedVocabularyLists,
      migratedTrainings,
      migratedExecutions,
      error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}. Partially migrated: ${migratedVocabularyLists} lists, ${migratedTrainings} trainings, ${migratedExecutions} executions.`,
    };
  }
};
