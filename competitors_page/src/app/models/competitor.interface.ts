/**
 * Feature status enumeration for competitor comparisons
 */
export type FeatureStatus = 'full' | 'partial' | 'none' | 'premium';

/**
 * Billing cycle enumeration for pricing tiers
 */
export type BillingCycle = 'monthly' | 'annual' | 'custom';

/**
 * Pricing tier interface for competitor pricing plans
 */
export interface PricingTier {
  name: string;
  price: number | 'Custom';
  billing: BillingCycle;
  features: string[];
  limitations: string[];
}

/**
 * Feature comparison interface for comparing capabilities across platforms
 */
export interface FeatureComparison {
  multiPlatformPosting: FeatureStatus;
  aiContentGeneration: FeatureStatus;
  scheduling: FeatureStatus;
  analytics: FeatureStatus;
  teamCollaboration: FeatureStatus;
  mentionResolution: FeatureStatus;
  contentRecycling: FeatureStatus;
  visualPlanning: FeatureStatus;
  socialListening: FeatureStatus;
}

/**
 * Add-on pricing interface for optional features
 */
export interface AddOn {
  name: string;
  price: number;
  billing: string;
  features: string[];
}

/**
 * Main competitor data interface containing all competitor information
 */
export interface CompetitorData {
  name: string;
  slug: string;
  tagline: string;
  logo: string;
  website: string;
  pricing: PricingTier[];
  addOns?: AddOn[];
  features: FeatureComparison;
  pros: string[];
  cons: string[];
  targetAudience: string;
  lastUpdated: string;
}

/**
 * Feature matrix interface for displaying feature comparisons
 */
export interface FeatureMatrix {
  [competitorSlug: string]: FeatureComparison;
}

/**
 * Pricing comparison interface for displaying pricing across competitors
 */
export interface PricingComparison {
  [competitorSlug: string]: PricingTier[];
}

/**
 * Your product specific data interface
 */
export interface YourProductData {
  uniqueFeatures: string[];
  pricing: PricingTier[];
}

/**
 * Complete competitor configuration interface
 */
export interface CompetitorConfiguration {
  competitors: CompetitorData[];
  yourProduct: YourProductData;
}
