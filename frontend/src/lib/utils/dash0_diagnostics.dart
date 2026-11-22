/// On-device diagnostics for the Dash0 SDK integration.
///
/// Release builds hide SDK failures, so [Dash0Diagnostics] records what the
/// init code saw and [buildDash0DiagnosticsReport] renders it as plain text.
/// The full token and raw headers are never stored here for display. The
/// "Test connection" request reads them from the compile-time defines.
library;

import 'dart:convert';

import 'package:dash0_flutter_sdk/dash0_flutter_sdk.dart';
import 'package:http/http.dart' as http;

import 'dash0_config.dart';

/// Init outcome strings used by [Dash0Diagnostics.initBranch].
const String dash0InitBranchNotConfigured = 'no endpoint or token';
const String dash0InitBranchInitialized = 'initialized';
const String dash0InitBranchFailedPrefix = 'init failed: ';

/// Shows only the first 7 characters of [token] and its length, for example
/// `abcdefg... (length 40)`. Returns `not set` for a null or empty token.
String maskDash0Token(String? token) {
  if (token == null || token.isEmpty) return 'not set';
  final visible = token.length <= 7 ? token.length : 7;
  return '${token.substring(0, visible)}... (length ${token.length})';
}

/// Returns the OTLP logs URL for [endpoint], normalized like the SDK endpoint.
String dash0LogsUrl(String endpoint) => '${normalizeOtlpEndpoint(endpoint)}/v1/logs';

/// Builds a minimal valid OTLP/JSON log export request used by "Test connection".
Map<String, Object?> buildDash0TestLogPayload({
  required String serviceName,
  required DateTime now,
}) {
  final nanos = (now.toUtc().microsecondsSinceEpoch * 1000).toString();
  return {
    'resourceLogs': [
      {
        'resource': {
          'attributes': [
            {
              'key': 'service.name',
              'value': {'stringValue': '$serviceName-diagnostics'},
            },
          ],
        },
        'scopeLogs': [
          {
            'scope': {'name': 'dash0.diagnostics'},
            'logRecords': [
              {
                'timeUnixNano': nanos,
                'observedTimeUnixNano': nanos,
                'severityNumber': 9,
                'severityText': 'INFO',
                'body': {'stringValue': 'diagnostics connection test'},
              },
            ],
          },
        ],
      },
    ],
  };
}

/// Result of the "Test connection" request.
class Dash0ConnectionResult {
  const Dash0ConnectionResult({this.statusCode, this.bodyPreview, this.error});

  final int? statusCode;
  final String? bodyPreview;
  final String? error;

  /// One-line explanation of the result for the screen and the report.
  String get explanation => explainDash0ConnectionResult(this);

  String get summary {
    if (error != null) return 'Exception: $error';
    final body = (bodyPreview ?? '').isEmpty ? '(empty body)' : bodyPreview!;
    return 'HTTP $statusCode, body: $body';
  }
}

/// Explains a connection test result in one line.
String explainDash0ConnectionResult(Dash0ConnectionResult r) {
  if (r.error != null) {
    return 'The request did not reach Dash0 (network, DNS, TLS or timeout). Check connectivity and the endpoint URL.';
  }
  final code = r.statusCode ?? 0;
  if (code >= 200 && code < 300) {
    return 'Dash0 accepted the request. Endpoint, token and dataset work from this device.';
  }
  if (code == 401 || code == 403) {
    return 'Dash0 rejected the token. Check the Authorization header and that the token may ingest into this dataset.';
  }
  if (code == 404) return 'Not found. The endpoint URL is probably wrong.';
  if (code == 400 || code == 422) return 'Dash0 rejected the payload or dataset. Check the Dash0-Dataset value.';
  if (code == 429) return 'Rate limited by Dash0. Try again later.';
  if (code >= 500) return 'Dash0 had a server error. Try again later.';
  return 'Unexpected response. See the status and body above.';
}

/// Sends the test log record to `<endpoint>/v1/logs`. Never throws.
Future<Dash0ConnectionResult> sendDash0ConnectionTest({
  required String endpoint,
  required String authToken,
  required String? dataset,
  required String serviceName,
  http.Client? client,
  Duration timeout = const Duration(seconds: 10),
}) async {
  final httpClient = client ?? http.Client();
  try {
    final response = await httpClient
        .post(
          Uri.parse(dash0LogsUrl(endpoint)),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $authToken',
            if (dataset != null && dataset.isNotEmpty) 'Dash0-Dataset': dataset,
          },
          body: jsonEncode(buildDash0TestLogPayload(serviceName: serviceName, now: DateTime.now())),
        )
        .timeout(timeout);
    final body = response.body;
    return Dash0ConnectionResult(
      statusCode: response.statusCode,
      bodyPreview: body.length > 200 ? body.substring(0, 200) : body,
    );
  } catch (e) {
    // Exceptions can contain the URL but never the headers.
    return Dash0ConnectionResult(error: e.toString());
  } finally {
    if (client == null) httpClient.close();
  }
}

/// Singleton filled during Dash0 init. Holds no user data and no full token.
class Dash0Diagnostics {
  Dash0Diagnostics._();

  static final Dash0Diagnostics instance = Dash0Diagnostics._();

  bool initRan = false;
  bool endpointSet = false;
  bool authTokenSet = false;
  String? dataset;
  String? endpointUrl;
  String maskedToken = 'not set';
  String? environment;
  String? serviceName;
  String? serviceVersion;
  String initBranch = 'init not run';
  String? initError;
  DateTime? initTimestamp;
  bool sdkDebug = false;
  List<String> instrumentations = const [];
  bool propagationEnabled = false;

