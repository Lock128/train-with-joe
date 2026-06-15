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
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Exercise type label
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF6B46C1).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _formatExerciseType(exerciseType),
              style: const TextStyle(
                color: Color(0xFF6B46C1),
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),

        // Prompt
        Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          decoration: BoxDecoration(
            color: colorScheme.primaryContainer.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Text(
            prompt,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: 24),

        // Options
        ...List.generate(options.length, (index) {
          final optionText = options[index] as String? ?? '';
          final isSelected = selectedIndex == index;

          Color? backgroundColor;
          Color? borderColor;
          Color? textColor;
          if (showFeedback && isSelected) {
            if (isCorrect == true) {
              backgroundColor = const Color(0xFFECFDF5);
              borderColor = const Color(0xFF10B981);
              textColor = const Color(0xFF065F46);
            } else {
              backgroundColor = const Color(0xFFFEF2F2);
              borderColor = const Color(0xFFEF4444);
              textColor = const Color(0xFF991B1B);
            }
          }

          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Material(
              color: backgroundColor ?? colorScheme.surfaceContainerLowest,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                onTap: showFeedback ? null : () => onAnswerSelected(index),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: borderColor ?? colorScheme.outline.withValues(alpha: 0.2),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Text(
                    optionText,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: textColor ?? colorScheme.onSurface,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}
