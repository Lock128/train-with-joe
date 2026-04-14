# Requirements Document

## Introduction

This feature replaces the hardcoded plan/product IDs (`basic-monthly`, `pro-monthly`) with a configurable system that supports different IDs per namespace (sandbox, beta, prod) and per payment platform (Stripe for web, App Store for iOS, Play Store for Android). Currently, the `PLAN_TIER_MAP` in `PricingService` and the `planId` values in the Flutter `SubscriptionScreen` are hardcoded strings. This feature introduces SSM Parameter Store-backed configuration so that each namespace can define its own Stripe price IDs, App Store product IDs, and Play Store product IDs, and the backend can resolve any of these platform-specific IDs to the correct tier.

## Glossary

- **Plan_ID_Config**: The configuration data structure that maps payment platform product identifiers to tiers (BASIC, PRO) for a given namespace
- **Pricing_Service**: The backend service (`backend/src/services/pricing-service.ts`) responsible for tier resolution and usage limit enforcement
- **Subscription_Screen**: The Flutter screen (`frontend/src/lib/screens/subscription_screen.dart`) that displays available plans and initiates purchases
- **Payment_Service_Flutter**: The Flutter service (`frontend/src/lib/services/payment_service.dart`) that detects the payment platform and processes purchases
- **Payment_Service_Backend**: The backend service (`backend/src/services/payment-service.ts`) that handles Stripe checkout, App Store receipt validation, and Play Store receipt validation
- **SSM_Parameter_Store**: AWS Systems Manager Parameter Store, used to store namespace-scoped configuration under the `/<namespace>/config/` path pattern
- **Namespace**: A deployment environment identifier (sandbox, beta, prod) that scopes all configuration
- **Stripe_Price_ID**: The price identifier used by Stripe for web-based subscription checkout (e.g., `price_abc123`)
- **App_Store_Product_ID**: The product identifier configured in App Store Connect for iOS in-app purchases
- **Play_Store_Product_ID**: The product identifier configured in Google Play Console for Android in-app purchases
- **Tier**: One of three access levels — FREE, BASIC, or PRO — that determines a user's feature access and usage limits
- **PLAN_TIER_MAP**: The current hardcoded mapping in `PricingService` that maps plan ID strings to Tier enum values

## Requirements

### Requirement 1: SSM Parameter Store Configuration for Plan IDs

**User Story:** As a developer, I want plan/product IDs stored in SSM Parameter Store per namespace, so that each environment can use its own Stripe prices, App Store products, and Play Store products without code changes.

#### Acceptance Criteria

1. THE Plan_ID_Config SHALL define plan IDs for three payment platforms: Stripe, App Store, and Play Store
2. THE Plan_ID_Config SHALL define plan IDs for two paid tiers: BASIC and PRO
3. THE Plan_ID_Config SHALL be stored in SSM_Parameter_Store under the path `/<namespace>/config/plan-ids`
4. THE Plan_ID_Config SHALL use a JSON structure containing keys for each combination of platform and tier (e.g., `stripe.basic`, `stripe.pro`, `appStore.basic`, `appStore.pro`, `playStore.basic`, `playStore.pro`)
5. WHEN a new namespace is deployed, THE Plan_ID_Config SHALL be provisioned via CDK as an SSM parameter with placeholder values that must be updated before the namespace is operational
6. THE Plan_ID_Config SHALL support different product IDs across namespaces so that sandbox uses test Stripe prices and test store product IDs while prod uses live ones

### Requirement 2: Backend Plan ID Loading

**User Story:** As a developer, I want the backend to load plan IDs from configuration at startup, so that the tier resolution logic uses the correct IDs for the current namespace.

#### Acceptance Criteria

1. WHEN the Pricing_Service initializes, THE Pricing_Service SHALL load the Plan_ID_Config from SSM_Parameter_Store for the current namespace
2. THE Pricing_Service SHALL replace the hardcoded PLAN_TIER_MAP with a dynamically loaded mapping built from the Plan_ID_Config
3. THE Pricing_Service SHALL cache the loaded Plan_ID_Config in memory to avoid repeated SSM calls on every request
4. IF the Plan_ID_Config SSM parameter is missing or malformed, THEN THE Pricing_Service SHALL log an error and fall back to an empty mapping that resolves all unknown plan IDs to the FREE tier
5. THE Pricing_Service SHALL expose the loaded plan ID configuration via a `getPlanIds` method for use by other backend services

### Requirement 3: Tier Resolution from Platform-Specific Product IDs

**User Story:** As a developer, I want the tier resolution logic to recognize product IDs from all three payment platforms, so that a user's tier is correctly determined regardless of which platform they subscribed on.

#### Acceptance Criteria

