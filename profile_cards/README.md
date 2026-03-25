# Profile Cards

Angular SPA for displaying shareable user profile cards with statistics.

## Development

### Prerequisites
- Node.js 18+
- Angular CLI 20+

### Setup
```bash
cd profile_cards
npm install
```

### Development Server
```bash
npm start
```
Navigate to `http://localhost:4300/`.

### Build
```bash
npm run build
```

## Project Structure

```
profile_cards/
├── src/
│   ├── app/
│   │   ├── components/          # Angular components
│   │   ├── services/            # Angular services
│   │   ├── models/              # TypeScript interfaces
│   │   ├── app.component.ts     # Root component
│   │   ├── app.config.ts        # App configuration
│   │   └── app.routes.ts        # Routing configuration
│   ├── assets/                  # Static assets
│   ├── environments/            # Environment configurations
│   ├── index.html               # HTML entry point
│   ├── main.ts                  # TypeScript entry point
│   └── styles.css               # Global styles
├── angular.json                 # Angular CLI configuration
├── package.json                 # Dependencies
├── proxy.conf.json              # Dev server proxy config
└── tsconfig.json                # TypeScript configuration
```

## Routes

- `/` - Landing page
- `/:userId` - User profile card page

## Features

- Display user profile information
- GraphQL API integration for data fetching
- Responsive design for all devices
- Social sharing with Open Graph tags
- Loading states and error handling

## Testing

```bash
npm test
```

## Deployment

Profile cards are deployed as part of the CDK infrastructure.

## Project Structure

```
profile-cards/
├── src/
│   ├── app/
│   │   ├── components/          # Angular components
│   │   │   ├── profile-card/    # Main profile card display
│   │   │   ├── contribution-graph/ # GitHub-style activity graph
│   │   │   ├── leaderboard/     # Leaderboard rankings
│   │   │   ├── recent-posts/    # Recent posts feed
│   │   │   └── metrics-display/ # User metrics display
│   │   ├── services/            # Angular services
│   │   │   ├── profile-card.service.ts
│   │   │   └── leaderboard.service.ts
│   │   ├── models/              # TypeScript interfaces
│   │   │   ├── profile-card.model.ts
│   │   │   └── leaderboard.model.ts
│   │   ├── app.component.ts     # Root component
│   │   ├── app.config.ts        # App configuration
│   │   └── app.routes.ts        # Routing configuration
│   ├── assets/                  # Static assets
│   │   └── mock-data/           # Mock data for local dev
│   ├── environments/            # Environment configurations
│   │   ├── environment.ts       # Local development
│   │   ├── environment.sandbox.ts
│   │   ├── environment.beta.ts
│   │   └── environment.prod.ts
│   ├── index.html               # HTML entry point
│   ├── main.ts                  # TypeScript entry point
│   └── styles.css               # Global styles
├── angular.json                 # Angular CLI configuration
├── package.json                 # Dependencies
├── proxy.conf.json              # Dev server proxy config
├── tsconfig.json                # TypeScript configuration
└── tsconfig.app.json            # App-specific TS config
```

## Development

### Prerequisites

- Node.js 20.x or later
- npm 10.x or later

### Install Dependencies

```bash
npm install
```

### Local Development

Run the development server with proxy configuration for mock data:

```bash
npm run serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload if you change any source files.

### Build

Build for different environments:

```bash
# Sandbox
npm run build:sandbox

# Beta
npm run build:beta

