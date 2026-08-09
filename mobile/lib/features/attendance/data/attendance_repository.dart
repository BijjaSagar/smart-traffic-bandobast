import 'package:geolocator/geolocator.dart';
import '../../../core/api/api_client.dart';

class CheckInResult {
  final String status; // present | late
  final double distanceMeters;
  const CheckInResult({required this.status, required this.distanceMeters});
}

class AttendanceRepository {
  final _dio = ApiClient.instance.dio;

  /// Ensures location permission is granted and the device's location
  /// service is on, then returns the current high-accuracy position.
  /// Throws a plain-English error the UI can show directly.
  Future<Position> currentPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Turn on location services to check in.');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permission is required to check in at your post.');
      }
    }
    if (permission == LocationPermission.deniedForever) {
      throw Exception('Location permission permanently denied — enable it in device settings.');
    }

    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  Future<CheckInResult> checkIn({required int postAssignmentId}) async {
    final position = await currentPosition();
    final res = await _dio.post('/api/attendance/checkin', data: {
      'postAssignmentId': postAssignmentId,
      'lat': position.latitude,
      'lng': position.longitude,
    });
    return CheckInResult(
      status: res.data['status'] as String,
      distanceMeters: (res.data['distanceMeters'] as num).toDouble(),
    );
  }
}
