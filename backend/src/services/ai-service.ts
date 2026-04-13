import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { AIExercise } from '../model/domain/Training';

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
    this.modelId = process.env.BEDROCK_MODEL_ID || 'eu.amazon.nova-lite-v1:0';
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
    if (this.modelId.includes('nova')) {
      return {
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }],
          },
        ],
        inferenceConfig: {
          temperature: 0.7,
          maxTokens,
        },
      };
    }

    if (this.modelId.includes('sonnet') || this.modelId.includes('claude')) {
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
   * Parse and validate exercises from AI response text
   */
  parseAndValidateExercises(responseText: string): AIExercise[] {
    // Strip markdown code fences if present
    const stripped = responseText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      throw new Error('Failed to parse exercises response as JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Expected JSON array of exercises');
    }

    const validExercises: AIExercise[] = [];

    for (const exercise of parsed) {
      const isValid =
        exercise &&
        typeof exercise.prompt === 'string' &&
        exercise.prompt.length > 0 &&
        Array.isArray(exercise.options) &&
        exercise.options.length >= 3 &&
        exercise.options.length <= 5 &&
        typeof exercise.correctOptionIndex === 'number' &&
        exercise.correctOptionIndex >= 0 &&
        exercise.correctOptionIndex < exercise.options.length &&
        typeof exercise.exerciseType === 'string' &&
        exercise.exerciseType.length > 0 &&
        typeof exercise.sourceWord === 'string' &&
        exercise.sourceWord.length > 0;

      if (isValid) {
        validExercises.push({
          prompt: exercise.prompt,
          options: exercise.options,
          correctOptionIndex: exercise.correctOptionIndex,
          exerciseType: exercise.exerciseType,
          sourceWord: exercise.sourceWord,
        });
      } else {
        console.warn('Invalid exercise filtered out:', JSON.stringify(exercise));
      }
    }

    return validExercises;
  }

  /**
   * Generate AI exercises for vocabulary words
   */
  async generateExercises(
    words: {
      word: string;
      translation?: string;
      definition?: string;
      partOfSpeech?: string;
      exampleSentence?: string;
    }[],
    sourceLanguage: string,
    targetLanguage: string,
    userId: string,
  ): Promise<AIExercise[]> {
    // Check rate limit
    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please wait before making more AI requests.');
    }

    if (!words || words.length === 0) {
      throw new Error('Words array cannot be empty');
    }

    try {
      const wordDescriptions = words
        .map((w, i) => {
          const parts = [`${i + 1}. word: "${w.word}"`];
          if (w.translation) parts.push(`translation: "${w.translation}"`);
          if (w.definition) parts.push(`definition: "${w.definition}"`);
          if (w.partOfSpeech) parts.push(`partOfSpeech: "${w.partOfSpeech}"`);
          if (w.exampleSentence) parts.push(`exampleSentence: "${w.exampleSentence}"`);
          return parts.join(', ');
        })
        .join('\n');

      const prompt = `You are generating vocabulary exercises for a language learner. The learner is studying ${targetLanguage}.

CRITICAL RULE: Every exercise prompt, sentence, and answer option MUST be written ONLY in ${targetLanguage}. NEVER use any ${sourceLanguage} words anywhere. NEVER mix languages. If you are unsure, write everything in ${targetLanguage}.

Here are the vocabulary words (provided in ${sourceLanguage} with ${targetLanguage} translations):
${wordDescriptions}

Use the ${targetLanguage} translations of these words to create exercises. Generate a JSON array with a varied mix of these exercise types:

1. "fill_in_the_blank" — A ${targetLanguage} sentence with one word as a blank. All options in ${targetLanguage}. Test grammar and usage (e.g. "He ____ the bus every morning." → "catches", "catch", "catching", "caught").

2. "sentence_completion" — An incomplete ${targetLanguage} sentence. All options in ${targetLanguage}.

3. "verb_conjugation" — A ${targetLanguage} sentence with a verb blank. All options are different ${targetLanguage} verb forms. Use ${targetLanguage} pronouns.

4. "sentence_translation" — Show a ${targetLanguage} sentence and ask the learner to pick the best ${targetLanguage} paraphrase or restatement. The prompt and ALL options must be entirely in ${targetLanguage}. Example: "Which sentence means the same as: 'She wore a pretty dress to the party.'?" with options like "She put on a beautiful dress for the party.", "She bought a pretty dress at the party.", etc.

5. "preposition" — A ${targetLanguage} sentence with a missing preposition. All options are ${targetLanguage} prepositions.

6. "word_order" — Ask which ${targetLanguage} sentence has correct word order. All options are ${targetLanguage} sentences.

7. "synonym_antonym" — "Which ${targetLanguage} word means the same as / opposite of X?" All options in ${targetLanguage}.

8. "error_correction" — A ${targetLanguage} sentence with a grammar error. Options are corrected ${targetLanguage} sentences.

9. "context_word" — A ${targetLanguage} sentence with a blank. Pick the ${targetLanguage} word that fits the context/meaning.

RULES:
- EVERY sentence, question, and answer option must be 100% in ${targetLanguage}. No exceptions.
- NEVER use any ${sourceLanguage} words anywhere in prompts or options.
- Wrong options should be plausible mistakes learners make.
- Wrong options should be plausible mistakes learners make.
- Vary exercise types — do not repeat the same type for every exercise.

JSON format per exercise:
- "prompt": string (the question, in ${targetLanguage} unless sentence_translation)
- "options": array of 3-5 strings (answer choices)
- "correctOptionIndex": number (0-based index of correct answer)
- "exerciseType": one of fill_in_the_blank, sentence_completion, verb_conjugation, sentence_translation, preposition, word_order, synonym_antonym, error_correction, context_word
- "sourceWord": string (the vocabulary word this exercise tests)

Return ONLY a valid JSON array. No markdown, no code blocks, no extra text.`;

      const requestBody = this.buildRequestBody(prompt, 2000);

      const response = await this.bedrockClient.send(
        new InvokeModelCommand({
          modelId: this.modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(requestBody),
        }),
      );

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const responseText = this.extractResponseText(responseBody);

      if (!responseText) {
        throw new Error('No content returned from Bedrock');
      }

      const validExercises = this.parseAndValidateExercises(responseText);

      if (validExercises.length === 0) {
        throw new Error('No valid exercises could be generated');
      }

      // Log usage
      const tokenEstimate = responseText.length / 4;
      this.logUsage(userId, 'generateExercises', tokenEstimate);

      return validExercises;
    } catch (error) {
      console.error('Error generating AI exercises with Bedrock:', error);

      if (error instanceof Error) {
        if (error.message.includes('Rate limit')) {
          throw error;
        }
        if (error.message.includes('No valid exercises')) {
          throw error;
        }
        if (error.message.includes('Failed to parse') || error.message.includes('Expected JSON array')) {
          throw error;
        }
        if (error.message.includes('throttling')) {
          throw new Error('Bedrock service is currently throttling requests. Please try again later.');
        }
        if (error.message.includes('is not authorized to perform') || error.message.includes('AccessDeniedException')) {
          throw new Error(
            'Bedrock model access is not enabled. Please enable model access in the AWS Bedrock console.',
          );
        }
        if (
          error.message.includes('Could not resolve the foundation model') ||
          error.message.includes('ValidationException') ||
          error.name === 'ValidationException'
        ) {
          throw new Error(`Bedrock model '${this.modelId}' is not available in this region. Please contact support.`);
        }
      }

      throw new Error(`Failed to generate AI exercises: ${error instanceof Error ? error.message : String(error)}`);
    }
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
        if (error.message.includes('is not authorized to perform') || error.message.includes('AccessDeniedException')) {
          throw new Error(
            'Bedrock model access is not enabled. Please enable model access in the AWS Bedrock console.',
          );
        }
        if (
          error.message.includes('Could not resolve the foundation model') ||
          error.message.includes('ValidationException') ||
          error.name === 'ValidationException'
        ) {
          throw new Error(`Bedrock model '${this.modelId}' is not available in this region. Please contact support.`);
        }
      }

      throw new Error('Failed to enhance content with AI');
    }
  }

  /**
   * Build multimodal request body for image analysis (Claude/Nova only)
   */
  private buildMultimodalRequestBody(
    imageBase64: string,
    textPrompt: string,
    maxTokens: number = 2000,
  ): Record<string, unknown> {
    if (this.modelId.includes('nova')) {
      // Amazon Nova multimodal format
      return {
        messages: [
          {
            role: 'user',
            content: [
              {
                image: {
                  format: 'jpeg',
                  source: { bytes: imageBase64 },
                },
              },
              { text: textPrompt },
            ],
          },
        ],
        inferenceConfig: {
          temperature: 0.7,
          maxTokens,
        },
      };
    }

    // Anthropic Claude multimodal format
    return {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            { type: 'text', text: textPrompt },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      anthropic_version: 'bedrock-2023-05-31',
    };
  }

  /**
   * Analyze an image for vocabulary words using AI
   */
  async analyzeImageForVocabulary(
    imageBase64: string,
    userId: string,
    sourceLanguage?: string,
    targetLanguage?: string,
    options?: { skipRateLimit?: boolean },
  ): Promise<{
    title: string;
    words: Array<{
      word: string;
      translation?: string;
      definition: string;
      partOfSpeech?: string;
      exampleSentence?: string;
      difficulty?: string;
      unit?: string;
    }>;
    sourceLanguage: string;
    targetLanguage: string;
  }> {
    // Check rate limit (skip for internal batch processing)
    if (!options?.skipRateLimit && !this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please wait before making more AI requests.');
    }

    if (!imageBase64 || imageBase64.trim().length === 0) {
      throw new Error('Image data cannot be empty');
    }

    // Titan models do not support image analysis
    const isTitan = this.modelId.includes('titan');
    if (isTitan) {
      throw new Error(
        'Image analysis requires a multimodal model (Claude or Nova). Please configure BEDROCK_MODEL_ID accordingly.',
      );
    }

    try {
      const languageInstruction =
        sourceLanguage && targetLanguage
          ? `The image contains vocabulary translating from ${sourceLanguage} to ${targetLanguage}. Use these as the source and target languages.`
          : 'Detect the languages used in the image. If the image contains translations between two languages, identify both.';
      const prompt = `Analyze this image and extract all vocabulary words suitable for language learners. Capture the words in the same way as they are noted in the image. ${languageInstruction}

Return a JSON object with ONLY these fields:
- "title": a brief description of the image (max 10 words)
- "sourceLanguage": the language words are translated FROM (e.g. "English")
- "targetLanguage": the language words are translated TO (e.g. "German"). If the image is monolingual, set this to the same value as sourceLanguage.
- "words": an array of up to 10 objects, each with:
  - "word": the vocabulary word in the source language
  - "translation": the translation in the target language (if available)
  - "definition": a learner-friendly definition (max 20 words)
  - "partOfSpeech": noun, verb, adjective, adverb, or other
  - "exampleSentence": a simple example sentence (max 15 words)
  - "difficulty": easy, medium, or hard
  - "unit": the unit, chapter, or section label the word belongs to if visible in the image (e.g. "Unit 3", "Chapter 5", "Lesson 2"). If no unit information is visible, omit this field.

Return ONLY valid JSON, no markdown, no code blocks, no extra text.`;

      console.log(
        `[analyzeImageForVocabulary] Starting analysis for user=${userId}, model=${this.modelId}, imageSize=${imageBase64.length} chars`,
      );

      const requestBody = this.buildMultimodalRequestBody(imageBase64, prompt, 4000);

      console.log('[analyzeImageForVocabulary] Sending request to Bedrock...');
      const startTime = Date.now();

      const response = await this.bedrockClient.send(
        new InvokeModelCommand({
          modelId: this.modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(requestBody),
        }),
      );

      const elapsed = Date.now() - startTime;
      console.log(`[analyzeImageForVocabulary] Bedrock responded in ${elapsed}ms`);

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const responseText = this.extractResponseText(responseBody);

      console.log(`[analyzeImageForVocabulary] Response text length: ${responseText?.length || 0} chars`);
      if (!responseText) {
        console.error(
          '[analyzeImageForVocabulary] Empty response from Bedrock, responseBody keys:',
          Object.keys(responseBody),
        );
        throw new Error('No content returned from Bedrock');
      }

      // Parse JSON from response (handle markdown fences and embedded JSON)
      let parsed;
      try {
        // Strip markdown code fences if present
        const stripped = responseText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/, '')
          .trim();
        parsed = JSON.parse(stripped);
        console.log('[analyzeImageForVocabulary] JSON parsed successfully (direct)');
      } catch (parseError) {
        console.warn(
          `[analyzeImageForVocabulary] Direct JSON parse failed: ${parseError instanceof Error ? parseError.message : parseError}`,
        );
        console.warn(`[analyzeImageForVocabulary] Response text (first 500 chars): ${responseText.substring(0, 500)}`);
        console.warn(
          `[analyzeImageForVocabulary] Response text (last 500 chars): ${responseText.substring(Math.max(0, responseText.length - 500))}`,
        );

        // Try to extract the first complete JSON object
        const jsonMatch = responseText.match(/\{[^]*?\}(?=\s*$|\s*```)/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
            console.log('[analyzeImageForVocabulary] JSON parsed successfully (regex extraction)');
          } catch {
            console.error('[analyzeImageForVocabulary] Regex-extracted JSON also failed to parse');
            throw new Error('Failed to parse vocabulary response as JSON');
          }
        } else {
          console.error('[analyzeImageForVocabulary] No JSON object found in response');
          throw new Error('Failed to parse vocabulary response as JSON');
        }
      }

      const wordCount = parsed.words?.length || 0;
      console.log(
        `[analyzeImageForVocabulary] Success: title="${parsed.title}", words=${wordCount}, sourceLanguage="${parsed.sourceLanguage}", targetLanguage="${parsed.targetLanguage}"`,
      );

      // Log usage
      const tokenCount = responseText.length / 4; // Rough estimate
      this.logUsage(userId, 'analyzeImageForVocabulary', tokenCount);

      return {
        title: parsed.title || 'Vocabulary from Image',
        words: parsed.words || [],
        sourceLanguage: parsed.sourceLanguage || 'English',
        targetLanguage: parsed.targetLanguage || parsed.sourceLanguage || 'English',
      };
    } catch (error) {
      console.error('Error analyzing image for vocabulary with Bedrock:', error);

      if (error instanceof Error) {
        if (error.message.includes('Rate limit')) {
          throw error;
        }
        if (error.message.includes('Image analysis requires')) {
          throw error;
        }
        if (error.message.includes('Failed to parse')) {
          throw error;
        }
        if (error.message.includes('throttling')) {
          throw new Error('Bedrock service is currently throttling requests. Please try again later.');
        }
        if (error.message.includes('is not authorized to perform') || error.message.includes('AccessDeniedException')) {
          throw new Error(
            'Bedrock model access is not enabled. Please enable model access in the AWS Bedrock console.',
          );
        }
        if (
          error.message.includes('Could not resolve the foundation model') ||
          error.message.includes('ValidationException') ||
          error.name === 'ValidationException'
        ) {
          throw new Error(`Bedrock model '${this.modelId}' is not available in this region. Please contact support.`);
        }
      }

      throw new Error('Failed to analyze image for vocabulary');
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
        if (error.message.includes('is not authorized to perform') || error.message.includes('AccessDeniedException')) {
          throw new Error(
            'Bedrock model access is not enabled. Please enable model access in the AWS Bedrock console.',
          );
        }
        if (
          error.message.includes('Could not resolve the foundation model') ||
          error.message.includes('ValidationException') ||
          error.name === 'ValidationException'
        ) {
          throw new Error(`Bedrock model '${this.modelId}' is not available in this region. Please contact support.`);
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