# Production
npm run build:production
```

Build output will be in the `dist/` directory.

## Routes

- `/` - Landing page
- `/:userId` - User profile card page
- `/leaderboard` - Leaderboard page

## Environment Configuration

The app supports multiple environments:

- **Local**: Development with mock data
- **Sandbox**: Testing environment at `cards.sandbox.nexus-share.com`
- **Beta**: Staging environment at `cards.beta.nexus-share.com`
- **Production**: Live environment at `cards.nexus-share.com`

## Deployment

Profile cards are deployed to S3 and served via CloudFront. See deployment scripts in `scripts/deploy-profile-cards.sh`.

## Architecture

The profile cards system consists of:

1. **Static Data Generation**: Lambda function generates JSON files with user statistics
2. **S3 Storage**: Profile data stored as static JSON files
3. **CloudFront CDN**: Serves the SPA and data files
4. **Angular SPA**: Client-side rendering of profile cards

No authentication is required - all data is public.

## Branding

### Color Palette

The app uses the Nexus Share brand colors defined in CSS variables:

- **Primary**: `#4f46e5` (Indigo)
- **Primary Dark**: `#4338ca`
- **Primary Light**: `#6366f1`
- **Primary Lighter**: `#eef2ff`

### Typography

- **Font Family**: System font stack for optimal performance
- **Headings**: Bold (700 weight)
- **Body**: Regular (400 weight)
- **Links**: Medium (500 weight)

### Design System

All components follow a mobile-first responsive design approach with:

- Consistent spacing using CSS variables
- Smooth transitions and hover effects
- Accessible color contrast ratios
- Responsive breakpoints at 640px, 768px, and 1024px

### Assets

Place branding assets in `src/assets/images/`:

- `logo.svg` - Nexus Share logo
- `og-default.png` - Default Open Graph image (1200x630px)
- `og-profile-{userId}.png` - User-specific OG images (generated dynamically)

## Features

### Profile Cards

- Display user metrics (posts, platforms, streaks, AI usage)
- GitHub-style contribution graph showing post activity over time
- Show recent posts with platform links
- Leaderboard rankings
- Responsive design for all devices
- Social sharing with Open Graph tags

### Leaderboard

- Top 100 users by posts published
- Top 100 users by AI usage
- Search and filter functionality
- Clickable links to user profiles

### Social Sharing

- Dynamic Open Graph meta tags
- Twitter Card support
- Optimized for social media previews

## Performance

- Static file serving via CloudFront
- 1-hour cache TTL for data files
- 1-year cache TTL for assets
- Lazy loading for optimal performance
- Mobile-first responsive design

## Detailed Architecture

### Data Generation Flow

1. **Scheduled Generation** (Daily at 2 AM UTC):
   - EventBridge triggers Card Generator Lambda
   - Lambda queries DynamoDB for all users
   - Calculates metrics (posts, streaks, AI usage)
   - Generates JSON files for each user
   - Uploads to S3 bucket

2. **Event-Driven Updates** (On post publish):
   - DynamoDB Stream captures post publish events
   - Lambda triggered for affected user
   - Updates only that user's profile card
   - Typically completes within 15 minutes

3. **Serving Flow**:
   - User visits `cards.<baseDomain>/<userId>`
   - CloudFront serves SPA (index.html, JS, CSS)
   - SPA fetches `/<userId>.json` from CloudFront
   - CloudFront serves from cache or S3
   - SPA renders profile card

### Infrastructure Components

**Backend (CDK)**:
- `ProfileCardStack` - Main infrastructure stack
- `CardGeneratorFunction` - Lambda for data generation
- S3 bucket for data and SPA hosting
- CloudFront distribution with custom domain
- EventBridge rules for scheduling

**Frontend (Angular)**:
- Standalone components architecture
- HttpClient for data fetching
- Angular Router for navigation
- Meta service for Open Graph tags
- Analytics service for tracking

### Data Models

**ProfileCardData** (`/users/<userId>.json`):
```typescript
{
  userId: string;
  displayName: string;
  joinDate: string;
  metrics: {
    totalPosts: number;
    connectedPlatforms: number;
    currentStreak: number;
    longestStreak: number;
    totalAIUsage: number;
    aiPostGeneration: number;
    aiTextEnhancement: number;
    aiScheduling: number;
    aiTagSuggestion: number;
  };
  recentPosts: Array<{
    postId: string;
    title: string;
    content: string;
    publishedAt: string;
    platforms: Array<{
      network: string;
      url: string;
      handle: string;
    }>;
  }>;
  postDates?: string[]; // ISO date strings for contribution graph
  rankings: {
    postRank?: number;
    aiUsageRank?: number;
  };
  lastUpdated: string;
  profileCardVersion: string;
}
```

