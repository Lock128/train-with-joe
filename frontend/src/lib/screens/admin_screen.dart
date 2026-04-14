import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/generated/app_localizations.dart';
import '../providers/training_provider.dart';
import '../providers/user_provider.dart';

/// Admin screen with user list, statistics, and data migration tools.
class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Callback to refresh tier stats from the Users tab after a tier override
  VoidCallback? _refreshTierStats;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isAdmin = context.watch<UserProvider>().isAdmin;
    if (!isAdmin) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.admin)),
        body: Center(child: Text(l10n.accessDenied)),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.admin),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          isScrollable: true,
          tabs: const [
            Tab(icon: Icon(Icons.people), text: 'Users'),
            Tab(icon: Icon(Icons.bar_chart), text: 'Statistics'),
            Tab(icon: Icon(Icons.pie_chart), text: 'Tier Stats'),
            Tab(icon: Icon(Icons.swap_horiz), text: 'Migrate Data'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _UsersTab(onTierOverride: () => _refreshTierStats?.call()),
          const _StatisticsTab(),
          _TierStatsTab(
            tabController: _tabController,
            tabIndex: 2,
            onRegisterRefresh: (cb) => _refreshTierStats = cb,
          ),
          const _MigrateDataTab(),
        ],
      ),
    );
  }
}


// ─── Users Tab ───

class _UsersTab extends StatefulWidget {
  final VoidCallback? onTierOverride;

  const _UsersTab({this.onTierOverride});

  @override
  State<_UsersTab> createState() => _UsersTabState();
}

class _UsersTabState extends State<_UsersTab> with AutomaticKeepAliveClientMixin {
  List<Map<String, dynamic>> _allUsers = [];
  bool _isLoading = true;
  String _searchQuery = '';
  final _searchController = TextEditingController();

  // Track per-user selected tier for override dropdown
  final Map<String, String> _selectedTiers = {};
  final Set<String> _applyingTier = {};
  bool _isSyncing = false;

  static const _tierOptions = ['FREE', 'BASIC', 'PRO'];

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchUsers() async {
    setState(() => _isLoading = true);
    final users = await context.read<UserProvider>().getUsers();
    if (mounted) {
      setState(() { _allUsers = users; _isLoading = false; });
    }
  }

  List<Map<String, dynamic>> get _filteredUsers {
    if (_searchQuery.isEmpty) return _allUsers;
    final q = _searchQuery.toLowerCase();
    return _allUsers.where((u) {
      final email = (u['email'] as String? ?? '').toLowerCase();
      final name = (u['name'] as String? ?? '').toLowerCase();
      final id = (u['id'] as String? ?? '').toLowerCase();
      return email.contains(q) || name.contains(q) || id.contains(q);
    }).toList();
  }

  String _userLabel(Map<String, dynamic> user) {
    final email = user['email'] as String? ?? '';
    final name = user['name'] as String?;
    return name != null && name.isNotEmpty ? '$name ($email)' : email;
  }

  String _tierSourceLabel(Map<String, dynamic> user) {
    final tierSource = user['tierSource'] as String?;
    if (tierSource == 'MANUAL') return 'Manual';
    final provider = user['subscriptionProvider'] as String?;
    if (provider != null && provider.isNotEmpty) {
      switch (provider) {
        case 'STRIPE':
          return 'Stripe';
        case 'APPLE_APP_STORE':
          return 'App Store';
        case 'GOOGLE_PLAY_STORE':
          return 'Play Store';
        default:
          return provider;
      }
    }
    return tierSource ?? 'Subscription';
  }

  Color _tierColor(String? tier) {
    switch (tier) {
      case 'PRO':
        return Colors.deepPurple;
      case 'BASIC':
        return Colors.blue;
      case 'FREE':
      default:
        return Colors.grey;
    }
  }

