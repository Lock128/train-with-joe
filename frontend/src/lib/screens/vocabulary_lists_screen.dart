import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/vocabulary_provider.dart';
import '../utils/language_flags.dart';
import '../l10n/generated/app_localizations.dart';

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
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.myVocabularyLists),
        automaticallyImplyLeading: false,
      ),
      body: Consumer<VocabularyProvider>(
        builder: (context, vocabularyProvider, _) {
          if (vocabularyProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (vocabularyProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(l10n.errorLoadingVocabularyLists,
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  Text(vocabularyProvider.error!,
                      style: const TextStyle(color: Colors.grey),
                      textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => vocabularyProvider.loadVocabularyLists(),
                    icon: const Icon(Icons.refresh),
                    label: Text(l10n.retry),
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
                  const Icon(Icons.library_books, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(l10n.noVocabularyListsYet,
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  Text(
                      l10n.analyzeImageToCreate,
                      style: TextStyle(color: Colors.grey),
                      textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => context.go('/vocabulary/analyze'),
                    icon: const Icon(Icons.camera_alt),
                    label: Text(l10n.analyzeAnImage),
                    style:
                        ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
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
                return _buildListCard(list);
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

  Widget _buildListCard(Map<String, dynamic> list) {
    final l10n = AppLocalizations.of(context)!;
    final title = list['title'] as String? ?? 'Untitled List';
    final sourceLang = list['sourceLanguage'] as String?;
    final targetLang = list['targetLanguage'] as String?;
    final createdAt = list['createdAt'] as String?;
    final words = (list['words'] as List<dynamic>?) ?? [];
    final isPublic = list['isPublic'] == true;
    final status = list['status'] as String?;

    final langPair = formatLanguagePair(sourceLang, targetLang);

    final subtitleParts = <String>[l10n.nWords(words.length)];
    if (langPair != null) subtitleParts.add(langPair);
    if (createdAt != null) subtitleParts.add(_formatDate(createdAt));

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: status == 'FAILED'
              ? Colors.red.shade100
              : status == 'PENDING'
                  ? Colors.orange.shade100
                  : status == 'PARTIALLY_COMPLETED'
                      ? Colors.amber.shade100
                      : Theme.of(context).colorScheme.primaryContainer,
          child: status == 'FAILED'
              ? Icon(Icons.error_outline, color: Colors.red.shade700)
              : status == 'PENDING'
                  ? Icon(Icons.hourglass_top, color: Colors.orange.shade700)
                  : status == 'PARTIALLY_COMPLETED'
                      ? Icon(Icons.warning_amber_rounded, color: Colors.amber.shade800)
                      : const Icon(Icons.list_alt),
        ),
        title: Row(
          children: [
            Flexible(
              child: Text(title,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis),
            ),
            if (isPublic) ...[
              const SizedBox(width: 6),
              const Icon(Icons.public, size: 16, color: Color(0xFF6C5CE7)),
            ],
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(subtitleParts.join(' · '),
                style: const TextStyle(color: Colors.grey)),
            if (status == 'PENDING')
              Text(l10n.statusAnalyzing,
                  style: TextStyle(color: Colors.orange.shade700, fontSize: 12)),
            if (status == 'FAILED')
              Text(l10n.statusFailed,
                  style: TextStyle(color: Colors.red.shade700, fontSize: 12)),
            if (status == 'PARTIALLY_COMPLETED')
              Text(l10n.statusPartiallyCompleted,
                  style: TextStyle(color: Colors.amber.shade800, fontSize: 12)),
          ],
        ),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: () => context.go('/vocabulary/${list['id']}'),
      ),
    );
  }
}
