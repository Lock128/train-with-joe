import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../domain/models/training.dart';
import '../domain/models/training_statistics.dart';
import '../l10n/generated/app_localizations.dart';
import '../providers/training_provider.dart';

/// Screen for displaying training history, statistics, and learning day view
class TrainingHistoryScreen extends StatefulWidget {
  final String trainingId;
  const TrainingHistoryScreen({super.key, required this.trainingId});

  @override
  State<TrainingHistoryScreen> createState() => _TrainingHistoryScreenState();
}

class _TrainingHistoryScreenState extends State<TrainingHistoryScreen> {
  Training? _training;
  TrainingStatistics? _statistics;
  DayStatistics? _dayStatistics;
  bool _isLoading = true;
  String? _error;
  DateTime? _selectedDate;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData() async {
    setState(() { _isLoading = true; _error = null; });
    final provider = context.read<TrainingProvider>();

    final training = await provider.getTraining(widget.trainingId);
    if (!mounted) return;

    final stats = await provider.getTrainingStatistics(widget.trainingId);
    if (!mounted) return;

    setState(() {
      _training = training;
      _statistics = stats;
      _isLoading = false;
      _error = training == null ? 'Failed to load training' : null;
    });
  }

  Future<void> _pickDateAndLoadDay() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked == null || !mounted) return;

    setState(() { _selectedDate = picked; _dayStatistics = null; });

    final dateStr = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    final result = await context.read<TrainingProvider>().getTrainingDayStatistics(dateStr);
    if (!mounted) return;
    setState(() => _dayStatistics = result);
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '--';
    try {
      final dt = DateTime.parse(dateStr);
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} '
          '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return dateStr;
    }
  }

  String _formatDuration(String? startedAt, String? completedAt) {
    if (startedAt == null || completedAt == null) return '--';
    try {
      final start = DateTime.parse(startedAt);
      final end = DateTime.parse(completedAt);
      final diff = end.difference(start);
      final minutes = diff.inMinutes;
      final seconds = diff.inSeconds % 60;
      if (minutes > 0) return '${minutes}m ${seconds}s';
      return '${seconds}s';
    } catch (_) {
      return '--';
    }
  }

  int _executionAccuracy(TrainingExecutionSummary exec) {
    final correct = exec.correctCount;
    final incorrect = exec.incorrectCount;
    final total = correct + incorrect;
    return total > 0 ? (correct / total * 100).round() : 0;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.arrow_back), tooltip: l10n.backToTrainingDetail, onPressed: () => context.go('/trainings/${widget.trainingId}')),
          title: Text(l10n.trainingHistory)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _training == null) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.arrow_back), tooltip: l10n.backToTrainingDetail, onPressed: () => context.go('/trainings/${widget.trainingId}')),
          title: Text(l10n.trainingHistory)),
        body: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red), const SizedBox(height: 16),
          Text(_error ?? l10n.trainingNotFound, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 24),
          ElevatedButton.icon(onPressed: _loadData, icon: const Icon(Icons.refresh), label: Text(l10n.retry)),
        ])),
      );
    }

    final executions = List<TrainingExecutionSummary>.from(_training!.executions)
      ..sort((a, b) {
        final aDate = a.startedAt?.toIso8601String() ?? '';
        final bDate = b.startedAt?.toIso8601String() ?? '';
        return bDate.compareTo(aDate);
      });

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), tooltip: l10n.backToTrainingDetail, onPressed: () => context.go('/trainings/${widget.trainingId}')),
        title: Text(l10n.trainingHistory)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          // Statistics card
          if (_statistics != null) _buildStatisticsCard(),
          const SizedBox(height: 16),

          // Most missed words
          if (_statistics != null) _buildMostMissedWords(),

          // Accuracy trend
          if (_statistics != null) _buildAccuracyTrend(),

          const Divider(height: 32),

          // Past Executions header
          Text('Past Executions', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          if (executions.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text('No executions yet.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: executions.length,
              itemBuilder: (context, index) {
                final exec = executions[index];
                final accuracy = _executionAccuracy(exec);
                return ListTile(
                  title: Text(_formatDate(exec.startedAt?.toIso8601String())),
                  subtitle: Text('Duration: ${_formatDuration(exec.startedAt?.toIso8601String(), exec.completedAt?.toIso8601String())}'),
                  trailing: Text('$accuracy%', style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: accuracy >= 80 ? Colors.green : accuracy >= 50 ? Colors.orange : Colors.red,
                  )),
                  onTap: () => context.go('/trainings/${widget.trainingId}/results/${exec.id}'),
                );
              },
            ),

          const Divider(height: 32),

          // Learning Day section
          _buildLearningDaySection(),
        ]),
      ),
    );
  }

  Widget _buildStatisticsCard() {
    final overallAccuracy = _statistics!.overallAccuracy;
    final avgTime = _statistics!.averageTimeSeconds;
    final totalExec = _statistics!.totalExecutions;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(AppLocalizations.of(context)!.statistics, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _statItem('Accuracy', '${overallAccuracy.round()}%'),
            _statItem('Avg Time', '${avgTime.round()}s'),
            _statItem('Executions', '$totalExec'),
          ]),
        ]),
      ),
    );
  }

  Widget _statItem(String label, String value) => Column(children: [
    Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
    const SizedBox(height: 4),
    Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
  ]);

  Widget _buildMostMissedWords() {
    final missed = _statistics!.mostMissedWords;
    if (missed.isEmpty) return const SizedBox.shrink();

    final top5 = missed.take(5).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Most Missed Words', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      ...top5.map((w) {
        final acc = w.accuracyPercentage;
        return ListTile(dense: true, title: Text('${w.word} - ${w.translation ?? ''}'),
          trailing: Text('${acc.round()}%', style: TextStyle(color: acc < 50 ? Colors.red : Colors.orange)));
      }),
      const SizedBox(height: 16),
    ]);
  }

  Widget _buildAccuracyTrend() {
    final trend = _statistics!.accuracyTrend;
    if (trend.isEmpty) return const SizedBox.shrink();

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Accuracy Trend', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      ...trend.map((t) {
        final acc = t.accuracy;
        return ListTile(
          dense: true,
          title: Text(_formatDate(t.startedAt?.toIso8601String())),
          trailing: Text('${acc.round()}%', style: TextStyle(
            color: acc >= 80 ? Colors.green : acc >= 50 ? Colors.orange : Colors.red,
          )),
        );
      }),
      const SizedBox(height: 16),
    ]);
  }

  Widget _buildLearningDaySection() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Learning Day', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      TextButton.icon(
        onPressed: _pickDateAndLoadDay,
        icon: const Icon(Icons.calendar_today),
        label: Text(_selectedDate != null
            ? '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}'
            : 'Filter by Date'),
      ),
      if (_selectedDate != null && _dayStatistics == null)
        const Padding(padding: EdgeInsets.symmetric(vertical: 16),
          child: Text('No data for this date.', style: TextStyle(color: Colors.grey))),
      if (_dayStatistics != null) ...[
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Date: ${_dayStatistics!.date}', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Total executions: ${_dayStatistics!.totalExecutions}'),
              Text('Correct: ${_dayStatistics!.totalCorrect}  |  Incorrect: ${_dayStatistics!.totalIncorrect}'),
              Builder(builder: (_) {
                final correct = _dayStatistics!.totalCorrect;
                final incorrect = _dayStatistics!.totalIncorrect;
                final total = correct + incorrect;
                final acc = total > 0 ? (correct / total * 100).round() : 0;
                return Text(AppLocalizations.of(context)!.overallAccuracy(acc));
              }),
            ]),
          ),
        ),
        const SizedBox(height: 8),
        ...(_dayStatistics!.executions.map((e) {
          final dur = e.durationSeconds.toDouble();
          final correct = e.correctCount;
          final incorrect = e.incorrectCount;
          final total = correct + incorrect;
          final acc = total > 0 ? (correct / total * 100).round() : 0;
          final durMinutes = (dur / 60).floor();
          final durSeconds = (dur % 60).round();
          final durStr = durMinutes > 0 ? '${durMinutes}m ${durSeconds}s' : '${durSeconds}s';
          return ListTile(
            dense: true,
            title: Text(e.trainingName ?? 'Training'),
            subtitle: Text('${_formatDate(e.startedAt?.toIso8601String())}  |  $durStr'),
            trailing: Text('$acc%', style: TextStyle(
              fontWeight: FontWeight.bold,
              color: acc >= 80 ? Colors.green : acc >= 50 ? Colors.orange : Colors.red,
            )),
          );
        })),
      ],
    ]);
  }
}
