import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../bloc/sos_bloc.dart';
import '../bloc/sos_event.dart';
import '../bloc/sos_state.dart';

/// The panic button. Kept visually separate (big, red, circular, always
/// reachable) from the rest of the UI on purpose — this is the one
/// interaction that has to work instantly under stress.
class SosButton extends StatelessWidget {
  final int eventId;
  const SosButton({super.key, required this.eventId});

  Future<bool> _confirm(BuildContext context) async {
    return await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Send SOS alert?'),
            content: const Text(
              'This immediately notifies the control room with your live location. '
              'Only use this in a genuine emergency.',
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: AppColors.alert),
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Send SOS'),
              ),
            ],
          ),
        ) ??
        false;
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SosBloc, SosState>(
      listener: (context, state) {
        if (state.status == SosStatus.sent) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppColors.success,
              content: Text('Alert sent — control room notified with your location.'),
            ),
          );
        } else if (state.status == SosStatus.failure && state.errorMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(backgroundColor: AppColors.alert, content: Text(state.errorMessage!)),
          );
        }
      },
      builder: (context, state) {
        final sending = state.status == SosStatus.sending;
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            GestureDetector(
              onTap: sending
                  ? null
                  : () async {
                      final ok = await _confirm(context);
                      if (ok && context.mounted) {
                        context.read<SosBloc>().add(SosTriggered(eventId));
                      }
                    },
              child: Container(
                width: 160,
                height: 160,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.alert.withOpacity(sending ? 0.6 : 1),
                  boxShadow: [
                    BoxShadow(color: AppColors.alert.withOpacity(0.4), blurRadius: 20, spreadRadius: 4),
                  ],
                ),
                alignment: Alignment.center,
                child: Text(
                  sending ? 'Sending…' : 'SOS',
                  style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Press only in a genuine emergency.\nYour live location is sent instantly.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.black45, fontSize: 12),
            ),
          ],
        );
      },
    );
  }
}
