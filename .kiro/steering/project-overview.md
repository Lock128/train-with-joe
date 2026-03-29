---
inclusion: auto
---

# Train with Joe - Project Overview

Train with Joe is a vocabulary training app for kids, built with a serverless AWS backend and Flutter frontend.

## Architecture

- Backend: AWS CDK (TypeScript) with AppSync GraphQL, Lambda, DynamoDB, Cognito, Bedrock AI, Stripe payments
- Frontend: Flutter 3.8+ cross-platform app (web, iOS, Android) with Amplify
- Landing pages: Angular 20+ standalone apps (join_page, competitors_page, profile_cards)

## Key Directories

- `backend/lib/` - CDK stack definitions (BaseStack, APIStack, BedrockStack, SubscriptionStack)
- `backend/src/gql-functions/` - AppSync JS resolver source (TypeScript, compiled via `build.mjs`)
- `backend/src/gql-lambda-functions/` - Lambda-backed GraphQL resolvers
- `backend/src/gql-schemas/schema.graphql` - GraphQL schema
- `backend/src/services/` - Business logic (ai-service, auth-service, payment-service)
- `backend/src/repositories/` - DynamoDB data access (user-repository, subscription-repository)
- `frontend/` - Flutter app
- `join_page/`, `competitors_page/`, `profile_cards/` - Angular marketing pages
- `scripts/` - Deployment and utility scripts

## Tech Stack

- TypeScript 5.9+, Node.js 18+
- AWS CDK 2.x, AppSync, Lambda (Node.js 20), DynamoDB, Cognito, Bedrock, CloudFront
- Stripe for web payments, Apple App Store and Google Play Store for mobile
- Vitest + fast-check for backend testing
- ESLint v10+ flat config, Prettier, Husky pre-commit hooks

## Common Commands

- `npm run build:appsyncFunctions` - Compile AppSync resolvers
- `npm test` - Run all tests with coverage
- `npm run test:fast` - Quick tests without coverage
- `npm run lint:fix` - Auto-fix linting issues
- `npm run bt` - Lint fix + quick test
- `npm run deploy` - Deploy all CDK stacks
- `npm run synth` - Synthesize CloudFormation templates

## Environment Namespacing

Resources are namespaced by `NODE_ENV` or default to `sandbox-<username>`. Multiple developers can deploy independent stacks to the same AWS account.
