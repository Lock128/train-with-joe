import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';

/**
 * Lambda resolver for Mutation.analyzeImageVocabulary
 * Creates a PENDING vocabulary list record and asynchronously invokes the
 * processing Lambda to do the actual Bedrock analysis (avoids AppSync 30s timeout).
 */

interface AnalyzeImageVocabularyInput {
  imageS3Keys: string[];
  sourceLanguage?: string;
  targetLanguage?: string;
}

interface Event {
  arguments: {
    input: AnalyzeImageVocabularyInput;
  };
  identity: {
    sub: string;
  };
}

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });
const PROCESSOR_FUNCTION_NAME = process.env.PROCESS_IMAGE_VOCABULARY_FUNCTION_NAME!;

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { input } = event.arguments;

  if (!userId) {
    return { success: false, vocabularyList: null, error: 'Authentication required' };
  }

  if (!input?.imageS3Keys?.length) {
    return { success: false, vocabularyList: null, error: 'At least one image S3 key is required' };
  }

  for (const key of input.imageS3Keys) {
    if (!key.startsWith(`uploads/${userId}/`)) {
      return { success: false, vocabularyList: null, error: 'Invalid image key' };
    }
  }

  try {
    const repository = VocabularyListRepository.getInstance();

    // Create a PENDING record immediately — returned to the client right away
    const vocabularyListId = crypto.randomUUID();
    const now = new Date().toISOString();
    const pendingList = await repository.create({
      id: vocabularyListId,
      userId,
      title: 'Analyzing...',
      words: [],
      sourceImageKey: input.imageS3Keys[0],
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      status: 'PENDING',
      isPublic: 'false',
      createdAt: now,
      updatedAt: now,
    });

    // Fire-and-forget: invoke the processing Lambda asynchronously
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: PROCESSOR_FUNCTION_NAME,
        InvocationType: 'Event', // async, no waiting for response
        Payload: JSON.stringify({
          vocabularyListId,
          userId,
          imageS3Keys: input.imageS3Keys,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
        }),
      }),
    );

    return {
      success: true,
      vocabularyList: { ...pendingList, isPublic: pendingList.isPublic === 'true' },
      error: null,
    };
  } catch (error) {
    console.error('Error initiating image vocabulary analysis:', error);
    return {
      success: false,
      vocabularyList: null,
      error: error instanceof Error ? error.message : 'Failed to start image analysis',
    };
  }
};
