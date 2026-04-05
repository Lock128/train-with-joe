import 'dart:math';
import 'package:flutter/material.dart';
import '../services/feedback_sound_service.dart';

/// Animated feedback overlay shown after answering a training question.
/// Shows a celebratory bounce + particles for correct answers,
/// and a gentle shake + encouragement for incorrect ones.
class AnswerFeedbackAnimation extends StatefulWidget {
  final bool isCorrect;
  final String? expectedAnswer;

  const AnswerFeedbackAnimation({
    super.key,
    required this.isCorrect,
    this.expectedAnswer,
  });

  @override
  State<AnswerFeedbackAnimation> createState() =>
      _AnswerFeedbackAnimationState();
}

class _AnswerFeedbackAnimationState extends State<AnswerFeedbackAnimation>
    with TickerProviderStateMixin {
  late final AnimationController _iconController;
  late final AnimationController _particleController;
  late final Animation<double> _scaleAnimation;
  late final Animation<double> _shakeAnimation;
  late final Animation<double> _fadeAnimation;
  late final String _motivationalMessage;
  final _random = Random();

  static const _successMessages = [
    'Nice one! Keep it up! 🔥',
    'You\'re on fire! 💪',
    'Nailed it! 🎯',
    'Brilliant! Keep going! ⭐',
    'Awesome work! 🚀',
    'You\'re crushing it! 💥',
    'Way to go! 🌟',
    'Perfect! You\'re a star! ✨',
  ];

  static const _errorMessages = [
    'Almost there! Try the next one! 💪',
    'Don\'t give up, you\'ve got this! 🙌',
    'Every mistake makes you stronger! 💡',
    'Keep pushing, you\'re learning! 📚',
    'No worries, next one\'s yours! 🎯',
    'Stay focused, you\'ll get it! 🧠',
    'That\'s how we learn! Keep going! 🌱',
    'Shake it off and keep rolling! 🎲',
  ];

  @override
  void initState() {
    super.initState();

    _motivationalMessage = widget.isCorrect
        ? _successMessages[_random.nextInt(_successMessages.length)]
        : _errorMessages[_random.nextInt(_errorMessages.length)];

    // Icon animation: bounce for success, shake for error
    _iconController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    if (widget.isCorrect) {
      _scaleAnimation = TweenSequence<double>([
        TweenSequenceItem(tween: Tween(begin: 0.0, end: 1.3), weight: 40),
        TweenSequenceItem(tween: Tween(begin: 1.3, end: 0.9), weight: 20),
        TweenSequenceItem(tween: Tween(begin: 0.9, end: 1.05), weight: 20),
        TweenSequenceItem(tween: Tween(begin: 1.05, end: 1.0), weight: 20),
      ]).animate(CurvedAnimation(
        parent: _iconController,
        curve: Curves.easeOut,
      ));
      _shakeAnimation = AlwaysStoppedAnimation(0.0);
    } else {
      _scaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(
          parent: _iconController,
          curve: const Interval(0.0, 0.3, curve: Curves.easeOut),
        ),
      );
      _shakeAnimation = TweenSequence<double>([
        TweenSequenceItem(tween: Tween(begin: 0, end: -12), weight: 15),
        TweenSequenceItem(tween: Tween(begin: -12, end: 12), weight: 20),
        TweenSequenceItem(tween: Tween(begin: 12, end: -8), weight: 20),
        TweenSequenceItem(tween: Tween(begin: -8, end: 8), weight: 20),
        TweenSequenceItem(tween: Tween(begin: 8, end: 0), weight: 25),
      ]).animate(CurvedAnimation(
        parent: _iconController,
        curve: const Interval(0.3, 1.0),
      ));
    }

    // Particle / fade animation for the motivational text
    _particleController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _particleController, curve: Curves.easeIn),
    );

    _iconController.forward();
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) _particleController.forward();
    });

    // Play the corresponding jingle
    final sound = FeedbackSoundService();
    if (widget.isCorrect) {
      sound.playSuccess();
    } else {
      sound.playError();
    }
  }

  @override
  void dispose() {
    _iconController.dispose();
    _particleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.isCorrect ? Colors.green : Colors.redAccent;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Animated icon with optional particles
          SizedBox(
            height: 120,
            width: 120,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Success particles
                if (widget.isCorrect)
                  AnimatedBuilder(
                    animation: _particleController,
                    builder: (context, _) => CustomPaint(
                      size: const Size(120, 120),
                      painter: _ConfettiPainter(
                        progress: _particleController.value,
                        random: _random,
                      ),
                    ),
                  ),
                // Icon
                AnimatedBuilder(
                  animation: _iconController,
                  builder: (context, child) {
                    return Transform.translate(
                      offset: Offset(_shakeAnimation.value, 0),
                      child: Transform.scale(
                        scale: _scaleAnimation.value,
                        child: child,
                      ),
                    );
                  },
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: color.withValues(alpha: 0.15),
                    ),
                    child: Icon(
                      widget.isCorrect
                          ? Icons.check_rounded
                          : Icons.close_rounded,
                      color: color,
                      size: 48,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Result label
          AnimatedBuilder(
            animation: _iconController,
            builder: (context, child) => Opacity(
              opacity: _iconController.value.clamp(0.0, 1.0),
              child: child,
            ),
            child: Text(
              widget.isCorrect ? 'Correct!' : 'Not quite',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
          // Expected answer for incorrect
          if (!widget.isCorrect && widget.expectedAnswer != null) ...[
            const SizedBox(height: 6),
            Text(
              'Answer: ${widget.expectedAnswer}',
              style: const TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
          const SizedBox(height: 16),
          // Motivational message
          FadeTransition(
            opacity: _fadeAnimation,
            child: Text(
              _motivationalMessage,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: color.withValues(alpha: 0.85),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Paints small confetti-like dots that burst outward on success.
class _ConfettiPainter extends CustomPainter {
  final double progress;
  final Random random;
  late final List<_Particle> _particles;

  _ConfettiPainter({required this.progress, required this.random}) {
    // Seed-stable particles so they don't jump on repaint
    final r = Random(42);
    _particles = List.generate(12, (_) {
      final angle = r.nextDouble() * 2 * pi;
      final speed = 30.0 + r.nextDouble() * 25.0;
      final color = [
        Colors.amber,
        Colors.green,
        Colors.lightBlue,
        Colors.pinkAccent,
        Colors.deepPurple,
        Colors.orange,
      ][r.nextInt(6)];
      return _Particle(angle: angle, speed: speed, color: color);
    });
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (progress == 0) return;
    final center = Offset(size.width / 2, size.height / 2);

    for (final p in _particles) {
      final dist = p.speed * progress;
      final dx = center.dx + cos(p.angle) * dist;
      final dy = center.dy + sin(p.angle) * dist;
      final opacity = (1.0 - progress).clamp(0.0, 1.0);
      final radius = 3.5 * (1.0 - progress * 0.5);

      canvas.drawCircle(
        Offset(dx, dy),
        radius,
        Paint()..color = p.color.withValues(alpha: opacity),
      );
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) => old.progress != progress;
}

class _Particle {
  final double angle;
  final double speed;
  final Color color;
  const _Particle({
    required this.angle,
    required this.speed,
    required this.color,
  });
}
