import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Wraps secure, encrypted on-device storage for the auth token.
/// Kept as its own small class so the rest of the app never touches
/// flutter_secure_storage directly.
class TokenStorage {
  TokenStorage._();
  static final TokenStorage instance = TokenStorage._();

  final _storage = const FlutterSecureStorage();
  static const _tokenKey = 'sbs_token';

  Future<void> save(String token) => _storage.write(key: _tokenKey, value: token);
  Future<String?> read() => _storage.read(key: _tokenKey);
  Future<void> clear() => _storage.delete(key: _tokenKey);
}
