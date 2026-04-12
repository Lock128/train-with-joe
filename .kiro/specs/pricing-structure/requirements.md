# Requirements Document

## Introduction

This feature introduces a tiered pricing structure for the "Train with Joe" vocabulary learning app. Currently the app has no concept of tiers or usage limits — users either have an active subscription or they don't. This feature defines a Free tier with enforced limits, a Basic paid tier, and a Pro paid tier, each with distinct capabilities. The pricing information must be accurately reflected in the Flutter frontend, the Angular join/landing page, and enforced in the backend.

## Glossary

- **App**: The Train with Joe vocabulary learning application across all platforms (web, iOS, Android)
- **Pricing_Service**: The backend service responsible for determining a user's tier and enforcing usage limits
- **Subscription_Screen**: The Flutter screen that displays available plans and manages subscription actions
- **Join_Page**: The Angular landing page at `join_page/` where new users register
- **Image_Scan**: The action of uploading one or more images for AI-powered vocabulary extraction via the `analyzeImageVocabulary` mutation
- **Vocabulary_List**: A user-created or AI-generated collection of vocabulary words stored in DynamoDB
- **AI_Training**: The upcoming AI-powered training mode that uses generative AI to create adaptive exercises (currently under development in `.kiro/specs/ai-training-mode/`)
- **Tier**: One of three access levels — Free, Basic, or Pro — that determines a user's feature access and usage limits
- **Usage_Counter**: A per-user record tracking cumulative usage of limited resources (image scans, vocabulary lists) within the current billing period or lifetime for free users
- **Admin_Screen**: The Flutter admin screen at `frontend/src/lib/screens/admin_screen.dart` that provides administrative tools for managing users, statistics, and data migration
- **Manual_Tier_Override**: An admin-initiated tier assignment that grants a user access to a tier's features without an associated billing subscription, marked as "not-billed"

## Requirements

### Requirement 1: Tier Data Model

**User Story:** As a developer, I want a tier concept in the data model, so that the system can distinguish between Free, Basic, and Pro users.

#### Acceptance Criteria

1. THE Pricing_Service SHALL define three tiers: FREE, BASIC, and PRO
2. WHEN a new user is created, THE Pricing_Service SHALL assign the FREE tier by default
3. WHEN a user's subscription becomes ACTIVE with a Basic plan, THE Pricing_Service SHALL assign the BASIC tier to that user
4. WHEN a user's subscription becomes ACTIVE with a Pro plan, THE Pricing_Service SHALL assign the PRO tier to that user
5. WHEN a user's subscription status changes to CANCELLED or INACTIVE, THE Pricing_Service SHALL assign the FREE tier to that user
6. THE App SHALL expose the user's current tier via the GraphQL `User` type as a `tier` field with enum values FREE, BASIC, and PRO

### Requirement 2: Free Tier Usage Limits

**User Story:** As a product owner, I want free-tier users to have enforced usage limits, so that the free tier provides a useful trial without unlimited resource consumption.

#### Acceptance Criteria

1. WHILE a user has the FREE tier, THE Pricing_Service SHALL allow a maximum of 5 Image_Scans in total
2. WHILE a user has the FREE tier, THE Pricing_Service SHALL allow a maximum of 5 Vocabulary_Lists in total
3. WHILE a user has the FREE tier, THE Pricing_Service SHALL restrict access to AI_Training features by returning an upgrade-required error
4. WHEN a FREE tier user attempts to create a 6th Vocabulary_List, THE Pricing_Service SHALL reject the request and return an error indicating the free tier limit has been reached
5. WHEN a FREE tier user attempts to perform a 6th Image_Scan, THE Pricing_Service SHALL reject the request and return an error indicating the free tier limit has been reached
6. THE Pricing_Service SHALL track the cumulative count of Image_Scans and Vocabulary_Lists per user via a Usage_Counter

### Requirement 3: Basic Tier Capabilities

