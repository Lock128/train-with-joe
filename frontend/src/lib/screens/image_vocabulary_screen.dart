import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../l10n/generated/app_localizations.dart';
import '../providers/vocabulary_provider.dart';

/// Screen for capturing/uploading images and analyzing vocabulary
class ImageVocabularyScreen extends StatefulWidget {
  const ImageVocabularyScreen({super.key});

  @override
  State<ImageVocabularyScreen> createState() => _ImageVocabularyScreenState();
}

class _ImageVocabularyScreenState extends State<ImageVocabularyScreen> {
  final ImagePicker _picker = ImagePicker();
  bool _isPickerActive = false;
  final List<Uint8List> _selectedImages = [];
  String? _selectedSourceLanguage;
  String? _selectedTargetLanguage;
  final List<Map<String, dynamic>> _analysisResults = [];
  int _analyzedCount = 0;

  final List<String> _supportedLanguages = [
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
          _analysisResults.clear();
          _analyzedCount = 0;
        });
      }
    } catch (e) {
      if (mounted) {
        final l10n = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.failedToPickImages(e.toString())), backgroundColor: Colors.red),
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
          _analysisResults.clear();
          _analyzedCount = 0;
        });
      }
    } catch (e) {
      if (mounted) {
        final l10n = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.failedToTakePhoto(e.toString())), backgroundColor: Colors.red),
        );
      }
    } finally {
      _isPickerActive = false;
    }
  }

  void _removeImage(int index) {
    setState(() {
      _selectedImages.removeAt(index);
      _analysisResults.clear();
      _analyzedCount = 0;
    });
  }

  Future<void> _analyzeImages(VocabularyProvider provider) async {
    if (_selectedImages.isEmpty) return;

    setState(() {
      _analysisResults.clear();
      _analyzedCount = 0;
    });

    final result = await provider.analyzeImages(
      _selectedImages,
      sourceLanguage: _selectedSourceLanguage,
      targetLanguage: _selectedTargetLanguage,
    );

    if (result != null && mounted) {
      setState(() {
        _analysisResults.add(result);
        _analyzedCount = _selectedImages.length;
      });
    } else if (mounted) {
      setState(() {
        _analyzedCount = _selectedImages.length;
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

  void _resetState() {
    setState(() {
      _selectedImages.clear();
      _analysisResults.clear();
      _analyzedCount = 0;
    });
  }

  bool get _hasResults => _analysisResults.isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.analyzeImagesForVocabulary),
        automaticallyImplyLeading: false,
      ),
      body: Consumer<VocabularyProvider>(
        builder: (context, vocabularyProvider, _) {
          final isAnalyzing = vocabularyProvider.isAnalyzing;
          final doneAnalyzing = !isAnalyzing && _analyzedCount == _selectedImages.length && _selectedImages.isNotEmpty;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Empty state
                    if (_selectedImages.isEmpty)
                      _buildImagePicker(),

                    // Image grid + controls
                    if (_selectedImages.isNotEmpty && !doneAnalyzing)
                      _buildImageGrid(vocabularyProvider),

                    // Analyzing progress
                    if (isAnalyzing)
                      _buildAnalyzingState(),

                    // Error state
                    if (vocabularyProvider.error != null && !isAnalyzing && !_hasResults)
                      _buildErrorState(vocabularyProvider),

                    // Results
                    if (doneAnalyzing && _hasResults)
                      _buildResults(),

                    // Bottom actions
                    if (doneAnalyzing || (_selectedImages.isNotEmpty && !isAnalyzing))
                      _buildBottomActions(),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildImagePicker() {
    final l10n = AppLocalizations.of(context)!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          children: [
            const Icon(Icons.image_search, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text('Select Images', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            const Text(
              'Pick one or more images to analyze and extract vocabulary words',
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
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => context.go('/vocabulary/scan-translate'),
              icon: const Icon(Icons.document_scanner),
              label: const Text('Scan & Translate'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.all(16),
                minimumSize: const Size(double.infinity, 0),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImageGrid(VocabularyProvider provider) {
    final l10n = AppLocalizations.of(context)!;
    final isAnalyzing = provider.isAnalyzing;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Image thumbnails grid
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
                if (!isAnalyzing)
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

        // Add more images buttons
        if (!isAnalyzing)
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

        // Language selectors
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Languages (optional — auto-detected from image)',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.language, size: 20),
                    const SizedBox(width: 8),
                    const Text('From:', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButton<String?>(
                        value: _selectedSourceLanguage,
                        isExpanded: true,
                        hint: Text(l10n.autoDetect),
                        onChanged: isAnalyzing ? null : (value) {
                          setState(() => _selectedSourceLanguage = value);
                        },
                        items: [
                          DropdownMenuItem<String?>(value: null, child: Text(l10n.autoDetect)),
                          ..._supportedLanguages.map((lang) {
                            return DropdownMenuItem(value: lang, child: Text(lang));
                          }),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.translate, size: 20),
                    const SizedBox(width: 8),
                    const Text('To:', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButton<String?>(
                        value: _selectedTargetLanguage,
                        isExpanded: true,
                        hint: Text(l10n.autoDetect),
                        onChanged: isAnalyzing ? null : (value) {
                          setState(() => _selectedTargetLanguage = value);
                        },
                        items: [
                          DropdownMenuItem<String?>(value: null, child: Text(l10n.autoDetect)),
                          ..._supportedLanguages.map((lang) {
                            return DropdownMenuItem(value: lang, child: Text(lang));
                          }),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Analyze button
        if (!isAnalyzing)
          ElevatedButton.icon(
            onPressed: () => _analyzeImages(provider),
            icon: const Icon(Icons.auto_awesome),
            label: Text('Analyze ${_selectedImages.length} Image${_selectedImages.length == 1 ? '' : 's'}'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.all(16),
              backgroundColor: const Color(0xFF2B6CB0),
              foregroundColor: Colors.white,
            ),
          ),
      ],
    );
  }

  Widget _buildAnalyzingState() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(48.0),
        child: Column(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 24),
            Text(
              'Analyzing ${_selectedImages.length} image${_selectedImages.length == 1 ? '' : 's'}...',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            const Text(
              'Extracting vocabulary words — this may take a moment',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(VocabularyProvider provider) {
    final l10n = AppLocalizations.of(context)!;
    final isBackgroundProcessing = provider.error?.contains('background') ?? false;
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
              isBackgroundProcessing ? 'Still Processing' : 'Analysis Failed',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              provider.error!,
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
                onPressed: () => _analyzeImages(provider),
                icon: const Icon(Icons.refresh),
                label: Text(l10n.retry),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildResults() {
    final l10n = AppLocalizations.of(context)!;
    if (_analysisResults.isEmpty) return const SizedBox.shrink();
    final result = _analysisResults.first;
    final title = result['title'] as String? ?? 'Vocabulary List';
    final sourceLang = result['sourceLanguage'] as String?;
    final targetLang = result['targetLanguage'] as String?;
    final words = (result['words'] as List<dynamic>?) ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
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
                    if (sourceLang != null && targetLang != null && sourceLang != targetLang)
                      Chip(
                        label: Text('$sourceLang → $targetLang'),
                        avatar: const Icon(Icons.translate, size: 16),
                      )
                    else if (sourceLang != null)
                      Chip(
                        label: Text(sourceLang),
                        avatar: const Icon(Icons.language, size: 16),
                      ),
                    Chip(
                      label: Text(l10n.nWords(words.length)),
                      avatar: const Icon(Icons.format_list_numbered, size: 16),
                    ),
                    if (_selectedImages.length > 1)
                      Chip(
                        label: Text('${_selectedImages.length} images'),
                        avatar: const Icon(Icons.photo_library, size: 16),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        ...words.map((wordData) => _buildWordCard(wordData as Map<String, dynamic>)),
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
    final unit = word['unit'] as String?;

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
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
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
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            Text(definition),
            if (unit != null && unit.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.bookmark_outline, size: 14, color: Colors.blueGrey.shade600),
                  const SizedBox(width: 4),
                  Text(
                    unit,
                    style: TextStyle(fontSize: 12, color: Colors.blueGrey.shade600),
                  ),
                ],
              ),
            ],
            if (exampleSentence != null) ...[
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

  Widget _buildBottomActions() {
    return Padding(
      padding: const EdgeInsets.only(top: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ElevatedButton.icon(
            onPressed: _resetState,
            icon: const Icon(Icons.add_photo_alternate),
            label: const Text('Analyze More Images'),
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => context.go('/vocabulary/scan-translate'),
            icon: const Icon(Icons.document_scanner),
            label: const Text('Scan & Translate'),
            style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16)),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => context.go('/vocabulary'),
            icon: const Icon(Icons.list),
            label: const Text('View All Lists'),
            style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16)),
          ),
        ],
      ),
    );
  }
}
