import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
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
  Map<String, dynamic>? _list;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadList();
  }

  void _loadList() {
    final provider = context.read<VocabularyProvider>();
    final match = provider.vocabularyLists
        .where((l) => l['id'] == widget.listId)
        .firstOrNull;
    if (match != null) {
      setState(() {
        _list = Map<String, dynamic>.from(match);
        _isLoading = false;
      });
    } else {
      provider.getVocabularyList(widget.listId).then((result) {
        if (mounted) {
          setState(() {
            _list = result != null ? Map<String, dynamic>.from(result) : null;
            _isLoading = false;
          });
        }
      });
    }
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
    final currentTitle = _list?['title'] as String? ?? '';
    final controller = TextEditingController(text: currentTitle);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rename List'),
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
              child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              final v = controller.text.trim();
              if (v.isNotEmpty) {
                Navigator.pop(ctx);
                _rename(v);
              }
            },
            child: const Text('Save'),
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
      setState(() => _list?['title'] = newTitle);
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
    String? selectedSource = _list?['sourceLanguage'] as String?;
    String? selectedTarget = _list?['targetLanguage'] as String?;

    // Normalise current values: keep only if they match a supported language
    if (selectedSource != null &&
        !_supportedLanguages.contains(selectedSource)) {
      selectedSource = null;
    }
    if (selectedTarget != null &&
        !_supportedLanguages.contains(selectedTarget)) {
      selectedTarget = null;
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Languages'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String?>(
                initialValue: selectedSource,
                decoration: const InputDecoration(
                    labelText: 'Source language', border: OutlineInputBorder()),
                items: [
                  const DropdownMenuItem<String?>(
                      value: null, child: Text('None')),
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
                  const DropdownMenuItem<String?>(
                      value: null, child: Text('None')),
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
                child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _updateLanguages(
                    selectedSource ?? '', selectedTarget ?? '');
              },
              child: const Text('Save'),
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
        _list?['sourceLanguage'] = src;
        _list?['targetLanguage'] = tgt;
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
    final publisherCtrl =
        TextEditingController(text: _list?['publisher'] as String? ?? '');
    final isbnCtrl =
        TextEditingController(text: _list?['isbn'] as String? ?? '');
    final gradeCtrl =
        TextEditingController(text: _list?['grade'] as String? ?? '');
    String? selectedSchoolForm = _list?['schoolForm'] as String?;
    if (selectedSchoolForm != null &&
        !_schoolForms.contains(selectedSchoolForm)) {
      selectedSchoolForm = null;
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Book Details'),
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
                    const DropdownMenuItem<String?>(
                        value: null, child: Text('None')),
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
                child: const Text('Cancel')),
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
              child: const Text('Save'),
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
      setState(() {
        _list?['publisher'] = publisher;
        _list?['schoolForm'] = schoolForm;
        _list?['grade'] = grade;
        _list?['isbn'] = isbn;
      });
    }
  }

  void _togglePublic() {
    final isPublic = _list?['isPublic'] == true;
    context
        .read<VocabularyProvider>()
        .setVocabularyListPublic(widget.listId, !isPublic)
        .then((ok) {
      if (ok && mounted) setState(() => _list?['isPublic'] = !isPublic);
    });
  }

  void _confirmDelete() {
    final title = _list?['title'] as String? ?? 'Untitled List';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete List'),
        content: Text('Delete "$title"? This cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context
                  .read<VocabularyProvider>()
                  .deleteVocabularyList(widget.listId);
              context.go('/vocabulary');
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  // ── Word editing ──

  void _showEditWordDialog(int index) {
    final words = (_list?['words'] as List<dynamic>?) ?? [];
    final word = Map<String, dynamic>.from(words[index] as Map<String, dynamic>);
    final wordCtrl = TextEditingController(text: word['word'] as String? ?? '');
    final transCtrl =
        TextEditingController(text: word['translation'] as String? ?? '');
    final defCtrl =
        TextEditingController(text: word['definition'] as String? ?? '');
    final unitCtrl =
        TextEditingController(text: word['unit'] as String? ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit Word'),
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
              child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _saveWord(index, {
                ...word,
                'word': wordCtrl.text.trim(),
                'translation': transCtrl.text.trim(),
                'definition': defCtrl.text.trim(),
                'unit': unitCtrl.text.trim(),
              });
            },
            child: const Text('Save'),
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

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Word'),
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
              child: const Text('Cancel')),
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
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveWord(int index, Map<String, dynamic> updated) async {
    final words = List<Map<String, dynamic>>.from(
        (_list?['words'] as List<dynamic>?)
                ?.map((w) => Map<String, dynamic>.from(w as Map)) ??
            []);
    words[index] = updated;
    await _persistWords(words);
  }

  Future<void> _addWord(Map<String, dynamic> word) async {
    final words = List<Map<String, dynamic>>.from(
        (_list?['words'] as List<dynamic>?)
                ?.map((w) => Map<String, dynamic>.from(w as Map)) ??
            []);
    words.add(word);
    await _persistWords(words);
  }

  void _confirmDeleteWord(int index) {
    final words = (_list?['words'] as List<dynamic>?) ?? [];
    final word = words[index] as Map<String, dynamic>;
    final wordText = word['word'] as String? ?? '';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Word'),
        content: Text('Remove "$wordText" from this list?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _deleteWord(index);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteWord(int index) async {
    final words = List<Map<String, dynamic>>.from(
        (_list?['words'] as List<dynamic>?)
                ?.map((w) => Map<String, dynamic>.from(w as Map)) ??
            []);
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
      setState(() => _list?['words'] = cleaned);
    }
  }

  // ── Build ──

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Vocabulary List')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_list == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Vocabulary List')),
        body: const Center(child: Text('List not found')),
      );
    }

    final title = _list!['title'] as String? ?? 'Untitled List';
    final sourceLang = _list!['sourceLanguage'] as String?;
    final targetLang = _list!['targetLanguage'] as String?;
    final isPublic = _list!['isPublic'] == true;
    final words = (_list!['words'] as List<dynamic>?) ?? [];
    final publisher = _list!['publisher'] as String?;
    final schoolForm = _list!['schoolForm'] as String?;
    final grade = _list!['grade'] as String?;
    final isbn = _list!['isbn'] as String?;
    final hasBookDetails = [publisher, schoolForm, grade, isbn]
        .any((v) => v != null && v.isNotEmpty);

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/vocabulary'),
        ),
        actions: [
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
              const PopupMenuItem(value: 'rename', child: Text('Rename')),
              const PopupMenuItem(
                  value: 'languages', child: Text('Languages')),
              const PopupMenuItem(
                  value: 'bookDetails', child: Text('Book Details')),
              PopupMenuItem(
                value: 'public',
                child: Text(isPublic ? 'Make private' : 'Make public'),
              ),
              const PopupMenuItem(
                  value: 'export', child: Text('Export as text')),
              const PopupMenuItem(
                value: 'delete',
                child: Text('Delete', style: TextStyle(color: Colors.red)),
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
                  Text('${words.length} words',
                      style: const TextStyle(color: Colors.grey)),
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
                          label: const Text('Add Word'),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.only(bottom: 80),
                    itemCount: words.length,
                    separatorBuilder: (context, index) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final word =
                          words[index] as Map<String, dynamic>;
                      return _buildWordTile(word, index);
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddWordDialog,
        tooltip: 'Add word',
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildWordTile(Map<String, dynamic> word, int index) {
    final wordText = word['word'] as String? ?? '';
    final translation = word['translation'] as String?;
    final definition = word['definition'] as String? ?? '';
    final partOfSpeech = word['partOfSpeech'] as String?;
    final difficulty = word['difficulty'] as String?;
    final unit = word['unit'] as String?;
    final flagged = word['flagged'] == true;

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
            tooltip: 'Edit word',
            onPressed: () => _showEditWordDialog(index),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, size: 20),
            tooltip: 'Delete word',
            onPressed: () => _confirmDeleteWord(index),
          ),
        ],
      ),
    );
  }
}
