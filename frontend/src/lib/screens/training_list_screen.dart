import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/training_provider.dart';
import '../providers/vocabulary_provider.dart';
import '../utils/language_flags.dart';
import '../l10n/generated/app_localizations.dart';

/// Screen for viewing all user trainings
class TrainingListScreen extends StatefulWidget {
  const TrainingListScreen({super.key});

  @override
  State<TrainingListScreen> createState() => _TrainingListScreenState();
}

class _TrainingListScreenState extends State<TrainingListScreen> {
  bool _adminMode = false;

  // Filter state
  final TextEditingController _searchController = TextEditingController();
  String? _selectedMode;
  String? _selectedListId;

  // Key to force-rebuild dropdowns when filters are cleared
  int _filterResetKey = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TrainingProvider>().loadTrainings();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _getModeColor(String? mode) {
    switch (mode) {
      case 'TEXT_INPUT':
        return const Color(0xFF2B6CB0);
      case 'MULTIPLE_CHOICE':
        return const Color(0xFFF0932B);
      case 'AI_TRAINING':
        return const Color(0xFF6B46C1);
      default:
        return Colors.grey;
    }
  }

  String _getModeLabel(String? mode) {
    final l10n = AppLocalizations.of(context)!;
    switch (mode) {
      case 'TEXT_INPUT':
        return l10n.textInput;
      case 'MULTIPLE_CHOICE':
        return l10n.multipleChoice;
      case 'AI_TRAINING':
        return l10n.aiTraining;
      default:
        return mode ?? 'Unknown';
    }
  }

  List<Map<String, dynamic>> _applyFilters(List<Map<String, dynamic>> trainings) {
    var filtered = trainings;

    // Filter by name search
    final query = _searchController.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      filtered = filtered.where((t) {
        final name = (t['name'] as String? ?? '').toLowerCase();
        return name.contains(query);
      }).toList();
    }

    // Filter by mode
    if (_selectedMode != null) {
      filtered = filtered.where((t) => t['mode'] == _selectedMode).toList();
    }

    // Filter by vocabulary list
    if (_selectedListId != null) {
      filtered = filtered.where((t) {
        final ids = (t['vocabularyListIds'] as List<dynamic>?) ?? [];
        return ids.contains(_selectedListId);
      }).toList();
    }

