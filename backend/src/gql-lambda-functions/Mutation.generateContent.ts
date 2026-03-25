import { getAIService } from '../services/ai-service';

/**
 * Lambda resolver for Mutation.generateContent
 * Generates content from prompt using Amazon Bedrock AI
 */

interface GenerateContentInput {
  prompt: string;
}

interface Event {
  arguments: {
    input: GenerateContentInput;
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

  if (!input || !input.prompt) {
    return {
      success: false,
      content: null,
      error: 'Prompt is required',
    };
  }

  try {
    const aiService = getAIService();
    const generatedContent = await aiService.generateContent(input.prompt, userId);

    return {
      success: true,
      content: generatedContent,
      error: null,
    };
  } catch (error) {
    console.error('Error generating content:', error);
    return {
      success: false,
      content: null,
      error: error instanceof Error ? error.message : 'Failed to generate content',
    };
  }
};
