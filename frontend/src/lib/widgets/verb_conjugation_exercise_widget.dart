import 'package:flutter/material.dart';

/// Widget for displaying a verb conjugation exercise during training.
/// Supports different exercise types:
/// - three_forms: User enters all three forms (base, past simple, past participle)
/// - past_simple: User enters only the past simple form
/// - past_participle: User enters only the past participle
/// - infinitive_from_past: User enters the base/infinitive form
class VerbConjugationExerciseWidget extends StatefulWidget {
  final Map<String, dynamic> exercise;
  final void Function(String answer) onAnswerSubmitted;
  final bool showFeedback;
  final bool? isCorrect;
  final String? expectedAnswer;

  const VerbConjugationExerciseWidget({
    super.key,
    required this.exercise,
    required this.onAnswerSubmitted,
    this.showFeedback = false,
    this.isCorrect,
    this.expectedAnswer,
  });

  @override
  State<VerbConjugationExerciseWidget> createState() =>
      _VerbConjugationExerciseWidgetState();
}

class _VerbConjugationExerciseWidgetState
    extends State<VerbConjugationExerciseWidget> {
  final TextEditingController _controller = TextEditingController();
  bool _showHint = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(VerbConjugationExerciseWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Reset when exercise changes
    if (oldWidget.exercise != widget.exercise) {
      _controller.clear();
      _showHint = false;
    }
  }

  String _formatExerciseType(String type) {
    switch (type) {
      case 'three_forms':
        return 'All Three Forms';
      case 'past_simple':
        return 'Past Simple';
      case 'past_participle':
        return 'Past Participle';
      case 'infinitive_from_past':
        return 'Base Form';
      default:
        return type
            .replaceAll('_', ' ')
            .split(' ')
            .map((word) => word.isNotEmpty
                ? '${word[0].toUpperCase()}${word.substring(1)}'
                : '')
            .join(' ');
    }
  }

  String _getPlaceholderText(String exerciseType) {
    switch (exerciseType) {
      case 'three_forms':
        return 'e.g. go, went, gone';
      case 'past_simple':
        return 'e.g. went';
      case 'past_participle':
        return 'e.g. gone';
      case 'infinitive_from_past':
        return 'e.g. go';
      default:
        return 'Type your answer';
    }
  }

  @override
  Widget build(BuildContext context) {
    final exerciseType = widget.exercise['exerciseType'] as String? ?? '';
    final prompt = widget.exercise['prompt'] as String? ?? '';
    final infinitive = widget.exercise['infinitive'] as String? ?? '';
    final hint = widget.exercise['hint'] as String?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Exercise type label
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFF2D9CDB).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            _formatExerciseType(exerciseType),
            style: const TextStyle(
              color: Color(0xFF2D9CDB),
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: 16),

        // Verb infinitive (prominent display)
        if (infinitive.isNotEmpty) ...[
          Text(
            infinitive,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF2D9CDB),
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
        ],

        // Prompt
        Text(
          prompt,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),

        // Hint toggle
        if (hint != null && hint.isNotEmpty && !widget.showFeedback) ...[
          TextButton.icon(
            onPressed: () => setState(() => _showHint = !_showHint),
            icon: Icon(
              _showHint ? Icons.lightbulb : Icons.lightbulb_outline,
              size: 18,
              color: Colors.amber,
            ),
            label: Text(
              _showHint ? hint : 'Show hint',
              style: TextStyle(
                color: _showHint ? Colors.amber.shade800 : Colors.grey,
                fontSize: 13,
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],

        // Format helper for three_forms
        if (exerciseType == 'three_forms' && !widget.showFeedback) ...[
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text(
              'Format: base form, past simple, past participle\n'
              'Example: put, put, put',
              style: TextStyle(
                color: Colors.grey,
                fontSize: 12,
                fontStyle: FontStyle.italic,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Text input
        if (!widget.showFeedback) ...[
          TextField(
            controller: _controller,
            decoration: InputDecoration(
              labelText: 'Your answer',
              border: const OutlineInputBorder(),
              hintText: _getPlaceholderText(exerciseType),
            ),
            onSubmitted: (value) {
              if (value.trim().isNotEmpty) {
                widget.onAnswerSubmitted(value.trim());
              }
            },
            autofocus: true,
            textInputAction: TextInputAction.done,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _controller.text.trim().isEmpty
                ? null
                : () => widget.onAnswerSubmitted(_controller.text.trim()),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.all(16),
              backgroundColor: const Color(0xFF2D9CDB),
              foregroundColor: Colors.white,
            ),
            child: const Text('Submit'),
          ),
        ],
      ],
    );
  }
}
