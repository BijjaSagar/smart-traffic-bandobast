import 'package:equatable/equatable.dart';

abstract class DutyEvent extends Equatable {
  const DutyEvent();
  @override
  List<Object?> get props => [];
}

class DutyLoadRequested extends DutyEvent {
  const DutyLoadRequested();
}
