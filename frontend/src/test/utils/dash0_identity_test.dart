import 'package:flutter_test/flutter_test.dart';
import 'package:train_with_joe/utils/dash0_identity.dart';

typedef Call = ({String? id, String? name, String? fullName});

void main() {
  group('Dash0 identity', () {
    final calls = <Call>[];

    void record(String? id, {String? name, String? fullName}) =>
        calls.add((id: id, name: name, fullName: fullName));

    setUp(() {
      calls.clear();
      clearDash0User(identify: (id, {name, fullName}) {});
    });

    test('identifies with the trimmed id only when no name is known', () {
      identifyDash0User(' user-1 ', identify: record);
      expect(calls, [(id: 'user-1', name: null, fullName: null)]);
    });

    test('display name is sent as name and fullName', () {
      identifyDash0User('user-1', displayName: ' Joe ', identify: record);
      expect(calls.single, (id: 'user-1', name: 'Joe', fullName: 'Joe (user-1)'));
    });

    test('login is used as name only when there is no display name', () {
      identifyDash0User('user-1', login: 'joe@example.com', identify: record);
      expect(
        calls.last,
        (id: 'user-1', name: 'joe@example.com', fullName: 'joe@example.com (user-1)'),
      );
      setDash0DisplayName('Joe', identify: record);
      expect(calls.last, (id: 'user-1', name: 'Joe', fullName: 'Joe (user-1)'));
    });

    test('auth refresh keeps the display name', () {
      identifyDash0User('user-1', displayName: 'Joe', identify: record);
      identifyDash0User('user-1', login: 'joe@example.com', identify: record);
      expect(calls.last.name, 'Joe');
    });

    test('names do not leak to a different user', () {
      identifyDash0User('user-1', displayName: 'Joe', identify: record);
      identifyDash0User('user-2', identify: record);
      expect(calls.last, (id: 'user-2', name: null, fullName: null));
    });

    test('setDash0DisplayName is a no-op when nobody is identified or blank', () {
      setDash0DisplayName('Joe', identify: record);
      identifyDash0User('user-1', identify: record);
      setDash0DisplayName('  ', identify: record);
      expect(calls.length, 1);
    });

    test('null and blank ids clear the identity', () {
      identifyDash0User(null, identify: record);
      identifyDash0User('   ', identify: record);
      expect(calls.map((c) => c.id), [null, null]);
    });

    test('clearDash0User clears the identity and names', () {
      identifyDash0User('user-1', displayName: 'Joe', identify: record);
      clearDash0User(identify: record);
      expect(calls.last, (id: null, name: null, fullName: null));
      setDash0DisplayName('Joe', identify: record);
      expect(calls.length, 2);
    });

    test('never throws when the SDK call fails', () {
      expect(
        () => identifyDash0User('user-1', identify: (id, {name, fullName}) => throw StateError('boom')),
        returnsNormally,
      );
    });
  });
}
