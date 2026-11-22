import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:train_with_joe/utils/dash0_diagnostics.dart';

void main() {
  group('maskDash0Token', () {
    test('shows first 7 characters and length only', () {
      final masked = maskDash0Token('auth_abcdefghijklmnopqrstuvwxyz');
      expect(masked, 'auth_ab... (length 31)');
      expect(masked.contains('cdefghijkl'), isFalse);
    });
    test('handles short, empty and null tokens', () {
      expect(maskDash0Token('abc'), 'abc... (length 3)');
      expect(maskDash0Token(''), 'not set');
      expect(maskDash0Token(null), 'not set');
    });
  });

  group('dash0LogsUrl', () {
    test('normalizes the endpoint', () {
      expect(dash0LogsUrl('https://x.example/'), 'https://x.example/v1/logs');
      expect(dash0LogsUrl('https://x.example/v1/traces'), 'https://x.example/v1/logs');
    });
  });

  test('test log payload is valid OTLP JSON', () {
    final p = buildDash0TestLogPayload(serviceName: 'svc', now: DateTime.utc(2026, 1, 2));
    final rl = (p['resourceLogs'] as List).single as Map;
    final attr = ((rl['resource'] as Map)['attributes'] as List).single as Map;
    expect(attr['value'], {'stringValue': 'svc-diagnostics'});
    final rec = (((rl['scopeLogs'] as List).single as Map)['logRecords'] as List).single as Map;
    expect(rec['body'], {'stringValue': 'diagnostics connection test'});
    expect(rec['timeUnixNano'], '1767312000000000000');
    expect(() => jsonEncode(p), returnsNormally);
  });

  group('report', () {
    final d = Dash0Diagnostics.instance;
    setUp(d.reset);

    test('never contains the full token', () {
      const token = 'secret_token_value_1234567890';
      d.recordConfig(
        endpoint: 'https://x.example/v1/logs',
        authToken: token,
        dataset: 'ds',
        environment: 'beta',
        serviceName: 'svc',
        serviceVersion: '1.0+1',
        sdkDebug: true,
      );
      d.recordNotConfigured();
      final report = buildDash0DiagnosticsReport(d.fields());
      expect(report, isNot(contains(token)));
      expect(report, contains('secret_... (length ${token.length})'));
      expect(report, contains('Endpoint URL: https://x.example'));
      expect(report, contains('Dataset: ds'));
      expect(report, contains('Init branch: no endpoint or token'));
      expect(report, contains('Session sampled: n/a'));
    });

    test('records failures and includes connection result', () {
      d.recordFailure('boom');
      final report = buildDash0DiagnosticsReport(
        d.fields(),
        connectionResult: const Dash0ConnectionResult(statusCode: 401, bodyPreview: 'nope'),
        testEventStatus: 'ok',
      );
      expect(report, contains('Init branch: init failed: boom'));
      expect(report, contains('Init error: boom'));
      expect(report, contains('Connection test: HTTP 401, body: nope'));
      expect(report, contains('rejected the token'));
      expect(report, contains('Test event: ok'));
    });
  });

  group('sendDash0ConnectionTest', () {
    test('posts to /v1/logs with headers and truncates the body', () async {
      late http.Request seen;
      final client = MockClient((req) async {
        seen = req;
        return http.Response('x' * 500, 200);
      });
      final r = await sendDash0ConnectionTest(
        endpoint: 'https://x.example/',
        authToken: 'tok',
        dataset: 'ds',
        serviceName: 'svc',
        client: client,
      );
      expect(seen.url.toString(), 'https://x.example/v1/logs');
      expect(seen.headers['Authorization'], 'Bearer tok');
      expect(seen.headers['Dash0-Dataset'], 'ds');
      expect(r.statusCode, 200);
      expect(r.bodyPreview!.length, 200);
      expect(r.explanation, contains('accepted'));
    });

    test('returns the exception instead of throwing', () async {
      final client = MockClient((_) async => throw Exception('offline'));
      final r = await sendDash0ConnectionTest(
        endpoint: 'https://x.example',
        authToken: 'tok',
        dataset: null,
        serviceName: 'svc',
        client: client,
      );
      expect(r.error, contains('offline'));
      expect(r.explanation, contains('did not reach'));
    });
  });
}
