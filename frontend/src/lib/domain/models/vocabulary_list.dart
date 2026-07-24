/// Domain model representing a vocabulary list.
class VocabularyList {
  final String id;
  final String userId;
  final String title;
  final String? sourceLanguage;
  final String? targetLanguage;
  final VocabularyListStatus status;
  final String? errorMessage;
  final bool isPublic;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<VocabularyWord> words;

  const VocabularyList({
    required this.id,
    required this.userId,
    required this.title,
    this.sourceLanguage,
    this.targetLanguage,
    this.status = VocabularyListStatus.ready,
    this.errorMessage,
    this.isPublic = false,
    this.createdAt,
    this.updatedAt,
    this.words = const [],
  });

  factory VocabularyList.fromJson(Map<String, dynamic> json) {
    final wordsList = json['words'] as List<dynamic>?;
    return VocabularyList(
      id: json['id'] as String,
      userId: json['userId'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled',
      sourceLanguage: json['sourceLanguage'] as String?,
      targetLanguage: json['targetLanguage'] as String?,
      status: VocabularyListStatus.fromString(json['status'] as String?),
      errorMessage: json['errorMessage'] as String?,
      isPublic: json['isPublic'] as bool? ?? false,
      createdAt: _parseDateTime(json['createdAt']),
      updatedAt: _parseDateTime(json['updatedAt']),
      words: wordsList?.map((w) => VocabularyWord.fromJson(w as Map<String, dynamic>)).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'title': title,
        if (sourceLanguage != null) 'sourceLanguage': sourceLanguage,
        if (targetLanguage != null) 'targetLanguage': targetLanguage,
        'status': status.value,
        if (errorMessage != null) 'errorMessage': errorMessage,
        'isPublic': isPublic,
        if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
        if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
        'words': words.map((w) => w.toJson()).toList(),
      };

  VocabularyList copyWith({
    String? id,
    String? userId,
    String? title,
    String? sourceLanguage,
    String? targetLanguage,
    VocabularyListStatus? status,
    String? errorMessage,
    bool? isPublic,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<VocabularyWord>? words,
  }) {
    return VocabularyList(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      sourceLanguage: sourceLanguage ?? this.sourceLanguage,
      targetLanguage: targetLanguage ?? this.targetLanguage,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
      isPublic: isPublic ?? this.isPublic,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      words: words ?? this.words,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is VocabularyList && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'VocabularyList(id: $id, title: $title, words: ${words.length})';
}

/// A single word entry in a vocabulary list.
class VocabularyWord {
  final String word;
  final String? translation;
  final String? definition;
  final String? partOfSpeech;
  final String? exampleSentence;
  final String? difficulty;
  final String? unit;
  final bool flagged;

  const VocabularyWord({
    required this.word,
    this.translation,
    this.definition,
    this.partOfSpeech,
    this.exampleSentence,
    this.difficulty,
    this.unit,
    this.flagged = false,
  });

  factory VocabularyWord.fromJson(Map<String, dynamic> json) {
    return VocabularyWord(
      word: json['word'] as String? ?? '',
      translation: json['translation'] as String?,
      definition: json['definition'] as String?,
      partOfSpeech: json['partOfSpeech'] as String?,
      exampleSentence: json['exampleSentence'] as String?,
      difficulty: json['difficulty'] as String?,
      unit: json['unit'] as String?,
      flagged: json['flagged'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'word': word,
        if (translation != null) 'translation': translation,
        if (definition != null) 'definition': definition,
        if (partOfSpeech != null) 'partOfSpeech': partOfSpeech,
        if (exampleSentence != null) 'exampleSentence': exampleSentence,
        if (difficulty != null) 'difficulty': difficulty,
        if (unit != null) 'unit': unit,
        'flagged': flagged,
      };

  VocabularyWord copyWith({
    String? word,
    String? translation,
    String? definition,
    String? partOfSpeech,
    String? exampleSentence,
    String? difficulty,
    String? unit,
    bool? flagged,
  }) {
    return VocabularyWord(
      word: word ?? this.word,
      translation: translation ?? this.translation,
      definition: definition ?? this.definition,
      partOfSpeech: partOfSpeech ?? this.partOfSpeech,
      exampleSentence: exampleSentence ?? this.exampleSentence,
      difficulty: difficulty ?? this.difficulty,
      unit: unit ?? this.unit,
      flagged: flagged ?? this.flagged,
    );
  }

  @override
  String toString() => 'VocabularyWord(word: $word, translation: $translation)';
}

/// Status of vocabulary list processing.
enum VocabularyListStatus {
  processing('PROCESSING'),
  ready('READY'),
  failed('FAILED');

  final String value;
  const VocabularyListStatus(this.value);

  static VocabularyListStatus fromString(String? value) {
    switch (value?.toUpperCase()) {
      case 'PROCESSING':
        return VocabularyListStatus.processing;
      case 'FAILED':
        return VocabularyListStatus.failed;
      case 'READY':
      default:
        return VocabularyListStatus.ready;
    }
  }
}

DateTime? _parseDateTime(dynamic value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  return null;
}
