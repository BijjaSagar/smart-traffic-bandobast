import 'package:equatable/equatable.dart';

abstract class CheckInEvent extends Equatable {
  const CheckInEvent();
  @override
  List<Object?> get props => [];
}

class CheckInRequested extends CheckInEvent {
  final int postAssignmentId;
  const CheckInRequested(this.postAssignmentId);
  @override
  List<Object?> get props => [postAssignmentId];
}
