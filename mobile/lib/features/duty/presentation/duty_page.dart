import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../attendance/bloc/checkin_bloc.dart';
import '../../attendance/bloc/checkin_event.dart';
import '../../attendance/bloc/checkin_state.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../auth/bloc/auth_event.dart';
import '../../sos/bloc/sos_bloc.dart';
import '../../sos/presentation/sos_button.dart';
import '../bloc/duty_bloc.dart';
import '../bloc/duty_event.dart';
import '../bloc/duty_state.dart';
import '../data/duty_models.dart';

/// Landing screen for a field officer: their assigned post(s) for the
/// current bandobast, a geofenced check-in button per assignment, and
/// the SOS panic button always visible at the bottom.
class DutyPage extends StatelessWidget {
  const DutyPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Duty'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AuthBloc>().add(const AuthLoggedOut()),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => context.read<DutyBloc>().add(const DutyLoadRequested()),
          child: BlocBuilder<DutyBloc, DutyState>(
            builder: (context, state) {
              if (state.status == DutyStatus.loading || state.status == DutyStatus.initial) {
                return const Center(child: CircularProgressIndicator());
              }
              if (state.status == DutyStatus.failure) {
                return _ErrorView(message: state.errorMessage ?? 'Could not load your duty.');
              }

              final assignments = state.assignments;
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (assignments.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Text(
                        'No active duty assignment. Check back closer to your shift.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.black54),
                      ),
                    ),
                  for (final a in assignments) _AssignmentCard(assignment: a),
                  const SizedBox(height: 32),
                  if (assignments.isNotEmpty)
                    Center(
                      child: BlocProvider(
                        create: (_) => SosBloc(),
                        child: SosButton(eventId: assignments.first.post.eventId),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _AssignmentCard extends StatelessWidget {
  final DutyAssignment assignment;
  const _AssignmentCard({required this.assignment});

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('d MMM, h:mm a');
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(assignment.post.name,
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.navy, fontSize: 16)),
            const SizedBox(height: 2),
            Text(assignment.post.type.toUpperCase(),
                style: const TextStyle(color: Colors.black45, fontSize: 11, letterSpacing: 0.5)),
            const SizedBox(height: 8),
            Text(
              '${fmt.format(assignment.shiftStart)} — ${fmt.format(assignment.shiftEnd)}',
              style: const TextStyle(color: Colors.black54, fontSize: 12),
            ),
            const SizedBox(height: 12),
            BlocProvider(
              create: (_) => CheckInBloc(),
              child: _CheckInButton(assignmentId: assignment.assignmentId),
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckInButton extends StatelessWidget {
  final int assignmentId;
  const _CheckInButton({required this.assignmentId});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<CheckInBloc, CheckInState>(
      listener: (context, state) {
        if (state.message != null &&
            (state.status == CheckInStatus.success || state.status == CheckInStatus.failure)) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.message!)));
        }
      },
      builder: (context, state) {
        final submitting = state.status == CheckInStatus.submitting;
        final done = state.status == CheckInStatus.success;
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: submitting
                ? null
                : () => context.read<CheckInBloc>().add(CheckInRequested(assignmentId)),
            icon: Icon(done ? Icons.check_circle : Icons.my_location, size: 18),
            label: Text(submitting ? 'Checking in…' : (done ? 'Checked in' : 'Check In at Post')),
            style: ElevatedButton.styleFrom(
              backgroundColor: done ? AppColors.success : AppColors.navy,
            ),
          ),
        );
      },
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  const _ErrorView({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AppColors.alert, size: 40),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => context.read<DutyBloc>().add(const DutyLoadRequested()),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
