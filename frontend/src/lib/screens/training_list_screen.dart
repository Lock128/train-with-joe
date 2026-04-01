import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/training_provider.dart';

/// Screen for viewing all user trainings
class TrainingListScreen extends StatefulWidget {
  const TrainingListScreen({super.key});

  @override
  State<TrainingListScreen> createState() => _TrainingListScreenState();
}

class _TrainingListScreenState extends State<TrainingListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TrainingProvider>().loadTrainings();
    });
  }

  Color _getModeColor(String? mode) {
    switch (mode) {
      case 'TEXT_INPUT':
        return const Color(0xFF6C5CE7);
      case 'MULTIPLE_CHOICE':
        return const Color(0xFF00B894);
      default:
        return Colors.grey;
    }
  }

  String _getModeLabel(String? mode) {
    switch (mode) {
      case 'TEXT_INPUT':
        return 'Text Input';
      case 'MULTIPLE_CHOICE':
        return 'Multiple Choice';
      default:
        return mode ?? 'Unknown';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Trainings'),
        automaticallyImplyLeading: false,
      ),
      body: Consumer<TrainingProvider>(
        builder: (context, trainingProvider, _) {
          if (trainingProvider.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (trainingProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading trainings',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    trainingProvider.error!,
                    style: const TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => trainingProvider.loadTrainings(),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (trainingProvider.trainings.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.quiz_outlined,
                    size: 64,
                    color: Colors.grey,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No trainings yet',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Create a training from your vocabulary lists!',
                    style: TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => context.go('/trainings/create'),
                    icon: const Icon(Icons.add),
                    label: const Text('Create Training'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16.0),
            itemCount: trainingProvider.trainings.length,
            itemBuilder: (context, index) {
              final training = trainingProvider.trainings[index];
              return _buildTrainingCard(training);
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.go('/trainings/create'),
        tooltip: 'Create Training',
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildTrainingCard(Map<String, dynamic> training) {
    final name = training['name'] as String? ?? 'Untitled Training';
    final mode = training['mode'] as String?;
    final words = (training['words'] as List<dynamic>?) ?? [];
    final executions = (training['executions'] as List<dynamic>?) ?? [];

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getModeColor(mode).withOpacity(0.15),
          child: Icon(
            mode == 'MULTIPLE_CHOICE' ? Icons.checklist : Icons.keyboard,
            color: _getModeColor(mode),
          ),
        ),
        title: Text(
          name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                Chip(
                  label: Text(
                    _getModeLabel(mode),
                    style: TextStyle(
                      fontSize: 11,
                      color: _getModeColor(mode),
                    ),
                  ),
                  backgroundColor: _getModeColor(mode).withOpacity(0.1),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${words.length} words - ${executions.length} executions',
              style: const TextStyle(color: Colors.grey),
            ),
          ],
        ),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: () => context.go('/trainings/${training['id']}'),
      ),
    );
  }
}
