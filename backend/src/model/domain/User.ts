/**
 * Domain models for User entity
 */

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CANCELLED = 'CANCELLED',
  PAST_DUE = 'PAST_DUE',
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  APPLE_APP_STORE = 'APPLE_APP_STORE',
  GOOGLE_PLAY_STORE = 'GOOGLE_PLAY_STORE',
}

export enum Tier {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
}

export enum TierSource {
  SUBSCRIPTION = 'SUBSCRIPTION',
  MANUAL = 'MANUAL',
}

export interface User {
  id: string;
  email: string;
  name?: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionProvider?: PaymentProvider;
  tier?: Tier;
  tierSource?: TierSource;
  gracePeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord extends User {
  // Additional DynamoDB-specific fields can be added here if needed
  ttl?: number;
}
