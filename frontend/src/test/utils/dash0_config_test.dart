import 'package:dash0_flutter_sdk/dash0_flutter_sdk.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:train_with_joe/utils/dash0_config.dart';

void main() {
  group('Dash0 config helpers', () {
    test('parseOtlpHeaders parses comma separated pairs', () {
      final headers = parseOtlpHeaders(
        'Authorization=Bearer auth_abc=, Dash0-Dataset = prod ,bad,=x',
      );
      expect(headers, {
        'Authorization': 'Bearer auth_abc=',
        'Dash0-Dataset': 'prod',
      });
      expect(parseOtlpHeaders(''), isEmpty);
    });

    test('extractBearerToken handles prefix and case', () {
      expect(extractBearerToken({'authorization': 'Bearer auth_1'}), 'auth_1');
      expect(extractBearerToken({'Authorization': 'auth_2'}), 'auth_2');
      expect(extractBearerToken({'Authorization': 'Bearer '}), isNull);
      expect(extractBearerToken({'X': 'y'}), isNull);
    });

    test('extractDash0Dataset reads the dataset header', () {
      expect(extractDash0Dataset({'dash0-dataset': 'dev'}), 'dev');
      expect(extractDash0Dataset({'a': 'b'}), isNull);
    });

    test('normalizeOtlpEndpoint strips signal paths and slashes', () {
      expect(
        normalizeOtlpEndpoint('https://ingress.dash0.com/v1/traces/'),
        'https://ingress.dash0.com',
      );
      expect(
        normalizeOtlpEndpoint('https://ingress.dash0.com:4318'),
        'https://ingress.dash0.com:4318',
      );
    });
  });

  group('Dash0 feature config', () {
    test('parseBoolFlag handles values and defaults', () {
      expect(parseBoolFlag('true', defaultValue: false), isTrue);
      expect(parseBoolFlag(' ON ', defaultValue: false), isTrue);
      expect(parseBoolFlag('0', defaultValue: true), isFalse);
      expect(parseBoolFlag('', defaultValue: true), isTrue);
      expect(parseBoolFlag('maybe', defaultValue: false), isFalse);
    });

    test('parseSamplingRate defaults to 0 and clamps', () {
      expect(parseSamplingRate(''), 0);
      expect(parseSamplingRate('abc'), 0);
      expect(parseSamplingRate('12.5'), 12.5);
      expect(parseSamplingRate('250'), 100);
      expect(parseSamplingRate('-3'), 0);
    });

    test('parseSeconds only accepts positive integers', () {
      expect(parseSeconds('45'), const Duration(seconds: 45));
      expect(parseSeconds('0'), isNull);
      expect(parseSeconds(''), isNull);
      expect(parseSeconds('x'), isNull);
    });

    test('buildDash0Instrumentations keeps opt-ins out by default', () {
      final set = buildDash0Instrumentations(
        httpOverrides: false,
        sessionReplay: false,
        profiling: false,
      );
      expect(
        set,
        containsAll([
          Dash0Instrumentation.navigation,
          Dash0Instrumentation.error,
          Dash0Instrumentation.http,
          Dash0Instrumentation.lifecycle,
          Dash0Instrumentation.metrics,
          Dash0Instrumentation.vitals,
          Dash0Instrumentation.rageClicks,
        ]),
      );
      expect(set, isNot(contains(Dash0Instrumentation.httpOverrides)));
      expect(set, isNot(contains(Dash0Instrumentation.sessionReplay)));
      expect(set, isNot(contains(Dash0Instrumentation.profiling)));
    });

    test('buildDash0Instrumentations adds opt-ins when requested', () {
      final set = buildDash0Instrumentations(
        httpOverrides: true,
        sessionReplay: true,
        profiling: true,
      );
      expect(set, contains(Dash0Instrumentation.httpOverrides));
      expect(set, contains(Dash0Instrumentation.sessionReplay));
      expect(set, contains(Dash0Instrumentation.profiling));
    });

    test('resolveDash0Environment returns the trimmed value when set', () {
      expect(resolveDash0Environment(' beta ', isDebug: false), 'beta');
      expect(
        resolveDash0Environment('production', isDebug: true),
        'production',
      );
    });

    test('resolveDash0Environment falls back by build mode when empty', () {
      expect(resolveDash0Environment('', isDebug: true), 'development');
      expect(resolveDash0Environment('  ', isDebug: false), isNull);
    });

    test('propagation targets match AppSync origins only', () {
      bool matches(String url) =>
          dash0PropagationTargets.any((r) => r.hasMatch(url));
      expect(matches('https://api.trainwithjoe.com/graphql'), isFalse);
      expect(
        matches(
          'https://abc123.appsync-api.eu-central-1.amazonaws.com/graphql',
        ),
        isTrue,
      );
      expect(matches('https://evil.example.com/appsync-api.eu-central-1.amazonaws.com'), isFalse);
      expect(matches('https://ingress.dash0.com/v1/traces'), isFalse);
    });
  });

  group('resolveDash0ServiceName', () {
    test('appends the environment for non-production', () {
      expect(
        resolveDash0ServiceName('train-with-joe-flutter', 'sandbox'),
        'train-with-joe-flutter-sandbox',
      );
      expect(
        resolveDash0ServiceName('train-with-joe-flutter', 'beta'),
        'train-with-joe-flutter-beta',
      );
    });

    test('keeps the base name for production, null and empty', () {
      for (final env in ['production', 'prod', 'Production', null, '', '  ']) {
        expect(
          resolveDash0ServiceName('train-with-joe-flutter', env),
          'train-with-joe-flutter',
        );
      }
    });
  });

  group('currentDash0Environment', () {
    test('falls back to the debug default when no define is set', () {
      // Tests run in debug mode without DASH0_ENVIRONMENT.
      expect(currentDash0Environment(), 'development');
    });
  });
}
