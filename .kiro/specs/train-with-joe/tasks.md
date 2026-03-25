# Implementation Plan: Train with Joe

## Overview

This implementation plan breaks down the Train with Joe into discrete coding tasks. The template provides a production-ready foundation for Flutter-based SaaS applications with AWS backend infrastructure, including authentication, data storage, GraphQL API, payment processing (Stripe + App Store + Play Store), AI content enhancement, and Angular landing pages.

The implementation follows an incremental approach: infrastructure first, then backend services, then frontend integration, and finally landing pages. Each major component includes property-based tests to validate correctness properties from the design document.

## Tasks

- [x] 1. Initialize project structure and configuration files
  - **Copy from train-with-joe**: Root directory structure, package.json, tsconfig.json, vitest.config.ts, eslint.config.mjs, .prettierrc, .husky/, cdk.json
  - Create root directory structure (backend, frontend, join_page, competitors_page, profile_cards, scripts, documentation)
  - Create backend directory structure (lib, src, test)
  - Copy package.json from train-with-joe/backend and remove social media dependencies (keep aws-cdk-lib, vitest, esbuild, eslint, prettier, husky, stripe, fast-check)
  - Copy tsconfig.json from train-with-joe/backend
  - Copy vitest.config.ts from train-with-joe/backend
  - Copy eslint.config.mjs from train-with-joe/backend (flat config format)
  - Copy .prettierrc from train-with-joe/backend
  - Copy .husky/ directory from train-with-joe for pre-commit hooks
  - Copy cdk.json from train-with-joe/backend and simplify context
  - Copy .gitignore from train-with-joe
  - _Requirements: 10.1, 10.2, 10.3, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1-13.10, 14.4, 14.5, 14.7_


- [x] 2. Implement base CDK stack with core infrastructure
  - [x] 2.1 Create BaseStack with Cognito user pool configuration
    - **Copy from train-with-joe**: backend/lib/base-stack.ts (Cognito configuration section)
    - Copy Cognito user pool setup from train-with-joe BaseStack
    - Keep email sign-in, password policy, and user pool client configuration
    - Remove OAuth2 providers and social sign-in (not needed for minimal template)
    - Export user pool ID and client ID
    - _Requirements: 1.1, 3.1, 3.2_
  
  - [x] 2.2 Add DynamoDB tables to BaseStack
    - **Copy from train-with-joe**: backend/lib/base-stack.ts (DynamoDB table definitions)
    - Copy Users table definition from train-with-joe BaseStack (simplify by removing social-specific fields)
    - Copy or create Subscriptions table with id partition key and userId GSI
    - Keep billing mode, encryption, and removal policy settings from train-with-joe
    - Export table names and ARNs
    - _Requirements: 1.2, 4.1, 4.7_
  
  - [x] 2.3 Add S3 bucket for application assets
    - **Copy from train-with-joe**: backend/lib/base-stack.ts (S3 bucket configuration)
    - Copy S3 bucket setup from train-with-joe BaseStack
    - Keep versioning, CORS, and lifecycle policies
    - Export bucket name and ARN
    - _Requirements: 1.2_
  
  - [x] 2.4 Write unit tests for BaseStack
    - **Copy from train-with-joe**: backend/test/base-stack.spec.ts or similar stack tests
    - Copy test structure and patterns from train-with-joe CDK stack tests
    - Test stack synthesis without errors
    - Test Cognito user pool configuration
    - Test DynamoDB table schemas
    - _Requirements: 11.1, 11.2_

- [x] 3. Implement GraphQL schema and API stack
  - [x] 3.1 Create GraphQL schema definition
    - **Copy from train-with-joe**: backend/src/gql-schemas/ (User type, common patterns)
    - Copy User type definition from train-with-joe schema (simplify by removing social-specific fields)
    - Copy or adapt Subscription type from train-with-joe billing schema
    - Define SubscriptionStatus and PaymentProvider enums
    - Define Query type with getUser and getSubscriptionStatus operations
    - Define Mutation type with createUser, updateUser, createSubscription, cancelSubscription operations
    - Define Mutation type with validateAppStoreReceipt and validatePlayStoreReceipt operations
    - Copy AI mutation patterns from train-with-joe bedrock schema (enhanceContent, generateContent)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 17.12, 17.13, 17.14, 17.15, 17.16, 18.6, 18.7_
  
  - [x] 3.2 Create APIStack with AppSync GraphQL API
    - **Copy from train-with-joe**: backend/lib/merged-api-stack.ts (AppSync API setup)
    - Copy AppSync API configuration from train-with-joe merged-api-stack
    - Keep Cognito authentication setup
    - Copy Lambda data source configuration patterns
    - Simplify by removing social network-specific data sources
    - Export API endpoint URL and API ID
    - _Requirements: 1.3, 1.8_
  
  - [x] 3.3 Write property test for GraphQL response format
    - **Property 1: GraphQL Response Format Validity**
    - **Validates: Requirements 2.5**
    - Test that valid queries return data field or errors field
    - Use fast-check with 100 iterations
    - _Requirements: 2.5_
  
  - [x] 3.4 Write property test for GraphQL error messages
    - **Property 2: GraphQL Error Message Descriptiveness**
    - **Validates: Requirements 2.6**
    - Test that invalid queries return descriptive error messages
    - Use fast-check with 100 iterations
    - _Requirements: 2.6_


