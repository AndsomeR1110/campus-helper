package live.anran.campushelper;

import android.app.Dialog;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Set;
import java.util.UUID;
import java.util.HashSet;
import java.util.Arrays;
import java.io.ByteArrayOutputStream;
import org.json.JSONObject;

/** Only exposes typed shuttle operations, never arbitrary URL/JS/cookie APIs.
 * Sources: capacitorjs.com/docs/plugins/android and AndroidX WebViewCompat.
 */
@CapacitorPlugin(name = "Shuttle")
public class ShuttlePlugin extends Plugin {
    private static final String SCHOOL = "https://shuttlebus.xjtlu.edu.cn";
    private static final Set<String> LOGIN_HOSTS = new HashSet<>(Arrays.asList("shuttlebus.xjtlu.edu.cn", "uim.xjtlu.edu.cn", "trust.xjtlu.edu.cn"));
    private static final Set<String> OPS = new HashSet<>(Arrays.asList("session", "schedules", "trips", "book", "cancel", "pass", "scan"));
    private static final Set<String> ERRORS = new HashSet<>(Arrays.asList("AUTH_REQUIRED", "INVALID_INPUT", "CONFIRMATION_REQUIRED", "SCHOOL_UNAVAILABLE", "UNEXPECTED_RESPONSE", "UNAVAILABLE", "ALREADY_BOOKED", "RESULT_UNKNOWN", "NOT_FOUND", "PASS_UNAVAILABLE"));
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView school;
    private FrameLayout parking;
    private Dialog loginDialog;
    private PluginCall pending;
    private String requestId;
    private boolean ready;
    private boolean writing;
    private boolean foreground = true;
    private String adapter;

    private boolean allowedCaller() {
        String configured = getBridge().getConfig().getServerUrl();
        if (configured == null) return false;
        Uri expected = Uri.parse(configured), actual = Uri.parse(getBridge().getWebView().getUrl());
        boolean secure = "https".equals(expected.getScheme()) ||
            (BuildConfig.DEBUG && "http".equals(expected.getScheme()) && "localhost".equals(expected.getHost()));
        return secure && expected.getScheme().equals(actual.getScheme()) &&
            expected.getHost().equals(actual.getHost()) && expected.getPort() == actual.getPort();
    }

