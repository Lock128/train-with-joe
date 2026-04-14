# Implementation Plan: Plan ID Configuration

## Overview

Replace hardcoded `PLAN_TIER_MAP` and plan ID strings with a dynamic, SSM Parameter Store-backed configuration system. Implementation proceeds bottom-up: data structures and pure logic first, then backend service integration, GraphQL API, CDK infrastructure, receipt validation fixes, and finally Flutter frontend changes.

## Tasks

- [x] 1. Create PlanIdConfig data structure and PlanIdConfigLoader module
  - [x] 1.1 Create `backend/src/services/plan-id-config-loader.ts` with `PlanIdConfig` interface, `validateConfig`, `buildReverseLookupMap`, and `loadConfig` functions
    - Define `PlanIdConfig` interface with `stripe`, `appStore`, `playStore` keys, each containing `basic` and `pro` string entries
    - Implement `validateConfig(raw: unknown): PlanIdConfig | null` — validates all required keys exist and values are non-empty strings; rejects duplicate product IDs that map to different tiers
    - Implement `buildReverseLookupMap(config: PlanIdConfig): Record<string, Tier>` — builds a flat map from any product ID to its tier
    - Implement `loadConfig(ssmPath: string): Promise<PlanIdConfig>` — reads SSM parameter, parses JSON, validates, returns config
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2_

  - [x] 1.2 Write property test: Config structure validation round-trip (Property 1)
    - **Property 1: Config structure validation round-trip**
    - Generate random valid/invalid config objects, verify `validateConfig` accepts/rejects correctly
    - **Validates: Requirements 1.1, 1.2, 1.4**

  - [x] 1.3 Write property test: Config load and tier resolution round-trip (Property 2)
    - **Property 2: Config load and tier resolution round-trip**
    - Generate random valid configs with unique product IDs, build reverse map, resolve each ID, verify correct tier
    - **Validates: Requirements 2.2, 3.1, 3.2, 3.3, 3.4, 3.6**

  - [x] 1.4 Write property test: Malformed config rejection (Property 3)
    - **Property 3: Malformed config rejection**
    - Generate random malformed inputs (bad JSON, missing keys, non-string values), verify `validateConfig` returns null
    - **Validates: Requirements 2.4**

  - [x] 1.5 Write property test: Unknown plan ID fallback to FREE (Property 4)
    - **Property 4: Unknown plan ID fallback to FREE**
    - Generate random valid configs and random strings not in the config, verify resolution returns FREE
    - **Validates: Requirements 3.5**

  - [x] 1.6 Write property test: getPlanIds returns correct platform-specific IDs (Property 5)
    - **Property 5: getPlanIds returns correct platform-specific IDs**
    - Generate random valid configs, call `getPlanIds` for each platform, verify correct IDs returned
    - **Validates: Requirements 2.5, 6.1**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Modify PricingService to use dynamic plan ID config
  - [x] 3.1 Update `backend/src/services/pricing-service.ts` to remove hardcoded `PLAN_TIER_MAP` and add dynamic config loading
    - Add `private planTierMap: Record<string, Tier>` and `private planIdConfig: PlanIdConfig | null` instance fields
    - Add `async initialize(): Promise<void>` method that reads `PLAN_IDS_SSM_PATH` env var, calls `loadConfig`, builds reverse map via `buildReverseLookupMap`, and caches both in memory
    - On failure (missing/malformed SSM parameter), log error and set `planTierMap` to empty `{}` so all unknown plan IDs resolve to FREE
    - Add `getPlanIds(platform: PaymentProvider): { basicPlanId: string; proPlanId: string }` method that returns plan IDs for a given platform from the cached config
    - Return error if `initialize()` has not been called or config is null
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5_

  - [x] 3.2 Update `resolveTierFromSubscription` to use the dynamic `planTierMap` instead of the hardcoded constant
    - Change the function to accept a `planTierMap` parameter (or access it from the instance) instead of referencing the removed `PLAN_TIER_MAP` constant
    - Ensure unknown plan IDs resolve to FREE and log a warning
    - _Requirements: 3.1, 3.5_

  - [x] 3.3 Write unit tests for PricingService config integration
    - Test `initialize()` with valid SSM config loads correctly
    - Test `initialize()` with missing/malformed SSM parameter falls back to empty map
    - Test `getPlanIds` returns error when config not loaded
    - Test `getPlanIds` returns correct IDs for each platform
    - Test `resolveTierFromSubscription` uses dynamic map
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Add GraphQL schema types and getPlanIds query
  - [x] 4.1 Update `backend/src/gql-schemas/schema.graphql` with new types and query
    - Add `PlanIds` type with `basicPlanId: String!` and `proPlanId: String!`
    - Add `PlanIdsResponse` type with `success: Boolean!`, `planIds: PlanIds`, `error: String`
    - Add `getPlanIds(platform: PaymentProvider!): PlanIdsResponse` to the `Query` type
    - All types annotated with `@aws_cognito_user_pools`
    - _Requirements: 6.1_

  - [x] 4.2 Create `backend/src/gql-lambda-functions/Query.getPlanIds.ts` Lambda resolver
    - Extract `platform` argument from event
    - Call `PricingService.getInstance().initialize()` then `getPlanIds(platform)`
    - Return `{ success: true, planIds: { basicPlanId, proPlanId } }` on success
    - Return `{ success: false, error: ... }` on failure
    - _Requirements: 6.1_

