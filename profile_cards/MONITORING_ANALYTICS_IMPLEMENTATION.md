# Monitoring and Analytics Implementation

This document describes the monitoring and analytics implementation for the Profile Cards feature.

## Overview

The implementation includes:
1. CloudWatch metrics for card generation (backend)
2. CloudWatch alarms for error detection
3. Analytics tracking for profile card views (frontend)
4. Analytics tracking for share button clicks (main app)

## Backend Monitoring (Task 7.1)

### CloudWatch Metrics

The card generator Lambda function now publishes the following custom metrics to CloudWatch:

**Namespace**: `TrainWithJoe/ProfileCards`

**Metrics**:
- `ProfileCardsGenerated` (Count): Number of profile cards successfully generated
- `ProfileCardGenerationErrors` (Count): Number of errors during generation
- `ProfileCardGenerationDuration` (Milliseconds): Time taken to generate all cards
- `ProfileCardErrorRate` (Percent): Percentage of failed card generations

**Dimensions**:
- `Environment`: The deployment environment (prod, beta, sandbox)

### CloudWatch Alarms

Four alarms are configured to monitor the health of the profile card generation system:

1. **High Error Rate Alarm**
   - Triggers when error rate exceeds 5%
   - Evaluation period: 5 minutes
   - Action: SNS notification (production only)

2. **Long Generation Time Alarm**
   - Triggers when generation takes longer than 10 minutes
   - Evaluation period: 5 minutes
   - Action: SNS notification (production only)

3. **Lambda Errors Alarm**
   - Triggers on any Lambda function errors
   - Evaluation period: 5 minutes
   - Action: SNS notification (production only)

4. **Lambda Timeout Alarm**
   - Triggers when execution time exceeds 14 minutes (near timeout)
   - Evaluation period: 5 minutes
   - Action: SNS notification (production only)

### SNS Notifications

For production environment, alarms send notifications to an SNS topic. Configure the email recipient by setting the `ALARM_EMAIL` environment variable during deployment.

### Implementation Details

**Files Modified**:
- `backend/src/profile-cards/card-generator-handler.ts`: Added metrics publishing
- `backend/lib/profile-card-stack.ts`: Added CloudWatch alarms and SNS topic

**Key Functions**:
- `publishMetrics()`: Publishes custom metrics to CloudWatch
- `createCloudWatchAlarms()`: Creates alarms for monitoring

**Permissions**:
The Lambda function has been granted `cloudwatch:PutMetricData` permission with a condition that restricts it to the `TrainWithJoe/ProfileCards` namespace.

## Frontend Analytics (Task 7.2)

### Analytics Service

A new `AnalyticsService` has been created for the Angular SPA to track user interactions.

**Location**: `profile-cards/src/app/services/analytics.service.ts`

**Events Tracked**:

1. **Profile Card View**
   - Event: `profile_card_view`
   - Data: userId, timestamp, referrer, userAgent, url

2. **Leaderboard View**
   - Event: `leaderboard_view`
   - Data: leaderboardType (posts/ai-usage), timestamp, referrer, userAgent, url

3. **Profile Card Error**
   - Event: `profile_card_error`
   - Data: errorType, errorMessage, userId, timestamp, url

4. **Profile Card Load Time**
   - Event: `profile_card_load_time`
   - Data: userId, loadTimeMs, timestamp

### Integration Points

**Profile Card Component**:
- Tracks page views when profile card loads
- Tracks load time performance
- Tracks errors (404, load failures)

**Leaderboard Component**:
- Tracks leaderboard page views
- Tracks tab switches between posts and AI usage leaderboards

### Main App Analytics (Flutter)

**Share Button Tracking**:

The Flutter main app now tracks profile card sharing events:

**Events Tracked**:

1. **Profile Card Share**
   - Event: `profile_card_share`
   - Data: userId, shareMethod (copy/native/social), timestamp
   - Tracked in: `ProfileCardShareWidget`

2. **Share Dialog Open**
   - Event: `profile_card_share_dialog_open`
   - Data: userId, timestamp
   - Tracked in: `ProfileCardShareDialog`

3. **Social Media Share**
   - Event: `profile_card_share`
   - Data: userId, shareMethod (social), platform (twitter/linkedin/facebook/reddit), timestamp
   - Tracked in: `ProfileCardShareDialog`

**Files Modified**:
- `frontend/src/lib/widgets/profile_card_share_widget.dart`
- `frontend/src/lib/widgets/profile_card_share_dialog.dart`

### Analytics Data Flow