    @PluginMethod public void login(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!allowedCaller()) { call.reject("UNTRUSTED_ORIGIN", "UNTRUSTED_ORIGIN"); return; }
            if (!foreground || pending != null || loginDialog != null) { call.reject("BUSY", "BUSY"); return; }
            if (!ensureSchool(call)) return;
            detach(school);
            Dialog dialog = new Dialog(getActivity(), android.R.style.Theme_Material_Light_NoActionBar);
            loginDialog = dialog;
            LinearLayout layout = new LinearLayout(getActivity());
            layout.setOrientation(LinearLayout.VERTICAL);
            Button done = new Button(getActivity());
            done.setText("Done · Return to Campus Helper");
            done.setOnClickListener(v -> dialog.dismiss());
            layout.addView(done);
            layout.addView(school, new LinearLayout.LayoutParams(-1, 0, 1));
            dialog.setContentView(layout);
            dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            dialog.setOnDismissListener(d -> {
                detach(school);
                parking.addView(school, new FrameLayout.LayoutParams(1, 1));
                loginDialog = null;
                call.resolve();
            });
            dialog.show();
            dialog.getWindow().setLayout(-1, -1);
            school.loadUrl(SCHOOL + "/");
        });
    }

    @PluginMethod public void invoke(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!allowedCaller()) { call.reject("UNTRUSTED_ORIGIN", "UNTRUSTED_ORIGIN"); return; }
            String op = call.getString("operation", "");
            JSObject input = call.getObject("input", new JSObject());
            if (!OPS.contains(op) || input.toString().length() > 1024) { call.reject("INVALID_INPUT", "INVALID_INPUT"); return; }
            if ((op.equals("book") || op.equals("cancel")) && !input.optBoolean("confirmed", false)) {
                call.reject("CONFIRMATION_REQUIRED", "CONFIRMATION_REQUIRED"); return;
            }
            if (!foreground || pending != null || loginDialog != null) { call.reject("BUSY", "BUSY"); return; }
            if (!ensureSchool(call)) return;
            if (!ready || !isSchoolOrigin(school.getUrl())) { call.reject("AUTH_REQUIRED", "AUTH_REQUIRED"); return; }
            writing = op.equals("book") || op.equals("cancel");
            if (op.equals("pass")) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            pending = call;
            requestId = UUID.randomUUID().toString();
            final String expectedId = requestId;
            String script = adapter + "\nshuttleSchoolRequest(" + JSONObject.quote(op) + "," + input + ")"
                + ".then(data=>CampusShuttleReply.postMessage(JSON.stringify({id:" + JSONObject.quote(requestId) + ",data})))"
                + ".catch(error=>CampusShuttleReply.postMessage(JSON.stringify({id:" + JSONObject.quote(requestId) + ",error:String(error.message)})));";
            school.evaluateJavascript(script, null);
            handler.postDelayed(() -> {
                if (pending != null && expectedId.equals(requestId)) finishError(writing ? "RESULT_UNKNOWN" : "SCHOOL_UNAVAILABLE");
            }, 60000);
        });
    }

    private boolean ensureSchool(PluginCall call) {
        if (school != null) return true;
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            call.reject("UPDATE_WEBVIEW", "UPDATE_WEBVIEW"); return false;
        }
        try (var stream = getContext().getAssets().open("shuttle-adapter.js"); var out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096]; int size;
            while ((size = stream.read(buffer)) != -1) out.write(buffer, 0, size);
            adapter = out.toString(StandardCharsets.UTF_8.name());
        } catch (Exception error) { call.reject("NATIVE_UNAVAILABLE", "NATIVE_UNAVAILABLE"); return false; }
        school = new WebView(getActivity());
        WebSettings settings = school.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        CookieManager.getInstance().setAcceptCookie(true);
        WebViewCompat.addWebMessageListener(school, "CampusShuttleReply", Collections.singleton(SCHOOL),
            (view, message, sourceOrigin, isMainFrame, reply) -> {
                if (!isMainFrame || !isSchoolOrigin(sourceOrigin.toString()) || pending == null) return;
                try {
                    String body = message.getData();
                    if (body == null || body.length() > 200000) { finishError("UNEXPECTED_RESPONSE"); return; }
                    JSONObject response = new JSONObject(body);
                    if (!response.optString("id").equals(requestId)) return;
                    if (response.has("error")) {
                        String code = response.optString("error");
                        finishError(ERRORS.contains(code) ? code : writing ? "RESULT_UNKNOWN" : "SCHOOL_UNAVAILABLE");
                    } else {
                        PluginCall done = pending;
                        pending = null;
                        requestId = null;
                        done.resolve(new JSObject(response.getJSONObject("data").toString()));
                    }
                } catch (Exception error) { finishError(writing ? "RESULT_UNKNOWN" : "UNEXPECTED_RESPONSE"); }
            });
        school.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                return request.isForMainFrame() && !("https".equals(url.getScheme()) && LOGIN_HOSTS.contains(url.getHost()));
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) { ready = false; }
            @Override public void onPageFinished(WebView view, String url) { ready = isSchoolOrigin(url); }
        });
        parking = new FrameLayout(getActivity());
        parking.setAlpha(0);
        parking.setImportantForAccessibility(android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        ((ViewGroup)getActivity().findViewById(android.R.id.content)).addView(parking, new ViewGroup.LayoutParams(1, 1));
        parking.addView(school, new FrameLayout.LayoutParams(1, 1));
        school.loadUrl(SCHOOL + "/");
        return true;
    }

    private boolean isSchoolOrigin(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        return "https".equals(uri.getScheme()) && "shuttlebus.xjtlu.edu.cn".equals(uri.getHost()) && (uri.getPort() == -1 || uri.getPort() == 443);
    }
    private void detach(WebView view) { if (view.getParent() instanceof ViewGroup parent) parent.removeView(view); }
    private void finishError(String code) {
        if (pending != null) { PluginCall call = pending; pending = null; requestId = null; call.reject(code, code); }
    }
    @PluginMethod public void closePass(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!allowedCaller()) { call.reject("UNTRUSTED_ORIGIN", "UNTRUSTED_ORIGIN"); return; }
            getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (school != null && ready) school.evaluateJavascript("delete window.__campusShuttleVerification", null);
            call.resolve();
        });
    }
    @Override protected void handleOnPause() {
        foreground = false;
        getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        JSObject data = new JSObject(); data.put("active", false); notifyListeners("stateChanged", data);
    }
    @Override protected void handleOnResume() {
        foreground = true;
        JSObject data = new JSObject(); data.put("active", true); notifyListeners("stateChanged", data);
    }
    @Override protected void handleOnDestroy() {
        finishError("RESULT_UNKNOWN");
        if (loginDialog != null) loginDialog.dismiss();
        if (school != null) { detach(school); school.destroy(); school = null; }
        if (parking != null) ((ViewGroup)parking.getParent()).removeView(parking);
    }
}
