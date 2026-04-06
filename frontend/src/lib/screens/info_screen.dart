import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../models/app_version.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/feedback_sound_service.dart';

/// Info screen showing app and backend version details.
class InfoScreen extends StatefulWidget {
  const InfoScreen({super.key});

  @override
  State<InfoScreen> createState() => _InfoScreenState();
}

class _InfoScreenState extends State<InfoScreen> {
  final ApiService _apiService = ApiService();
  final FeedbackSoundService _soundService = FeedbackSoundService();
  String? _backendCommitId;
  String? _backendBuildNumber;
  bool _isLoading = true;
  String? _error;
  bool _soundMuted = false;

  @override
  void initState() {
    super.initState();
    _soundMuted = _soundService.isMuted;
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

  Future<void> _handleSignOut(BuildContext context) async {
    final authProvider = context.read<AuthProvider>();
    await authProvider.signOut();
    if (context.mounted) {
      context.go('/signin');
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
                          backgroundColor: Color(0xFFE8F4FD),
                          child: ClipOval(
                            child: Image(
                              image: AssetImage('assets/images/app_image.png'),
                              width: 64,
                              height: 64,
                              fit: BoxFit.cover,
                            ),
                          ),
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
                const SizedBox(height: 32),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              _soundMuted ? Icons.volume_off : Icons.volume_up,
                              color: const Color(0xFF2B6CB0),
                            ),
                            const SizedBox(width: 12),
                            const Text('Training sounds'),
                          ],
                        ),
                        Switch.adaptive(
                          value: !_soundMuted,
                          onChanged: (enabled) {
                            setState(() => _soundMuted = !enabled);
                            _soundService.setMuted(!enabled);
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.tonalIcon(
                  onPressed: () => _handleSignOut(context),
                  icon: const Icon(Icons.logout),
                  label: const Text('Sign Out'),
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
