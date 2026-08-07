package app.academia

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * Hosts the Academia web app in a WebView and manages the floating bubble.
 *
 * The web app itself is unchanged — this shell exists purely to provide the
 * one capability the browser cannot: drawing over other apps.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    private val overlayPermission =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
            if (canDrawOverlays()) {
                startOverlay()
            } else {
                Toast.makeText(this, R.string.overlay_denied, Toast.LENGTH_LONG).show()
            }
        }

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* optional */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true   // the planner stores data in localStorage
            webViewClient = WebViewClient()
            loadUrl(BuildConfig.APP_URL)
        }
        setContentView(webView)

        askForNotifications()
        ensureOverlay()
    }

    private fun askForNotifications() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    private fun canDrawOverlays(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)

    /**
     * "Draw over other apps" cannot be granted by a normal runtime prompt —
     * Android requires the user to flip it in Settings, so send them there.
     */
    private fun ensureOverlay() {
        if (canDrawOverlays()) {
            startOverlay()
            return
        }
        Toast.makeText(this, R.string.overlay_needed, Toast.LENGTH_LONG).show()
        overlayPermission.launch(
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
        )
    }

    private fun startOverlay() {
        ContextCompat.startForegroundService(this, Intent(this, OverlayService::class.java))
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    @Deprecated("Handled for back navigation inside the web app")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else @Suppress("DEPRECATION") super.onBackPressed()
    }
}