1. WHEN a subscription has an ACTIVE status, THE Pricing_Service SHALL resolve the tier by matching the subscription's `planId` against all platform entries (Stripe, App Store, Play Store) in the loaded Plan_ID_Config
2. WHEN a Stripe webhook delivers a subscription event with a Stripe_Price_ID, THE Pricing_Service SHALL resolve the correct tier from the Stripe entries in the Plan_ID_Config
3. WHEN an App Store receipt is validated and the subscription's `planId` is set, THE Pricing_Service SHALL resolve the correct tier from the App Store entries in the Plan_ID_Config
4. WHEN a Play Store receipt is validated with a `productId`, THE Pricing_Service SHALL resolve the correct tier from the Play Store entries in the Plan_ID_Config
5. IF a subscription's `planId` does not match any entry in the Plan_ID_Config, THEN THE Pricing_Service SHALL resolve the tier to FREE and log a warning including the unrecognized plan ID
6. FOR ALL valid Plan_ID_Config entries, loading the config then resolving each configured product ID SHALL return the expected tier (round-trip property)

### Requirement 4: App Store Receipt Validation Plan ID Mapping

**User Story:** As a developer, I want App Store receipt validation to store the correct platform-specific product ID, so that tier resolution works for iOS subscribers.

#### Acceptance Criteria

1. WHEN an App Store receipt is validated, THE Payment_Service_Backend SHALL extract the product identifier from the receipt's `latest_receipt_info`
2. WHEN creating or updating a subscription from an App Store receipt, THE Payment_Service_Backend SHALL store the extracted product identifier as the subscription's `planId` instead of the current hardcoded `appstore-subscription` string
3. THE Pricing_Service SHALL resolve the tier for App Store subscriptions using the stored product identifier matched against the App Store entries in the Plan_ID_Config

### Requirement 5: Play Store Receipt Validation Plan ID Mapping

**User Story:** As a developer, I want Play Store receipt validation to store the product ID from the purchase, so that tier resolution works for Android subscribers.

#### Acceptance Criteria

1. WHEN a Play Store receipt is validated, THE Payment_Service_Backend SHALL use the `productId` provided in the validation request as the subscription's `planId`
2. THE Pricing_Service SHALL resolve the tier for Play Store subscriptions using the stored product identifier matched against the Play Store entries in the Plan_ID_Config

### Requirement 6: Flutter Plan ID Configuration via API

**User Story:** As a mobile/web developer, I want the Flutter app to fetch the correct plan IDs for the current platform from the backend, so that the subscription screen uses the right product IDs for purchases.

#### Acceptance Criteria

1. THE Pricing_Service SHALL expose a GraphQL query `getPlanIds` that returns the plan IDs for a specified payment platform (Stripe, App Store, or Play Store)
2. WHEN the Subscription_Screen loads, THE Subscription_Screen SHALL fetch the plan IDs for the detected payment platform via the `getPlanIds` query
3. THE Subscription_Screen SHALL use the fetched plan IDs when initiating purchases instead of the hardcoded `basic-monthly` and `pro-monthly` strings
4. IF the `getPlanIds` query fails, THEN THE Subscription_Screen SHALL display an error message and disable the purchase buttons
5. THE Payment_Service_Flutter SHALL pass the platform-specific plan ID received from the backend to the payment processing flow

### Requirement 7: Stripe Checkout Plan ID Integration

**User Story:** As a developer, I want the Stripe checkout flow to use the configured Stripe price ID, so that the correct Stripe product is used per namespace.

#### Acceptance Criteria

1. WHEN the `createStripeCheckout` mutation is called, THE Payment_Service_Backend SHALL use the `planId` provided by the frontend (which was fetched from the `getPlanIds` query) as the Stripe price ID in the checkout session
2. WHEN a Stripe webhook delivers a subscription event, THE Payment_Service_Backend SHALL store the Stripe price ID from the subscription's line items as the subscription's `planId`
3. THE Pricing_Service SHALL resolve the tier for Stripe subscriptions using the stored Stripe price ID matched against the Stripe entries in the Plan_ID_Config

### Requirement 8: CDK Infrastructure for Plan ID Parameters

**User Story:** As a developer, I want the CDK stack to provision the SSM parameter for plan IDs, so that the configuration exists in every namespace deployment.

#### Acceptance Criteria

1. THE BaseStack SHALL create an SSM_Parameter_Store parameter at `/<namespace>/config/plan-ids` with a default JSON value containing placeholder product IDs
2. THE BaseStack SHALL pass the SSM parameter path as an environment variable `PLAN_IDS_SSM_PATH` to all Lambda functions that use the Pricing_Service
3. WHEN the CDK stack is deployed to a new namespace, THE BaseStack SHALL create the plan IDs parameter with placeholder values that indicate they need to be configured (e.g., `CONFIGURE_ME_stripe_basic`)
4. THE BaseStack SHALL not overwrite existing plan ID parameter values on subsequent deployments so that manually configured production values are preserved

