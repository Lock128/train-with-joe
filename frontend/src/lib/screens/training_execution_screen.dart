import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/training_provider.dart';
import '../widgets/answer_feedback_animation.dart';

/// Screen for executing a training session
class TrainingExecutionScreen extends StatefulWidget {
  final String trainingId;
  final String executionId;

  const TrainingExecutionScreen({
    super.key,
    required this.trainingId,
    required this.executionId,
  });

  @override
  State<TrainingExecutionScreen> createState() => _TrainingExecutionScreenState();
}

class _TrainingExecutionScreenState extends State<TrainingExecutionScreen> {
  int _currentWordIndex = 0;
  Map<String, dynamic>? _execution;
  bool _showFeedback = false;
  Map<String, dynamic>? _lastResult;
  final TextEditingController _answerController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadExecution();
    });
  }

  @override
  void dispose() {
    _answerController.dispose();
    super.dispose();
  }

  void _loadExecution() {
    final provider = context.read<TrainingProvider>();
    final execution = provider.currentExecution;
    if (execution != null && mounted) {
      setState(() => _execution = execution);
    }
  }

  List<dynamic> get _words {
    final training = context.read<TrainingProvider>().currentTraining;
    return (training?['words'] as List<dynamic>?) ?? [];
  }

  String get _currentMode {
    final training = context.read<TrainingProvider>().currentTraining;
    return training?['mode'] as String? ?? 'TEXT_INPUT';
  }

  Map<String, dynamic>? _getMultipleChoiceOptions(int wordIndex) {
    final options = (_execution?['multipleChoiceOptions'] as List<dynamic>?) ?? [];
    for (final opt in options) {
      final m = opt as Map<String, dynamic>;
      if (m['wordIndex'] == wordIndex) return m;
    }
    return null;
  }

  Future<void> _submitAnswer(String answer) async {
    if (_showFeedback) return;

    final result = await context.read<TrainingProvider>().submitAnswer(
      widget.executionId,
      _currentWordIndex,
      answer,
    );

    if (!mounted || result == null) return;

    final answerResult = result['result'] as Map<String, dynamic>?;
    final completed = result['completed'] as bool? ?? false;
    final updatedExecution = result['execution'] as Map<String, dynamic>?;

    setState(() {
      _lastResult = answerResult;
      _showFeedback = true;
      if (updatedExecution != null) _execution = updatedExecution;
    });

    _answerController.clear();

    Timer(const Duration(milliseconds: 2000), () {
      if (!mounted) return;

      if (completed) {
        context.go(
          '/trainings/${widget.trainingId}/results/${widget.executionId}',
        );
      } else {
        setState(() {
          _currentWordIndex++;
          _showFeedback = false;
          _lastResult = null;
        });
      }
    });
  }

  Future<void> _confirmAbort() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Abort Training?'),
        content: const Text('Your progress in this session will be lost.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Continue')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Abort'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      context.go('/trainings/${widget.trainingId}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final words = _words;

    if (_execution == null || words.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Training')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final totalWords = words.length;
    final progress = totalWords > 0 ? (_currentWordIndex + 1) / totalWords : 0.0;
    final currentWord = words[_currentWordIndex] as Map<String, dynamic>;
    final wordText = currentWord['word'] as String? ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Training'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          tooltip: 'Abort training',
          onPressed: _confirmAbort,
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Progress
            LinearProgressIndicator(value: progress),
            const SizedBox(height: 8),
            Text(
              'Word ${_currentWordIndex + 1} of $totalWords',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 32),

            // Current word
            Text(
              wordText,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 32),

            // Input area
            if (_showFeedback)
              _buildFeedback()
            else if (_currentMode == 'MULTIPLE_CHOICE')
              _buildMultipleChoice()
            else
              _buildTextInput(),
          ],
        ),
      ),
    );
  }

  Widget _buildTextInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _answerController,
          decoration: const InputDecoration(
            labelText: 'Your answer',
            border: OutlineInputBorder(),
            hintText: 'Type the translation',
          ),
          onSubmitted: (value) {
            if (value.trim().isNotEmpty) _submitAnswer(value.trim());
          },
          autofocus: true,
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _answerController.text.trim().isEmpty
              ? null
              : () => _submitAnswer(_answerController.text.trim()),
          style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
          child: const Text('Submit'),
        ),
      ],
    );
  }

  Widget _buildMultipleChoice() {
    final mcOptions = _getMultipleChoiceOptions(_currentWordIndex);
    final options = (mcOptions?['options'] as List<dynamic>?) ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: options.map((option) {
        final text = option as String? ?? '';
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: ElevatedButton(
            onPressed: () => _submitAnswer(text),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.all(16),
            ),
            child: Text(text),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildFeedback() {
    final isCorrect = _lastResult?['correct'] as bool? ?? false;
    final expected = _lastResult?['expectedAnswer'] as String?;

    return AnswerFeedbackAnimation(
      key: ValueKey('feedback_${_currentWordIndex}_$isCorrect'),
      isCorrect: isCorrect,
      expectedAnswer: isCorrect ? null : expected,
    );
  }
}
