plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}

/*
 * This project lives inside a OneDrive-synced folder. OneDrive grabs file
 * handles while it uploads, which makes Gradle fail with AccessDeniedException
 * on freshly written build intermediates. Keeping build output outside the
 * synced tree avoids that entirely — and is portable, since it is derived from
 * the JVM's temp directory rather than a hard-coded path.
 */
val outsideSyncedFolder = File(System.getProperty("java.io.tmpdir"), "academia-android-build")

allprojects {
    layout.buildDirectory.set(File(outsideSyncedFolder, project.name))
}
