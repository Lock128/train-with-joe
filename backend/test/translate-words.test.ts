import { describe, test, expect, beforeEach } from 'vitest';
import { AIService } from '../src/services/ai-service';
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

/**
 * Unit Tests for AIService.translateWords
 * Validates: Requirements 4.1, 4.2, 4.3, 10.2
 */

const bedrockMock = mockClient(BedrockRuntimeClient);

/**
 * Helper: create Nova-format Bedrock response (default model is Nova)
 */
function createNovaResponse(text: string) {
  return {
    body: new TextEncoder().encode(
      JSON.stringify({
        output: {
          message: {
            content: [{ text }],
          },
        },
      }),
    ),
  };
}

/**
 * Helper: create a valid translation JSON array response
 */
function validTranslationJson(
  words?: Array<{
    word: string;
    translation?: string;
    definition?: string;
    partOfSpeech?: string;
    exampleSentence?: string;
    difficulty?: string;
  }>,
): string {
  const defaultWords = [
    {
      word: 'croissant',
      translation: 'Croissant',
      definition: 'A flaky, buttery pastry',
      partOfSpeech: 'noun',
      exampleSentence: 'I had a croissant for breakfast.',
      difficulty: 'easy',
    },
    {
      word: 'fromage',
      translation: 'cheese',
      definition: 'A dairy product made from milk',
      partOfSpeech: 'noun',
      exampleSentence: 'The fromage was delicious.',
      difficulty: 'easy',
    },
  ];
  return JSON.stringify(words ?? defaultWords);
}

