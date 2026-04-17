import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../l10n/generated/app_localizations.dart';
import '../providers/auth_provider.dart';

/// Two-step screen: request a reset code, then enter code + new password.
class ResetPasswordScreen extends StatefulWidget {
  final String initialEmail;

  const ResetPasswordScreen({super.key, this.initialEmail = ''});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _emailFormKey = GlobalKey<FormState>();
  final _resetFormKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _codeSent = false;
  bool _resendSuccess = false;

  @override
  void initState() {
    super.initState();
    _emailController.text = widget.initialEmail;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSendCode() async {
    if (!_emailFormKey.currentState!.validate()) return;
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.resetPassword(_emailController.text.trim());
    if (success && mounted) {
      setState(() => _codeSent = true);
    }
  }

  Future<void> _handleResendCode() async {
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.resetPassword(_emailController.text.trim());
    if (success && mounted) {
      setState(() => _resendSuccess = true);
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _resendSuccess = false);
      });
    }
  }

  Future<void> _handleConfirmReset() async {
    if (!_resetFormKey.currentState!.validate()) return;
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.confirmResetPassword(
      _emailController.text.trim(),
      _codeController.text.trim(),
      _passwordController.text,
    );
    if (success && mounted) {
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Consumer<AuthProvider>(
              builder: (context, authProvider, _) {
                return _codeSent
                    ? _buildConfirmForm(theme, l10n, authProvider)
                    : _buildEmailForm(theme, l10n, authProvider);
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmailForm(ThemeData theme, AppLocalizations l10n, AuthProvider authProvider) {
    return Form(
      key: _emailFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.lock_reset, size: 80, color: theme.colorScheme.primary),
          const SizedBox(height: 32),
          Text(l10n.resetPassword,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(l10n.resetPasswordDescription,
              style: TextStyle(fontSize: 16, color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
              textAlign: TextAlign.center),
          const SizedBox(height: 32),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.email_outlined),
              border: OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return 'Please enter your email';
              if (!value.contains('@')) return 'Please enter a valid email';
              return null;
            },
            enabled: !authProvider.isLoading,
          ),
          const SizedBox(height: 24),
          if (authProvider.error != null) ...[
            _errorBanner(authProvider.error!),
            const SizedBox(height: 16),
          ],
          ElevatedButton(
            onPressed: authProvider.isLoading ? null : _handleSendCode,
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            child: authProvider.isLoading
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(l10n.sendResetCode, style: const TextStyle(fontSize: 16)),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: authProvider.isLoading ? null : () => context.go('/signin'),
            child: Text(l10n.backToSignIn),
          ),
        ],
      ),
    );
  }

  Widget _buildConfirmForm(ThemeData theme, AppLocalizations l10n, AuthProvider authProvider) {
    return Form(
      key: _resetFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.lock_reset, size: 80, color: theme.colorScheme.primary),
          const SizedBox(height: 32),
          Text(l10n.enterResetCode,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(l10n.enterResetCodeDescription,
              style: TextStyle(fontSize: 16, color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
              textAlign: TextAlign.center),
          const SizedBox(height: 32),
          TextFormField(
            controller: _codeController,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 24, letterSpacing: 8),
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(6),
            ],
            decoration: InputDecoration(
              labelText: l10n.verificationCode,
              hintText: '000000',
              border: const OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return l10n.enterVerificationCode;
              if (value.length < 6) return l10n.codeMustBeSixDigits;
              return null;
            },
            enabled: !authProvider.isLoading,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            decoration: InputDecoration(
              labelText: l10n.newPassword,
              prefixIcon: const Icon(Icons.lock_outlined),
              suffixIcon: IconButton(
                icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
              border: const OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return l10n.enterNewPassword;
              if (value.length < 8) return l10n.passwordMinLength;
              return null;
            },
            enabled: !authProvider.isLoading,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _confirmPasswordController,
            obscureText: _obscureConfirm,
            decoration: InputDecoration(
              labelText: l10n.confirmNewPassword,
              prefixIcon: const Icon(Icons.lock_outlined),
              suffixIcon: IconButton(
                icon: Icon(_obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
              ),
              border: const OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return l10n.confirmNewPassword;
              if (value != _passwordController.text) return l10n.passwordsDoNotMatch;
              return null;
            },
            enabled: !authProvider.isLoading,
          ),
          const SizedBox(height: 24),
          if (authProvider.error != null) ...[
            _errorBanner(authProvider.error!),
            const SizedBox(height: 16),
          ],
          if (_resendSuccess) ...[
            _successBanner(l10n.codeSentAgain),
            const SizedBox(height: 16),
          ],
          ElevatedButton(
            onPressed: authProvider.isLoading ? null : _handleConfirmReset,
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            child: authProvider.isLoading
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(l10n.resetPasswordButton, style: const TextStyle(fontSize: 16)),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: authProvider.isLoading ? null : _handleResendCode,
            child: Text(l10n.resendCode),
          ),
          TextButton(
            onPressed: authProvider.isLoading ? null : () => context.go('/signin'),
            child: Text(l10n.backToSignIn),
          ),
        ],
      ),
    );
  }

  Widget _errorBanner(String message) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: Colors.red.shade700),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: TextStyle(color: Colors.red.shade700))),
        ],
      ),
    );
  }

  Widget _successBanner(String message) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.green.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.check_circle_outline, color: Colors.green.shade700),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: TextStyle(color: Colors.green.shade700))),
        ],
      ),
    );
  }
}
