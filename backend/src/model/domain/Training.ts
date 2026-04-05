/**
 * Domain models for Training entity
 */

export type TrainingMode = 'TEXT_INPUT' | 'MULTIPLE_CHOICE';
export type TrainingDirection = 'WORD_TO_TRANSLATION' | 'TRANSLATION_TO_WORD';

export interface TrainingWord {
  word: string;
  translation: string;
  vocabularyListId: string;
  unit?: string;
}

export interface Training {
  id: string;
  userId: string;
  name: string;
  mode: TrainingMode;
  direction: TrainingDirection;
  vocabularyListIds: string[];
  words: TrainingWord[];
  isRandomized?: boolean;
  randomizedWordCount?: number;
  units?: string[];
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
  abortedAt?: string;
  results: TrainingResult[];
  multipleChoiceOptions?: MultipleChoiceOption[];
  words?: TrainingWord[];
  correctCount: number;
  incorrectCount: number;
}
