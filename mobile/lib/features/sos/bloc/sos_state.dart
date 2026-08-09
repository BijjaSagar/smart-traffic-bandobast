import 'package:equatable/equatable.dart';

enum SosStatus { idle, sending, sent, failure }

class SosState extends Equatable {
  final SosStatus status;
  final String? errorMessage;

  const SosState({this.status = SosStatus.idle, this.errorMessage});

  SosState copyWith({SosStatus? status, String? errorMessage}) =>
      SosState(status: status ?? this.status, errorMessage: errorMessage);

  @override
  List<Object?> get props => [status, errorMessage];
}
