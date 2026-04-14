# Tasks: Pricing Structure

## Task 1: Backend Data Model & Tier Enums

- [x] 1.1 Add `Tier` (FREE, BASIC, PRO) and `TierSource` (SUBSCRIPTION, MANUAL) enums to `backend/src/model/domain/User.ts`
- [x] 1.2 Extend the `User` interface with `tier?: Tier`, `tierSource?: TierSource`, and `gracePeriodEnd?: string` fields
- [x] 1.3 Create `backend/src/model/domain/UsageCounter.ts` with the `UsageCounter` interface (userId, imageScansCount, vocabularyListsCount, imageScanPeriodStart, updatedAt)
- [x] 1.4 Update GraphQL schema (`backend/src/gql-schemas/schema.graphql`) to add `Tier` enum, `TierSource` enum, `tier` and `tierSource` fields on `User` type, `UsageLimits` type, `TierStatistic` type, `UsageLimitsResponse`, `TierStatisticsResponse`, `AdminSetUserTierInput`, `getUsageLimits` query, `getTierStatistics` query, and `adminSetUserTier` mutation

## Task 2: DynamoDB UsageCounters Table

- [x] 2.1 Add `usageCountersTable` DynamoDB table to `backend/lib/base-stack.ts` with `userId` as partition key (PAY_PER_REQUEST billing, DESTROY removal policy)
- [x] 2.2 Export the table name to SSM parameter store under `/<namespace>/config/usage-counters-table-name`
- [x] 2.3 Create `backend/src/repositories/usage-counter-repository.ts` with singleton pattern, implementing `getByUserId`, `incrementImageScans` (atomic ADD), `incrementVocabularyLists`, `decrementVocabularyLists` (clamp to 0), and `resetImageScanCounter` methods

## Task 3: PricingService

- [x] 3.1 Create `backend/src/services/pricing-service.ts` with pure functions: `getTierLimits(tier)`, `resolveTierFromSubscription(status, planId, manualTier?, tierSource?)`, `canPerformImageScan(tier, count, limits)`, `canCreateVocabularyList(tier, count, limits)`, `canAccessAiTraining(tier)`, `shouldResetPeriodCounter(periodStart, currentPeriodEnd)`
- [x] 3.2 Add `UpgradeRequiredError` class with `code`, `currentTier`, `requiredTier`, `limitType`, `currentUsage`, and `limit` fields
- [x] 3.3 Implement `PricingService` class methods: `checkImageScanLimit`, `checkVocabularyListLimit`, `checkAiTrainingAccess`, `incrementImageScanCount`, `incrementVocabularyListCount`, `decrementVocabularyListCount`, `getUsageStatus`, `setUserTier`, `resolveAndUpdateTier`, `getTierStatistics`
- [x] 3.4 Implement grace period logic: when subscription is PAST_DUE, set `gracePeriodEnd` to 7 days from now; on subsequent checks, downgrade to FREE if grace period expired
- [x] 3.5 Implement billing period reset: in `checkImageScanLimit`, call `shouldResetPeriodCounter` and reset counter if period rolled over for BASIC tier users

## Task 4: Lambda Resolver Integration

- [x] 4.1 Update `backend/src/gql-lambda-functions/Mutation.analyzeImageVocabulary.ts` to call `PricingService.checkImageScanLimit` before creating the PENDING record, and call `incrementImageScanCount` with the number of images after success
- [x] 4.2 Create or update vocabulary list creation Lambda(s) to call `PricingService.checkVocabularyListLimit` before creation and `incrementVocabularyListCount` after success
- [x] 4.3 Update vocabulary list deletion Lambda (`Mutation.deleteVocabularyList.ts`) to call `PricingService.decrementVocabularyListCount` after successful deletion
- [x] 4.4 Update training creation Lambda (`Mutation.createTraining.ts`) to call `PricingService.checkAiTrainingAccess` when training mode is AI-based
- [x] 4.5 Create `backend/src/gql-lambda-functions/Query.getUsageLimits.ts` Lambda resolver that calls `PricingService.getUsageStatus` and returns the result
- [x] 4.6 Create `backend/src/gql-lambda-functions/Mutation.adminSetUserTier.ts` Lambda resolver with admin authorization check, calling `PricingService.setUserTier`
- [x] 4.7 Create `backend/src/gql-lambda-functions/Query.getTierStatistics.ts` Lambda resolver with admin authorization check, calling `PricingService.getTierStatistics`

## Task 5: CDK API Stack Updates

