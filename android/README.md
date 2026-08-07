# Academia — Android app

A thin native shell around the Academia web app. It exists for one reason: the
**floating bubble** that sits over whatever app you're using. That needs the
`SYSTEM_ALERT_WINDOW` permission, which is only available to a native app — no
PWA or browser can draw outside its own window.

Everything else (timetable, reminders, notes, resume) is the same web app,
loaded in a WebView from `APP_URL` in `app/build.gradle.kts`.

## What it does

- `MainActivity` — hosts the web app in a WebView with DOM storage enabled, so
  your planner data persists exactly as it does in the browser.
- `OverlayService` — a foreground service that adds a draggable, semi‑transparent
  crest bubble via `WindowManager` using `TYPE_APPLICATION_OVERLAY`. Drag to
  move it; tap to open Academia. Its notification has a **Hide bubble** action.

## Building

Requires Android Studio (for its bundled JDK 17+) and SDK platform 36.

```
cd android
./gradlew assembleRelease
```

The APK lands in `app/outputs/apk/release/` inside the build directory.

Two things worth knowing about this setup:

- **Build output lives outside the project.** This repo sits in a OneDrive
  folder, and OneDrive holds file handles while syncing, which makes Gradle fail
  with `AccessDeniedException` on fresh intermediates. `build.gradle.kts`
  redirects the build directory to the system temp folder to avoid it.
- **`local.properties` uses forward slashes** for `sdk.dir`. A Java properties
  file treats `\` as an escape character, so Windows-style paths silently break.

Release builds are signed with the debug key so they install directly. Generate
a real keystore before any Play Store upload.

## Installing

```
adb install -r <path-to>/app-release.apk
```

On first launch the app sends you to **Draw over other apps** in Settings —
Android does not allow this to be granted by a normal permission prompt. Once
allowed, the bubble appears immediately.

## Known Android behaviour

The bubble is **deliberately hidden by Android over Settings** and other
sensitive screens (`mIsForceHiddenNonSystemOverlayWindow`), an anti‑tapjacking
protection so overlays can't sit on top of permission dialogs. This is expected
and not a fault in the app — it shows normally over the launcher and ordinary
apps.
