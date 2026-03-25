/**
 * Domain models for Subscription entity
 */

import type { PaymentProvider, SubscriptionStatus } from './User';

export interface Subscription {
  id: string;
  userId: string;
  provider: PaymentProvider;
  status: SubscriptionStatus;
  planId?: string;
  externalId?: string;
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRecord extends Subscription {
  // Additional DynamoDB-specific fields can be added here if needed
  ttl?: number;
}
