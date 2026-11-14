package live.anran.campushelper;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(ShuttlePlugin.class);
        registerPlugin(SchoolTimetablePlugin.class);
        super.onCreate(state);
    }
}
