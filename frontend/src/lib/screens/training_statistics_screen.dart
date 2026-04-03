import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/training_provider.dart';

/// Screen showing per-day training statistics overview
class TrainingStatisticsScreen extends StatefulWidget {
  const TrainingStatisticsScreen({super.key});

  @override
  State<TrainingStatisticsScreen> createState() => _TrainingStatisticsScreenState();
}

class _TrainingStatisticsScreenState extends State<TrainingStatisticsScreen> {
  Map<String, dynamic>? _statistics;
  bool _isLoading = true;
  String? _error;
  late DateTime _fromDate;
  late DateTime _toDate;

  @override
  void initState() {
    super.initState();
    _toDate = DateTime.now();
    _fromDate = _toDate.subtract(const Duration(days: 30));
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  String _formatDateParam(DateTime dt) =>
      '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';

  Future<void> _loadData() async {
    setState(() { _isLoading = true; _error = null; });
    final provider = context.read<TrainingProvider>();
    final result = await provider.getTrainingOverviewStatistics(
      _formatDateParam(_fromDate),
      _formatDateParam(_toDate),
    );
    if (!mounted) return;
    setState(() {
      _statistics = result;
      _isLoading = false;
      _error = result == null ? 'Failed to load statistics' : null;
    });
  }

  Future<void> _pickDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: _fromDate, end: _toDate),
    );
    if (picked == null || !mounted) return;
    setState(() { _fromDate = picked.start; _toDate = picked.end; });
    _loadData();
  }

  String _formatDuration(double totalSeconds) {
    final hours = (totalSeconds / 3600).floor();
    final minutes = ((totalSeconds % 3600) / 60).floor();
    final seconds = (totalSeconds % 60).round();
    if (hours > 0) return '${hours}h ${minutes}m';
    if (minutes > 0) return '${minutes}m ${seconds}s';
    return '${seconds}s';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            tooltip: 'Change date range',
            onPressed: _pickDateRange,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null || _statistics == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(_error ?? 'No data available', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final totalTrainings = _statistics!['totalTrainings'] as int? ?? 0;
    final totalTime = (_statistics!['totalLearningTimeSeconds'] as num?)?.toDouble() ?? 0;
    final totalDays = _statistics!['totalDays'] as int? ?? 0;
    final dailySummaries = List<Map<String, dynamic>>.from(
      ((_statistics!['dailySummaries'] as List<dynamic>?) ?? []).map((e) => e as Map<String, dynamic>),
    );

    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Date range chip
            Center(
              child: ActionChip(
                avatar: const Icon(Icons.calendar_today, size: 16),
                label: Text('${_formatDateParam(_fromDate)}  →  ${_formatDateParam(_toDate)}'),
                onPressed: _pickDateRange,
              ),
            ),
            const SizedBox(height: 16),

            // Summary card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    Text('Overview', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _summaryItem(Icons.fitness_center, '$totalTrainings', 'Trainings'),
                        _summaryItem(Icons.timer, _formatDuration(totalTime), 'Learning Time'),
                        _summaryItem(Icons.calendar_month, '$totalDays', 'Active Days'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Daily breakdown
            Text('Daily Breakdown', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),

            if (dailySummaries.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Text('No training activity in this period.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: dailySummaries.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  // Show most recent first
                  final day = dailySummaries[dailySummaries.length - 1 - index];
                  final date = day['date'] as String? ?? '--';
                  final count = day['trainingCount'] as int? ?? 0;
                  final time = (day['totalLearningTimeSeconds'] as num?)?.toDouble() ?? 0;
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                      child: Text('$count', style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      )),
                    ),
                    title: Text(date),
                    subtitle: Text('$count training${count == 1 ? '' : 's'}'),
                    trailing: Text(_formatDuration(time), style: const TextStyle(fontWeight: FontWeight.bold)),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _summaryItem(IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, size: 28, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
      ],
    );
  }
}
