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
} from '../model/domain/Training';
import { getAIService } from './ai-service';

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

      // Static training path: existing behavior unchanged
      const vocabRepo = VocabularyListRepository.getInstance();
      let words: TrainingWord[] = [];

      for (const listId of vocabularyListIds) {
        const list = await vocabRepo.getById(listId);
        if (!list) continue;

        let validWords = list.words.filter((w) => w.translation);

        // Filter by units if specified
        if (units && units.length > 0) {
          validWords = validWords.filter((w) => w.unit && units.includes(w.unit));
        }

        for (const word of validWords) {
          const trainingWord: TrainingWord = {
            word: word.word,
            translation: word.translation!,
            vocabularyListId: list.id,
          };
          if (word.unit) {
            trainingWord.unit = word.unit;
          }
          words.push(trainingWord);
        }
      }

      if (words.length === 0) {
        return { success: false, error: 'No words available from the selected vocabulary lists' };
      }

      // Determine how many words to include (max 100)
      const maxWords = 100;
      const requestedCount = wordCount ? Math.min(Math.max(1, wordCount), maxWords) : Math.min(words.length, maxWords);

      // Randomly select words if we have more than requested
      if (words.length > requestedCount) {
        for (let i = words.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [words[i], words[j]] = [words[j], words[i]];
        }
        words = words.slice(0, requestedCount);
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
      // Get distractor answers from other words
      const otherAnswers = words.filter((_, i) => i !== index).map((w) => (reversed ? w.word : w.translation));

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
   * Start a new training execution
   */
  async startTraining(
    trainingId: string,
    userId: string,
  ): Promise<{ success: boolean; execution?: TrainingExecution; error?: string }> {
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
        // Randomized path: fetch words dynamically from vocabulary lists
        const vocabRepo = VocabularyListRepository.getInstance();
        const collectedWords: TrainingWord[] = [];

        for (const listId of training.vocabularyListIds) {
          const list = await vocabRepo.getById(listId);
          if (!list) continue; // skip deleted lists

          let validWords = list.words.filter((w) => w.translation && w.translation.length > 0);

          // Filter by units if present
          if (training.units && training.units.length > 0) {
            validWords = validWords.filter((w) => w.unit && training.units!.includes(w.unit));
          }

          for (const word of validWords) {
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

        if (collectedWords.length === 0) {
          return { success: false, error: 'No words available from the selected vocabulary lists' };
        }

        // Fisher-Yates shuffle
        for (let i = collectedWords.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [collectedWords[i], collectedWords[j]] = [collectedWords[j], collectedWords[i]];
        }

        // Select up to randomizedWordCount words
        const selectedWords = collectedWords.slice(0, training.randomizedWordCount ?? 10);

        if (training.mode === 'AI_TRAINING') {
          if (selectedWords.length < 1) {
            return { success: false, error: 'No words available from the selected vocabulary lists' };
          }

          // Fetch vocabulary lists for full word details and language info
          const vocabRepoAI = VocabularyListRepository.getInstance();
          let sourceLanguage = 'English';
          let targetLanguage = 'English';
          const enrichedWords: {
            word: string;
            translation?: string;
            definition?: string;
            partOfSpeech?: string;
            exampleSentence?: string;
          }[] = [];

          for (const listId of training.vocabularyListIds) {
            const list = await vocabRepoAI.getById(listId);
            if (!list) continue;
            if (list.sourceLanguage) sourceLanguage = list.sourceLanguage;
            if (list.targetLanguage) targetLanguage = list.targetLanguage;

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

          try {
            const aiService = getAIService();
            const aiExercises = await aiService.generateExercises(
              enrichedWords,
              sourceLanguage,
              targetLanguage,
              userId,
            );

            const execution: TrainingExecution = {
              id: crypto.randomUUID(),
              trainingId,
              userId,
              startedAt: new Date().toISOString(),
              results: [],
              words: selectedWords,
              aiExercises,
              correctCount: 0,
              incorrectCount: 0,
            };

            await trainingRepo.createExecution(execution);
            return { success: true, execution };
          } catch (aiError) {
            const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
            return { success: false, error: 'Failed to generate AI exercises: ' + errorMessage };
          }
        }

        if (training.mode === 'MULTIPLE_CHOICE' && selectedWords.length < 3) {
          return { success: false, error: 'Multiple-choice requires at least 3 words' };
        }

        let multipleChoiceOptions: MultipleChoiceOption[] | undefined;
        if (training.mode === 'MULTIPLE_CHOICE') {
          multipleChoiceOptions = this.generateMultipleChoiceOptions(
            selectedWords,
            training.direction,
            training.multipleChoiceOptionCount ?? 5,
          );
        }

        const execution: TrainingExecution = {
          id: crypto.randomUUID(),
          trainingId,
          userId,
          startedAt: new Date().toISOString(),
          results: [],
          multipleChoiceOptions,
          words: selectedWords,
          correctCount: 0,
          incorrectCount: 0,
        };

        await trainingRepo.createExecution(execution);

        return { success: true, execution };
      }

      // Static path: existing behavior unchanged
      if (training.mode === 'AI_TRAINING') {
        if (training.words.length < 1) {
          return { success: false, error: 'No words available from the selected vocabulary lists' };
        }

        // Fetch vocabulary lists for full word details and language info
        const vocabRepoAI = VocabularyListRepository.getInstance();
        let sourceLanguage = 'English';
        let targetLanguage = 'English';
        const enrichedWords: {
          word: string;
          translation?: string;
          definition?: string;
          partOfSpeech?: string;
          exampleSentence?: string;
        }[] = [];

        for (const listId of training.vocabularyListIds) {
          const list = await vocabRepoAI.getById(listId);
          if (!list) continue;
          if (list.sourceLanguage) sourceLanguage = list.sourceLanguage;
          if (list.targetLanguage) targetLanguage = list.targetLanguage;

          for (const trainingWord of training.words) {
            if (trainingWord.vocabularyListId === listId) {
              const fullWord = list.words.find((w) => w.word === trainingWord.word);
              enrichedWords.push({
                word: trainingWord.word,
                translation: trainingWord.translation,
                definition: fullWord?.definition,
                partOfSpeech: fullWord?.partOfSpeech,
                exampleSentence: fullWord?.exampleSentence,
              });
            }
          }
        }

        try {
          const aiService = getAIService();
          const aiExercises = await aiService.generateExercises(enrichedWords, sourceLanguage, targetLanguage, userId);

          const execution: TrainingExecution = {
            id: crypto.randomUUID(),
            trainingId,
            userId,
            startedAt: new Date().toISOString(),
            results: [],
            aiExercises,
            correctCount: 0,
            incorrectCount: 0,
          };

          await trainingRepo.createExecution(execution);
          return { success: true, execution };
        } catch (aiError) {
          const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
          return { success: false, error: 'Failed to generate AI exercises: ' + errorMessage };
        }
      }

      if (training.mode === 'MULTIPLE_CHOICE' && training.words.length < 3) {
        return { success: false, error: 'Multiple-choice requires at least 3 words' };
      }

      let multipleChoiceOptions: MultipleChoiceOption[] | undefined;
      if (training.mode === 'MULTIPLE_CHOICE') {
        multipleChoiceOptions = this.generateMultipleChoiceOptions(
          training.words,
          training.direction,
          training.multipleChoiceOptionCount ?? 5,
        );
      }

      const execution: TrainingExecution = {
        id: crypto.randomUUID(),
        trainingId,
        userId,
        startedAt: new Date().toISOString(),
        results: [],
        multipleChoiceOptions,
        correctCount: 0,
        incorrectCount: 0,
      };

      await trainingRepo.createExecution(execution);

      return { success: true, execution };
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
    execution?: TrainingExecution;
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

        const result: TrainingResult = {
          wordIndex,
          word: exercise.prompt,
          expectedAnswer: exercise.options[exercise.correctOptionIndex],
          userAnswer: answer,
          correct,
        };

        execution.results.push(result);
        if (correct) {
          execution.correctCount++;
        } else {
          execution.incorrectCount++;
        }

        // Completion check: all AI exercises answered
        if (execution.results.length === aiExercises.length) {
          execution.completedAt = new Date().toISOString();
        }

        await trainingRepo.updateExecution(executionId, {
          results: execution.results,
          correctCount: execution.correctCount,
          incorrectCount: execution.incorrectCount,
          completedAt: execution.completedAt,
        });

        return { success: true, result, completed: !!execution.completedAt, execution };
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

      const result: TrainingResult = {
        wordIndex,
        word: promptWord,
        expectedAnswer,
        userAnswer: answer,
        correct,
      };

      execution.results.push(result);
      if (correct) {
        execution.correctCount++;
      } else {
        execution.incorrectCount++;
      }

      // Completion check: compare against the appropriate word list length
      if (execution.results.length === wordList.length) {
        execution.completedAt = new Date().toISOString();
      }

      await trainingRepo.updateExecution(executionId, {
        results: execution.results,
        correctCount: execution.correctCount,
        incorrectCount: execution.incorrectCount,
        completedAt: execution.completedAt,
      });

      return { success: true, result, completed: !!execution.completedAt, execution };
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
  ): Promise<{ success: boolean; execution?: TrainingExecution; error?: string }> {
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

      return { success: true, execution: updated };
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
      perWordStatistics: {
        word: string;
        translation: string;
        correctCount: number;
        totalCount: number;
        accuracyPercentage: number;
      }[];
      mostMissedWords: {
        word: string;
        translation: string;
        incorrectCount: number;
      }[];
      accuracyTrend: {
        executionId: string;
        startedAt: string;
        accuracy: number;
      }[];
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
        const totalTime = timedExecutions.reduce((sum, e) => {
          const start = new Date(e.startedAt).getTime();
          const end = new Date((e.completedAt || e.abortedAt)!).getTime();
          return sum + (end - start) / 1000;
        }, 0);
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
      executions: {
        executionId: string;
        trainingId: string;
        trainingName: string;
        startedAt: string;
        completedAt?: string;
        correctCount: number;
        incorrectCount: number;
        durationSeconds?: number;
      }[];
      totalExecutions: number;
      totalCorrect: number;
      totalIncorrect: number;
    };
    error?: string;
  }> {
    try {
      const trainingRepo = TrainingRepository.getInstance();
      const trainings = await trainingRepo.getAllByUserId(userId);

      const dayExecutions: {
        executionId: string;
        trainingId: string;
        trainingName: string;
        startedAt: string;
        completedAt?: string;
        correctCount: number;
        incorrectCount: number;
        durationSeconds?: number;
      }[] = [];

      for (const training of trainings) {
        const executions = await trainingRepo.getExecutionsByTrainingId(training.id);

        for (const execution of executions) {
          const executionDate = execution.startedAt.substring(0, 10);
          if (executionDate === date) {
            let durationSeconds: number | undefined;
            if (execution.completedAt || execution.abortedAt) {
              const start = new Date(execution.startedAt).getTime();
              const end = new Date((execution.completedAt || execution.abortedAt)!).getTime();
              durationSeconds = (end - start) / 1000;
            }

            dayExecutions.push({
              executionId: execution.id,
              trainingId: training.id,
              trainingName: training.name,
              startedAt: execution.startedAt,
              completedAt: execution.completedAt,
              correctCount: execution.correctCount,
              incorrectCount: execution.incorrectCount,
              durationSeconds,
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
   * Get overview statistics across a date range — per-day training count and total learning time
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

          if (execution.completedAt || execution.abortedAt) {
            const start = new Date(execution.startedAt).getTime();
            const end = new Date((execution.completedAt || execution.abortedAt)!).getTime();
            dayMap[executionDate].totalLearningTimeSeconds += (end - start) / 1000;
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