describe('AIService.translateWords', () => {
  beforeEach(() => {
    bedrockMock.reset();
  });

  describe('successful translation', () => {
    test('returns VocabularyWord array from valid JSON response', async () => {
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(validTranslationJson()));

      const service = AIService.getInstance();
      const userId = `user-translate-success-${Date.now()}`;

      const result = await service.translateWords(['croissant', 'fromage'], 'French', 'English', userId);

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe('croissant');
      expect(result[0].translation).toBe('Croissant');
      expect(result[0].definition).toBe('A flaky, buttery pastry');
      expect(result[0].partOfSpeech).toBe('noun');
      expect(result[0].exampleSentence).toBe('I had a croissant for breakfast.');
      expect(result[0].difficulty).toBe('easy');
    });
  });

  describe('prompt construction', () => {
    test('includes all words, source and target languages in prompt', async () => {
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(validTranslationJson()));

      const service = AIService.getInstance();
      const userId = `user-translate-prompt-${Date.now()}`;

      await service.translateWords(['bonjour', 'merci', 'au revoir'], 'French', 'German', userId);

      const calls = bedrockMock.commandCalls(InvokeModelCommand);
      expect(calls).toHaveLength(1);

      const requestBody = JSON.parse(calls[0].args[0].input.body as string);

      // Nova text format: messages[0].content[0].text
      const promptText = requestBody.messages[0].content[0].text;

      // Verify all words are included
      expect(promptText).toContain('bonjour');
      expect(promptText).toContain('merci');
      expect(promptText).toContain('au revoir');

      // Verify source and target languages
      expect(promptText).toContain('French');
      expect(promptText).toContain('German');
    });

    test('uses text-only buildRequestBody (not multimodal)', async () => {
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(validTranslationJson()));

      const service = AIService.getInstance();
      const userId = `user-translate-textonly-${Date.now()}`;

      await service.translateWords(['hola'], 'Spanish', 'English', userId);

      const calls = bedrockMock.commandCalls(InvokeModelCommand);
      const requestBody = JSON.parse(calls[0].args[0].input.body as string);

      // Text-only Nova format: content is [{ text: ... }], NOT multimodal with image
      const content = requestBody.messages[0].content;
      expect(content).toHaveLength(1);
      expect(content[0].text).toBeDefined();
      expect(content[0].image).toBeUndefined();
    });
  });

  describe('response parsing', () => {
    test('produces valid VocabularyWord array with all fields', async () => {
      const words = [
        {
          word: 'Straße',
          translation: 'street',
          definition: 'A public road in a city or town',
          partOfSpeech: 'noun',
          exampleSentence: 'We walked down the Straße.',
          difficulty: 'medium',
        },
        {
          word: 'schnell',
          translation: 'fast',
          definition: 'Moving at high speed',
          partOfSpeech: 'adjective',
          exampleSentence: 'The car was very schnell.',
          difficulty: 'easy',
        },
      ];
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(validTranslationJson(words)));

      const service = AIService.getInstance();
      const userId = `user-translate-parse-${Date.now()}`;

      const result = await service.translateWords(['Straße', 'schnell'], 'German', 'English', userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        word: 'Straße',
        translation: 'street',
        definition: 'A public road in a city or town',
        partOfSpeech: 'noun',
        exampleSentence: 'We walked down the Straße.',
        difficulty: 'medium',
      });
      expect(result[1]).toEqual({
        word: 'schnell',
        translation: 'fast',
        definition: 'Moving at high speed',
        partOfSpeech: 'adjective',
        exampleSentence: 'The car was very schnell.',
        difficulty: 'easy',
      });
    });

    test('defaults missing definition to "No definition available"', async () => {
      const words = [{ word: 'test', translation: 'test' }];
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(JSON.stringify(words)));

      const service = AIService.getInstance();
      const userId = `user-translate-nodef-${Date.now()}`;

      const result = await service.translateWords(['test'], 'English', 'French', userId);

      expect(result[0].definition).toBe('No definition available');
    });

    test('filters out entries without a word field', async () => {
      const words = [
        { word: 'valid', translation: 'valide', definition: 'Correct' },
        { translation: 'orphan', definition: 'No word field' },
        { word: 'also-valid', translation: 'aussi-valide', definition: 'Also correct' },
      ];
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(JSON.stringify(words)));

      const service = AIService.getInstance();
      const userId = `user-translate-filter-${Date.now()}`;

      const result = await service.translateWords(['valid', 'also-valid'], 'English', 'French', userId);

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe('valid');
      expect(result[1].word).toBe('also-valid');
    });
  });

  describe('untranslatable words', () => {
    test('includes words with empty translation field', async () => {
      const words = [
        {
          word: 'croissant',
          translation: 'Croissant',
          definition: 'A flaky pastry',
          partOfSpeech: 'noun',
          exampleSentence: 'I ate a croissant.',
          difficulty: 'easy',
        },
        {
          word: 'xyzzy',
          translation: '',
          definition: 'Could not be translated',
          partOfSpeech: 'other',
          exampleSentence: '',
          difficulty: 'hard',
        },
      ];
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(validTranslationJson(words)));

      const service = AIService.getInstance();
      const userId = `user-translate-untranslatable-${Date.now()}`;

      const result = await service.translateWords(['croissant', 'xyzzy'], 'French', 'English', userId);

      expect(result).toHaveLength(2);
      expect(result[0].translation).toBe('Croissant');
      expect(result[1].word).toBe('xyzzy');
      expect(result[1].translation).toBe('');
    });

    test('sets translation to undefined when field is non-string', async () => {
      const rawJson = JSON.stringify([{ word: 'test', translation: null, definition: 'A test word' }]);
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(rawJson));

      const service = AIService.getInstance();
      const userId = `user-translate-null-${Date.now()}`;

      const result = await service.translateWords(['test'], 'English', 'French', userId);

      expect(result[0].translation).toBeUndefined();
    });
  });

  describe('markdown code fence stripping', () => {
    test('strips ```json fences from response', async () => {
      const wrappedJson = '```json\n' + validTranslationJson() + '\n```';
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(wrappedJson));

      const service = AIService.getInstance();
      const userId = `user-translate-fences-${Date.now()}`;

      const result = await service.translateWords(['croissant', 'fromage'], 'French', 'English', userId);

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe('croissant');
    });

    test('strips bare ``` fences from response', async () => {
      const wrappedJson = '```\n' + validTranslationJson() + '\n```';
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(wrappedJson));

      const service = AIService.getInstance();
      const userId = `user-translate-bare-fences-${Date.now()}`;

      const result = await service.translateWords(['croissant', 'fromage'], 'French', 'English', userId);

      expect(result).toHaveLength(2);
    });
  });

  describe('JSON repair fallback', () => {
    test('repairs truncated JSON array with complete word objects', async () => {
      // Truncated after first complete object, second object is incomplete
      const truncated = '[{"word": "bonjour", "translation": "hello", "definition": "A greeting"}, {"word": "mer';
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(truncated));

      const service = AIService.getInstance();
      const userId = `user-translate-repair-${Date.now()}`;

      // The repair wraps in {"words": ...} and uses repairTruncatedJson
      const result = await service.translateWords(['bonjour', 'merci'], 'French', 'English', userId);

      // Should salvage the first complete object
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].word).toBe('bonjour');
    });

    test('throws when JSON is completely unparseable', async () => {
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse('not json at all'));

      const service = AIService.getInstance();
      const userId = `user-translate-bad-json-${Date.now()}`;

      await expect(service.translateWords(['test'], 'English', 'French', userId)).rejects.toThrow(
        'Failed to parse translation response as JSON',
      );
    });
  });

  describe('error handling', () => {
    test('throws error for empty words array', async () => {
      const service = AIService.getInstance();
      const userId = `user-translate-empty-${Date.now()}`;

      await expect(service.translateWords([], 'French', 'English', userId)).rejects.toThrow(
        'Words array cannot be empty',
      );
    });

    test('throws error on Bedrock service failure', async () => {
      bedrockMock.on(InvokeModelCommand).rejects(new Error('Service unavailable'));

      const service = AIService.getInstance();
      const userId = `user-translate-bedrock-fail-${Date.now()}`;

      await expect(service.translateWords(['test'], 'English', 'French', userId)).rejects.toThrow(
        'Failed to translate words',
      );
    });

    test('throws error when Bedrock returns empty response', async () => {
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(''));

      const service = AIService.getInstance();
      const userId = `user-translate-empty-resp-${Date.now()}`;

      await expect(service.translateWords(['test'], 'English', 'French', userId)).rejects.toThrow(
        'Failed to translate words',
      );
    });

    test('throws rate limit error when exceeded', async () => {
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(validTranslationJson()));

      const service = AIService.getInstance();
      const userId = `user-translate-rate-${Date.now()}`;

      // Exhaust rate limit (10 requests per window)
      for (let i = 0; i < 10; i++) {
        await service.translateWords(['test'], 'English', 'French', userId);
      }

      // 11th call should fail
      await expect(service.translateWords(['test'], 'English', 'French', userId)).rejects.toThrow(
        'Rate limit exceeded',
      );
    });

    test('skips rate limit when skipRateLimit option is set', async () => {
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse(validTranslationJson()));

      const service = AIService.getInstance();
      const userId = `user-translate-skip-rate-${Date.now()}`;

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await service.translateWords(['test'], 'English', 'French', userId);
      }

      // Should succeed with skipRateLimit
      const result = await service.translateWords(['croissant', 'fromage'], 'French', 'English', userId, {
        skipRateLimit: true,
      });
      expect(result).toHaveLength(2);
    });

    test('throws on Bedrock throttling error', async () => {
      bedrockMock.on(InvokeModelCommand).rejects(new Error('throttling exception'));

      const service = AIService.getInstance();
      const userId = `user-translate-throttle-${Date.now()}`;

      await expect(service.translateWords(['test'], 'English', 'French', userId)).rejects.toThrow(
        'Bedrock service is currently throttling requests',
      );
    });

    test('throws when response is not a JSON array', async () => {
      bedrockMock.on(InvokeModelCommand).resolves(createNovaResponse('{"word": "test", "translation": "test"}'));

      const service = AIService.getInstance();
      const userId = `user-translate-not-array-${Date.now()}`;

      await expect(service.translateWords(['test'], 'English', 'French', userId)).rejects.toThrow(
        'Expected JSON array of translated words',
      );
    });
  });
});
