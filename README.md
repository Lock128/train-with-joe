# Train with Joe

A fun vocabulary training app for kids, built with Flutter and AWS backend infrastructure.

## Overview

Train with Joe helps kids learn vocabulary through fun interactive exercises and games. The app provides:
- **Backend**: AWS CDK infrastructure with Cognito, DynamoDB, AppSync GraphQL API, Lambda, Bedrock AI, and CloudFront
- **Frontend**: Flutter cross-platform app (web, iOS, Android) with Amplify integration
- **Landing Pages**: Angular 20+ standalone pages for marketing and user profiles

## Project Structure

```
.
├── backend/           # AWS CDK infrastructure and Lambda functions
│   ├── lib/          # CDK stack definitions
│   ├── src/          # Application code (resolvers, services, repositories)
│   └── test/         # Backend tests
├── frontend/         # Flutter web/mobile application
├── join_page/        # Angular landing page for registration
├── competitors_page/ # Angular competitors comparison page
├── profile_cards/    # Angular shareable profile cards
├── scripts/          # Deployment and utility scripts
└── documentation/    # Architecture docs and guides
```

## Technology Stack

### Backend
- TypeScript/Node.js 18+
- AWS CDK for infrastructure as code
- AWS AppSync (GraphQL API)
- AWS Lambda (serverless compute)
- Amazon DynamoDB (database)
- AWS Cognito (authentication)
- Amazon Bedrock (AI content enhancement)
- Stripe (payments)

### Frontend
- Flutter 3.8+ / Dart 3.0+
- Amplify Flutter for AWS integration
- Provider/flutter_bloc for state management
- go_router for navigation

### Testing & Quality
- Vitest with coverage (backend)
- Flutter test framework (frontend)
- ESLint v9+ with flat config
- Prettier for formatting
- Husky for git hooks

## Getting Started

### Prerequisites
- Node.js 18+
- AWS CLI configured
- Flutter 3.8+ (for frontend development)
- AWS CDK CLI: `npm install -g aws-cdk`

### Installation

```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Build AppSync functions
npm run build:appsyncFunctions

# Run tests
npm test

# Deploy to AWS
npm run deploy
```

## Common Commands

### Backend
```bash
npm run build:appsyncFunctions  # Build AppSync resolver functions
npm test                        # Run tests with coverage
npm run test:fast               # Quick tests without coverage
npm run lint                    # Check code style
npm run lint:fix                # Fix linting issues
npm run synth                   # Synthesize CDK stacks
npm run deploy                  # Deploy to AWS
npm run destroy                 # Remove all AWS resources
npm run bt                      # Lint fix + quick test
```

### Frontend
```bash
cd frontend/src
flutter pub get                 # Install dependencies
flutter run -d chrome           # Run in browser
flutter test                    # Run tests
flutter build web --release     # Production build
```

## Features

### Core Functionality
- User authentication (email/password via Cognito)
- GraphQL API for data operations
- User profile management
- Vocabulary games and daily word challenges
- Progress tracking and achievements
- Subscription management (Stripe, App Store, Play Store)
- AI content enhancement (Amazon Bedrock)
- Multi-platform support (web, iOS, Android)

### Infrastructure
- Serverless architecture
- Auto-scaling DynamoDB tables
- CloudFront CDN for global distribution
- Infrastructure as code with AWS CDK
- Multi-environment support (sandbox, beta, production)

## Configuration

Environment-specific configuration is managed through:
- `cdk.json` - CDK context and settings
- AWS SSM Parameter Store - Secrets and API keys
- Environment variables - Runtime configuration

## Testing

The app includes comprehensive testing infrastructure:
- Unit tests for backend services and repositories
- Property-based tests using fast-check
- Integration tests for API endpoints
- Widget tests for Flutter UI components
- CDK stack synthesis tests

Run tests:
```bash
npm test              # All tests with coverage
npm run test:unit     # Unit tests only
npm run test:fast     # Quick validation
```

## Deployment

Deploy to AWS:
```bash
# Deploy all stacks
npm run deploy

# Deploy specific environment
cdk deploy --all --context environment=sandbox

# Destroy all resources
npm run destroy
```

## Documentation

- Architecture documentation in `/documentation`
- API documentation generated from GraphQL schema
- Inline code comments for complex logic

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and pull request guidelines.

Code ownership is defined in [CODEOWNERS](CODEOWNERS).

## CI/CD

The project uses GitHub Actions for continuous integration and deployment:

- Push to `main` → tests + deploy to sandbox
- Manual promotion to beta (staging validation)
- Manual promotion to production (requires approval)

See [.github/README.md](.github/README.md) for full workflow documentation.

## License

MIT

## Support

For issues and questions, check the `/documentation` directory or open an issue in the repository.
