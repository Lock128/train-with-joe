import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/training_provider.dart';

/// Screen for displaying training history, statistics, and learning day view
class TrainingHistoryScreen extends StatefulWidget {
  final String trainingId;
  const TrainingHistoryScreen({super.key, required this.trainingId});

  @override
  State<TrainingHistoryScreen> createState() => _TrainingHistoryScreenState();
}

class _TrainingHistoryScreenState extends State<TrainingHistoryScreen> {
  Map<String, dynamic>? _training;
  Map<String, dynamic>? _statistics;
  Map<String, dynamic>? _dayStatistics;
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

  int _executionAccuracy(Map<String, dynamic> exec) {
    final correct = exec['correctCount'] as int? ?? 0;
    final incorrect = exec['incorrectCount'] as int? ?? 0;
    final total = correct + incorrect;
    return total > 0 ? (correct / total * 100).round() : 0;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.arrow_back), tooltip: 'Back to training', onPressed: () => context.go('/trainings/${widget.trainingId}')),
          title: const Text('Training History')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _training == null) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.arrow_back), tooltip: 'Back to training', onPressed: () => context.go('/trainings/${widget.trainingId}')),
          title: const Text('Training History')),
        body: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red), const SizedBox(height: 16),
          Text(_error ?? 'Training not found', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 24),
          ElevatedButton.icon(onPressed: _loadData, icon: const Icon(Icons.refresh), label: const Text('Retry')),
        ])),
      );
    }

    final executions = List<Map<String, dynamic>>.from(
      ((_training!['executions'] as List<dynamic>?) ?? []).map((e) => e as Map<String, dynamic>),
    )..sort((a, b) {
        final aDate = a['startedAt'] as String? ?? '';
        final bDate = b['startedAt'] as String? ?? '';
        return bDate.compareTo(aDate);
      });

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), tooltip: 'Back to training', onPressed: () => context.go('/trainings/${widget.trainingId}')),
        title: const Text('Training History')),
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
                  title: Text(_formatDate(exec['startedAt'] as String?)),
                  subtitle: Text('Duration: ${_formatDuration(exec['startedAt'] as String?, exec['completedAt'] as String?)}'),
                  trailing: Text('$accuracy%', style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: accuracy >= 80 ? Colors.green : accuracy >= 50 ? Colors.orange : Colors.red,
                  )),
                  onTap: () => context.go('/trainings/${widget.trainingId}/results/${exec['id']}'),
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
    final overallAccuracy = (_statistics!['overallAccuracy'] as num?)?.toDouble() ?? 0;
    final avgTime = (_statistics!['averageTimeSeconds'] as num?)?.toDouble() ?? 0;
    final totalExec = _statistics!['totalExecutions'] as int? ?? 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Statistics', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
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
    final missed = (_statistics!['mostMissedWords'] as List<dynamic>?) ?? [];
    if (missed.isEmpty) return const SizedBox.shrink();

    final top5 = missed.take(5).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Most Missed Words', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      ...top5.map((item) {
        final w = item as Map<String, dynamic>;
        final acc = (w['accuracyPercentage'] as num?)?.toDouble() ?? 0;
        return ListTile(dense: true, title: Text('${w['word']} - ${w['translation']}'),
          trailing: Text('${acc.round()}%', style: TextStyle(color: acc < 50 ? Colors.red : Colors.orange)));
      }),
      const SizedBox(height: 16),
    ]);
  }

  Widget _buildAccuracyTrend() {
    final trend = (_statistics!['accuracyTrend'] as List<dynamic>?) ?? [];
    if (trend.isEmpty) return const SizedBox.shrink();

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Accuracy Trend', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      ...trend.map((item) {
        final t = item as Map<String, dynamic>;
        final acc = (t['accuracy'] as num?)?.toDouble() ?? 0;
        return ListTile(
          dense: true,
          title: Text(_formatDate(t['startedAt'] as String?)),
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
              Text('Date: ${_dayStatistics!['date'] ?? '--'}', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Total executions: ${_dayStatistics!['totalExecutions'] ?? 0}'),
              Text('Correct: ${_dayStatistics!['totalCorrect'] ?? 0}  |  Incorrect: ${_dayStatistics!['totalIncorrect'] ?? 0}'),
              Text('Overall accuracy: ${((_dayStatistics!['overallAccuracy'] as num?)?.round() ?? 0)}%'),
            ]),
          ),
        ),
        const SizedBox(height: 8),
        ...(((_dayStatistics!['executions'] as List<dynamic>?) ?? []).map((exec) {
          final e = exec as Map<String, dynamic>;
          final dur = (e['durationSeconds'] as num?)?.toDouble() ?? 0;
          final correct = e['correctCount'] as int? ?? 0;
          final incorrect = e['incorrectCount'] as int? ?? 0;
          final total = correct + incorrect;
          final acc = total > 0 ? (correct / total * 100).round() : 0;
          final durMinutes = (dur / 60).floor();
          final durSeconds = (dur % 60).round();
          final durStr = durMinutes > 0 ? '${durMinutes}m ${durSeconds}s' : '${durSeconds}s';
          return ListTile(
            dense: true,
            title: Text(e['trainingName'] as String? ?? 'Training'),
            subtitle: Text('${_formatDate(e['startedAt'] as String?)}  |  $durStr'),
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