**LeaderboardData** (`/leaderboard/posts.json` or `/leaderboard/ai-usage.json`):
```typescript
{
  type: 'posts' | 'ai-usage';
  generatedAt: string;
  entries: Array<{
    rank: number;
    userId: string;
    displayName: string;
    value: number;
    profileCardUrl: string;
  }>;
}
```

## Deployment Process

### Automated Deployment (CI/CD)

Profile cards are automatically deployed via GitHub Actions:

1. **Sandbox**: On push to main branch
   - Workflow: `.github/workflows/ci-cd.yml.yaml`
   - Triggers on changes to `profile-cards/**` or backend profile card files

2. **Beta**: Via promotion pipeline
   - Workflow: `.github/workflows/promotion-pipeline.yml`
   - Manual trigger with environment selection

3. **Production**: Via production deployment workflow
   - Workflow: `.github/workflows/production-deployment.yml`
   - Manual trigger with approval gates

### Manual Deployment

Deploy to a specific environment:

```bash
# Build the Angular app
npm run build:production

# Deploy to environment (sandbox, beta, or prod)
./scripts/deploy-profile-cards.sh <environment>
```

The deployment script:
1. Gets S3 bucket and CloudFront distribution from CDK outputs
2. Syncs Angular build to S3 with cache headers
3. Invalidates CloudFront cache
4. Triggers initial card generation

### Deployment Verification

After deployment, verify:

1. **SPA Loading**: Visit `https://cards.<baseDomain>/`
2. **Profile Card**: Visit `https://cards.<baseDomain>/<test-user-id>`
3. **Leaderboard**: Visit `https://cards.<baseDomain>/leaderboard`
4. **CloudFront Cache**: Check cache headers in browser DevTools
5. **Data Generation**: Check Lambda logs in CloudWatch

## Troubleshooting

### Profile Card Not Found (404)

**Symptoms**: User visits profile card URL but sees "Profile not found"

**Possible Causes**:
1. User profile data not yet generated
2. User ID is invalid or doesn't exist
3. S3 file missing or not uploaded

**Solutions**:
```bash
# Check if user data exists in S3
aws s3 ls s3://nexus-share-profile-cards-<env>/users/<userId>.json

# Manually trigger card generation
aws lambda invoke \
  --function-name <CardGeneratorFunctionName> \
  --payload '{"type":"scheduled"}' \
  /tmp/response.json

# Check Lambda logs
aws logs tail /aws/lambda/<CardGeneratorFunctionName> --follow
```

### Stale Data on Profile Card

**Symptoms**: Profile card shows outdated information

**Possible Causes**:
1. CloudFront cache not invalidated
2. Card generation Lambda not triggered
3. DynamoDB Stream not processing events

**Solutions**:
```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DistributionId> \
  --paths "/users/<userId>.json"

# Trigger card generation for specific user
aws lambda invoke \
  --function-name <CardGeneratorFunctionName> \
  --payload '{"type":"event-driven","userId":"<userId>"}' \
  /tmp/response.json

# Check DynamoDB Stream status
aws dynamodb describe-table \
  --table-name <TableName> \
  --query 'Table.StreamSpecification'
```

### SPA Not Loading

**Symptoms**: Blank page or JavaScript errors

**Possible Causes**:
1. Build artifacts not uploaded to S3
2. CloudFront cache serving old version
3. CORS issues
4. JavaScript errors in browser console

**Solutions**:
```bash
# Check S3 bucket contents
aws s3 ls s3://nexus-share-profile-cards-<env>/ --recursive

# Invalidate CloudFront cache completely
aws cloudfront create-invalidation \
  --distribution-id <DistributionId> \
  --paths "/*"

# Check browser console for errors
# Open DevTools > Console tab

# Verify CORS configuration
aws s3api get-bucket-cors \
  --bucket nexus-share-profile-cards-<env>
```

