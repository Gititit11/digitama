/* 디지타마 안드로이드 앱
 *
 * 웹앱(digimon/)을 APK 안에 그대로 넣고 WebView 로 띄운다. 네트워크가 없어도 돌아간다.
 * 웹 파일은 빌드할 때마다 build/web 으로 복사해서 assets 로 쓴다 (android/ 자신은 빼고).
 */
plugins {
    id("com.android.application")
}

val copyWeb by tasks.registering(Sync::class) {
    from(rootDir.parentFile) {
        exclude("android/**", "tools/**", "test/**", "README.md", "sw.js")
    }
    into(layout.buildDirectory.dir("web"))
}

android {
    namespace = "io.github.gititit11.digitama"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.gititit11.digitama"
        minSdk = 24
        // 35 로 올리면 안드로이드 15 가 화면을 상태 표시줄 밑까지 늘려서 위쪽이 가려진다
        targetSdk = 34
        // 깃허브 액션이 빌드할 때마다 1씩 올라서, 새 APK 를 덮어 설치할 수 있다.
        // 예전 저장소(Gititit11/test)에서 53번까지 빌드해서 깔린 앱이 있으니, 그보다 낮아지지 않게 100 을 더한다
        // (버전 번호가 깔린 것보다 낮으면 안드로이드가 설치를 막는다)
        val build = 100 + (System.getenv("GITHUB_RUN_NUMBER") ?: "0").toInt()
        versionCode = build
        versionName = "1.0.$build"
    }

    signingConfigs {
        // 서명 키를 저장소에 고정해 둔다. 빌드할 때마다 키가 바뀌면 새 버전을 덮어 설치할 수 없어서
        // 지우고 다시 깔아야 하고, 그러면 키우던 디지몬(앱 안 저장소)도 사라진다.
        getByName("debug") {
            storeFile = file("digitama-debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("web"))

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

tasks.named("preBuild") { dependsOn(copyWeb) }

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
