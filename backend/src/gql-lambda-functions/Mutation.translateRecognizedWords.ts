import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';

/**
 * Lambda resolver for Mutation.translateRecognizedWords
 * Validates the vocabulary list is in RECOGNIZED status and belongs to the authenticated user,
 * then sets status to TRANSLATING and async-invokes the processing Lambda for Phase 2 (translation).
 */

interface TranslateRecognizedWordsInput {
  vocabularyListId: string;
  targetLanguage: string;
}

interface Event {
  arguments: {
    input: TranslateRecognizedWordsInput;
  };
  identity: {
    sub: string;
  };
}

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });
const PROCESSOR_FUNCTION_NAME = process.env.PROCESS_IMAGE_VOCABULARY_FUNCTION_NAME!;

export const handler = async (event: Event) => {
  console.log(
    '[translateRecognizedWords] Invoked',
    JSON.stringify({
      userId: event.identity?.sub,
      vocabularyListId: event.arguments?.input?.vocabularyListId,
      targetLanguage: event.arguments?.input?.targetLanguage,
    }),
  );

  const userId = event.identity?.sub;
  const { input } = event.arguments;

  if (!userId) {
    console.warn('[translateRecognizedWords] No userId — returning auth error');
    return { success: false, vocabularyList: null, error: 'Authentication required' };
  }

  try {
    const repository = VocabularyListRepository.getInstance();

    // Fetch the vocabulary list and validate ownership
    const vocabularyList = await repository.getById(input.vocabularyListId);

    if (!vocabularyList || vocabularyList.userId !== userId) {
      console.warn('[translateRecognizedWords] List not found or not owned by user', {
        vocabularyListId: input.vocabularyListId,
        userId,
      });
      return { success: false, vocabularyList: null, error: 'Vocabulary list not found' };
    }

    // Validate status is RECOGNIZED
    if (vocabularyList.status !== 'RECOGNIZED') {
      console.warn('[translateRecognizedWords] Invalid status for translation', {
        vocabularyListId: input.vocabularyListId,
        currentStatus: vocabularyList.status,
      });
      return { success: false, vocabularyList: null, error: 'Vocabulary list is not ready for translation' };
    }

    // Set status to TRANSLATING
    const updatedList = await repository.update(input.vocabularyListId, {
      status: 'TRANSLATING',
      targetLanguage: input.targetLanguage,
    });

    console.log('[translateRecognizedWords] Status set to TRANSLATING', {
      vocabularyListId: input.vocabularyListId,
    });

    // Fire-and-forget: invoke the processing Lambda asynchronously for Phase 2
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: PROCESSOR_FUNCTION_NAME,
        InvocationType: 'Event',
        Payload: JSON.stringify({
          vocabularyListId: input.vocabularyListId,
          userId,
          imageS3Keys: vocabularyList.sourceImageKeys || [],
          sourceLanguage: vocabularyList.sourceLanguage,
          targetLanguage: input.targetLanguage,
          phase: 'translate',
        }),
      }),
    );

    console.log('[translateRecognizedWords] Async processor invoked for Phase 2', {
      vocabularyListId: input.vocabularyListId,
      processorFunction: PROCESSOR_FUNCTION_NAME,
    });

    return {
      success: true,
      vocabularyList: { ...updatedList, isPublic: updatedList.isPublic === 'true' },
      error: null,
    };
  } catch (error) {
    console.error('[translateRecognizedWords] Error:', error);
    return {
      success: false,
      vocabularyList: null,
      error: error instanceof Error ? error.message : 'Failed to start translation',
    };
  }
};
