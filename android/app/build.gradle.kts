plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "app.academia"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.academia"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        // the web app the WebView hosts; change here to point elsewhere
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

    buildTypes {
        release {
            isMinifyEnabled = false
            // debug signing so `assembleRelease` produces an installable APK
            // without needing a keystore; replace before any Play Store upload
            signingConfig = signingConfigs.getByName("debug")
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
}
