import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/training_provider.dart';
import '../providers/vocabulary_provider.dart';
import '../services/feedback_sound_service.dart';
import '../widgets/answer_feedback_animation.dart';
import '../widgets/ai_exercise_widget.dart';

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
  List<dynamic> _words = [];
  bool _showFeedback = false;
  Map<String, dynamic>? _lastResult;
  bool _soundMuted = FeedbackSoundService().isMuted;
  final TextEditingController _answerController = TextEditingController();
  final Set<int> _flaggedIndices = {};
  int? _selectedAIOptionIndex;

  @override
  void initState() {
    super.initState();
    _answerController.addListener(_onAnswerTextChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadExecution();
    });
  }

  void _onAnswerTextChanged() {
    setState(() {});
  }

  @override
  void dispose() {
    _answerController.removeListener(_onAnswerTextChanged);
    _answerController.dispose();
    super.dispose();
  }

  void _loadExecution() {
    final provider = context.read<TrainingProvider>();
    final execution = provider.currentExecution;
    if (execution != null && mounted) {
      setState(() {
        _execution = execution;
        // Capture words once from the execution (randomized) or the training.
        if (_words.isEmpty) {
          final execWords = (execution['words'] as List<dynamic>?) ?? [];
          if (execWords.isNotEmpty) {
            _words = execWords;
          } else {
            final training = provider.currentTraining;
            _words = (training?['words'] as List<dynamic>?) ?? [];
          }
        }
      });
    }
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

  List<dynamic> get _aiExercises {
    return (_execution?['aiExercises'] as List<dynamic>?) ?? [];
  }

  Future<void> _submitAIAnswer(int optionIndex) async {
    if (_showFeedback) return;
    setState(() => _selectedAIOptionIndex = optionIndex);
    await _submitAnswer(optionIndex.toString());
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
          _selectedAIOptionIndex = null;
        });
      }
    });
  }

  Future<void> _flagCurrentWord() async {
    if (_flaggedIndices.contains(_currentWordIndex)) return;

    final currentWord = _words[_currentWordIndex] as Map<String, dynamic>;
    final wordText = currentWord['word'] as String? ?? '';
    final vocabListId = currentWord['vocabularyListId'] as String? ?? '';

    if (vocabListId.isEmpty || wordText.isEmpty) return;

    final ok = await context.read<VocabularyProvider>().flagWord(vocabListId, wordText);
    if (ok && mounted) {
      setState(() => _flaggedIndices.add(_currentWordIndex));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Word flagged for review'),
            duration: Duration(seconds: 1),
          ),
        );
      }
    }
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

    final isAIMode = _currentMode == 'AI_TRAINING';
    final totalWords = isAIMode ? _aiExercises.length : words.length;

    if (_execution == null || totalWords == 0) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Training'),
          actions: [_buildFlagButton(), _buildSoundToggle()],
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final progress = totalWords > 0 ? (_currentWordIndex + 1) / totalWords : 0.0;
    final currentWord = isAIMode ? null : (words[_currentWordIndex] as Map<String, dynamic>);
    final training = context.read<TrainingProvider>().currentTraining;
    final direction = training?['direction'] as String? ?? 'WORD_TO_TRANSLATION';
    final reversed = direction == 'TRANSLATION_TO_WORD';
    final wordText = reversed
        ? (currentWord['translation'] as String? ?? '')
        : (currentWord['word'] as String? ?? '');
    return Scaffold(
      appBar: AppBar(
        title: const Text('Training'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          tooltip: 'Abort training',
          onPressed: _confirmAbort,
        ),
        actions: [_buildFlagButton(), _buildSoundToggle()],
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

            // Current word (hidden for AI mode - the exercise widget shows the prompt)
            if (!isAIMode) ...[
              Text(
                wordText,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 32),
            ],

            // Input area
            if (_showFeedback && !isAIMode)
              _buildFeedback()
            else if (_currentMode == 'AI_TRAINING')
              _buildAIExercise()
            else if (_currentMode == 'MULTIPLE_CHOICE')
              _buildMultipleChoice()
            else
              _buildTextInput(),
          ],
        ),
      ),
    );
  }

  Widget _buildFlagButton() {
    final isFlagged = _flaggedIndices.contains(_currentWordIndex);
    return IconButton(
      icon: Icon(
        isFlagged ? Icons.flag : Icons.flag_outlined,
        color: isFlagged ? Colors.orange : null,
      ),
      tooltip: isFlagged ? 'Word flagged' : 'Flag wrong translation',
      onPressed: isFlagged ? null : _flagCurrentWord,
    );
  }

  Widget _buildSoundToggle() {
    return IconButton(
      icon: Icon(_soundMuted ? Icons.volume_off : Icons.volume_up),
      tooltip: _soundMuted ? 'Unmute sounds' : 'Mute sounds',
      onPressed: () {
        final newMuted = !_soundMuted;
        setState(() => _soundMuted = newMuted);
        FeedbackSoundService().setMuted(newMuted);
      },
    );
  }

  Widget _buildTextInput() {
    final training = context.read<TrainingProvider>().currentTraining;
    final direction = training?['direction'] as String? ?? 'WORD_TO_TRANSLATION';
    final hintText = direction == 'TRANSLATION_TO_WORD'
        ? 'Type the original word'
        : 'Type the translation';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _answerController,
          decoration: InputDecoration(
            labelText: 'Your answer',
            border: const OutlineInputBorder(),
            hintText: hintText,
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

  Widget _buildAIExercise() {
    final exercises = _aiExercises;
    if (_currentWordIndex >= exercises.length) return const SizedBox.shrink();

    final exercise = exercises[_currentWordIndex] as Map<String, dynamic>;

    return AIExerciseWidget(
      exercise: exercise,
      onAnswerSelected: _submitAIAnswer,
      showFeedback: _showFeedback,
      selectedIndex: _selectedAIOptionIndex,
      isCorrect: _lastResult?['correct'] as bool?,
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