**User Story:** As a paying user on the Basic plan, I want expanded access to app features, so that I get value from my subscription.

#### Acceptance Criteria

1. WHILE a user has the BASIC tier, THE Pricing_Service SHALL allow unlimited Vocabulary_Lists
2. WHILE a user has the BASIC tier, THE Pricing_Service SHALL allow up to 25 Image_Scans per billing period
3. WHILE a user has the BASIC tier, THE Pricing_Service SHALL restrict access to AI_Training features by returning an upgrade-required error
4. WHEN a BASIC tier user's billing period resets, THE Pricing_Service SHALL reset the Image_Scan Usage_Counter to zero
5. WHEN a BASIC tier user exceeds 25 Image_Scans in a billing period, THE Pricing_Service SHALL reject the request and return an error indicating the limit has been reached

### Requirement 4: Pro Tier Capabilities

**User Story:** As a paying user on the Pro plan, I want full access to all app features, so that I can use every capability the app offers.

#### Acceptance Criteria

1. WHILE a user has the PRO tier, THE Pricing_Service SHALL allow unlimited Vocabulary_Lists
2. WHILE a user has the PRO tier, THE Pricing_Service SHALL allow unlimited Image_Scans
3. WHILE a user has the PRO tier, THE Pricing_Service SHALL allow access to AI_Training features

### Requirement 5: Backend Limit Enforcement

**User Story:** As a developer, I want usage limits enforced at the backend API layer, so that limits cannot be bypassed by client-side manipulation.

#### Acceptance Criteria

1. WHEN the `analyzeImageVocabulary` mutation is called, THE Pricing_Service SHALL check the user's tier and Image_Scan Usage_Counter before processing the request
2. WHEN a new Vocabulary_List is created (via image analysis or manual creation), THE Pricing_Service SHALL check the user's tier and Vocabulary_List count before allowing creation
3. WHEN a training with AI_Training mode is created, THE Pricing_Service SHALL check the user's tier before allowing creation
4. IF a usage limit check fails, THEN THE Pricing_Service SHALL return a structured GraphQL error with an `UPGRADE_REQUIRED` error code and a human-readable message
5. THE Pricing_Service SHALL expose a `getUsageLimits` query that returns the user's current usage counts and tier limits for Image_Scans and Vocabulary_Lists

### Requirement 6: Flutter Subscription Screen Pricing

**User Story:** As a user viewing the subscription screen in the Flutter app, I want to see accurate pricing and feature details for each tier, so that I can make an informed purchase decision.

#### Acceptance Criteria

1. THE Subscription_Screen SHALL display the Free tier with its limits: 5 image scans, 5 vocabulary lists, no AI training
2. THE Subscription_Screen SHALL display the Basic plan at $2.99/month with its limits: unlimited vocabulary lists, 25 image scans per month, no AI training
3. THE Subscription_Screen SHALL display the Pro plan at $9.99/month with its capabilities: unlimited vocabulary lists, unlimited image scans, AI training access
4. WHEN a user is on the Free tier, THE Subscription_Screen SHALL display the user's current usage counts alongside the tier limits
5. WHEN a user is on the Basic tier, THE Subscription_Screen SHALL display the user's current billing-period Image_Scan count alongside the tier limit
6. THE Subscription_Screen SHALL use plan IDs that match the backend Stripe price IDs and app store product IDs

### Requirement 7: Join Page Pricing Section

**User Story:** As a visitor on the landing page, I want to see a clear pricing comparison, so that I understand what each tier offers before signing up.

#### Acceptance Criteria

1. THE Join_Page SHALL display a pricing section between the features section and the registration section
2. THE Join_Page SHALL display three pricing cards: Free ($0), Basic ($2.99/mo), and Pro ($9.99/mo)
3. THE Join_Page SHALL list the specific feature limits for each tier on its pricing card
4. THE Join_Page SHALL visually highlight the Pro plan as the recommended option
5. WHEN a visitor clicks "Get Started" on any pricing card, THE Join_Page SHALL scroll to the registration form
6. THE Join_Page SHALL label AI_Training as "Coming Soon" on the Pro tier card

