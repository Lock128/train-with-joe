import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../domain/models/training.dart';
import '../domain/models/vocabulary_list.dart';
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
      case 'VERB_CONJUGATION':
        return const Color(0xFF2D9CDB);
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
      case 'VERB_CONJUGATION':
        return 'Irregular Verbs';
      default:
        return mode ?? 'Unknown';
    }
  }

  List<Training> _applyFilters(List<Training> trainings) {
    var filtered = trainings;

    // Filter by name search
    final query = _searchController.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      filtered = filtered.where((t) {
        final name = (t.name ?? '').toLowerCase();
        return name.contains(query);
      }).toList();
    }

    // Filter by mode
    if (_selectedMode != null) {
      filtered = filtered.where((t) => t.mode.value == _selectedMode).toList();
    }

    // Filter by vocabulary list
    if (_selectedListId != null) {
      filtered = filtered.where((t) {
        return t.vocabularyListIds.contains(_selectedListId);
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
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(_adminMode ? 'Admin Mode' : l10n.myTrainings),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: Icon(
              _adminMode ? Icons.admin_panel_settings : Icons.admin_panel_settings_outlined,
              color: _adminMode ? colorScheme.primary : null,
            ),
            tooltip: l10n.toggleAdminMode,
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
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.cloud_off_rounded, size: 40, color: Colors.red.shade400),
                    ),
                    const SizedBox(height: 20),
                    Text(l10n.errorLoadingTrainings, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Text(
                      trainingProvider.error!,
                      style: TextStyle(color: colorScheme.onSurfaceVariant),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: () => trainingProvider.loadTrainings(),
                      icon: const Icon(Icons.refresh_rounded),
                      label: Text(l10n.retry),
                    ),
                  ],
                ),
              ),
            );
          }

          if (trainingProvider.trainings.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: colorScheme.primaryContainer.withValues(alpha: 0.3),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.quiz_rounded, size: 48, color: colorScheme.primary),
                    ),
                    const SizedBox(height: 20),
                    Text(l10n.noTrainingsYet, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Text(
                      l10n.createFirstTraining,
                      style: TextStyle(color: colorScheme.onSurfaceVariant),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 28),
                    FilledButton.icon(
                      onPressed: () => context.go('/trainings/create'),
                      icon: const Icon(Icons.add_rounded),
                      label: Text(l10n.createTraining),
                    ),
                  ],
                ),
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
                                  Icon(Icons.filter_list_off_rounded, size: 48, color: colorScheme.onSurfaceVariant.withValues(alpha: 0.4)),
                                  const SizedBox(height: 12),
                                  Text(l10n.noTrainingsMatchFilters, style: TextStyle(color: colorScheme.onSurfaceVariant)),
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
        tooltip: l10n.createTraining,
        child: const Icon(Icons.add_rounded),
      ),
    );
  }

  Widget _buildFilterBar() {
    final l10n = AppLocalizations.of(context)!;
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
                  items: [
                    DropdownMenuItem(value: null, child: Text(l10n.allModesFilter)),
                    DropdownMenuItem(value: 'TEXT_INPUT', child: Text(l10n.textInput)),
                    DropdownMenuItem(value: 'MULTIPLE_CHOICE', child: Text(l10n.multipleChoice)),
                    DropdownMenuItem(value: 'AI_TRAINING', child: Text(l10n.aiTraining)),
                    const DropdownMenuItem(value: 'VERB_CONJUGATION', child: Text('Irregular Verbs')),
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
                    DropdownMenuItem<String>(value: null, child: Text(l10n.allLists)),
                    ...vocabLists.map((l) => DropdownMenuItem<String>(
                          value: l.id,
                          child: Text(
                            l.title,
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
                label: Text(l10n.clearFilters, style: const TextStyle(fontSize: 12)),
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

  void _confirmForceRemove(Training training) {
    final l10n = AppLocalizations.of(context)!;
    final name = training.name ?? 'Untitled Training';
    final id = training.id;
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
            child: Text(l10n.remove, style: const TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Widget _buildTrainingCard(Training training) {
    final l10n = AppLocalizations.of(context)!;
    final name = training.name ?? 'Untitled Training';
    final mode = training.mode.value;
    final words = training.words;
    final executions = training.executions;
    final vocabularyListIds = training.vocabularyListIds;
    final isRandomized = training.isRandomized;
    final randomizedWordCount = training.randomizedWordCount;

    final vocabLists = context.read<VocabularyProvider>().vocabularyLists;
    final matchedLists = vocabularyListIds
        .map((id) => vocabLists.where((l) => l.id == id).firstOrNull)
        .whereType<VocabularyList>()
        .toList();
    final listNames = matchedLists
        .map((l) => l.title)
        .toList();

    final sourceLangs = matchedLists
        .map((l) => l.sourceLanguage)
        .whereType<String>()
        .toSet();
    final targetLangs = matchedLists
        .map((l) => l.targetLanguage)
        .whereType<String>()
        .toSet();
    final langPair = formatLanguagePair(
      sourceLangs.length == 1 ? sourceLangs.first : null,
      targetLangs.length == 1 ? targetLangs.first : null,
    );

    final colorScheme = Theme.of(context).colorScheme;
    final modeColor = _getModeColor(mode);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: _adminMode ? null : () => context.go('/trainings/${training.id}'),
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(14.0),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: modeColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    mode == 'MULTIPLE_CHOICE'
                        ? Icons.checklist_rounded
                        : mode == 'AI_TRAINING'
                            ? Icons.psychology_rounded
                            : mode == 'VERB_CONJUGATION'
                                ? Icons.spellcheck_rounded
                                : Icons.keyboard_rounded,
                    color: modeColor,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              name,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isRandomized) ...[
                            const SizedBox(width: 6),
                            Icon(Icons.shuffle_rounded, size: 14, color: colorScheme.onSurfaceVariant),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: modeColor.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              _getModeLabel(mode),
                              style: TextStyle(fontSize: 11, color: modeColor, fontWeight: FontWeight.w600),
                            ),
                          ),
                          if (langPair != null) ...[
                            const SizedBox(width: 8),
                            Text(langPair, style: TextStyle(fontSize: 12, color: colorScheme.onSurfaceVariant)),
                          ],
                        ],
                      ),
                      if (listNames.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          listNames.join(', '),
                          style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: 4),
                      Text(
                        isRandomized
                            ? '${randomizedWordCount ?? 10} random words · ${executions.length} runs'
                            : '${words.length} words · ${executions.length} runs',
                        style: TextStyle(color: colorScheme.onSurfaceVariant.withValues(alpha: 0.7), fontSize: 12),
                      ),
                    ],
                  ),
                ),
                if (_adminMode)
                  IconButton(
                    icon: const Icon(Icons.delete_forever_rounded, color: Colors.red),
                    tooltip: l10n.forceRemove,
                    onPressed: () => _confirmForceRemove(training),
                  )
                else
                  Icon(Icons.arrow_forward_ios_rounded, size: 14, color: colorScheme.onSurfaceVariant.withValues(alpha: 0.4)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