  Future<void> _syncMissingUsers() async {
    setState(() => _isSyncing = true);
    final result = await context.read<UserProvider>().syncMissingUsers();
    if (!mounted) return;
    setState(() => _isSyncing = false);

    final success = result?['success'] == true;
    final createdCount = result?['createdCount'] as int? ?? 0;
    final error = result?['error'] as String?;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(createdCount > 0
              ? 'Synced $createdCount missing user${createdCount == 1 ? '' : 's'} from Cognito'
              : 'All users are already synced'),
          duration: const Duration(seconds: 3),
        ),
      );
      if (createdCount > 0) _fetchUsers();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error ?? 'Failed to sync users'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _applyTierOverride(String userId, String tier) async {
    setState(() => _applyingTier.add(userId));
    final updatedUser = await context.read<UserProvider>().adminSetUserTier(userId, tier);
    if (!mounted) return;
    if (updatedUser != null) {
      // Update the user in the local list
      setState(() {
        final idx = _allUsers.indexWhere((u) => u['id'] == userId);
        if (idx >= 0) {
          _allUsers[idx] = {..._allUsers[idx], ...updatedUser};
        }
        _selectedTiers.remove(userId);
        _applyingTier.remove(userId);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Tier updated to $tier'), duration: const Duration(seconds: 2)),
      );
      widget.onTierOverride?.call();
    } else {
      setState(() => _applyingTier.remove(userId));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update tier'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final users = _filteredUsers;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search by name, email, or ID',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              isDense: true,
            ),
            onChanged: (v) => setState(() => _searchQuery = v),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Text(
                '${users.length} user${users.length == 1 ? '' : 's'}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey),
              ),
              const Spacer(),
              _isSyncing
                  ? const SizedBox(
                      width: 16, height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : TextButton.icon(
                      onPressed: _syncMissingUsers,
                      icon: const Icon(Icons.sync, size: 16),
                      label: const Text('Sync from Cognito', style: TextStyle(fontSize: 12)),
                    ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _fetchUsers,
            child: users.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 100),
                      Center(child: Text('No users found.', style: TextStyle(color: Colors.grey))),
                    ],
                  )
                : ListView.separated(
                    itemCount: users.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final user = users[index];
                      final label = _userLabel(user);
                      final id = user['id'] as String? ?? '';
                      final tier = user['tier'] as String? ?? 'FREE';
                      final tierSourceLabel = _tierSourceLabel(user);
                      final isApplying = _applyingTier.contains(id);
                      final selectedTier = _selectedTiers[id];

                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          child: Text(
                            (label.isNotEmpty ? label[0] : '?').toUpperCase(),
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.onPrimaryContainer,
                            ),
                          ),
                        ),
                        title: Text(label, overflow: TextOverflow.ellipsis),
                        subtitle: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: _tierColor(tier).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                tier,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: _tierColor(tier),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              tierSourceLabel,
                              style: const TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                          ],
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            DropdownButton<String>(
                              value: selectedTier,
                              hint: const Text('Tier', style: TextStyle(fontSize: 12)),
                              isDense: true,
                              underline: const SizedBox.shrink(),
                              items: _tierOptions.map((t) => DropdownMenuItem(
                                value: t,
                                child: Text(t, style: const TextStyle(fontSize: 12)),
                              )).toList(),
                              onChanged: (v) {
                                if (v != null) setState(() => _selectedTiers[id] = v);
                              },
                            ),
                            const SizedBox(width: 4),
                            isApplying
                                ? const SizedBox(
                                    width: 20, height: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : IconButton(
                                    icon: const Icon(Icons.check_circle_outline, size: 20),
                                    tooltip: 'Apply tier override',
                                    onPressed: selectedTier != null
                                        ? () => _applyTierOverride(id, selectedTier)
                                        : null,
                                  ),
                          ],
                        ),
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => _UserStatisticsDetail(userId: id, userLabel: label),
                            ),
                          );
                        },
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }
}


// ─── User Statistics Detail (pushed from Users tab) ───

class _UserStatisticsDetail extends StatefulWidget {
  final String userId;
  final String userLabel;

  const _UserStatisticsDetail({required this.userId, required this.userLabel});

  @override
  State<_UserStatisticsDetail> createState() => _UserStatisticsDetailState();
}