- [x] 4. Implement repository layer for data access
  - [x] 4.1 Create UserRepository class
    - **Copy from train-with-joe**: backend/src/repositories/ (repository pattern and DynamoDB client setup)
    - Copy repository base patterns from train-with-joe repositories
    - Copy DynamoDB client initialization and error handling
    - Implement create method with DynamoDB PutItem (copy pattern from train-with-joe)
    - Implement getById method with DynamoDB GetItem (copy pattern from train-with-joe)
    - Implement update method with DynamoDB UpdateItem (copy pattern from train-with-joe)
    - Implement delete method with DynamoDB DeleteItem (copy pattern from train-with-joe)
    - Copy error handling patterns with descriptive messages from train-with-joe
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 4.2 Create SubscriptionRepository class
    - **Copy from train-with-joe**: backend/src/repositories/ (repository patterns, especially any subscription/billing repository)
    - Copy repository patterns from train-with-joe
    - Implement create method with DynamoDB PutItem (copy pattern)
    - Implement getByUserId method with DynamoDB Query on GSI (copy GSI query pattern from train-with-joe)
    - Implement update method with DynamoDB UpdateItem (copy pattern)
    - Implement delete method with DynamoDB DeleteItem (copy pattern)
    - Copy error handling patterns from train-with-joe
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 4.3 Write property test for repository error handling
    - **Property 6: Repository Operation Failure Returns Descriptive Errors**
    - **Validates: Requirements 4.6**
    - Test that failed operations return descriptive error messages
    - Use fast-check with 100 iterations
    - _Requirements: 4.6_
  
  - [x] 4.4 Write unit tests for UserRepository
    - **Copy from train-with-joe**: backend/test/ (repository test patterns)
    - Copy test structure and mocking patterns from train-with-joe repository tests
    - Copy aws-sdk-client-mock usage patterns
    - Test CRUD operations with mocked DynamoDB client
    - Test error scenarios (not found, conflict, network error)
    - _Requirements: 11.1, 11.3, 11.4_
  
  - [x] 4.5 Write unit tests for SubscriptionRepository
    - Test CRUD operations with mocked DynamoDB client
    - Test query by userId with GSI
    - Test error scenarios
    - _Requirements: 11.1, 11.3, 11.4_

- [x] 5. Implement authentication service
  - [x] 5.1 Create AuthService class
    - Implement register method with Cognito SignUp
    - Implement signIn method with Cognito InitiateAuth
    - Implement signOut method with Cognito GlobalSignOut
    - Implement refreshTokens method with Cognito RefreshToken
    - Add error handling with descriptive messages
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7_
  
  - [x] 5.2 Write property test for user registration
    - **Property 3: User Registration Creates Cognito Account**
    - **Validates: Requirements 3.4**
    - Test that registration creates retrievable Cognito account
    - Use fast-check with 100 iterations
    - _Requirements: 3.4_
  
  - [x] 5.3 Write property test for sign-in token return
    - **Property 4: Successful Sign-In Returns Tokens**
    - **Validates: Requirements 3.5**
    - Test that valid sign-in returns all required tokens
    - Use fast-check with 100 iterations
    - _Requirements: 3.5_
  
  - [x] 5.4 Write property test for authentication error messages
    - **Property 5: Authentication Failure Returns Descriptive Errors**
    - **Validates: Requirements 3.7**
    - Test that failed authentication returns descriptive errors
    - Use fast-check with 100 iterations
    - _Requirements: 3.7_


