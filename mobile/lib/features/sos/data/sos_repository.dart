import '../../../core/api/api_client.dart';
import '../../attendance/data/attendance_repository.dart';

class SosRepository {
  final _dio = ApiClient.instance.dio;
  final _attendance = AttendanceRepository();

  /// Sends a panic alert with the officer's live GPS location.
  /// Deliberately minimal — the officer needs this to work with one
  /// thumb, one tap, in under two seconds.
  Future<void> sendSos({required int eventId}) async {
    final position = await _attendance.currentPosition();
    await _dio.post('/api/sos', data: {
      'eventId': eventId,
      'lat': position.latitude,
      'lng': position.longitude,
    });
  }
}
