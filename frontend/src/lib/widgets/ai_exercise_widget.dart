import 'package:flutter/material.dart';

/// Widget for displaying an AI-generated exercise during training
class AIExerciseWidget extends StatelessWidget {
  final Map<String, dynamic> exercise;
  final void Function(int) onAnswerSelected;
  final bool showFeedback;
  final int? selectedIndex;
  final bool? isCorrect;

  const AIExerciseWidget({
    super.key,
    required this.exercise,
    required this.onAnswerSelected,
    this.showFeedback = false,
    this.selectedIndex,
    this.isCorrect,
  });

  String _formatExerciseType(String type) {
    return type
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isNotEmpty
            ? '${word[0].toUpperCase()}${word.substring(1)}'
            : '')
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final exerciseType = exercise['exerciseType'] as String? ?? '';
    final prompt = exercise['prompt'] as String? ?? '';
    final options = (exercise['options'] as List<dynamic>?) ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Exercise type label
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFF6B46C1).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            _formatExerciseType(exerciseType),
            style: const TextStyle(
              color: Color(0xFF6B46C1),
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: 16),

        // Prompt
        Text(
          prompt,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w500,
              ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),

        // Options
        ...List.generate(options.length, (index) {
          final optionText = options[index] as String? ?? '';
          final isSelected = selectedIndex == index;

          Color? backgroundColor;
          Color? textColor;
          if (showFeedback && isSelected) {
            if (isCorrect == true) {
              backgroundColor = Colors.green.withValues(alpha: 0.2);
              textColor = Colors.green.shade800;
            } else {
              backgroundColor = Colors.red.withValues(alpha: 0.2);
              textColor = Colors.red.shade800;
            }
          }

          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: ElevatedButton(
              onPressed: showFeedback ? null : () => onAnswerSelected(index),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
                backgroundColor: backgroundColor,
                foregroundColor: textColor,
              ),
              child: Text(optionText),
            ),
          );
        }),
      ],
    );
  }
}