- [x] 6. Implement payment service with multi-provider support
  - [x] 6.1 Create PaymentService class with Stripe integration
    - **Copy from train-with-joe**: backend/src/billing/ (Stripe integration patterns)
    - Copy Stripe client initialization from train-with-joe
    - Copy Stripe subscription creation patterns from train-with-joe billing service
    - Implement createStripeSubscription method (adapt from train-with-joe)
    - Implement cancelStripeSubscription method (adapt from train-with-joe)
    - Implement handleStripeWebhook method for payment events (copy webhook handling from train-with-joe)
    - Copy error handling and status update patterns from train-with-joe
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.9, 17.10, 17.11_
  
  - [x] 6.2 Add App Store receipt validation to PaymentService
    - Implement validateAppStoreReceipt method
    - Call Apple App Store API for receipt verification
    - Extract subscription expiration date
    - Update subscription status in DynamoDB
    - _Requirements: 17.5, 17.7, 17.15_
  
  - [x] 6.3 Add Play Store receipt validation to PaymentService
    - Implement validatePlayStoreReceipt method
    - Call Google Play Store API for receipt verification
    - Extract subscription expiration date
    - Update subscription status in DynamoDB
    - _Requirements: 17.6, 17.8, 17.16_
  
  - [x] 6.4 Write property test for Stripe subscription creation
    - **Property 16: Stripe Subscription Creation**
    - **Validates: Requirements 17.17**
    - Test that valid requests create active subscriptions
    - Use fast-check with 100 iterations
    - _Requirements: 17.17_
  
  - [x] 6.5 Write property test for App Store receipt validation
    - **Property 17: App Store Receipt Validation and Status Update**
    - **Validates: Requirements 17.18**
    - Test that valid receipts update subscription status
    - Use fast-check with 100 iterations
    - _Requirements: 17.18_
  
  - [x] 6.6 Write property test for Play Store receipt validation
    - **Property 18: Play Store Receipt Validation and Status Update**
    - **Validates: Requirements 17.19**
    - Test that valid receipts update subscription status
    - Use fast-check with 100 iterations
    - _Requirements: 17.19_
  
  - [x] 6.7 Write property test for payment success status update
    - **Property 19: Payment Success Updates Subscription Status**
    - **Validates: Requirements 17.20**
    - Test that successful payments update status to ACTIVE
    - Use fast-check with 100 iterations
    - _Requirements: 17.20_
  
  - [x] 6.8 Write property test for payment failure error handling
    - **Property 20: Payment Failure Updates Status and Returns Error**
    - **Validates: Requirements 17.21**
    - Test that failed payments update status and return errors
    - Use fast-check with 100 iterations
    - _Requirements: 17.21_

- [x] 7. Implement subscription CDK stack
  - [x] 7.1 Create SubscriptionStack with Stripe webhook endpoint
    - **Copy from train-with-joe**: backend/lib/subscription-stack.ts
    - Copy entire SubscriptionStack from train-with-joe as it's already minimal
    - Keep Lambda function for webhook handling
    - Keep API Gateway endpoint configuration
    - Keep Stripe webhook signature verification setup
    - Export webhook endpoint URL
    - _Requirements: 17.9_
  
  - [x] 7.2 Write unit tests for SubscriptionStack
    - Test stack synthesis without errors
    - Test Lambda function configuration
    - Test API Gateway endpoint configuration
    - _Requirements: 11.1, 11.2_


- [x] 8. Implement AI content enhancement service
  - [x] 8.1 Create AIService class with Bedrock integration
    - **Copy from train-with-joe**: backend/src/bedrock/ (Bedrock service implementation)
    - Copy Bedrock client initialization from train-with-joe
    - Copy enhanceContent method implementation from train-with-joe
    - Copy generateContent method implementation from train-with-joe
    - Copy rate limiting implementation from train-with-joe (adapt to 10 requests per minute)
    - Copy CloudWatch logging patterns from train-with-joe
    - Copy error handling patterns from train-with-joe
    - _Requirements: 18.1, 18.2, 18.3, 18.11, 18.12_
  
  - [x] 8.2 Create BedrockStack with IAM permissions
    - **Copy from train-with-joe**: backend/lib/bedrock-stack.ts
    - Copy entire BedrockStack from train-with-joe
    - Keep Bedrock model access configuration
    - Keep IAM role setup for Lambda functions
    - Export model ARN and role ARN
    - _Requirements: 18.4, 18.5_
  
  - [x] 8.3 Write property test for Bedrock content enhancement
    - **Property 22: Bedrock Content Enhancement API Call**
    - **Validates: Requirements 18.8**
    - Test that enhancement requests invoke Bedrock and return content
    - Use fast-check with 100 iterations
    - _Requirements: 18.8_
  
  - [x] 8.4 Write property test for Bedrock content generation
    - **Property 23: Bedrock Content Generation Returns Text**
    - **Validates: Requirements 18.9**
    - Test that generation requests return non-empty text
    - Use fast-check with 100 iterations
    - _Requirements: 18.9_
  
  - [x] 8.5 Write property test for Bedrock error handling
    - **Property 24: Bedrock API Failure Returns Descriptive Error**
    - **Validates: Requirements 18.10**
    - Test that API failures return descriptive errors
    - Use fast-check with 100 iterations
    - _Requirements: 18.10_
  
  - [x] 8.6 Write property test for AI rate limiting
    - **Property 25: AI Service Rate Limiting**
    - **Validates: Requirements 18.11**
    - Test that >10 requests in 60 seconds are rejected
    - Use fast-check with 100 iterations
    - _Requirements: 18.11_
  
  - [x] 8.7 Write property test for AI usage logging
    - **Property 26: AI Usage Logging**
    - **Validates: Requirements 18.12**
    - Test that all operations log to CloudWatch
    - Use fast-check with 100 iterations
    - _Requirements: 18.12_

