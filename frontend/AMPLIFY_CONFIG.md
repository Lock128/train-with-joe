# Amplify Configuration Guide

## Overview

The Flutter frontend uses AWS Amplify to integrate with AWS services (Cognito for authentication and AppSync for GraphQL API). The configuration is stored in `lib/models/amplifyconfiguration.dart`.

## Configuration Structure

The Amplify configuration includes:

1. **Cognito Authentication**
   - User Pool ID
   - App Client ID
   - Identity Pool ID (for IAM authentication)
   - Region

2. **AppSync GraphQL API**
   - API Endpoint URL
   - Region
   - Authorization modes (Cognito User Pools + IAM)

## Updating Configuration After Deployment

After deploying the backend infrastructure with CDK, you need to update the Amplify configuration with the actual AWS resource IDs.

### Method 1: Manual Update

Edit `lib/models/amplifyconfiguration.dart` and replace the placeholder values:

```dart
"PoolId": "REPLACE_WITH_USER_POOL_ID",           // e.g., "us-east-1_ABC123DEF"
"AppClientId": "REPLACE_WITH_APP_CLIENT_ID",     // e.g., "1a2b3c4d5e6f7g8h9i0j1k2l"
"PoolId": "REPLACE_WITH_IDENTITY_POOL_ID",       // e.g., "us-east-1:12345678-1234-1234-1234-123456789012"
"Region": "REPLACE_WITH_REGION",                 // e.g., "us-east-1"
"endpoint": "REPLACE_WITH_API_ENDPOINT",         // e.g., "https://abc123def456.appsync-api.us-east-1.amazonaws.com/graphql"
```

### Method 2: Dynamic Configuration (Recommended)

Use the `AmplifyConfigHelper` utility class to generate configuration dynamically:

```dart
import 'utils/amplify_config_helper.dart';

final config = AmplifyConfigHelper.generateConfig(
  userPoolId: 'us-east-1_ABC123DEF',
  appClientId: '1a2b3c4d5e6f7g8h9i0j1k2l',
  identityPoolId: 'us-east-1:12345678-1234-1234-1234-123456789012',
  region: 'us-east-1',
  apiEndpoint: 'https://abc123def456.appsync-api.us-east-1.amazonaws.com/graphql',
);

await Amplify.configure(config);
```

## Getting AWS Resource IDs

After deploying the backend with CDK, you can find the resource IDs in:

1. **AWS Console**
   - Cognito User Pool: AWS Console → Cognito → User Pools
   - Identity Pool: AWS Console → Cognito → Identity Pools
   - AppSync API: AWS Console → AppSync → APIs

2. **CDK Outputs**
   - The CDK deployment will output these values in the terminal
   - Check CloudFormation stack outputs in AWS Console

3. **AWS CLI**
   ```bash
   # Get User Pool ID
   aws cognito-idp list-user-pools --max-results 10
   
   # Get Identity Pool ID
   aws cognito-identity list-identity-pools --max-results 10
   
   # Get AppSync API
   aws appsync list-graphql-apis
   ```

## Configuration Features

### Authentication
- **Flow Type**: USER_SRP_AUTH (Secure Remote Password)
- **Username Attributes**: EMAIL
- **MFA**: OFF (can be enabled in Cognito console)
- **Verification**: EMAIL

### API Authorization
- **Primary**: AMAZON_COGNITO_USER_POOLS (authenticated users)
- **Additional**: AWS_IAM (for service-to-service calls)

### Social Providers
The minimal template does not include social authentication providers (Facebook, Google, etc.). These can be added later if needed.

## Troubleshooting

### "Auth plugin has not been added"
- Ensure Amplify.configure() is called before any auth operations
- Check that AmplifyAuthCognito plugin is added before configuration

### "Invalid configuration"
- Verify all placeholder values are replaced with actual AWS resource IDs
- Ensure the region matches across all services
- Check that the API endpoint URL is correct (should end with /graphql)

### "Network error"
- Verify the API endpoint is accessible
- Check CORS settings in AppSync console
- Ensure the app has internet connectivity

## Security Notes

- Never commit actual AWS resource IDs to public repositories
- Use environment variables or secure configuration management for production
- Rotate credentials regularly
- Enable MFA for production environments!

!!!!