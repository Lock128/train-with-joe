import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/vocabulary_provider.dart';
import '../providers/training_provider.dart';

/// Screen for creating a new training from vocabulary lists
class TrainingCreationScreen extends StatefulWidget {
  const TrainingCreationScreen({super.key});

  @override
  State<TrainingCreationScreen> createState() => _TrainingCreationScreenState();
}

class _TrainingCreationScreenState extends State<TrainingCreationScreen> {
  final Set<String> _selectedListIds = {};
  String _selectedMode = 'MULTIPLE_CHOICE';
  final String _selectedDirection = 'WORD_TO_TRANSLATION';
  final TextEditingController _nameController = TextEditingController();
  bool _listsLoaded = false;
  int _wordCount = 20;
  bool _isRandomized = false;

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Training'),
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
                    'Error loading vocabulary lists',
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
                    label: const Text('Retry'),
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

          if (allLists.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.library_books, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    'No vocabulary lists available',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Create vocabulary lists first to build a training.',
                    style: TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => context.go('/vocabulary/analyze'),
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Analyze an Image'),
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
                  decoration: const InputDecoration(
                    labelText: 'Training Name (optional)',
                    border: OutlineInputBorder(),
                    hintText: 'Enter a name for your training',
                  ),
                ),
                const SizedBox(height: 24),

                // Mode selector
                const Text(
                  'Training Mode',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    ChoiceChip(
                      label: const Text('Text Input'),
                      selected: _selectedMode == 'TEXT_INPUT',
                      selectedColor: const Color(0xFF2B6CB0).withValues(alpha: 0.2),
                      onSelected: (_) => setState(() => _selectedMode = 'TEXT_INPUT'),
                    ),
                    const SizedBox(width: 8),
                    ChoiceChip(
                      label: const Text('Multiple Choice'),
                      selected: _selectedMode == 'MULTIPLE_CHOICE',
                      selectedColor: const Color(0xFFF0932B).withValues(alpha: 0.2),
                      onSelected: (_) => setState(() => _selectedMode = 'MULTIPLE_CHOICE'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Vocabulary lists
                const Text(
                  'Your Vocabulary Lists',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                if (myLists.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8.0),
                    child: Text(
                      'You have no vocabulary lists yet.',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
                ...myLists.map((list) {
                  final id = list['id'] as String;
                  final title = list['title'] as String? ?? 'Untitled List';
                  final words = (list['words'] as List<dynamic>?) ?? [];
                  return CheckboxListTile(
                    title: Text(title),
                    subtitle: Text('${words.length} words'),
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
                }),
                if (publicLists.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  const Text(
                    'Public Vocabulary Lists',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  ...publicLists.map((list) {
                    final id = list['id'] as String;
                    final title = list['title'] as String? ?? 'Untitled List';
                    final words = (list['words'] as List<dynamic>?) ?? [];
                    return CheckboxListTile(
                      title: Text(title),
                      subtitle: Text('${words.length} words'),
                      secondary: const Icon(Icons.public, size: 20, color: Colors.grey),
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
                  }),
                ],
                const SizedBox(height: 16),

                // Word count selector
                if (_selectedListIds.isNotEmpty) ...[
                  Text(
                    'Number of Words: $_wordCount',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$totalWords words available across selected lists'
                        '${totalWords > 100 ? " (max 100 will be randomly picked)" : ""}',
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
                    title: const Text('Randomized Mode'),
                    subtitle: const Text(
                      'Pick different words each time you start this training',
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
                      : const Text('Create Training'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
