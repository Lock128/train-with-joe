import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AIService } from '../src/services/ai-service';
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

/**
 * Unit Tests for AI Service
 */

const bedrockMock = mockClient(BedrockRuntimeClient);

/**
 * Helper: create Titan-format Bedrock response
 */
function createBedrockResponse(text: string) {
  return {
    body: new TextEncoder().encode(JSON.stringify({ results: [{ outputText: text }] })),
  };
}

/**
 * Helper: create a valid exercise JSON string
 */
function validExercisesJson(count: number = 2): string {
  const exercises = [];
  for (let i = 0; i < count; i++) {
    exercises.push({
      prompt: `What is the translation of word${i}?`,
      options: [`option_a_${i}`, `option_b_${i}`, `option_c_${i}`],
      correctOptionIndex: 0,
      exerciseType: 'fill_in_the_blank',
      sourceWord: `word${i}`,
    });
  }
  return JSON.stringify(exercises);
}

describe('AI Service Unit Tests', () => {
  beforeEach(() => {
    bedrockMock.reset();
  });

  describe('parseAndValidateExercises', () => {
    test('valid exercises returned correctly', () => {
      const service = AIService.getInstance();

      const json = JSON.stringify([
        {
          prompt: 'What is the translation?',
          options: ['hola', 'adios', 'gracias'],
          correctOptionIndex: 0,
          exerciseType: 'fill_in_the_blank',
          sourceWord: 'hello',
        },
        {
          prompt: 'Choose the correct verb form',
          options: ['corro', 'corres', 'corre', 'corremos'],
          correctOptionIndex: 2,
          exerciseType: 'verb_conjugation',
          sourceWord: 'run',
        },
      ]);

      const result = service.parseAndValidateExercises(json);

      expect(result).toHaveLength(2);
      expect(result[0].prompt).toBe('What is the translation?');
      expect(result[0].options).toEqual(['hola', 'adios', 'gracias']);
      expect(result[0].correctOptionIndex).toBe(0);
      expect(result[0].exerciseType).toBe('fill_in_the_blank');
      expect(result[0].sourceWord).toBe('hello');
      expect(result[1].prompt).toBe('Choose the correct verb form');
      expect(result[1].exerciseType).toBe('verb_conjugation');
    });

    test('invalid exercises filtered out', () => {
      const service = AIService.getInstance();

      const json = JSON.stringify([
        // Valid exercise
        {
          prompt: 'What is the translation?',
          options: ['hola', 'adios', 'gracias'],
          correctOptionIndex: 0,
          exerciseType: 'fill_in_the_blank',
          sourceWord: 'hello',
        },
        // Invalid: missing prompt
        {
          options: ['a', 'b', 'c'],
          correctOptionIndex: 0,
          exerciseType: 'fill_in_the_blank',
          sourceWord: 'test',
        },
        // Invalid: correctOptionIndex out of bounds
        {
          prompt: 'Question?',
          options: ['a', 'b', 'c'],
          correctOptionIndex: 5,
          exerciseType: 'fill_in_the_blank',
          sourceWord: 'test',
        },
        // Valid exercise
        {
          prompt: 'Another question',
          options: ['x', 'y', 'z'],
          correctOptionIndex: 1,
          exerciseType: 'preposition',
          sourceWord: 'word2',
        },
      ]);

      const result = service.parseAndValidateExercises(json);

      expect(result).toHaveLength(2);
      expect(result[0].sourceWord).toBe('hello');
      expect(result[1].sourceWord).toBe('word2');
    });

    test('handles markdown fences', () => {
      const service = AIService.getInstance();

      const json = `\`\`\`json
[
  {
    "prompt": "Translate hello",
    "options": ["hola", "adios", "gracias"],
    "correctOptionIndex": 0,
    "exerciseType": "fill_in_the_blank",
    "sourceWord": "hello"
  }
]
\`\`\``;

      const result = service.parseAndValidateExercises(json);

      expect(result).toHaveLength(1);
      expect(result[0].sourceWord).toBe('hello');
    });

    test('throws on invalid JSON', () => {
      const service = AIService.getInstance();

      expect(() => service.parseAndValidateExercises('not valid json {')).toThrow(
        'Failed to parse exercises response as JSON',
      );
    });

    test('returns empty for all-invalid', () => {
      const service = AIService.getInstance();

      const json = JSON.stringify([
        // Missing prompt
        {
          options: ['a', 'b', 'c'],
          correctOptionIndex: 0,
          exerciseType: 'fill_in_the_blank',
          sourceWord: 'test',
        },
        // Too few options (only 2)
        {
          prompt: 'Question?',
          options: ['a', 'b'],
          correctOptionIndex: 0,
          exerciseType: 'fill_in_the_blank',
          sourceWord: 'test',
        },
        // Empty sourceWord
        {
          prompt: 'Question?',
          options: ['a', 'b', 'c'],
          correctOptionIndex: 0,
          exerciseType: 'fill_in_the_blank',
          sourceWord: '',
        },
      ]);

      const result = service.parseAndValidateExercises(json);

      expect(result).toHaveLength(0);
    });
  });

  describe('generateExercises', () => {
    test('Bedrock failure returns error', async () => {
      bedrockMock.on(InvokeModelCommand).rejects(new Error('Bedrock service unavailable'));

      const service = AIService.getInstance();

      await expect(
        service.generateExercises([{ word: 'hello', translation: 'hola' }], 'English', 'Spanish', 'user-bedrock-fail'),
      ).rejects.toThrow('Failed to generate AI exercises');
    });

    test('rate limit error when exceeded', async () => {
      const userId = `user-rate-limit-${Date.now()}`;

      bedrockMock.on(InvokeModelCommand).resolves(createBedrockResponse(validExercisesJson()));

      const service = AIService.getInstance();
      const words = [{ word: 'hello', translation: 'hola' }];

      // Make 10 successful calls (rate limit is 10 per window)
      for (let i = 0; i < 10; i++) {
        await service.generateExercises(words, 'English', 'Spanish', userId);
      }

      // 11th call should fail with rate limit
      await expect(service.generateExercises(words, 'English', 'Spanish', userId)).rejects.toThrow(
        'Rate limit exceeded',
      );
    });

    test('throws when words empty', async () => {
      const service = AIService.getInstance();

      await expect(service.generateExercises([], 'English', 'Spanish', 'user-empty-words')).rejects.toThrow(
        'Words array cannot be empty',
      );
    });

    test('logs usage', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      bedrockMock.on(InvokeModelCommand).resolves(createBedrockResponse(validExercisesJson()));

      const service = AIService.getInstance();
      const userId = `user-logs-${Date.now()}`;

      await service.generateExercises([{ word: 'hello', translation: 'hola' }], 'English', 'Spanish', userId);

      // Find the usage log call
      const logCalls = consoleSpy.mock.calls;
      const usageLog = logCalls.find((call) => {
        try {
          const parsed = JSON.parse(call[0] as string);
          return parsed.operation === 'generateExercises' && parsed.userId === userId;
        } catch {
          return false;
        }
      });

      expect(usageLog).toBeDefined();
      const parsedLog = JSON.parse(usageLog![0] as string);
      expect(parsedLog.userId).toBe(userId);
      expect(parsedLog.operation).toBe('generateExercises');
      expect(parsedLog.tokenCount).toBeGreaterThan(0);
      expect(parsedLog.timestamp).toBeDefined();

      consoleSpy.mockRestore();
    });

    test('invalid JSON from Bedrock', async () => {
      bedrockMock.on(InvokeModelCommand).resolves(createBedrockResponse('this is not json at all'));

      const service = AIService.getInstance();
      const userId = `user-invalid-json-${Date.now()}`;

      await expect(
        service.generateExercises([{ word: 'hello', translation: 'hola' }], 'English', 'Spanish', userId),
      ).rejects.toThrow('Failed to parse exercises response as JSON');
    });

    test('all exercises invalid returns error', async () => {
      const invalidExercises = JSON.stringify([
        // Missing prompt
        {
          options: ['a', 'b', 'c'],
          correctOptionIndex: 0,
          exerciseType: 'fill_in_the_blank',
          sourceWord: 'test',
        },
        // Too few options
        {
          prompt: 'Question?',
          options: ['a', 'b'],
          correctOptionIndex: 0,
          exerciseType: 'fill_in_the_blank',
          sourceWord: 'test',
        },
      ]);

      bedrockMock.on(InvokeModelCommand).resolves(createBedrockResponse(invalidExercises));

      const service = AIService.getInstance();
      const userId = `user-all-invalid-${Date.now()}`;

      await expect(
        service.generateExercises([{ word: 'hello', translation: 'hola' }], 'English', 'Spanish', userId),
      ).rejects.toThrow('No valid exercises could be generated');
    });
  });
});
