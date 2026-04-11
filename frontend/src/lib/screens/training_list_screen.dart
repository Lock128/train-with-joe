import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/training_provider.dart';
import '../providers/vocabulary_provider.dart';
import '../utils/language_flags.dart';

/// Screen for viewing all user trainings
class TrainingListScreen extends StatefulWidget {
  const TrainingListScreen({super.key});

  @override
  State<TrainingListScreen> createState() => _TrainingListScreenState();
}

class _TrainingListScreenState extends State<TrainingListScreen> {
  bool _adminMode = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TrainingProvider>().loadTrainings();
    });
  }

  Color _getModeColor(String? mode) {
    switch (mode) {
      case 'TEXT_INPUT':
        return const Color(0xFF2B6CB0);
      case 'MULTIPLE_CHOICE':
        return const Color(0xFFF0932B);
      default:
        return Colors.grey;
    }
  }

  String _getModeLabel(String? mode) {
    switch (mode) {
      case 'TEXT_INPUT':
        return 'Text Input';
      case 'MULTIPLE_CHOICE':
        return 'Multiple Choice';
      default:
        return mode ?? 'Unknown';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_adminMode ? 'Admin Mode' : 'My Trainings'),
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
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (trainingProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading trainings',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
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
                    label: const Text('Retry'),
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
                  const Icon(
                    Icons.quiz_outlined,
                    size: 64,
                    color: Colors.grey,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No trainings yet',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Create a training from your vocabulary lists!',
                    style: TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => context.go('/trainings/create'),
                    icon: const Icon(Icons.add),
                    label: const Text('Create Training'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => trainingProvider.loadTrainings(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: trainingProvider.trainings.length,
              itemBuilder: (context, index) {
                final training = trainingProvider.trainings[index];
                return _buildTrainingCard(training);
              },
            ),
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

  void _confirmForceRemove(Map<String, dynamic> training) {
    final name = training['name'] as String? ?? 'Untitled Training';
    final id = training['id'] as String;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Force Remove Training'),
        content: Text('Remove "$name" from the list? This will also attempt to delete it from the server.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<TrainingProvider>().forceRemoveTraining(id);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Removed "$name"')),
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

    // Derive language pair from linked vocabulary lists
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
            mode == 'MULTIPLE_CHOICE' ? Icons.checklist : Icons.keyboard,
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
                child: Icon(
                  Icons.shuffle,
                  size: 16,
                  color: Colors.grey.shade600,
                ),
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
                    style: TextStyle(
                      fontSize: 11,
                      color: _getModeColor(mode),
                    ),
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
                    Text(
                      langPair,
                      style: const TextStyle(fontSize: 13),
                    ),
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
