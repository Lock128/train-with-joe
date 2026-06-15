import * as crypto from 'crypto';
import { TrainingRepository } from '../repositories/training-repository';
import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';
import type {
  Training,
  TrainingMode,
  TrainingDirection,
  TrainingWord,
  TrainingExecution,
  TrainingResult,
  MultipleChoiceOption,
  SanitizedExecution,
  VerbConjugationExercise,
  AIExercise,
} from '../model/domain/Training';
import { getAIService } from './ai-service';

interface DayExecutionEntry {
  executionId: string;
  trainingId: string;
  trainingName: string;
  startedAt: string;
  completedAt?: string;
  correctCount: number;
  incorrectCount: number;
  durationSeconds?: number;
}

interface PerWordStat {
  word: string;
  translation: string;
  correctCount: number;
  totalCount: number;
  accuracyPercentage: number;
}

interface MissedWord {
  word: string;
  translation: string;
  incorrectCount: number;
}

interface AccuracyTrendEntry {
  executionId: string;
  startedAt: string;
  accuracy: number;
}

interface EnrichedWord {
  word: string;
  translation?: string;
  definition?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
}

/**
 * Service for managing vocabulary trainings
 * Handles training creation, execution, answer submission, and statistics
 */
export class TrainingService {
  private static instance: TrainingService;

  private constructor() {}

  public static getInstance(): TrainingService {
    if (!TrainingService.instance) {
      TrainingService.instance = new TrainingService();
    }
    return TrainingService.instance;
  }

  /**
   * Strip sensitive answer data from an execution before returning to the client.
   * Replaces words with promptWords (prompt-side only, no answers),
   * strips correctOptionIndex from AI exercises and multiple-choice options,
   * strips expectedForms from verb conjugation exercises.
   */
  private sanitizeExecution(
    execution: TrainingExecution,
    direction: TrainingDirection = 'WORD_TO_TRANSLATION',
  ): SanitizedExecution {
    const { words, ...rest } = execution;
    const reversed = direction === 'TRANSLATION_TO_WORD';
    return {
      ...rest,
      promptWords: words?.map((w) => ({
        word: reversed ? w.translation : w.word,
        vocabularyListId: w.vocabularyListId,
        unit: w.unit,
      })),
      aiExercises: execution.aiExercises?.map(({ correctOptionIndex: _correctOptionIndex, ...ex }) => ex),
      multipleChoiceOptions: execution.multipleChoiceOptions?.map(
        ({ correctOptionIndex: _correctOptionIndex, ...opt }) => opt,
      ),
      verbConjugationExercises: execution.verbConjugationExercises?.map(
        ({ expectedForms: _expectedForms, ...ex }) => ex,
      ),
    };
  }

