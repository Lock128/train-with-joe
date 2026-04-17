import 'dart:math';
import 'package:flutter/material.dart';
import '../l10n/generated/app_localizations.dart';

/// A parental gate dialog that presents an adult-level task.
///
/// Complies with App Store Guideline 1.3 (Kids Category). Apple defines a
/// parental gate as an "adult-level task that must be completed in order to
/// continue." The gate must prevent children from:
///   - Following links out of the app (websites, social networks, other apps)
///   - Engaging in commerce (In-App Purchases)
///   - Contacting the developer
///
/// Implementation: Two-digit multiplication problem (e.g. 14 × 7 = ?).
/// This is age-appropriate as an adult-level task — well beyond the ability
/// of children in the Kids category age bands (5 and under, 6–8, 9–11)
/// while trivial for adults.
///
/// Reference: https://developer.apple.com/app-store/parental-gates/
class ParentalGateDialog extends StatefulWidget {
  const ParentalGateDialog({super.key});

  @override
  State<ParentalGateDialog> createState() => _ParentalGateDialogState();
}

class _ParentalGateDialogState extends State<ParentalGateDialog> {
  late int _a;
  late int _b;
  late int _correctAnswer;
  final _controller = TextEditingController();
  String? _errorText;
  int _failedAttempts = 0;
  bool _lockedOut = false;

  @override
  void initState() {
    super.initState();
    _generateProblem();
  }

  void _generateProblem() {
    final random = Random();
    // Multiplication of a two-digit number by a single-digit number.
    // Examples: 14 × 7, 23 × 6 — easy for adults, hard for young children.
    _a = random.nextInt(15) + 11; // 11–25
    _b = random.nextInt(6) + 4; // 4–9
    _correctAnswer = _a * _b;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    if (_lockedOut) return;

    final input = int.tryParse(_controller.text.trim());
    if (input == _correctAnswer) {
      Navigator.of(context).pop(true);
    } else {
      _failedAttempts++;
      if (_failedAttempts >= 3) {
        // Brief cooldown after 3 wrong answers to discourage guessing
        setState(() {
          _lockedOut = true;
          _errorText = null;
        });
        Future.delayed(const Duration(seconds: 5), () {
          if (mounted) {
            setState(() {
              _lockedOut = false;
              _failedAttempts = 0;
              _controller.clear();
              _generateProblem();
            });
          }
        });
      } else {
        setState(() {
          _errorText = AppLocalizations.of(context)?.parentalGateWrongAnswer ??
              'That\'s not right. Try again.';
          _controller.clear();
          _generateProblem();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return AlertDialog(
      title: Row(
        children: [
          const Icon(Icons.lock_outline, size: 24),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              l10n?.parentalGateTitle ?? 'Grown-Ups Only',
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n?.parentalGateDescription ??
                'Ask a parent or guardian to solve this to continue:',
          ),
          const SizedBox(height: 20),
          Center(
            child: Text(
              '$_a × $_b = ?',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
            ),
          ),
          const SizedBox(height: 20),
          if (_lockedOut)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Text(
                  l10n?.parentalGateCooldown ?? 'Too many attempts. Please wait…',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          else
            TextField(
              controller: _controller,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: InputDecoration(
                labelText: l10n?.parentalGateAnswerLabel ?? 'Answer',
                errorText: _errorText,
                border: const OutlineInputBorder(),
              ),
              onSubmitted: (_) => _submit(),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(l10n?.cancel ?? 'Cancel'),
        ),
        if (!_lockedOut)
          FilledButton(
            onPressed: _submit,
            child: Text(l10n?.continueText ?? 'Continue'),
          ),
      ],
    );
  }
}

/// Shows a parental gate dialog. Returns `true` if the gate was passed.
///
/// Call this before any action that Guideline 1.3 requires gating:
///   - Opening external URLs (Privacy Policy, Terms, etc.)
///   - Initiating In-App Purchases
///   - Opening mailto: links (contacting the developer)
Future<bool> showParentalGate(BuildContext context) async {
  final result = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const ParentalGateDialog(),
  );
  return result == true;
}
