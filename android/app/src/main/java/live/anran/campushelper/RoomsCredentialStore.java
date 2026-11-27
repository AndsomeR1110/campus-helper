package live.anran.campushelper;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;
import org.json.JSONArray;
import android.webkit.CookieManager;
import androidx.webkit.CookieManagerCompat;
import androidx.webkit.WebViewFeature;

/** Actor-bound, device-only business session and room-origin cookies. Never passwords. */
final class RoomsCredentialStore {
    private static final String ALIAS="campus-rooms-v1", PREFS="school_rooms_credentials";
    private final Context context;
    RoomsCredentialStore(Context context){this.context=context;}
    private SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(store.containsAlias(ALIAS))return (SecretKey)store.getKey(ALIAS,null);
        KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).setRandomizedEncryptionRequired(true).build());
        return generator.generateKey();
    }
    JSONObject read(String actor){
        String sealed=context.getSharedPreferences(PREFS,0).getString(actor,null);if(sealed==null)return null;
        try{String[] parts=sealed.split(":",2);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));cipher.updateAAD(actor.getBytes(StandardCharsets.UTF_8));
            JSONObject result=new JSONObject(new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8));
            if(result.getLong("expires")<=System.currentTimeMillis()){forget(actor);return null;}return result;
        }catch(Exception ignored){if(!actor.endsWith("#write"))forget(actor);return null;}
    }
    void save(String actor,JSONObject profile){
        try{String token=profile.optString("token");if(token.isEmpty()||token.length()>16384||!profile.has("accNo"))return;
            JSONObject old=read(actor);
            JSONObject minimal=new JSONObject();for(String name:new String[]{"token","accNo","logonName","roleId","kind","ident","status","localstatus"})if(profile.has(name)){Object v=profile.get(name);if(v instanceof String||v instanceof Number||v instanceof Boolean)minimal.put(name,v);}
            JSONObject value=new JSONObject();value.put("profile",minimal);value.put("expires",old!=null&&token.equals(old.getJSONObject("profile").optString("token"))?old.getLong("expires"):System.currentTimeMillis()+8L*60*60*1000);
            JSONArray cookies=new JSONArray();
            if(WebViewFeature.isFeatureSupported(WebViewFeature.GET_COOKIE_INFO))for(String cookie:CookieManagerCompat.getCookieInfo(CookieManager.getInstance(),"https://roombookings.xjtlu.edu.cn/")){
                String normalized=RoomsCookiePolicy.snapshot(cookie);if(normalized!=null)cookies.put(normalized);
            }
            value.put("cookies",cookies);
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());cipher.updateAAD(actor.getBytes(StandardCharsets.UTF_8));
            String sealed=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(value.toString().getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
            context.getSharedPreferences(PREFS,0).edit().putString(actor,sealed).commit();
        }catch(Exception ignored){/* No plaintext fallback. */}
    }
    void forget(String actor){context.getSharedPreferences(PREFS,0).edit().remove(actor).commit();}
    JSONObject pending(String actor){boolean exists=context.getSharedPreferences(PREFS,0).contains(actor+"#write");JSONObject result=read(actor+"#write");return result==null&&exists?new JSONObject():result;}
    boolean rememberWrite(String actor,String operation,JSONObject input){
        try{JSONObject value=new JSONObject();value.put("expires",Long.MAX_VALUE);value.put("operation",operation);value.put("input",input);
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());cipher.updateAAD((actor+"#write").getBytes(StandardCharsets.UTF_8));
            String sealed=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(value.toString().getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
            return context.getSharedPreferences(PREFS,0).edit().putString(actor+"#write",sealed).commit();
        }catch(Exception ignored){return false;}
    }
    void clearWrite(String actor){forget(actor+"#write");}
}