### Requirement 8: Usage Tracking

**User Story:** As a developer, I want reliable usage tracking, so that limits are enforced accurately and users see correct usage data.

#### Acceptance Criteria

1. WHEN an Image_Scan completes successfully, THE Pricing_Service SHALL increment the user's Image_Scan Usage_Counter by the number of images analyzed
2. WHEN a Vocabulary_List is created successfully, THE Pricing_Service SHALL increment the user's Vocabulary_List Usage_Counter by one
3. WHEN a Vocabulary_List is deleted, THE Pricing_Service SHALL decrement the user's Vocabulary_List Usage_Counter by one
4. THE Pricing_Service SHALL store Usage_Counter data in DynamoDB with the user's ID as the partition key
5. IF a Usage_Counter record does not exist for a user, THEN THE Pricing_Service SHALL treat all counters as zero

### Requirement 9: Tier Transition Handling

**User Story:** As a user who upgrades or downgrades, I want my existing data preserved and limits applied correctly, so that tier changes are seamless.

#### Acceptance Criteria

1. WHEN a user upgrades from FREE to BASIC or PRO, THE Pricing_Service SHALL retain all existing Vocabulary_Lists and Image_Scan history
2. WHEN a user downgrades from a paid tier to FREE, THE Pricing_Service SHALL retain all existing Vocabulary_Lists even if the count exceeds the free limit
3. WHILE a downgraded FREE user has more than 5 Vocabulary_Lists, THE Pricing_Service SHALL prevent creation of new Vocabulary_Lists but allow access to existing ones
4. WHEN a user upgrades from BASIC to PRO, THE Pricing_Service SHALL immediately grant access to AI_Training features
5. WHEN a user's subscription payment fails and status becomes PAST_DUE, THE Pricing_Service SHALL maintain the current tier for a grace period of 7 days before downgrading to FREE

### Requirement 10: Admin User Tier Management

**User Story:** As an admin, I want to view all users with their current tier and manually override a user's tier, so that I can grant or revoke access for testing, support, or promotional purposes.

#### Acceptance Criteria

1. THE Admin_Screen SHALL display a user list tab showing all users with their current tier (FREE, BASIC, or PRO) and whether the tier was assigned via subscription or Manual_Tier_Override
2. THE Admin_Screen SHALL allow an admin to change a user's tier to FREE, BASIC, or PRO via a Manual_Tier_Override
3. WHEN an admin performs a Manual_Tier_Override, THE Pricing_Service SHALL mark the user's tier as "not-billed" to distinguish it from subscription-based tier assignments
4. WHEN a Manual_Tier_Override is applied, THE Pricing_Service SHALL immediately grant the user access to the corresponding tier's features and limits
5. WHEN a user with a Manual_Tier_Override subsequently purchases a subscription, THE Pricing_Service SHALL replace the manual override with the subscription-based tier assignment
6. THE Pricing_Service SHALL expose an `adminSetUserTier` mutation that accepts a user ID and target tier, restricted to admin users only
7. THE Admin_Screen SHALL display the user's tier source (subscription provider name or "Manual") alongside the tier value

### Requirement 11: Admin Tier Statistics Dashboard

**User Story:** As an admin, I want to see aggregate statistics on how many users are on each tier, so that I can monitor adoption and plan capacity.

#### Acceptance Criteria

1. THE Admin_Screen SHALL display a tier statistics tab showing the total number of users on each tier (FREE, BASIC, PRO)
2. THE Admin_Screen SHALL display the count of manually overridden (not-billed) users separately from subscription-based users for each tier
3. THE Pricing_Service SHALL expose a `getTierStatistics` query that returns the user count per tier, restricted to admin users only
4. THE Admin_Screen SHALL refresh the tier statistics when the tab is selected or when a Manual_Tier_Override is performed
