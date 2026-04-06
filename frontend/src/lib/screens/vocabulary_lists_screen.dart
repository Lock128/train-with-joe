import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/vocabulary_provider.dart';

/// Screen for viewing all saved vocabulary lists
class VocabularyListsScreen extends StatefulWidget {
  const VocabularyListsScreen({super.key});

  @override
  State<VocabularyListsScreen> createState() => _VocabularyListsScreenState();
}

class _VocabularyListsScreenState extends State<VocabularyListsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VocabularyProvider>().loadVocabularyLists();
    });
  }

  Color _getDifficultyColor(String? difficulty) {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return Colors.green;
      case 'medium':
        return Colors.orange;
      case 'hard':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(String? isoDate) {
    if (isoDate == null) return '';
    try {
      final date = DateTime.parse(isoDate);
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    } catch (e) {
      return isoDate;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Vocabulary Lists'),
        automaticallyImplyLeading: false,
      ),
      body: Consumer<VocabularyProvider>(
        builder: (context, vocabularyProvider, _) {
          if (vocabularyProvider.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (vocabularyProvider.error != null) {
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
                    'Error loading vocabulary lists',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    vocabularyProvider.error!,
                    style: const TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => vocabularyProvider.loadVocabularyLists(),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (vocabularyProvider.vocabularyLists.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.library_books,
                    size: 64,
                    color: Colors.grey,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No vocabulary lists yet',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Analyze an image to create your first vocabulary list!',
                    style: TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => context.go('/vocabulary/analyze'),
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Analyze an Image'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => vocabularyProvider.loadVocabularyLists(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: vocabularyProvider.vocabularyLists.length,
              itemBuilder: (context, index) {
                final list = vocabularyProvider.vocabularyLists[index];
                return _buildListTile(list);
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.go('/vocabulary/analyze'),
        tooltip: 'Analyze Image',
        child: const Icon(Icons.camera_alt),
      ),
    );
  }

  void _showRenameDialog(BuildContext context, Map<String, dynamic> list) {
    final currentTitle = list['title'] as String? ?? '';
    final controller = TextEditingController(text: currentTitle);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rename Vocabulary List'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'New title',
            border: OutlineInputBorder(),
          ),
          onSubmitted: (value) {
            if (value.trim().isNotEmpty) {
              Navigator.of(ctx).pop();
              context.read<VocabularyProvider>().renameVocabularyList(
                list['id'] as String,
                value.trim(),
              );
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              final value = controller.text.trim();
              if (value.isNotEmpty) {
                Navigator.of(ctx).pop();
                context.read<VocabularyProvider>().renameVocabularyList(
                  list['id'] as String,
                  value,
                );
              }
            },
            child: const Text('Rename'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, Map<String, dynamic> list) {
    final title = list['title'] as String? ?? 'Untitled List';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Vocabulary List'),
        content: Text('Are you sure you want to delete "$title"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.read<VocabularyProvider>().deleteVocabularyList(list['id'] as String);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Widget _buildListTile(Map<String, dynamic> list) {
    final title = list['title'] as String? ?? 'Untitled List';
    final sourceLang = list['sourceLanguage'] as String?;
    final targetLang = list['targetLanguage'] as String?;
    final createdAt = list['createdAt'] as String?;
    final words = (list['words'] as List<dynamic>?) ?? [];

    final subtitleParts = <String>['${words.length} words'];
    if (sourceLang != null && targetLang != null && sourceLang != targetLang) {
      subtitleParts.add('$sourceLang → $targetLang');
    } else if (sourceLang != null) {
      subtitleParts.add(sourceLang);
    }
    if (createdAt != null) subtitleParts.add(_formatDate(createdAt));

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          child: const Icon(Icons.list_alt),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          subtitleParts.join(' - '),
          style: const TextStyle(color: Colors.grey),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Rename list',
              onPressed: () => _showRenameDialog(context, list),
            ),
            IconButton(
              icon: const Icon(Icons.download),
              tooltip: 'Export as text',
              onPressed: () =>
                  context.read<VocabularyProvider>().exportAsText(list),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Delete list',
              onPressed: () => _confirmDelete(context, list),
            ),
          ],
        ),
        children: words.map((wordData) {
          final word = wordData as Map<String, dynamic>;
          return _buildWordListTile(word);
        }).toList(),
      ),
    );
  }

  Widget _buildWordListTile(Map<String, dynamic> word) {
    final wordText = word['word'] as String? ?? '';
    final translation = word['translation'] as String?;
    final definition = word['definition'] as String? ?? '';
    final partOfSpeech = word['partOfSpeech'] as String?;
    final difficulty = word['difficulty'] as String?;
    final unit = word['unit'] as String?;

    return ListTile(
      title: Row(
        children: [
          Text(
            wordText,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          if (translation != null && translation.isNotEmpty) ...[
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 6),
              child: Icon(Icons.arrow_forward, size: 14, color: Colors.grey),
            ),
            Flexible(
              child: Text(
                translation,
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF2B6CB0),
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(definition),
          if (unit != null && unit.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                unit,
                style: TextStyle(fontSize: 11, color: Colors.blueGrey.shade600),
              ),
            ),
        ],
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (partOfSpeech != null)
            Chip(
              label: Text(
                partOfSpeech,
                style: const TextStyle(fontSize: 11),
              ),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
            ),
          if (difficulty != null) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 8,
                vertical: 4,
              ),
              decoration: BoxDecoration(
                color: _getDifficultyColor(difficulty),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                difficulty,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
