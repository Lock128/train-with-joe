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
  flagged?: boolean;
}

export interface VocabularyList {
  id: string;
  userId: string;
  title?: string;
  sourceImageKey?: string;
  sourceImageKeys?: string[];
  words: VocabularyWord[];
  sourceLanguage?: string;
  targetLanguage?: string;
  status?: VocabularyListStatus;
  errorMessage?: string;
  isPublic?: string; // Stored as 'true'/'false' string for DynamoDB GSI compatibility
  publisher?: string;
  schoolForm?: string;
  grade?: string;
  isbn?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VocabularyListRecord extends VocabularyList {
  // Additional DynamoDB-specific fields can be added here if needed
  ttl?: number;
}