- [x] 5.1 Update `backend/lib/api-stack.ts` to accept `usageCountersTable` in props and pass `USAGE_COUNTERS_TABLE_NAME` env var to all relevant Lambda functions
- [x] 5.2 Add Lambda functions and resolvers for `getUsageLimits`, `adminSetUserTier`, and `getTierStatistics` in `backend/lib/api-stack.ts`
- [x] 5.3 Grant read/write permissions on `usageCountersTable` to image analysis, vocabulary, training, and new pricing Lambda functions
- [x] 5.4 Update `backend/bin/backend.ts` to pass `usageCountersTable` from BaseStack to APIStack

## Task 6: Subscription Webhook Tier Sync

- [x] 6.1 Update `backend/src/services/payment-service.ts` webhook handlers (`handleSubscriptionUpdated`, `handleSubscriptionDeleted`, `handlePaymentFailed`) to call `PricingService.resolveAndUpdateTier` after updating subscription status
- [x] 6.2 Update App Store and Play Store receipt validation handlers to call `PricingService.resolveAndUpdateTier` after validating receipts
- [x] 6.3 Update `Mutation.createUser.ts` (or the DynamoDB resolver) to set `tier: FREE` and `tierSource: SUBSCRIPTION` as defaults on new user creation

## Task 7: Flutter Subscription Screen Redesign

- [x] 7.1 Add `loadUsageLimits()` method to `subscription_provider.dart` that calls the `getUsageLimits` GraphQL query and exposes tier, usage counts, and limits
- [x] 7.2 Redesign `subscription_screen.dart` to display three tier cards: Free ($0, 5 scans, 5 lists, no AI), Basic ($2.99/mo, 25 scans/period, unlimited lists, no AI), Pro ($9.99/mo, unlimited everything, AI training)
- [x] 7.3 Add usage indicators to the subscription screen showing current usage vs limits for the user's active tier (e.g., "3/5 image scans used")
- [x] 7.4 Update plan IDs in the subscription screen to use `basic-monthly` and `pro-monthly` matching backend Stripe price IDs

## Task 8: Flutter Admin Screen Extensions

- [x] 8.1 Add a "Users" tab to `admin_screen.dart` displaying all users with their tier (FREE/BASIC/PRO) and tier source (subscription provider or "Manual")
- [x] 8.2 Add tier override controls to the Users tab: a dropdown to select a tier and a button to apply the `adminSetUserTier` mutation
- [x] 8.3 Add `adminSetUserTier(userId, tier)` method to `user_provider.dart` calling the GraphQL mutation
- [x] 8.4 Add a "Tier Stats" tab to `admin_screen.dart` displaying aggregate counts per tier (subscription vs manual) using the `getTierStatistics` query
- [x] 8.5 Implement auto-refresh of tier statistics when the tab is selected or after a manual tier override

## Task 9: Angular Join Page Pricing Section

- [x] 9.1 Add a pricing section to `join_page/src/app/pages/home.component.html` between the features section and the CTA/register section with three pricing cards (Free/$0, Basic/$2.99, Pro/$9.99)
- [x] 9.2 List feature limits on each pricing card: Free (5 scans, 5 lists, no AI), Basic (25 scans/mo, unlimited lists, no AI), Pro (unlimited everything, AI training "Coming Soon")
- [x] 9.3 Visually highlight the Pro plan as recommended (border, badge, or similar styling)
- [x] 9.4 Add "Get Started" buttons on each pricing card that scroll to the registration form
- [x] 9.5 Add `scrollToPricing()` method to `home.component.ts` and a "Pricing" button in the nav bar
- [x] 9.6 Add corresponding CSS styles for the pricing cards in `home.component.css`

## Task 10: Property-Based Tests

- [x] 10.1 Install `fast-check` as a dev dependency (`npm install --save-dev fast-check`)
- [x] 10.2 Create `backend/test/pricing-service.property.test.ts` with property tests for: tier resolution correctness (Property 1), image scan limit enforcement (Property 2), vocabulary list limit enforcement (Property 3), grace period enforcement (Property 7), billing period counter reset (Property 8) — minimum 100 iterations each
- [x] 10.3 Create `backend/test/usage-counter.property.test.ts` with property tests for: image scan counter increment (Property 4), vocabulary list counter round-trip (Property 5), data preservation on tier transition (Property 6) — minimum 100 iterations each

## Task 11: Unit & Integration Tests

- [x] 11.1 Create `backend/test/pricing-service.test.ts` with unit tests for: AI training access per tier, error structure for UPGRADE_REQUIRED, default FREE tier on new user, missing counter defaults to zero
- [x] 11.2 Update `backend/test/admin-authorization.test.ts` to add tests for `adminSetUserTier` and `getTierStatistics` admin-only authorization
- [x] 11.3 Update `backend/test/api-stack.spec.ts` to verify the new UsageCounters table, Lambda functions, and resolvers are created in the CDK stack
