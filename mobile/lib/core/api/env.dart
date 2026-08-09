/// Backend base URL, injected at build/run time:
///   flutter run --dart-define=API_BASE_URL=https://your-backend.up.railway.app
class Env {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000', // Android emulator -> host machine localhost
  );
}
