package com.neutrondict.app.media;
import android.content.Context;
import android.content.Intent;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.*;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class IntegrationSmokeTest {
    @Test public void inboxPersistsUntilAcknowledged() throws Exception {
        Context context=ApplicationProvider.getApplicationContext();
        String id=MediaInbox.add(context,new JSONObject().put("word","テスト").put("language","ja").put("sentence","テストです。"));
        boolean found=false;
        JSONArray pending=MediaInbox.list(context);
        for(int i=0;i<pending.length();i++) if(id.equals(pending.getJSONObject(i).getString("id"))) found=true;
        assertTrue(found);
        MediaInbox.ack(context,new JSONArray().put(id));
        pending=MediaInbox.list(context);
        for(int i=0;i<pending.length();i++) assertNotEquals(id,pending.getJSONObject(i).getString("id"));
    }
    @Test public void launchesNeutronDictAndRegistersModuleActivities() throws Exception {
        Context context=ApplicationProvider.getApplicationContext();
        context.getPackageManager().getActivityInfo(new android.content.ComponentName(context,com.kienhoang.dualsubreplay.MainActivity.class),0);
        context.getPackageManager().getActivityInfo(new android.content.ComponentName(context,com.kienhoang.dualsubreplay.ui.NewsReaderActivity.class),0);
        try(ActivityScenario<com.neutrondict.app.MainActivity> scenario=ActivityScenario.launch(com.neutrondict.app.MainActivity.class)){
            scenario.onActivity(activity -> assertNotNull(activity.getBridge().getWebView()));
        }
    }
}