- [x] 9. Implement GraphQL resolvers
  - [x] 9.1 Create AppSync resolver functions for User operations
    - **Copy from train-with-joe**: backend/src/appsyncFunctions/ (resolver patterns and utilities)
    - Copy AppSync resolver structure and patterns from train-with-joe
    - Copy util.error() usage patterns from train-with-joe resolvers
    - Implement getUser resolver (adapt from train-with-joe user resolvers)
    - Implement createUser resolver (adapt from train-with-joe user resolvers)
    - Implement updateUser resolver (adapt from train-with-joe user resolvers)
    - Ensure AppSync JS runtime compatibility (no replaceAll, regex literals, nullish coalescing)
    - _Requirements: 2.2, 2.3, 2.4_
  
  - [x] 9.2 Create AppSync resolver functions for Subscription operations
    - Implement getSubscriptionStatus resolver (Query.getSubscriptionStatus)
    - Implement createSubscription resolver (Mutation.createSubscription)
    - Implement cancelSubscription resolver (Mutation.cancelSubscription)
    - Implement validateAppStoreReceipt resolver (Mutation.validateAppStoreReceipt)
    - Implement validatePlayStoreReceipt resolver (Mutation.validatePlayStoreReceipt)
    - Use AppSync JS runtime compatible patterns
    - _Requirements: 17.12, 17.13, 17.14, 17.15, 17.16_
  
  - [x] 9.3 Create AppSync resolver functions for AI operations
    - **Copy from train-with-joe**: backend/src/appsyncFunctions/ (Bedrock/AI resolver patterns)
    - Copy AI resolver patterns from train-with-joe
    - Implement enhanceContent resolver (copy from train-with-joe bedrock resolvers)
    - Implement generateContent resolver (copy from train-with-joe bedrock resolvers)
    - Ensure AppSync JS runtime compatibility
    - _Requirements: 18.6, 18.7_
  
  - [x] 9.4 Write unit tests for GraphQL resolvers
    - Test request/response transformations
    - Test error handling with util.error()
    - Test integration with service layer
    - _Requirements: 11.1, 11.5_


- [x] 10. Implement CloudFront distribution stack
  - [x] 10.1 Create DistributionStack with CloudFront configuration
    - **Copy from train-with-joe**: backend/lib/distribution-stack.ts
    - Copy entire DistributionStack from train-with-joe
    - Keep CloudFront distribution configuration
    - Keep S3 origin configuration
    - Keep cache behaviors for API and static assets
    - Export distribution domain name and ID
    - _Requirements: 1.5, 1.8_
  
  - [x] 10.2 Write unit tests for DistributionStack
    - Test stack synthesis without errors
    - Test CloudFront distribution configuration
    - _Requirements: 11.1, 11.2_

- [x] 11. Implement build system for Lambda functions
  - [x] 11.1 Create esbuild configuration for AppSync functions
    - **Copy from train-with-joe**: backend/build.mjs (entire build script)
    - Copy build.mjs script from train-with-joe
    - Keep esbuild configuration for bundling resolver functions
    - Keep TypeScript compilation settings
    - Keep output directory and format configuration
    - Build script already in package.json from task 1
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 11.2 Write property test for build error messages
    - **Property 13: Build Error Message Descriptiveness**
    - **Validates: Requirements 10.7**
    - Test that build failures include file path, line number, description
    - Use fast-check with 100 iterations
    - _Requirements: 10.7_

- [x] 12. Checkpoint - Ensure backend tests pass
  - Run all backend unit tests and property tests
  - Verify 80% code coverage achieved
  - Synthesize all CDK stacks without errors
  - Ensure all tests pass, ask the user if questions arise


- [x] 13. Initialize Flutter frontend project
  - [x] 13.1 Create Flutter project structure
    - **Copy from train-with-joe**: frontend/src/ (entire Flutter project structure)
    - Copy Flutter project structure from train-with-joe/frontend/src
    - Copy pubspec.yaml and simplify dependencies (remove social network packages, keep provider, go_router, amplify packages)
    - Copy directory structure (lib/screens, lib/widgets, lib/providers, lib/services, lib/models, lib/utils)
    - Copy platform configurations (web, iOS, Android) from train-with-joe
    - Copy assets directory structure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 13.2_
  
  - [x] 13.2 Configure Amplify integration
    - **Copy from train-with-joe**: frontend/src/lib/amplifyconfiguration.dart and main.dart Amplify setup
    - Copy amplifyconfiguration.dart structure from train-with-joe
    - Copy Amplify initialization code from train-with-joe main.dart
    - Keep Cognito authentication configuration
    - Keep AppSync API configuration
    - Remove social network-specific configurations
    - _Requirements: 6.1, 6.2_
  
  - [x] 13.3 Write property test for Amplify configuration errors
    - **Property 8: Amplify Configuration Error Display**
    - **Validates: Requirements 6.6**
    - Test that invalid configuration displays error messages
    - Use test_check with 100 iterations
    - _Requirements: 6.6_

