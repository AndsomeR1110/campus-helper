package live.anran.campushelper;

import android.content.Context;
import android.util.Base64;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.security.KeyStore;
import java.nio.charset.StandardCharsets;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/** Device-only bearer credential, encrypted with a non-exportable per-install key. */
final class TimetableCredentialStore {
    private static final String ALIAS = "campus-timetable-v1";
    private static final String PREFS = "school_timetable_credentials";
    private final Context context;
    TimetableCredentialStore(Context context) { this.context = context; }
    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(ALIAS)) return (SecretKey) store.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256).setRandomizedEncryptionRequired(true).build());
        return generator.generateKey();
    }
    JSONObject read(String scope) {
        String value = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(scope, null);
        if (value == null) return null;
        try {
            String[] parts = value.split(":", 2);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
            cipher.updateAAD(scope.getBytes(StandardCharsets.UTF_8));
            JSONObject result = new JSONObject(new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8));
            if (result.getLong("expires") < System.currentTimeMillis()) { forget(scope); return null; }
            return result;
        } catch (Exception ignored) { forget(scope); return null; }
    }
    void save(String scope, String term, String url) {
        try {
            JSONObject value = new JSONObject(); value.put("term", term); value.put("url", url);
            value.put("expires", System.currentTimeMillis() + 30L * 24 * 60 * 60 * 1000);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
            cipher.updateAAD(scope.getBytes(StandardCharsets.UTF_8));
            String encrypted = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(cipher.doFinal(value.toString().getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(scope, encrypted).commit();
        } catch (Exception ignored) { /* Retrieval still succeeds; never persist plaintext as a fallback. */ }
    }
    void forget(String scope) { context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(scope).commit(); }
}
