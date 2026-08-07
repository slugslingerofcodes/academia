package app.academia

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import kotlin.math.abs

/**
 * Keeps a draggable, semi-transparent Academia bubble on screen above whatever
 * app is in the foreground.
 *
 * This is the one piece a PWA cannot do: drawing outside our own window needs
 * the SYSTEM_ALERT_WINDOW permission, which is only available to a native app.
 * It runs as a foreground service so Android does not reclaim it in the
 * background.
 */
class OverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private var bubble: View? = null

    companion object {
        private const val CHANNEL_ID = "academia_overlay"
        private const val NOTIFICATION_ID = 1
        const val ACTION_STOP = "app.academia.STOP_OVERLAY"

        /** Idle transparency — visible but not in the way. */
        private const val IDLE_ALPHA = 0.55f
        private const val ACTIVE_ALPHA = 0.95f

        /** Movement beyond this many pixels counts as a drag, not a tap. */
        private const val DRAG_SLOP = 12
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        startForeground(NOTIFICATION_ID, buildNotification())
        showBubble()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    private fun buildNotification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "Academia bubble",
                    NotificationManager.IMPORTANCE_LOW
                )
            )
        }

        val stop = PendingIntent.getService(
            this,
            0,
            Intent(this, OverlayService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE
        )

        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Academia bubble is on")
            .setContentText("Tap the bubble to open your timetable")
            .setSmallIcon(android.R.drawable.ic_menu_my_calendar)
            .addAction(
                Notification.Action.Builder(null, "Hide bubble", stop).build()
            )
            .setOngoing(true)
            .build()
    }

    private fun overlayType(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

    private fun showBubble() {
        if (bubble != null) return

        val size = (56 * resources.displayMetrics.density).toInt()
        val view = ImageView(this).apply {
            setImageResource(R.mipmap.ic_launcher_round)
            alpha = IDLE_ALPHA
            contentDescription = getString(R.string.bubble_description)
        }

        val params = WindowManager.LayoutParams(
            size,
            size,
            overlayType(),
            // not focusable, so taps outside still reach the app underneath
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = resources.displayMetrics.widthPixels - size - 24
            y = resources.displayMetrics.heightPixels / 3
        }

        view.setOnTouchListener(object : View.OnTouchListener {
            private var startX = 0
            private var startY = 0
            private var touchX = 0f
            private var touchY = 0f
            private var dragged = false

            override fun onTouch(v: View, event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        startX = params.x
                        startY = params.y
                        touchX = event.rawX
                        touchY = event.rawY
                        dragged = false
                        v.alpha = ACTIVE_ALPHA
                        return true
                    }

                    MotionEvent.ACTION_MOVE -> {
                        val dx = (event.rawX - touchX).toInt()
                        val dy = (event.rawY - touchY).toInt()
                        if (abs(dx) > DRAG_SLOP || abs(dy) > DRAG_SLOP) dragged = true
                        params.x = startX + dx
                        params.y = startY + dy
                        windowManager.updateViewLayout(v, params)
                        return true
                    }

                    MotionEvent.ACTION_UP -> {
                        v.alpha = IDLE_ALPHA
                        if (!dragged) openApp()
                        return true
                    }
                }
                return false
            }
        })

        windowManager.addView(view, params)
        bubble = view
    }

    private fun openApp() {
        startActivity(
            Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        )
    }

    override fun onDestroy() {
        bubble?.let { windowManager.removeView(it) }
        bubble = null
        super.onDestroy()
    }
}
