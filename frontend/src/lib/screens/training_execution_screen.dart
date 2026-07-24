import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../domain/models/training_execution.dart';
import '../l10n/generated/app_localizations.dart';
import '../providers/training_provider.dart';
import '../providers/vocabulary_provider.dart';
import '../services/feedback_sound_service.dart';
import '../widgets/answer_feedback_animation.dart';
import '../widgets/ai_exercise_widget.dart';
import '../widgets/verb_conjugation_exercise_widget.dart';

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
  TrainingExecution? _execution;
  List<PromptWord> _words = [];
  bool _showFeedback = false;
  AnswerResult? _lastResult;
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
        // Use promptWords from execution (direction-resolved, no answers).
        // Falls back to training words for non-randomized trainings.
        if (_words.isEmpty) {
          final promptWords = execution.promptWords;
          if (promptWords.isNotEmpty) {
            _words = promptWords;
          } else {
            final training = provider.currentTraining;
            _words = training?.words
                    .map((w) => PromptWord(word: w.word, vocabularyListId: w.vocabularyListId, unit: w.unit))
                    .toList() ??
                [];
          }
        }
      });
    }
  }

  String get _currentMode {
    final training = context.read<TrainingProvider>().currentTraining;
    return training?.mode.value ?? 'TEXT_INPUT';
  }

  MultipleChoiceOption? _getMultipleChoiceOptions(int wordIndex) {
    final options = _execution?.multipleChoiceOptions ?? [];
    for (final opt in options) {
      if (opt.wordIndex == wordIndex) return opt;
    }
    return null;
  }

  List<AiExercise> get _aiExercises {
    return _execution?.aiExercises ?? [];
  }

  List<VerbConjugationExercise> get _verbConjugationExercises {
    return _execution?.verbConjugationExercises ?? [];
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

    final answerResult = result.result;
    final completed = result.completed;
    final updatedExecution = result.execution;

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
    if (_currentWordIndex >= _words.length) return;

    final currentWord = _words[_currentWordIndex];
    final wordText = currentWord.word;
    final vocabListId = currentWord.vocabularyListId ?? '';

    if (vocabListId.isEmpty || wordText.isEmpty) return;

    final ok = await context.read<VocabularyProvider>().flagWord(vocabListId, wordText);
    if (ok && mounted) {
      setState(() => _flaggedIndices.add(_currentWordIndex));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.wordFlaggedForReview),
            duration: const Duration(seconds: 1),
          ),
        );
      }
    }
  }

  Future<void> _confirmAbort() async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.abortTraining),
        content: Text(l10n.abortTrainingMessage),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(l10n.continueText)),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(l10n.abort),
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
    final l10n = AppLocalizations.of(context)!;
    final words = _words;

    final isAIMode = _currentMode == 'AI_TRAINING';
    final isVerbConjugationMode = _currentMode == 'VERB_CONJUGATION';
    final totalWords = isAIMode
        ? _aiExercises.length
        : isVerbConjugationMode
            ? _verbConjugationExercises.length
            : words.length;

    if (_execution == null || totalWords == 0) {
      return Scaffold(
        appBar: AppBar(
          title: Text(l10n.training),
          actions: [_buildFlagButton(), _buildSoundToggle()],
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final progress = totalWords > 0 ? (_currentWordIndex + 1) / totalWords : 0.0;
    final currentWord = (isAIMode || isVerbConjugationMode || words.isEmpty)
        ? null
        : words[_currentWordIndex];
    // promptWords already have direction-resolved 'word'
    final wordText = currentWord?.word ?? '';
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.training),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          tooltip: l10n.abortTraining,
          onPressed: _confirmAbort,
        ),
        actions: [_buildFlagButton(), _buildSoundToggle()],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Progress
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                '${_currentWordIndex + 1} / $totalWords',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 32),

              // Current word (hidden for AI mode and verb conjugation - the exercise widget shows the prompt)
              if (!isAIMode && !isVerbConjugationMode) ...[
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    wordText,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
                const SizedBox(height: 32),
              ],

              // Input area
              if (_currentMode == 'AI_TRAINING')
                _buildAIExercise()
              else if (_currentMode == 'VERB_CONJUGATION')
                _buildVerbConjugationExercise()
              else if (_showFeedback)
                _buildFeedback()
              else if (_currentMode == 'MULTIPLE_CHOICE')
                _buildMultipleChoice()
              else
                _buildTextInput(),

              // Show feedback animation for AI mode and verb conjugation too
              if (_showFeedback && (isAIMode || isVerbConjugationMode))
                _buildFeedback(),
            ],
          ),
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
    final l10n = AppLocalizations.of(context)!;
    final training = context.read<TrainingProvider>().currentTraining;
    final direction = training?.direction.value ?? 'SOURCE_TO_TARGET';
    final hintText = direction == 'TARGET_TO_SOURCE'
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
          child: Text(l10n.submit),
        ),
      ],
    );
  }

  Widget _buildMultipleChoice() {
    final mcOptions = _getMultipleChoiceOptions(_currentWordIndex);
    final options = mcOptions?.options ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: options.map((text) {
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

    final exercise = exercises[_currentWordIndex];

    return AIExerciseWidget(
      exercise: {
        'prompt': exercise.prompt,
        'options': exercise.options,
        'exerciseType': exercise.exerciseType,
        'sourceWord': exercise.sourceWord,
      },
      onAnswerSelected: _submitAIAnswer,
      showFeedback: _showFeedback,
      selectedIndex: _selectedAIOptionIndex,
      isCorrect: _lastResult?.correct,
    );
  }

  Widget _buildVerbConjugationExercise() {
    final exercises = _verbConjugationExercises;
    if (_currentWordIndex >= exercises.length) return const SizedBox.shrink();

    final exercise = exercises[_currentWordIndex];

    return VerbConjugationExerciseWidget(
      key: ValueKey('verb_exercise_$_currentWordIndex'),
      exercise: {
        'infinitive': exercise.infinitive,
        'prompt': exercise.prompt,
        'exerciseType': exercise.exerciseType,
        'hint': exercise.hint,
      },
      onAnswerSubmitted: _submitAnswer,
      showFeedback: _showFeedback,
      isCorrect: _lastResult?.correct,
      expectedAnswer: _lastResult?.expectedAnswer,
    );
  }

  Widget _buildFeedback() {
    final isCorrect = _lastResult?.correct ?? false;
    final expected = _lastResult?.expectedAnswer;

    return AnswerFeedbackAnimation(
      key: ValueKey('feedback_${_currentWordIndex}_$isCorrect'),
      isCorrect: isCorrect,
      expectedAnswer: isCorrect ? null : expected,
    );
  }
}
