import 'package:equatable/equatable.dart';

abstract class SosEvent extends Equatable {
  const SosEvent();
  @override
  List<Object?> get props => [];
}

class SosTriggered extends SosEvent {
  final int eventId;
  const SosTriggered(this.eventId);
  @override
  List<Object?> get props => [eventId];
}
