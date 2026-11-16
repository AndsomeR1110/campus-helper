package live.anran.campushelper;
import org.junit.Test;
import static org.junit.Assert.*;
public class RoomsCookiePolicyTest {
    @Test public void preservesCookieSecurityAndScope(){assertEquals("id=value; Domain=.xjtlu.edu.cn; Path=/; Secure; HttpOnly; SameSite=None",RoomsCookiePolicy.snapshot("id=value; Domain=.xjtlu.edu.cn; Path=/; Secure; HttpOnly; SameSite=None"));}
    @Test public void removesRelativeLifetimeButKeepsOriginalDeadline(){assertEquals("id=value; Expires=Tue, 17 Nov 2026 00:00:00 GMT; Secure",RoomsCookiePolicy.snapshot("id=value; Max-Age=3600; Expires=Tue, 17 Nov 2026 00:00:00 GMT; Secure"));}
    @Test public void doesNotGuessRelativeCookieAge(){assertNull(RoomsCookiePolicy.snapshot("id=value; Max-Age=3600"));}
    @Test public void doesNotRestoreDeletedCookie(){assertNull(RoomsCookiePolicy.snapshot("id=value; Max-Age=0; Expires=Tue, 17 Nov 2026 00:00:00 GMT"));}
    @Test public void rejectsUnrelatedDomainAndHeaderInjection(){assertNull(RoomsCookiePolicy.snapshot("id=value; Domain=example.com"));assertNull(RoomsCookiePolicy.snapshot("id=value\r\nOther: value"));}
}
