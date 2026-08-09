# Smart Bandobast — Field Officer App (Flutter)

The mobile companion to the SBS web command dashboard, for constables and officers on
duty. Feature-first BLoC architecture, matching RH Technology's standard Flutter conventions.

## What it does

- **Login** with department credentials (same auth as the web app — one backend, both clients).
- **My Duty** — shows the officer's assigned post(s) for the current bandobast event.
- **Geofenced check-in** — one tap, uses device GPS, backend confirms whether you're
  inside the post's geofence radius (marks "late" if not, instead of failing silently).
- **One-tap SOS** — big red panic button, sends live GPS location to the control room
  instantly over the same backend used by the command dashboard.

## Structure

```
lib/
  core/           API client, secure token storage, router, theme
  features/
    auth/         login screen + AuthBloc
    duty/         "my duty" screen + DutyBloc (fetches assigned posts)
    attendance/   CheckInBloc (geofenced check-in)
    sos/          SOS button + SosBloc
```

## Setup

```bash
flutter pub get
```

Create `lib/core/api/env.dart` (gitignored) from the example below, pointing at your
Railway backend:

```dart
class Env {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://your-backend.up.railway.app',
  );
}
```

Run with:

```bash
flutter run --dart-define=API_BASE_URL=https://your-backend.up.railway.app
```

## Notes

- Uses the exact same REST API as `frontend/` (`/api/auth/login`, `/api/posts/mine`,
  `/api/attendance/checkin`, `/api/sos`) — no backend changes needed to support this app.
- `geolocator` requires location permission entries in `android/app/src/main/AndroidManifest.xml`
  and `ios/Runner/Info.plist` (ACCESS_FINE_LOCATION / NSLocationWhenInUseUsageDescription) —
  added automatically when you run `flutter create .` to generate the platform folders
  (not included here; see "Generating platform folders" below).

## Generating platform folders

This repo ships only the Dart source (`lib/`) and `pubspec.yaml` — the standard approach
for a source-controlled Flutter feature. To get a runnable app locally:

```bash
cd mobile
flutter create --project-name smart_bandobast --org in.rhtechnology .
flutter pub get
```

This generates `android/`, `ios/`, etc. around the existing `lib/`. Then add the location
permission lines noted above before running on a device.
