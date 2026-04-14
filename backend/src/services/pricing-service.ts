import { Tier, TierSource, SubscriptionStatus } from '../model/domain/User';
import type { PaymentProvider } from '../model/domain/User';
import type { User } from '../model/domain/User';
import { UserRepository } from '../repositories/user-repository';
import { SubscriptionRepository } from '../repositories/subscription-repository';
import { UsageCounterRepository } from '../repositories/usage-counter-repository';
import { loadConfig, buildReverseLookupMap, getPlanIds as getConfigPlanIds } from './plan-id-config-loader';
import type { PlanIdConfig } from './plan-id-config-loader';

// ─── Tier Limits Configuration ───────────────────────────────────────────────

export interface TierLimits {
  maxImageScans: number | null; // null = unlimited
  maxVocabularyLists: number | null; // null = unlimited
  aiTrainingEnabled: boolean;
  imageScanPeriod: 'lifetime' | 'billing_period';
}

export interface UsageStatus {
  tier: Tier;
  imageScansUsed: number;
  imageScansLimit: number | null;
  vocabularyListsUsed: number;
  vocabularyListsLimit: number | null;
  aiTrainingEnabled: boolean;
}

export interface TierStatistic {
  tier: Tier;
  subscriptionCount: number;
  manualCount: number;
  totalCount: number;
}

export interface TierStatisticsResult {
  statistics: TierStatistic[];
}

const TIER_LIMITS: Record<Tier, TierLimits> = {
  [Tier.FREE]: {
    maxImageScans: 5,
    maxVocabularyLists: 5,
    aiTrainingEnabled: false,
    imageScanPeriod: 'lifetime',
  },
  [Tier.BASIC]: {
    maxImageScans: 25,
    maxVocabularyLists: null,
    aiTrainingEnabled: false,
    imageScanPeriod: 'billing_period',
  },
  [Tier.PRO]: {
    maxImageScans: null,
    maxVocabularyLists: null,
    aiTrainingEnabled: true,
    imageScanPeriod: 'lifetime',
  },
};

const GRACE_PERIOD_DAYS = 7;

// ─── UpgradeRequiredError ────────────────────────────────────────────────────

export type LimitType = 'IMAGE_SCAN' | 'VOCABULARY_LIST' | 'AI_TRAINING';

export class UpgradeRequiredError extends Error {
  public readonly code = 'UPGRADE_REQUIRED' as const;
  public readonly currentTier: Tier;
  public readonly requiredTier: Tier;
  public readonly limitType: LimitType;
  public readonly currentUsage?: number;
  public readonly limit?: number;

  constructor(params: {
    currentTier: Tier;
    requiredTier: Tier;
    limitType: LimitType;
    currentUsage?: number;
    limit?: number;
    message?: string;
  }) {
    super(params.message ?? `Upgrade required: ${params.limitType} limit reached`);
    this.name = 'UpgradeRequiredError';
    this.currentTier = params.currentTier;
    this.requiredTier = params.requiredTier;
    this.limitType = params.limitType;
    this.currentUsage = params.currentUsage;
    this.limit = params.limit;
  }
}

// ─── Pure Functions (exported for property testing) ──────────────────────────

/**
 * Returns the limits configuration for a given tier.
 */
export function getTierLimits(tier: Tier): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Resolves the effective tier from subscription state and optional manual override.
 *
 * Resolution order:
 * 1. Active subscription → map planId to tier (subscription takes precedence over manual)
 * 2. PAST_DUE subscription → handled by caller (grace period logic)
 * 3. Manual override with no active subscription → use manual tier
 * 4. No subscription, no manual → FREE
 */