- [x] 5. Fix App Store receipt validation to store actual product ID
  - [x] 5.1 Update `backend/src/gql-lambda-functions/Mutation.validateAppStoreReceipt.ts`
    - Extract `product_id` from `validation` result (the `latest_receipt_info` already parsed by `PaymentService.validateAppStoreReceipt`)
    - Update `backend/src/services/payment-service.ts` `validateAppStoreReceipt` to return `productId` from `latestReceipt.product_id` in the result
    - Store the extracted product ID as `planId` in the subscription record instead of the hardcoded `'appstore-subscription'`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.2 Write unit tests for App Store receipt product ID extraction
    - Test that `validateAppStoreReceipt` returns `productId` from receipt
    - Test that subscription record stores the actual product ID as `planId`
    - _Requirements: 4.1, 4.2_

- [x] 6. Verify Play Store receipt validation stores productId
  - [x] 6.1 Verify `backend/src/gql-lambda-functions/Mutation.validatePlayStoreReceipt.ts` already stores `input.productId` as `planId`
    - Confirm the existing code at `planId: input.productId` is correct — no code change needed if already correct
    - Add a comment documenting that this is the Play Store product ID used for tier resolution
    - _Requirements: 5.1, 5.2_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update CDK BaseStack to create SSM parameter for plan IDs
  - [x] 8.1 Modify `backend/lib/base-stack.ts` to add plan IDs SSM parameter
    - Create `StringParameter` at `/<namespace>/config/plan-ids` with default placeholder JSON containing `CONFIGURE_ME_*` values for all six platform/tier combinations
    - Use a construct that does not overwrite existing values on subsequent deploys (use `valueForStringParameter` lookup pattern or initial-value-only approach)
    - Expose the parameter path as a public property `planIdsSsmPath`
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 8.2 Update `backend/test/base-stack.spec.ts` with plan IDs SSM parameter assertions
    - Assert SSM parameter exists at `/<namespace>/config/plan-ids`
    - Assert default value contains `CONFIGURE_ME` placeholders
    - _Requirements: 8.1, 8.3_

- [x] 9. Update CDK APIStack for getPlanIds Lambda and env vars
  - [x] 9.1 Modify `backend/lib/api-stack.ts` to add `PLAN_IDS_SSM_PATH` env var and SSM permissions
    - Add `PLAN_IDS_SSM_PATH` environment variable (value: `/<namespace>/config/plan-ids`) to all pricing Lambda functions and receipt validation Lambda functions that use `PricingService`
    - Grant `ssm:GetParameter` permission for the plan-ids parameter ARN to those Lambda functions
    - _Requirements: 8.2_

  - [x] 9.2 Add `getPlanIds` Lambda function and AppSync resolver in `backend/lib/api-stack.ts`
    - Create new `NodejsFunction` for `Query.getPlanIds.ts` with pricing Lambda props
    - Include `PLAN_IDS_SSM_PATH` env var and SSM read permission
    - Add Lambda data source and create resolver for `Query.getPlanIds`
    - _Requirements: 6.1, 8.2_

  - [x] 9.3 Update `backend/test/api-stack.spec.ts` with getPlanIds assertions
    - Assert `getPlanIds` resolver exists
    - Assert Lambda functions have `PLAN_IDS_SSM_PATH` environment variable
    - Assert data source count is updated (from 31 to 32)
    - _Requirements: 8.2_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Update Flutter SubscriptionProvider to load plan IDs from API
  - [x] 11.1 Add `loadPlanIds` method to `frontend/src/lib/providers/subscription_provider.dart`
    - Add `String? _basicPlanId` and `String? _proPlanId` fields with getters
    - Add `bool _planIdsLoaded` and `String? _planIdsError` fields with getters
    - Implement `Future<void> loadPlanIds(String platform)` that calls the `getPlanIds` GraphQL query
    - Store fetched plan IDs in state and call `notifyListeners()`
    - On failure, set `_planIdsError` and leave plan IDs null
    - _Requirements: 6.2, 6.5_

- [x] 12. Update Flutter SubscriptionScreen to use dynamic plan IDs
  - [x] 12.1 Modify `frontend/src/lib/screens/subscription_screen.dart` to fetch and use dynamic plan IDs
    - On `initState`, call `provider.loadPlanIds(detectedPlatform)` to fetch plan IDs for the current platform
    - Replace hardcoded `'basic-monthly'` and `'pro-monthly'` in `_buildTierCard` calls with `provider.basicPlanId` and `provider.proPlanId`
    - If `provider.planIdsError` is set, show an error banner and disable purchase buttons
    - If plan IDs are still loading, show a loading indicator on the tier cards
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–5)
- Unit tests validate specific examples and edge cases
- The backend uses TypeScript with Vitest and fast-check; the frontend uses Dart/Flutter
