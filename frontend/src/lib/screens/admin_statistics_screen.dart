import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/training_provider.dart';
import '../providers/user_provider.dart';

/// Admin screen for viewing training statistics of any user by their Cognito user ID.
class AdminStatisticsScreen extends StatefulWidget {
  const AdminStatisticsScreen({super.key});

  @override
  State<AdminStatisticsScreen> createState() => _AdminStatisticsScreenState();
}

class _AdminStatisticsScreenState extends State<AdminStatisticsScreen> {
  final _userIdController = TextEditingController();
  String? _activeUserId;
  String? _activeUserLabel;
  Map<String, dynamic>? _statistics;
  bool _isLoading = false;
  String? _error;
  late DateTime _fromDate;
  late DateTime _toDate;
  String? _expandedDate;
  Map<String, dynamic>? _dayStatistics;
  bool _isDayLoading = false;

  List<Map<String, dynamic>> _allUsers = [];
  bool _usersLoaded = false;

  @override
  void initState() {
    super.initState();
    _toDate = DateTime.now();
    _fromDate = _toDate.subtract(const Duration(days: 30));
    _fetchUsers();
  }

  Future<void> _fetchUsers() async {
    final users = await context.read<UserProvider>().getUsers();
    if (mounted) {
      setState(() { _allUsers = users; _usersLoaded = true; });
    }
  }

  @override
  void dispose() {
    _userIdController.dispose();
    super.dispose();
  }

  String _formatDateParam(DateTime dt) =>
      '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';

