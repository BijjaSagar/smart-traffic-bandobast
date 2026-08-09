import 'package:equatable/equatable.dart';

enum CheckInStatus { idle, submitting, success, failure }

class CheckInState extends Equatable {
  final CheckInStatus status;
  final String? message;

  const CheckInState({this.status = CheckInStatus.idle, this.message});

  CheckInState copyWith({CheckInStatus? status, String? message}) =>
      CheckInState(status: status ?? this.status, message: message);

  @override
  List<Object?> get props => [status, message];
}
