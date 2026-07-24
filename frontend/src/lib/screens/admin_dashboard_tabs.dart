import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../domain/models/user.dart';
import '../domain/models/training_statistics.dart';
import '../providers/training_provider.dart';
import '../providers/user_provider.dart';
import '../services/api_service.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════════

/// Dashboard showing platform-wide engagement metrics:
/// signup trends, daily active users, and training volume.
class ActivityDashboardTab extends StatefulWidget {
  const ActivityDashboardTab({super.key});

  @override
  State<ActivityDashboardTab> createState() => _ActivityDashboardTabState();
}

class _ActivityDashboardTabState extends State<ActivityDashboardTab>
    with AutomaticKeepAliveClientMixin {
  bool _isLoading = true;
  List<AppUser> _users = [];
  TrainingOverviewStatistics? _platformStats;
  int _activeUsersToday = 0;
  int _activeUsersWeek = 0;
  int _signupsThisWeek = 0;
  int _signupsThisMonth = 0;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  String _fmt(DateTime dt) =>
      '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';

  Future<void> _loadDashboard() async {
    setState(() => _isLoading = true);

    final userProvider = context.read<UserProvider>();
    final trainingProvider = context.read<TrainingProvider>();

    // Fetch all users
    final users = await userProvider.getUsers();

    // Fetch platform-wide training stats for last 30 days
    final now = DateTime.now();
    final thirtyDaysAgo = now.subtract(const Duration(days: 30));
    final stats = await trainingProvider.getTrainingOverviewStatistics(
      _fmt(thirtyDaysAgo),
      _fmt(now),
    );

    // Compute signup metrics
    final today = DateTime(now.year, now.month, now.day);
    final weekAgo = today.subtract(const Duration(days: 7));
    final monthAgo = today.subtract(const Duration(days: 30));

    int signupsWeek = 0;
    int signupsMonth = 0;
    for (final u in users) {
      final created = u.createdAt;
      if (created == null) continue;
      if (created.isAfter(weekAgo)) signupsWeek++;
      if (created.isAfter(monthAgo)) signupsMonth++;
    }

    // Compute active users from daily summaries
    int activeToday = 0;
    int activeWeek = 0;
    if (stats != null) {
      final todayStr = _fmt(now);
      final weekAgoStr = _fmt(weekAgo);
      for (final day in stats.dailySummaries) {
        if (day.date == todayStr) activeToday = day.trainingCount > 0 ? 1 : 0;
        if (day.date.compareTo(weekAgoStr) >= 0) {
          activeWeek += day.trainingCount > 0 ? 1 : 0;
        }
      }
    }

    if (!mounted) return;
    setState(() {
      _users = users;
      _platformStats = stats;
      _activeUsersToday = activeToday;
      _activeUsersWeek = activeWeek;
      _signupsThisWeek = signupsWeek;
      _signupsThisMonth = signupsMonth;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final colorScheme = Theme.of(context).colorScheme;
    final totalTrainings = _platformStats?.totalTrainings ?? 0;
    final totalTime = (_platformStats?.totalLearningTimeSeconds ?? 0).toDouble();
    final activeDays = _platformStats?.totalDays ?? 0;

    return RefreshIndicator(
      onRefresh: _loadDashboard,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Platform overview cards
            _SectionHeader(icon: Icons.dashboard, title: 'Platform Overview'),
            const SizedBox(height: 12),
            _buildMetricRow(colorScheme),
            const SizedBox(height: 24),

            // Training activity (last 30 days)
            _SectionHeader(icon: Icons.fitness_center, title: 'Training Activity (30 days)'),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StatColumn(
                      value: '$totalTrainings',
                      label: 'Sessions',
                      icon: Icons.play_arrow_rounded,
                      color: colorScheme.primary,
                    ),
                    _StatColumn(
                      value: _formatDuration(totalTime),
                      label: 'Total Time',
                      icon: Icons.timer,
                      color: Colors.orange,
                    ),
                    _StatColumn(
                      value: '$activeDays',
                      label: 'Active Days',
                      icon: Icons.calendar_month,
                      color: Colors.green,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Daily activity chart (simple bar representation)
            _SectionHeader(icon: Icons.show_chart, title: 'Daily Sessions (last 14 days)'),
            const SizedBox(height: 12),
            _buildDailyChart(colorScheme),
            const SizedBox(height: 24),

            // Signup trends
            _SectionHeader(icon: Icons.person_add, title: 'Signups'),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StatColumn(
                      value: '${_users.length}',
                      label: 'Total Users',
                      icon: Icons.people,
                      color: colorScheme.primary,
                    ),
                    _StatColumn(
                      value: '$_signupsThisWeek',
                      label: 'This Week',
                      icon: Icons.trending_up,
                      color: Colors.green,
                    ),
                    _StatColumn(
                      value: '$_signupsThisMonth',
                      label: 'This Month',
                      icon: Icons.date_range,
                      color: Colors.blue,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricRow(ColorScheme colorScheme) {
    return Row(
      children: [
        Expanded(
          child: _MetricCard(
            title: 'Active Today',
            value: '$_activeUsersToday',
            icon: Icons.bolt,
            color: Colors.amber,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            title: 'Active (7d)',
            value: '$_activeUsersWeek',
            icon: Icons.local_fire_department,
            color: Colors.deepOrange,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            title: 'Total Users',
            value: '${_users.length}',
            icon: Icons.people,
            color: colorScheme.primary,
          ),
        ),
      ],
    );
  }

  Widget _buildDailyChart(ColorScheme colorScheme) {
    final summaries = _platformStats?.dailySummaries ?? [];
    // Take the last 14 days
    final last14 = summaries.length > 14
        ? summaries.sublist(summaries.length - 14)
        : summaries;

    if (last14.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Center(
            child: Text('No activity data', style: TextStyle(color: Colors.grey[500])),
          ),
        ),
      );
    }

    final maxCount = last14.fold<int>(
      1,
      (max, d) => d.trainingCount > max ? d.trainingCount : max,
    );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            SizedBox(
              height: 120,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: last14.map((day) {
                  final ratio = day.trainingCount / maxCount;
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: Tooltip(
                        message: '${day.date}: ${day.trainingCount} sessions',
                        child: Container(
                          height: 120 * ratio.clamp(0.05, 1.0),
                          decoration: BoxDecoration(
                            color: colorScheme.primary.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  last14.first.date.substring(5),
                  style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                ),
                Text(
                  last14.last.date.substring(5),
                  style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDuration(double totalSeconds) {
    final hours = (totalSeconds / 3600).floor();
    final minutes = ((totalSeconds % 3600) / 60).floor();
    if (hours > 0) return '${hours}h ${minutes}m';
    return '${minutes}m';
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// ENGAGEMENT ALERTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

/// Shows churning users (inactive 7+ days) and power users (active daily).
class EngagementAlertsTab extends StatefulWidget {
  const EngagementAlertsTab({super.key});

  @override
  State<EngagementAlertsTab> createState() => _EngagementAlertsTabState();
}

class _EngagementAlertsTabState extends State<EngagementAlertsTab>
    with AutomaticKeepAliveClientMixin {
  bool _isLoading = true;
  List<_UserActivity> _userActivities = [];

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadEngagementData();
  }

  String _fmt(DateTime dt) =>
      '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';

  Future<void> _loadEngagementData() async {
    setState(() => _isLoading = true);

    final userProvider = context.read<UserProvider>();
    final trainingProvider = context.read<TrainingProvider>();

    final users = await userProvider.getUsers();
    final now = DateTime.now();
    final fourteenDaysAgo = now.subtract(const Duration(days: 14));

    // Fetch per-user activity for the last 14 days
    final activities = <_UserActivity>[];
    for (final user in users) {
      final stats = await trainingProvider.getTrainingOverviewStatisticsForUser(
        _fmt(fourteenDaysAgo),
        _fmt(now),
        user.id,
      );
      final activeDays = stats?.totalDays ?? 0;
      final totalTrainings = stats?.totalTrainings ?? 0;
      final lastActiveDate = _findLastActiveDate(stats);
      activities.add(_UserActivity(
        user: user,
        activeDaysLast14: activeDays,
        totalTrainingsLast14: totalTrainings,
        lastActiveDate: lastActiveDate,
      ));
    }

    if (!mounted) return;
    setState(() {
      _userActivities = activities;
      _isLoading = false;
    });
  }

  String? _findLastActiveDate(TrainingOverviewStatistics? stats) {
    if (stats == null || stats.dailySummaries.isEmpty) return null;
    // Summaries are in chronological order; find the last one with activity
    for (int i = stats.dailySummaries.length - 1; i >= 0; i--) {
      if (stats.dailySummaries[i].trainingCount > 0) {
        return stats.dailySummaries[i].date;
      }
    }
    return null;
  }

  List<_UserActivity> get _powerUsers {
    // Active 5+ of the last 14 days
    return _userActivities
        .where((a) => a.activeDaysLast14 >= 5)
        .toList()
      ..sort((a, b) => b.activeDaysLast14.compareTo(a.activeDaysLast14));
  }

  List<_UserActivity> get _churningUsers {
    // No activity in last 7 days (but had at least one signup/creation)
    final now = DateTime.now();
    return _userActivities.where((a) {
      if (a.lastActiveDate == null) return true; // never trained
      final last = DateTime.tryParse(a.lastActiveDate!);
      if (last == null) return true;
      return now.difference(last).inDays >= 7;
    }).toList()
      ..sort((a, b) {
        // Sort by last active: most recently churned first
        final aDate = a.lastActiveDate ?? '0000-00-00';
        final bDate = b.lastActiveDate ?? '0000-00-00';
        return bDate.compareTo(aDate);
      });
  }

  List<_UserActivity> get _newUsers {
    // Created in the last 7 days
    final weekAgo = DateTime.now().subtract(const Duration(days: 7));
    return _userActivities
        .where((a) => a.user.createdAt != null && a.user.createdAt!.isAfter(weekAgo))
        .toList()
      ..sort((a, b) => (b.user.createdAt ?? DateTime(2000))
          .compareTo(a.user.createdAt ?? DateTime(2000)));
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading user activity...', style: TextStyle(color: Colors.grey)),
          ],
        ),
      );
    }

    final power = _powerUsers;
    final churning = _churningUsers;
    final newUsers = _newUsers;

    return RefreshIndicator(
      onRefresh: _loadEngagementData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Summary chips
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _AlertChip(
                  icon: Icons.local_fire_department,
                  label: '${power.length} Power Users',
                  color: Colors.deepOrange,
                ),
                _AlertChip(
                  icon: Icons.warning_amber_rounded,
                  label: '${churning.length} Churning',
                  color: Colors.red,
                ),
                _AlertChip(
                  icon: Icons.person_add,
                  label: '${newUsers.length} New (7d)',
                  color: Colors.green,
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Power Users
            _SectionHeader(
              icon: Icons.local_fire_department,
              title: 'Power Users (5+ active days / 14d)',
              color: Colors.deepOrange,
            ),
            const SizedBox(height: 8),
            if (power.isEmpty)
              _EmptyState(message: 'No power users yet')
            else
              ...power.map((a) => _UserActivityTile(
                    activity: a,
                    badge: '${a.activeDaysLast14}d active',
                    badgeColor: Colors.deepOrange,
                  )),
            const SizedBox(height: 24),

            // New Users
            _SectionHeader(
              icon: Icons.person_add,
              title: 'New Users (last 7 days)',
              color: Colors.green,
            ),
            const SizedBox(height: 8),
            if (newUsers.isEmpty)
              _EmptyState(message: 'No new signups this week')
            else
              ...newUsers.map((a) => _UserActivityTile(
                    activity: a,
                    badge: '${a.totalTrainingsLast14} sessions',
                    badgeColor: Colors.green,
                  )),
            const SizedBox(height: 24),

            // Churning Users
            _SectionHeader(
              icon: Icons.warning_amber_rounded,
              title: 'Inactive 7+ Days',
              color: Colors.red,
            ),
            const SizedBox(height: 8),
            if (churning.isEmpty)
              _EmptyState(message: 'All users are active!')
            else
              ...churning.take(20).map((a) => _UserActivityTile(
                    activity: a,
                    badge: a.lastActiveDate != null
                        ? 'Last: ${a.lastActiveDate}'
                        : 'Never trained',
                    badgeColor: Colors.red,
                  )),
            if (churning.length > 20)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  '+ ${churning.length - 20} more inactive users',
                  style: TextStyle(color: Colors.grey[600], fontStyle: FontStyle.italic),
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      ),
    );
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// APP HEALTH TAB
// ═══════════════════════════════════════════════════════════════════════════════

/// Shows deployed version info, build number, and system health indicators.
class AppHealthTab extends StatefulWidget {
  const AppHealthTab({super.key});

  @override
  State<AppHealthTab> createState() => _AppHealthTabState();
}

class _AppHealthTabState extends State<AppHealthTab>
    with AutomaticKeepAliveClientMixin {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  String? _backendCommitId;
  String? _backendBuildNumber;
  String? _error;
  DateTime? _checkedAt;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadHealth();
  }

  Future<void> _loadHealth() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      const query = '''
        query GetAppInfo {
          getAppInfo {
            commitId
            buildNumber
          }
        }
      ''';

      final result = await _apiService.query(query);
      final info = result['getAppInfo'] as Map<String, dynamic>?;

      if (!mounted) return;
      setState(() {
        _backendCommitId = info?['commitId'] as String?;
        _backendBuildNumber = info?['buildNumber'] as String?;
        _checkedAt = DateTime.now();
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _loadHealth,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status banner
            Card(
              color: _error != null
                  ? Colors.red.shade50
                  : Colors.green.shade50,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Icon(
                      _error != null ? Icons.error_outline : Icons.check_circle,
                      color: _error != null ? Colors.red : Colors.green,
                      size: 36,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _error != null ? 'Backend Unreachable' : 'All Systems Operational',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: _error != null ? Colors.red.shade800 : Colors.green.shade800,
                            ),
                          ),
                          if (_checkedAt != null)
                            Text(
                              'Checked: ${_checkedAt!.hour.toString().padLeft(2, '0')}:${_checkedAt!.minute.toString().padLeft(2, '0')}',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: _loadHealth,
                      icon: const Icon(Icons.refresh),
                      tooltip: 'Recheck',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Backend info
            _SectionHeader(icon: Icons.cloud, title: 'Backend Deployment'),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _InfoRow(
                      icon: Icons.tag,
                      label: 'Build Number',
                      value: _backendBuildNumber ?? 'N/A',
                    ),
                    const Divider(height: 24),
                    _InfoRow(
                      icon: Icons.commit,
                      label: 'Commit ID',
                      value: _backendCommitId != null
                          ? _backendCommitId!.substring(0, _backendCommitId!.length.clamp(0, 8))
                          : 'N/A',
                      fullValue: _backendCommitId,
                    ),
                    const Divider(height: 24),
                    _InfoRow(
                      icon: Icons.dns,
                      label: 'API Status',
                      value: _error != null ? 'Error' : 'Healthy',
                      valueColor: _error != null ? Colors.red : Colors.green,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Frontend info
            _SectionHeader(icon: Icons.phone_android, title: 'Frontend Build'),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _InfoRow(
                      icon: Icons.flutter_dash,
                      label: 'Platform',
                      value: Theme.of(context).platform.name,
                    ),
                    const Divider(height: 24),
                    _InfoRow(
                      icon: Icons.palette,
                      label: 'Theme',
                      value: MediaQuery.of(context).platformBrightness == Brightness.dark
                          ? 'Dark'
                          : 'Light',
                    ),
                    const Divider(height: 24),
                    _InfoRow(
                      icon: Icons.aspect_ratio,
                      label: 'Screen Width',
                      value: '${MediaQuery.sizeOf(context).width.toInt()}px',
                    ),
                  ],
                ),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 24),
              _SectionHeader(icon: Icons.bug_report, title: 'Error Details'),
              const SizedBox(height: 12),
              Card(
                color: Colors.red.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: SelectableText(
                    _error!,
                    style: TextStyle(
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: Colors.red.shade800,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// SHARED HELPER WIDGETS
// ═══════════════════════════════════════════════════════════════════════════════

class _UserActivity {
  final AppUser user;
  final int activeDaysLast14;
  final int totalTrainingsLast14;
  final String? lastActiveDate;

  const _UserActivity({
    required this.user,
    required this.activeDaysLast14,
    required this.totalTrainingsLast14,
    this.lastActiveDate,
  });
}

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color? color;

  const _SectionHeader({required this.icon, required this.title, this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return Row(
      children: [
        Icon(icon, size: 20, color: c),
        const SizedBox(width: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: c,
              ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  final Color color;

  const _StatColumn({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 4),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
      ],
    );
  }
}

class _AlertChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _AlertChip({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: Icon(icon, size: 16, color: color),
      label: Text(label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600)),
      backgroundColor: color.withValues(alpha: 0.1),
      side: BorderSide(color: color.withValues(alpha: 0.3)),
      padding: const EdgeInsets.symmetric(horizontal: 4),
    );
  }
}

class _UserActivityTile extends StatelessWidget {
  final _UserActivity activity;
  final String badge;
  final Color badgeColor;

  const _UserActivityTile({
    required this.activity,
    required this.badge,
    required this.badgeColor,
  });

  @override
  Widget build(BuildContext context) {
    final user = activity.user;
    final label = user.name != null && user.name!.isNotEmpty
        ? '${user.name} (${user.email ?? ''})'
        : user.email ?? user.id;

    return Card(
      margin: const EdgeInsets.only(bottom: 4),
      child: ListTile(
        dense: true,
        leading: CircleAvatar(
          radius: 18,
          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          child: Text(
            (label.isNotEmpty ? label[0] : '?').toUpperCase(),
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: Theme.of(context).colorScheme.onPrimaryContainer,
            ),
          ),
        ),
        title: Text(label, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13)),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: badgeColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            badge,
            style: TextStyle(fontSize: 11, color: badgeColor, fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String message;

  const _EmptyState({required this.message});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Text(
        message,
        style: TextStyle(color: Colors.grey[500], fontStyle: FontStyle.italic),
        textAlign: TextAlign.center,
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? fullValue;
  final Color? valueColor;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.fullValue,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey[600]),
        const SizedBox(width: 12),
        Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        const Spacer(),
        Tooltip(
          message: fullValue ?? value,
          child: Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 13,
              color: valueColor,
            ),
          ),
        ),
      ],
    );
  }
}
