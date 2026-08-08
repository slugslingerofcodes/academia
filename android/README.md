# Academia — Android app

A thin native shell around the Academia web app. It exists for one reason: the
**floating bubble** that sits over whatever app you're using. That needs the
`SYSTEM_ALERT_WINDOW` permission, which is only available to a native app — no
PWA or browser can draw outside its own window.

Everything else (timetable, reminders, notes, resume) is the same web app, run
as a **Trusted Web Activity** — Chrome itself renders the site, full screen and
without a URL bar, rather than an in-app WebView.

That distinction is the whole design, not a detail. WebView storage is sandboxed
per-app, so a WebView build would open an empty planner and never see the data
belonging to the PWA on the home screen. Running in Chrome means the app and the
installed PWA share one `localStorage`, so they are the same planner.

The site it opens is the `DEFAULT_URL` meta-data in
`app/src/main/AndroidManifest.xml` — change it there. (`APP_URL` in
`app/build.gradle.kts` is a leftover from the WebView build and is read by
nothing.)

## What it does

- `MainActivity` — extends `LauncherActivity` from androidbrowserhelper and
  launches the TWA. It holds the launch back on first run until the overlay
  permission has been answered, so that prompt isn't buried behind Chrome.
- `OverlayService` — a foreground service that adds a draggable, semi‑transparent
  crest bubble via `WindowManager` using `TYPE_APPLICATION_OVERLAY`. Drag to
  move it; tap to open Academia. Its notification has a **Hide bubble** action.

Chrome only drops the URL bar once it has verified
`/.well-known/assetlinks.json` on the site against this app's signing
certificate — see [Signing](#signing).

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

## Signing

Release builds are signed with `academia-release.jks`, a 4096-bit RSA key valid
until 2053. Gradle reads it through `keystore.properties`; both files sit in
`android/` and are **gitignored**.

Back both up somewhere private. The signing key is the app's identity in two
ways that are unforgiving:

- Android refuses to install an update signed with a different key, so losing it
  means every user must uninstall and reinstall.
- Chrome checks its SHA-256 fingerprint against
  `public/.well-known/assetlinks.json` on the site before granting Trusted Web
  Activity status. A mismatch doesn't fail loudly — the app just opens with a
  browser URL bar. **Change the key and you must update that file and redeploy.**

Current fingerprint, matching what the site publishes:

```
BF:29:23:F9:F3:86:5B:66:A2:5A:8E:EE:4B:00:33:0B:9D:66:1A:43:AB:23:4B:D5:55:21:D5:35:E0:37:86:D7
```

Read it back from an APK at any time with:

```
apksigner verify --print-certs app-release.apk
```

If `keystore.properties` is missing — a fresh clone, or CI — the release build
falls back to the debug key so `assembleRelease` still yields something
installable. That build will show a URL bar, because its fingerprint isn't the
published one.

Signing uses v2 and v3 schemes only; v1 (JAR signing) is off because `minSdk` is
26 and every supported device understands v2.

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
