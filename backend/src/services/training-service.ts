import * as crypto from 'crypto';
import { TrainingRepository } from '../repositories/training-repository';
import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';
import type {
  Training,
  TrainingMode,
  TrainingWord,
  TrainingExecution,
  TrainingResult,
  MultipleChoiceOption,
} from '../model/domain/Training';

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
  ): Promise<{ success: boolean; training?: Training; error?: string }> {
    try {
      const vocabRepo = VocabularyListRepository.getInstance();
      let words: TrainingWord[] = [];

      for (const listId of vocabularyListIds) {
        const list = await vocabRepo.getById(listId);
        if (!list) continue;

        const validWords = list.words.filter((w) => w.translation);
        for (const word of validWords) {
          words.push({
            word: word.word,
            translation: word.translation!,
            vocabularyListId: list.id,
          });
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
        vocabularyListIds,
        words,
        createdAt: now,
        updatedAt: now,
      };

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

      if (training.mode === 'MULTIPLE_CHOICE' && training.words.length < 3) {
        return { success: false, error: 'Multiple-choice requires at least 3 words' };
      }

      let multipleChoiceOptions: MultipleChoiceOption[] | undefined;
      if (training.mode === 'MULTIPLE_CHOICE') {
        multipleChoiceOptions = training.words.map((word, index) => {
          // Get distractor translations from other words
          const otherTranslations = training.words.filter((_, i) => i !== index).map((w) => w.translation);

          // Pick 2 random distractors
          const shuffled = otherTranslations.sort(() => Math.random() - 0.5);
          const distractors = shuffled.slice(0, 2);

          // Build options array with correct answer + distractors, then shuffle
          const options = [word.translation, ...distractors];
          const shuffledOptions = options.sort(() => Math.random() - 0.5);
          const correctOptionIndex = shuffledOptions.indexOf(word.translation);

          return {
            wordIndex: index,
            options: shuffledOptions,
            correctOptionIndex,
          };
        });
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

      const alreadyAnswered = execution.results.some((r) => r.wordIndex === wordIndex);
      if (alreadyAnswered) {
        return { success: false, error: 'Answer already submitted for this word' };
      }

      const training = await trainingRepo.getById(execution.trainingId);
      if (!training) {
        return { success: false, error: 'Training not found' };
      }

      const word = training.words[wordIndex];
      if (!word) {
        return { success: false, error: 'Invalid word index' };
      }

      const correct = answer.trim().toLowerCase() === word.translation.trim().toLowerCase();

      const result: TrainingResult = {
        wordIndex,
        word: word.word,
        expectedAnswer: word.translation,
        userAnswer: answer,
        correct,
      };

      execution.results.push(result);
      if (correct) {
        execution.correctCount++;
      } else {
        execution.incorrectCount++;
      }

      if (execution.results.length === training.words.length) {
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

      return { success: true, training: { ...training, executions } };
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
          if (wordStats[result.word]) {
            wordStats[result.word].total++;
            if (result.correct) {
              wordStats[result.word].correct++;
            }
          }
        }
      }

      const overallAccuracy = totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0;

      // Average time from completed executions
      const completedExecutions = executions.filter((e) => e.completedAt && e.startedAt);
      let averageTimeSeconds = 0;
      if (completedExecutions.length > 0) {
        const totalTime = completedExecutions.reduce((sum, e) => {
          const start = new Date(e.startedAt).getTime();
          const end = new Date(e.completedAt!).getTime();
          return sum + (end - start) / 1000;
        }, 0);
        averageTimeSeconds = totalTime / completedExecutions.length;
      }

      const perWordStatistics = training.words.map((word) => {
        const stats = wordStats[word.word] || { correct: 0, total: 0 };
        return {
          word: word.word,
          translation: word.translation,
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
            if (execution.completedAt) {
              const start = new Date(execution.startedAt).getTime();
              const end = new Date(execution.completedAt).getTime();
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
}
