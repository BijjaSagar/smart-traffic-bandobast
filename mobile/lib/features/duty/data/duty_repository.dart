import '../../../core/api/api_client.dart';
import 'duty_models.dart';

class DutyRepository {
  final _dio = ApiClient.instance.dio;

  Future<List<DutyAssignment>> myAssignments() async {
    final res = await _dio.get('/api/posts/mine');
    final list = (res.data['assignments'] as List).cast<Map<String, dynamic>>();
    return list.map(DutyAssignment.fromJson).toList();
  }
}
