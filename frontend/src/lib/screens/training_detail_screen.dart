import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/training_provider.dart';
import '../providers/vocabulary_provider.dart';

/// Screen for viewing and managing a single training
class TrainingDetailScreen extends StatefulWidget {
  final String trainingId;
  const TrainingDetailScreen({super.key, required this.trainingId});

  @override
  State<TrainingDetailScreen> createState() => _TrainingDetailScreenState();
}

class _TrainingDetailScreenState extends State<TrainingDetailScreen> {
  Map<String, dynamic>? _training;
  bool _isLoading = true;
  bool _isStarting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadTraining());
  }

  Future<void> _loadTraining() async {
    setState(() { _isLoading = true; _error = null; });
    final result = await context.read<TrainingProvider>().getTraining(widget.trainingId);
    if (mounted) {
      setState(() {
        _training = result;
        _isLoading = false;
        _error = result == null ? 'Failed to load training' : null;
      });
    }
  }

  Future<void> _deleteWord(int index) async {
    if (_training == null) return;
    final words = List<Map<String, dynamic>>.from(
      (_training!['words'] as List<dynamic>).map((w) => Map<String, dynamic>.from(w as Map)),
    );
    words.removeAt(index);
    final updated = await context.read<TrainingProvider>().updateTraining(widget.trainingId, words: words);
    if (!mounted) return;
    if (updated != null) {
      setState(() => _training = updated);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Word removed')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to remove word'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _showAddWordsSheet() async {
    await context.read<VocabularyProvider>().loadVocabularyLists();
    if (!mounted) return;
    final vocabLists = context.read<VocabularyProvider>().vocabularyLists;
    final trainingWords = (_training!['words'] as List<dynamic>?) ?? [];
    final existingKeys = trainingWords.map((w) {
      final m = w as Map<String, dynamic>;
      return '${m['word']}::${m['translation']}';
    }).toSet();

    final availableWords = <Map<String, dynamic>>[];
    for (final list in vocabLists) {
      for (final w in (list['words'] as List<dynamic>?) ?? []) {
        final m = Map<String, dynamic>.from(w as Map);
        if (!existingKeys.contains('${m['word']}::${m['translation']}')) {
          availableWords.add({'word': m['word'], 'translation': m['translation'], 'vocabularyListId': list['id']});
        }
      }
    }
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (sheetCtx) => _AddWordsSheet(
        availableWords: availableWords,
        onAdd: (selected) async {
          Navigator.of(sheetCtx).pop();
          final current = List<Map<String, dynamic>>.from(
            (_training!['words'] as List<dynamic>).map((w) => Map<String, dynamic>.from(w as Map)),
          );
          current.addAll(selected);
          final updated = await context.read<TrainingProvider>().updateTraining(widget.trainingId, words: current);
          if (mounted && updated != null) setState(() => _training = updated);
        },
      ),
    );
  }

  Future<void> _startTraining() async {
    setState(() => _isStarting = true);
    final execution = await context.read<TrainingProvider>().startTraining(widget.trainingId);
    if (!mounted) return;
    setState(() => _isStarting = false);
    if (execution != null) {
      context.go('/trainings/${widget.trainingId}/execute/${execution['id']}');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(context.read<TrainingProvider>().error ?? 'Failed to start training'),
        backgroundColor: Colors.red,
      ));
    }
  }

  Color _modeColor(String? m) => m == 'MULTIPLE_CHOICE' ? const Color(0xFF00B894) : const Color(0xFF6C5CE7);
  String _modeLabel(String? m) => m == 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'Text Input';

  Future<void> _showRenameDialog(String currentName) async {
    final controller = TextEditingController(text: currentName);
    final newName = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rename Training'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Training Name',
            border: OutlineInputBorder(),
          ),
          onSubmitted: (value) => Navigator.of(ctx).pop(value.trim()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(controller.text.trim()),
            child: const Text('Rename'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (newName == null || newName.isEmpty || newName == currentName) return;
    if (!mounted) return;
    final updated = await context.read<TrainingProvider>().updateTraining(widget.trainingId, name: newName);
    if (mounted && updated != null) {
      setState(() => _training = updated);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(appBar: AppBar(title: const Text('Training')),
        body: const Center(child: CircularProgressIndicator()));
    }
    if (_error != null || _training == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Training')),
        body: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(_error ?? 'Training not found', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 24),
          ElevatedButton.icon(onPressed: _loadTraining, icon: const Icon(Icons.refresh), label: const Text('Retry')),
        ])),
      );
    }

    final name = _training!['name'] as String? ?? 'Untitled Training';
    final mode = _training!['mode'] as String?;
    final words = (_training!['words'] as List<dynamic>?) ?? [];
    final isMcTooFew = mode == 'MULTIPLE_CHOICE' && words.length < 3;

    return Scaffold(
      appBar: AppBar(title: Text(name), actions: [
        IconButton(icon: const Icon(Icons.edit), tooltip: 'Rename',
          onPressed: () => _showRenameDialog(name)),
        IconButton(icon: const Icon(Icons.history), tooltip: 'History',
          onPressed: () => context.go('/trainings/${widget.trainingId}/history')),
      ]),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Chip(label: Text(_modeLabel(mode), style: TextStyle(color: _modeColor(mode))),
            backgroundColor: _modeColor(mode).withValues(alpha: 0.1)),
          const SizedBox(height: 16),
          Text('Words (${words.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (words.isEmpty)
            const Padding(padding: EdgeInsets.symmetric(vertical: 24),
              child: Text('No words in this training.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)))
          else
            ListView.builder(
              shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: words.length,
              itemBuilder: (context, index) {
                final word = words[index] as Map<String, dynamic>;
                return ListTile(
                  title: Text(word['word'] as String? ?? ''),
                  subtitle: Text(word['translation'] as String? ?? ''),
                  trailing: IconButton(icon: const Icon(Icons.delete, color: Colors.red), onPressed: () => _deleteWord(index)),
                );
              },
            ),
          const SizedBox(height: 16),
          ElevatedButton.icon(onPressed: _showAddWordsSheet, icon: const Icon(Icons.add),
            label: const Text('Add Words'), style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(12))),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: isMcTooFew || _isStarting ? null : _startTraining,
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
            child: _isStarting
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Start Training'),
          ),
          if (isMcTooFew)
            const Padding(padding: EdgeInsets.only(top: 8), child: Text(
              'Multiple choice mode requires at least 3 words.',
              style: TextStyle(color: Colors.orange, fontSize: 13), textAlign: TextAlign.center)),
        ]),
      ),
    );
  }
}

