import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/vocabulary_provider.dart';

/// Screen for capturing/uploading images and analyzing vocabulary
class ImageVocabularyScreen extends StatefulWidget {
  const ImageVocabularyScreen({super.key});

  @override
  State<ImageVocabularyScreen> createState() => _ImageVocabularyScreenState();
}

class _ImageVocabularyScreenState extends State<ImageVocabularyScreen> {
  Uint8List? _selectedImageBytes;
  String _selectedLanguage = 'English';
  Map<String, dynamic>? _analysisResult;

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
  ];

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: source);
      if (pickedFile != null) {
        final bytes = await pickedFile.readAsBytes();
        setState(() {
          _selectedImageBytes = bytes;
          _analysisResult = null;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pick image: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _analyzeImage(VocabularyProvider provider) async {
    if (_selectedImageBytes == null) return;

    final imageBase64 = base64Encode(_selectedImageBytes!);
    final result = await provider.analyzeImage(
      imageBase64,
      language: _selectedLanguage,
    );

    if (result != null && mounted) {
      setState(() {
        _analysisResult = result;
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
      _selectedImageBytes = null;
      _analysisResult = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Analyze Image for Vocabulary'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
      ),
      body: Consumer<VocabularyProvider>(
        builder: (context, vocabularyProvider, _) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Image selection state
                    if (_selectedImageBytes == null && _analysisResult == null)
                      _buildImagePicker(),

                    // Image preview and analyze controls
                    if (_selectedImageBytes != null && _analysisResult == null && !vocabularyProvider.isAnalyzing)
                      _buildImagePreview(vocabularyProvider),

                    // Analyzing state
                    if (vocabularyProvider.isAnalyzing)
                      _buildAnalyzingState(),

                    // Error state
                    if (vocabularyProvider.error != null && !vocabularyProvider.isAnalyzing && _analysisResult == null)
                      _buildErrorState(vocabularyProvider),

                    // Results state
                    if (_analysisResult != null)
                      _buildResults(),

                    // Bottom actions
                    if (_analysisResult != null || _selectedImageBytes != null)
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          children: [
            const Icon(
              Icons.image_search,
              size: 64,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            Text(
              'Select an Image',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            const Text(
              'Pick an image to analyze and extract vocabulary words',
              style: TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _pickImage(ImageSource.gallery),
              icon: const Icon(Icons.photo_library),
              label: const Text('Pick from Gallery'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
                minimumSize: const Size(double.infinity, 0),
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () => _pickImage(ImageSource.camera),
              icon: const Icon(Icons.camera_alt),
              label: const Text('Take Photo'),
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

  Widget _buildImagePreview(VocabularyProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Image preview
        Card(
          clipBehavior: Clip.antiAlias,
          child: Image.memory(
            _selectedImageBytes!,
            height: 250,
            fit: BoxFit.cover,
          ),
        ),
        const SizedBox(height: 16),

        // Language selector
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                const Icon(Icons.language),
                const SizedBox(width: 12),
                const Text(
                  'Language:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButton<String>(
                    value: _selectedLanguage,
                    isExpanded: true,
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _selectedLanguage = value;
                        });
                      }
                    },
                    items: _supportedLanguages.map((lang) {
                      return DropdownMenuItem(
                        value: lang,
                        child: Text(lang),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Analyze button
        ElevatedButton.icon(
          onPressed: () => _analyzeImage(provider),
          icon: const Icon(Icons.auto_awesome),
          label: const Text('Analyze Image'),
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.all(16),
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildAnalyzingState() {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(48.0),
        child: Column(
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 24),
            Text(
              'Analyzing image...',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Extracting vocabulary words from the image',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(VocabularyProvider provider) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              'Analysis Failed',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              provider.error!,
              style: const TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _analyzeImage(provider),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResults() {
    final title = _analysisResult!['title'] as String? ?? 'Vocabulary List';
    final language = _analysisResult!['language'] as String?;
    final words = (_analysisResult!['words'] as List<dynamic>?) ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.check_circle,
                      color: Colors.green,
                      size: 32,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        title,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (language != null)
                      Chip(
                        label: Text(language),
                        avatar: const Icon(Icons.language, size: 16),
                      ),
                    const SizedBox(width: 8),
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
        ...words.map((wordData) {
          final word = wordData as Map<String, dynamic>;
          return _buildWordCard(word);
        }),
      ],
    );
  }

  Widget _buildWordCard(Map<String, dynamic> word) {
    final wordText = word['word'] as String? ?? '';
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
                  child: Text(
                    wordText,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
                if (partOfSpeech != null)
                  Chip(
                    label: Text(
                      partOfSpeech,
                      style: const TextStyle(fontSize: 12),
                    ),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                if (difficulty != null) ...[
                  const SizedBox(width: 8),
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
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            Text(definition),
            if (exampleSentence != null) ...[
              const SizedBox(height: 8),
              Text(
                exampleSentence,
                style: const TextStyle(
                  fontStyle: FontStyle.italic,
                  color: Colors.grey,
                ),
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
            label: const Text('Analyze Another Image'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.all(16),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => context.go('/vocabulary'),
            icon: const Icon(Icons.list),
            label: const Text('View All Lists'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.all(16),
            ),
          ),
        ],
      ),
    );
  }
}
