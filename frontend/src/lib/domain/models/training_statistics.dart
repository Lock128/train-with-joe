/// Training statistics overview.
class TrainingStatistics {
  final double overallAccuracy;
  final double averageTimeSeconds;
  final int totalExecutions;
  final List<WordStatistic> perWordStatistics;
  final List<WordStatistic> mostMissedWords;
  final List<AccuracyTrendPoint> accuracyTrend;

  const TrainingStatistics({
    this.overallAccuracy = 0,
    this.averageTimeSeconds = 0,
    this.totalExecutions = 0,
    this.perWordStatistics = const [],
    this.mostMissedWords = const [],
    this.accuracyTrend = const [],
  });

  factory TrainingStatistics.fromJson(Map<String, dynamic> json) {
    final perWord = json['perWordStatistics'] as List<dynamic>?;
    final missed = json['mostMissedWords'] as List<dynamic>?;
    final trend = json['accuracyTrend'] as List<dynamic>?;

    return TrainingStatistics(
      overallAccuracy: (json['overallAccuracy'] as num?)?.toDouble() ?? 0,
      averageTimeSeconds: (json['averageTimeSeconds'] as num?)?.toDouble() ?? 0,
      totalExecutions: json['totalExecutions'] as int? ?? 0,
      perWordStatistics: perWord?.map((w) => WordStatistic.fromJson(w as Map<String, dynamic>)).toList() ?? [],
      mostMissedWords: missed?.map((w) => WordStatistic.fromJson(w as Map<String, dynamic>)).toList() ?? [],
      accuracyTrend: trend?.map((t) => AccuracyTrendPoint.fromJson(t as Map<String, dynamic>)).toList() ?? [],
    );
  }
}

/// Statistics for a single word.
class WordStatistic {
  final String word;
  final String? translation;
  final int correctCount;
  final int totalCount;
  final double accuracyPercentage;

  const WordStatistic({
    required this.word,
    this.translation,
    this.correctCount = 0,
    this.totalCount = 0,
    this.accuracyPercentage = 0,
  });

  factory WordStatistic.fromJson(Map<String, dynamic> json) {
    return WordStatistic(
      word: json['word'] as String? ?? '',
      translation: json['translation'] as String?,
      correctCount: json['correctCount'] as int? ?? 0,
      totalCount: json['totalCount'] as int? ?? 0,
      accuracyPercentage: (json['accuracyPercentage'] as num?)?.toDouble() ?? 0,
    );
  }
}

/// A single point in the accuracy trend over time.
class AccuracyTrendPoint {
  final String executionId;
  final DateTime? startedAt;
  final double accuracy;

  const AccuracyTrendPoint({
    required this.executionId,
    this.startedAt,
    this.accuracy = 0,
  });

  factory AccuracyTrendPoint.fromJson(Map<String, dynamic> json) {
    return AccuracyTrendPoint(
      executionId: json['executionId'] as String? ?? '',
      startedAt: _parseDateTime(json['startedAt']),
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0,
    );
  }
}

/// Overview statistics across a date range.
class TrainingOverviewStatistics {
  final int totalDays;
  final int totalTrainings;
  final int totalLearningTimeSeconds;
  final List<DailySummary> dailySummaries;

  const TrainingOverviewStatistics({
    this.totalDays = 0,
    this.totalTrainings = 0,
    this.totalLearningTimeSeconds = 0,
    this.dailySummaries = const [],
  });

  factory TrainingOverviewStatistics.fromJson(Map<String, dynamic> json) {
    final summaries = json['dailySummaries'] as List<dynamic>?;
    return TrainingOverviewStatistics(
      totalDays: json['totalDays'] as int? ?? 0,
      totalTrainings: json['totalTrainings'] as int? ?? 0,
      totalLearningTimeSeconds: json['totalLearningTimeSeconds'] as int? ?? 0,
      dailySummaries: summaries?.map((s) => DailySummary.fromJson(s as Map<String, dynamic>)).toList() ?? [],
    );
  }
}

/// Summary for a single day.
class DailySummary {
  final String date;
  final int trainingCount;
  final int totalLearningTimeSeconds;

  const DailySummary({
    required this.date,
    this.trainingCount = 0,
    this.totalLearningTimeSeconds = 0,
  });

  factory DailySummary.fromJson(Map<String, dynamic> json) {
    return DailySummary(
      date: json['date'] as String? ?? '',
      trainingCount: json['trainingCount'] as int? ?? 0,
      totalLearningTimeSeconds: json['totalLearningTimeSeconds'] as int? ?? 0,
    );
  }
}

/// Statistics for a single day.
class DayStatistics {
  final String date;
  final int totalExecutions;
  final int totalCorrect;
  final int totalIncorrect;
  final List<DayExecution> executions;

  const DayStatistics({
    required this.date,
    this.totalExecutions = 0,
    this.totalCorrect = 0,
    this.totalIncorrect = 0,
    this.executions = const [],
  });

  factory DayStatistics.fromJson(Map<String, dynamic> json) {
    final execs = json['executions'] as List<dynamic>?;
    return DayStatistics(
      date: json['date'] as String? ?? '',
      totalExecutions: json['totalExecutions'] as int? ?? 0,
      totalCorrect: json['totalCorrect'] as int? ?? 0,
      totalIncorrect: json['totalIncorrect'] as int? ?? 0,
      executions: execs?.map((e) => DayExecution.fromJson(e as Map<String, dynamic>)).toList() ?? [],
    );
  }
}

/// A single execution within a day's statistics.
class DayExecution {
  final String executionId;
  final String trainingId;
  final String? trainingName;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final int correctCount;
  final int incorrectCount;
  final int durationSeconds;

  const DayExecution({
    required this.executionId,
    required this.trainingId,
    this.trainingName,
    this.startedAt,
    this.completedAt,
    this.correctCount = 0,
    this.incorrectCount = 0,
    this.durationSeconds = 0,
  });

  factory DayExecution.fromJson(Map<String, dynamic> json) {
    return DayExecution(
      executionId: json['executionId'] as String? ?? '',
      trainingId: json['trainingId'] as String? ?? '',
      trainingName: json['trainingName'] as String?,
      startedAt: _parseDateTime(json['startedAt']),
      completedAt: _parseDateTime(json['completedAt']),
      correctCount: json['correctCount'] as int? ?? 0,
      incorrectCount: json['incorrectCount'] as int? ?? 0,
      durationSeconds: json['durationSeconds'] as int? ?? 0,
    );
  }
}

DateTime? _parseDateTime(dynamic value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  return null;
}
