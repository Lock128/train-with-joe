import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../domain/models/vocabulary_list.dart';
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
    final colorScheme = Theme.of(context).colorScheme;

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
                    Text(l10n.errorLoadingVocabularyLists,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Text(vocabularyProvider.error!,
                        style: TextStyle(color: colorScheme.onSurfaceVariant),
                        textAlign: TextAlign.center),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: () => vocabularyProvider.loadVocabularyLists(),
                      icon: const Icon(Icons.refresh_rounded),
                      label: Text(l10n.retry),
                    ),
                  ],
                ),
              ),
            );
          }

          if (vocabularyProvider.vocabularyLists.isEmpty) {
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
                      child: Icon(Icons.library_books_rounded, size: 48, color: colorScheme.primary),
                    ),
                    const SizedBox(height: 20),
                    Text(l10n.noVocabularyListsYet,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Text(
                        l10n.analyzeImageToCreate,
                        style: TextStyle(color: colorScheme.onSurfaceVariant),
                        textAlign: TextAlign.center),
                    const SizedBox(height: 28),
                    FilledButton.icon(
                      onPressed: () => context.go('/vocabulary/analyze'),
                      icon: const Icon(Icons.camera_alt_rounded),
                      label: Text(l10n.analyzeAnImage),
                    ),
                  ],
                ),
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
        tooltip: l10n.analyzeImage,
        child: const Icon(Icons.camera_alt_rounded),
      ),
    );
  }

  Widget _buildListCard(VocabularyList list) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final title = list.title;
    final sourceLang = list.sourceLanguage;
    final targetLang = list.targetLanguage;
    final createdAt = list.createdAt?.toIso8601String();
    final words = list.words;
    final isPublic = list.isPublic;
    final status = list.status;

    final langPair = formatLanguagePair(sourceLang, targetLang);

    final subtitleParts = <String>[l10n.nWords(words.length)];
    if (langPair != null) subtitleParts.add(langPair);
    if (createdAt != null) subtitleParts.add(_formatDate(createdAt));

    Color statusColor;
    IconData statusIcon;
    if (status == VocabularyListStatus.failed) {
      statusColor = Colors.red.shade400;
      statusIcon = Icons.error_outline_rounded;
    } else if (status == VocabularyListStatus.processing) {
      statusColor = Colors.orange.shade400;
      statusIcon = Icons.hourglass_top_rounded;
    } else {
      statusColor = colorScheme.primary;
      statusIcon = Icons.list_alt_rounded;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: () => context.go('/vocabulary/${list.id}'),
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(14.0),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(statusIcon, color: statusColor, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(title,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                                overflow: TextOverflow.ellipsis),
                          ),
                          if (isPublic) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF6C5CE7).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Icon(Icons.public_rounded, size: 12, color: Color(0xFF6C5CE7)),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(subtitleParts.join(' · '),
                          style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13)),
                      if (status == VocabularyListStatus.processing)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(l10n.statusAnalyzing,
                              style: TextStyle(color: Colors.orange.shade600, fontSize: 12, fontWeight: FontWeight.w500)),
                        ),
                      if (status == VocabularyListStatus.failed)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(l10n.statusFailed,
                              style: TextStyle(color: Colors.red.shade600, fontSize: 12, fontWeight: FontWeight.w500)),
                        ),
                    ],
                  ),
                ),
                Icon(Icons.arrow_forward_ios_rounded, size: 14, color: colorScheme.onSurfaceVariant.withValues(alpha: 0.4)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