class _AddWordsSheet extends StatefulWidget {
  final List<Map<String, dynamic>> availableWords;
  final Function(List<Map<String, dynamic>>) onAdd;
  const _AddWordsSheet({required this.availableWords, required this.onAdd});

  @override
  State<_AddWordsSheet> createState() => _AddWordsSheetState();
}

class _AddWordsSheetState extends State<_AddWordsSheet> {
  final Set<int> _selected = {};
  final _filterController = TextEditingController();
  final _customWordController = TextEditingController();
  final _customTranslationController = TextEditingController();
  final List<Map<String, dynamic>> _customWords = [];
  String _filter = '';

  @override
  void dispose() {
    _filterController.dispose();
    _customWordController.dispose();
    _customTranslationController.dispose();
    super.dispose();
  }

  List<MapEntry<int, Map<String, dynamic>>> get _filteredWords {
    final entries = widget.availableWords.asMap().entries.toList();
    if (_filter.isEmpty) return entries;
    final lower = _filter.toLowerCase();
    return entries.where((e) {
      final word = (e.value['word'] as String? ?? '').toLowerCase();
      final translation = (e.value['translation'] as String? ?? '').toLowerCase();
      return word.contains(lower) || translation.contains(lower);
    }).toList();
  }

  int get _totalSelected => _selected.length + _customWords.length;

  void _addCustomWord() {
    final word = _customWordController.text.trim();
    final translation = _customTranslationController.text.trim();
    if (word.isEmpty || translation.isEmpty) return;
    setState(() {
      _customWords.add({'word': word, 'translation': translation});
      _customWordController.clear();
      _customTranslationController.clear();
    });
  }

  void _submitAll() {
    final fromList = _selected.map((i) => widget.availableWords[i]).toList();
    widget.onAdd([...fromList, ..._customWords]);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredWords;
    return DraggableScrollableSheet(
      initialChildSize: 0.7, maxChildSize: 0.95, minChildSize: 0.3, expand: false,
      builder: (context, scrollController) => Column(children: [
        Padding(padding: const EdgeInsets.all(16), child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Add Words', style: Theme.of(context).textTheme.titleMedium),
            ElevatedButton(
              onPressed: _totalSelected == 0 ? null : _submitAll,
              child: Text('Add $_totalSelected'),
            ),
          ],
        )),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextField(
            controller: _filterController,
            decoration: InputDecoration(
              hintText: 'Filter words...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _filter.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear), onPressed: () {
                      _filterController.clear();
                      setState(() => _filter = '');
                    })
                  : null,
              border: const OutlineInputBorder(),
              isDense: true,
            ),
            onChanged: (v) => setState(() => _filter = v),
          ),
        ),
        const SizedBox(height: 8),
        // Custom word entry
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(children: [
            Expanded(child: TextField(
              controller: _customWordController,
              decoration: const InputDecoration(hintText: 'Word', border: OutlineInputBorder(), isDense: true),
              textInputAction: TextInputAction.next,
            )),
            const SizedBox(width: 8),
            Expanded(child: TextField(
              controller: _customTranslationController,
              decoration: const InputDecoration(hintText: 'Translation', border: OutlineInputBorder(), isDense: true),
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _addCustomWord(),
            )),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.add_circle, color: Colors.green),
              tooltip: 'Add custom word',
              onPressed: _addCustomWord,
            ),
          ]),
        ),
        if (_customWords.isNotEmpty) ...[
          const SizedBox(height: 4),
          SizedBox(
            height: 40,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _customWords.length,
              itemBuilder: (context, i) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Chip(
                  label: Text('${_customWords[i]['word']} → ${_customWords[i]['translation']}', style: const TextStyle(fontSize: 12)),
                  deleteIcon: const Icon(Icons.close, size: 16),
                  onDeleted: () => setState(() => _customWords.removeAt(i)),
                ),
              ),
            ),
          ),
        ],
        const SizedBox(height: 8),
        Expanded(
          child: filtered.isEmpty
              ? Center(child: Text(
                  widget.availableWords.isEmpty ? 'No additional words available.' : 'No words match your filter.',
                  style: const TextStyle(color: Colors.grey)))
              : ListView.builder(
                  controller: scrollController, itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final entry = filtered[index];
                    final word = entry.value;
                    final origIndex = entry.key;
                    return CheckboxListTile(
                      title: Text(word['word'] as String? ?? ''),
                      subtitle: Text(word['translation'] as String? ?? ''),
                      value: _selected.contains(origIndex),
                      onChanged: (checked) => setState(() {
                        if (checked == true) { _selected.add(origIndex); } else { _selected.remove(origIndex); }
                      }),
                    );
                  },
                ),
        ),
      ]),
    );
  }
}
