package io.github.gititit11.digitama;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * APK 에 넣은 웹앱을 띄운다.
 *
 * 파일을 file:// 로 열면 localStorage 와 카메라가 막히는 경우가 있어서,
 * WebViewAssetLoader 로 https://appassets.androidplatform.net/assets/ 주소에 얹어 연다.
 */
public class MainActivity extends Activity {
    private static final String START = "https://appassets.androidplatform.net/assets/index.html";
    private static final int CAMERA_REQUEST = 1;
    // 앱 업데이트: 깃허브 액션이 APK 와 함께 올리는 version.json 으로 새 버전을 알아낸다
    private static final String RELEASE = "https://github.com/Gititit11/digitama/releases/download/digitama-latest/";
    private File pendingApk; // 설치 허용을 켜러 설정에 다녀오는 동안 기다리는 APK

    private WebView web;
    private PermissionRequest pendingCamera;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0F1115);
        setContentView(web);

        final WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);           // 키우는 디지몬은 localStorage 에 저장된다
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        // 웹앱이 '앱 안에서 도는 중' 을 알 수 있게 한다 (서비스 워커를 끈다)
        s.setUserAgentString(s.getUserAgentString() + " DigitamaApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return assets.shouldInterceptRequest(req.getUrl());
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest req) {
                if (Build.VERSION.SDK_INT < 23 ||
                        checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    req.grant(req.getResources());
                } else {
                    pendingCamera = req;
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
                }
            }
        });

        web.addJavascriptInterface(new Updater(), "DigitamaApp");

        if (saved != null) web.restoreState(saved);
        else web.loadUrl(START);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        if (code != CAMERA_REQUEST || pendingCamera == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            pendingCamera.grant(pendingCamera.getResources());
        } else {
            pendingCamera.deny();
        }
        pendingCamera = null;
    }

    // 뒤로 가기는 웹앱의 화면(도감·배틀 등)을 먼저 닫는다
    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        // 설정에서 '이 앱에서 설치 허용' 을 켜고 돌아오면 바로 설치 화면을 띄운다
        if (pendingApk != null && canInstall()) {
            File f = pendingApk;
            pendingApk = null;
            openInstaller(f);
        }
    }

    /* ---------- 앱 업데이트 ----------
     * 웹앱이 window.DigitamaApp.check() 로 새 버전을 묻고, install() 로 받아서 설치 화면을 띄운다.
     * 결과는 window.onAppUpdate(정보) · window.onAppUpdateProgress(상태) 로 돌려준다.
     * 안드로이드는 스토어 밖 앱을 몰래 설치할 수 없어서, 마지막 '설치' 는 사람이 누른다. */
    private class Updater {
        @JavascriptInterface
        public void check() {
            new Thread(() -> {
                String arg = "null";
                try {
                    String body = new String(get(RELEASE + "version.json", null), "UTF-8");
                    arg = JSONObject.quote(new JSONObject(body).toString());
                } catch (Exception e) { /* 인터넷이 없으면 조용히 넘어간다 */ }
                callJs("onAppUpdate", arg);
            }).start();
        }

        @JavascriptInterface
        public void install() {
            new Thread(() -> {
                try {
                    File dir = new File(getCacheDir(), "updates");
                    dir.mkdirs();
                    File apk = new File(dir, "digitama.apk");
                    get(RELEASE + "digitama.apk", apk);
                    runOnUiThread(() -> {
                        if (canInstall()) openInstaller(apk);
                        else {
                            pendingApk = apk;
                            callJs("onAppUpdateProgress", "'perm'");
                            startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                    Uri.parse("package:" + getPackageName())));
                        }
                    });
                } catch (Exception e) {
                    callJs("onAppUpdateProgress", "'fail'");
                }
            }).start();
        }
    }

    private boolean canInstall() {
        return Build.VERSION.SDK_INT < 26 || getPackageManager().canRequestPackageInstalls();
    }

    private void openInstaller(File apk) {
        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", apk);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            callJs("onAppUpdateProgress", "'done'");
        } catch (Exception e) {
            callJs("onAppUpdateProgress", "'fail'");
        }
    }

    // 주소에서 받는다. out 이 있으면 파일로 쓰면서 진행률(%)을 웹앱에 알리고, 없으면 내용을 돌려준다
    private byte[] get(String url, File out) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(true); // 깃허브 릴리스는 다른 주소로 넘겨서 내려준다
        c.setUseCaches(false);
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        try {
            if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
            long total = c.getContentLengthLong();
            try (InputStream in = c.getInputStream();
                 OutputStream os = out != null ? new FileOutputStream(out) : new ByteArrayOutputStream()) {
                byte[] buf = new byte[16384];
                long done = 0;
                int n, last = -1;
                while ((n = in.read(buf)) > 0) {
                    os.write(buf, 0, n);
                    done += n;
                    if (out != null && total > 0) {
                        int pct = (int) (done * 100 / total);
                        if (pct != last && pct % 5 == 0) { last = pct; callJs("onAppUpdateProgress", String.valueOf(pct)); }
                    }
                }
                return out != null ? null : ((ByteArrayOutputStream) os).toByteArray();
            }
        } finally {
            c.disconnect();
        }
    }

    private void callJs(String fn, String arg) {
        runOnUiThread(() -> web.evaluateJavascript(
                "window." + fn + " && window." + fn + "(" + arg + ")", null));
    }
}
