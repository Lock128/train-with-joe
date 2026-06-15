import { AchievementRepository } from '../repositories/achievement-repository';
import { WordMasteryRepository } from '../repositories/word-mastery-repository';
import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';
import type { Achievement, UserStreak } from '../model/domain/Achievement';
import { AchievementType } from '../model/domain/Achievement';

interface TrainingExecutionData {
  correctCount: number;
  incorrectCount: number;
  durationSeconds?: number;
  trainingId?: string;
}

/**
 * Service for managing user streaks and achievements.
 * Provides gamification through daily training streaks and unlockable milestones.
 */
export class AchievementService {
  private static instance: AchievementService;

  private constructor() {}

  public static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  /**
   * Record that a training has been completed - updates streak and evaluates achievements.
   * @param userId User ID
   * @param executionData Details about the completed training execution
   */
  async recordTrainingCompleted(userId: string, executionData: TrainingExecutionData): Promise<void> {
    const repo = AchievementRepository.getInstance();
    const today = new Date().toISOString().substring(0, 10);

    // Update streak
    let streak = await repo.getStreak(userId);

    if (!streak) {
      // First ever training
      streak = {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastTrainingDate: today,
        totalTrainingDays: 1,
      };
    } else if (streak.lastTrainingDate === today) {
      // Already trained today - no streak change
    } else {
      const lastDate = new Date(streak.lastTrainingDate);
      const todayDate = new Date(today);
      const diffMs = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

      if (diffDays === 1) {
        // Consecutive day - increment streak
        streak.currentStreak += 1;
        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
      } else {
        // Missed one or more days - reset streak
        streak.currentStreak = 1;
      }

      streak.lastTrainingDate = today;
      streak.totalTrainingDays += 1;
    }

    await repo.updateStreak(streak);

    // Evaluate achievements
    await this.checkAndUnlockAchievements(userId, executionData);
  }

  /**
   * Check all achievement conditions and unlock any that are met.
   * @param userId User ID
   * @param executionData Optional execution data for context-specific achievements
   */
  async checkAndUnlockAchievements(userId: string, executionData?: TrainingExecutionData): Promise<void> {
    const repo = AchievementRepository.getInstance();
    const [streak, existingAchievements] = await Promise.all([repo.getStreak(userId), repo.getAchievements(userId)]);

    const unlockedTypes = new Set(existingAchievements.map((a) => a.type));

    // FIRST_TRAINING - unlocked on first completed training (streak exists)
    if (streak && !unlockedTypes.has(AchievementType.FIRST_TRAINING)) {
      await repo.unlockAchievement(userId, AchievementType.FIRST_TRAINING);
    }

    // Streak milestones
    if (streak) {
      const streakMilestones: [number, AchievementType][] = [
        [3, AchievementType.STREAK_3],
        [7, AchievementType.STREAK_7],
        [14, AchievementType.STREAK_14],
        [30, AchievementType.STREAK_30],
      ];

      for (const [days, type] of streakMilestones) {
        if (streak.currentStreak >= days && !unlockedTypes.has(type)) {
          await repo.unlockAchievement(userId, type);
        }
      }
    }

    // Words mastered milestones (box >= 4 in SRS)
    try {
      const wordMasteryRepo = WordMasteryRepository.getInstance();
      const allWords = await wordMasteryRepo.getByUserId(userId);
      const masteredCount = allWords.filter((w) => w.box >= 4).length;

      const wordMilestones: [number, AchievementType][] = [
        [10, AchievementType.WORDS_MASTERED_10],
        [50, AchievementType.WORDS_MASTERED_50],
        [100, AchievementType.WORDS_MASTERED_100],
        [500, AchievementType.WORDS_MASTERED_500],
      ];

      for (const [count, type] of wordMilestones) {
        if (masteredCount >= count && !unlockedTypes.has(type)) {
          await repo.unlockAchievement(userId, type);
        }
      }
    } catch (error) {
      // Word mastery check failure should not block achievement evaluation
      console.error('Error checking word mastery achievements:', error);
    }

    // PERFECT_SCORE - all answers correct in a training (and at least 1 answer)
    if (executionData && executionData.correctCount > 0 && executionData.incorrectCount === 0) {
      if (!unlockedTypes.has(AchievementType.PERFECT_SCORE)) {
        await repo.unlockAchievement(userId, AchievementType.PERFECT_SCORE);
      }
    }

    // SPEED_DEMON - complete training under 60 seconds
    if (executionData && executionData.durationSeconds !== undefined && executionData.durationSeconds < 60) {
      if (executionData.correctCount + executionData.incorrectCount > 0) {
        if (!unlockedTypes.has(AchievementType.SPEED_DEMON)) {
          await repo.unlockAchievement(userId, AchievementType.SPEED_DEMON);
        }
      }
    }

    // POLYGLOT - trained in 3+ languages (checked via word mastery vocabulary list diversity)
    try {
      const wordMasteryRepo = WordMasteryRepository.getInstance();
      const allWords = await wordMasteryRepo.getByUserId(userId);
      const uniqueListIds = new Set(allWords.map((w) => w.vocabularyListId));

      if (uniqueListIds.size >= 3 && !unlockedTypes.has(AchievementType.POLYGLOT)) {
        // Resolve actual languages from vocabulary lists to confirm 3+ distinct languages
        const vocabRepo = VocabularyListRepository.getInstance();
        const languages = new Set<string>();

        for (const listId of uniqueListIds) {
          const list = await vocabRepo.getById(listId);
          if (list?.sourceLanguage) {
            languages.add(list.sourceLanguage.toLowerCase());
          }
        }

        if (languages.size >= 3) {
          await repo.unlockAchievement(userId, AchievementType.POLYGLOT);
        }
      }
    } catch (error) {
      // Polyglot check failure should not block achievement evaluation
      console.error('Error checking polyglot achievement:', error);
    }
  }

  /**
   * Get a user's progress - streak info and unlocked achievements.
   * @param userId User ID
   * @returns Object containing streak and achievements
   */
  async getProgress(userId: string): Promise<{
    streak: UserStreak | null;
    achievements: Achievement[];
  }> {
    const repo = AchievementRepository.getInstance();
    const [streak, achievements] = await Promise.all([repo.getStreak(userId), repo.getAchievements(userId)]);

    return { streak, achievements };
  }
}
