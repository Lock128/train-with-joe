import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/vocabulary_provider.dart';
import '../providers/training_provider.dart';
import '../utils/language_flags.dart';
import '../l10n/generated/app_localizations.dart';

/// Screen for creating a new training from vocabulary lists
class TrainingCreationScreen extends StatefulWidget {
  const TrainingCreationScreen({super.key});

  @override
  State<TrainingCreationScreen> createState() => _TrainingCreationScreenState();
}

class _TrainingCreationScreenState extends State<TrainingCreationScreen> {
  final Set<String> _selectedListIds = {};
  String _selectedMode = 'MULTIPLE_CHOICE';
  String _selectedDirection = 'WORD_TO_TRANSLATION';
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  bool _listsLoaded = false;
  int _wordCount = 20;
  bool _isRandomized = false;
  int _multipleChoiceOptionCount = 5;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadVocabularyLists();
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadVocabularyLists() async {
    final provider = context.read<VocabularyProvider>();
    await Future.wait([
      provider.loadVocabularyLists(),
      provider.loadPublicVocabularyLists(),
    ]);
    if (mounted) {
      setState(() {
        _listsLoaded = true;
      });
    }
  }

  Future<void> _createTraining() async {
    if (_selectedListIds.isEmpty) return;

    final trainingProvider = context.read<TrainingProvider>();
    final name = _nameController.text.trim().isNotEmpty
        ? _nameController.text.trim()
        : null;

    final training = await trainingProvider.createTraining(
      _selectedListIds.toList(),
      _selectedMode,
      name,
      wordCount: _wordCount,
      direction: _selectedDirection,
      isRandomized: _isRandomized ? true : null,
      randomizedWordCount: _isRandomized ? _wordCount : null,
      multipleChoiceOptionCount: _selectedMode == 'MULTIPLE_CHOICE' ? _multipleChoiceOptionCount : null,
    );

    if (!mounted) return;

    if (training != null) {
      context.go('/trainings/${training['id']}');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(trainingProvider.error ?? 'Failed to create training'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Widget _buildListTile(Map<String, dynamic> list, {required bool isPublic}) {
    final id = list['id'] as String;
    final title = list['title'] as String? ?? 'Untitled List';
    final words = (list['words'] as List<dynamic>?) ?? [];
    final publisher = list['publisher'] as String?;
    final schoolForm = list['schoolForm'] as String?;
    final grade = list['grade'] as String?;
    final isbn = list['isbn'] as String?;
    final sourceLang = list['sourceLanguage'] as String?;
    final targetLang = list['targetLanguage'] as String?;

    final langPair = formatLanguagePair(sourceLang, targetLang);
    final metaParts = <String>[AppLocalizations.of(context)!.nWords(words.length)];
    if (langPair != null) metaParts.add(langPair);
    if (publisher != null && publisher.isNotEmpty) metaParts.add(publisher);
    if (schoolForm != null && schoolForm.isNotEmpty) metaParts.add(schoolForm);
    if (grade != null && grade.isNotEmpty) metaParts.add('Klasse $grade');
    if (isbn != null && isbn.isNotEmpty) metaParts.add('ISBN: $isbn');

    return CheckboxListTile(
      title: Text(title),
      subtitle: Text(
        metaParts.join(' · '),
        style: const TextStyle(fontSize: 12),
      ),
      secondary: isPublic ? const Icon(Icons.public, size: 20, color: Colors.grey) : null,
      value: _selectedListIds.contains(id),
      onChanged: (checked) {
        setState(() {
          if (checked == true) {
            _selectedListIds.add(id);
          } else {
            _selectedListIds.remove(id);
          }
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.createTraining),
      ),
      body: Consumer2<VocabularyProvider, TrainingProvider>(
        builder: (context, vocabProvider, trainingProvider, _) {
          if (vocabProvider.isLoading && !_listsLoaded) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (vocabProvider.error != null && !_listsLoaded) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    l10n.errorLoadingVocabularyLists,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    vocabProvider.error!,
                    style: const TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _loadVocabularyLists,
                    icon: const Icon(Icons.refresh),
                    label: Text(l10n.retry),
                  ),
                ],
              ),
            );
          }

          final myLists = vocabProvider.vocabularyLists;
          // Public lists that the user doesn't own
          final myListIds = myLists.map((l) => l['id'] as String).toSet();
          final publicLists = vocabProvider.publicVocabularyLists
              .where((l) => !myListIds.contains(l['id'] as String))
              .toList();
          final allLists = [...myLists, ...publicLists];

          // Filter lists by search query
          bool matchesSearch(Map<String, dynamic> list) {
            if (_searchQuery.isEmpty) return true;
            final q = _searchQuery.toLowerCase();
            final fields = [
              list['title'] as String?,
              list['publisher'] as String?,
              list['schoolForm'] as String?,
              list['grade'] as String?,
              list['isbn'] as String?,
              list['sourceLanguage'] as String?,
              list['targetLanguage'] as String?,
            ];
            return fields.any((f) => f != null && f.toLowerCase().contains(q));
          }

          final filteredMyLists = myLists.where(matchesSearch).toList();
          final filteredPublicLists = publicLists.where(matchesSearch).toList();

          if (allLists.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.library_books, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    l10n.noVocabularyListsAvailable,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.createVocabularyListsFirst,
                    style: TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => context.go('/vocabulary/analyze'),
                    icon: const Icon(Icons.camera_alt),
                    label: Text(l10n.analyzeAnImage),
                  ),
                ],
              ),
            );
          }

          // Count total words across selected lists
          final totalWords = allLists
              .where((l) => _selectedListIds.contains(l['id'] as String))
              .fold<int>(0, (sum, l) => sum + ((l['words'] as List<dynamic>?)?.length ?? 0));
          final effectiveMax = totalWords > 100 ? 100 : (totalWords > 0 ? totalWords : 1);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Name field
                TextField(
                  controller: _nameController,
                  decoration: InputDecoration(
                    labelText: l10n.trainingName,
                    border: const OutlineInputBorder(),
                    hintText: l10n.enterTrainingName,
                  ),
                ),
                const SizedBox(height: 24),

                // Mode selector
                Text(
                  l10n.trainingMode,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: Text(l10n.textInput),
                      selected: _selectedMode == 'TEXT_INPUT',
                      selectedColor: const Color(0xFF2B6CB0).withValues(alpha: 0.2),
                      onSelected: (_) => setState(() => _selectedMode = 'TEXT_INPUT'),
                    ),
                    ChoiceChip(
                      label: Text(l10n.multipleChoice),
                      selected: _selectedMode == 'MULTIPLE_CHOICE',
                      selectedColor: const Color(0xFFF0932B).withValues(alpha: 0.2),
                      onSelected: (_) => setState(() => _selectedMode = 'MULTIPLE_CHOICE'),
                    ),
                    ChoiceChip(
                      label: Text(l10n.aiTraining),
                      selected: _selectedMode == 'AI_TRAINING',
                      selectedColor: const Color(0xFF6B46C1).withValues(alpha: 0.2),
                      onSelected: (_) => setState(() => _selectedMode = 'AI_TRAINING'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Multiple choice option count selector
                if (_selectedMode == 'MULTIPLE_CHOICE') ...[
                  const Text(
                    'Number of Choices',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [3, 4, 5].map((count) {
                      return ChoiceChip(
                        label: Text('$count'),
                        selected: _multipleChoiceOptionCount == count,
                        selectedColor: const Color(0xFFF0932B).withValues(alpha: 0.2),
                        onSelected: (_) => setState(() => _multipleChoiceOptionCount = count),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                ],

                // Direction selector
                Text(
                  l10n.trainingDirection,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Flexible(
                      child: ChoiceChip(
                        label: Text(l10n.wordToTranslation),
                        selected: _selectedDirection == 'WORD_TO_TRANSLATION',
                        selectedColor: const Color(0xFF38A169).withValues(alpha: 0.2),
                        onSelected: (_) => setState(() => _selectedDirection = 'WORD_TO_TRANSLATION'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: ChoiceChip(
                        label: Text(l10n.translationToWord),
                        selected: _selectedDirection == 'TRANSLATION_TO_WORD',
                        selectedColor: const Color(0xFF805AD5).withValues(alpha: 0.2),
                        onSelected: (_) => setState(() => _selectedDirection = 'TRANSLATION_TO_WORD'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Vocabulary lists
                Text(
                  l10n.yourVocabularyLists,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                // Search bar
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    labelText: l10n.searchLists,
                    hintText: l10n.searchListsHint,
                    border: const OutlineInputBorder(),
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              setState(() {
                                _searchController.clear();
                                _searchQuery = '';
                              });
                            },
                          )
                        : null,
                  ),
                  onChanged: (value) {
                    setState(() => _searchQuery = value.trim());
                  },
                ),
                const SizedBox(height: 8),
                if (filteredMyLists.isEmpty && _searchQuery.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: Text(
                      l10n.noListsYet,
                      style: const TextStyle(color: Colors.grey),
                    ),
                  ),
                if (filteredMyLists.isEmpty && _searchQuery.isNotEmpty && filteredPublicLists.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: Text(
                      l10n.noListsMatchSearch,
                      style: const TextStyle(color: Colors.grey),
                    ),
                  ),
                ...filteredMyLists.map((list) => _buildListTile(list, isPublic: false)),
                if (filteredPublicLists.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  Text(
                    l10n.publicVocabularyLists,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  ...filteredPublicLists.map((list) => _buildListTile(list, isPublic: true)),
                ],
                const SizedBox(height: 16),

                // Word count selector
                if (_selectedListIds.isNotEmpty) ...[
                  Text(
                    _selectedMode == 'AI_TRAINING'
                        ? 'Number of Questions: $_wordCount'
                        : l10n.numberOfWords(_wordCount),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    totalWords > 100
                        ? l10n.maxWordsPicked(totalWords)
                        : l10n.wordsAvailable(totalWords),
                    style: const TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                  Slider(
                    value: _wordCount.clamp(1, effectiveMax).toDouble(),
                    min: 1,
                    max: effectiveMax.toDouble(),
                    divisions: effectiveMax > 1 ? effectiveMax - 1 : 1,
                    label: _wordCount.toString(),
                    onChanged: (value) {
                      setState(() {
                        _wordCount = value.round();
                      });
                    },
                  ),
                  const SizedBox(height: 8),
                ],

                // Randomized mode toggle
                if (_selectedListIds.isNotEmpty) ...[
                  SwitchListTile(
                    title: Text(l10n.randomizedMode),
                    subtitle: Text(
                      _selectedMode == 'AI_TRAINING'
                          ? 'Pick different questions each time you start this training'
                          : l10n.randomizedModeDescription,
                    ),
                    value: _isRandomized,
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) {
                      setState(() {
                        _isRandomized = value;
                      });
                    },
                  ),
                  const SizedBox(height: 24),
                ],

                // Create button
                ElevatedButton(
                  onPressed: _selectedListIds.isEmpty || trainingProvider.isLoading
                      ? null
                      : _createTraining,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.all(16),
                  ),
                  child: trainingProvider.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(l10n.createTraining),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