export function resolveTierFromSubscription(
  subscriptionStatus: string | undefined,
  planId: string | undefined,
  manualTier?: Tier,
  tierSource?: TierSource,
  planTierMap: Record<string, Tier> = {},
): { tier: Tier; tierSource: TierSource } {
  // Rule 2/7: Active subscription always takes precedence (even over manual override)
  if (subscriptionStatus === SubscriptionStatus.ACTIVE) {
    const mappedTier = planId ? planTierMap[planId] : undefined;
    if (planId && mappedTier === undefined) {
      console.warn(`Unknown plan ID "${planId}" not found in planTierMap, resolving to FREE`);
    }
    return {
      tier: mappedTier ?? Tier.FREE,
      tierSource: TierSource.SUBSCRIPTION,
    };
  }

  // Rule 3/4: PAST_DUE — caller handles grace period; we just signal the status
  // The grace period check happens at a higher level (resolveAndUpdateTier)
  // Here we return FREE for PAST_DUE since the grace period logic is external
  if (subscriptionStatus === SubscriptionStatus.PAST_DUE) {
    return { tier: Tier.FREE, tierSource: TierSource.SUBSCRIPTION };
  }

  // Rule 5: Cancelled or inactive subscription → FREE
  if (subscriptionStatus === SubscriptionStatus.CANCELLED || subscriptionStatus === SubscriptionStatus.INACTIVE) {
    return { tier: Tier.FREE, tierSource: TierSource.SUBSCRIPTION };
  }

  // Rule 1: Manual override with no active subscription
  if (tierSource === TierSource.MANUAL && manualTier !== undefined) {
    return { tier: manualTier, tierSource: TierSource.MANUAL };
  }

  // Rule 6: No subscription → FREE
  return { tier: Tier.FREE, tierSource: TierSource.SUBSCRIPTION };
}

/**
 * Checks whether a user can perform an image scan given their tier and current count.
 */
export function canPerformImageScan(tier: Tier, currentCount: number, limits: TierLimits): boolean {
  if (limits.maxImageScans === null) {
    return true; // unlimited
  }
  return currentCount < limits.maxImageScans;
}

/**
 * Checks whether a user can create a new vocabulary list given their tier and current count.
 */
export function canCreateVocabularyList(tier: Tier, currentCount: number, limits: TierLimits): boolean {
  if (limits.maxVocabularyLists === null) {
    return true; // unlimited
  }
  return currentCount < limits.maxVocabularyLists;
}

/**
 * Checks whether a user's tier allows AI training access.
 */
export function canAccessAiTraining(tier: Tier): boolean {
  return getTierLimits(tier).aiTrainingEnabled;
}

/**
 * Determines if the billing period counter should be reset.
 * Returns true if periodStart is before the start of the current billing period
 * (i.e., currentPeriodEnd has passed since the counter was last reset).
 */
export function shouldResetPeriodCounter(periodStart: string, currentPeriodEnd: string): boolean {
  const periodStartDate = new Date(periodStart);
  const currentPeriodEndDate = new Date(currentPeriodEnd);
  // If the period start is before the current period end, the period has rolled over
  // and the counter needs to be reset
  return periodStartDate.getTime() < currentPeriodEndDate.getTime();
}

// ─── PricingService Class ────────────────────────────────────────────────────

export class PricingService {
  private static instance: PricingService;
  private userRepository: UserRepository;
  private subscriptionRepository: SubscriptionRepository;
  private usageCounterRepository: UsageCounterRepository;
  private planTierMap: Record<string, Tier> = {};
  private planIdConfig: PlanIdConfig | null = null;

  private constructor() {
    this.userRepository = UserRepository.getInstance();
    this.subscriptionRepository = SubscriptionRepository.getInstance();
    this.usageCounterRepository = UsageCounterRepository.getInstance();
  }

