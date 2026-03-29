/**
 * Domain models for VocabularyList entity
 */

export interface VocabularyWord {
  word: string;
  definition: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  difficulty?: string;
}

export interface VocabularyList {
  id: string;
  userId: string;
  title?: string;
  sourceImageKey?: string;
  words: VocabularyWord[];
  language?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VocabularyListRecord extends VocabularyList {
  // Additional DynamoDB-specific fields can be added here if needed
  ttl?: number;
}
