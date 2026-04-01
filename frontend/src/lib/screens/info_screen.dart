import 'package:flutter/material.dart';
import '../models/app_version.dart';
import '../services/api_service.dart';

/// Info screen showing app and backend version details.
class InfoScreen extends StatefulWidget {
  const InfoScreen({super.key});

  @override
  State<InfoScreen> createState() => _InfoScreenState();
}

class _InfoScreenState extends State<InfoScreen> {
  final ApiService _apiService = ApiService();
  String? _backendCommitId;
  String? _backendBuildNumber;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadBackendVersion();
  }

  Future<void> _loadBackendVersion() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      const query = '''
        query GetAppInfo {
          getAppInfo {
            commitId
            buildNumber
          }
        }
      ''';

      final result = await _apiService.query(query);
      final info = result['getAppInfo'] as Map<String, dynamic>?;

      setState(() {
        _backendCommitId = info?['commitId'] as String?;
        _backendBuildNumber = info?['buildNumber'] as String?;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('App Info'),
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      children: [
                        const CircleAvatar(
                          radius: 40,
                          backgroundColor: Color(0xFFF0EDFF),
                          child: Icon(Icons.info_outline, size: 40, color: Color(0xFF6C5CE7)),
                        ),
                        const SizedBox(height: 16),
                        Text(AppVersion.appName, style: Theme.of(context).textTheme.headlineSmall),
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
                        Text('Frontend', style: Theme.of(context).textTheme.titleMedium),
                        const Divider(),
                        _infoRow('Commit ID', AppVersion.commitId),
                        _infoRow('Build Number', AppVersion.buildNumber),
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
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Backend', style: Theme.of(context).textTheme.titleMedium),
                            if (_error != null)
                              IconButton(
                                icon: const Icon(Icons.refresh, size: 20),
                                onPressed: _loadBackendVersion,
                                tooltip: 'Retry',
                              ),
                          ],
                        ),
                        const Divider(),
                        if (_isLoading)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Center(child: CircularProgressIndicator()),
                          )
                        else if (_error != null)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8.0),
                            child: Text('Failed to load backend info',
                                style: TextStyle(color: Theme.of(context).colorScheme.error)),
                          )
                        else ...[
                          _infoRow('Commit ID', _backendCommitId ?? 'N/A'),
                          _infoRow('Build Number', _backendBuildNumber ?? 'N/A'),
                        ],
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

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(fontFamily: 'monospace'),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