  public static getInstance(): PricingService {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService();
    }
    return PricingService.instance;
  }

  /**
   * Load plan ID configuration from SSM Parameter Store and build the reverse lookup map.
   * On failure, logs an error and sets planTierMap to empty {} so all unknown plan IDs resolve to FREE.
   */
  async initialize(): Promise<void> {
    const ssmPath = process.env.PLAN_IDS_SSM_PATH;
    if (!ssmPath) {
      console.error('PLAN_IDS_SSM_PATH environment variable is not set, falling back to empty plan tier map');
      this.planTierMap = {};
      this.planIdConfig = null;
      return;
    }

    try {
      const config = await loadConfig(ssmPath);
      this.planIdConfig = config;
      this.planTierMap = buildReverseLookupMap(config);
    } catch (error) {
      console.error('Failed to load plan ID config from SSM:', error);
      this.planTierMap = {};
      this.planIdConfig = null;
    }
  }

  /**
   * Returns plan IDs for a given payment platform from the cached config.
   * Throws if initialize() has not been called or config is null.
   */
  getPlanIds(platform: PaymentProvider): { basicPlanId: string; proPlanId: string } {
    if (!this.planIdConfig) {
      throw new Error('Plan ID configuration not loaded. Call initialize() first.');
    }
    return getConfigPlanIds(this.planIdConfig, platform);
  }

  /**
   * Check if user can perform an image scan. Throws UpgradeRequiredError if limit reached.
   * For BASIC tier, handles billing period reset before checking.
   */
  async checkImageScanLimit(userId: string): Promise<void> {
    const user = await this.userRepository.getById(userId);
    const tier = user?.tier ?? Tier.FREE;
    const limits = getTierLimits(tier);

    // Unlimited scans — no check needed
    if (limits.maxImageScans === null) {
      return;
    }

    const counter = await this.usageCounterRepository.getByUserId(userId);
    let currentCount = counter?.imageScansCount ?? 0;

    // Task 3.5: Billing period reset for BASIC tier
    if (tier === Tier.BASIC) {
      const subscription = await this.subscriptionRepository.getByUserId(userId);
      if (subscription?.currentPeriodEnd) {
        const periodStart = counter?.imageScanPeriodStart;
        if (!periodStart || shouldResetPeriodCounter(periodStart, subscription.currentPeriodEnd)) {
          await this.usageCounterRepository.resetImageScanCounter(userId, new Date().toISOString());
          currentCount = 0;
        }
      }
    }

    if (!canPerformImageScan(tier, currentCount, limits)) {
      const tierName = tier === Tier.FREE ? 'Free' : 'Basic';
      throw new UpgradeRequiredError({
        currentTier: tier,
        requiredTier: tier === Tier.FREE ? Tier.BASIC : Tier.PRO,
        limitType: 'IMAGE_SCAN',
        currentUsage: currentCount,
        limit: limits.maxImageScans,
        message: `${tierName} tier limit reached: ${currentCount}/${limits.maxImageScans} image scans used. Upgrade to ${tier === Tier.FREE ? 'Basic or Pro' : 'Pro'} for more.`,
      });
    }
  }

  /**
   * Check if user can create a vocabulary list. Throws UpgradeRequiredError if limit reached.
   */
  async checkVocabularyListLimit(userId: string): Promise<void> {
    const user = await this.userRepository.getById(userId);
    const tier = user?.tier ?? Tier.FREE;
    const limits = getTierLimits(tier);

    // Unlimited lists — no check needed
    if (limits.maxVocabularyLists === null) {
      return;
    }

    const counter = await this.usageCounterRepository.getByUserId(userId);
    const currentCount = counter?.vocabularyListsCount ?? 0;

    if (!canCreateVocabularyList(tier, currentCount, limits)) {
      throw new UpgradeRequiredError({
        currentTier: tier,
        requiredTier: Tier.BASIC,
        limitType: 'VOCABULARY_LIST',
        currentUsage: currentCount,
        limit: limits.maxVocabularyLists,
        message: `Free tier limit reached: ${currentCount}/${limits.maxVocabularyLists} vocabulary lists. Upgrade to Basic or Pro for unlimited lists.`,
      });
    }
  }

  /**
   * Check if user can access AI training. Throws UpgradeRequiredError if not allowed.
   */
  async checkAiTrainingAccess(userId: string): Promise<void> {
    const user = await this.userRepository.getById(userId);
    const tier = user?.tier ?? Tier.FREE;

    if (!canAccessAiTraining(tier)) {
      throw new UpgradeRequiredError({
        currentTier: tier,
        requiredTier: Tier.PRO,
        limitType: 'AI_TRAINING',
        message: 'AI training requires Pro tier. Upgrade to Pro to access AI training features.',
      });
    }
  }

  /**
   * Increment the image scan counter after successful scans.
   */
  async incrementImageScanCount(userId: string, count: number): Promise<void> {
    await this.usageCounterRepository.incrementImageScans(userId, count);
  }

  /**
   * Increment the vocabulary list counter after successful creation.
   */
  async incrementVocabularyListCount(userId: string): Promise<void> {
    await this.usageCounterRepository.incrementVocabularyLists(userId);
  }

  /**
   * Decrement the vocabulary list counter after deletion.
   */
  async decrementVocabularyListCount(userId: string): Promise<void> {
    await this.usageCounterRepository.decrementVocabularyLists(userId);
  }

  /**
   * Get the current usage status for a user including tier, counts, and limits.
   */
  async getUsageStatus(userId: string): Promise<UsageStatus> {
    const user = await this.userRepository.getById(userId);
    const tier = user?.tier ?? Tier.FREE;
    const limits = getTierLimits(tier);
    const counter = await this.usageCounterRepository.getByUserId(userId);

    return {
      tier,
      imageScansUsed: counter?.imageScansCount ?? 0,
      imageScansLimit: limits.maxImageScans,
      vocabularyListsUsed: counter?.vocabularyListsCount ?? 0,
      vocabularyListsLimit: limits.maxVocabularyLists,
      aiTrainingEnabled: limits.aiTrainingEnabled,
    };
  }

  /**
   * Set a user's tier directly (used by admin manual override or subscription sync).
   */
  async setUserTier(userId: string, tier: Tier, source: TierSource): Promise<void> {
    await this.userRepository.update(userId, {
      tier,
      tierSource: source,
    });
  }

  /**
   * Resolve the user's tier from their subscription state and update the User record.
   * Handles grace period logic for PAST_DUE subscriptions.
   */
  async resolveAndUpdateTier(userId: string): Promise<Tier> {
    const user = await this.userRepository.getById(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    const subscription = await this.subscriptionRepository.getByUserId(userId);

    // Task 3.4: Grace period logic for PAST_DUE subscriptions
    if (subscription?.status === SubscriptionStatus.PAST_DUE) {
      const now = new Date();

      // If no grace period set yet, set it to 7 days from now and keep current tier
      if (!user.gracePeriodEnd) {
        const gracePeriodEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
        await this.userRepository.update(userId, {
          gracePeriodEnd: gracePeriodEnd.toISOString(),
        });
        // Keep current tier during grace period
        return user.tier ?? Tier.FREE;
      }

      // Grace period already set — check if expired
      const gracePeriodEnd = new Date(user.gracePeriodEnd);
      if (now < gracePeriodEnd) {
        // Still within grace period — keep current tier
        return user.tier ?? Tier.FREE;
      }

      // Grace period expired — downgrade to FREE
      await this.userRepository.update(userId, {
        tier: Tier.FREE,
        tierSource: TierSource.SUBSCRIPTION,
        gracePeriodEnd: undefined,
      });
      return Tier.FREE;
    }

    // Clear grace period if subscription is no longer PAST_DUE
    const updates: Partial<User> = {};
    if (user.gracePeriodEnd) {
      updates.gracePeriodEnd = undefined;
    }

    // Resolve tier from subscription
    const resolved = resolveTierFromSubscription(
      subscription?.status,
      subscription?.planId,
      user.tier,
      user.tierSource,
      this.planTierMap,
    );

    updates.tier = resolved.tier;
    updates.tierSource = resolved.tierSource;

    await this.userRepository.update(userId, updates);
    return resolved.tier;
  }

  /**
   * Get aggregate tier statistics across all users.
   * Scans the Users table and counts users per tier, separating subscription vs manual sources.
   */
  async getTierStatistics(): Promise<TierStatisticsResult> {
    const users = await this.userRepository.getAll();

    const stats: Record<Tier, { subscription: number; manual: number }> = {
      [Tier.FREE]: { subscription: 0, manual: 0 },
      [Tier.BASIC]: { subscription: 0, manual: 0 },
      [Tier.PRO]: { subscription: 0, manual: 0 },
    };

    for (const user of users) {
      const tier = user.tier ?? Tier.FREE;
      const source = user.tierSource ?? TierSource.SUBSCRIPTION;
      if (source === TierSource.MANUAL) {
        stats[tier].manual++;
      } else {
        stats[tier].subscription++;
      }
    }

    const statistics: TierStatistic[] = Object.values(Tier).map((tier) => ({
      tier,
      subscriptionCount: stats[tier].subscription,
      manualCount: stats[tier].manual,
      totalCount: stats[tier].subscription + stats[tier].manual,
    }));

    return { statistics };
  }
}
