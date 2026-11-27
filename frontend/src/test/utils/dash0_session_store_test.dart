import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:train_with_joe/utils/dash0_session_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('persists values across store instances', () async {
    SharedPreferences.setMockInitialValues({});
    await Dash0SessionStore().set('d0_session', 'abc#1#2');
    expect(await Dash0SessionStore().get('d0_session'), 'abc#1#2');
  });

  test('remove deletes the value', () async {
    SharedPreferences.setMockInitialValues({'d0_session': 'abc#1#2'});
    final store = Dash0SessionStore();
    await store.remove('d0_session');
    expect(await store.get('d0_session'), isNull);
  });

  test('keeps the session in memory when persistent storage fails', () async {
    final store = Dash0SessionStore(
      loader: () async => throw StateError('storage unavailable'),
    );
    expect(await store.get('d0_session'), isNull);
    await store.set('d0_session', 'abc#1#2');
    expect(await store.get('d0_session'), 'abc#1#2');
    await store.remove('d0_session');
    expect(await store.get('d0_session'), isNull);
  });
}