- [x] 14. Implement Flutter authentication services
  - [x] 14.1 Create AmplifyAuthService class
    - **Copy from train-with-joe**: frontend/src/lib/services/ (auth service implementation)
    - Copy auth service structure from train-with-joe
    - Copy signIn method implementation from train-with-joe
    - Copy signOut method implementation from train-with-joe
    - Copy register method implementation from train-with-joe
    - Copy getCurrentUser method implementation from train-with-joe
    - Copy error handling patterns from train-with-joe
    - _Requirements: 6.3, 6.4_
  
  - [x] 14.2 Create AuthProvider for state management
    - **Copy from train-with-joe**: frontend/src/lib/providers/ (auth provider implementation)
    - Copy AuthProvider structure from train-with-joe
    - Copy state management patterns (currentUser, isAuthenticated, isLoading)
    - Copy signIn, signOut, register method implementations
    - Copy listener notification patterns from train-with-joe
    - _Requirements: 5.5_
  
  - [x] 14.3 Write property test for Flutter Cognito authentication
    - **Property 7: Flutter Cognito Authentication**
    - **Validates: Requirements 6.4**
    - Test that sign-in processes through Cognito and returns tokens
    - Use test_check with 100 iterations
    - _Requirements: 6.4_
  
  - [x] 14.4 Write widget tests for AuthProvider
    - Test state changes on sign-in, sign-out, register
    - Test error handling and loading states
    - _Requirements: 11.6, 11.7_

- [x] 15. Implement Flutter API service
  - [x] 15.1 Create AmplifyAPIService class
    - Implement query method using Amplify.API.query
    - Implement mutate method using Amplify.API.mutate
    - Add error handling and retry logic
    - _Requirements: 6.5_
  
  - [x] 15.2 Create UserProvider for user data management
    - Implement user state
    - Implement isLoading state
    - Implement loadUser method calling getUser query
    - Implement updateUser method calling updateUser mutation
    - _Requirements: 5.5_
  
  - [x] 15.3 Write widget tests for AmplifyAPIService
    - Test query execution with mocked Amplify
    - Test mutation execution with mocked Amplify
    - Test error handling
    - _Requirements: 11.6, 11.7_


- [x] 16. Implement Flutter payment service with platform detection
  - [x] 16.1 Create PlatformPaymentService class
    - Implement platform detection (kIsWeb, Platform.isIOS, Platform.isAndroid)
    - Implement initializePayment method with platform-specific logic
    - Implement processPayment method routing to correct provider
    - Implement validateReceipt method for mobile platforms
    - _Requirements: 17.22_
  
  - [x] 16.2 Add Stripe integration for web platform
    - Integrate Stripe SDK for web
    - Implement Stripe Checkout redirect
    - Handle payment success/failure callbacks
    - _Requirements: 17.1, 19.5, 19.6_
  
  - [x] 16.3 Add StoreKit integration for iOS platform
    - Integrate StoreKit for in-app purchases
    - Implement purchase flow for iOS subscriptions
    - Implement receipt validation
    - _Requirements: 17.5, 17.7_
  
  - [x] 16.4 Add Google Play Billing integration for Android platform
    - Integrate Google Play Billing Client
    - Implement purchase flow for Android subscriptions
    - Implement receipt validation
    - _Requirements: 17.6, 17.8_
  
  - [x] 16.5 Write property test for platform-specific payment method selection
    - **Property 21: Platform-Specific Payment Method Selection**
    - **Validates: Requirements 17.22**
    - Test that correct payment method is selected per platform
    - Use test_check with 100 iterations
    - _Requirements: 17.22_
  
  - [x] 16.6 Write widget tests for PlatformPaymentService
    - Test platform detection logic
    - Test payment method routing
    - Test error handling for each platform
    - _Requirements: 11.6, 11.7_

- [x] 17. Implement Flutter subscription management
  - [x] 17.1 Create SubscriptionProvider for subscription state
    - Implement subscription state
    - Implement isLoading state
    - Implement loadSubscription method calling getSubscriptionStatus query
    - Implement createSubscription method calling createSubscription mutation
    - Implement cancelSubscription method calling cancelSubscription mutation
    - _Requirements: 5.5, 19.1, 19.2_
  
  - [x] 17.2 Write widget tests for SubscriptionProvider
    - Test subscription state management
    - Test create and cancel operations
    - Test error handling
    - _Requirements: 11.6, 11.7_


- [x] 18. Implement Flutter UI screens
  - [x] 18.1 Create SignInScreen
    - Build UI with email and password fields
    - Add sign-in button with loading state
    - Add navigation to RegisterScreen
    - Integrate with AuthProvider
    - Display error messages
    - Navigate to HomeScreen on success
    - _Requirements: 5.7_
  
  - [x] 18.2 Create RegisterScreen
    - Build UI with email, password, and name fields
    - Add register button with loading state
    - Add navigation to SignInScreen
    - Integrate with AuthProvider
    - Display error messages
    - Navigate to HomeScreen on success
    - _Requirements: 5.8_
  
  - [x] 18.3 Create HomeScreen
    - Build UI displaying user information
    - Add sign-out button
    - Add navigation to SubscriptionScreen
    - Integrate with UserProvider
    - Handle loading and error states
    - _Requirements: 5.9_
  
  - [x] 18.4 Create SubscriptionScreen
    - Build UI displaying subscription status and plan details
    - Add subscribe button with platform-specific payment flow
    - Add cancel subscription button
    - Integrate with SubscriptionProvider and PlatformPaymentService
    - Handle loading and error states
    - Display platform-appropriate payment UI
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [x] 18.5 Write property test for subscription purchase redirect
    - **Property 27: Subscription Purchase Redirect**
    - **Validates: Requirements 19.6**
    - Test that purchase action redirects to payment interface
    - Use test_check with 100 iterations
    - _Requirements: 19.6_
  
  - [x] 18.6 Write property test for payment completion UI update
    - **Property 28: Payment Completion UI Update**
    - **Validates: Requirements 19.7**
    - Test that UI updates within 2 seconds of payment callback
    - Use test_check with 100 iterations
    - _Requirements: 19.7_
  
  - [x] 18.7 Write widget tests for all screens
    - Test SignInScreen rendering and interactions
    - Test RegisterScreen rendering and interactions
    - Test HomeScreen rendering and navigation
    - Test SubscriptionScreen rendering and payment flows
    - Test error state displays
    - _Requirements: 11.6, 11.7_

