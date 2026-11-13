package live.anran.campushelper;

import android.app.Dialog;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.*;

/** Ephemeral, fixed-origin credential/challenge bridge. No cookie, URL or script API. */
@CapacitorPlugin(name="SchoolAuth")
public class SchoolAuthPlugin extends Plugin {
    private static boolean active;
    static boolean isActive(){return active;}
    private static final String UIM="https://uim.xjtlu.edu.cn";
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Set<String> hosts=new HashSet<>(Arrays.asList("uim.xjtlu.edu.cn","trust.xjtlu.edu.cn","ebridge.xjtlu.edu.cn","shuttlebus.xjtlu.edu.cn"));
    private WebView school; private FrameLayout parking; private Dialog challenge;
    private PluginCall pending;
    private String operationId,actorId,service,script,status;
    private int revision,afterRevision=-1,pageVersion;
    private boolean evaluating,foreground=true,secureBefore,disconnecting;
    private long lastSubmit;

    private boolean caller(){
        String configured=getBridge().getConfig().getServerUrl(), actual=getBridge().getWebView().getUrl();
        if(configured==null||actual==null)return false;
        Uri e=Uri.parse(configured),a=Uri.parse(actual);
        return ("https".equals(e.getScheme())||(BuildConfig.DEBUG&&"http".equals(e.getScheme())&&"localhost".equals(e.getHost())))&&Objects.equals(e.getScheme(),a.getScheme())&&Objects.equals(e.getHost(),a.getHost())&&e.getPort()==a.getPort();
    }
    private boolean origin(String raw,String host){if(raw==null)return false;Uri u=Uri.parse(raw);return "https".equals(u.getScheme())&&host.equals(u.getHost())&&(u.getPort()==-1||u.getPort()==443);}
    private boolean current(PluginCall call){
        if(!caller()){call.reject("UNTRUSTED_ORIGIN","UNTRUSTED_ORIGIN");return false;}
        if(operationId==null||!operationId.equals(call.getString("operationId"))||!Objects.equals(actorId,call.getString("actorId"))){call.reject("STALE_OPERATION","STALE_OPERATION");return false;}
        if(!foreground||pending!=null){call.reject("BUSY","BUSY");return false;}return true;
    }
    @PluginMethod public void begin(PluginCall call){getActivity().runOnUiThread(()->{
        if(!caller()){call.reject("UNTRUSTED_ORIGIN","UNTRUSTED_ORIGIN");return;}
        if(active||!foreground||SchoolTimetablePlugin.isConnecting()||ShuttlePlugin.isWorking()){call.reject("BUSY","BUSY");return;}
        String actor=call.getString("actorId",""),target=call.getString("service","");
        String requestedId=call.getString("operationId","");
        try{if(!UUID.fromString(requestedId).toString().equalsIgnoreCase(requestedId))throw new Exception();}catch(Exception e){call.reject("INVALID_INPUT","INVALID_INPUT");return;}
        if(!actor.matches("[A-Za-z0-9_-]{1,128}")||!(target.equals("timetable")||target.equals("shuttle"))){call.reject("INVALID_INPUT","INVALID_INPUT");return;}
        String owner=getContext().getSharedPreferences("school_auth_scope",0).getString("actor",actor);
        if(!actor.equals(owner)){call.reject("ACCOUNT_SWITCH_REQUIRED","ACCOUNT_SWITCH_REQUIRED");return;}
        try(var in=getContext().getAssets().open("school-auth.js");var out=new ByteArrayOutputStream()){
            byte[] bytes=new byte[4096];int n;while((n=in.read(bytes))!=-1)out.write(bytes,0,n);script=out.toString(StandardCharsets.UTF_8.name());
        }catch(Exception e){call.reject("NATIVE_UNAVAILABLE","NATIVE_UNAVAILABLE");return;}
        // Bind before any request: a cancelled in-flight login may still set school cookies.
        // Keeping this binding after cancellation prevents another app actor inheriting them.
        if(!getContext().getSharedPreferences("school_auth_scope",0).edit().putString("actor",actor).commit()){
            call.reject("SCHOOL_UNAVAILABLE","SCHOOL_UNAVAILABLE");return;
        }
        actorId=actor;service=target;operationId=requestedId;active=true;pending=call;afterRevision=-1;revision=0;lastSubmit=0;status="preparing";
        school=new WebView(getActivity());WebSettings settings=school.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setSaveFormData(false);
        if(android.os.Build.VERSION.SDK_INT>=26)school.setImportantForAutofill(android.view.View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        // The school's SDK logs its login response. Consume console output privately.
        school.setWebChromeClient(new WebChromeClient(){@Override public boolean onConsoleMessage(ConsoleMessage message){return true;}});
        CookieManager.getInstance().setAcceptCookie(true);
        parking=new FrameLayout(getActivity());parking.setAlpha(0);parking.setImportantForAccessibility(android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        ((ViewGroup)getActivity().findViewById(android.R.id.content)).addView(parking,new ViewGroup.LayoutParams(1,1));parking.addView(school,new FrameLayout.LayoutParams(1,1));
        school.setWebViewClient(new WebViewClient(){
            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){pageVersion++;evaluating=false;}
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();if(r.isForMainFrame()&&!("https".equals(u.getScheme())&&hosts.contains(u.getHost())&&(u.getPort()==-1||u.getPort()==443))){fail("INVALID_SCHOOL_PAGE");return true;}return false;}
            @Override public void onPageFinished(WebView v,String url){step();}
            @Override public void onReceivedSslError(WebView v,SslErrorHandler h,android.net.http.SslError e){h.cancel();fail("SCHOOL_UNAVAILABLE");}
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())fail("SCHOOL_UNAVAILABLE");}
        });
        // Both the primary app window and the official challenge must protect entered credentials.
        secureBefore=(getActivity().getWindow().getAttributes().flags&WindowManager.LayoutParams.FLAG_SECURE)!=0;
        getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        final String id=operationId;handler.postDelayed(()->{if(id.equals(operationId))fail("TIMED_OUT");},300000);
        school.loadUrl(target.equals("timetable")?"https://ebridge.xjtlu.edu.cn/":"https://shuttlebus.xjtlu.edu.cn/");
        handler.post(tick);
    });}
    @PluginMethod public void submitCredentials(PluginCall call){getActivity().runOnUiThread(()->{
        if(!current(call))return;
        String user=call.getString("username",""),password=call.getString("password","");
        call.getData().remove("password");call.getData().remove("username");
        if(!"credentialsRequired".equals(status)||user.isEmpty()||user.length()>64||password.isEmpty()||password.length()>100){call.reject("INVALID_INPUT","INVALID_INPUT");return;}
        long now=android.os.SystemClock.elapsedRealtime();if(now-lastSubmit<2000&&lastSubmit!=0){call.reject("RATE_LIMITED","RATE_LIMITED");return;}lastSubmit=now;
        JSONObject input=new JSONObject();try{input.put("username",user);input.put("password",password);}catch(Exception ignored){}
        action(call,"credentials",input);
    });}
    @PluginMethod public void submitImageCode(PluginCall call){getActivity().runOnUiThread(()->{
        if(!current(call))return;String answer=call.getString("answer","");call.getData().remove("answer");
        if(!"imageRequired".equals(status)||!answer.matches("[A-Za-z0-9]{4}")){call.reject("INVALID_INPUT","INVALID_INPUT");return;}
        JSONObject input=new JSONObject();try{input.put("answer",answer);}catch(Exception ignored){}action(call,"image",input);
    });}
    @PluginMethod public void refreshImage(PluginCall call){getActivity().runOnUiThread(()->{if(current(call)){if(!"imageRequired".equals(status)){call.reject("CHALLENGE_EXPIRED","CHALLENGE_EXPIRED");return;}action(call,"refreshImage",new JSONObject());}});}
    @PluginMethod public void showChallenge(PluginCall call){getActivity().runOnUiThread(()->{
        if(!current(call))return;if(!"interactiveRequired".equals(status)){call.reject("CHALLENGE_EXPIRED","CHALLENGE_EXPIRED");return;}
        action(call,"interactive",new JSONObject());
        if(school==null)return;
        detach();challenge=new Dialog(getActivity(),android.R.style.Theme_Material_Light_NoActionBar);
        LinearLayout content=new LinearLayout(getActivity());content.setOrientation(LinearLayout.VERTICAL);Button cancel=new Button(getActivity());cancel.setText("Cancel university verification");cancel.setOnClickListener(v->fail("CANCELLED"));content.addView(cancel);content.addView(school,new LinearLayout.LayoutParams(-1,0,1));
        challenge.setContentView(content);challenge.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);challenge.setOnCancelListener(d->fail("CANCELLED"));challenge.show();challenge.getWindow().setLayout(-1,-1);
    });}
    @PluginMethod public void cancel(PluginCall call){getActivity().runOnUiThread(()->{
        if(!caller()){call.reject("UNTRUSTED_ORIGIN","UNTRUSTED_ORIGIN");return;}
        if(!Objects.equals(operationId,call.getString("operationId"))||!Objects.equals(actorId,call.getString("actorId"))){call.reject("STALE_OPERATION","STALE_OPERATION");return;}
        fail("CANCELLED");call.resolve();
    });}
    /** Explicitly confirmed disconnect of this app's school session; app login is untouched. */
    @PluginMethod public void disconnect(PluginCall call){getActivity().runOnUiThread(()->{
        if(!caller()){call.reject("UNTRUSTED_ORIGIN","UNTRUSTED_ORIGIN");return;}
        String actor=call.getString("actorId","");
        if(!actor.matches("[A-Za-z0-9_-]{1,128}")||!call.getBoolean("confirmed",false)){call.reject("CONFIRMATION_REQUIRED","CONFIRMATION_REQUIRED");return;}
        if(active||SchoolTimetablePlugin.isConnecting()||ShuttlePlugin.isWorking()){call.reject("BUSY","BUSY");return;}
        active=true;disconnecting=true;ShuttlePlugin.invalidateSession();
        CookieManager cookies=CookieManager.getInstance();List<String[]> expirations=new ArrayList<>();
        String[] paths={"/","/esc-sso","/esc-sso/","/urd","/urd/","/urd/sits.urd","/urd/sits.urd/","/pt","/pt/"};
        for(String host:Arrays.asList("uim.xjtlu.edu.cn","trust.xjtlu.edu.cn","ebridge.xjtlu.edu.cn","shuttlebus.xjtlu.edu.cn","timetableplus.xjtlu.edu.cn")){
            for(String path:paths){String raw=cookies.getCookie("https://"+host+path);if(raw==null)continue;
                for(String part:raw.split(";")){int i=part.indexOf('=');if(i<1)continue;String name=part.substring(0,i).trim();if(!name.matches("[A-Za-z0-9_!#$%&'*+.^`|~-]+"))continue;
                    for(String domain:new String[]{"","; Domain="+host,"; Domain=.xjtlu.edu.cn"})expirations.add(new String[]{"https://"+host+path,name+"=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path="+path+domain+"; Secure"});
                }
            }
        }
        Runnable done=()->{cookies.flush();String old=getContext().getSharedPreferences("school_auth_scope",0).getString("actor",actor);TimetableCredentialStore store=new TimetableCredentialStore(getContext());store.forget(old);store.forget(actor);getContext().getSharedPreferences("school_auth_scope",0).edit().remove("actor").apply();disconnecting=false;active=false;call.resolve();};
        if(expirations.isEmpty()){done.run();return;}
        java.util.concurrent.atomic.AtomicInteger remaining=new java.util.concurrent.atomic.AtomicInteger(expirations.size());
        for(String[] item:expirations)cookies.setCookie(item[0],item[1],ok->{if(remaining.decrementAndGet()==0)done.run();});
    });}
    private void action(PluginCall call,String action,JSONObject input){
        if(!origin(school.getUrl(),"uim.xjtlu.edu.cn")){call.reject("STALE_OPERATION","STALE_OPERATION");return;}
        pending=call;afterRevision=revision;String id=operationId;int version=pageVersion;
        if(action.equals("refreshImage"))afterRevision=-1;
        evaluating=true;
        school.evaluateJavascript("(()=>{"+script+"\nreturn JSON.stringify((()=>{try{return schoolAuthAction("+JSONObject.quote(action)+","+input+")}catch(e){return {error:String(e.message)}}})())})()",encoded->{
            if(!id.equals(operationId)||version!=pageVersion)return;evaluating=false;
            try{JSONObject r=decode(encoded);if(r.has("error")){String code=r.optString("error");rejectAction(Set.of("INVALID_INPUT","KEY_UNAVAILABLE","CHALLENGE_EXPIRED","NOT_READY","CHALLENGE_ACTIVE").contains(code)?code:"SCHOOL_UNAVAILABLE");}}catch(Exception e){rejectAction("SCHOOL_UNAVAILABLE");}
        });
    }
    private final Runnable tick=new Runnable(){public void run(){if(operationId!=null){step();handler.postDelayed(this,500);}}};
    private JSONObject decode(String encoded)throws Exception{return new JSONObject(new JSONTokener(encoded).nextValue().toString());}
    private void step(){
        if(school==null||operationId==null||evaluating||!foreground||pending==null)return;
        String url=school.getUrl(),id=operationId;int version=pageVersion;
        if(origin(url,"uim.xjtlu.edu.cn")){
            String path=Uri.parse(url).getPath();if(path==null||!path.matches("/esc-sso/login(?:/.*)?"))return;
            evaluating=true;
            school.evaluateJavascript("(()=>{"+script+"\nreturn JSON.stringify((()=>{try{return schoolAuthState()}catch(e){return {status:String(e.message)==='NOT_READY'?'preparing':'error'}}})())})()",encoded->{
                if(!id.equals(operationId)||version!=pageVersion)return;evaluating=false;
                try{JSONObject r=decode(encoded);revision=r.optInt("revision",0);String next=r.optString("status");
                    if(next.equals("cancelled")){fail("CANCELLED");return;}
                    if(next.equals("error")){fail("SCHOOL_UNAVAILABLE");return;}
                    if(!Set.of("credentialsRequired","imageRequired","interactiveRequired").contains(next)||revision<=afterRevision)return;
                    status=next;JSObject dto=state(next);String code=r.optString("errorCode");if(code.matches("SSO[0-9]{5}")||code.equals("AUTH_REJECTED"))dto.put("errorCode",code);
                    if(next.equals("imageRequired")){String image=r.optString("image");if(image.length()>100000||!image.matches("data:image/png;base64,[A-Za-z0-9+/=]+")){fail("INVALID_SCHOOL_DATA");return;}dto.put("image",image);}
                    resolve(dto);
                }catch(Exception ignored){}
            });return;
        }
        boolean timetable=service.equals("timetable")&&origin(url,"ebridge.xjtlu.edu.cn"),shuttle=service.equals("shuttle")&&origin(url,"shuttlebus.xjtlu.edu.cn");
        if(!timetable&&!shuttle)return;evaluating=true;
        String probe=timetable?
          "(()=>{const b=[...document.querySelectorAll('button,input[type=button],input[type=submit]')].find(e=>(e.textContent||e.value||'').trim()==='XJTLU Account');if(b){if(!window.__campusAuthNavigating){window.__campusAuthNavigating=true;b.click()}return false}return [...document.querySelectorAll('a,[role=menuitem]')].some(e=>e.textContent.trim()==='Timetables')})()":
          "(()=>{const b=document.querySelector('a[href$=\"/sso\"]');if(b){if(!window.__campusAuthNavigating){window.__campusAuthNavigating=true;b.click()}return false}return document.title.startsWith('Shuttle Bus -')&&document.body.textContent.includes(\"Today's Travel\")})()";
        school.evaluateJavascript(probe,result->{if(!id.equals(operationId)||version!=pageVersion)return;evaluating=false;if("true".equals(result)){
            if(service.equals("timetable"))new TimetableCredentialStore(getContext()).forget(actorId);
            CookieManager.getInstance().flush();JSObject dto=state("authenticated");resolve(dto);cleanup();
        }});
    }
    private JSObject state(String next){JSObject r=new JSObject();r.put("operationId",operationId);r.put("actorId",actorId);r.put("service",service);r.put("status",next);return r;}
    private void resolve(JSObject dto){if(pending!=null){PluginCall done=pending;pending=null;afterRevision=-1;done.resolve(dto);}}
    private void rejectAction(String code){if(pending!=null){PluginCall done=pending;pending=null;done.reject(code,code);}}
    private void fail(String code){rejectAction(code);cleanup();}
    private void detach(){if(school!=null&&school.getParent() instanceof ViewGroup p)p.removeView(school);}
    private void cleanup(){boolean wasActive=active&&!disconnecting;handler.removeCallbacksAndMessages(null);if(challenge!=null){challenge.setOnCancelListener(null);challenge.dismiss();challenge=null;}if(school!=null){detach();school.stopLoading();school.destroy();school=null;}if(parking!=null){if(parking.getParent() instanceof ViewGroup p)p.removeView(parking);parking=null;}operationId=null;actorId=null;status=null;evaluating=false;active=disconnecting;if(wasActive&&!secureBefore)getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);}
    @Override protected void handleOnPause(){foreground=false;fail("CANCELLED");}
    @Override protected void handleOnResume(){foreground=true;}
    @Override protected void handleOnDestroy(){fail("CANCELLED");}
}
