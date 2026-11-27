package live.anran.campushelper;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.webkit.*;
import android.widget.FrameLayout;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.*;

/** Fixed official room operations, actor scope and opt-in writes. No arbitrary URL/script API. */
@CapacitorPlugin(name="SchoolRooms")
public class SchoolRoomsPlugin extends Plugin {
    private static WebView school;
    private static String owner;
    private static boolean listenerReady;
    private static boolean working;
    static boolean isWorking(){return working;}
    private FrameLayout parking;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private PluginCall pending;
    private String script,id,operation;
    private JSONObject input;
    private boolean foreground=true,executing,documentReady,writing,journaled,reconciling;
    private String lastFailure="";
    private boolean restoredCache;
    @PluginMethod public void getDiagnostics(PluginCall call){getActivity().runOnUiThread(()->{
        if(!trusted()){call.reject("UNTRUSTED_ORIGIN","UNTRUSTED_ORIGIN");return;}
        JSObject result=new JSObject();result.put("code",lastFailure);result.put("restoredCache",restoredCache);result.put("cookieInfoSupported",WebViewFeature.isFeatureSupported(WebViewFeature.GET_COOKIE_INFO));call.resolve(result);
    });}
    @PluginMethod public void getCapabilities(PluginCall call){getActivity().runOnUiThread(()->{
        if(!trusted()){call.reject("UNTRUSTED_ORIGIN","UNTRUSTED_ORIGIN");return;}
        JSObject result=new JSObject();result.put("writesEnabled",BuildConfig.SCHOOL_ROOMS_WRITES_ENABLED);call.resolve(result);
    });}
    private static final String ORIGIN="https://roombookings.xjtlu.edu.cn";
    private static final Set<String> CODES=Set.of("AUTH_REQUIRED","GATEWAY_BLOCKED","INVALID_INPUT","INVALID_GROUP","CONFLICT","INVALID_SCHOOL_DATA","INVALID_SCHOOL_PAGE","UNSUPPORTED_ROOM_RULES","UNSUPPORTED_RESERVATION_STATE","SCHOOL_UNAVAILABLE","NOT_READY","ALREADY_BOOKED","NOT_CANCELLABLE","INCOMPLETE_RESERVATIONS","RESULT_UNKNOWN");
    private static final Set<String> NO_WRITE_ERRORS=Set.of("AUTH_REQUIRED","GATEWAY_BLOCKED","INVALID_INPUT","INVALID_GROUP","CONFLICT","ALREADY_BOOKED","NOT_CANCELLABLE","UNSUPPORTED_ROOM_RULES","INCOMPLETE_RESERVATIONS","INVALID_SCHOOL_DATA","SCHOOL_UNAVAILABLE");
    static void adopt(WebView view,String actor){
        invalidate(); if(view.getParent() instanceof ViewGroup p)p.removeView(view);
        school=view;owner=actor;
    }
    static void invalidate(){if(school!=null){if(school.getParent() instanceof ViewGroup p){p.removeView(school);if("rooms-parking".equals(p.getTag())&&p.getParent() instanceof ViewGroup root)root.removeView(p);}school.stopLoading();school.destroy();school=null;}owner=null;listenerReady=false;}
    private boolean trusted(){try{Uri u=Uri.parse(getBridge().getWebView().getUrl()),t=Uri.parse(getBridge().getConfig().getServerUrl());return ("https".equals(t.getScheme())||(BuildConfig.DEBUG&&"http".equals(t.getScheme())&&"localhost".equals(t.getHost())))&&Objects.equals(u.getScheme(),t.getScheme())&&Objects.equals(u.getHost(),t.getHost())&&u.getPort()==t.getPort();}catch(Exception e){return false;}}
    @PluginMethod public void invoke(PluginCall call){getActivity().runOnUiThread(()->{
        if(!trusted()){call.reject("UNTRUSTED_ORIGIN","UNTRUSTED_ORIGIN");return;}
        String actor=call.getString("actorId","");
        if(!actor.matches("[A-Za-z0-9_-]{1,128}")){call.reject("INVALID_INPUT","INVALID_INPUT");return;}
        String bound=getContext().getSharedPreferences("school_auth_scope",0).getString("actor",null);
        if(!actor.equals(bound)){String code=bound==null?"AUTH_REQUIRED":"ACCOUNT_SWITCH_REQUIRED";call.reject(code,code);return;}
        if(!foreground||pending!=null||SchoolAuthPlugin.isActive()){call.reject("BUSY","BUSY");return;}
        String op=call.getString("operation","");
        if(!Set.of("session","floors","availability","prepare","reservations","book","cancel","reconcile","pending").contains(op)){call.reject("INVALID_OPERATION","INVALID_OPERATION");return;}
        boolean write=op.equals("book")||op.equals("cancel");RoomsCredentialStore store=new RoomsCredentialStore(getContext());JSONObject saved=store.pending(actor);
        if(op.equals("pending")){JSObject result=new JSObject();result.put("pending",saved!=null);call.resolve(result);return;}
        if(write){
            if(!BuildConfig.SCHOOL_ROOMS_WRITES_ENABLED){call.reject("WRITES_DISABLED","WRITES_DISABLED");return;}
            if(!call.getBoolean("confirmed",false)){call.reject("CONFIRMATION_REQUIRED","CONFIRMATION_REQUIRED");return;}
            try{String operationId=call.getString("operationId","");if(!UUID.fromString(operationId).toString().equalsIgnoreCase(operationId))throw new Exception();}catch(Exception e){call.reject("INVALID_INPUT","INVALID_INPUT");return;}
            if(saved!=null){call.reject("RESULT_UNKNOWN","RESULT_UNKNOWN");return;}
        }
        if(op.equals("reconcile")&&saved==null){JSObject result=new JSObject();result.put("kind","none");call.resolve(result);return;}
        if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){call.reject("UPDATE_WEBVIEW","UPDATE_WEBVIEW");return;}
        try(var in=getContext().getAssets().open("school-rooms.js");var out=new ByteArrayOutputStream()){
            byte[] bytes=new byte[4096];int n;while((n=in.read(bytes))!=-1)out.write(bytes,0,n);script=out.toString(StandardCharsets.UTF_8.name());
        }catch(Exception e){call.reject("NATIVE_UNAVAILABLE","NATIVE_UNAVAILABLE");return;}
        if(school!=null&&!actor.equals(owner))invalidate();
        boolean fresh=school==null;
        if(fresh){school=new WebView(getActivity());owner=actor;}
        WebSettings settings=school.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setSaveFormData(false);
        school.setWebChromeClient(new WebChromeClient(){@Override public boolean onConsoleMessage(ConsoleMessage message){return true;}});
        if(school.getParent()==null){parking=new FrameLayout(getActivity());parking.setTag("rooms-parking");parking.setAlpha(0);parking.setImportantForAccessibility(android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);((ViewGroup)getActivity().findViewById(android.R.id.content)).addView(parking,new ViewGroup.LayoutParams(1,1));parking.addView(school,new FrameLayout.LayoutParams(1,1));}
        boolean attachListener=!listenerReady;
        if(attachListener){
        WebViewCompat.addWebMessageListener(school,"CampusRoomsReply",Set.of(ORIGIN),(view,message,source,main,reply)->{
            if(!main||!"https".equals(source.getScheme())||!"roombookings.xjtlu.edu.cn".equals(source.getHost())||(source.getPort()!=-1&&source.getPort()!=443)||pending==null)return;
            try{String raw=message.getData();if(raw==null||raw.length()>500000){fail("INVALID_SCHOOL_DATA");return;}JSONObject r=new JSONObject(raw);if(!id.equals(r.optString("id")))return;
                executing=false;
                if(r.has("error")){String code=r.optString("error");if(code.equals("NOT_READY"))return;if(writing&&journaled&&NO_WRITE_ERRORS.contains(code)){new RoomsCredentialStore(getContext()).clearWrite(owner);journaled=false;}fail(CODES.contains(code)?code:"SCHOOL_UNAVAILABLE");return;}
                JSONObject resultData=r.getJSONObject("data");
                if((writing||reconciling)&&!resultData.optString("kind").equals("unknown"))new RoomsCredentialStore(getContext()).clearWrite(owner);
                journaled=false;
                CookieManager.getInstance().flush();PluginCall done=pending;JSObject data=new JSObject(r.getJSONObject("data").toString());String scope=owner;executing=true;
                school.evaluateJavascript("(()=>{const u=document.querySelector('#app')?.__vue__?.$store?.state?.userInfo;if(!u?.token)return null;const p={};for(const k of ['token','accNo','logonName','roleId','kind','ident','status','localstatus'])if(['string','number','boolean'].includes(typeof u[k]))p[k]=u[k];return JSON.stringify(p)})()",encoded->{
                    if(pending!=done)return;
                    try{Object value=new JSONTokener(encoded).nextValue();if(value instanceof String s)new RoomsCredentialStore(getContext()).save(scope,new JSONObject(s));}catch(Exception ignored){}
                    lastFailure="";pending=null;working=false;executing=false;handler.removeCallbacksAndMessages(null);id=null;done.resolve(data);
                });
            }catch(Exception e){fail("INVALID_SCHOOL_DATA");}
        });
        listenerReady=true;
        }
        school.setWebViewClient(new WebViewClient(){
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){documentReady=false;executing=false;}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri u=request.getUrl();if(request.isForMainFrame()&&!("https".equals(u.getScheme())&&Set.of("roombookings.xjtlu.edu.cn","trust.xjtlu.edu.cn","uim.xjtlu.edu.cn","sso.xjtlu.edu.cn","sso-xjtlu-edu-cn-s.xjtlu.edu.cn").contains(u.getHost())&&(u.getPort()==-1||u.getPort()==443))){fail("INVALID_SCHOOL_PAGE");return true;}return false;}
            @Override public void onPageFinished(WebView view,String url){if(Objects.equals(url,view.getUrl()))documentReady=true;Uri u=Uri.parse(url);if(Set.of("uim.xjtlu.edu.cn","sso.xjtlu.edu.cn","sso-xjtlu-edu-cn-s.xjtlu.edu.cn").contains(u.getHost())&&u.getPath()!=null&&u.getPath().startsWith("/esc-sso/login"))fail("AUTH_REQUIRED");}
            @Override public void onReceivedHttpError(WebView view,WebResourceRequest r,WebResourceResponse response){if(r.isForMainFrame()&&response.getStatusCode()==403)fail("GATEWAY_BLOCKED");}
            @Override public void onReceivedSslError(WebView view,SslErrorHandler h,android.net.http.SslError e){h.cancel();fail("SCHOOL_UNAVAILABLE");}
            @Override public void onReceivedError(WebView view,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())fail("SCHOOL_UNAVAILABLE");}
        });
        pending=call;working=true;id=UUID.randomUUID().toString();operation=op;input=call.getObject("input",new JSObject());executing=false;writing=write;journaled=false;reconciling=op.equals("reconcile");
        if(reconciling)try{operation=saved.getString("operation").equals("book")?"reconcileBook":"reconcileCancel";input=saved.getJSONObject("input");}catch(Exception e){fail("INVALID_INPUT");return;}
        String requestId=id;handler.postDelayed(()->{if(requestId.equals(id))fail("TIMED_OUT");},30000);
        documentReady=!fresh&&!attachListener;
        if(fresh){
            JSONObject cached=new RoomsCredentialStore(getContext()).read(actor);
            restoredCache=cached!=null;
            if(cached==null)school.loadUrl(ORIGIN+"/#/ic/home");
            else try{
                // Trusted bootstrap only: restore sessionStorage before school router guards run.
                // Works on older WebView without DOCUMENT_START_SCRIPT. No cookies are rewritten.
                String profile=JSONObject.quote(cached.getJSONObject("profile").toString()).replace("<","\\u003c").replace(">","\\u003e").replace("&","\\u0026");
                String html="<!doctype html><meta charset=utf-8><script>sessionStorage.setItem('vuex',JSON.stringify({userInfo:JSON.parse("+profile+"),isLogin:true}));location.replace('"+ORIGIN+"/mobile.html#/')</script>";
                JSONArray cookies=cached.optJSONArray("cookies");PluginCall request=pending;WebView target=school;
                Runnable load=()->{if(pending==request&&school==target)target.loadDataWithBaseURL(ORIGIN+"/",html,"text/html","UTF-8",null);};
                if(cookies==null||cookies.length()==0)load.run();
                else{
                    java.util.concurrent.atomic.AtomicInteger remaining=new java.util.concurrent.atomic.AtomicInteger(cookies.length());
                    for(int i=0;i<cookies.length();i++)CookieManager.getInstance().setCookie(ORIGIN+"/",cookies.getString(i),ok->{if(remaining.decrementAndGet()==0)load.run();});
                }
            }catch(Exception ignored){new RoomsCredentialStore(getContext()).forget(actor);school.loadUrl(ORIGIN+"/#/ic/home");}
        }
        else if(attachListener)school.reload(); // WebMessage objects are injected at document creation; sessionStorage survives reload.
        handler.post(tick);
    });}
    private final Runnable tick=new Runnable(){public void run(){
        if(pending==null)return;
        String url=school.getUrl();
        if(url!=null){Uri u=Uri.parse(url);if(Set.of("uim.xjtlu.edu.cn","sso.xjtlu.edu.cn","sso-xjtlu-edu-cn-s.xjtlu.edu.cn").contains(u.getHost())&&u.getPath()!=null&&u.getPath().startsWith("/esc-sso/login")){fail("AUTH_REQUIRED");return;}}
        if(documentReady&&!executing&&url!=null&&url.startsWith(ORIGIN+"/")){
            if(writing&&!journaled){if(!new RoomsCredentialStore(getContext()).rememberWrite(owner,operation,input)){fail("SCHOOL_UNAVAILABLE");return;}journaled=true;}
            executing=true;
            school.evaluateJavascript(script+"\nroomsSchoolRequest("+JSONObject.quote(operation)+","+input+").then(data=>CampusRoomsReply.postMessage(JSON.stringify({id:"+JSONObject.quote(id)+",data}))).catch(error=>CampusRoomsReply.postMessage(JSON.stringify({id:"+JSONObject.quote(id)+",error:String(error.message)})))",null);
        }
        if(pending!=null)handler.postDelayed(this,500);
    }};
    private void fail(String code){if(pending!=null){if(writing&&journaled)code="RESULT_UNKNOWN";lastFailure=code;if(code.equals("AUTH_REQUIRED")&&owner!=null)new RoomsCredentialStore(getContext()).forget(owner);PluginCall done=pending;pending=null;working=false;id=null;executing=false;handler.removeCallbacksAndMessages(null);done.reject(code,code);}}
    @Override protected void handleOnPause(){foreground=false;fail("CANCELLED");}
    @Override protected void handleOnResume(){foreground=true;}
    @Override protected void handleOnDestroy(){fail("CANCELLED");invalidate();if(parking!=null&&parking.getParent() instanceof ViewGroup p)p.removeView(parking);}
}
