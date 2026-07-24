import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../domain/models/vocabulary_list.dart';
import '../l10n/generated/app_localizations.dart';
import '../providers/vocabulary_provider.dart';

/// Detail screen for viewing and editing a single vocabulary list.
class VocabularyListDetailScreen extends StatefulWidget {
  final String listId;

  const VocabularyListDetailScreen({super.key, required this.listId});

  @override
  State<VocabularyListDetailScreen> createState() =>
      _VocabularyListDetailScreenState();
}

class _VocabularyListDetailScreenState
    extends State<VocabularyListDetailScreen> {
  VocabularyList? _list;
  bool _isLoading = true;
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  final List<String> _sourceImageUrls = [];
  bool _isImageExpanded = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _loadList();
  }

  void _loadList() {
    final provider = context.read<VocabularyProvider>();
    final match = provider.vocabularyLists
        .where((l) => l.id == widget.listId)
        .firstOrNull;
    if (match != null) {
      setState(() {
        _list = match;
        _isLoading = false;
      });
      _loadSourceImage(match);
    } else {
      provider.getVocabularyList(widget.listId).then((result) {
        if (mounted) {
          setState(() {
            _list = result;
            _isLoading = false;
          });
          if (result != null) _loadSourceImage(result);
        }
      });
    }
  }

  Future<void> _loadSourceImage(VocabularyList list) async {
    // sourceImageKeys and sourceImageKey are not part of the typed VocabularyList model.
    // This feature requires raw JSON data or a separate API call.
    // For now, source image loading is not available through the typed model.
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

  // ── Settings dialogs ──

  void _showRenameDialog() {
    final currentTitle = _list?.title ?? '';
    final controller = TextEditingController(text: currentTitle);
    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.renameList),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Title',
            border: OutlineInputBorder(),
          ),
          onSubmitted: (v) {
            if (v.trim().isNotEmpty) {
              Navigator.pop(ctx);
              _rename(v.trim());
            }
          },
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(l10n.cancel)),
          TextButton(
            onPressed: () {
              final v = controller.text.trim();
              if (v.isNotEmpty) {
                Navigator.pop(ctx);
                _rename(v);
              }
            },
            child: Text(l10n.save),
          ),
        ],
      ),
    );
  }

  Future<void> _rename(String newTitle) async {
    final ok = await context
        .read<VocabularyProvider>()
        .renameVocabularyList(widget.listId, newTitle);
    if (ok && mounted) {
      setState(() => _list = _list?.copyWith(title: newTitle));
    }
  }

  static const List<String> _supportedLanguages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Japanese',
    'Korean',
    'Chinese',
    'Latin',
  ];

  void _showLanguageDialog() {
    String? selectedSource = _list?.sourceLanguage;
    String? selectedTarget = _list?.targetLanguage;

    // Normalise current values: keep only if they match a supported language
    if (selectedSource != null &&
        !_supportedLanguages.contains(selectedSource)) {
      selectedSource = null;
    }
    if (selectedTarget != null &&
        !_supportedLanguages.contains(selectedTarget)) {
      selectedTarget = null;
    }

    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(l10n.languages),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String?>(
                initialValue: selectedSource,
                decoration: const InputDecoration(
                    labelText: 'Source language', border: OutlineInputBorder()),
                items: [
                  DropdownMenuItem<String?>(
                      value: null, child: Text(l10n.none)),
                  ..._supportedLanguages.map((lang) =>
                      DropdownMenuItem(value: lang, child: Text(lang))),
                ],
                onChanged: (value) =>
                    setDialogState(() => selectedSource = value),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String?>(
                initialValue: selectedTarget,
                decoration: const InputDecoration(
                    labelText: 'Target language', border: OutlineInputBorder()),
                items: [
                  DropdownMenuItem<String?>(
                      value: null, child: Text(l10n.none)),
                  ..._supportedLanguages.map((lang) =>
                      DropdownMenuItem(value: lang, child: Text(lang))),
                ],
                onChanged: (value) =>
                    setDialogState(() => selectedTarget = value),
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(l10n.cancel)),
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _updateLanguages(
                    selectedSource ?? '', selectedTarget ?? '');
              },
              child: Text(l10n.save),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateLanguages(String src, String tgt) async {
    final ok = await context.read<VocabularyProvider>().updateVocabularyList(
          widget.listId,
          sourceLanguage: src,
          targetLanguage: tgt,
        );
    if (ok && mounted) {
      setState(() {
        _list = _list?.copyWith(
          sourceLanguage: src.isNotEmpty ? src : null,
          targetLanguage: tgt.isNotEmpty ? tgt : null,
        );
      });
    }
  }

  static const List<String> _schoolForms = [
    'Grundschule',
    'Hauptschule',
    'Realschule',
    'Gymnasium',
    'Gesamtschule',
    'Berufsschule',
  ];

  void _showBookDetailsDialog() {
    final listJson = _list?.toJson() ?? {};
    final publisherCtrl =
        TextEditingController(text: listJson['publisher'] as String? ?? '');
    final isbnCtrl =
        TextEditingController(text: listJson['isbn'] as String? ?? '');
    final gradeCtrl =
        TextEditingController(text: listJson['grade'] as String? ?? '');
    String? selectedSchoolForm = listJson['schoolForm'] as String?;
    if (selectedSchoolForm != null &&
        !_schoolForms.contains(selectedSchoolForm)) {
      selectedSchoolForm = null;
    }

    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(l10n.bookDetails),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: publisherCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Publisher (Verlag)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String?>(
                  initialValue: selectedSchoolForm,
                  decoration: const InputDecoration(
                    labelText: 'School Form',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    DropdownMenuItem<String?>(
                        value: null, child: Text(l10n.none)),
                    ..._schoolForms.map((f) =>
                        DropdownMenuItem(value: f, child: Text(f))),
                  ],
                  onChanged: (value) =>
                      setDialogState(() => selectedSchoolForm = value),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: gradeCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Grade (Klasse)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: isbnCtrl,
                  decoration: const InputDecoration(
                    labelText: 'ISBN',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(l10n.cancel)),
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _updateBookDetails(
                  publisher: publisherCtrl.text.trim(),
                  schoolForm: selectedSchoolForm ?? '',
                  grade: gradeCtrl.text.trim(),
                  isbn: isbnCtrl.text.trim(),
                );
              },
              child: Text(l10n.save),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateBookDetails({
    required String publisher,
    required String schoolForm,
    required String grade,
    required String isbn,
  }) async {
    final ok = await context.read<VocabularyProvider>().updateVocabularyList(
          widget.listId,
          publisher: publisher,
          schoolForm: schoolForm,
          grade: grade,
          isbn: isbn,
        );
    if (ok && mounted) {
      // Book details are not on the VocabularyList typed model; reload list
      final updated = await context.read<VocabularyProvider>().getVocabularyList(widget.listId);
      if (updated != null && mounted) {
        setState(() => _list = updated);
      }
    }
  }

  void _togglePublic() {
    final isPublic = _list?.isPublic ?? false;
    context
        .read<VocabularyProvider>()
        .setVocabularyListPublic(widget.listId, !isPublic)
        .then((ok) {
      if (ok && mounted) setState(() => _list = _list?.copyWith(isPublic: !isPublic));
    });
  }

  void _confirmDelete() {
    final title = _list?.title ?? 'Untitled List';
    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.deleteList),
        content: Text(l10n.deleteListConfirm(title)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(l10n.cancel)),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context
                  .read<VocabularyProvider>()
                  .deleteVocabularyList(widget.listId);
              context.go('/vocabulary');
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(l10n.delete),
          ),
        ],
      ),
    );
  }

  // ── Word editing ──

  void _showEditWordDialog(int index) {
    final words = _list?.words ?? [];
    final word = words[index];
    final wordCtrl = TextEditingController(text: word.word);
    final transCtrl =
        TextEditingController(text: word.translation ?? '');
    final defCtrl =
        TextEditingController(text: word.definition ?? '');
    final unitCtrl =
        TextEditingController(text: word.unit ?? '');

    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.editWord),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                  controller: wordCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Word', border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(
                  controller: transCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Translation',
                      border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(
                  controller: defCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Definition',
                      border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(
                  controller: unitCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Unit', border: OutlineInputBorder())),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(l10n.cancel)),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _saveWord(index, {
                'word': wordCtrl.text.trim(),
                'translation': transCtrl.text.trim(),
                'definition': defCtrl.text.trim(),
                'unit': unitCtrl.text.trim(),
                if (word.partOfSpeech != null) 'partOfSpeech': word.partOfSpeech,
                if (word.exampleSentence != null) 'exampleSentence': word.exampleSentence,
                if (word.difficulty != null) 'difficulty': word.difficulty,
                if (word.flagged) 'flagged': true,
              });
            },
            child: Text(l10n.save),
          ),
        ],
      ),
    );
  }

  void _showAddWordDialog() {
    final wordCtrl = TextEditingController();
    final transCtrl = TextEditingController();
    final defCtrl = TextEditingController();
    final unitCtrl = TextEditingController();

    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.addWord),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                  controller: wordCtrl,
                  autofocus: true,
                  decoration: const InputDecoration(
                      labelText: 'Word', border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(
                  controller: transCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Translation',
                      border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(
                  controller: defCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Definition',
                      border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(
                  controller: unitCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Unit', border: OutlineInputBorder())),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(l10n.cancel)),
          TextButton(
            onPressed: () {
              if (wordCtrl.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              _addWord({
                'word': wordCtrl.text.trim(),
                'translation': transCtrl.text.trim(),
                'definition': defCtrl.text.trim(),
                'unit': unitCtrl.text.trim(),
              });
            },
            child: Text(l10n.add),
          ),
        ],
      ),
    );
  }

  Future<void> _saveWord(int index, Map<String, dynamic> updated) async {
    final words = (_list?.words ?? [])
        .map((w) => w.toJson())
        .toList();
    words[index] = updated;
    await _persistWords(words);
  }

  Future<void> _addWord(Map<String, dynamic> word) async {
    final words = (_list?.words ?? [])
        .map((w) => w.toJson())
        .toList();
    words.add(word);
    await _persistWords(words);
  }

  void _confirmDeleteWord(int index) {
    final words = _list?.words ?? [];
    final word = words[index];
    final wordText = word.word;
    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.deleteWord),
        content: Text(l10n.deleteWordConfirm(wordText)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(l10n.cancel)),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _deleteWord(index);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(l10n.delete),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteWord(int index) async {
    final words = (_list?.words ?? [])
        .map((w) => w.toJson())
        .toList();
    words.removeAt(index);
    await _persistWords(words);
  }

  Future<void> _persistWords(List<Map<String, dynamic>> words) async {
    // Strip null/empty optional fields to keep payload clean
    final cleaned = words
        .map((w) => <String, dynamic>{
              'word': w['word'] ?? '',
              'definition': w['definition'] ?? '',
              if ((w['translation'] as String?)?.isNotEmpty == true)
                'translation': w['translation'],
              if ((w['partOfSpeech'] as String?)?.isNotEmpty == true)
                'partOfSpeech': w['partOfSpeech'],
              if ((w['exampleSentence'] as String?)?.isNotEmpty == true)
                'exampleSentence': w['exampleSentence'],
              if ((w['difficulty'] as String?)?.isNotEmpty == true)
                'difficulty': w['difficulty'],
              if ((w['unit'] as String?)?.isNotEmpty == true)
                'unit': w['unit'],
              if (w['flagged'] == true)
                'flagged': true,
            })
        .toList();

    final ok = await context
        .read<VocabularyProvider>()
        .updateVocabularyList(widget.listId, words: cleaned);
    if (ok && mounted) {
      final updatedWords = cleaned.map((w) => VocabularyWord.fromJson(w)).toList();
      setState(() => _list = _list?.copyWith(words: updatedWords));
    }
  }

  // ── Search ──

  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _searchQuery = '';
      }
    });
  }

  bool _wordMatchesQuery(VocabularyWord word) {
    if (_searchQuery.isEmpty) return true;
    final q = _searchQuery.toLowerCase();
    final fields = [
      word.word,
      word.translation,
      word.definition,
      word.unit,
      word.partOfSpeech,
    ];
    return fields.any((f) => f != null && f.toLowerCase().contains(q));
  }

  /// Returns (filteredWord, originalIndex) pairs so edit/delete target the
  /// correct index in the full list.
  List<(VocabularyWord, int)> _getFilteredWords(List<VocabularyWord> allWords) {
    final result = <(VocabularyWord, int)>[];
    for (var i = 0; i < allWords.length; i++) {
      final w = allWords[i];
      if (_wordMatchesQuery(w)) result.add((w, i));
    }
    return result;
  }

  // ── Build ──

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.vocabularyList)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_list == null) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.vocabularyList)),
        body: Center(child: Text(l10n.listNotFound)),
      );
    }

    final title = _list!.title;
    final sourceLang = _list!.sourceLanguage;
    final targetLang = _list!.targetLanguage;
    final isPublic = _list!.isPublic;
    final words = _list!.words;
    final filteredWords = _getFilteredWords(words);
    final listJson = _list!.toJson();
    final publisher = listJson['publisher'] as String?;
    final schoolForm = listJson['schoolForm'] as String?;
    final grade = listJson['grade'] as String?;
    final isbn = listJson['isbn'] as String?;
    final status = _list!.status;
    final errorMessage = _list!.errorMessage;
    final hasBookDetails = [publisher, schoolForm, grade, isbn]
        .any((v) => v != null && v.isNotEmpty);

    return Scaffold(
      appBar: AppBar(
        title: _isSearching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: l10n.searchLists,
                  hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
                  border: InputBorder.none,
                ),
                onChanged: (value) => setState(() => _searchQuery = value),
              )
            : Text(title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _isSearching
              ? _toggleSearch
              : () => context.go('/vocabulary'),
        ),
        actions: [
          IconButton(
            icon: Icon(_isSearching ? Icons.close : Icons.search),
            tooltip: _isSearching ? l10n.cancel : l10n.searchLists,
            onPressed: _toggleSearch,
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'rename':
                  _showRenameDialog();
                case 'languages':
                  _showLanguageDialog();
                case 'bookDetails':
                  _showBookDetailsDialog();
                case 'public':
                  _togglePublic();
                case 'export':
                  context.read<VocabularyProvider>().exportAsText(_list!);
                case 'delete':
                  _confirmDelete();
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem(value: 'rename', child: Text(l10n.renameList)),
              PopupMenuItem(
                  value: 'languages', child: Text(l10n.languages)),
              PopupMenuItem(
                  value: 'bookDetails', child: Text(l10n.bookDetails)),
              PopupMenuItem(
                value: 'public',
                child: Text(isPublic ? 'Make private' : 'Make public'),
              ),
              PopupMenuItem(
                  value: 'export', child: Text(l10n.exportAsText)),
              PopupMenuItem(
                value: 'delete',
                child: Text(l10n.delete, style: const TextStyle(color: Colors.red)),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Info bar
          if (sourceLang != null || targetLang != null)
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Row(
                children: [
                  if (sourceLang != null && targetLang != null)
                    Text('$sourceLang → $targetLang',
                        style: const TextStyle(color: Colors.grey))
                  else if (sourceLang != null)
                    Text(sourceLang,
                        style: const TextStyle(color: Colors.grey)),
                  const Spacer(),
                  if (_searchQuery.isNotEmpty)
                    Text('${filteredWords.length} / ${words.length}',
                        style: const TextStyle(color: Colors.grey))
                  else
                    Text(l10n.nWords(words.length),
                        style: const TextStyle(color: Colors.grey)),
                ],
              ),
            ),
          // Status banner
          if (status == VocabularyListStatus.processing)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
              color: Colors.orange.shade50,
              child: Row(
                children: [
                  SizedBox(
                    width: 16, height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.orange.shade700),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(l10n.statusAnalyzing,
                        style: TextStyle(color: Colors.orange.shade800, fontSize: 13)),
                  ),
                ],
              ),
            ),
          if (status == VocabularyListStatus.failed)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
              color: Colors.red.shade50,
              child: Row(
                children: [
                  Icon(Icons.error_outline, size: 18, color: Colors.red.shade700),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      errorMessage ?? l10n.statusFailed,
                      style: TextStyle(color: Colors.red.shade800, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          // Book details bar
          if (hasBookDetails)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Wrap(
                spacing: 12,
                children: [
                  if (publisher != null && publisher.isNotEmpty)
                    Text(publisher,
                        style: TextStyle(
                            fontSize: 12, color: Colors.blueGrey.shade600)),
                  if (schoolForm != null && schoolForm.isNotEmpty)
                    Text(schoolForm,
                        style: TextStyle(
                            fontSize: 12, color: Colors.blueGrey.shade600)),
                  if (grade != null && grade.isNotEmpty)
                    Text('Klasse $grade',
                        style: TextStyle(
                            fontSize: 12, color: Colors.blueGrey.shade600)),
                  if (isbn != null && isbn.isNotEmpty)
                    Text('ISBN: $isbn',
                        style: TextStyle(
                            fontSize: 12, color: Colors.blueGrey.shade600)),
                ],
              ),
            ),
          // Source image
          if (_sourceImageUrls.isNotEmpty)
            _buildSourceImageSection(),
          const Divider(height: 1),
          // Word list
          Expanded(
            child: words.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.library_books,
                            size: 48, color: Colors.grey),
                        const SizedBox(height: 8),
                        const Text('No words yet',
                            style: TextStyle(color: Colors.grey)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _showAddWordDialog,
                          icon: const Icon(Icons.add),
                          label: Text(l10n.addWord),
                        ),
                      ],
                    ),
                  )
                : filteredWords.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.search_off,
                                size: 48, color: Colors.grey),
                            const SizedBox(height: 8),
                            Text('No words matching "$_searchQuery"',
                                style: const TextStyle(color: Colors.grey)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.only(bottom: 80),
                        itemCount: filteredWords.length,
                        separatorBuilder: (context, index) =>
                            const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final (word, originalIndex) = filteredWords[index];
                          return _buildWordTile(word, originalIndex);
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddWordDialog,
        tooltip: l10n.addWordTooltip,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildSourceImageSection() {
    final imageCount = _sourceImageUrls.length;
    final label = imageCount == 1
        ? 'Source image'
        : 'Source images ($imageCount)';

    return Column(
      children: [
        InkWell(
          onTap: () => setState(() => _isImageExpanded = !_isImageExpanded),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              children: [
                const Icon(Icons.image, size: 18, color: Colors.blueGrey),
                const SizedBox(width: 8),
                Text(label,
                    style: TextStyle(fontSize: 13, color: Colors.blueGrey.shade700)),
                const Spacer(),
                Icon(
                  _isImageExpanded ? Icons.expand_less : Icons.expand_more,
                  size: 20,
                  color: Colors.blueGrey,
                ),
              ],
            ),
          ),
        ),
        if (_isImageExpanded)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Column(
              children: [
                for (var i = 0; i < _sourceImageUrls.length; i++) ...[
                  if (i > 0) const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      _sourceImageUrls[i],
                      fit: BoxFit.contain,
                      width: double.infinity,
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return SizedBox(
                          height: 200,
                          child: Center(
                            child: CircularProgressIndicator(
                              value: loadingProgress.expectedTotalBytes != null
                                  ? loadingProgress.cumulativeBytesLoaded /
                                      loadingProgress.expectedTotalBytes!
                                  : null,
                            ),
                          ),
                        );
                      },
                      errorBuilder: (context, error, stackTrace) => const SizedBox(
                        height: 100,
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.broken_image, color: Colors.grey),
                              SizedBox(height: 4),
                              Text('Failed to load image',
                                  style: TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 8),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildWordTile(VocabularyWord word, int index) {
    final l10n = AppLocalizations.of(context)!;
    final wordText = word.word;
    final translation = word.translation;
    final definition = word.definition ?? '';
    final partOfSpeech = word.partOfSpeech;
    final difficulty = word.difficulty;
    final unit = word.unit;
    final flagged = word.flagged;

    return ListTile(
      title: Row(
        children: [
          if (flagged)
            const Padding(
              padding: EdgeInsets.only(right: 6),
              child: Icon(Icons.flag, size: 16, color: Colors.orange),
            ),
          Text(wordText, style: const TextStyle(fontWeight: FontWeight.bold)),
          if (translation != null && translation.isNotEmpty) ...[
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 6),
              child: Icon(Icons.arrow_forward, size: 14, color: Colors.grey),
            ),
            Flexible(
              child: Text(
                translation,
                style: const TextStyle(
                    fontWeight: FontWeight.w500, color: Color(0xFF2B6CB0)),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (definition.isNotEmpty) Text(definition),
          if (unit != null && unit.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(unit,
                  style:
                      TextStyle(fontSize: 11, color: Colors.blueGrey.shade600)),
            ),
        ],
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (partOfSpeech != null)
            Chip(
              label: Text(partOfSpeech, style: const TextStyle(fontSize: 11)),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
            ),
          if (difficulty != null) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _getDifficultyColor(difficulty),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(difficulty,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold)),
            ),
          ],
          IconButton(
            icon: const Icon(Icons.edit_outlined, size: 20),
            tooltip: l10n.editWordTooltip,
            onPressed: () => _showEditWordDialog(index),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, size: 20),
            tooltip: l10n.deleteWordTooltip,
            onPressed: () => _confirmDeleteWord(index),
          ),
        ],
      ),
    );
  }
}
