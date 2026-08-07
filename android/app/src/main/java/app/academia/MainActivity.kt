package app.academia

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.google.androidbrowserhelper.trusted.LauncherActivity

/**
 * Launches Academia as a Trusted Web Activity and manages the floating bubble.
 *
 * A TWA renders the site inside Chrome rather than an in-app WebView, which
 * matters here: WebView storage is sandboxed per-app, so a WebView build would
 * start with an empty planner and never see data from the PWA on the home
 * screen. Running in Chrome means both share exactly the same localStorage.
 *
 * Chrome only grants that (and drops the URL bar) once it has verified
 * /.well-known/assetlinks.json on the site against this app's signing
 * certificate.
 */
class MainActivity : LauncherActivity() {

    private companion object {
        const val REQUEST_OVERLAY = 1001
    }

    private fun canDrawOverlays(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)

    /**
     * Hold the web app back on the very first run so the overlay prompt isn't
     * buried behind Chrome. Afterwards it opens straight away.
     */
    override fun shouldLaunchImmediately(): Boolean = canDrawOverlays()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (canDrawOverlays()) {
            startOverlayIfAllowed()
            return
        }

        // "Draw over other apps" can't be granted by a runtime prompt — Android
        // requires the user to flip it in Settings. LauncherActivity extends a
        // plain Activity, so this uses the classic result API.
        @Suppress("DEPRECATION")
        startActivityForResult(
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            ),
            REQUEST_OVERLAY
        )
    }

    @Deprecated("Classic result API; LauncherActivity is not a ComponentActivity")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_OVERLAY) return
        // carry on into the web app whichever way the user answered
        startOverlayIfAllowed()
        launchTwa()
    }

    private fun startOverlayIfAllowed() {
        if (!canDrawOverlays()) return
        ContextCompat.startForegroundService(this, Intent(this, OverlayService::class.java))
    }
}
