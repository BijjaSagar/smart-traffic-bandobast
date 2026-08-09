import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/api/api_client.dart';
import '../data/sos_repository.dart';
import 'sos_event.dart';
import 'sos_state.dart';

class SosBloc extends Bloc<SosEvent, SosState> {
  final SosRepository _repository;

  SosBloc({SosRepository? repository})
      : _repository = repository ?? SosRepository(),
        super(const SosState()) {
    on<SosTriggered>(_onTriggered);
  }

  Future<void> _onTriggered(SosTriggered event, Emitter<SosState> emit) async {
    emit(state.copyWith(status: SosStatus.sending));
    try {
      await _repository.sendSos(eventId: event.eventId);
      emit(state.copyWith(status: SosStatus.sent));
    } catch (e) {
      emit(state.copyWith(status: SosStatus.failure, errorMessage: ApiClient.messageFrom(e)));
    }
  }
}
