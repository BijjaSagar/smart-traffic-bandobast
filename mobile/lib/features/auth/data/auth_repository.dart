import '../../../core/api/api_client.dart';
import '../../../core/storage/token_storage.dart';
import 'auth_models.dart';

class AuthRepository {
  final _dio = ApiClient.instance.dio;

  Future<AuthUser> login(String email, String password) async {
    final res = await _dio.post('/api/auth/login', data: {
      'email': email,
      'password': password,
    });
    final token = res.data['token'] as String;
    await TokenStorage.instance.save(token);
    return AuthUser.fromJson(res.data['user'] as Map<String, dynamic>);
  }

  Future<AuthUser?> currentUser() async {
    final token = await TokenStorage.instance.read();
    if (token == null) return null;
    try {
      final res = await _dio.get('/api/auth/me');
      return AuthUser.fromJson(res.data['user'] as Map<String, dynamic>);
    } catch (_) {
      await TokenStorage.instance.clear();
      return null;
    }
  }

  Future<void> logout() => TokenStorage.instance.clear();
}
