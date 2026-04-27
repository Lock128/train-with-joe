import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { AIExercise } from '../model/domain/Training';
import type { VocabularyWord } from '../model/domain/VocabularyList';

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
    const region = process.env.AWS_REGION || 'eu-central-1';
    this.bedrockClient = new BedrockRuntimeClient({ region });
    this.modelId = process.env.BEDROCK_MODEL_ID || 'eu.amazon.nova-2-lite-v1:0';
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
   * Attempt to repair truncated/malformed JSON from LLM output.
   * Common issues: last array entry is incomplete, missing closing brackets.
   */
  private repairTruncatedJson(text: string): Record<string, unknown> {
    // Find the words array and try to salvage valid entries
    const wordsStart = text.indexOf('"words"');
    if (wordsStart === -1) {
      throw new Error('No words array found');
    }

    const arrayStart = text.indexOf('[', wordsStart);
    if (arrayStart === -1) {
      throw new Error('No array start found');
    }

    // Walk through the array collecting complete objects
    let depth = 0;
    let lastGoodEnd = arrayStart;
    for (let i = arrayStart; i < text.length; i++) {
      const ch = text[i];
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          // We just closed a top-level object inside the array
          // Check if this object is valid JSON
          const candidate = text.substring(arrayStart, i + 1) + ']}';
          const prefix = text.substring(0, arrayStart);
          try {
            JSON.parse(prefix + candidate);
            lastGoodEnd = i + 1;
          } catch {
            // This object itself is broken — stop here
            break;
          }
        }
      }
    }

    if (lastGoodEnd <= arrayStart) {
      throw new Error('No valid array entries found');
    }

    // Reconstruct: everything before the array + valid entries + close array + close object
    const prefix = text.substring(0, arrayStart);
    const validEntries = text.substring(arrayStart, lastGoodEnd);
    const repaired = prefix + validEntries + ']}';

    const parsed = JSON.parse(repaired);
    console.log(`[analyzeImageForVocabulary] Repaired JSON: salvaged ${parsed.words?.length ?? 0} words`);
    return parsed;
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
        system: [
          {
            text: 'You are a structured-data extraction API. You MUST respond with a single valid JSON object and absolutely nothing else. No markdown, no code fences, no wrapper tags, no commentary. Start with "{" and end with "}".',
          },
        ],
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
   * Extract text from an image using OCR-style multimodal analysis.
   * Returns recognized words, a short title, and the detected source language.
   * Words are deduplicated (case-sensitive) before returning.
   */
  async extractTextFromImage(
    imageBase64: string,
    userId: string,
    options?: { skipRateLimit?: boolean },
  ): Promise<{
    title: string;
    detectedLanguage: string;
    words: string[];
  }> {
    // Check rate limit (skip for internal batch processing)
    if (!options?.skipRateLimit && !this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please wait before making more AI requests.');
    }

    if (!imageBase64 || imageBase64.trim().length === 0) {
      throw new Error('Image data cannot be empty');
    }

    // Titan models do not support image analysis
    if (this.modelId.includes('titan')) {
      throw new Error(
        'Image analysis requires a multimodal model (Claude or Nova). Please configure BEDROCK_MODEL_ID accordingly.',
      );
    }

    try {
      const prompt = `Analyze this image and extract every visible text word. This includes printed text, signage, menus, book pages, labels, and handwritten text.

Your response MUST be a single valid JSON object matching this exact structure — no other output:

{
  "title": "Brief description of the image, max 10 words",
  "detectedLanguage": "Primary language of the text, e.g. French, Japanese, German. Use Unknown if unsure.",
  "words": ["word1", "word2", "word3"]
}

RULES:
- Extract ALL visible text words from the image.
- Preserve the original spelling and casing of each word exactly as it appears.
- Do NOT translate or modify any words.
- Do NOT include phonetic transcriptions, IPA notation (e.g. /həˈloʊ/, [ˈwɜːrd]), or pronunciation guides. Only extract actual words written in a standard script/alphabet.
- If the image contains words in multiple languages, set detectedLanguage to the dominant language.
- If no text is found, return an empty words array.
- Respond with ONLY the JSON object. No markdown, no code fences, no tags, no commentary before or after.
- The output MUST be parseable by JSON.parse() — no trailing commas, no truncated objects.
- Start your response with the "{" character and end it with the "}" character.`;

      console.log(
        `[extractTextFromImage] Starting OCR extraction for user=${userId}, model=${this.modelId}, imageSize=${imageBase64.length} chars`,
      );

      const requestBody = this.buildMultimodalRequestBody(imageBase64, prompt, 4000);

      console.log('[extractTextFromImage] Sending request to Bedrock...');
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
      console.log(`[extractTextFromImage] Bedrock responded in ${elapsed}ms`);

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const responseText = this.extractResponseText(responseBody);

      console.log(`[extractTextFromImage] Response text length: ${responseText?.length || 0} chars`);
      if (!responseText) {
        console.error(
          '[extractTextFromImage] Empty response from Bedrock, responseBody keys:',
          Object.keys(responseBody),
        );
        throw new Error('No content returned from Bedrock');
      }

      // Parse JSON from response (handle markdown fences, model tags, and embedded JSON)
      let parsed;
      const stripped = responseText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .replace(/\{@json_object\}/gi, '')
        .trim();

      try {
        parsed = JSON.parse(stripped);
        console.log('[extractTextFromImage] JSON parsed successfully (direct)');
      } catch (parseError) {
        console.warn(
          `[extractTextFromImage] Direct JSON parse failed: ${parseError instanceof Error ? parseError.message : parseError}`,
        );
        console.warn(`[extractTextFromImage] Response text (first 500 chars): ${stripped.substring(0, 500)}`);

        // Attempt repair for truncated JSON
        try {
          parsed = this.repairTruncatedJson(stripped);
          console.log('[extractTextFromImage] JSON parsed successfully (repaired)');
        } catch {
          console.error('[extractTextFromImage] JSON repair also failed');
          throw new Error('Failed to parse OCR response as JSON');
        }
      }

      // Deduplicate words (case-sensitive)
      const rawWords: string[] = Array.isArray(parsed.words)
        ? parsed.words.filter((w: unknown) => typeof w === 'string' && w.length > 0)
        : [];
      const uniqueWords = Array.from(new Set(rawWords));

      const wordCount = uniqueWords.length;
      console.log(
        `[extractTextFromImage] Success: title="${parsed.title}", words=${wordCount}, detectedLanguage="${parsed.detectedLanguage}"`,
      );

      // Log usage
      const tokenCount = responseText.length / 4;
      this.logUsage(userId, 'extractTextFromImage', tokenCount);

      return {
        title: parsed.title || 'Text from Image',
        detectedLanguage: parsed.detectedLanguage || 'Unknown',
        words: uniqueWords,
      };
    } catch (error) {
      console.error('Error extracting text from image with Bedrock:', error);

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

      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Translate a list of words from a source language to a target language.
   * Returns enriched VocabularyWord objects with translation, definition,
   * partOfSpeech, exampleSentence, and difficulty.
   * Untranslatable words are included with an empty translation field.
   */
  async translateWords(
    words: string[],
    sourceLanguage: string,
    targetLanguage: string,
    userId: string,
    options?: { skipRateLimit?: boolean },
  ): Promise<VocabularyWord[]> {
    // Check rate limit (skip for internal batch processing)
    if (!options?.skipRateLimit && !this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please wait before making more AI requests.');
    }

    if (!words || words.length === 0) {
      throw new Error('Words array cannot be empty');
    }

    try {
      const wordList = words.map((w, i) => `${i + 1}. ${w}`).join('\n');

      const prompt = `You are a language translation API. Translate the following words from ${sourceLanguage} to ${targetLanguage}.

Words to translate:
${wordList}

Your response MUST be a single valid JSON array of objects matching this exact structure — no other output:

[
  {
    "word": "original word in ${sourceLanguage}",
    "translation": "translation in ${targetLanguage}",
    "definition": "Learner-friendly definition, max 20 words",
    "partOfSpeech": "noun | verb | adjective | adverb | other",
    "exampleSentence": "Simple example sentence using the word, max 15 words",
    "difficulty": "easy | medium | hard"
  }
]

RULES:
- Return one object per input word, in the same order as the input list.
- If a word cannot be translated, include it with an empty string for the "translation" field and a definition indicating it could not be translated.
- partOfSpeech MUST be one of: noun, verb, adjective, adverb, other.
- difficulty MUST be one of: easy, medium, hard.
- definition MUST be at most 20 words.
- exampleSentence MUST be at most 15 words.
- Respond with ONLY the JSON array. No markdown, no code fences, no tags, no commentary before or after.
- The output MUST be parseable by JSON.parse() — no trailing commas, no truncated objects.
- Start your response with the "[" character and end it with the "]" character.`;

      console.log(
        `[translateWords] Starting translation for user=${userId}, model=${this.modelId}, wordCount=${words.length}, ${sourceLanguage} → ${targetLanguage}`,
      );

      const requestBody = this.buildRequestBody(prompt, 4000);

      console.log('[translateWords] Sending request to Bedrock...');
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
      console.log(`[translateWords] Bedrock responded in ${elapsed}ms`);

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const responseText = this.extractResponseText(responseBody);

      console.log(`[translateWords] Response text length: ${responseText?.length || 0} chars`);
      if (!responseText) {
        console.error('[translateWords] Empty response from Bedrock, responseBody keys:', Object.keys(responseBody));
        throw new Error('No content returned from Bedrock');
      }

      // Parse JSON from response (handle markdown fences and model tags)
      let parsed: unknown;
      const stripped = responseText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .replace(/\{@json_object\}/gi, '')
        .trim();

      try {
        parsed = JSON.parse(stripped);
        console.log('[translateWords] JSON parsed successfully (direct)');
      } catch (parseError) {
        console.warn(
          `[translateWords] Direct JSON parse failed: ${parseError instanceof Error ? parseError.message : parseError}`,
        );
        console.warn(`[translateWords] Response text (first 500 chars): ${stripped.substring(0, 500)}`);

        // Attempt repair for truncated JSON — wrap in object so repairTruncatedJson can handle it
        try {
          const wrappedText = `{"words": ${stripped}`;
          const repaired = this.repairTruncatedJson(wrappedText);
          parsed = repaired.words;
          console.log('[translateWords] JSON parsed successfully (repaired)');
        } catch {
          console.error('[translateWords] JSON repair also failed');
          throw new Error('Failed to parse translation response as JSON');
        }
      }

      if (!Array.isArray(parsed)) {
        throw new Error('Expected JSON array of translated words');
      }

      // Map to VocabularyWord[], filtering out completely invalid entries
      const vocabularyWords: VocabularyWord[] = parsed
        .filter(
          (entry: unknown): entry is Record<string, unknown> =>
            entry !== null && typeof entry === 'object' && typeof (entry as Record<string, unknown>).word === 'string',
        )
        .map((entry: Record<string, unknown>) => ({
          word: entry.word as string,
          translation: typeof entry.translation === 'string' ? entry.translation : undefined,
          definition: typeof entry.definition === 'string' ? entry.definition : 'No definition available',
          partOfSpeech: typeof entry.partOfSpeech === 'string' ? entry.partOfSpeech : undefined,
          exampleSentence: typeof entry.exampleSentence === 'string' ? entry.exampleSentence : undefined,
          difficulty: typeof entry.difficulty === 'string' ? entry.difficulty : undefined,
        }));

      console.log(`[translateWords] Success: translated ${vocabularyWords.length} words`);

      // Log usage
      const tokenCount = responseText.length / 4;
      this.logUsage(userId, 'translateWords', tokenCount);

      return vocabularyWords;
    } catch (error) {
      console.error('Error translating words with Bedrock:', error);

      if (error instanceof Error) {
        if (error.message.includes('Rate limit')) {
          throw error;
        }
        if (error.message.includes('Words array cannot be empty')) {
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

      throw new Error('Failed to translate words');
    }
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

Your response MUST be a single valid JSON object matching this exact JSON Schema — no other output:

{
  "type": "object",
  "required": ["title", "sourceLanguage", "targetLanguage", "words"],
  "additionalProperties": false,
  "properties": {
    "title":          { "type": "string", "description": "Brief description of the image, max 10 words" },
    "sourceLanguage": { "type": "string", "description": "Language words are translated FROM, e.g. English" },
    "targetLanguage": { "type": "string", "description": "Language words are translated TO, e.g. German" },
    "words": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "object",
        "required": ["word", "definition"],
        "properties": {
          "word":            { "type": "string", "description": "Vocabulary word in source language" },
          "translation":     { "type": "string", "description": "Translation in target language" },
          "definition":      { "type": "string", "description": "Learner-friendly definition, max 20 words" },
          "partOfSpeech":    { "type": "string", "enum": ["noun", "verb", "adjective", "adverb", "other"] },
          "exampleSentence": { "type": "string", "description": "Simple example sentence, max 15 words" },
          "difficulty":      { "type": "string", "enum": ["easy", "medium", "hard"] },
          "unit":            { "type": "string", "description": "Unit/chapter/section label if visible in image" }
        }
      }
    }
  }
}

RULES:
- Do NOT include phonetic transcriptions, IPA notation (e.g. /həˈloʊ/, [ˈwɜːrd]), or pronunciation guides as word values or translations. Only extract actual words written in a standard script/alphabet.
- Respond with ONLY the JSON object. No markdown, no code fences, no tags, no commentary before or after.
- The output MUST be parseable by JSON.parse() — no trailing commas, no truncated objects.
- If you cannot fit all words within the token limit, stop at the last COMPLETE word object and close the array and object properly.
- Start your response with the "{" character and end it with the "}" character.`;

      console.log(
        `[analyzeImageForVocabulary] Starting analysis for user=${userId}, model=${this.modelId}, imageSize=${imageBase64.length} chars`,
      );

      const requestBody = this.buildMultimodalRequestBody(imageBase64, prompt, 8000);

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

      // Parse JSON from response (handle markdown fences, model tags, and embedded JSON)
      let parsed;
      const stripped = responseText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .replace(/\{@json_object\}/gi, '')
        .trim();

      try {
        parsed = JSON.parse(stripped);
        console.log('[analyzeImageForVocabulary] JSON parsed successfully (direct)');
      } catch (parseError) {
        console.warn(
          `[analyzeImageForVocabulary] Direct JSON parse failed: ${parseError instanceof Error ? parseError.message : parseError}`,
        );
        console.warn(`[analyzeImageForVocabulary] Response text (first 500 chars): ${stripped.substring(0, 500)}`);
        console.warn(
          `[analyzeImageForVocabulary] Response text (last 500 chars): ${stripped.substring(Math.max(0, stripped.length - 500))}`,
        );

        // Attempt repair: truncate the last malformed array entry and close the JSON
        try {
          parsed = this.repairTruncatedJson(stripped);
          console.log('[analyzeImageForVocabulary] JSON parsed successfully (repaired)');
        } catch {
          console.error('[analyzeImageForVocabulary] JSON repair also failed');
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
