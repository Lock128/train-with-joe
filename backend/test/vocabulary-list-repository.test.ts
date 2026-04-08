import { describe, test, expect, beforeEach } from 'vitest';
import { VocabularyListRepository } from '../src/repositories/vocabulary-list-repository';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { VocabularyList } from '../src/model/domain/VocabularyList';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('VocabularyListRepository', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('create', () => {
    test('should create a new vocabulary list successfully', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listData: VocabularyList = {
        id: 'vocab-123',
        userId: 'user-123',
        title: 'Kitchen Items',
        words: [
          {
            word: 'spatula',
            definition: 'A flat utensil used for mixing and spreading',
            partOfSpeech: 'noun',
            exampleSentence: 'Use the spatula to flip the pancake.',
            difficulty: 'easy',
          },
        ],
        sourceLanguage: 'English',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create(listData);

      expect(result).toBeDefined();
      expect(result.id).toBe(listData.id);
      expect(result.userId).toBe(listData.userId);
      expect(result.title).toBe(listData.title);
      expect(result.words).toHaveLength(1);
      expect(result.words[0].word).toBe('spatula');
      expect(result.sourceLanguage).toBe('English');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    test('should throw error when vocabulary list already exists', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listData: VocabularyList = {
        id: 'vocab-123',
        userId: 'user-123',
        words: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).rejects({
        name: 'ConditionalCheckFailedException',
        message: 'Item already exists',
      });

      await expect(repository.create(listData)).rejects.toThrow('already exists');
    });
  });

  describe('getById', () => {
    test('should retrieve vocabulary list by id', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listId = 'vocab-123';
      const mockList: VocabularyList = {
        id: listId,
        userId: 'user-123',
        title: 'Animals',
        words: [
          {
            word: 'elephant',
            definition: 'A large mammal with a trunk',
          },
        ],
        sourceLanguage: 'English',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).resolves({
        Item: mockList,
      });

      const result = await repository.getById(listId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(listId);
      expect(result?.userId).toBe(mockList.userId);
      expect(result?.title).toBe('Animals');
      expect(result?.words).toHaveLength(1);
    });

    test('should return null when vocabulary list not found', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listId = 'non-existent';

      ddbMock.on(GetCommand).resolves({});

      const result = await repository.getById(listId);

      expect(result).toBeNull();
    });

    test('should throw error on DynamoDB failure', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listId = 'vocab-123';

      ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

      await expect(repository.getById(listId)).rejects.toThrow('Failed to get vocabulary list');
    });
  });

  describe('getAllByUserId', () => {
    test('should retrieve multiple vocabulary lists by userId using GSI', async () => {
      const repository = VocabularyListRepository.getInstance();
      const userId = 'user-123';
      const mockLists: VocabularyList[] = [
        {
          id: 'vocab-1',
          userId,
          title: 'Kitchen Items',
          words: [{ word: 'spatula', definition: 'A flat utensil' }],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'vocab-2',
          userId,
          title: 'Animals',
          words: [{ word: 'elephant', definition: 'A large mammal' }],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockLists,
      });

      const result = await repository.getAllByUserId(userId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('vocab-1');
      expect(result[1].id).toBe('vocab-2');
    });

    test('should return empty array when no vocabulary lists found', async () => {
      const repository = VocabularyListRepository.getInstance();
      const userId = 'user-without-lists';

      ddbMock.on(QueryCommand).resolves({
        Items: [],
      });

      const result = await repository.getAllByUserId(userId);

      expect(result).toEqual([]);
    });

    test('should throw error on DynamoDB failure', async () => {
      const repository = VocabularyListRepository.getInstance();
      const userId = 'user-123';

      ddbMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

      await expect(repository.getAllByUserId(userId)).rejects.toThrow('Failed to get vocabulary lists by userId');
    });
  });

  describe('update', () => {
    test('should update vocabulary list successfully', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listId = 'vocab-123';
      const updates = { title: 'Updated Title' };
      const updatedList: VocabularyList = {
        id: listId,
        userId: 'user-123',
        title: 'Updated Title',
        words: [{ word: 'spatula', definition: 'A flat utensil' }],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(UpdateCommand).resolves({
        Attributes: updatedList,
      });

      const result = await repository.update(listId, updates);

      expect(result).toBeDefined();
      expect(result.id).toBe(listId);
      expect(result.title).toBe('Updated Title');
      expect(result.updatedAt).toBeDefined();
    });

    test('should throw error when vocabulary list not found', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listId = 'non-existent';
      const updates = { title: 'Updated Title' };

      ddbMock.on(UpdateCommand).rejects({
        name: 'ConditionalCheckFailedException',
        message: 'Item does not exist',
      });

      await expect(repository.update(listId, updates)).rejects.toThrow('not found');
    });

    test('should handle empty updates gracefully', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listId = 'vocab-123';
      const existingList: VocabularyList = {
        id: listId,
        userId: 'user-123',
        title: 'Kitchen Items',
        words: [{ word: 'spatula', definition: 'A flat utensil' }],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).resolves({
        Item: existingList,
      });

      const result = await repository.update(listId, {});

      expect(result).toBeDefined();
      expect(result.id).toBe(listId);
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('delete', () => {
    test('should delete vocabulary list successfully', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listId = 'vocab-123';

      ddbMock.on(DeleteCommand).resolves({});

      await expect(repository.delete(listId)).resolves.not.toThrow();
    });

    test('should throw error on DynamoDB failure', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listId = 'vocab-123';

      ddbMock.on(DeleteCommand).rejects(new Error('DynamoDB error'));

      await expect(repository.delete(listId)).rejects.toThrow('Failed to delete vocabulary list');
    });
  });

  describe('edge cases', () => {
    test('should handle vocabulary list with minimal fields', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listData: VocabularyList = {
        id: 'vocab-123',
        userId: 'user-123',
        words: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create(listData);

      expect(result).toBeDefined();
      expect(result.id).toBe(listData.id);
      expect(result.title).toBeUndefined();
      expect(result.sourceImageKey).toBeUndefined();
      expect(result.sourceLanguage).toBeUndefined();
      expect(result.words).toEqual([]);
    });

    test('should handle vocabulary list with all optional fields populated', async () => {
      const repository = VocabularyListRepository.getInstance();
      const listData: VocabularyList = {
        id: 'vocab-123',
        userId: 'user-123',
        title: 'Full Vocabulary List',
        sourceImageKey: 's3://bucket/image.jpg',
        words: [
          {
            word: 'spatula',
            definition: 'A flat utensil used for mixing',
            partOfSpeech: 'noun',
            exampleSentence: 'Use the spatula to flip the pancake.',
            difficulty: 'easy',
          },
        ],
        sourceLanguage: 'English',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create(listData);

      expect(result).toBeDefined();
      expect(result.title).toBe(listData.title);
      expect(result.sourceImageKey).toBe(listData.sourceImageKey);
      expect(result.sourceLanguage).toBe(listData.sourceLanguage);
      expect(result.words[0].partOfSpeech).toBe('noun');
      expect(result.words[0].exampleSentence).toBe('Use the spatula to flip the pancake.');
      expect(result.words[0].difficulty).toBe('easy');
    });

    test('should handle vocabulary list with many words', async () => {
      const repository = VocabularyListRepository.getInstance();
      const manyWords = Array.from({ length: 50 }, (_, i) => ({
        word: `word-${i}`,
        definition: `Definition for word ${i}`,
        partOfSpeech: 'noun',
        difficulty: i < 10 ? 'easy' : i < 30 ? 'medium' : 'hard',
      }));

      const listData: VocabularyList = {
        id: 'vocab-big',
        userId: 'user-123',
        title: 'Large Vocabulary List',
        words: manyWords,
        sourceLanguage: 'English',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create(listData);

      expect(result).toBeDefined();
      expect(result.words).toHaveLength(50);
      expect(result.words[0].word).toBe('word-0');
      expect(result.words[49].word).toBe('word-49');
    });
  });
});
