---
inclusion: fileMatch
fileMatchPattern: "backend/**"
---

# Backend Development Guide

## CDK Stacks

The backend has four CDK stacks, all defined in `backend/lib/`:

- `BaseStack` - Cognito User Pool, DynamoDB tables (Users, Subscriptions), S3 assets bucket
- `APIStack` - AppSync GraphQL API with DynamoDB + Lambda resolvers (depends on BaseStack)
- `BedrockStack` - Amazon Bedrock AI config and IAM permissions (depends on BaseStack)
- `SubscriptionStack` - Stripe webhook endpoint via API Gateway + Lambda (depends on BaseStack)

Entry point: `backend/bin/backend.ts`

## GraphQL Schema

Schema is at `backend/src/gql-schemas/schema.graphql`. Key types: User, Subscription. Auth via `@aws_cognito_user_pools`.

## AppSync Resolvers

- Source: `backend/src/gql-functions/*.ts` (TypeScript)
- Compiled output: `backend/lib/gql-functions/*.js` (esbuild, via `build.mjs`)
- Always run `npm run build:appsyncFunctions` after modifying resolvers

## Lambda Resolvers

Located in `backend/src/gql-lambda-functions/`. Handle complex operations:
- Payment flows (Stripe checkout, subscription management, receipt validation)
- AI operations (content enhancement and generation via Bedrock)

## Services

- `ai-service.ts` - Bedrock AI integration (rate-limited)
- `auth-service.ts` - Cognito auth (register, sign-in, sign-out, token refresh)
- `payment-service.ts` - Multi-provider payments (Stripe, App Store, Play Store)

## Repositories

- `user-repository.ts` - DynamoDB CRUD for Users table
- `subscription-repository.ts` - DynamoDB CRUD for Subscriptions table

## Configuration

Runtime config stored in SSM Parameter Store under `/<namespace>/`. Lambda env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APPSTORE_SHARED_SECRET`, `BEDROCK_MODEL_ID`, `USERS_TABLE_NAME`, `SUBSCRIPTIONS_TABLE_NAME`.
