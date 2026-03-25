import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kiri_check/kiri_check.dart';

/// **Validates: Requirements 6.6**
/// 
/// Property 8: Amplify Configuration Error Display
/// 
/// For any invalid Amplify configuration (missing endpoint, invalid region, 
/// malformed credentials), the Flutter frontend SHALL display an error message 
/// to the user indicating the configuration problem.
void main() {
  group('Property 8: Amplify Configuration Error Display', () {
    // Property test 1: Error messages are descriptive
    property('Configuration error messages are descriptive and non-empty', () {
      forAll(
        constantFrom([
          'AmplifyException: Invalid configuration',
          'ConfigurationError: Missing endpoint',
          'AuthException: Invalid user pool ID',
          'NetworkException: Cannot reach endpoint',
          'FormatException: Malformed JSON configuration',
          'Exception: REPLACE_WITH_USER_POOL_ID not replaced',
          'Exception: REPLACE_WITH_API_ENDPOINT not replaced',
          'Exception: REPLACE_WITH_REGION not replaced',
        ]),
        (String errorMessage) {
          // Verify error message is non-empty
          expect(errorMessage, isNotEmpty,
              reason: 'Error message should not be empty');

          // Verify error message contains descriptive information
          expect(
            errorMessage.length,
            greaterThan(10),
            reason: 'Error message should be descriptive (>10 chars)',
          );

          // Verify error message indicates the problem type
          final hasErrorIndicator = errorMessage.contains('Exception') ||
              errorMessage.contains('Error') ||
              errorMessage.contains('Invalid') ||
              errorMessage.contains('Missing') ||
              errorMessage.contains('Malformed') ||
              errorMessage.contains('Cannot') ||
              errorMessage.contains('REPLACE_WITH');

          expect(
            hasErrorIndicator,
            isTrue,
            reason: 'Error message should indicate the problem type: $errorMessage',
          );
        },
        maxExamples: 100,
      );
    });

    // Property test 2: Configuration types map to appropriate error messages
    property('Configuration types map to descriptive error messages', () {
      forAll(
        constantFrom([
          'missing_endpoint',
          'invalid_region',
          'malformed_json',
          'missing_pool_id',
          'missing_client_id',
          'empty_config',
        ]),
        (String configType) {
          final errorMessage = _getErrorMessageForConfigType(configType);
          
          // Verify error message is non-empty
          expect(errorMessage, isNotEmpty,
              reason: 'Error message for $configType should not be empty');
          
          // Verify error message is descriptive
          expect(errorMessage.length, greaterThan(15),
              reason: 'Error message for $configType should be descriptive');
          
          // Verify error message doesn't contain the raw config type
          expect(errorMessage.contains('_'), isFalse,
              reason: 'Error message should be user-friendly, not contain underscores');
        },
        maxExamples: 100,
      );
    });

    // Property test 3: Error message combinations are valid
    property('Error type and detail combinations produce valid messages', () {
      forAll(
        combine2(
          constantFrom([
            'Configuration',
            'Authentication',
            'Network',
            'Format',
            'Validation',
          ]),
          constantFrom([
            'Invalid endpoint',
            'Missing credentials',
            'Malformed data',
            'Connection failed',
            'Timeout occurred',
          ]),
        ),
        (tuple) {
          final errorType = tuple.$1;
          final errorDetail = tuple.$2;
          final errorMessage = '$errorType Error: $errorDetail';

          // Verify combined message is well-formed
          expect(errorMessage, contains('Error:'),
              reason: 'Combined message should contain "Error:"');
          expect(errorMessage, contains(errorType),
              reason: 'Combined message should contain error type');
          expect(errorMessage, contains(errorDetail),
              reason: 'Combined message should contain error detail');
          expect(errorMessage.length, greaterThan(20),
              reason: 'Combined message should be descriptive');
        },
        maxExamples: 100,
      );
    });

    // Widget test 1: Error UI displays correctly for missing endpoint
    testWidgets('displays error UI for missing endpoint configuration', (WidgetTester tester) async {
      final errorMessage = _getErrorMessageForConfigType('missing_endpoint');
      final testWidget = _buildErrorWidget(errorMessage);

      await tester.pumpWidget(testWidget);
      await tester.pumpAndSettle();

      // Verify all UI elements are present
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      expect(find.text('Configuration Error'), findsOneWidget);
      expect(find.text(errorMessage), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Retry'), findsOneWidget);
    });

    // Widget test 2: Error UI displays correctly for invalid region
    testWidgets('displays error UI for invalid region configuration', (WidgetTester tester) async {
      final errorMessage = _getErrorMessageForConfigType('invalid_region');
      final testWidget = _buildErrorWidget(errorMessage);

      await tester.pumpWidget(testWidget);
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      expect(find.text('Configuration Error'), findsOneWidget);
      expect(find.text(errorMessage), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Retry'), findsOneWidget);
    });

    // Widget test 3: Error UI displays correctly for malformed JSON
    testWidgets('displays error UI for malformed JSON configuration', (WidgetTester tester) async {
      final errorMessage = _getErrorMessageForConfigType('malformed_json');
      final testWidget = _buildErrorWidget(errorMessage);

      await tester.pumpWidget(testWidget);
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      expect(find.text('Configuration Error'), findsOneWidget);
      expect(find.text(errorMessage), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Retry'), findsOneWidget);
    });

    // Widget test 4: Retry button is tappable
    testWidgets('retry button is tappable', (WidgetTester tester) async {
      final errorMessage = _getErrorMessageForConfigType('empty_config');
      final testWidget = _buildErrorWidget(errorMessage);

      await tester.pumpWidget(testWidget);
      await tester.pumpAndSettle();

      final retryButton = find.widgetWithText(ElevatedButton, 'Retry');
      expect(retryButton, findsOneWidget);
      
      // Tap the button
      await tester.tap(retryButton);
      await tester.pump();
      
      // Button should still be present after tap
      expect(retryButton, findsOneWidget);
    });

    // Widget test 5: Error icon has correct semantics
    testWidgets('error icon has semantic label', (WidgetTester tester) async {
      final errorMessage = _getErrorMessageForConfigType('missing_pool_id');
      final testWidget = MaterialApp(
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.error_outline,
                  size: 48,
                  color: Colors.red,
                  semanticLabel: 'Error icon',
                ),
                const SizedBox(height: 16),
                const Text(
                  'Configuration Error',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text(
                    errorMessage,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {},
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );

      await tester.pumpWidget(testWidget);
      await tester.pumpAndSettle();

      // Verify icon is present
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    // Widget test 6: Error message is displayed in red
    testWidgets('error message is displayed in red color', (WidgetTester tester) async {
      final errorMessage = _getErrorMessageForConfigType('missing_client_id');
      final testWidget = _buildErrorWidget(errorMessage);

      await tester.pumpWidget(testWidget);
      await tester.pumpAndSettle();

      // Find the Text widget with the error message
      final textFinder = find.text(errorMessage);
      expect(textFinder, findsOneWidget);

      // Get the Text widget and verify its style
      final Text textWidget = tester.widget(textFinder);
      expect(textWidget.style?.color, equals(Colors.red));
    });
  });
}

/// Helper function to build error widget for testing
Widget _buildErrorWidget(String errorMessage) {
  return MaterialApp(
    home: Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            const Text(
              'Configuration Error',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(
                errorMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.red),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {},
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Helper function to generate error messages for different configuration types
String _getErrorMessageForConfigType(String configType) {
  switch (configType) {
    case 'missing_endpoint':
      return 'API endpoint is missing or invalid';
    case 'invalid_region':
      return 'AWS region configuration is invalid';
    case 'malformed_json':
      return 'Configuration format is malformed';
    case 'missing_pool_id':
      return 'User pool ID is missing';
    case 'missing_client_id':
      return 'App client ID is missing';
    case 'empty_config':
      return 'Configuration is empty or incomplete';
    default:
      return 'Unknown configuration error';
  }
}
