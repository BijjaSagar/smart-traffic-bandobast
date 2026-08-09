import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/api/api_client.dart';
import '../data/duty_repository.dart';
import 'duty_event.dart';
import 'duty_state.dart';

class DutyBloc extends Bloc<DutyEvent, DutyState> {
  final DutyRepository _repository;

  DutyBloc({DutyRepository? repository})
      : _repository = repository ?? DutyRepository(),
        super(const DutyState()) {
    on<DutyLoadRequested>(_onLoadRequested);
  }

  Future<void> _onLoadRequested(DutyLoadRequested event, Emitter<DutyState> emit) async {
    emit(state.copyWith(status: DutyStatus.loading));
    try {
      final assignments = await _repository.myAssignments();
      emit(state.copyWith(status: DutyStatus.loaded, assignments: assignments));
    } catch (e) {
      emit(state.copyWith(status: DutyStatus.failure, errorMessage: ApiClient.messageFrom(e)));
    }
  }
}
