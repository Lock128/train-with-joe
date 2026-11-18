/// Native device details for the Dash0 resource. The SDK itself classifies the
/// client (`app.client.type`, `os.name`, `browser.*`); the device model and OS
/// version need a platform plugin, so they are added here.
library;

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';

/// Builds the OpenTelemetry device and OS attributes. Empty values are left
/// out. Uses `device.model.identifier` (for example `iPhone15,2` or
/// `Pixel 8`), `device.manufacturer` and `os.version`.
Map<String, Object?> dash0DeviceAttributes({
  String? manufacturer,
  String? modelIdentifier,
  String? osVersion,
}) {
  String? clean(String? v) => v == null || v.trim().isEmpty ? null : v.trim();
  final values = <String, String?>{
    'device.manufacturer': clean(manufacturer),
    'device.model.identifier': clean(modelIdentifier),
    'os.version': clean(osVersion),
  };
  return {
    for (final e in values.entries)
      if (e.value != null) e.key: e.value,
  };
}

/// Reads the device model and OS version of native apps. Returns an empty map
/// on web (the SDK reads the browser instead) and on any failure.
Future<Map<String, Object?>> loadDash0DeviceAttributes({
  DeviceInfoPlugin? plugin,
}) async {
  if (kIsWeb) return const {};
  try {
    final info = plugin ?? DeviceInfoPlugin();
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        final a = await info.androidInfo;
        return dash0DeviceAttributes(
          manufacturer: a.manufacturer,
          modelIdentifier: a.model,
          osVersion: a.version.release,
        );
      case TargetPlatform.iOS:
        final i = await info.iosInfo;
        return dash0DeviceAttributes(
          manufacturer: 'Apple',
          modelIdentifier: i.utsname.machine,
          osVersion: i.systemVersion,
        );
      case TargetPlatform.macOS:
        final m = await info.macOsInfo;
        return dash0DeviceAttributes(
          manufacturer: 'Apple',
          modelIdentifier: m.model,
          osVersion: m.osRelease,
        );
      case TargetPlatform.windows:
      case TargetPlatform.linux:
      case TargetPlatform.fuchsia:
        return const {};
    }
  } catch (_) {
    // Telemetry must never break app start.
    return const {};
  }
}
