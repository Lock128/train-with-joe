import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../l10n/generated/app_localizations.dart';
import '../providers/vocabulary_provider.dart';

/// Represents the current phase of the Scan & Translate flow.
enum _ScreenPhase {
  imageSelection,
  recognizing,
  recognized,
  translating,
  completed,
  error,
}

/// Screen for the two-phase Scan & Translate flow:
/// 1. Pick images → OCR recognition → review words
/// 2. Select target language → translate → view enriched vocabulary
class ScanTranslateScreen extends StatefulWidget {
  const ScanTranslateScreen({super.key});

  @override
  State<ScanTranslateScreen> createState() => _ScanTranslateScreenState();
}

class _ScanTranslateScreenState extends State<ScanTranslateScreen> {
  final ImagePicker _picker = ImagePicker();
  bool _isPickerActive = false;
  final List<Uint8List> _selectedImages = [];

  _ScreenPhase _phase = _ScreenPhase.imageSelection;
  Map<String, dynamic>? _recognizedList;
  Map<String, dynamic>? _completedList;
  String? _errorMessage;

  String? _selectedTargetLanguage;

  final List<String> _targetLanguages = const [
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

  // --- Image picking (reused from ImageVocabularyScreen) ---

  Future<void> _pickImages() async {
    if (_isPickerActive) return;
    _isPickerActive = true;
    try {
      final pickedFiles = await _picker.pickMultiImage();
      if (pickedFiles.isNotEmpty) {
        final newImages = <Uint8List>[];
        for (final file in pickedFiles) {
          newImages.add(await file.readAsBytes());
        }
        setState(() {
          _selectedImages.addAll(newImages);
        });
      }
    } catch (e) {
      if (mounted) {
        final l10n = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.failedToPickImages(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      _isPickerActive = false;
    }
  }

  Future<void> _takePhoto() async {
    if (_isPickerActive) return;
    _isPickerActive = true;
    try {
      final pickedFile = await _picker.pickImage(source: ImageSource.camera);
      if (pickedFile != null) {
        final bytes = await pickedFile.readAsBytes();
        setState(() {
          _selectedImages.add(bytes);
        });
      }
    } catch (e) {
      if (mounted) {
        final l10n = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.failedToTakePhoto(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      _isPickerActive = false;
    }
  }

  void _removeImage(int index) {
    setState(() {
      _selectedImages.removeAt(index);
    });
  }

  // --- Phase 1: Recognition ---

  Future<void> _startRecognition() async {
    if (_selectedImages.isEmpty) return;

    setState(() {
      _phase = _ScreenPhase.recognizing;
      _errorMessage = null;
    });

    final provider = Provider.of<VocabularyProvider>(context, listen: false);
    final result = await provider.analyzeScanTranslate(_selectedImages);

    if (!mounted) return;

    if (result != null) {
      setState(() {
        _recognizedList = result;
        _phase = _ScreenPhase.recognized;
      });
    } else {
      setState(() {
        _errorMessage = provider.error ?? 'Recognition failed';
        _phase = _ScreenPhase.error;
      });
    }
  }

  // --- Phase 2: Translation ---

  Future<void> _startTranslation() async {
    final listId = _recognizedList?['id'] as String?;
    if (listId == null || _selectedTargetLanguage == null) return;

    // Check source == target language
    final sourceLanguage = _recognizedList?['sourceLanguage'] as String?;
    if (sourceLanguage != null &&
        sourceLanguage.toLowerCase() == _selectedTargetLanguage!.toLowerCase()) {
      final proceed = await _showSourceTargetWarning(sourceLanguage);
      if (proceed != true) return;
    }

    final provider = Provider.of<VocabularyProvider>(context, listen: false);

    setState(() {
      _phase = _ScreenPhase.translating;
      _errorMessage = null;
    });

    // Trigger Phase 2 mutation
    final translatingList = await provider.translateRecognizedWords(
      listId,
      _selectedTargetLanguage!,
    );

    if (!mounted) return;

    if (translatingList == null) {
      setState(() {
        _errorMessage = provider.error ?? 'Translation failed';
        _phase = _ScreenPhase.error;
      });
      return;
    }

    // Poll for completion
    await provider.getVocabularyList(listId);

    if (!mounted) return;

    // The getVocabularyList call above returns the current state.
    // We need to poll until COMPLETED. Use a simple polling loop here.
    final result = await _pollUntilCompleted(provider, listId);

    if (!mounted) return;

    if (result != null) {
      setState(() {
        _completedList = result;
        _phase = _ScreenPhase.completed;
      });
    } else {
      setState(() {
        _errorMessage = provider.error ?? 'Translation timed out. Check your vocabulary lists.';
        _phase = _ScreenPhase.error;
      });
    }
  }

  /// Poll until the vocabulary list reaches COMPLETED/PARTIALLY_COMPLETED or FAILED.
  Future<Map<String, dynamic>?> _pollUntilCompleted(
    VocabularyProvider provider,
    String id,
  ) async {
    const maxAttempts = 60;
    const pollInterval = Duration(seconds: 3);

    for (var i = 0; i < maxAttempts; i++) {
      await Future.delayed(pollInterval);
      if (!mounted) return null;

      try {
        final list = await provider.getVocabularyList(id);
        if (list == null) continue;

        final status = list['status'] as String?;
        if (status == 'COMPLETED' || status == 'PARTIALLY_COMPLETED') {
          return list;
        }
        if (status == 'FAILED') {
          _errorMessage = list['errorMessage'] as String? ?? 'Translation failed';
          return null;
        }
        // TRANSLATING — keep polling
      } catch (_) {
        // Transient error, keep trying
      }
    }
    return null;
  }

  Future<bool?> _showSourceTargetWarning(String language) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Same Language Warning'),
        content: Text(
          'The detected source language ($language) matches your selected target language. '
          'Translation results may not be useful. Do you want to continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Change Language'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Continue Anyway'),
          ),
        ],
      ),
    );
  }

  void _retry() {
    setState(() {
      // Go back to the last actionable state
      if (_recognizedList != null) {
        _phase = _ScreenPhase.recognized;
      } else {
        _phase = _ScreenPhase.imageSelection;
      }
      _errorMessage = null;
    });
  }

  void _resetAll() {
    setState(() {
      _selectedImages.clear();
      _recognizedList = null;
      _completedList = null;
      _selectedTargetLanguage = null;
      _errorMessage = null;
      _phase = _ScreenPhase.imageSelection;
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

  // --- Build ---

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan & Translate'),
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_phase == _ScreenPhase.imageSelection) _buildImageSelection(),
                if (_phase == _ScreenPhase.recognizing) _buildRecognizing(),
                if (_phase == _ScreenPhase.recognized) _buildRecognized(),
                if (_phase == _ScreenPhase.translating) _buildTranslating(),
                if (_phase == _ScreenPhase.completed) _buildCompleted(),
                if (_phase == _ScreenPhase.error) _buildError(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- Image Selection Phase ---

  Widget _buildImageSelection() {
    final l10n = AppLocalizations.of(context)!;

    if (_selectedImages.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            children: [
              const Icon(Icons.document_scanner, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              Text('Scan & Translate', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              const Text(
                'Pick images of signs, menus, labels, or any text to recognize and translate words',
                style: TextStyle(color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _pickImages,
                icon: const Icon(Icons.photo_library),
                label: Text(l10n.pickFromGallery),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.all(16),
                  minimumSize: const Size(double.infinity, 0),
                ),
              ),
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: _takePhoto,
                icon: const Icon(Icons.camera_alt),
                label: Text(l10n.takePhoto),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.all(16),
                  minimumSize: const Size(double.infinity, 0),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Images selected — show grid + scan button
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '${_selectedImages.length} image${_selectedImages.length == 1 ? '' : 's'} selected',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 300),
          child: GridView.builder(
            shrinkWrap: true,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: _selectedImages.length,
            itemBuilder: (context, index) {
              return Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.memory(_selectedImages[index], fit: BoxFit.cover),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: GestureDetector(
                      onTap: () => _removeImage(index),
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        padding: const EdgeInsets.all(4),
                        child: const Icon(Icons.close, color: Colors.white, size: 16),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickImages,
                icon: const Icon(Icons.add_photo_alternate, size: 18),
                label: Text(l10n.addMore),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _takePhoto,
                icon: const Icon(Icons.camera_alt, size: 18),
                label: Text(l10n.takePhoto),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ElevatedButton.icon(
          onPressed: _startRecognition,
          icon: const Icon(Icons.document_scanner),
          label: Text('Scan ${_selectedImages.length} Image${_selectedImages.length == 1 ? '' : 's'}'),
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.all(16),
            backgroundColor: const Color(0xFF2B6CB0),
            foregroundColor: Colors.white,
          ),
        ),
      ],
    );
  }

  // --- Recognizing Phase ---

  Widget _buildRecognizing() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(48.0),
        child: Column(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 24),
            Text(
              'Recognizing words...',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            const Text(
              'Extracting text from your images — this may take a moment',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  // --- Recognized Phase ---

  Widget _buildRecognized() {
    final words = (_recognizedList?['words'] as List<dynamic>?) ?? [];
    final sourceLanguage = _recognizedList?['sourceLanguage'] as String? ?? 'Unknown';
    final title = _recognizedList?['title'] as String? ?? 'Recognized Words';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green, size: 32),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(title, style: Theme.of(context).textTheme.titleLarge),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Chip(
                      label: Text('Source: $sourceLanguage'),
                      avatar: const Icon(Icons.language, size: 16),
                    ),
                    Chip(
                      label: Text('${words.length} words'),
                      avatar: const Icon(Icons.format_list_numbered, size: 16),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Recognized words list
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Recognized Words', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: words.map((w) {
                    final word = (w as Map<String, dynamic>)['word'] as String? ?? '';
                    return Chip(label: Text(word));
                  }).toList(),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Target language selection
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Translate To', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.translate, size: 20),
                    const SizedBox(width: 8),
                    const Text('Target Language:', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButton<String>(
                        value: _selectedTargetLanguage,
                        isExpanded: true,
                        hint: const Text('Select a language'),
                        onChanged: (value) {
                          setState(() => _selectedTargetLanguage = value);
                        },
                        items: _targetLanguages.map((lang) {
                          return DropdownMenuItem(value: lang, child: Text(lang));
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Translate button
        ElevatedButton.icon(
          onPressed: _selectedTargetLanguage != null ? _startTranslation : null,
          icon: const Icon(Icons.translate),
          label: const Text('Translate'),
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.all(16),
            backgroundColor: const Color(0xFF2B6CB0),
            foregroundColor: Colors.white,
          ),
        ),
      ],
    );
  }

  // --- Translating Phase ---

  Widget _buildTranslating() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(48.0),
        child: Column(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 24),
            Text(
              'Translating words...',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            const Text(
              'Translating and enriching your vocabulary — this may take a moment',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  // --- Completed Phase ---

  Widget _buildCompleted() {
    final title = _completedList?['title'] as String? ?? 'Vocabulary List';
    final sourceLang = _completedList?['sourceLanguage'] as String?;
    final targetLang = _completedList?['targetLanguage'] as String?;
    final words = (_completedList?['words'] as List<dynamic>?) ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green, size: 32),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(title, style: Theme.of(context).textTheme.titleLarge),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (sourceLang != null && targetLang != null)
                      Chip(
                        label: Text('$sourceLang → $targetLang'),
                        avatar: const Icon(Icons.translate, size: 16),
                      ),
                    Chip(
                      label: Text('${words.length} words'),
                      avatar: const Icon(Icons.format_list_numbered, size: 16),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Word cards
        ...words.map((w) => _buildWordCard(w as Map<String, dynamic>)),

        // Bottom actions
        const SizedBox(height: 24),
        ElevatedButton.icon(
          onPressed: _resetAll,
          icon: const Icon(Icons.add_photo_alternate),
          label: const Text('Scan More Images'),
          style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () => context.go('/vocabulary'),
          icon: const Icon(Icons.list),
          label: const Text('View All Lists'),
          style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16)),
        ),
      ],
    );
  }

  Widget _buildWordCard(Map<String, dynamic> word) {
    final wordText = word['word'] as String? ?? '';
    final translation = word['translation'] as String?;
    final definition = word['definition'] as String? ?? '';
    final partOfSpeech = word['partOfSpeech'] as String?;
    final exampleSentence = word['exampleSentence'] as String?;
    final difficulty = word['difficulty'] as String?;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        wordText,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (translation != null && translation.isNotEmpty)
                        Text(
                          translation,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF2B6CB0),
                          ),
                        ),
                    ],
                  ),
                ),
                if (partOfSpeech != null)
                  Chip(
                    label: Text(partOfSpeech, style: const TextStyle(fontSize: 12)),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                if (difficulty != null) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getDifficultyColor(difficulty),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      difficulty,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            if (definition.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(definition),
            ],
            if (exampleSentence != null && exampleSentence.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                exampleSentence,
                style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.grey),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // --- Error Phase ---

  Widget _buildError() {
    final l10n = AppLocalizations.of(context)!;
    final isBackgroundProcessing = _errorMessage?.contains('background') ?? false;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          children: [
            Icon(
              isBackgroundProcessing ? Icons.hourglass_top : Icons.error_outline,
              size: 64,
              color: isBackgroundProcessing ? Colors.orange : Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              isBackgroundProcessing ? 'Still Processing' : 'Something went wrong',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage ?? 'An unexpected error occurred',
              style: const TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            if (isBackgroundProcessing)
              ElevatedButton.icon(
                onPressed: () => context.go('/vocabulary'),
                icon: const Icon(Icons.list),
                label: Text(l10n.goToVocabularyLists),
              )
            else
              ElevatedButton.icon(
                onPressed: _retry,
                icon: const Icon(Icons.refresh),
                label: Text(l10n.retry),
              ),
          ],
        ),
      ),
    );
  }
}
