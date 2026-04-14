import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { Tier, PaymentProvider } from '../model/domain/User';

// ─── PlanIdConfig Interface ──────────────────────────────────────────────────

/** JSON structure stored in SSM Parameter Store at /<namespace>/config/plan-ids */
export interface PlanIdConfig {
  stripe: { basic: string; pro: string };
  appStore: { basic: string; pro: string };
  playStore: { basic: string; pro: string };
}

// ─── Platform key helpers ────────────────────────────────────────────────────

const PLATFORM_KEYS: Array<keyof PlanIdConfig> = ['stripe', 'appStore', 'playStore'];
const TIER_KEYS: Array<'basic' | 'pro'> = ['basic', 'pro'];

const PLATFORM_TO_CONFIG_KEY: Record<PaymentProvider, keyof PlanIdConfig> = {
  [PaymentProvider.STRIPE]: 'stripe',
  [PaymentProvider.APPLE_APP_STORE]: 'appStore',
  [PaymentProvider.GOOGLE_PLAY_STORE]: 'playStore',
};

// ─── validateConfig ──────────────────────────────────────────────────────────

/**
 * Validates that `raw` is a well-formed PlanIdConfig.
 *
 * Returns the typed config when all three platform keys exist, each containing
 * `basic` and `pro` entries that are non-empty strings. Returns null for any
 * structural or value violation.
 *
 * Also rejects configs where the same product ID string maps to different tiers
 * across platforms (e.g., "com.app.monthly" as both basic and pro).
 */
export function validateConfig(raw: unknown): PlanIdConfig | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  for (const platform of PLATFORM_KEYS) {
    const platformObj = obj[platform];
    if (platformObj === null || typeof platformObj !== 'object' || Array.isArray(platformObj)) {
      return null;
    }

    const p = platformObj as Record<string, unknown>;
    for (const tier of TIER_KEYS) {
      const value = p[tier];
      if (typeof value !== 'string' || value.length === 0) {
        return null;
      }
    }
  }

  const config = raw as PlanIdConfig;

  // Check for duplicate product IDs that map to different tiers
  const idToTier = new Map<string, 'basic' | 'pro'>();
  for (const platform of PLATFORM_KEYS) {
    for (const tier of TIER_KEYS) {
      const id = config[platform][tier];
      const existing = idToTier.get(id);
      if (existing !== undefined && existing !== tier) {
        return null; // same ID maps to different tiers
      }
      idToTier.set(id, tier);
    }
  }

  return config;
}

// ─── buildReverseLookupMap ───────────────────────────────────────────────────

/**
 * Builds a flat map from any product ID (across all platforms) to its Tier.
 *
 * `basic` entries map to `Tier.BASIC`, `pro` entries map to `Tier.PRO`.
 */
export function buildReverseLookupMap(config: PlanIdConfig): Record<string, Tier> {
  const map: Record<string, Tier> = {};

  for (const platform of PLATFORM_KEYS) {
    map[config[platform].basic] = Tier.BASIC;
    map[config[platform].pro] = Tier.PRO;
  }

  return map;
}

// ─── getPlanIds ──────────────────────────────────────────────────────────────

/**
 * Returns the basic and pro plan IDs for a given payment platform from the config.
 */
export function getPlanIds(
  config: PlanIdConfig,
  platform: PaymentProvider,
): { basicPlanId: string; proPlanId: string } {
  const key = PLATFORM_TO_CONFIG_KEY[platform];
  return {
    basicPlanId: config[key].basic,
    proPlanId: config[key].pro,
  };
}

// ─── loadConfig ──────────────────────────────────────────────────────────────

/**
 * Reads the plan ID config from SSM Parameter Store, parses the JSON, validates
 * the structure, and returns a typed PlanIdConfig.
 *
 * Throws if the parameter is missing, not valid JSON, or fails validation.
 */
export async function loadConfig(ssmPath: string): Promise<PlanIdConfig> {
  const client = new SSMClient({});
  const command = new GetParameterCommand({ Name: ssmPath });
  const response = await client.send(command);

  const value = response.Parameter?.Value;
  if (!value) {
    throw new Error(`SSM parameter at ${ssmPath} is missing or has no value`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`SSM parameter at ${ssmPath} contains invalid JSON`);
  }

  const config = validateConfig(parsed);
  if (!config) {
    throw new Error(`SSM parameter at ${ssmPath} has invalid plan ID config structure`);
  }

  return config;
}
