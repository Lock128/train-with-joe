import { TrainingService } from '../services/training-service';

/**
 * Lambda resolver for Mutation.submitAnswer
 * Submits an answer for a training execution
 */

interface Event {
  arguments: {
    input: {
      executionId: string;
      wordIndex: number;
      answer: string;
    };
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { executionId, wordIndex, answer } = event.arguments.input;

  if (!userId) {
    return {
      success: false,
      result: null,
      completed: false,
      execution: null,
      error: 'Authentication required',
    };
  }

  try {
    const service = TrainingService.getInstance();
    return await service.submitAnswer(executionId, userId, wordIndex, answer);
  } catch (error) {
    console.error('Error submitting answer:', error);
    return {
      success: false,
      result: null,
      completed: false,
      execution: null,
      error: error instanceof Error ? error.message : 'Failed to submit answer',
    };
  }
};
