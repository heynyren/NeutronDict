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
    private android.webkit.WebView readerPage(com.kienhoang.dualsubreplay.ui.NewsReaderActivity activity) {
        try {
            java.lang.reflect.Field field=activity.getClass().getDeclaredField("page");
            field.setAccessible(true); return (android.webkit.WebView)field.get(activity);
        } catch(Exception e){throw new AssertionError(e);}
    }
    @Test public void readerSelectionReachesNotebookWhileHostIsPaused() throws Exception {
        try(ActivityScenario<com.neutrondict.app.MainActivity> host=ActivityScenario.launch(com.neutrondict.app.MainActivity.class)){
            ready(host);
            // Fixture dictionary reply avoids depending on a live external provider.
            evaluate(host,"window.__realReaderRequest=window.NeutronReaderRequest;window.NeutronReaderRequest=async r=>{if(r.op==='lookup')return Capacitor.Plugins.NeutronMedia.readerReply({requestId:r.requestId,result:{meaning:'chăm sóc',reading:'ケア',translation:'Bôi kem để chăm sóc da.'}});return window.__realReaderRequest(r)}");
            Context context=ApplicationProvider.getApplicationContext();
            Intent intent=new Intent(context,com.kienhoang.dualsubreplay.ui.NewsReaderActivity.class)
                .putExtra("url","https://example.org/integration-fixture").putExtra("language","ja");
            // Open through the live host as the product does; a second ActivityScenario can reset its task.
            host.onActivity(activity -> activity.startActivity(intent));
            java.util.concurrent.atomic.AtomicReference<com.kienhoang.dualsubreplay.ui.NewsReaderActivity> opened=new java.util.concurrent.atomic.AtomicReference<>();
            long openDeadline=System.currentTimeMillis()+10000;
            while(opened.get()==null && System.currentTimeMillis()<openDeadline){
                androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
                    for(android.app.Activity activity:androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry.getInstance().getActivitiesInStage(androidx.test.runner.lifecycle.Stage.RESUMED))
                        if(activity instanceof com.kienhoang.dualsubreplay.ui.NewsReaderActivity)opened.set((com.kienhoang.dualsubreplay.ui.NewsReaderActivity)activity);
                });
                Thread.sleep(100);
            }
            assertNotNull("Reader activity did not open",opened.get());
            java.util.function.Consumer<java.util.function.Consumer<com.kienhoang.dualsubreplay.ui.NewsReaderActivity>> onReader=
                action -> androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().runOnMainSync(()->action.accept(opened.get()));
            try {
                onReader.accept(activity -> {
                    android.webkit.WebView web=readerPage(activity);
                    web.stopLoading();
                    web.loadDataWithBaseURL("https://example.org/integration-fixture",
                        "<html lang='ja'><p>古いケアです。クリームを塗って肌の<span id='target'>ケア</span>をする。</p></html>",
                        "text/html","UTF-8",null);
                });
                java.util.concurrent.atomic.AtomicReference<JSONObject> selected=new java.util.concurrent.atomic.AtomicReference<>();
                long deadline=System.currentTimeMillis()+20000;
                while(selected.get()==null && System.currentTimeMillis()<deadline){
                    onReader.accept(activity -> readerPage(activity).evaluateJavascript(
                        "(function(){const e=document.getElementById('target');if(!e)return false;const r=document.createRange();r.selectNodeContents(e);getSelection().removeAllRanges();getSelection().addRange(r);return true})()",
                        value -> {if("true".equals(value)) try {
                            java.lang.reflect.Method capture=activity.getClass().getDeclaredMethod("captureSelection");
                            capture.setAccessible(true);capture.invoke(activity);
                        }catch(Exception e){throw new AssertionError(e);}}));
                    Thread.sleep(500);
                    onReader.accept(activity -> {
                        try {
                            java.lang.reflect.Method get=activity.getClass().getDeclaredMethod("getSelection");
                            get.setAccessible(true);selected.set((JSONObject)get.invoke(activity));
                        }catch(Exception e){throw new AssertionError(e);}
                    });
                }
                java.util.concurrent.atomic.AtomicReference<String> readerStatus=new java.util.concurrent.atomic.AtomicReference<>("");
                onReader.accept(activity -> {try {java.lang.reflect.Method getter=activity.getClass().getDeclaredMethod("getStatus");getter.setAccessible(true);readerStatus.set(String.valueOf(getter.invoke(activity)));}catch(Exception e){readerStatus.set(e.toString());}});
                assertNotNull("Native selection lookup did not reply: "+readerStatus.get(),selected.get());
                assertEquals("クリームを塗って肌のケアをする。",selected.get().getString("sentence"));
                java.util.concurrent.CountDownLatch saved=new java.util.concurrent.CountDownLatch(1);
                java.util.concurrent.atomic.AtomicReference<String> error=new java.util.concurrent.atomic.AtomicReference<>();
                JSONObject item=selected.get().put("meaning","chăm sóc").put("meaningLanguage","vi")
                    .put("translatedSentence","Bôi kem để chăm sóc da.");
                MediaPlugin.request(new JSONObject().put("op","save").put("item",item),(result,err)->{error.set(err);saved.countDown();});
                assertTrue(saved.await(35,java.util.concurrent.TimeUnit.SECONDS));assertNull(error.get());
            } finally { onReader.accept(activity -> activity.finish()); }
            androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            evaluate(host,"window.__readerSaved=null;getNB().then(nb=>window.__readerSaved=nb['javi:ケア'])");
            long deadline=System.currentTimeMillis()+10000;
            while(!"true".equals(evaluate(host,"!!window.__readerSaved")) && System.currentTimeMillis()<deadline)Thread.sleep(100);
            assertEquals("true",evaluate(host,"window.__readerSaved.src.cau==='クリームを塗って肌のケアをする。' && window.__readerSaved.src.url==='https://example.org/integration-fixture'"));
        }
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
