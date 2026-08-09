import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/bloc/auth_bloc.dart';
import '../../features/auth/bloc/auth_state.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/duty/bloc/duty_bloc.dart';
import '../../features/duty/bloc/duty_event.dart';
import '../../features/duty/presentation/duty_page.dart';

/// Redirects based on AuthBloc's current status, so navigation always
/// reflects whether the officer is signed in — no manual push/pop juggling
/// scattered across screens.
GoRouter buildRouter(AuthBloc authBloc) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: _AuthBlocListenable(authBloc),
    redirect: (context, state) {
      final status = authBloc.state.status;
      final loggingIn = state.matchedLocation == '/login';

      if (status == AuthStatus.unknown) return null; // still resolving
      if (status != AuthStatus.authenticated && !loggingIn) return '/login';
      if (status == AuthStatus.authenticated && loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
      GoRoute(
        path: '/',
        builder: (context, state) => BlocProvider(
          create: (_) => DutyBloc()..add(const DutyLoadRequested()),
          child: const DutyPage(),
        ),
      ),
    ],
  );
}

/// Bridges a Bloc's stream to GoRouter's Listenable requirement so route
/// redirects re-evaluate automatically whenever auth state changes.
class _AuthBlocListenable extends ChangeNotifier {
  _AuthBlocListenable(AuthBloc bloc) {
    _subscription = bloc.stream.listen((_) => notifyListeners());
  }
  late final StreamSubscription _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
