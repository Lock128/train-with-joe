import 'package:dash0_flutter_sdk/dash0_flutter_sdk.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../utils/dash0_config.dart';
import '../utils/dash0_diagnostics.dart';

/// Developer-only screen showing the state of the Dash0 integration on the
/// device. It is English only (like the other technical rows of the info
/// screen) and is reachable only through the parental gate on the info screen.
/// It shows no user data and never the full token.
class Dash0DiagnosticsScreen extends StatefulWidget {
  const Dash0DiagnosticsScreen({super.key});

  @override
  State<Dash0DiagnosticsScreen> createState() => _Dash0DiagnosticsScreenState();
}

class _Dash0DiagnosticsScreenState extends State<Dash0DiagnosticsScreen> {
  // Compiled-in values, only used for the connection test.
  static const _rawEndpoint = String.fromEnvironment('OTEL_EXPORTER_OTLP_ENDPOINT', defaultValue: '');
  static const _rawHeaders = String.fromEnvironment('OTEL_EXPORTER_OTLP_HEADERS', defaultValue: '');

  String? _testEventStatus;
  Dash0ConnectionResult? _connectionResult;
  bool _sendingEvent = false;
  bool _testingConnection = false;

  Future<void> _sendTestEvent() async {
    setState(() {
      _sendingEvent = true;
      _testEventStatus = null;
    });
    String status;
    try {
      if (!Dash0.isInitialized) {
        status = 'Not sent, the SDK is not initialized.';
      } else {
        Dash0.sendEvent('dash0.diagnostics.test', title: 'Dash0 diagnostics test event');
        await Dash0.flush();
        status = 'Queued and flush completed at ${DateTime.now().toUtc().toIso8601String()}. '
            'The SDK drops delivery failures silently, so use Test connection to verify delivery.';
      }
    } catch (e) {
      status = 'Failed: $e';
    }
    if (!mounted) return;
    setState(() {
      _sendingEvent = false;
      _testEventStatus = status;
    });
  }

  Future<void> _testConnection() async {
    final headers = parseOtlpHeaders(_rawHeaders);
    final token = extractBearerToken(headers);
    final diagnostics = Dash0Diagnostics.instance;
    if (_rawEndpoint.isEmpty || token == null) {
      setState(() {
        _connectionResult = const Dash0ConnectionResult(error: 'No endpoint or token compiled into this build.');
      });
      return;
    }
    setState(() {
      _testingConnection = true;
      _connectionResult = null;
    });
    final result = await sendDash0ConnectionTest(
      endpoint: _rawEndpoint,
      authToken: token,
      dataset: extractDash0Dataset(headers),
      serviceName: diagnostics.serviceName ?? 'train-with-joe-flutter',
    );
    if (!mounted) return;
    setState(() {
      _testingConnection = false;
      _connectionResult = result;
    });
  }

  Future<void> _copyReport() async {
    final report = buildDash0DiagnosticsReport(
      Dash0Diagnostics.instance.fields(),
      connectionResult: _connectionResult,
      testEventStatus: _testEventStatus,
    );
    await Clipboard.setData(ClipboardData(text: report));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Report copied (token masked)')));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fields = Dash0Diagnostics.instance.fields();
    final result = _connectionResult;
    return Scaffold(
      appBar: AppBar(title: const Text('Dash0 diagnostics')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Configuration and state', style: theme.textTheme.titleMedium),
                        const Divider(),
                        for (final f in fields) _row(theme, f.key, f.value),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Actions', style: theme.textTheme.titleMedium),
                        const Divider(),
                        FilledButton(
                          onPressed: _sendingEvent ? null : _sendTestEvent,
                          child: const Text('Send test event'),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Sends dash0.diagnostics.test through the SDK and flushes it.',
                          style: theme.textTheme.bodySmall,
                        ),
                        if (_testEventStatus != null) ...[
                          const SizedBox(height: 4),
                          SelectableText(_testEventStatus!),
                        ],
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: _testingConnection ? null : _testConnection,
                          child: const Text('Test connection'),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Posts one log record straight to the logs endpoint with the built-in token (10 s timeout).',
                          style: theme.textTheme.bodySmall,
                        ),
                        if (_testingConnection) ...[
                          const SizedBox(height: 8),
                          const LinearProgressIndicator(),
                        ],
                        if (result != null) ...[
                          const SizedBox(height: 4),
                          SelectableText(result.summary),
                          Text(result.explanation, style: theme.textTheme.bodySmall),
                        ],
                        const SizedBox(height: 16),
                        OutlinedButton(onPressed: _copyReport, child: const Text('Copy report')),
                        const SizedBox(height: 4),
                        Text(
                          'Copies a plain-text report. The token is masked.',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _row(ThemeData theme, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
          SelectableText(value, style: const TextStyle(fontFamily: 'monospace')),
        ],
      ),
    );
  }
}