  /// Resets all fields. Used by tests.
  void reset() {
    initRan = false;
    endpointSet = false;
    authTokenSet = false;
    dataset = null;
    endpointUrl = null;
    maskedToken = 'not set';
    environment = null;
    serviceName = null;
    serviceVersion = null;
    initBranch = 'init not run';
    initError = null;
    initTimestamp = null;
    sdkDebug = false;
    instrumentations = const [];
    propagationEnabled = false;
  }

  /// Records the configuration seen by the init code. The [authToken] is only
  /// used to build the masked value.
  void recordConfig({
    required String endpoint,
    required String? authToken,
    required String? dataset,
    required String? environment,
    required String? serviceName,
    required String? serviceVersion,
    required bool sdkDebug,
  }) {
    initRan = true;
    initTimestamp = DateTime.now().toUtc();
    endpointSet = endpoint.isNotEmpty;
    authTokenSet = authToken != null && authToken.isNotEmpty;
    endpointUrl = endpoint.isEmpty ? null : normalizeOtlpEndpoint(endpoint);
    maskedToken = maskDash0Token(authToken);
    this.dataset = dataset;
    this.environment = environment;
    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
    this.sdkDebug = sdkDebug;
  }

  void recordNotConfigured() {
    initBranch = dash0InitBranchNotConfigured;
  }

  void recordInitialized({required Set<Dash0Instrumentation> instrumentations, required bool propagation}) {
    initBranch = dash0InitBranchInitialized;
    this.instrumentations = (instrumentations.map((i) => i.name).toList()..sort());
    propagationEnabled = propagation;
  }

  void recordFailure(Object error) {
    initRan = true;
    initTimestamp ??= DateTime.now().toUtc();
    initError = error.toString();
    initBranch = '$dash0InitBranchFailedPrefix$error';
  }

  /// Ordered label/value pairs for display and the report. Reads live SDK state.
  List<MapEntry<String, String>> fields() {
    final client = Dash0.client;
    return buildDash0DiagnosticsFields(
      initRan: initRan,
      endpointSet: endpointSet,
      authTokenSet: authTokenSet,
      dataset: dataset,
      endpointUrl: endpointUrl,
      maskedToken: maskedToken,
      environment: environment,
      serviceName: serviceName,
      serviceVersion: serviceVersion,
      initBranch: initBranch,
      initError: initError,
      initTimestamp: initTimestamp,
      sdkDebug: sdkDebug,
      sdkInitialized: Dash0.isInitialized,
      sessionId: Dash0.sessionId,
      sessionSampled: client?.isSessionSampled,
      clientEnabled: client?.isEnabled,
      instrumentations: instrumentations,
      propagationEnabled: propagationEnabled,
    );
  }
}

/// Builds the ordered display fields. Pure, so it can be tested without the SDK.
List<MapEntry<String, String>> buildDash0DiagnosticsFields({
  required bool initRan,
  required bool endpointSet,
  required bool authTokenSet,
  required String? dataset,
  required String? endpointUrl,
  required String maskedToken,
  required String? environment,
  required String? serviceName,
  required String? serviceVersion,
  required String initBranch,
  required String? initError,
  required DateTime? initTimestamp,
  required bool sdkDebug,
  required bool sdkInitialized,
  required String? sessionId,
  required bool? sessionSampled,
  required bool? clientEnabled,
  required List<String> instrumentations,
  required bool propagationEnabled,
}) {
  String yesNo(bool v) => v ? 'yes' : 'no';
  String orUnset(String? v) => (v == null || v.isEmpty) ? 'not set' : v;
  String maybe(bool? v) => v == null ? 'n/a' : yesNo(v);
  return [
    MapEntry('Init ran', yesNo(initRan)),
    MapEntry('Init branch', initBranch),
    MapEntry('Init error', orUnset(initError)),
    MapEntry('Init time (UTC)', initTimestamp?.toIso8601String() ?? 'n/a'),
    MapEntry('Endpoint set', yesNo(endpointSet)),
    MapEntry('Auth token set', yesNo(authTokenSet)),
    MapEntry('Auth token (masked)', maskedToken),
    MapEntry('Dataset', orUnset(dataset)),
    MapEntry('Endpoint URL', orUnset(endpointUrl)),
    MapEntry('Environment', orUnset(environment)),
    MapEntry('Service name', orUnset(serviceName)),
    MapEntry('Service version', orUnset(serviceVersion)),
    MapEntry('SDK debug (DASH0_SDK_DEBUG)', yesNo(sdkDebug)),
    MapEntry('SDK initialized', yesNo(sdkInitialized)),
    MapEntry('Session id', orUnset(sessionId)),
    MapEntry('Session sampled', maybe(sessionSampled)),
    MapEntry('Client enabled', maybe(clientEnabled)),
    MapEntry('Instrumentations', instrumentations.isEmpty ? 'none' : instrumentations.join(', ')),
    MapEntry('Trace propagation', propagationEnabled ? 'on' : 'off'),
  ];
}

/// Renders the plain-text report, optionally with the last connection test.
String buildDash0DiagnosticsReport(
  List<MapEntry<String, String>> fields, {
  Dash0ConnectionResult? connectionResult,
  String? testEventStatus,
}) {
  final buffer = StringBuffer('Dash0 diagnostics\n');
  for (final f in fields) {
    buffer.writeln('${f.key}: ${f.value}');
  }
  if (testEventStatus != null) buffer.writeln('Test event: $testEventStatus');
  if (connectionResult != null) {
    buffer.writeln('Connection test: ${connectionResult.summary}');
    buffer.writeln('Connection test meaning: ${connectionResult.explanation}');
  }
  return buffer.toString();
}
