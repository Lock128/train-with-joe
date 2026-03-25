import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

/**
 * Rate limiting tracker for AI service
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/**
 * AI service for content enhancement and generation using Amazon Bedrock
 * Implements rate limiting (10 requests per minute per user)
 */
export class AIService {
  private static instance: AIService;
  private bedrockClient: BedrockRuntimeClient;
  private modelId: string;
  private rateLimitMap: Map<string, RateLimitEntry>;
  private readonly RATE_LIMIT = 10; // requests per window
  private readonly RATE_WINDOW_MS = 60000; // 1 minute

  private constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.bedrockClient = new BedrockRuntimeClient({ region });
    this.modelId = process.env.BEDROCK_MODEL_ID || 'amazon.titan-text-express-v1';
    this.rateLimitMap = new Map();
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Check if user has exceeded rate limit
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(userId);

    if (!entry) {
      this.rateLimitMap.set(userId, { count: 1, windowStart: now });
      return true;
    }

    // Check if window has expired
    if (now - entry.windowStart >= this.RATE_WINDOW_MS) {
      this.rateLimitMap.set(userId, { count: 1, windowStart: now });
      return true;
    }

    // Check if limit exceeded
    if (entry.count >= this.RATE_LIMIT) {
      return false;
    }

    // Increment count
    entry.count++;
    return true;
  }

  /**
   * Log AI usage to CloudWatch
   */
  private logUsage(userId: string, operation: string, tokenCount: number): void {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        userId,
        operation,
        tokenCount,
        modelId: this.modelId,
      }),
    );
  }

  /**
   * Build request body based on model type
   */
  private buildRequestBody(prompt: string, maxTokens: number = 1000): Record<string, unknown> {
    const isClaudeOrNova =
      this.modelId.includes('nova') || this.modelId.includes('sonnet') || this.modelId.includes('claude');

    if (isClaudeOrNova) {
      return {
        messages: [
          {
            role: 'user',
            content: [{ text: prompt, type: 'text' }],
          },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        anthropic_version: 'bedrock-2023-05-31',
      };
    }

    // Titan format
    return {
      inputText: prompt,
      textGenerationConfig: {
        temperature: 0.7,
        maxTokenCount: maxTokens,
      },
    };
  }

  /**
   * Extract response text based on model type
   */
  private extractResponseText(responseBody: Record<string, unknown>): string {
    // Try Titan format first
    const titanResults = responseBody.results as Array<{ outputText?: string }> | undefined;
    if (titanResults?.[0]?.outputText) {
      return titanResults[0].outputText;
    }

    // Claude format
    if (this.modelId.includes('sonnet') || this.modelId.includes('claude')) {
      const claudeContent = responseBody.content as Array<{ text?: string }> | undefined;
      return claudeContent?.[0]?.text || '';
    }

    // Nova format
    if (this.modelId.includes('nova')) {
      const novaOutput = responseBody.output as { message?: { content?: Array<{ text?: string }> } } | undefined;
      return novaOutput?.message?.content?.[0]?.text || '';
    }

    // Fallback
    const fallbackResponse = responseBody as { completion?: string; text?: string };
    return fallbackResponse.completion || fallbackResponse.text || '';
  }

  /**
   * Enhance content using AI
   */
  async enhanceContent(content: string, userId: string): Promise<string> {
    // Check rate limit
    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please wait before making more AI requests.');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    try {
      const prompt = `Please enhance the following content to make it more engaging and professional:

${content}

Provide an improved version that maintains the original meaning but is more polished.`;

      const requestBody = this.buildRequestBody(prompt);

      const response = await this.bedrockClient.send(
        new InvokeModelCommand({
          modelId: this.modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(requestBody),
        }),
      );

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const enhancedContent = this.extractResponseText(responseBody);

      if (!enhancedContent) {
        throw new Error('No content returned from Bedrock');
      }

      // Log usage
      const tokenCount = enhancedContent.length / 4; // Rough estimate
      this.logUsage(userId, 'enhanceContent', tokenCount);

      return enhancedContent;
    } catch (error) {
      console.error('Error enhancing content with Bedrock:', error);

      if (error instanceof Error) {
        if (error.message.includes('Rate limit')) {
          throw error;
        }
        if (error.message.includes('throttling')) {
          throw new Error('Bedrock service is currently throttling requests. Please try again later.');
        }
        if (error.message.includes('model')) {
          throw new Error('Bedrock model is not available. Please contact support.');
        }
      }

      throw new Error('Failed to enhance content with AI');
    }
  }

  /**
   * Generate content from prompt using AI
   */
  async generateContent(prompt: string, userId: string): Promise<string> {
    // Check rate limit
    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please wait before making more AI requests.');
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    try {
      const requestBody = this.buildRequestBody(prompt);

      const response = await this.bedrockClient.send(
        new InvokeModelCommand({
          modelId: this.modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(requestBody),
        }),
      );

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const generatedContent = this.extractResponseText(responseBody);

      if (!generatedContent) {
        throw new Error('No content returned from Bedrock');
      }

      // Log usage
      const tokenCount = generatedContent.length / 4; // Rough estimate
      this.logUsage(userId, 'generateContent', tokenCount);

      return generatedContent;
    } catch (error) {
      console.error('Error generating content with Bedrock:', error);

      if (error instanceof Error) {
        if (error.message.includes('Rate limit')) {
          throw error;
        }
        if (error.message.includes('throttling')) {
          throw new Error('Bedrock service is currently throttling requests. Please try again later.');
        }
        if (error.message.includes('model')) {
          throw new Error('Bedrock model is not available. Please contact support.');
        }
      }

      throw new Error('Failed to generate content with AI');
    }
  }
}

/**
 * Get singleton instance of AIService
 */
export const getAIService = (): AIService => {
  return AIService.getInstance();
};