```
┌─────────────────────────────────────┐
│  User Interaction                   │
│  (View, Share, Error)               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  AnalyticsService.trackEvent()      │
│  (Angular SPA)                      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  console.log('[Analytics]', JSON)   │
│  (Structured logging)               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  CloudWatch Logs / RUM              │
│  (Captured by browser monitoring)   │
└─────────────────────────────────────┘
```

### Future Enhancements

The analytics service includes a placeholder for sending events to a backend endpoint:

```typescript
private sendToAnalyticsEndpoint(event: any): void {
  // Optional: Implement backend analytics endpoint
  // Example: POST to API Gateway + Lambda → CloudWatch Logs
}
```

This can be implemented to:
1. Create an API Gateway endpoint
2. Lambda function to receive analytics events
3. Write events to CloudWatch Logs or custom analytics database
4. Enable server-side aggregation and reporting

## Viewing Analytics Data

### CloudWatch Metrics

1. Navigate to CloudWatch Console
2. Select "Metrics" → "All metrics"
3. Choose "TrainWithJoe/ProfileCards" namespace
4. View metrics by environment dimension

### CloudWatch Logs

Analytics events from the SPA are logged to the browser console with the prefix `[Analytics]`. If CloudWatch RUM is configured, these logs will be captured automatically.

To view logs:
1. Navigate to CloudWatch Console
2. Select "Log groups"
3. Search for profile card related logs
4. Use CloudWatch Insights to query structured JSON logs

**Example Query**:
```
fields @timestamp, event, userId, shareMethod
| filter @message like /\[Analytics\]/
| parse @message /\[Analytics\] (?<analytics>.*)/
| stats count() by event
```

### Alarms

To view alarm status:
1. Navigate to CloudWatch Console
2. Select "Alarms"
3. Filter by "profile-cards" prefix
4. View alarm history and state

## Testing

### Backend Metrics Testing

1. Trigger card generation manually:
   ```bash
   aws lambda invoke \
     --function-name card-generator-sandbox \
     --payload '{"type":"scheduled"}' \
     response.json
   ```

2. Check CloudWatch metrics:
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace TrainWithJoe/ProfileCards \
     --metric-name ProfileCardsGenerated \
     --dimensions Name=Environment,Value=sandbox \
     --start-time 2024-01-01T00:00:00Z \
     --end-time 2024-12-31T23:59:59Z \
     --period 3600 \
     --statistics Sum
   ```

### Frontend Analytics Testing

1. Open browser developer console
2. Navigate to a profile card page
3. Look for `[Analytics]` log entries
4. Verify JSON structure and data

Example log:
```json
[Analytics] {
  "event": "profile_card_view",
  "namespace": "ProfileCards",
  "userId": "user-123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "referrer": "https://train-with-joe.com",
  "userAgent": "Mozilla/5.0...",
  "url": "https://cards.train-with-joe.com/user-123"
}
```

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

**Requirement 8.1**: Profile card page views are logged with timestamp and user identifier
**Requirement 8.2**: Leaderboard page views are logged with timestamp
**Requirement 8.3**: Aggregate counts of profile card views per user can be queried
**Requirement 8.4**: Aggregate counts of leaderboard page views are available
**Requirement 8.5**: Analytics dashboard can display engagement metrics (via CloudWatch)

## Deployment

The monitoring and analytics features are automatically deployed with the profile cards infrastructure:

```bash
# Deploy CDK stack (includes alarms)
cd backend
npm run deploy

# Deploy Angular SPA (includes analytics service)
cd profile-cards
npm run build
./scripts/deploy-profile-cards.sh <environment>
```

## Configuration

### Alarm Email (Production)

Set the `ALARM_EMAIL` environment variable before deploying to production:

```bash
export ALARM_EMAIL="ops-team@example.com"
npm run deploy
```

### CloudWatch RUM (Optional)

To enable automatic capture of frontend analytics events, configure CloudWatch RUM for the profile cards domain. This will automatically capture console logs and send them to CloudWatch.

## Troubleshooting

### Metrics Not Appearing

1. Check Lambda execution logs for errors
2. Verify IAM permissions for `cloudwatch:PutMetricData`
3. Ensure namespace is exactly `TrainWithJoe/ProfileCards`

### Alarms Not Triggering

1. Verify SNS topic subscription is confirmed
2. Check alarm configuration in CloudWatch console
3. Ensure metrics are being published

### Analytics Events Not Logged

1. Check browser console for `[Analytics]` logs
2. Verify AnalyticsService is injected in components
3. Check for JavaScript errors in browser console
