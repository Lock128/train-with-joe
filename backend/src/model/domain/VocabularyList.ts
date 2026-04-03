/**
 * Domain models for VocabularyList entity
 */

export type VocabularyListStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface VocabularyWord {
  word: string;
  translation?: string;
  definition: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  difficulty?: string;
  unit?: string;
}

export interface VocabularyList {
  id: string;
  userId: string;
  title?: string;
  sourceImageKey?: string;
  words: VocabularyWord[];
  sourceLanguage?: string;
  targetLanguage?: string;
  status?: VocabularyListStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VocabularyListRecord extends VocabularyList {
  // Additional DynamoDB-specific fields can be added here if needed
  ttl?: number;
}
