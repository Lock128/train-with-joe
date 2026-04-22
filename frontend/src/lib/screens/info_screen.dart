import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:universal_io/io.dart';
import 'package:url_launcher/url_launcher.dart';
import '../l10n/generated/app_localizations.dart';
import '../models/app_version.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/parental_gate_dialog.dart';

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
  bool _isDeletingAccount = false;
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

  Future<void> _handleSignOut(BuildContext context) async {
    final authProvider = context.read<AuthProvider>();
    await authProvider.signOut();
    if (context.mounted) {
      context.go('/signin');
    }
  }

  Future<void> _handleDeleteAccount(BuildContext context) async {
    final l10n = AppLocalizations.of(context)!;
    final messenger = ScaffoldMessenger.of(context);

    // First confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.deleteAccount),
        content: Text(l10n.deleteAccountConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.cancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(l10n.delete),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;

    // Second confirmation — type "DELETE"
    final finalConfirmed = await showDialog<bool>(
      context: context,
      builder: (context) => _DeleteConfirmationDialog(),
    );

    if (finalConfirmed != true || !context.mounted) return;

    setState(() => _isDeletingAccount = true);

    try {
      const mutation = '''
        mutation DeleteUser {
          deleteUser {
            success
            error
          }
        }
      ''';

      final result = await _apiService.mutate(mutation);
      final response = result['deleteUser'] as Map<String, dynamic>?;

      if (response?['success'] == true) {
        // Sign out after successful deletion
        if (context.mounted) {
          final authProvider = context.read<AuthProvider>();
          await authProvider.signOut();
          if (context.mounted) {
            context.go('/signin');
          }
        }
      } else {
        final error = response?['error'] as String? ?? l10n.deleteAccountFailed;
        messenger.showSnackBar(
          SnackBar(content: Text(error), backgroundColor: Colors.red),
        );
      }
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(l10n.deleteAccountFailed),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isDeletingAccount = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.appInfo),
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
                                tooltip: l10n.retry,
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
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Legal & Contact', style: Theme.of(context).textTheme.titleMedium),
                        const Divider(),
                        _linkRow(Icons.privacy_tip_outlined, 'Privacy Policy', 'https://trainwithjoe.app/privacy'),
                        _linkRow(
                          Icons.description_outlined,
                          !kIsWeb && Platform.isIOS ? 'Terms of Use (EULA)' : 'Terms of Service',
                          !kIsWeb && Platform.isIOS
                              ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
                              : 'https://trainwithjoe.app/terms',
                        ),
                        _linkRow(Icons.account_balance_outlined, 'Impressum', '/impressum'),
                        _linkRow(Icons.mail_outline, 'Contact Us', 'mailto:hello@trainwithjoe.app'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                FilledButton.tonalIcon(
                  onPressed: () => _handleSignOut(context),
                  icon: const Icon(Icons.logout),
                  label: Text(l10n.signOut),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: _isDeletingAccount ? null : () => _handleDeleteAccount(context),
                  icon: _isDeletingAccount
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.delete_forever),
                  label: Text(l10n.deleteAccount),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    padding: const EdgeInsets.all(16),
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

  Widget _linkRow(IconData icon, String label, String url) {
    final isInternalRoute = url.startsWith('/');
    return InkWell(
      onTap: () async {
        if (isInternalRoute) {
          context.push(url);
        } else {
          // Parental gate before opening external links (Guideline 1.3)
          final passed = await showParentalGate(context);
          if (passed && mounted) {
            launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
          }
        }
      },
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10.0),
        child: Row(
          children: [
            Icon(icon, size: 20, color: Colors.grey),
            const SizedBox(width: 12),
            Expanded(child: Text(label)),
            Icon(isInternalRoute ? Icons.chevron_right : Icons.open_in_new, size: 16, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}

/// Dialog that requires typing "DELETE" to confirm account deletion.
class _DeleteConfirmationDialog extends StatefulWidget {
  @override
  State<_DeleteConfirmationDialog> createState() => _DeleteConfirmationDialogState();
}

class _DeleteConfirmationDialogState extends State<_DeleteConfirmationDialog> {
  final _controller = TextEditingController();
  bool _isValid = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      setState(() {
        _isValid = _controller.text.trim().toUpperCase() == 'DELETE';
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return AlertDialog(
      title: Text(l10n.deleteAccountFinalConfirm),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(l10n.deleteAccountTypeDelete),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            autofocus: true,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: 'DELETE',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(l10n.cancel),
        ),
        TextButton(
          onPressed: _isValid ? () => Navigator.of(context).pop(true) : null,
          style: TextButton.styleFrom(foregroundColor: Colors.red),
          child: Text(l10n.deleteAccount),
        ),
      ],
    );
  }
}
