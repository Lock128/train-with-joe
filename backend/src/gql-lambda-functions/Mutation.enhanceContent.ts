import { getAIService } from '../services/ai-service';

/**
 * Lambda resolver for Mutation.enhanceContent
 * Enhances content using Amazon Bedrock AI
 */

interface EnhanceContentInput {
  content: string;
}

interface Event {
  arguments: {
    input: EnhanceContentInput;
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { input } = event.arguments;

  if (!userId) {
    return {
      success: false,
      content: null,
      error: 'Authentication required',
    };
  }

  if (!input || !input.content) {
    return {
      success: false,
      content: null,
      error: 'Content is required',
    };
  }

  try {
    const aiService = getAIService();
    const enhancedContent = await aiService.enhanceContent(input.content, userId);

    return {
      success: true,
      content: enhancedContent,
      error: null,
    };
  } catch (error) {
    console.error('Error enhancing content:', error);
    return {
      success: false,
      content: null,
      error: error instanceof Error ? error.message : 'Failed to enhance content',
    };
  }
};
