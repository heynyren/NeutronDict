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
    private String evaluate(ActivityScenario<com.neutrondict.app.MainActivity> scenario,String js) throws Exception {
        java.util.concurrent.CountDownLatch latch=new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.atomic.AtomicReference<String> result=new java.util.concurrent.atomic.AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(js,value->{result.set(value);latch.countDown();}));
        assertTrue("JavaScript did not reply",latch.await(10,java.util.concurrent.TimeUnit.SECONDS));
        return result.get();
    }
    private void ready(ActivityScenario<com.neutrondict.app.MainActivity> scenario) throws Exception {
        long deadline=System.currentTimeMillis()+30000;
        while(System.currentTimeMillis()<deadline){
            if("true".equals(evaluate(scenario,"window.NeutronReady===true && !!window.NeutronReaderRequest"))) return;
            Thread.sleep(100);
        }
        fail("Notebook startup did not complete");
    }
    @Test public void nativeSaveRoundTripKeepsNotebookAndSrs() throws Exception {
        try(ActivityScenario<com.neutrondict.app.MainActivity> scenario=ActivityScenario.launch(com.neutrondict.app.MainActivity.class)){
            ready(scenario);
            String word="統合検証";
            evaluate(scenario,"window.__seedDone=false; capNhat(nb=>{nb['javi:統合検証']={word:'統合検証',dict:'javi',means:['nghĩa tự sửa'],mEdit:true,duong:{nghe:{cap:4,han:9999999999999}},note:'giữ nguyên'};}).then(()=>window.__seedDone=true)");
            long deadline=System.currentTimeMillis()+10000;
            while(!"true".equals(evaluate(scenario,"window.__seedDone===true")) && System.currentTimeMillis()<deadline)Thread.sleep(100);
            assertEquals("true",evaluate(scenario,"window.__seedDone===true"));
            java.util.concurrent.CountDownLatch saved=new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.atomic.AtomicReference<String> error=new java.util.concurrent.atomic.AtomicReference<>();
            JSONObject item=new JSONObject().put("id","integration-roundtrip").put("word",word).put("language","ja")
                .put("meaning","kiểm thử").put("meaningLanguage","vi").put("sentence","統合検証を行います。")
                .put("url","https://example.org/article").put("title","Fixture");
            MediaPlugin.request(new JSONObject().put("op","save").put("item",item),(result,err)->{error.set(err);saved.countDown();});
            assertTrue(saved.await(35,java.util.concurrent.TimeUnit.SECONDS));
            assertNull(error.get());
            evaluate(scenario,"window.__savedItem=null;getNB().then(nb=>window.__savedItem=nb['javi:統合検証'])");
            deadline=System.currentTimeMillis()+10000;
            while(!"true".equals(evaluate(scenario,"!!window.__savedItem"))&&System.currentTimeMillis()<deadline)Thread.sleep(100);
            assertEquals("true",evaluate(scenario,"window.__savedItem.mEdit===true && window.__savedItem.means[0]==='nghĩa tự sửa' && window.__savedItem.duong.nghe.cap===4 && window.__savedItem.duong.nghe.han===9999999999999 && window.__savedItem.note==='giữ nguyên' && window.__savedItem.src.cau==='統合検証を行います。'"));
            scenario.onActivity(activity -> com.kienhoang.dualsubreplay.ui.NeutronAssistant.show(activity,"統合検証を行います。","ja"));
            Thread.sleep(800);
            scenario.onActivity(activity -> assertNotNull(activity.findViewById(android.R.id.content).findViewWithTag("neutron-ai-overlay")));
        }
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
