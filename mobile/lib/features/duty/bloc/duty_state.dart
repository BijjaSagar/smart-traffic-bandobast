import 'package:equatable/equatable.dart';
import '../data/duty_models.dart';

enum DutyStatus { initial, loading, loaded, failure }

class DutyState extends Equatable {
  final DutyStatus status;
  final List<DutyAssignment> assignments;
  final String? errorMessage;

  const DutyState({
    this.status = DutyStatus.initial,
    this.assignments = const [],
    this.errorMessage,
  });

  DutyState copyWith({DutyStatus? status, List<DutyAssignment>? assignments, String? errorMessage}) {
    return DutyState(
      status: status ?? this.status,
      assignments: assignments ?? this.assignments,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, assignments, errorMessage];
}