- [x] 19. Configure Flutter routing
  - [x] 19.1 Set up go_router configuration
    - Define routes for SignIn, Register, Home, Subscription screens
    - Configure authentication guards
    - Set up initial route based on auth state
    - _Requirements: 5.4_
  
  - [x] 19.2 Write widget tests for routing
    - Test navigation between screens
    - Test authentication guards
    - Test deep linking
    - _Requirements: 11.6, 11.7_


- [x] 20. Checkpoint - Ensure Flutter tests pass
  - Run all Flutter widget tests and property tests
  - Verify 70% code coverage achieved
  - Build Flutter app for web without errors
  - Ensure all tests pass, ask the user if questions arise

- [x] 21. Create Angular join page application
  - [x] 21.1 Initialize Angular standalone project
    - **Copy from train-with-joe**: join_page/ (entire Angular project structure)
    - Copy entire join_page directory from train-with-joe as a starting point
    - Keep Angular 20+ standalone component architecture
    - Keep TypeScript configuration
    - Simplify content to be more generic (remove Train with Joe branding)
    - _Requirements: 7.1, 13.3_
  
  - [x] 21.2 Create HeroComponent
    - **Copy from train-with-joe**: join_page/ (hero component if exists)
    - Copy or adapt hero section from train-with-joe join page
    - Update value proposition to be generic
    - Keep responsive styling patterns from train-with-joe
    - _Requirements: 7.2_
  
  - [x] 21.3 Create FeaturesComponent
    - **Copy from train-with-joe**: join_page/ (features component if exists)
    - Copy or adapt features section from train-with-joe join page
    - Update features to be generic
    - Keep responsive styling patterns from train-with-joe
    - _Requirements: 7.3_
  
  - [x] 21.4 Create CTAComponent
    - Build call-to-action section with registration link
    - Link to Flutter app registration URL
    - Add responsive styling for mobile and desktop
    - _Requirements: 7.4, 7.7_
  
  - [x] 21.5 Write property test for landing page responsiveness
    - **Property 9: Landing Page Responsiveness**
    - **Validates: Requirements 7.5**
    - Test rendering without horizontal scroll for viewports 320px-2560px
    - Use property-based testing with viewport width generator
    - _Requirements: 7.5_
  
  - [x] 21.6 Write unit tests for join page components
    - Test component rendering
    - Test responsive behavior
    - Test link navigation
    - _Requirements: 7.6_

