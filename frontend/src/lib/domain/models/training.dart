/// Domain model representing a training configuration.
class Training {
  final String id;
  final String userId;
  final String? name;
  final TrainingMode mode;
  final TrainingDirection direction;
  final List<String> vocabularyListIds;
  final bool isRandomized;
  final int? randomizedWordCount;
  final int? multipleChoiceOptionCount;
  final String? sourceLanguage;
  final String? targetLanguage;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<TrainingWord> words;
  final List<TrainingExecutionSummary> executions;

  const Training({
    required this.id,
    required this.userId,
    this.name,
    this.mode = TrainingMode.written,
    this.direction = TrainingDirection.sourceToTarget,
    this.vocabularyListIds = const [],
    this.isRandomized = false,
    this.randomizedWordCount,
    this.multipleChoiceOptionCount,
    this.sourceLanguage,
    this.targetLanguage,
    this.createdAt,
    this.updatedAt,
    this.words = const [],
    this.executions = const [],
  });

  factory Training.fromJson(Map<String, dynamic> json) {
    final wordsList = json['words'] as List<dynamic>?;
    final execList = json['executions'] as List<dynamic>?;
    final vocabListIds = json['vocabularyListIds'] as List<dynamic>?;

    return Training(
      id: json['id'] as String,
      userId: json['userId'] as String? ?? '',
      name: json['name'] as String?,
      mode: TrainingMode.fromString(json['mode'] as String?),
      direction: TrainingDirection.fromString(json['direction'] as String?),
      vocabularyListIds: vocabListIds?.map((e) => e as String).toList() ?? [],
      isRandomized: json['isRandomized'] as bool? ?? false,
      randomizedWordCount: json['randomizedWordCount'] as int?,
      multipleChoiceOptionCount: json['multipleChoiceOptionCount'] as int?,
      sourceLanguage: json['sourceLanguage'] as String?,
      targetLanguage: json['targetLanguage'] as String?,
      createdAt: _parseDateTime(json['createdAt']),
      updatedAt: _parseDateTime(json['updatedAt']),
      words: wordsList?.map((w) => TrainingWord.fromJson(w as Map<String, dynamic>)).toList() ?? [],
      executions: execList?.map((e) => TrainingExecutionSummary.fromJson(e as Map<String, dynamic>)).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        if (name != null) 'name': name,
        'mode': mode.value,
        'direction': direction.value,
        'vocabularyListIds': vocabularyListIds,
        'isRandomized': isRandomized,
        if (randomizedWordCount != null) 'randomizedWordCount': randomizedWordCount,
        if (multipleChoiceOptionCount != null) 'multipleChoiceOptionCount': multipleChoiceOptionCount,
        if (sourceLanguage != null) 'sourceLanguage': sourceLanguage,
        if (targetLanguage != null) 'targetLanguage': targetLanguage,
        if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
        if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
        'words': words.map((w) => w.toJson()).toList(),
      };

  Training copyWith({
    String? id,
    String? userId,
    String? name,
    TrainingMode? mode,
    TrainingDirection? direction,
    List<String>? vocabularyListIds,
    bool? isRandomized,
    int? randomizedWordCount,
    int? multipleChoiceOptionCount,
    String? sourceLanguage,
    String? targetLanguage,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<TrainingWord>? words,
    List<TrainingExecutionSummary>? executions,
  }) {
    return Training(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      mode: mode ?? this.mode,
      direction: direction ?? this.direction,
      vocabularyListIds: vocabularyListIds ?? this.vocabularyListIds,
      isRandomized: isRandomized ?? this.isRandomized,
      randomizedWordCount: randomizedWordCount ?? this.randomizedWordCount,
      multipleChoiceOptionCount: multipleChoiceOptionCount ?? this.multipleChoiceOptionCount,
      sourceLanguage: sourceLanguage ?? this.sourceLanguage,
      targetLanguage: targetLanguage ?? this.targetLanguage,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      words: words ?? this.words,
      executions: executions ?? this.executions,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Training && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Training(id: $id, name: $name, mode: $mode)';
}

/// A word included in a training.
class TrainingWord {
  final String word;
  final String? translation;
  final String? vocabularyListId;
  final String? unit;

  const TrainingWord({
    required this.word,
    this.translation,
    this.vocabularyListId,
    this.unit,
  });

  factory TrainingWord.fromJson(Map<String, dynamic> json) {
    return TrainingWord(
      word: json['word'] as String? ?? '',
      translation: json['translation'] as String?,
      vocabularyListId: json['vocabularyListId'] as String?,
      unit: json['unit'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'word': word,
        if (translation != null) 'translation': translation,
        if (vocabularyListId != null) 'vocabularyListId': vocabularyListId,
        if (unit != null) 'unit': unit,
      };
}

/// Summary of a training execution (used in training list responses).
class TrainingExecutionSummary {
  final String id;
  final String? trainingId;
  final String? userId;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final int correctCount;
  final int incorrectCount;

  const TrainingExecutionSummary({
    required this.id,
    this.trainingId,
    this.userId,
    this.startedAt,
    this.completedAt,
    this.correctCount = 0,
    this.incorrectCount = 0,
  });

  factory TrainingExecutionSummary.fromJson(Map<String, dynamic> json) {
    return TrainingExecutionSummary(
      id: json['id'] as String,
      trainingId: json['trainingId'] as String?,
      userId: json['userId'] as String?,
      startedAt: _parseDateTime(json['startedAt']),
      completedAt: _parseDateTime(json['completedAt']),
      correctCount: json['correctCount'] as int? ?? 0,
      incorrectCount: json['incorrectCount'] as int? ?? 0,
    );
  }

  int get totalCount => correctCount + incorrectCount;
  double get accuracy => totalCount > 0 ? correctCount / totalCount : 0;
}

/// Training mode.
enum TrainingMode {
  written('WRITTEN'),
  multipleChoice('MULTIPLE_CHOICE'),
  ai('AI'),
  verbConjugation('VERB_CONJUGATION');

  final String value;
  const TrainingMode(this.value);

  static TrainingMode fromString(String? value) {
    switch (value?.toUpperCase()) {
      case 'MULTIPLE_CHOICE':
        return TrainingMode.multipleChoice;
      case 'AI':
        return TrainingMode.ai;
      case 'VERB_CONJUGATION':
        return TrainingMode.verbConjugation;
      case 'WRITTEN':
      default:
        return TrainingMode.written;
    }
  }
}

/// Training direction.
enum TrainingDirection {
  sourceToTarget('SOURCE_TO_TARGET'),
  targetToSource('TARGET_TO_SOURCE');

  final String value;
  const TrainingDirection(this.value);

  static TrainingDirection fromString(String? value) {
    switch (value?.toUpperCase()) {
      case 'TARGET_TO_SOURCE':
        return TrainingDirection.targetToSource;
      case 'SOURCE_TO_TARGET':
      default:
        return TrainingDirection.sourceToTarget;
    }
  }
}

DateTime? _parseDateTime(dynamic value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  return null;
}