    return filtered;
  }

  bool get _hasActiveFilters =>
      _searchController.text.trim().isNotEmpty ||
      _selectedMode != null ||
      _selectedListId != null;

  void _clearFilters() {
    setState(() {
      _searchController.clear();
      _selectedMode = null;
      _selectedListId = null;
      _filterResetKey++;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(_adminMode ? 'Admin Mode' : l10n.myTrainings),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: Icon(_adminMode ? Icons.admin_panel_settings : Icons.admin_panel_settings_outlined),
            tooltip: 'Toggle admin mode',
            onPressed: () => setState(() => _adminMode = !_adminMode),
          ),
        ],
      ),
      body: Consumer<TrainingProvider>(
        builder: (context, trainingProvider, _) {
          if (trainingProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (trainingProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(l10n.errorLoadingTrainings, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  Text(
                    trainingProvider.error!,
                    style: const TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => trainingProvider.loadTrainings(),
                    icon: const Icon(Icons.refresh),
                    label: Text(l10n.retry),
                  ),
                ],
              ),
            );
          }

          if (trainingProvider.trainings.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.quiz_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(l10n.noTrainingsYet, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  Text(
                    l10n.createFirstTraining,
                    style: TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => context.go('/trainings/create'),
                    icon: const Icon(Icons.add),
                    label: Text(l10n.createTraining),
                    style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                  ),
                ],
              ),
            );
          }

          final filtered = _applyFilters(trainingProvider.trainings);

          return Column(
            children: [
              _buildFilterBar(),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () => trainingProvider.loadTrainings(),
                  child: filtered.isEmpty
                      ? ListView(
                          children: [
                            const SizedBox(height: 80),
                            Center(
                              child: Column(
                                children: [
                                  Icon(Icons.filter_list_off, size: 48, color: Colors.grey.shade400),
                                  const SizedBox(height: 12),
                                  Text(l10n.noTrainingsMatchFilters, style: const TextStyle(color: Colors.grey)),
                                  const SizedBox(height: 12),
                                  TextButton(onPressed: _clearFilters, child: Text(l10n.clearFilters)),
                                ],
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16.0),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) => _buildTrainingCard(filtered[index]),
                        ),
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.go('/trainings/create'),
        tooltip: 'Create Training',
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildFilterBar() {
    final vocabLists = context.watch<VocabularyProvider>().vocabularyLists;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        children: [
          // Search field
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search by name...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () => setState(() => _searchController.clear()),
                    )
                  : null,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 8),
          // Mode + List dropdowns
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  key: ValueKey('mode_$_filterResetKey'),
                  initialValue: _selectedMode,
                  isExpanded: true,
                  decoration: InputDecoration(
                    labelText: 'Mode',
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: const [
                    DropdownMenuItem(value: null, child: Text('All modes')),
                    DropdownMenuItem(value: 'TEXT_INPUT', child: Text('Text Input')),
                    DropdownMenuItem(value: 'MULTIPLE_CHOICE', child: Text('Multiple Choice')),
                    DropdownMenuItem(value: 'AI_TRAINING', child: Text('AI Training')),
                  ],
                  onChanged: (v) => setState(() => _selectedMode = v),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonFormField<String>(
                  key: ValueKey('list_$_filterResetKey'),
                  initialValue: _selectedListId,
                  isExpanded: true,
                  decoration: InputDecoration(
                    labelText: 'List',
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: [
                    DropdownMenuItem<String>(value: null, child: Text('All lists')),
                    ...vocabLists.map((l) => DropdownMenuItem<String>(
                          value: l['id'] as String,
                          child: Text(
                            l['title'] as String? ?? 'Untitled',
                            overflow: TextOverflow.ellipsis,
                          ),
                        )),
                  ],
                  onChanged: (v) => setState(() => _selectedListId = v),
                ),
              ),
            ],
          ),
          if (_hasActiveFilters) ...[
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: _clearFilters,
                icon: const Icon(Icons.clear_all, size: 16),
                label: const Text('Clear filters', style: TextStyle(fontSize: 12)),
                style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _confirmForceRemove(Map<String, dynamic> training) {
    final name = training['name'] as String? ?? 'Untitled Training';
    final id = training['id'] as String;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppLocalizations.of(context)!.forceRemoveTraining),
        content: Text(AppLocalizations.of(context)!.forceRemoveConfirm(name)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(AppLocalizations.of(context)!.cancel)),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<TrainingProvider>().forceRemoveTraining(id);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(AppLocalizations.of(context)!.removedTraining(name))),
              );
            },
            child: const Text('Remove', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Widget _buildTrainingCard(Map<String, dynamic> training) {
    final name = training['name'] as String? ?? 'Untitled Training';
    final mode = training['mode'] as String?;
    final words = (training['words'] as List<dynamic>?) ?? [];
    final executions = (training['executions'] as List<dynamic>?) ?? [];
    final vocabularyListIds = (training['vocabularyListIds'] as List<dynamic>?) ?? [];
    final isRandomized = training['isRandomized'] as bool? ?? false;
    final randomizedWordCount = training['randomizedWordCount'] as int?;

    final vocabLists = context.read<VocabularyProvider>().vocabularyLists;
    final matchedLists = vocabularyListIds
        .map((id) => vocabLists.where((l) => l['id'] == id).firstOrNull)
        .whereType<Map<String, dynamic>>()
        .toList();
    final listNames = matchedLists
        .map((l) => l['title'] as String? ?? 'Unknown list')
        .toList();

    final sourceLangs = matchedLists
        .map((l) => l['sourceLanguage'] as String?)
        .whereType<String>()
        .toSet();
    final targetLangs = matchedLists
        .map((l) => l['targetLanguage'] as String?)
        .whereType<String>()
        .toSet();
    final langPair = formatLanguagePair(
      sourceLangs.length == 1 ? sourceLangs.first : null,
      targetLangs.length == 1 ? targetLangs.first : null,
    );

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getModeColor(mode).withValues(alpha: 0.15),
          child: Icon(
            mode == 'MULTIPLE_CHOICE'
                ? Icons.checklist
                : mode == 'AI_TRAINING'
                    ? Icons.psychology
                    : Icons.keyboard,
            color: _getModeColor(mode),
          ),
        ),
        title: Row(
          children: [
            Flexible(
              child: Text(
                name,
                style: const TextStyle(fontWeight: FontWeight.bold),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (isRandomized) ...[
              const SizedBox(width: 6),
              Tooltip(
                message: 'Randomized training',
                child: Icon(Icons.shuffle, size: 16, color: Colors.grey.shade600),
              ),
            ],
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                Chip(
                  label: Text(
                    _getModeLabel(mode),
                    style: TextStyle(fontSize: 11, color: _getModeColor(mode)),
                  ),
                  backgroundColor: _getModeColor(mode).withValues(alpha: 0.1),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            if (listNames.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  if (langPair != null) ...[
                    Text(langPair, style: const TextStyle(fontSize: 13)),
                    const SizedBox(width: 8),
                  ],
                  Flexible(
                    child: Text(
                      listNames.join(', '),
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 4),
            Text(
              isRandomized
                  ? '${randomizedWordCount ?? 10} random words - ${executions.length} executions'
                  : '${words.length} words - ${executions.length} executions',
              style: const TextStyle(color: Colors.grey),
            ),
          ],
        ),
        trailing: _adminMode
            ? IconButton(
                icon: const Icon(Icons.delete_forever, color: Colors.red),
                tooltip: 'Force remove',
                onPressed: () => _confirmForceRemove(training),
              )
            : const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: _adminMode ? null : () => context.go('/trainings/${training['id']}'),
      ),
    );
  }
}