- [x] 22. Create Angular competitors page application
  - [x] 22.1 Initialize Angular standalone project
    - **Copy from train-with-joe**: competitors_page/ if exists, or copy join_page structure
    - Copy Angular project structure (use join_page as template if competitors_page doesn't exist)
    - Configure Angular 20+ with standalone component architecture
    - _Requirements: 8.1, 13.4_
  
  - [x] 22.2 Create ComparisonTableComponent
    - Build comparison table structure with placeholder content
    - Add responsive styling for mobile and desktop
    - _Requirements: 8.2, 8.3_
  
  - [x] 22.3 Create HeaderComponent
    - Build page title and description
    - Add responsive styling
    - _Requirements: 8.2_
  
  - [x] 22.4 Write property test for competitors page responsiveness
    - **Property 10: Competitors Page Responsiveness**
    - **Validates: Requirements 8.4**
    - Test rendering without horizontal scroll for viewports 320px-2560px
    - Use property-based testing with viewport width generator
    - _Requirements: 8.4_
  
  - [x] 22.5 Write unit tests for competitors page components
    - Test component rendering
    - Test table responsiveness
    - _Requirements: 8.5_


- [x] 23. Create Angular profile cards page application
  - [x] 23.1 Initialize Angular standalone project
    - **Copy from train-with-joe**: profile-cards/ (entire Angular project)
    - Copy entire profile-cards directory from train-with-joe
    - Keep Angular 20+ standalone component architecture
    - Keep routing configuration for URL-based profile identification
    - _Requirements: 9.1, 9.3, 13.5_
  
  - [x] 23.2 Create ProfileCardComponent
    - **Copy from train-with-joe**: profile-cards/ (profile card component)
    - Copy ProfileCardComponent from train-with-joe
    - Keep responsive styling
    - Keep GraphQL API integration patterns
    - Keep loading state component
    - Simplify to show only name and email (remove social-specific fields)
    - _Requirements: 9.2, 9.4, 9.6_
  
  - [x] 23.3 Configure GraphQL API integration
    - **Copy from train-with-joe**: profile-cards/ (GraphQL client setup)
    - Copy GraphQL client configuration from train-with-joe profile-cards
    - Keep Apollo Client or similar setup
    - Copy getUser query implementation
    - Keep error handling patterns
    - _Requirements: 9.6_
  
  - [x] 23.4 Write property test for profile card data display
    - **Property 11: Profile Card Data Display**
    - **Validates: Requirements 9.2**
    - Test that valid user objects render name and email
    - Use property-based testing with user object generator
    - _Requirements: 9.2_
  
  - [x] 23.5 Write property test for profile card API fetch
    - **Property 12: Profile Card API Fetch**
    - **Validates: Requirements 9.6**
    - Test that valid user IDs trigger GraphQL query
    - Use property-based testing with UUID generator
    - _Requirements: 9.6_
  
  - [x] 23.6 Write unit tests for profile cards components
    - Test component rendering with user data
    - Test loading state
    - Test error handling
    - Test API integration
    - _Requirements: 9.5_

- [x] 24. Implement deployment scripts and configuration
  - [x] 24.1 Create npm scripts for backend deployment
    - **Copy from train-with-joe**: package.json scripts section
    - Copy deployment scripts from train-with-joe package.json
    - Keep synth, deploy, destroy, build:appsyncFunctions scripts
    - Keep parallel deployment configuration
    - _Requirements: 15.1, 15.2, 15.5_
  
  - [x] 24.2 Create npm scripts for testing and linting
    - **Copy from train-with-joe**: package.json scripts section
    - Copy test, test:fast, lint, lint:fix, bt scripts from train-with-joe
    - Keep Vitest configuration and coverage settings
    - _Requirements: 15.3, 15.4_
  
  - [x] 24.3 Create Flutter build scripts
    - Add build script for web deployment
    - Add test script for Flutter tests
    - Add clean script for build artifacts
    - _Requirements: 10.4, 15.6_
  
  - [x] 24.4 Create environment configuration files
    - **Copy from train-with-joe**: cdk.context.json or cdk.json context section
    - Copy environment configuration structure from train-with-joe
    - Copy sandbox, beta, production context patterns
    - Simplify by removing social network-specific configurations
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [x] 24.5 Write property test for environment configuration selection
    - **Property 14: Environment Configuration Selection**
    - **Validates: Requirements 14.8**
    - Test that specified environment loads correct configuration
    - Use property-based testing with environment enum generator
    - _Requirements: 14.8_
  
  - [x] 24.6 Write property test for deployment failure error display
    - **Property 15: Deployment Failure Error Display**
    - **Validates: Requirements 15.8**
    - Test that deployment failures display descriptive errors
    - Use property-based testing with error scenario generator
    - _Requirements: 15.8_


- [x] 25. Create documentation and README
  - [x] 25.1 Create root README.md
    - **Copy from train-with-joe**: README.md structure
    - Copy README structure from train-with-joe
    - Update project overview to describe Train with Joe
    - Copy setup instructions patterns from train-with-joe
    - Copy common commands section from train-with-joe
    - Copy environment configuration section from train-with-joe
    - Copy deployment process section from train-with-joe
    - Remove social network-specific documentation
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [x] 25.2 Add inline code documentation
    - **Copy from train-with-joe**: JSDoc and dartdoc comment patterns
    - Copy JSDoc comment patterns from train-with-joe backend code
    - Copy dartdoc comment patterns from train-with-joe frontend code
    - Copy complex logic comment patterns from train-with-joe
    - _Requirements: 16.6, 16.7_

- [x] 26. Implement AWS SDK mocks for testing
  - [x] 26.1 Create mock implementations for AWS services
    - **Copy from train-with-joe**: __mocks__/ and backend/test/mocks/
    - Copy AWS SDK mock setup from train-with-joe __mocks__ directory
    - Copy Cognito client mocks from train-with-joe
    - Copy DynamoDB client mocks from train-with-joe
    - Copy Bedrock client mocks from train-with-joe (if exists)
    - Copy S3 client mocks from train-with-joe
    - Keep aws-sdk-client-mock library usage patterns
    - _Requirements: 11.3_
  
  - [x] 26.2 Create test fixtures
    - **Copy from train-with-joe**: backend/test/fixtures.ts and backend/test/mocks/
    - Copy test fixtures structure from train-with-joe
    - Copy user fixtures from train-with-joe (simplify by removing social fields)
    - Copy or create subscription fixtures for all providers
    - Copy payment event fixtures from train-with-joe billing tests
    - Copy AI request/response fixtures from train-with-joe bedrock tests
    - _Requirements: 11.4_

- [x] 27. Implement error handling and logging
  - [x] 27.1 Add CloudWatch logging to Lambda functions
    - **Copy from train-with-joe**: backend/src/ (logging patterns from any Lambda function)
    - Copy structured JSON logging patterns from train-with-joe Lambda functions
    - Copy correlation ID implementation from train-with-joe
    - Copy error logging with stack traces patterns
    - Copy AI usage logging patterns from train-with-joe bedrock functions
    - _Requirements: 18.12_
  
  - [x] 27.2 Add error handling to all resolvers
    - **Copy from train-with-joe**: backend/src/appsyncFunctions/ (error handling patterns)
    - Copy util.error() usage patterns from train-with-joe resolvers
    - Copy error type mapping from train-with-joe (Unauthorized, NotFound, ValidationError, InternalError)
    - Copy descriptive message patterns from train-with-joe
    - Keep stack trace hiding patterns from train-with-joe
    - _Requirements: 2.6, 3.7, 4.6_
  
  - [x] 27.3 Add error handling to Flutter services
    - **Copy from train-with-joe**: frontend/src/lib/services/ (error handling patterns)
    - Copy GraphQL error mapping from train-with-joe services
    - Copy retry logic with exponential backoff from train-with-joe
    - Copy network connectivity handling from train-with-joe
    - Copy error state display patterns from train-with-joe widgets
    - _Requirements: 6.6_

- [x] 28. Configure CloudWatch alarms and monitoring
  - [x] 28.1 Create CloudWatch alarms
    - Add high error rate alarm (>5% of requests)
    - Add payment failure rate alarm (>10% of attempts)
    - Add AI service error alarm (>3 failures in 5 minutes)
    - Add DynamoDB throttling alarm
    - _Requirements: Monitoring best practices_
  
  - [x] 28.2 Create custom CloudWatch metrics
    - Add metrics for API errors by type
    - Add metrics for payment success/failure rates
    - Add metrics for AI service usage and errors
    - Add metrics for authentication failure rates
    - _Requirements: Monitoring best practices_


- [x] 29. Final integration and wiring
  - [x] 29.1 Wire all CDK stacks together
    - Connect APIStack to BaseStack (user pool, DynamoDB tables)
    - Connect SubscriptionStack to BaseStack (DynamoDB table)
    - Connect BedrockStack to APIStack (Lambda permissions)
    - Connect DistributionStack to APIStack (API endpoint)
    - Verify all stack dependencies and exports
    - _Requirements: 1.1-1.8_
  
  - [x] 29.2 Configure Amplify in Flutter with deployed resources
    - Update amplifyconfiguration.dart with deployed Cognito pool ID
    - Update amplifyconfiguration.dart with deployed AppSync endpoint
    - Update amplifyconfiguration.dart with deployed API key/auth mode
    - _Requirements: 6.1, 6.2_
  
  - [x] 29.3 Configure landing pages with Flutter app URLs
    - Update join page CTA link to Flutter app registration URL
    - Update profile cards API endpoint to deployed AppSync URL
    - _Requirements: 7.7, 9.6_
  
  - [x] 29.4 Write integration tests for end-to-end flows
    - Test user registration through authentication flow
    - Test subscription creation through payment flow
    - Test AI content enhancement through API
    - Test profile card data fetch through GraphQL
    - _Requirements: 11.1_

- [x] 30. Final checkpoint - Comprehensive testing and validation
  - Run all backend unit tests and property tests (verify 80% coverage)
  - Run all Flutter widget tests and property tests (verify 70% coverage)
  - Run all Angular unit tests (verify 60% coverage)
  - Synthesize all CDK stacks without errors
  - Build Flutter app for web, iOS, Android without errors
  - Build all Angular landing pages without errors
  - Run linting checks on all code (backend, frontend, landing pages)
  - Deploy to sandbox environment and verify all endpoints
  - Test authentication flow end-to-end
  - Test subscription creation for all payment providers
  - Test AI content enhancement
  - Test profile cards page with real API
  - Ensure all tests pass, ask the user if questions arise

## Notes

- **IMPORTANT**: Maximize code reuse from train-with-joe - copy entire files/directories where possible and simplify by removing social media features
- Each task now includes specific "Copy from train-with-joe" instructions indicating what to copy
- When copying, remove social network integrations (OAuth2 providers, send-to-social features, post scheduling)
- Keep all AWS infrastructure patterns, authentication, payment, AI, and testing infrastructure
- Each task references specific requirements for traceability
- Property-based tests use fast-check (TypeScript) or test_check (Dart) with 100 iterations minimum
- All property tests are tagged with property number and validated requirements
- Backend coverage target: 80% line coverage
- Frontend coverage target: 70% line coverage
- Landing pages coverage target: 60% line coverage
- AppSync resolver functions must avoid unsupported JavaScript features (replaceAll, regex literals, nullish coalescing, optional chaining)
- Use util.error() for all AppSync error handling
- Platform-specific payment integration requires testing on actual devices/emulators
- Stripe integration uses test mode for development and testing
- Bedrock API calls are mocked in tests to avoid costs
- App Store and Play Store APIs are mocked in tests
- Multi-environment support requires separate AWS accounts or careful resource naming
- CloudFront distribution deployment can take 15-20 minutes
- Checkpoints ensure incremental validation and provide opportunities for user feedback
