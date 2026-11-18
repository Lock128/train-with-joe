import 'package:flutter_test/flutter_test.dart';
import 'package:train_with_joe/utils/dash0_device.dart';

void main() {
  test('maps values to OpenTelemetry attribute names', () {
    expect(
      dash0DeviceAttributes(
        manufacturer: 'Apple',
        modelIdentifier: 'iPhone15,2',
        osVersion: '17.4',
      ),
      {
        'device.manufacturer': 'Apple',
        'device.model.identifier': 'iPhone15,2',
        'os.version': '17.4',
      },
    );
  });

  test('drops null, empty and blank values and trims', () {
    expect(
      dash0DeviceAttributes(
        manufacturer: ' ',
        modelIdentifier: ' Pixel 8 ',
        osVersion: null,
      ),
      {'device.model.identifier': 'Pixel 8'},
    );
  });

  test('returns nothing without a device plugin (test host)', () async {
    // The VM test host has no platform channel, so this exercises the
    // failure path and must not throw.
    expect(await loadDash0DeviceAttributes(), isEmpty);
  });
}
