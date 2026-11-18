import 'package:flutter_test/flutter_test.dart';
import 'package:train_with_joe/utils/dash0_identity.dart';

void main() {
  group('Dash0 identity', () {
    final calls = <Map<String, Object?>>[];

    void record(String? id, {List<String>? roles}) {
      calls.add({'id': id, 'roles': roles});
    }

    setUp(() {
      calls.clear();
      // Reset module state.
      clearDash0User(identify: (id, {roles}) {});
    });

    test('identifies with the user id only, no roles for regular users', () {
      identifyDash0User(' user-1 ', identify: record);
      expect(calls.single, {'id': 'user-1', 'roles': null});
    });

    test('adds the admin role for admins', () {
      identifyDash0User('user-1', isAdmin: true, identify: record);
      expect(calls.single['roles'], ['admin']);
    });

    test('keeps admin status for the same user when isAdmin is omitted', () {
      identifyDash0User('user-1', isAdmin: true, identify: record);
      identifyDash0User('user-1', identify: record);
      expect(calls.last['roles'], ['admin']);
    });

    test('resets admin status when another user signs in', () {
      identifyDash0User('user-1', isAdmin: true, identify: record);
      identifyDash0User('user-2', identify: record);
      expect(calls.last, {'id': 'user-2', 'roles': null});
    });

    test('null and blank ids clear the identity', () {
      identifyDash0User('user-1', identify: record);
      identifyDash0User(null, identify: record);
      identifyDash0User('   ', identify: record);
      expect(calls[1], {'id': null, 'roles': null});
      expect(calls[2], {'id': null, 'roles': null});
    });

    test('clearDash0User clears and forgets admin status', () {
      identifyDash0User('user-1', isAdmin: true, identify: record);
      clearDash0User(identify: record);
      identifyDash0User('user-1', identify: record);
      expect(calls[1]['id'], isNull);
      expect(calls[2]['roles'], isNull);
    });

    test('never throws when the SDK call fails', () {
      expect(
        () => identifyDash0User(
          'user-1',
          identify: (id, {roles}) => throw StateError('boom'),
        ),
        returnsNormally,
      );
    });

    test('dash0RolesFor', () {
      expect(dash0RolesFor(isAdmin: true), ['admin']);
      expect(dash0RolesFor(isAdmin: false), isNull);
    });
  });
}
