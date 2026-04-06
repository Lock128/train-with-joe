import 'dart:io';
import 'dart:math';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

/// Generates and plays short melodic jingles for correct/incorrect answers.
/// Tones are synthesized in memory as WAV, written to temp files for reliable
/// iOS playback via AVAudioPlayer.
class FeedbackSoundService {
  static final FeedbackSoundService _instance = FeedbackSoundService._();
  factory FeedbackSoundService() => _instance;
  FeedbackSoundService._();

  final _player = AudioPlayer();
  String? _successPath;
  String? _errorPath;
  bool _initialized = false;

  /// Pre-generate both jingles and write to temp files.
  /// Must be called before playSuccess/playError.
  Future<void> init() async {
    if (_initialized) return;
    try {
      final dir = await getTemporaryDirectory();

      final successFile = File('${dir.path}/feedback_success.wav');
      await successFile.writeAsBytes(_buildSuccessJingle(), flush: true);
      _successPath = successFile.path;

      final errorFile = File('${dir.path}/feedback_error.wav');
      await errorFile.writeAsBytes(_buildErrorJingle(), flush: true);
      _errorPath = errorFile.path;

      // Configure audio session for playback that mixes with other audio
      // and plays even when the iOS silent switch is on.
      await _player.setAudioContext(AudioContext(
        iOS: AudioContextIOS(
          category: AVAudioSessionCategory.playback,
          options: {AVAudioSessionOptions.mixWithOthers},
        ),
        android: AudioContextAndroid(
          usageType: AndroidUsageType.game,
          contentType: AndroidContentType.sonification,
        ),
      ));

      _initialized = true;
    } catch (e) {
      debugPrint('FeedbackSoundService.init failed: $e');
    }
  }

  Future<void> playSuccess() async {
    if (!_initialized) await init();
    try {
      final path = _successPath;
      if (path == null) return;
      await _player.stop();
      await _player.play(DeviceFileSource(path));
    } catch (e) {
      debugPrint('FeedbackSoundService: could not play success sound: $e');
    }
  }

  Future<void> playError() async {
    if (!_initialized) await init();
    try {
      final path = _errorPath;
      if (path == null) return;
      await _player.stop();
      await _player.play(DeviceFileSource(path));
    } catch (e) {
      debugPrint('FeedbackSoundService: could not play error sound: $e');
    }
  }

  void dispose() {
    _player.dispose();
  }

  // ── Tone synthesis ──────────────────────────────────────────────

  static const int _sampleRate = 44100;

  /// Happy ascending arpeggio: C5 → E5 → G5 → C6 (major chord)
  Uint8List _buildSuccessJingle() {
    final notes = <_Note>[
      _Note(523.25, 0.10), // C5
      _Note(659.25, 0.10), // E5
      _Note(783.99, 0.10), // G5
      _Note(1046.50, 0.18), // C6 (held slightly longer)
    ];
    return _renderNotes(notes, volume: 0.35);
  }

  /// Gentle descending two-tone: E4 → C4 (soft minor feel)
  Uint8List _buildErrorJingle() {
    final notes = <_Note>[
      _Note(329.63, 0.15), // E4
      _Note(261.63, 0.22), // C4 (held longer, fades out)
    ];
    return _renderNotes(notes, volume: 0.28);
  }

  Uint8List _renderNotes(List<_Note> notes, {double volume = 0.3}) {
    var totalSeconds = 0.0;
    for (final n in notes) {
      totalSeconds += n.duration;
    }
    final totalSamples = (totalSeconds * _sampleRate).ceil();
    final samples = Float64List(totalSamples);

    var offset = 0;
    for (final n in notes) {
      final count = (n.duration * _sampleRate).ceil();
      for (var i = 0; i < count && (offset + i) < totalSamples; i++) {
        final t = i / _sampleRate;
        final env = _envelope(i, count);
        samples[offset + i] = sin(2 * pi * n.frequency * t) * env * volume;
      }
      offset += count;
    }

    return _encodeWav(samples);
  }

  double _envelope(int sample, int total) {
    final pos = sample / total;
    if (pos < 0.05) return pos / 0.05;
    if (pos > 0.6) return (1.0 - pos) / 0.4;
    return 1.0;
  }

  Uint8List _encodeWav(Float64List samples) {
    final numSamples = samples.length;
    final dataSize = numSamples * 2;
    final fileSize = 44 + dataSize;

    final buffer = ByteData(fileSize);
    var p = 0;

    void writeString(String s) {
      for (var i = 0; i < s.length; i++) {
        buffer.setUint8(p++, s.codeUnitAt(i));
      }
    }

    writeString('RIFF');
    buffer.setUint32(p, fileSize - 8, Endian.little); p += 4;
    writeString('WAVE');

    writeString('fmt ');
    buffer.setUint32(p, 16, Endian.little); p += 4;
    buffer.setUint16(p, 1, Endian.little); p += 2;
    buffer.setUint16(p, 1, Endian.little); p += 2;
    buffer.setUint32(p, _sampleRate, Endian.little); p += 4;
    buffer.setUint32(p, _sampleRate * 2, Endian.little); p += 4;
    buffer.setUint16(p, 2, Endian.little); p += 2;
    buffer.setUint16(p, 16, Endian.little); p += 2;

    writeString('data');
    buffer.setUint32(p, dataSize, Endian.little); p += 4;

    for (var i = 0; i < numSamples; i++) {
      final clamped = samples[i].clamp(-1.0, 1.0);
      final intVal = (clamped * 32767).round().clamp(-32768, 32767);
      buffer.setInt16(p, intVal, Endian.little);
      p += 2;
    }

    return buffer.buffer.asUint8List();
  }
}

class _Note {
  final double frequency;
  final double duration;
  const _Note(this.frequency, this.duration);
}
