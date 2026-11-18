import 'package:flutter_test/flutter_test.dart';
import 'package:train_with_joe/utils/dash0_identity.dart';

void main() {
  group('Dash0 identity', () {
    final calls = <String?>[];

    void record(String? id) => calls.add(id);

    setUp(calls.clear);

    test('identifies with the trimmed user id only', () {
      identifyDash0User(' user-1 ', identify: record);
      expect(calls, ['user-1']);
    });

    test('null and blank ids clear the identity', () {
      identifyDash0User(null, identify: record);
      identifyDash0User('   ', identify: record);
      expect(calls, [null, null]);
    });

    test('clearDash0User clears the identity', () {
      identifyDash0User('user-1', identify: record);
      clearDash0User(identify: record);
      expect(calls, ['user-1', null]);
    });

    test('never throws when the SDK call fails', () {
      expect(
        () => identifyDash0User(
          'user-1',
          identify: (id) => throw StateError('boom'),
        ),
        returnsNormally,
      );
    });
  });
}
