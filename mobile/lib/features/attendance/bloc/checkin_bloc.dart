import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/api/api_client.dart';
import '../data/attendance_repository.dart';
import 'checkin_event.dart';
import 'checkin_state.dart';

class CheckInBloc extends Bloc<CheckInEvent, CheckInState> {
  final AttendanceRepository _repository;

  CheckInBloc({AttendanceRepository? repository})
      : _repository = repository ?? AttendanceRepository(),
        super(const CheckInState()) {
    on<CheckInRequested>(_onRequested);
  }

  Future<void> _onRequested(CheckInRequested event, Emitter<CheckInState> emit) async {
    emit(state.copyWith(status: CheckInStatus.submitting));
    try {
      final result = await _repository.checkIn(postAssignmentId: event.postAssignmentId);
      final distance = result.distanceMeters.round();
      final message = result.status == 'present'
          ? 'Checked in — inside geofence ($distance m from post).'
          : 'Checked in but $distance m from the post — flagged LATE for the control room.';
      emit(state.copyWith(status: CheckInStatus.success, message: message));
    } catch (e) {
      final msg = e is Exception && e.toString().startsWith('Exception: ')
          ? e.toString().substring('Exception: '.length)
          : ApiClient.messageFrom(e);
      emit(state.copyWith(status: CheckInStatus.failure, message: msg));
    }
  }
}