class _UserStatisticsDetailState extends State<_UserStatisticsDetail> {
  Map<String, dynamic>? _statistics;
  bool _isLoading = true;
  String? _error;
  late DateTime _fromDate;
  late DateTime _toDate;
  String? _expandedDate;
  Map<String, dynamic>? _dayStatistics;
  bool _isDayLoading = false;

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
    setState(() { _isLoading = true; _error = null; _expandedDate = null; _dayStatistics = null; });
    final result = await context.read<TrainingProvider>().getTrainingOverviewStatisticsForUser(
      _formatDateParam(_fromDate),
      _formatDateParam(_toDate),
      widget.userId,
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

  Future<void> _toggleDay(String date) async {
    if (_expandedDate == date) {
      setState(() { _expandedDate = null; _dayStatistics = null; });
      return;
    }
    setState(() { _expandedDate = date; _dayStatistics = null; _isDayLoading = true; });
    final result = await context.read<TrainingProvider>().getTrainingDayStatisticsForUser(date, widget.userId);
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
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.userLabel, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            tooltip: 'Change date range',
            onPressed: _pickDateRange,
          ),
        ],
      ),
      body: _buildBody(l10n),
    );
  }

  Widget _buildBody(AppLocalizations l10n) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());

    if (_error != null || _statistics == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(_error ?? l10n.noDataAvailable, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 24),
            ElevatedButton.icon(onPressed: _loadData, icon: const Icon(Icons.refresh), label: Text(l10n.retry)),
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


// ─── Statistics Tab (search-based, kept for quick lookups) ───

class _StatisticsTab extends StatefulWidget {
  const _StatisticsTab();

  @override
  State<_StatisticsTab> createState() => _StatisticsTabState();
}

class _StatisticsTabState extends State<_StatisticsTab> with AutomaticKeepAliveClientMixin {
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
  bool get wantKeepAlive => true;

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
    final userId = overrideUserId ?? _activeUserId ?? _userIdController.text.trim();
    if (userId.isEmpty) return;

    String? resolvedId;
    String label = userId;
    for (final u in _allUsers) {
      final uid = u['id'] as String? ?? '';
      final email = u['email'] as String? ?? '';
      final name = u['name'] as String?;
      if (uid == userId || email == userId) {
        resolvedId = uid;
        label = name != null && name.isNotEmpty ? '$name ($email)' : email;
        break;
      }
    }
    final effectiveUserId = resolvedId ?? userId;

    setState(() { _isLoading = true; _error = null; _activeUserId = effectiveUserId; _activeUserLabel = label; _expandedDate = null; _dayStatistics = null; });
    final provider = context.read<TrainingProvider>();
    final result = await provider.getTrainingOverviewStatisticsForUser(
      _formatDateParam(_fromDate),
      _formatDateParam(_toDate),
      effectiveUserId,
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
    super.build(context);
    final l10n = AppLocalizations.of(context)!;
    return Column(
      children: [
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
                    controller.addListener(() => _userIdController.text = controller.text);
                    return TextField(
                      controller: controller,
                      focusNode: focusNode,
                      decoration: InputDecoration(
                        labelText: 'User email or ID',
                        hintText: _usersLoaded ? 'Search by email, name, or paste a user ID' : 'Loading users…',
                        prefixIcon: const Icon(Icons.person_search),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.date_range),
                          tooltip: 'Change date range',
                          onPressed: _pickDateRange,
                        ),
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
                label: Text(l10n.load),
              ),
            ],
          ),
        ),
        Expanded(child: _buildBody()),
      ],
    );
  }

  Widget _buildBody() {
    final l10n = AppLocalizations.of(context)!;
    if (_activeUserId == null) {
      return const Center(
        child: Text('Search for a user above to view their statistics.', style: TextStyle(color: Colors.grey)),
      );
    }
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_error != null || _statistics == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(_error ?? l10n.noDataAvailable, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 24),
            ElevatedButton.icon(onPressed: _loadData, icon: const Icon(Icons.refresh), label: Text(l10n.retry)),
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


// ─── Tier Stats Tab ───

class _TierStatsTab extends StatefulWidget {
  final TabController tabController;
  final int tabIndex;
  final void Function(VoidCallback) onRegisterRefresh;

  const _TierStatsTab({
    required this.tabController,
    required this.tabIndex,
    required this.onRegisterRefresh,
  });

  @override
  State<_TierStatsTab> createState() => _TierStatsTabState();
}

class _TierStatsTabState extends State<_TierStatsTab> with AutomaticKeepAliveClientMixin {
  List<Map<String, dynamic>> _statistics = [];
  bool _isLoading = true;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    widget.onRegisterRefresh(_loadStatistics);
    widget.tabController.addListener(_onTabChanged);
    _loadStatistics();
  }

  @override
  void dispose() {
    widget.tabController.removeListener(_onTabChanged);
    super.dispose();
  }

  void _onTabChanged() {
    if (widget.tabController.index == widget.tabIndex) {
      _loadStatistics();
    }
  }

  Future<void> _loadStatistics() async {
    setState(() => _isLoading = true);
    final stats = await context.read<UserProvider>().getTierStatistics();
    if (mounted) {
      setState(() { _statistics = stats; _isLoading = false; });
    }
  }

  Color _tierColor(String? tier) {
    switch (tier) {
      case 'PRO':
        return Colors.deepPurple;
      case 'BASIC':
        return Colors.blue;
      case 'FREE':
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_statistics.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.pie_chart_outline, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('No tier statistics available.', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadStatistics,
              icon: const Icon(Icons.refresh),
              label: const Text('Refresh'),
            ),
          ],
        ),
      );
    }

    final totalUsers = _statistics.fold<int>(0, (sum, s) => sum + (s['totalCount'] as int? ?? 0));

    return RefreshIndicator(
      onRefresh: _loadStatistics,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Text(
                      'Tier Distribution',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$totalUsers total users',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            ..._statistics.map((stat) {
              final tier = stat['tier'] as String? ?? 'FREE';
              final subscriptionCount = stat['subscriptionCount'] as int? ?? 0;
              final manualCount = stat['manualCount'] as int? ?? 0;
              final totalCount = stat['totalCount'] as int? ?? 0;
              final pct = totalUsers > 0 ? (totalCount / totalUsers * 100).toStringAsFixed(1) : '0.0';

              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: _tierColor(tier).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              tier,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: _tierColor(tier),
                              ),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '$totalCount users ($pct%)',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (totalUsers > 0)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: totalCount / totalUsers,
                            backgroundColor: Colors.grey.shade200,
                            color: _tierColor(tier),
                            minHeight: 6,
                          ),
                        ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _statItem('Subscription', subscriptionCount),
                          ),
                          Expanded(
                            child: _statItem('Manual', manualCount),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _statItem(String label, int count) {
    return Column(
      children: [
        Text('$count', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
      ],
    );
  }
}


// ─── Migrate Data Tab ───

class _MigrateDataTab extends StatefulWidget {
  const _MigrateDataTab();

  @override
  State<_MigrateDataTab> createState() => _MigrateDataTabState();
}

class _MigrateDataTabState extends State<_MigrateDataTab> with AutomaticKeepAliveClientMixin {
  List<Map<String, dynamic>> _allUsers = [];
  bool _usersLoaded = false;

  String? _sourceUserId;
  String? _targetUserId;
  bool _isMigrating = false;
  Map<String, dynamic>? _result;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  Future<void> _fetchUsers() async {
    final users = await context.read<UserProvider>().getUsers();
    if (mounted) setState(() { _allUsers = users; _usersLoaded = true; });
  }

  String _userLabel(Map<String, dynamic> user) {
    final email = user['email'] as String? ?? '';
    final name = user['name'] as String?;
    return name != null && name.isNotEmpty ? '$name ($email)' : email;
  }

  Future<void> _migrate() async {
    if (_sourceUserId == null || _targetUserId == null) return;
    if (_sourceUserId == _targetUserId) {
      final l10n = AppLocalizations.of(context)!;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.sourceAndTargetMustDiffer)),
      );
      return;
    }

    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.confirmMigration),
        content: Text(
          'This will move all vocabulary lists, trainings, and training executions '
          'from the source user to the target user.\n\nThis cannot be easily undone. Continue?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l10n.migrate)),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() { _isMigrating = true; _result = null; });

    final result = await context.read<UserProvider>().migrateUserData(_sourceUserId!, _targetUserId!);

    if (!mounted) return;
    setState(() { _isMigrating = false; _result = result; });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.swap_horiz, color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 8),
                      Text('Migrate User Data', style: Theme.of(context).textTheme.titleMedium),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Move all vocabulary lists, trainings, and training executions from one user to another.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey),
                  ),
                  const SizedBox(height: 20),
                  _buildUserAutocomplete(
                    label: 'Source User (move FROM)',
                    icon: Icons.person_outline,
                    onSelected: (id) => setState(() => _sourceUserId = id),
                  ),
                  const SizedBox(height: 16),
                  _buildUserAutocomplete(
                    label: 'Target User (move TO)',
                    icon: Icons.person,
                    onSelected: (id) => setState(() => _targetUserId = id),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: (_sourceUserId != null && _targetUserId != null && !_isMigrating) ? _migrate : null,
                      icon: _isMigrating
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.swap_horiz),
                      label: Text(_isMigrating ? 'Migrating…' : 'Migrate Data'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_result != null) ...[
            const SizedBox(height: 16),
            _buildResultCard(),
          ],
        ],
      ),
    );
  }

  Widget _buildUserAutocomplete({
    required String label,
    required IconData icon,
    required ValueChanged<String> onSelected,
  }) {
    return Autocomplete<Map<String, dynamic>>(
      displayStringForOption: _userLabel,
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
      onSelected: (user) => onSelected(user['id'] as String? ?? ''),
      fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
        return TextField(
          controller: controller,
          focusNode: focusNode,
          decoration: InputDecoration(
            labelText: label,
            hintText: _usersLoaded ? 'Search by email, name, or ID' : 'Loading users…',
            prefixIcon: Icon(icon),
          ),
          onSubmitted: (_) => onFieldSubmitted(),
        );
      },
    );
  }

  Widget _buildResultCard() {
    final success = _result!['success'] == true;
    final error = _result!['error'] as String?;
    final lists = _result!['migratedVocabularyLists'] as int? ?? 0;
    final trainings = _result!['migratedTrainings'] as int? ?? 0;
    final executions = _result!['migratedExecutions'] as int? ?? 0;

    return Card(
      color: success ? Colors.green.shade50 : Colors.red.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(success ? Icons.check_circle : Icons.error, color: success ? Colors.green : Colors.red),
                const SizedBox(width: 8),
                Text(success ? 'Migration Complete' : 'Migration Failed',
                    style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 12),
            _resultRow('Vocabulary Lists', lists),
            _resultRow('Trainings', trainings),
            _resultRow('Executions', executions),
            if (error != null && error.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(error, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _resultRow(String label, int count) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text('$count', style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