  /**
   * Shuffle an array in-place using Fisher-Yates algorithm and return a slice.
   */
  private shuffleAndSlice<T>(items: T[], count: number): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items.slice(0, count);
  }

  /**
   * Enrich selected words with full vocabulary list details (definition, partOfSpeech, exampleSentence)
   * and resolve source/target languages from vocabulary lists.
   */
  private async enrichWordsForAI(
    selectedWords: TrainingWord[],
    vocabularyListIds: string[],
    training: { sourceLanguage?: string; targetLanguage?: string },
  ): Promise<{
    enrichedWords: EnrichedWord[];
    sourceLanguage: string;
    targetLanguage: string;
  }> {
    const vocabRepo = VocabularyListRepository.getInstance();
    let sourceLanguage = training.sourceLanguage || 'English';
    let targetLanguage = training.targetLanguage || 'English';
    const enrichedWords: EnrichedWord[] = [];

    for (const listId of vocabularyListIds) {
      const list = await vocabRepo.getById(listId);
      if (!list) continue;
      if (!training.sourceLanguage && list.sourceLanguage) sourceLanguage = list.sourceLanguage;
      if (!training.targetLanguage && list.targetLanguage) targetLanguage = list.targetLanguage;

      for (const selectedWord of selectedWords) {
        if (selectedWord.vocabularyListId === listId) {
          const fullWord = list.words.find((w) => w.word === selectedWord.word);
          enrichedWords.push({
            word: selectedWord.word,
            translation: selectedWord.translation,
            definition: fullWord?.definition,
            partOfSpeech: fullWord?.partOfSpeech,
            exampleSentence: fullWord?.exampleSentence,
          });
        }
      }
    }

    return { enrichedWords, sourceLanguage, targetLanguage };
  }

  /**
   * Generate AI exercises and create a training execution for them.
   */
  private async createAITrainingExecution(
    trainingId: string,
    userId: string,
    words: TrainingWord[],
    vocabularyListIds: string[],
    training: { sourceLanguage?: string; targetLanguage?: string; direction: TrainingDirection },
  ): Promise<{ success: boolean; execution?: SanitizedExecution; error?: string }> {
    const { enrichedWords, sourceLanguage, targetLanguage } = await this.enrichWordsForAI(
      words,
      vocabularyListIds,
      training,
    );

    const aiService = getAIService();
    const aiExercises: AIExercise[] = await aiService.generateExercises(
      enrichedWords,
      sourceLanguage,
      targetLanguage,
      userId,
    );

    const trainingRepo = TrainingRepository.getInstance();
    const execution: TrainingExecution = {
      id: crypto.randomUUID(),
      trainingId,
      userId,
      startedAt: new Date().toISOString(),
      results: [],
      words,
      aiExercises,
      correctCount: 0,
      incorrectCount: 0,
    };

    await trainingRepo.createExecution(execution);
    return { success: true, execution: this.sanitizeExecution(execution, training.direction) };
  }

  /**
   * Generate verb conjugation exercises and create a training execution.
   */
  private async createVerbConjugationExecution(
    trainingId: string,
    userId: string,
    wordCount: number,
    direction: TrainingDirection,
  ): Promise<{ success: boolean; execution?: SanitizedExecution; error?: string }> {
    const aiService = getAIService();
    const verbExercises: VerbConjugationExercise[] = await aiService.generateVerbConjugationExercises(
      wordCount,
      userId,
    );

    const trainingRepo = TrainingRepository.getInstance();
    const execution: TrainingExecution = {
      id: crypto.randomUUID(),
      trainingId,
      userId,
      startedAt: new Date().toISOString(),
      results: [],
      words: [],
      verbConjugationExercises: verbExercises,
      correctCount: 0,
      incorrectCount: 0,
    };

    await trainingRepo.createExecution(execution);
    return { success: true, execution: this.sanitizeExecution(execution, direction) };
  }

  /**
   * Record a training result, update execution counts, check completion, persist, and return.
   */
  private async recordResultAndUpdate(
    executionId: string,
    execution: TrainingExecution,
    result: TrainingResult,
    totalExercises: number,
    direction: TrainingDirection,
  ): Promise<{
    success: boolean;
    result?: TrainingResult;
    completed?: boolean;
    execution?: SanitizedExecution;
  }> {
    execution.results.push(result);
    if (result.correct) {
      execution.correctCount++;
    } else {
      execution.incorrectCount++;
    }

    if (execution.results.length === totalExercises) {
      execution.completedAt = new Date().toISOString();
    }

    const trainingRepo = TrainingRepository.getInstance();
    await trainingRepo.updateExecution(executionId, {
      results: execution.results,
      correctCount: execution.correctCount,
      incorrectCount: execution.incorrectCount,
      completedAt: execution.completedAt,
    });

    return {
      success: true,
      result,
      completed: !!execution.completedAt,
      execution: this.sanitizeExecution(execution, direction),
    };
  }

  /**
   * Calculate duration in seconds for a completed/aborted execution.
   */
  private getExecutionDurationSeconds(execution: {
    startedAt: string;
    completedAt?: string;
    abortedAt?: string;
  }): number | undefined {
    const endTime = execution.completedAt || execution.abortedAt;
    if (!endTime) return undefined;
    const start = new Date(execution.startedAt).getTime();
    const end = new Date(endTime).getTime();
    return (end - start) / 1000;
  }

  /**
   * Collect words from vocabulary lists, applying unit filtering and deduplication.
   */
  private async collectWordsFromLists(
    vocabularyListIds: string[],
    units?: string[],
    deduplicate: boolean = false,
  ): Promise<TrainingWord[]> {
    const vocabRepo = VocabularyListRepository.getInstance();
    const collectedWords: TrainingWord[] = [];

    for (const listId of vocabularyListIds) {
      const list = await vocabRepo.getById(listId);
      if (!list) continue;

      let validWords = list.words.filter((w) => w.translation && w.translation.length > 0);

      // Filter by units if specified
      if (units && units.length > 0) {
        validWords = validWords.filter((w) => w.unit && units.includes(w.unit));
      }

      for (const word of validWords) {
        if (deduplicate) {
          const isDuplicate = collectedWords.some((cw) => cw.word === word.word && cw.translation === word.translation);
          if (isDuplicate) continue;
        }

        const trainingWord: TrainingWord = {
          word: word.word,
          translation: word.translation!,
          vocabularyListId: list.id,
        };
        if (word.unit) {
          trainingWord.unit = word.unit;
        }
        collectedWords.push(trainingWord);
      }
    }

    return collectedWords;
  }

  /**
   * Create a new training from vocabulary lists
   */
  async createTraining(
    userId: string,
    vocabularyListIds: string[],
    mode: TrainingMode,
    name?: string,
    wordCount?: number,
    direction?: TrainingDirection,
    units?: string[],
    isRandomized?: boolean,
    randomizedWordCount?: number,
    multipleChoiceOptionCount?: number,
    sourceLanguage?: string,
    targetLanguage?: string,
  ): Promise<{ success: boolean; training?: Training; error?: string }> {
    try {
      // Randomized training path: store configuration only, skip word fetching
      if (isRandomized) {
        // Validate randomizedWordCount
        let effectiveWordCount = randomizedWordCount ?? 10;
        if (effectiveWordCount < 1) {
          return { success: false, error: 'Randomized word count must be at least 1' };
        }
        if (effectiveWordCount > 100) {
          effectiveWordCount = 100;
        }

        const now = new Date().toISOString();
        const training: Training = {
          id: crypto.randomUUID(),
          userId,
          name: name || `Training - ${new Date().toLocaleDateString()}`,
          mode,
          direction: direction || 'WORD_TO_TRANSLATION',
          vocabularyListIds,
          words: [],
          isRandomized: true,
          randomizedWordCount: effectiveWordCount,
          createdAt: now,
          updatedAt: now,
        };

        if (sourceLanguage) training.sourceLanguage = sourceLanguage;
        if (targetLanguage) training.targetLanguage = targetLanguage;
        if (multipleChoiceOptionCount && [3, 4, 5].includes(multipleChoiceOptionCount)) {
          training.multipleChoiceOptionCount = multipleChoiceOptionCount;
        }
        if (units && units.length > 0) {
          training.units = units;
        }

        const trainingRepo = TrainingRepository.getInstance();
        await trainingRepo.create(training);
        return { success: true, training };
      }

      // VERB_CONJUGATION mode doesn't require vocabulary list words - exercises are AI-generated
      if (mode === 'VERB_CONJUGATION') {
        const effectiveWordCount = wordCount ? Math.min(Math.max(1, wordCount), 30) : 10;
        const now = new Date().toISOString();
        const training: Training = {
          id: crypto.randomUUID(),
          userId,
          name: name || `Irregular Verbs - ${new Date().toLocaleDateString()}`,
          mode,
          direction: direction || 'WORD_TO_TRANSLATION',
          vocabularyListIds: vocabularyListIds || [],
          words: [],
          isRandomized: true,
          randomizedWordCount: effectiveWordCount,
          createdAt: now,
          updatedAt: now,
        };

        if (sourceLanguage) training.sourceLanguage = sourceLanguage;
        if (targetLanguage) training.targetLanguage = targetLanguage;

        const trainingRepo = TrainingRepository.getInstance();
        await trainingRepo.create(training);
        return { success: true, training };
      }

      let words = await this.collectWordsFromLists(vocabularyListIds, units);

      if (words.length === 0) {
        return { success: false, error: 'No words available from the selected vocabulary lists' };
      }

      // Determine how many words to include (max 100)
      const maxWords = 100;
      const requestedCount = wordCount ? Math.min(Math.max(1, wordCount), maxWords) : Math.min(words.length, maxWords);

      if (words.length > requestedCount) {
        words = this.shuffleAndSlice(words, requestedCount);
      }

      const now = new Date().toISOString();
      const training: Training = {
        id: crypto.randomUUID(),
        userId,
        name: name || `Training - ${new Date().toLocaleDateString()}`,
        mode,
        direction: direction || 'WORD_TO_TRANSLATION',
        vocabularyListIds,
        words,
        createdAt: now,
        updatedAt: now,
      };

      if (sourceLanguage) training.sourceLanguage = sourceLanguage;
      if (targetLanguage) training.targetLanguage = targetLanguage;
      if (multipleChoiceOptionCount && [3, 4, 5].includes(multipleChoiceOptionCount)) {
        training.multipleChoiceOptionCount = multipleChoiceOptionCount;
      }

      const trainingRepo = TrainingRepository.getInstance();
      await trainingRepo.create(training);
      return { success: true, training };
    } catch (error) {
      console.error('Error creating training:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create training' };
    }
  }

  /**
   * Update training words
   */
  async updateTraining(
    trainingId: string,
    userId: string,
    words?: TrainingWord[],
    name?: string,
  ): Promise<{ success: boolean; training?: Training; error?: string }> {
    try {
      const trainingRepo = TrainingRepository.getInstance();
      const training = await trainingRepo.getById(trainingId);

      if (!training) {
        return { success: false, error: 'Training not found' };
      }

      if (training.userId !== userId) {
        return { success: false, error: 'Not authorized' };
      }

      if (words !== undefined && words.length === 0) {
        return { success: false, error: 'Cannot remove last word from training' };
      }

      const updates: Partial<Training> = {};
      if (words !== undefined) updates.words = words;
      if (name !== undefined && name.trim().length > 0) updates.name = name.trim();

      if (Object.keys(updates).length === 0) {
        return { success: true, training };
      }

      const updated = await trainingRepo.update(trainingId, updates);

      return { success: true, training: updated };
    } catch (error) {
      console.error('Error updating training:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update training' };
    }
  }

  /**
   * Generate multiple choice options from a word list
   */
  private generateMultipleChoiceOptions(
    words: TrainingWord[],
    direction: TrainingDirection,
    optionCount: number = 5,
  ): MultipleChoiceOption[] {
    const reversed = direction === 'TRANSLATION_TO_WORD';
    const distractorCount = optionCount - 1;
    return words.map((word, index) => {
      const correctAnswer = reversed ? word.word : word.translation;
      // Get unique distractor answers from other words, excluding the correct answer
      const otherAnswers = words
        .filter((_, i) => i !== index)
        .map((w) => (reversed ? w.word : w.translation))
        .filter((answer, i, arr) => answer !== correctAnswer && arr.indexOf(answer) === i);

      // Pick random distractors based on optionCount
      const shuffled = otherAnswers.sort(() => Math.random() - 0.5);
      const distractors = shuffled.slice(0, distractorCount);

      // Build options array with correct answer + distractors, then shuffle
      const options = [correctAnswer, ...distractors];
      const shuffledOptions = options.sort(() => Math.random() - 0.5);
      const correctOptionIndex = shuffledOptions.indexOf(correctAnswer);

      return {
        wordIndex: index,
        options: shuffledOptions,
        correctOptionIndex,
      };
    });
  }

  /**
   * Create a standard (TEXT_INPUT or MULTIPLE_CHOICE) training execution.
   */
  private async createStandardExecution(
    trainingId: string,
    userId: string,
    words: TrainingWord[],
    training: {
      mode: TrainingMode;
      direction: TrainingDirection;
      multipleChoiceOptionCount?: number;
      isRandomized?: boolean;
    },
  ): Promise<{ success: boolean; execution?: SanitizedExecution; error?: string }> {
    if (training.mode === 'MULTIPLE_CHOICE' && words.length < 3) {
      return { success: false, error: 'Multiple-choice requires at least 3 words' };
    }

    let multipleChoiceOptions: MultipleChoiceOption[] | undefined;
    if (training.mode === 'MULTIPLE_CHOICE') {
      multipleChoiceOptions = this.generateMultipleChoiceOptions(
        words,
        training.direction,
        training.multipleChoiceOptionCount ?? 5,
      );
    }

    const trainingRepo = TrainingRepository.getInstance();
    const execution: TrainingExecution = {
      id: crypto.randomUUID(),
      trainingId,
      userId,
      startedAt: new Date().toISOString(),
      results: [],
      multipleChoiceOptions,
      words: training.isRandomized ? words : undefined,
      correctCount: 0,
      incorrectCount: 0,
    };

    await trainingRepo.createExecution(execution);
    return { success: true, execution: this.sanitizeExecution(execution, training.direction) };
  }

  /**
   * Start a new training execution
   */
  async startTraining(
    trainingId: string,
    userId: string,
  ): Promise<{ success: boolean; execution?: SanitizedExecution; error?: string }> {
    try {
      const trainingRepo = TrainingRepository.getInstance();
      const training = await trainingRepo.getById(trainingId);

      if (!training) {
        return { success: false, error: 'Training not found' };
      }

      if (training.userId !== userId) {
        return { success: false, error: 'Not authorized' };
      }

      if (training.isRandomized) {
        // VERB_CONJUGATION mode: generate exercises directly via AI, no vocabulary words needed
        if (training.mode === 'VERB_CONJUGATION') {
          try {
            return await this.createVerbConjugationExecution(
              trainingId,
              userId,
              training.randomizedWordCount ?? 10,
              training.direction,
            );
          } catch (aiError) {
            const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
            return { success: false, error: 'Failed to generate verb conjugation exercises: ' + errorMessage };
          }
        }

        // Randomized path: fetch words dynamically from vocabulary lists
        const collectedWords = await this.collectWordsFromLists(training.vocabularyListIds, training.units, true);

        if (collectedWords.length === 0) {
          return { success: false, error: 'No words available from the selected vocabulary lists' };
        }

        // Select up to randomizedWordCount words using Fisher-Yates shuffle
        const selectedWords = this.shuffleAndSlice(collectedWords, training.randomizedWordCount ?? 10);

        if (training.mode === 'AI_TRAINING') {
          if (selectedWords.length < 1) {
            return { success: false, error: 'No words available from the selected vocabulary lists' };
          }

          try {
            return await this.createAITrainingExecution(
              trainingId,
              userId,
              selectedWords,
              training.vocabularyListIds,
              training,
            );
          } catch (aiError) {
            const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
            return { success: false, error: 'Failed to generate AI exercises: ' + errorMessage };
          }
        }

        return this.createStandardExecution(trainingId, userId, selectedWords, training);
      }

      // Static path: AI_TRAINING mode
      if (training.mode === 'AI_TRAINING') {
        if (training.words.length < 1) {
          return { success: false, error: 'No words available from the selected vocabulary lists' };
        }

        try {
          return await this.createAITrainingExecution(
            trainingId,
            userId,
            training.words,
            training.vocabularyListIds,
            training,
          );
        } catch (aiError) {
          const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
          return { success: false, error: 'Failed to generate AI exercises: ' + errorMessage };
        }
      }

      // Static path: VERB_CONJUGATION mode
      if (training.mode === 'VERB_CONJUGATION') {
        try {
          const wordCount = training.words.length > 0 ? training.words.length : 10;
          return await this.createVerbConjugationExecution(trainingId, userId, wordCount, training.direction);
        } catch (aiError) {
          const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
          return { success: false, error: 'Failed to generate verb conjugation exercises: ' + errorMessage };
        }
      }

      return this.createStandardExecution(trainingId, userId, training.words, training);
    } catch (error) {
      console.error('Error starting training:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to start training' };
    }
  }

  /**
   * Submit an answer for a training execution
   */
  async submitAnswer(
    executionId: string,
    userId: string,
    wordIndex: number,
    answer: string,
  ): Promise<{
    success: boolean;
    result?: TrainingResult;
    completed?: boolean;
    execution?: SanitizedExecution;
    error?: string;
  }> {
    try {
      const trainingRepo = TrainingRepository.getInstance();
      const execution = await trainingRepo.getExecutionById(executionId);

      if (!execution) {
        return { success: false, error: 'Training execution not found' };
      }

      if (execution.userId !== userId) {
        return { success: false, error: 'Not authorized' };
      }

      if (execution.completedAt) {
        return { success: false, error: 'Training execution already completed' };
      }

      if (execution.abortedAt) {
        return { success: false, error: 'Training execution was aborted' };
      }

      const alreadyAnswered = execution.results.some((r) => r.wordIndex === wordIndex);
      if (alreadyAnswered) {
        return { success: false, error: 'Answer already submitted for this word' };
      }

      const training = await trainingRepo.getById(execution.trainingId);
      if (!training) {
        return { success: false, error: 'Training not found' };
      }

      // AI_TRAINING answer submission path
      if (training.mode === 'AI_TRAINING') {
        const aiExercises = execution.aiExercises;
        if (!aiExercises || wordIndex < 0 || wordIndex >= aiExercises.length) {
          return { success: false, error: 'Invalid word index' };
        }

        const exercise = aiExercises[wordIndex];
        const selectedIndex = parseInt(answer, 10);
        const correct = selectedIndex === exercise.correctOptionIndex;

        return this.recordResultAndUpdate(
          executionId,
          execution,
          {
            wordIndex,
            word: exercise.prompt,
            expectedAnswer: exercise.options[exercise.correctOptionIndex],
            userAnswer: exercise.options[selectedIndex] ?? answer,
            correct,
          },
          aiExercises.length,
          training.direction,
        );
      }

      // VERB_CONJUGATION answer submission path
      if (training.mode === 'VERB_CONJUGATION') {
        const verbExercises = execution.verbConjugationExercises;
        if (!verbExercises || wordIndex < 0 || wordIndex >= verbExercises.length) {
          return { success: false, error: 'Invalid word index' };
        }

        const exercise = verbExercises[wordIndex];
        const expectedForms = exercise.expectedForms;

        // Parse user answer: split by comma, trim, lowercase
        const userForms = answer.split(',').map((f) => f.trim().toLowerCase());
        const expectedNormalized = expectedForms.map((f) => f.trim().toLowerCase());

        // Check correctness: all forms must match in order
        const correct =
          userForms.length === expectedNormalized.length &&
          userForms.every((form, i) => form === expectedNormalized[i]);

        return this.recordResultAndUpdate(
          executionId,
          execution,
          {
            wordIndex,
            word: exercise.prompt,
            expectedAnswer: expectedForms.join(', '),
            userAnswer: answer,
            correct,
          },
          verbExercises.length,
          training.direction,
        );
      }

      // Dual-path word resolution: randomized uses execution.words, static uses training.words
      const wordList = training.isRandomized ? execution.words! : training.words;
      const word = wordList[wordIndex];
      if (!word) {
        return { success: false, error: 'Invalid word index' };
      }

      const reversed = training.direction === 'TRANSLATION_TO_WORD';
      const expectedAnswer = reversed ? word.word : word.translation;
      const promptWord = reversed ? word.translation : word.word;
      const correct = answer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();

      return this.recordResultAndUpdate(
        executionId,
        execution,
        { wordIndex, word: promptWord, expectedAnswer, userAnswer: answer, correct },
        wordList.length,
        training.direction,
      );
    } catch (error) {
      console.error('Error submitting answer:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to submit answer' };
    }
  }

  /**
   * Abort an in-progress training execution, capturing time spent
   */
  async abortTraining(
    executionId: string,
    userId: string,
  ): Promise<{ success: boolean; execution?: SanitizedExecution | TrainingExecution; error?: string }> {
    try {
      const trainingRepo = TrainingRepository.getInstance();
      const execution = await trainingRepo.getExecutionById(executionId);

      if (!execution) {
        return { success: false, error: 'Training execution not found' };
      }

      if (execution.userId !== userId) {
        return { success: false, error: 'Not authorized' };
      }

      if (execution.completedAt) {
        return { success: false, error: 'Training execution already completed' };
      }

      if (execution.abortedAt) {
        return { success: false, error: 'Training execution already aborted' };
      }

      const abortedAt = new Date().toISOString();
      const updated = await trainingRepo.updateExecution(executionId, { abortedAt });

      const training = await trainingRepo.getById(execution.trainingId);
      const direction = training?.direction ?? 'WORD_TO_TRANSLATION';
      return { success: true, execution: updated ? this.sanitizeExecution(updated, direction) : undefined };
    } catch (error) {
      console.error('Error aborting training:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to abort training' };
    }
  }

  /**
   * Get a training with its executions
   */
  async getTraining(
    trainingId: string,
    userId: string,
  ): Promise<{ success: boolean; training?: Training & { executions?: TrainingExecution[] }; error?: string }> {
    try {
      const trainingRepo = TrainingRepository.getInstance();
      const training = await trainingRepo.getById(trainingId);

      if (!training) {
        return { success: false, error: 'Training not found' };
      }

      if (training.userId !== userId) {
        return { success: false, error: 'Not authorized' };
      }

      const executions = await trainingRepo.getExecutionsByTrainingId(trainingId);
      executions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

      return {
        success: true,
        training: { ...training, direction: training.direction || 'WORD_TO_TRANSLATION', executions },
      };
    } catch (error) {
      console.error('Error getting training:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get training' };
    }
  }

  /**
   * Get all trainings for a user
   */
  async getTrainings(userId: string): Promise<Training[]> {
    const trainingRepo = TrainingRepository.getInstance();
    return trainingRepo.getAllByUserId(userId);
  }

  /**
   * Get training statistics
   */
  async getTrainingStatistics(
    trainingId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    statistics?: {
      overallAccuracy: number;
      averageTimeSeconds: number;
      totalExecutions: number;
      perWordStatistics: PerWordStat[];
      mostMissedWords: MissedWord[];
      accuracyTrend: AccuracyTrendEntry[];
    };
    error?: string;
  }> {
    try {
      const trainingRepo = TrainingRepository.getInstance();
      const training = await trainingRepo.getById(trainingId);

      if (!training) {
        return { success: false, error: 'Training not found' };
      }

      if (training.userId !== userId) {
        return { success: false, error: 'Not authorized' };
      }

      const executions = await trainingRepo.getExecutionsByTrainingId(trainingId);

      let totalCorrect = 0;
      let totalAnswers = 0;

      // Per-word stats tracking
      const wordStats: Record<string, { correct: number; total: number }> = {};
      for (const word of training.words) {
        wordStats[word.word] = { correct: 0, total: 0 };
      }

      for (const execution of executions) {
        for (const result of execution.results) {
          totalCorrect += result.correct ? 1 : 0;
          totalAnswers++;
          if (!wordStats[result.word]) {
            wordStats[result.word] = { correct: 0, total: 0 };
          }
          wordStats[result.word].total++;
          if (result.correct) {
            wordStats[result.word].correct++;
          }
        }
      }

      const overallAccuracy = totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0;

      // Average time from completed and aborted executions
      const timedExecutions = executions.filter((e) => (e.completedAt || e.abortedAt) && e.startedAt);
      let averageTimeSeconds = 0;
      if (timedExecutions.length > 0) {
        const totalTime = timedExecutions.reduce((sum, e) => sum + (this.getExecutionDurationSeconds(e) ?? 0), 0);
        averageTimeSeconds = totalTime / timedExecutions.length;
      }

      const perWordStatistics = Object.entries(wordStats).map(([word, stats]) => {
        const trainingWord = training.words.find((w) => w.word === word);
        return {
          word,
          translation: trainingWord?.translation ?? '',
          correctCount: stats.correct,
          totalCount: stats.total,
          accuracyPercentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
        };
      });

      const mostMissedWords = perWordStatistics
        .map((s) => ({
          word: s.word,
          translation: s.translation,
          incorrectCount: s.totalCount - s.correctCount,
        }))
        .filter((s) => s.incorrectCount > 0)
        .sort((a, b) => b.incorrectCount - a.incorrectCount);

      const accuracyTrend = executions
        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
        .map((e) => {
          const total = e.correctCount + e.incorrectCount;
          return {
            executionId: e.id,
            startedAt: e.startedAt,
            accuracy: total > 0 ? (e.correctCount / total) * 100 : 0,
          };
        });

      return {
        success: true,
        statistics: {
          overallAccuracy,
          averageTimeSeconds,
          totalExecutions: executions.length,
          perWordStatistics,
          mostMissedWords,
          accuracyTrend,
        },
      };
    } catch (error) {
      console.error('Error getting training statistics:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get training statistics' };
    }
  }

  /**
   * Get training day statistics for a specific date
   */
  async getTrainingDayStatistics(
    userId: string,
    date: string,
  ): Promise<{
    success: boolean;
    dayStatistics?: {
      date: string;
      executions: DayExecutionEntry[];
      totalExecutions: number;
      totalCorrect: number;
      totalIncorrect: number;
    };
    error?: string;
  }> {
    try {
      const trainingRepo = TrainingRepository.getInstance();
      const trainings = await trainingRepo.getAllByUserId(userId);
      const dayExecutions: DayExecutionEntry[] = [];

      for (const training of trainings) {
        const executions = await trainingRepo.getExecutionsByTrainingId(training.id);

        for (const execution of executions) {
          const executionDate = execution.startedAt.substring(0, 10);
          if (executionDate === date) {
            dayExecutions.push({
              executionId: execution.id,
              trainingId: training.id,
              trainingName: training.name,
              startedAt: execution.startedAt,
              completedAt: execution.completedAt,
              correctCount: execution.correctCount,
              incorrectCount: execution.incorrectCount,
              durationSeconds: this.getExecutionDurationSeconds(execution),
            });
          }
        }
      }

      let totalCorrect = 0;
      let totalIncorrect = 0;
      for (const exec of dayExecutions) {
        totalCorrect += exec.correctCount;
        totalIncorrect += exec.incorrectCount;
      }

      return {
        success: true,
        dayStatistics: {
          date,
          executions: dayExecutions,
          totalExecutions: dayExecutions.length,
          totalCorrect,
          totalIncorrect,
        },
      };
    } catch (error) {
      console.error('Error getting training day statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get training day statistics',
      };
    }
  }

  /**
   * Get overview statistics across a date range - per-day training count and total learning time
   */
  async getTrainingOverviewStatistics(
    userId: string,
    fromDate: string,
    toDate: string,
  ): Promise<{
    success: boolean;
    statistics?: {
      dailySummaries: { date: string; trainingCount: number; totalLearningTimeSeconds: number }[];
      totalDays: number;
      totalTrainings: number;
      totalLearningTimeSeconds: number;
    };
    error?: string;
  }> {
    try {
      const trainingRepo = TrainingRepository.getInstance();
      const trainings = await trainingRepo.getAllByUserId(userId);

      const dayMap: Record<string, { trainingCount: number; totalLearningTimeSeconds: number }> = {};

      for (const training of trainings) {
        const executions = await trainingRepo.getExecutionsByTrainingId(training.id);

        for (const execution of executions) {
          const executionDate = execution.startedAt.substring(0, 10);
          if (executionDate < fromDate || executionDate > toDate) continue;

          if (!dayMap[executionDate]) {
            dayMap[executionDate] = { trainingCount: 0, totalLearningTimeSeconds: 0 };
          }

          dayMap[executionDate].trainingCount++;

          const duration = this.getExecutionDurationSeconds(execution);
          if (duration !== undefined) {
            dayMap[executionDate].totalLearningTimeSeconds += duration;
          }
        }
      }

      const dailySummaries = Object.entries(dayMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      let totalTrainings = 0;
      let totalLearningTimeSeconds = 0;
      for (const day of dailySummaries) {
        totalTrainings += day.trainingCount;
        totalLearningTimeSeconds += day.totalLearningTimeSeconds;
      }

      return {
        success: true,
        statistics: {
          dailySummaries,
          totalDays: dailySummaries.length,
          totalTrainings,
          totalLearningTimeSeconds,
        },
      };
    } catch (error) {
      console.error('Error getting training overview statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get training overview statistics',
      };
    }
  }
}
