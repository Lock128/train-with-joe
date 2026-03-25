# Backend

Serverless AWS backend for the Minimal SaaS Template, built with AWS CDK (TypeScript). Provides authentication, a GraphQL API, subscription/payment processing, and AI content generation.

## Architecture

The backend is composed of four CDK stacks:

```
BaseStack          → Cognito User Pool, DynamoDB tables (Users, Subscriptions), S3 assets bucket
APIStack           → AppSync GraphQL API with DynamoDB + Lambda resolvers
BedrockStack       → Amazon Bedrock AI configuration and IAM permissions
SubscriptionStack  → Stripe webhook endpoint (API Gateway + Lambda)
```

Stack dependencies: `APIStack`, `BedrockStack`, and `SubscriptionStack` all depend on `BaseStack`.

## Project Structure

```
backend/
├── bin/
│   └── backend.ts                  # CDK app entry point, stack composition
├── lib/
│   ├── base-stack.ts               # Cognito, DynamoDB, S3
│   ├── api-stack.ts                # AppSync GraphQL API
│   ├── bedrock-stack.ts            # Bedrock AI setup
│   ├── distribution-stack.ts       # CloudFront CDN (not yet wired up)
│   ├── subscription-stack.ts       # Stripe webhook API Gateway
│   └── gql-functions/              # Compiled AppSync JS resolvers (build output)
├── src/
│   ├── gql-functions/              # AppSync JS resolver source (TypeScript)
│   │   ├── Mutation.createUser.ts
│   │   ├── Mutation.updateUser.ts
│   │   └── Query.getUser.ts
│   ├── gql-lambda-functions/       # Lambda-backed GraphQL resolvers
│   │   ├── Mutation.createStripeCheckout.ts
│   │   ├── Mutation.createSubscription.ts
│   │   ├── Mutation.cancelSubscription.ts
│   │   ├── Mutation.enhanceContent.ts
│   │   ├── Mutation.generateContent.ts
│   │   ├── Mutation.validateAppStoreReceipt.ts
│   │   ├── Mutation.validatePlayStoreReceipt.ts
│   │   └── Query.getSubscriptionStatus.ts
│   ├── gql-schemas/
│   │   └── schema.graphql          # GraphQL schema definition
│   ├── model/domain/
│   │   ├── User.ts                 # User entity + enums (SubscriptionStatus, PaymentProvider)
│   │   └── Subscription.ts         # Subscription entity
│   ├── repositories/
│   │   ├── user-repository.ts      # DynamoDB CRUD for Users
│   │   └── subscription-repository.ts  # DynamoDB CRUD for Subscriptions
│   ├── services/
│   │   ├── ai-service.ts           # Bedrock AI (content enhancement & generation, rate-limited)
│   │   ├── auth-service.ts         # Cognito auth (register, sign-in, sign-out, token refresh)
│   │   └── payment-service.ts      # Multi-provider payments (Stripe, App Store, Play Store)
│   └── webhooks/
│       └── stripe-webhook-handler.ts   # Lambda handler for Stripe webhook events
└── test/                           # Unit, integration, and property-based tests
```

## AWS Services Used

| Service | Purpose |
|---|---|
| Amazon Cognito | User authentication (email/password, SRP) |
| Amazon DynamoDB | Users and Subscriptions tables (pay-per-request, GSIs) |
| AWS AppSync | GraphQL API with Cognito + IAM auth |
| AWS Lambda (Node.js 20) | GraphQL resolvers and webhook handlers |
| Amazon Bedrock | AI content enhancement/generation (Titan, Claude, Nova) |
| Amazon S3 | Application assets storage |
| Amazon CloudFront | CDN distribution (stack defined, not yet wired) |
| API Gateway | Stripe webhook REST endpoint |
| AWS SSM Parameter Store | Configuration and secrets |

## GraphQL API

The API is protected by Cognito User Pool authentication. Key operations:

**Queries**
- `getUser(id)` — Fetch user profile
- `getSubscriptionStatus` — Get current subscription

**Mutations**
- `createUser` / `updateUser` — User management
- `createStripeCheckout` — Create a Stripe Checkout session
- `createSubscription` / `cancelSubscription` — Subscription lifecycle
- `validateAppStoreReceipt` / `validatePlayStoreReceipt` — Mobile receipt validation
- `enhanceContent` / `generateContent` — AI-powered content operations

## Payment Providers

Subscriptions support three providers:

- **Stripe** — Web payments via Checkout Sessions, with webhook handling for `subscription.created`, `subscription.updated`, `subscription.deleted`, `invoice.payment_succeeded`, and `invoice.payment_failed`
- **Apple App Store** — Receipt validation against Apple's `verifyReceipt` endpoint (production + sandbox fallback)
- **Google Play Store** — Placeholder for Play Developer API validation

## Environment & Namespacing

The namespace is derived from `NODE_ENV` or defaults to `sandbox-<username>`. All resource names are namespaced, so multiple developers can deploy independent stacks to the same AWS account.

Supported environments: `sandbox` (default), `beta`, `prod`.

## Commands

```bash
# From the project root:

npm run build:appsyncFunctions   # Compile AppSync TS resolvers → JS (esbuild)
npm test                         # Run all tests with coverage
npm run test:fast                # Quick tests without coverage
npm run lint                     # ESLint check
npm run lint:fix                 # Auto-fix lint issues
npm run synth                    # Synthesize CloudFormation templates
npm run deploy                   # Deploy all stacks to AWS
npm run destroy                  # Tear down all stacks
```

## Prerequisites

- Node.js 18+
- AWS CLI configured with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)
- CDK bootstrapped in target account/region (`cdk bootstrap`)

## Configuration

Runtime secrets and config are stored in SSM Parameter Store under `/<namespace>/`:

- `/<namespace>/config/cognito-user-pool-id`
- `/<namespace>/config/cognito-frontend-client-id`
- `/<namespace>/config/users-table-name`
- `/<namespace>/config/subscriptions-table-name`
- `/<namespace>/config/assets-bucket-name`
- `/<namespace>/bedrock/model-id`
- `/<namespace>/stripe/*` — Stripe API keys (set manually)

Environment variables used by Lambda functions: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APPSTORE_SHARED_SECRET`, `BEDROCK_MODEL_ID`, `USERS_TABLE_NAME`, `SUBSCRIPTIONS_TABLE_NAME`.

!!!