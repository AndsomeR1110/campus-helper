package live.anran.campushelper;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Preserve server attributes; never restart a relative Max-Age while restoring. */
final class RoomsCookiePolicy {
    static String snapshot(String cookie){
        if(cookie==null||cookie.length()>32768||cookie.indexOf('\r')>=0||cookie.indexOf('\n')>=0)return null;
        String[] parts=cookie.split(";");if(!parts[0].contains("="))return null;
        List<String> kept=new ArrayList<>();boolean relative=false,absolute=false;
        for(String part:parts){String value=part.trim(),lower=value.toLowerCase(Locale.ROOT);
            if(lower.startsWith("max-age=")){try{if(Long.parseLong(value.substring(8))<=0)return null;}catch(NumberFormatException e){return null;}relative=true;continue;}
            if(lower.startsWith("expires="))absolute=true;
            if(lower.startsWith("domain=")){String domain=lower.substring(7);if(!domain.equals("roombookings.xjtlu.edu.cn")&&!domain.equals(".roombookings.xjtlu.edu.cn")&&!domain.equals(".xjtlu.edu.cn")&&!domain.equals("xjtlu.edu.cn"))return null;}
            kept.add(value);
        }
        // CookieManager supplies absolute expiration where known. Without it, do not guess its age.
        return relative&&!absolute?null:String.join("; ",kept);
    }
}
