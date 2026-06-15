import { AchievementService } from '../services/achievement-service';

/**
 * Lambda resolver for Query.getAchievements
 * Returns user streak and unlocked achievements for the authenticated user
 */

interface Event {
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;

  if (!userId) {
    return {
      success: false,
      streak: null,
      achievements: null,
      error: 'Authentication required',
    };
  }

  try {
    const service = AchievementService.getInstance();
    const progress = await service.getProgress(userId);

    return {
      success: true,
      streak: progress.streak
        ? {
            currentStreak: progress.streak.currentStreak,
            longestStreak: progress.streak.longestStreak,
            lastTrainingDate: progress.streak.lastTrainingDate,
            totalTrainingDays: progress.streak.totalTrainingDays,
          }
        : null,
      achievements: progress.achievements.map((a) => ({
        id: a.id,
        type: a.type,
        unlockedAt: a.unlockedAt,
        metadata: a.metadata ? JSON.stringify(a.metadata) : null,
      })),
      error: null,
    };
  } catch (error) {
    console.error('Error getting achievements:', error);
    return {
      success: false,
      streak: null,
      achievements: null,
      error: error instanceof Error ? error.message : 'Failed to get achievements',
    };
  }
};
