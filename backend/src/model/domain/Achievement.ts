/**
 * Achievement Types - all possible achievements a user can unlock
 */
export enum AchievementType {
  FIRST_TRAINING = 'FIRST_TRAINING',
  STREAK_3 = 'STREAK_3',
  STREAK_7 = 'STREAK_7',
  STREAK_14 = 'STREAK_14',
  STREAK_30 = 'STREAK_30',
  WORDS_MASTERED_10 = 'WORDS_MASTERED_10',
  WORDS_MASTERED_50 = 'WORDS_MASTERED_50',
  WORDS_MASTERED_100 = 'WORDS_MASTERED_100',
  WORDS_MASTERED_500 = 'WORDS_MASTERED_500',
  PERFECT_SCORE = 'PERFECT_SCORE',
  SPEED_DEMON = 'SPEED_DEMON',
  POLYGLOT = 'POLYGLOT',
}

/**
 * Tracks a user's daily training streak
 */
export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastTrainingDate: string;
  totalTrainingDays: number;
}

/**
 * Represents an unlocked achievement for a user
 */
export interface Achievement {
  id: string;
  userId: string;
  type: AchievementType;
  unlockedAt: string;
  metadata?: Record<string, unknown>;
}