  Future<void> _loadData([String? overrideUserId]) async {
    final userId = overrideUserId ?? _userIdController.text.trim();
    if (userId.isEmpty) return;

    // Build a display label from the user list if possible
    String label = userId;
    for (final u in _allUsers) {
      if (u['id'] == userId) {
        final email = u['email'] as String? ?? '';
        final name = u['name'] as String?;
        label = name != null && name.isNotEmpty ? '$name ($email)' : email;
        break;
      }
    }

    setState(() { _isLoading = true; _error = null; _activeUserId = userId; _activeUserLabel = label; _expandedDate = null; _dayStatistics = null; });
    final provider = context.read<TrainingProvider>();
    final result = await provider.getTrainingOverviewStatisticsForUser(
      _formatDateParam(_fromDate),
      _formatDateParam(_toDate),
      userId,
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
    if (_activeUserId != null) _loadData();
  }

  String _formatDuration(double totalSeconds) {
    final hours = (totalSeconds / 3600).floor();
    final minutes = ((totalSeconds % 3600) / 60).floor();
    final seconds = (totalSeconds % 60).round();
    if (hours > 0) return '${hours}h ${minutes}m';
    if (minutes > 0) return '${minutes}m ${seconds}s';
    return '${seconds}s';
  }

  Future<void> _toggleDay(String date) async {
    if (_expandedDate == date) {
      setState(() { _expandedDate = null; _dayStatistics = null; });
      return;
    }
    setState(() { _expandedDate = date; _dayStatistics = null; _isDayLoading = true; });
    final result = await context.read<TrainingProvider>().getTrainingDayStatisticsForUser(date, _activeUserId!);
    if (!mounted) return;
    setState(() { _dayStatistics = result; _isDayLoading = false; });
  }

  String _formatTime(String? dateStr) {
    if (dateStr == null) return '--';
    try {
      final dt = DateTime.parse(dateStr);
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '--';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = context.watch<UserProvider>().isAdmin;
    if (!isAdmin) {
      return Scaffold(
        appBar: AppBar(title: const Text('Admin')),
        body: const Center(child: Text('Access denied')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Statistics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            tooltip: 'Change date range',
            onPressed: _pickDateRange,
          ),
        ],
      ),
      body: Column(
        children: [
          // User search
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Autocomplete<Map<String, dynamic>>(
                    displayStringForOption: (user) {
                      final email = user['email'] as String? ?? '';
                      final name = user['name'] as String?;
                      return name != null && name.isNotEmpty ? '$name ($email)' : email;
                    },
                    optionsBuilder: (textEditingValue) {
                      final query = textEditingValue.text.toLowerCase();
                      if (query.isEmpty) return _allUsers;
                      return _allUsers.where((u) {
                        final email = (u['email'] as String? ?? '').toLowerCase();
                        final name = (u['name'] as String? ?? '').toLowerCase();
                        final id = (u['id'] as String? ?? '').toLowerCase();
                        return email.contains(query) || name.contains(query) || id.contains(query);
                      });
                    },
                    onSelected: (user) {
                      final userId = user['id'] as String? ?? '';
                      _userIdController.text = userId;
                      _loadData(userId);
                    },
                    fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
                      // Keep our controller in sync for manual ID entry
                      controller.addListener(() => _userIdController.text = controller.text);
                      return TextField(
                        controller: controller,
                        focusNode: focusNode,
                        decoration: InputDecoration(
                          labelText: 'User email or ID',
                          hintText: _usersLoaded
                              ? 'Search by email, name, or paste a user ID'
                              : 'Loading users…',
                          prefixIcon: const Icon(Icons.person_search),
                        ),
                        onSubmitted: (_) => _loadData(),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: _loadData,
                  icon: const Icon(Icons.search),
                  label: const Text('Load'),
                ),
              ],
            ),
          ),
          // Statistics content
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_activeUserId == null) {
      return const Center(
        child: Text('Search for a user above to view their statistics.', style: TextStyle(color: Colors.grey)),
      );
    }

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
            Center(
              child: ActionChip(
                avatar: const Icon(Icons.calendar_today, size: 16),
                label: Text('${_formatDateParam(_fromDate)}  →  ${_formatDateParam(_toDate)}'),
                onPressed: _pickDateRange,
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    Text('User: ${_activeUserLabel ?? _activeUserId}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
                    const SizedBox(height: 12),
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
            Text('Daily Breakdown',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (dailySummaries.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Text('No training activity in this period.',
                    textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: dailySummaries.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final day = dailySummaries[dailySummaries.length - 1 - index];
                  final date = day['date'] as String? ?? '--';
                  final count = day['trainingCount'] as int? ?? 0;
                  final time = (day['totalLearningTimeSeconds'] as num?)?.toDouble() ?? 0;
                  final isExpanded = _expandedDate == date;
                  return Column(
                    children: [
                      ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          child: Text('$count',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onPrimaryContainer,
                              )),
                        ),
                        title: Text(date),
                        subtitle: Text('$count training${count == 1 ? '' : 's'}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(_formatDuration(time), style: const TextStyle(fontWeight: FontWeight.bold)),
                            Icon(isExpanded ? Icons.expand_less : Icons.expand_more, size: 20),
                          ],
                        ),
                        onTap: () => _toggleDay(date),
                      ),
                      if (isExpanded) _buildDayExecutions(),
                    ],
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDayExecutions() {
    if (_isDayLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Center(child: SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))),
      );
    }
    final executions = (_dayStatistics?['executions'] as List<dynamic>?) ?? [];
    if (executions.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8, horizontal: 16),
        child: Text('No execution details available.', style: TextStyle(color: Colors.grey, fontSize: 13)),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(left: 24, right: 8, bottom: 8),
      child: Column(
        children: executions.map((e) {
          final exec = e as Map<String, dynamic>;
          final name = exec['trainingName'] as String? ?? 'Training';
          final dur = (exec['durationSeconds'] as num?)?.toDouble() ?? 0;
          final correct = exec['correctCount'] as int? ?? 0;
          final incorrect = exec['incorrectCount'] as int? ?? 0;
          final total = correct + incorrect;
          final acc = total > 0 ? (correct / total * 100).round() : 0;
          return ListTile(
            dense: true,
            leading: Icon(Icons.fitness_center, size: 18, color: Theme.of(context).colorScheme.primary),
            title: Text(name, overflow: TextOverflow.ellipsis),
            subtitle: Text('${_formatTime(exec['startedAt'] as String?)}  ·  ${_formatDuration(dur)}  ·  $acc%'),
          );
        }).toList(),
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
