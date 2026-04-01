/**
 * Domain models for Training entity
 */

export type TrainingMode = 'TEXT_INPUT' | 'MULTIPLE_CHOICE';

export interface TrainingWord {
  word: string;
  translation: string;
  vocabularyListId: string;
}

export interface Training {
  id: string;
  userId: string;
  name: string;
  mode: TrainingMode;
  vocabularyListIds: string[];
  words: TrainingWord[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainingResult {
  wordIndex: number;
  word: string;
  expectedAnswer: string;
  userAnswer: string;
  correct: boolean;
}

export interface MultipleChoiceOption {
  wordIndex: number;
  options: string[];
  correctOptionIndex: number;
}

export interface TrainingExecution {
  id: string;
  trainingId: string;
  userId: string;
  startedAt: string;
  completedAt?: string;
  results: TrainingResult[];
  multipleChoiceOptions?: MultipleChoiceOption[];
  correctCount: number;
  incorrectCount: number;
}
