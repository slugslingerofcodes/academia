import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

/**
 * Release signing, read from android/keystore.properties.
 *
 * That file and the .jks beside it are gitignored: the signing key is the app's
 * identity. Chrome checks its fingerprint against assetlinks.json on the site
 * before granting Trusted Web Activity status, and Android refuses to update an
 * installed app signed with a different key. Losing it means every user has to
 * uninstall and reinstall.
 *
 * When it's absent — a fresh clone, or CI — the release build falls back to the
 * debug key so `assembleRelease` still produces something installable. Such a
 * build will show a URL bar, because its fingerprint isn't the published one.
 */
val keystoreProperties = Properties().apply {
    val file = rootProject.file("keystore.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
val hasReleaseKey = keystoreProperties.getProperty("storeFile") != null

android {
    namespace = "app.academia"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.academia"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        // Unused: a leftover from when this was a WebView shell. The TWA opens
        // the DEFAULT_URL meta-data in AndroidManifest.xml, so changing this
        // moves nothing — kept only until something is confirmed to read it.
        buildConfigField("String", "APP_URL", "\"https://academia-planner.vercel.app\"")
    }

    buildFeatures {
        buildConfig = true
    }

    lint {
        // the release build is installed by hand, not shipped to Play, so the
        // blocking lintVital pass only slows the loop down
        checkReleaseBuilds = false
    }

    signingConfigs {
        if (hasReleaseKey) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                enableV1Signing = false // minSdk is 26; v2/v3 cover every device
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig =
                if (hasReleaseKey) signingConfigs.getByName("release")
                else signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    // Trusted Web Activity: renders the site in Chrome itself, so the app
    // shares storage with the installed PWA instead of an isolated WebView
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.5.0")
}
