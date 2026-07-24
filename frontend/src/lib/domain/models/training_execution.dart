/// Domain model representing a full training execution (in-progress or completed).
class TrainingExecution {
  final String id;
  final String trainingId;
  final String userId;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final int correctCount;
  final int incorrectCount;
  final List<AnswerResult> results;
  final List<MultipleChoiceOption> multipleChoiceOptions;
  final List<PromptWord> promptWords;
  final List<AiExercise> aiExercises;
  final List<VerbConjugationExercise> verbConjugationExercises;

  const TrainingExecution({
    required this.id,
    required this.trainingId,
    required this.userId,
    this.startedAt,
    this.completedAt,
    this.correctCount = 0,
    this.incorrectCount = 0,
    this.results = const [],
    this.multipleChoiceOptions = const [],
    this.promptWords = const [],
    this.aiExercises = const [],
    this.verbConjugationExercises = const [],
  });

  factory TrainingExecution.fromJson(Map<String, dynamic> json) {
    final resultsList = json['results'] as List<dynamic>?;
    final mcOptions = json['multipleChoiceOptions'] as List<dynamic>?;
    final promptWordsList = json['promptWords'] as List<dynamic>?;
    final aiExList = json['aiExercises'] as List<dynamic>?;
    final verbExList = json['verbConjugationExercises'] as List<dynamic>?;

    return TrainingExecution(
      id: json['id'] as String,
      trainingId: json['trainingId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      startedAt: _parseDateTime(json['startedAt']),
      completedAt: _parseDateTime(json['completedAt']),
      correctCount: json['correctCount'] as int? ?? 0,
      incorrectCount: json['incorrectCount'] as int? ?? 0,
      results: resultsList?.map((r) => AnswerResult.fromJson(r as Map<String, dynamic>)).toList() ?? [],
      multipleChoiceOptions: mcOptions?.map((m) => MultipleChoiceOption.fromJson(m as Map<String, dynamic>)).toList() ?? [],
      promptWords: promptWordsList?.map((p) => PromptWord.fromJson(p as Map<String, dynamic>)).toList() ?? [],
      aiExercises: aiExList?.map((a) => AiExercise.fromJson(a as Map<String, dynamic>)).toList() ?? [],
      verbConjugationExercises: verbExList?.map((v) => VerbConjugationExercise.fromJson(v as Map<String, dynamic>)).toList() ?? [],
    );
  }

  bool get isCompleted => completedAt != null;
  int get totalCount => correctCount + incorrectCount;
  double get accuracy => totalCount > 0 ? correctCount / totalCount : 0;

  TrainingExecution copyWith({
    String? id,
    String? trainingId,
    String? userId,
    DateTime? startedAt,
    DateTime? completedAt,
    int? correctCount,
    int? incorrectCount,
    List<AnswerResult>? results,
    List<MultipleChoiceOption>? multipleChoiceOptions,
    List<PromptWord>? promptWords,
    List<AiExercise>? aiExercises,
    List<VerbConjugationExercise>? verbConjugationExercises,
  }) {
    return TrainingExecution(
      id: id ?? this.id,
      trainingId: trainingId ?? this.trainingId,
      userId: userId ?? this.userId,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      correctCount: correctCount ?? this.correctCount,
      incorrectCount: incorrectCount ?? this.incorrectCount,
      results: results ?? this.results,
      multipleChoiceOptions: multipleChoiceOptions ?? this.multipleChoiceOptions,
      promptWords: promptWords ?? this.promptWords,
      aiExercises: aiExercises ?? this.aiExercises,
      verbConjugationExercises: verbConjugationExercises ?? this.verbConjugationExercises,
    );
  }

  @override
  String toString() => 'TrainingExecution(id: $id, correct: $correctCount, incorrect: $incorrectCount)';
}

/// Result of a single answer in a training execution.
class AnswerResult {
  final int wordIndex;
  final String word;
  final String expectedAnswer;
  final String userAnswer;
  final bool correct;

  const AnswerResult({
    required this.wordIndex,
    required this.word,
    required this.expectedAnswer,
    required this.userAnswer,
    required this.correct,
  });

  factory AnswerResult.fromJson(Map<String, dynamic> json) {
    return AnswerResult(
      wordIndex: json['wordIndex'] as int? ?? 0,
      word: json['word'] as String? ?? '',
      expectedAnswer: json['expectedAnswer'] as String? ?? '',
      userAnswer: json['userAnswer'] as String? ?? '',
      correct: json['correct'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'wordIndex': wordIndex,
        'word': word,
        'expectedAnswer': expectedAnswer,
        'userAnswer': userAnswer,
        'correct': correct,
      };
}

/// Multiple choice options for a specific word index.
class MultipleChoiceOption {
  final int wordIndex;
  final List<String> options;

  const MultipleChoiceOption({
    required this.wordIndex,
    this.options = const [],
  });

  factory MultipleChoiceOption.fromJson(Map<String, dynamic> json) {
    final opts = json['options'] as List<dynamic>?;
    return MultipleChoiceOption(
      wordIndex: json['wordIndex'] as int? ?? 0,
      options: opts?.map((o) => o as String).toList() ?? [],
    );
  }
}

/// A prompt word shown during training.
class PromptWord {
  final String word;
  final String? vocabularyListId;
  final String? unit;

  const PromptWord({
    required this.word,
    this.vocabularyListId,
    this.unit,
  });

  factory PromptWord.fromJson(Map<String, dynamic> json) {
    return PromptWord(
      word: json['word'] as String? ?? '',
      vocabularyListId: json['vocabularyListId'] as String?,
      unit: json['unit'] as String?,
    );
  }
}

/// AI-generated exercise.
class AiExercise {
  final String prompt;
  final List<String> options;
  final String? exerciseType;
  final String? sourceWord;

  const AiExercise({
    required this.prompt,
    this.options = const [],
    this.exerciseType,
    this.sourceWord,
  });

  factory AiExercise.fromJson(Map<String, dynamic> json) {
    final opts = json['options'] as List<dynamic>?;
    return AiExercise(
      prompt: json['prompt'] as String? ?? '',
      options: opts?.map((o) => o as String).toList() ?? [],
      exerciseType: json['exerciseType'] as String?,
      sourceWord: json['sourceWord'] as String?,
    );
  }
}

/// Verb conjugation exercise.
class VerbConjugationExercise {
  final String infinitive;
  final String prompt;
  final String? exerciseType;
  final String? hint;

  const VerbConjugationExercise({
    required this.infinitive,
    required this.prompt,
    this.exerciseType,
    this.hint,
  });

  factory VerbConjugationExercise.fromJson(Map<String, dynamic> json) {
    return VerbConjugationExercise(
      infinitive: json['infinitive'] as String? ?? '',
      prompt: json['prompt'] as String? ?? '',
      exerciseType: json['exerciseType'] as String?,
      hint: json['hint'] as String?,
    );
  }
}

DateTime? _parseDateTime(dynamic value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  return null;
}
