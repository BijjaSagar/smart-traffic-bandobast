import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/bloc/auth_bloc.dart';
import 'features/auth/bloc/auth_event.dart';

class SmartBandobastApp extends StatelessWidget {
  const SmartBandobastApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => AuthBloc()..add(const AuthStarted()),
      child: Builder(
        builder: (context) {
          final authBloc = context.read<AuthBloc>();
          final router = buildRouter(authBloc);
          return _RouterApp(router: router);
        },
      ),
    );
  }
}

class _RouterApp extends StatelessWidget {
  final GoRouter router;
  const _RouterApp({required this.router});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Smart Bandobast',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}
