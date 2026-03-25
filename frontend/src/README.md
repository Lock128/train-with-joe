# Minimal SaaS Template - Flutter Frontend

A cross-platform Flutter application for web, iOS, and Android with AWS Amplify integration.

## Features

- **Authentication**: AWS Cognito integration with sign in, sign up, and sign out
- **State Management**: Provider pattern for auth, user, and subscription state
- **Routing**: go_router for declarative routing with authentication guards
- **Payment Integration**: Platform-specific payment methods
  - Web: Stripe Checkout
  - iOS: App Store In-App Purchases
  - Android: Google Play Billing
- **API Integration**: GraphQL API via AWS AppSync

## Project Structure

```
lib/
├── models/           # Data models and Amplify configuration
├── providers/        # State management providers
├── screens/          # UI screens
├── services/         # Business logic and API clients
└── main.dart         # App entry point
```

## Setup

1. Install Flutter dependencies:
   ```bash
   flutter pub get
   ```

2. Update Amplify configuration in `lib/models/amplifyconfiguration.dart` with your AWS resource IDs after backend deployment.

## Running

### Web
```bash
flutter run -d chrome
```

### iOS
```bash
flutter run -d ios
```

### Android
```bash
flutter run -d android
```

## Building

### Web (Production)
```bash
flutter build web --release
```

### iOS
```bash
flutter build ios --release
```

### Android
```bash
flutter build apk --release
# or
flutter build appbundle --release
```

## Testing

Run all tests:
```bash
flutter test
```

## Configuration

After deploying the backend infrastructure, update the following in `lib/models/amplifyconfiguration.dart`:

- `REPLACE_WITH_USER_POOL_ID`: Your Cognito User Pool ID
- `REPLACE_WITH_APP_CLIENT_ID`: Your Cognito App Client ID
- `REPLACE_WITH_REGION`: Your AWS region (e.g., us-east-1)
- `REPLACE_WITH_API_ENDPOINT`: Your AppSync GraphQL API endpoint
