import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../l10n/generated/app_localizations.dart';
import '../providers/training_provider.dart';

/// Screen for displaying results of a completed training execution
class TrainingResultsScreen extends StatefulWidget {
  final String trainingId;
  final String executionId;

  const TrainingResultsScreen({
    super.key,
    required this.trainingId,
    required this.executionId,
  });

  @override
  State<TrainingResultsScreen> createState() => _TrainingResultsScreenState();
}

class _TrainingResultsScreenState extends State<TrainingResultsScreen> {
  Map<String, dynamic>? _execution;
  bool _isLoading = true;
  bool _isRetrying = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData() async {
    final provider = context.read<TrainingProvider>();

    // Try currentExecution first, otherwise fetch training to find execution
    final current = provider.currentExecution;
    if (current != null && current['id'] == widget.executionId) {
      setState(() { _execution = current; _isLoading = false; });
      return;
    }

    final training = await provider.getTraining(widget.trainingId);
    if (!mounted) return;

    if (training != null) {
      final executions = (training['executions'] as List<dynamic>?) ?? [];
      for (final exec in executions) {
        final e = exec as Map<String, dynamic>;
        if (e['id'] == widget.executionId) {
          setState(() { _execution = e; _isLoading = false; });
          return;
        }
      }
    }

    setState(() { _isLoading = false; });
  }

  Future<void> _retryTraining() async {
    setState(() => _isRetrying = true);
    final execution = await context.read<TrainingProvider>().startTraining(widget.trainingId);
    if (!mounted) return;
    setState(() => _isRetrying = false);
    if (execution != null) {
      context.go('/trainings/${widget.trainingId}/execute/${execution['id']}');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(context.read<TrainingProvider>().error ?? 'Failed to start training'),
        backgroundColor: Colors.red,
      ));
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.results)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_execution == null) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.results)),
        body: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(l10n.executionNotFound, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 24),
          ElevatedButton.icon(onPressed: _loadData, icon: const Icon(Icons.refresh), label: Text(l10n.retry)),
        ])),
      );
    }

    final results = (_execution!['results'] as List<dynamic>?) ?? [];
    final correctCount = _execution!['correctCount'] as int? ?? 0;
    final incorrectCount = _execution!['incorrectCount'] as int? ?? 0;
    final total = correctCount + incorrectCount;
    final accuracy = total > 0 ? (correctCount / total * 100).round() : 0;
    final duration = _formatDuration(
      _execution!['startedAt'] as String?,
      _execution!['completedAt'] as String?,
    );

    return Scaffold(
      appBar: AppBar(title: Text(l10n.results)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          // Score card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(children: [
                Text(
                  '$correctCount / $total correct',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  '$accuracy% accuracy',
                  style: TextStyle(
                    fontSize: 20,
                    color: accuracy >= 80 ? Colors.green : accuracy >= 50 ? Colors.orange : Colors.red,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text('Total time: $duration', style: const TextStyle(color: Colors.grey, fontSize: 14)),
              ]),
            ),
          ),
          const SizedBox(height: 24),

          // Per-word breakdown
          Text('Word Breakdown', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (results.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('No results available.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: results.length,
              itemBuilder: (context, index) {
                final r = results[index] as Map<String, dynamic>;
                final correct = r['correct'] as bool? ?? false;
                final word = r['word'] as String? ?? '';
                final expected = r['expectedAnswer'] as String? ?? '';
                final userAnswer = r['userAnswer'] as String? ?? '';
                return ListTile(
                  leading: Icon(
                    correct ? Icons.check_circle : Icons.cancel,
                    color: correct ? Colors.green : Colors.red,
                  ),
                  title: Text(word),
                  subtitle: Text(
                    correct ? 'Answer: $userAnswer' : 'Your answer: $userAnswer  |  Correct: $expected',
                  ),
                );
              },
            ),
          const SizedBox(height: 24),

          // Action buttons
          ElevatedButton(
            onPressed: _isRetrying ? null : _retryTraining,
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
            child: _isRetrying
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(l10n.tryAgain),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () => context.go('/trainings/${widget.trainingId}'),
            style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16)),
            child: Text(l10n.backToTraining),
          ),
        ]),
      ),
    );
  }
}
