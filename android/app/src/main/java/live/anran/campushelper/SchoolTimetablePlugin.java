package live.anran.campushelper;

import android.app.Dialog;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.*;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.*;
import java.util.*;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

/** Fixed, read-only school timetable workflow. Never exposes URL/JS/cookie APIs. */
@CapacitorPlugin(name="SchoolTimetable")
public class SchoolTimetablePlugin extends Plugin {
    private static boolean connecting;
    static boolean isConnecting(){return connecting;}
    private static final String EBRIDGE="https://ebridge.xjtlu.edu.cn";
    private static final String TIMETABLE="https://timetableplus.xjtlu.edu.cn";
    private final Handler handler=new Handler(Looper.getMainLooper());
    private WebView school;
    private Dialog dialog;
    private PluginCall pending;
    private String script,nonce,term,scope; private TimetableCredentialStore credentials; private boolean usingCached;
    private boolean busy,fetching,foreground=true,silent; private int recoveries;
    private final Set<String> hosts=new HashSet<>(Arrays.asList("ebridge.xjtlu.edu.cn","timetableplus.xjtlu.edu.cn","uim.xjtlu.edu.cn","trust.xjtlu.edu.cn"));
    private boolean allowedCaller(){
        String configured=getBridge().getConfig().getServerUrl();if(configured==null)return false;
        Uri expected=Uri.parse(configured),actual=Uri.parse(getBridge().getWebView().getUrl());
        return ("https".equals(expected.getScheme())||(BuildConfig.DEBUG&&"http".equals(expected.getScheme())&&"localhost".equals(expected.getHost())))&&Objects.equals(expected.getScheme(),actual.getScheme())&&Objects.equals(expected.getHost(),actual.getHost())&&expected.getPort()==actual.getPort();
    }
    private boolean origin(String url,String expected){if(url==null)return false;Uri u=Uri.parse(url);return "https".equals(u.getScheme())&&expected.equals("https://"+u.getHost())&&(u.getPort()==-1||u.getPort()==443);}
    @PluginMethod public void connect(PluginCall call){getActivity().runOnUiThread(()->{
        if(!allowedCaller()){call.reject("UNTRUSTED_ORIGIN","UNTRUSTED_ORIGIN");return;}
        if(pending!=null||!foreground||SchoolAuthPlugin.isActive()){call.reject("BUSY","BUSY");return;}
        if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){call.reject("UPDATE_WEBVIEW","UPDATE_WEBVIEW");return;}
        try(var input=getContext().getAssets().open("school-timetable.js");var output=new ByteArrayOutputStream()){
            byte[] bytes=new byte[4096];int count;while((count=input.read(bytes))!=-1)output.write(bytes,0,count);script=output.toString(StandardCharsets.UTF_8.name());
        }catch(Exception e){call.reject("NATIVE_UNAVAILABLE","NATIVE_UNAVAILABLE");return;}
                scope=call.getString("actorId", "");
        if(!scope.matches("[A-Za-z0-9_-]{1,128}")){call.reject("INVALID_INPUT","INVALID_INPUT");return;}
        String owner=getContext().getSharedPreferences("school_auth_scope",0).getString("actor",null);
        if(!scope.equals(owner)){String code=owner==null?"AUTH_REQUIRED":"ACCOUNT_SWITCH_REQUIRED";call.reject(code,code);return;}
        credentials=new TimetableCredentialStore(getContext());
        pending=call;connecting=true;silent=call.getBoolean("silent",false);nonce=UUID.randomUUID().toString();term=null;busy=false;fetching=false;recoveries=0;usingCached=false;
        school=new WebView(getActivity());WebSettings settings=school.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        CookieManager.getInstance().setAcceptCookie(true);
        WebViewCompat.addWebMessageListener(school,"CampusTimetableReply",Collections.singleton(TIMETABLE),(view,message,sourceOrigin,isMainFrame,reply)->{
            if(pending==null||!isMainFrame||!origin(sourceOrigin.toString(),TIMETABLE)||!fetching)return;
            try{String raw=message.getData();if(raw==null||raw.length()>500000){fail("INVALID_SCHOOL_DATA");return;}
                JSONObject result=new JSONObject(raw);if(!nonce.equals(result.optString("nonce")))return;
                                if(result.has("error")){
                    String code=result.optString("error","SCHOOL_UNAVAILABLE");
                    if(usingCached&&(code.equals("AUTH_REQUIRED")||code.equals("INVALID_SCHOOL_DATA")||code.equals("INVALID_SCHOOL_PAGE"))){credentials.forget(scope);usingCached=false;fetching=false;term=null;school.loadUrl(EBRIDGE+"/");}
                    else fail("SCHOOL_UNAVAILABLE");
                    return;
                }
                if(!"2026/27 S1".equals(term)){fail("UNSUPPORTED_TERM");return;}
                JSONObject data=result.getJSONObject("data");data.put("term",term);
                credentials.save(scope,term,school.getUrl());CookieManager.getInstance().flush();PluginCall done=pending;pending=null;cleanup();done.resolve(new JSObject(data.toString()));
            }catch(Exception e){fail("INVALID_SCHOOL_DATA");}
        });
        school.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri u=request.getUrl();return request.isForMainFrame()&&!("https".equals(u.getScheme())&&hosts.contains(u.getHost())&&(u.getPort()==-1||u.getPort()==443));}
            @Override public void onPageFinished(WebView view,String url){if(pending!=null)step();}
            @Override public void onReceivedSslError(WebView view,SslErrorHandler h,android.net.http.SslError e){h.cancel();fail("SCHOOL_UNAVAILABLE");}
        });
        if(!silent){
        dialog=new Dialog(getActivity(),android.R.style.Theme_Material_Light_NoActionBar);
        LinearLayout layout=new LinearLayout(getActivity());layout.setOrientation(LinearLayout.VERTICAL);
        Button cancel=new Button(getActivity());cancel.setText("Cancel timetable connection");cancel.setOnClickListener(v->fail("CANCELLED"));layout.addView(cancel);layout.addView(school,new LinearLayout.LayoutParams(-1,0,1));
        dialog.setContentView(layout);dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);dialog.setOnCancelListener(d->fail("CANCELLED"));dialog.show();dialog.getWindow().setLayout(-1,-1);
        }else{
            FrameLayout parking=new FrameLayout(getActivity());parking.setAlpha(0);parking.setTag("timetable-auth-parking");parking.setImportantForAccessibility(android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);((ViewGroup)getActivity().findViewById(android.R.id.content)).addView(parking,new ViewGroup.LayoutParams(1,1));parking.addView(school,new FrameLayout.LayoutParams(1,1));
        }
        final String expected=nonce;handler.postDelayed(()->{if(pending!=null&&expected.equals(nonce))fail("TIMED_OUT");},300000);
                JSONObject cached=credentials.read(scope);
        String first=EBRIDGE+"/";
        if(cached!=null){String candidate=cached.optString("url");Uri u=Uri.parse(candidate);
            if("2026/27 S1".equals(cached.optString("term"))&&origin(candidate,TIMETABLE)&&"/pt/".equals(u.getPath())&&u.getFragment()!=null&&u.getFragment().matches("/[0-9A-Fa-f]{64}(\\?.*)?")){
                usingCached=true;term=cached.optString("term");first=candidate;
            }else credentials.forget(scope);
        }
        school.loadUrl(first);handler.postDelayed(tick,1000);
    });}
    private final Runnable tick=new Runnable(){public void run(){if(pending!=null){step();handler.postDelayed(this,1000);}}};
    private void step(){
        if(pending==null||school==null||busy||fetching||!foreground)return;
        String url=school.getUrl();
        if(silent&&origin(url,"https://uim.xjtlu.edu.cn")){fail("AUTH_REQUIRED");return;}
        if(origin(url,TIMETABLE)){
            if(!"2026/27 S1".equals(term)){fail("UNSUPPORTED_TERM");return;}
            fetching=true;
            school.evaluateJavascript(script+"\nfetchSchoolTimetable().then(data=>CampusTimetableReply.postMessage(JSON.stringify({nonce:"+JSONObject.quote(nonce)+",data}))).catch(error=>CampusTimetableReply.postMessage(JSON.stringify({nonce:"+JSONObject.quote(nonce)+",error:['AUTH_REQUIRED','INVALID_SCHOOL_DATA','INVALID_SCHOOL_PAGE'].includes(error.message)?error.message:'SCHOOL_UNAVAILABLE'})))",null);return;
        }
        if(!origin(url,EBRIDGE))return;
        busy=true;
        school.evaluateJavascript(script+"\nJSON.stringify((()=>{try{return discoverTimetable()}catch(e){return {status:'invalid'}}})())",encoded->{busy=false;if(pending==null)return;
            try{JSONObject result=new JSONObject(new JSONTokener(encoded).nextValue().toString());
                if("invalid".equals(result.optString("status"))){fail("UNSUPPORTED_TERM");return;}
                if(result.has("term"))term=result.getString("term");
                if("expired".equals(result.optString("status"))){if(recoveries++==0){term=null;school.loadUrl(EBRIDGE+"/");}else fail("AUTH_REQUIRED");return;}
                if("timetable".equals(result.optString("status"))){String target=result.getString("url");Uri u=Uri.parse(target);
                    if(!origin(target,TIMETABLE)||!"/pt/".equals(u.getPath())||u.getFragment()==null||!u.getFragment().matches("/[0-9A-Fa-f]{64}(\\?.*)?")){fail("INVALID_SCHOOL_PAGE");return;}school.loadUrl(target);
                }
            }catch(Exception ignored){/* navigation may replace the document before a callback */}
        });
    }
        @PluginMethod public void forgetConnection(PluginCall call){getActivity().runOnUiThread(()->{
        if(!allowedCaller()){call.reject("UNTRUSTED_ORIGIN","UNTRUSTED_ORIGIN");return;}
        String actor=call.getString("actorId", "");
        if(!actor.matches("[A-Za-z0-9_-]{1,128}")||pending!=null){call.reject("BUSY","BUSY");return;}
        new TimetableCredentialStore(getContext()).forget(actor);call.resolve();
    });}
    private void fail(String code){if(pending==null)return;PluginCall done=pending;pending=null;cleanup();done.reject(code,code);}
    private void cleanup(){handler.removeCallbacks(tick);if(dialog!=null){dialog.setOnCancelListener(null);dialog.dismiss();dialog=null;}if(school!=null){if(school.getParent() instanceof ViewGroup p){p.removeView(school);if("timetable-auth-parking".equals(p.getTag())&&p.getParent() instanceof ViewGroup root)root.removeView(p);}school.stopLoading();school.destroy();school=null;}nonce=null;term=null;busy=false;fetching=false;recoveries=0;connecting=false;}
    @Override protected void handleOnPause(){foreground=false;}
    @Override protected void handleOnResume(){foreground=true;if(pending!=null){handler.removeCallbacks(tick);handler.post(tick);}}
    @Override protected void handleOnDestroy(){fail("CANCELLED");}
}