### Card Generation Lambda Timeout

**Symptoms**: Lambda execution exceeds 15-minute timeout

**Possible Causes**:
1. Too many users to process
2. DynamoDB throttling
3. S3 upload bottleneck

**Solutions**:
```bash
# Check Lambda execution time
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=<FunctionName> \
  --start-time <timestamp> \
  --end-time <timestamp> \
  --period 3600 \
  --statistics Maximum

# Check DynamoDB throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=<TableName> \
  --start-time <timestamp> \
  --end-time <timestamp> \
  --period 300 \
  --statistics Sum

# Increase Lambda memory (improves CPU allocation)
aws lambda update-function-configuration \
  --function-name <FunctionName> \
  --memory-size 3008
```

### Local Development Issues

**Problem**: Mock data not loading

**Solution**:
```bash
# Ensure proxy configuration is correct
cat proxy.conf.json

# Start dev server with proxy
npm run serve

# Verify mock data files exist
ls -la src/assets/mock-data/users/
ls -la src/assets/mock-data/leaderboard/
```

**Problem**: CORS errors in local development

**Solution**:
```typescript
// Ensure proxy.conf.json has correct configuration
{
  "/users": {
    "target": "http://localhost:4200/assets/mock-data",
    "pathRewrite": { "^/users": "/users" },
    "secure": false,
    "changeOrigin": true
  }
}
```

**Problem**: Build fails with TypeScript errors

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript version
npm list typescript

# Run type checking
npm run build -- --configuration production
```

### CloudFront Issues

**Problem**: 403 Forbidden errors

**Possible Causes**:
1. Origin Access Identity not configured
2. S3 bucket policy incorrect
3. CloudFront behavior not matching path

**Solutions**:
```bash
# Check CloudFront distribution configuration
aws cloudfront get-distribution-config \
  --id <DistributionId>

# Verify S3 bucket policy allows OAI
aws s3api get-bucket-policy \
  --bucket nexus-share-profile-cards-<env>

# Check CloudFront behaviors
aws cloudfront get-distribution-config \
  --id <DistributionId> \
  --query 'DistributionConfig.CacheBehaviors'
```

### Monitoring and Debugging

**CloudWatch Logs**:
```bash
# View Lambda logs
aws logs tail /aws/lambda/<CardGeneratorFunctionName> --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/<CardGeneratorFunctionName> \
  --filter-pattern "ERROR"

# View specific time range
aws logs tail /aws/lambda/<CardGeneratorFunctionName> \
  --since 1h \
  --format short
```

**CloudWatch Metrics**:
```bash
# Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=<FunctionName> \
  --start-time <timestamp> \
  --end-time <timestamp> \
  --period 3600 \
  --statistics Sum

# Lambda errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=<FunctionName> \
  --start-time <timestamp> \
  --end-time <timestamp> \
  --period 3600 \
  --statistics Sum
```

**S3 Access Logs**:
```bash
# Enable S3 access logging
aws s3api put-bucket-logging \
  --bucket nexus-share-profile-cards-<env> \
  --bucket-logging-status file://logging.json

# View access logs
aws s3 ls s3://<logging-bucket>/logs/
```

## Testing

See test files in:
- `backend/src/profile-cards/__tests__/` - Backend unit tests
- `profile-cards/src/app/**/*.spec.ts` - Angular component tests

Run tests:
```bash
# Backend tests
cd backend
npm test -- profile-cards

# Frontend tests
cd profile-cards
npm test
```

## Contributing

When making changes to profile cards:

1. Update mock data if data models change
2. Update environment configurations for new features
3. Test locally with `npm run serve`
4. Run tests with `npm test`
5. Build for production with `npm run build:production`
6. Deploy to sandbox first for testing

## Support

For issues or questions:
- Check CloudWatch logs for Lambda errors
- Review S3 bucket contents for missing files
- Verify CloudFront cache behavior
- Check browser console for client-side errors

## License

Copyright © 2025 Nexus Share. All rights reserved.
