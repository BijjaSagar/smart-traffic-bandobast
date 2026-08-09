import 'package:dio/dio.dart';
import 'env.dart';
import '../storage/token_storage.dart';

/// Thin wrapper around Dio: attaches the bearer token to every request and
/// centralizes error shaping so BLoCs don't each parse Dio exceptions by hand.
class ApiClient {
  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await TokenStorage.instance.read();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  static final ApiClient instance = ApiClient._internal();
  late final Dio _dio;

  Dio get dio => _dio;

  /// Extracts a human-readable message from a failed request, falling back
  /// to a generic one if the backend didn't send a structured error.
  static String messageFrom(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map && data['error'] != null) {
        return data['error'].toString();
      }
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout) {
        return 'Could not reach the server — check your connection.';
      }
    }
    return 'Something went wrong. Please try again.';
  }
}
