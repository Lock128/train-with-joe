import { TrainingService } from '../services/training-service';
import type { TrainingMode, TrainingDirection } from '../model/domain/Training';
import { PricingService, UpgradeRequiredError } from '../services/pricing-service';

/**
 * Lambda resolver for Mutation.createTraining
 * Creates a new training from vocabulary lists
 */

interface Event {
  arguments: {
    input: {
      vocabularyListIds: string[];
      mode: TrainingMode;
      direction?: TrainingDirection;
      name?: string;
      wordCount?: number;
      units?: string[];
      isRandomized?: boolean;
      randomizedWordCount?: number;
      multipleChoiceOptionCount?: number;
      sourceLanguage?: string;
      targetLanguage?: string;
    };
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const {
    vocabularyListIds,
    mode,
    name,
    wordCount,
    direction,
    units,
    isRandomized,
    randomizedWordCount,
    multipleChoiceOptionCount,
    sourceLanguage,
    targetLanguage,
  } = event.arguments.input;

  if (!userId) {
    return {
      success: false,
      training: null,
      error: 'Authentication required',
    };
  }

  try {
    // Check AI training access when mode is AI_TRAINING
    if (mode === 'AI_TRAINING') {
      const pricingService = PricingService.getInstance();
      await pricingService.checkAiTrainingAccess(userId);
    }

    const service = TrainingService.getInstance();
    return await service.createTraining(
      userId,
      vocabularyListIds,
      mode,
      name,
      wordCount,
      direction,
      units,
      isRandomized,
      randomizedWordCount,
      multipleChoiceOptionCount,
      sourceLanguage,
      targetLanguage,
    );
  } catch (error) {
    if (error instanceof UpgradeRequiredError) {
      return {
        success: false,
        training: null,
        error: error.message,
        errorCode: 'UPGRADE_REQUIRED',
      };
    }
    console.error('Error creating training:', error);
    return {
      success: false,
      training: null,
      error: error instanceof Error ? error.message : 'Failed to create training',
    };
  }
};
