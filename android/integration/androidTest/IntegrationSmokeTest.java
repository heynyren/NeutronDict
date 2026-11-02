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
    @Test public void readerMeaningBypassesUnresponsiveHostAndSaveStillPreservesSource() throws Exception {
        try(ActivityScenario<com.neutrondict.app.MainActivity> host=ActivityScenario.launch(com.neutrondict.app.MainActivity.class)){
            ready(host);
            // Deliberately never answer old JS lookups: native meanings must not depend on the paused host.
            evaluate(host,"window.__readerLookupCount=0;window.__realReaderRequest=window.NeutronReaderRequest;window.NeutronReaderRequest=async r=>{if(r.op==='lookup'){window.__readerLookupCount++;return;}return window.__realReaderRequest(r)};window.__readerSeed=false;capNhat(nb=>{nb['javi:ケア']={word:'ケア',dict:'javi',means:['chăm sóc'],reading:'ケア',mEdit:true,duong:{nghe:{cap:4,han:9999999999999}}};}).then(()=>window.__readerSeed=true)");
            long seedDeadline=System.currentTimeMillis()+10000;
            while(!"true".equals(evaluate(host,"window.__readerSeed")) && System.currentTimeMillis()<seedDeadline)Thread.sleep(50);
            assertEquals("true",evaluate(host,"window.__readerSeed"));
            Context context=ApplicationProvider.getApplicationContext();
            Intent intent=new Intent(context,com.kienhoang.dualsubreplay.ui.NewsReaderActivity.class)
                .putExtra("url","https://example.org/integration-fixture").putExtra("language","ja")
                .putExtra("word","ケア").putExtra("sentence","クリームを塗って肌のケアをする。")
                .putExtra("prefix","クリームを塗って肌の").putExtra("suffix","をする。");
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
                java.util.concurrent.atomic.AtomicReference<String> highlighted=new java.util.concurrent.atomic.AtomicReference<>();
                long highlightDeadline=System.currentTimeMillis()+12000;
                while(!"true".equals(highlighted.get()) && System.currentTimeMillis()<highlightDeadline){
                    onReader.accept(activity -> readerPage(activity).evaluateJavascript(
                        "(function(){const m=document.querySelectorAll('mark[data-neutrondict-source]');const t=document.querySelector('#target mark[data-neutrondict-source]');return m.length===1&&!!t&&t.textContent==='ケア'&&getSelection().toString()==='';})()",
                        highlighted::set));
                    Thread.sleep(100);
                }
                assertEquals("Only the saved word at the original occurrence should be highlighted", "true", highlighted.get());
                java.util.concurrent.atomic.AtomicReference<android.view.ActionMode> selectionMode=new java.util.concurrent.atomic.AtomicReference<>();
                onReader.accept(activity -> readerPage(activity).evaluateJavascript(
                    "(function(){const e=document.getElementById('target');if(!e)return false;const r=document.createRange();r.selectNodeContents(e);getSelection().removeAllRanges();getSelection().addRange(r);return true})()",
                    value -> {if("true".equals(value)) selectionMode.set(readerPage(activity).startActionMode(new android.view.ActionMode.Callback() {
                        public boolean onCreateActionMode(android.view.ActionMode m,android.view.Menu menu){return true;}
                        public boolean onPrepareActionMode(android.view.ActionMode m,android.view.Menu menu){return true;}
                        public boolean onActionItemClicked(android.view.ActionMode m,android.view.MenuItem item){return false;}
                        public void onDestroyActionMode(android.view.ActionMode m){}
                    },android.view.ActionMode.TYPE_FLOATING));}));
                long modeDeadline=System.currentTimeMillis()+10000;
                while(selectionMode.get()==null && System.currentTimeMillis()<modeDeadline)Thread.sleep(100);
                assertNotNull("Native selection menu did not open",selectionMode.get());
                java.util.concurrent.atomic.AtomicReference<JSONObject> selected=new java.util.concurrent.atomic.AtomicReference<>();
                long lookupStart=android.os.SystemClock.elapsedRealtime();
                onReader.accept(activity -> assertNull("The extra lookup action must be removed",
                    selectionMode.get().getMenu().findItem(0x4e44)));
                long deadline=System.currentTimeMillis()+20000;
                while(selected.get()==null && System.currentTimeMillis()<deadline){
                    onReader.accept(activity -> {try {
                        java.lang.reflect.Method get=activity.getClass().getDeclaredMethod("getSelection");
                        get.setAccessible(true);selected.set((JSONObject)get.invoke(activity));
                    }catch(Exception ex){throw new AssertionError(ex);}});
                    Thread.sleep(100);
                }
                java.util.concurrent.atomic.AtomicReference<String> readerStatus=new java.util.concurrent.atomic.AtomicReference<>("");
                onReader.accept(activity -> {try {java.lang.reflect.Method getter=activity.getClass().getDeclaredMethod("getStatus");getter.setAccessible(true);readerStatus.set(String.valueOf(getter.invoke(activity)));}catch(Exception e){readerStatus.set(e.toString());}});
                assertNotNull("Native selection popup did not appear: "+readerStatus.get(),selected.get());
                java.util.concurrent.atomic.AtomicReference<JSONObject> meaning=new java.util.concurrent.atomic.AtomicReference<>();
                long lookupDeadline=lookupStart+2000;
                while(meaning.get()==null && android.os.SystemClock.elapsedRealtime()<lookupDeadline){
                    onReader.accept(activity -> {try {
                        java.lang.reflect.Method getter=activity.getClass().getDeclaredMethod("getEntry");
                        getter.setAccessible(true);meaning.set((JSONObject)getter.invoke(activity));
                    }catch(Exception ex){throw new AssertionError(ex);}});
                    if(meaning.get()==null)Thread.sleep(20);
                }
                long elapsed=android.os.SystemClock.elapsedRealtime()-lookupStart;
                assertNotNull("Native notebook meaning must arrive without a JS reply within 2s; took "+elapsed+"ms",meaning.get());
                assertEquals("chăm sóc",meaning.get().getString("meaning"));
                assertEquals("notebook",meaning.get().getString("source"));
                assertEquals("No lookup may traverse the paused notebook WebView","0",evaluate(host,"window.__readerLookupCount"));
                System.out.println("READER_DEVICE_BENCH native meaning with unresponsive JS host: "+elapsed+"ms");
                assertEquals("クリームを塗って肌のケアをする。",selected.get().getString("sentence"));
                // Tap the real first-popup save button, without opening the detailed dialog.
                java.util.concurrent.atomic.AtomicReference<String> label=new java.util.concurrent.atomic.AtomicReference<>();
                onReader.accept(activity -> label.set(activity.getString(com.kienhoang.dualsubreplay.R.string.rakulang_quick_save)));
                String saveLabel=label.get();
                android.app.UiAutomation automation=androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().getUiAutomation();
                android.accessibilityservice.AccessibilityServiceInfo access=automation.getServiceInfo();
                access.flags |= android.accessibilityservice.AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
                automation.setServiceInfo(access);
                boolean clicked=false;
                long buttonDeadline=System.currentTimeMillis()+10000;
                while(!clicked && System.currentTimeMillis()<buttonDeadline){
                    // Non-focusable Compose popups are separate windows; the active root can be the article.
                    for(android.view.accessibility.AccessibilityWindowInfo window:automation.getWindows()){
                        android.view.accessibility.AccessibilityNodeInfo root=window.getRoot();
                        if(root!=null) for(android.view.accessibility.AccessibilityNodeInfo node:root.findAccessibilityNodeInfosByText(saveLabel)){
                            android.view.accessibility.AccessibilityNodeInfo button=node;
                            while(button!=null && !button.isClickable())button=button.getParent();
                            if(button!=null && button.isEnabled()){
                                clicked=button.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK);
                                if(clicked)break;
                            }
                        }
                        if(clicked)break;
                    }
                    if(!clicked)Thread.sleep(100);
                }
                assertTrue("First popup Save button was not clickable",clicked);
                java.util.concurrent.atomic.AtomicBoolean saved=new java.util.concurrent.atomic.AtomicBoolean(false);
                long saveDeadline=System.currentTimeMillis()+35000;
                while(!saved.get() && System.currentTimeMillis()<saveDeadline){
                    onReader.accept(activity -> {try {
                        java.lang.reflect.Method get=activity.getClass().getDeclaredMethod("getSelectionSaved");
                        get.setAccessible(true);saved.set((Boolean)get.invoke(activity));
                    }catch(Exception ex){throw new AssertionError(ex);}});
                    Thread.sleep(50);
                }
                assertTrue("Quick save did not finish",saved.get());
            } finally { onReader.accept(activity -> activity.finish()); }
            androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            evaluate(host,"window.__readerSaved=null;getNB().then(nb=>window.__readerSaved=nb['javi:ケア'])");
            long deadline=System.currentTimeMillis()+10000;
            while(!"true".equals(evaluate(host,"!!window.__readerSaved")) && System.currentTimeMillis()<deadline)Thread.sleep(100);
            assertEquals("true",evaluate(host,"window.__readerSaved.src.cau==='クリームを塗って肌のケアをする。' && window.__readerSaved.src.url==='https://example.org/integration-fixture' && window.__readerSaved.mEdit===true && window.__readerSaved.duong.nghe.cap===4"));
        }
    }
    @Test public void learnerDataWorksBeforeOpeningYouTube() throws Exception {
        assertTrue("English learner data must be ready from the application entry point",
            com.kienhoang.dualsubreplay.data.EnglishMorphology.INSTANCE.awaitReady(60000L));
        java.util.List<com.kienhoang.dualsubreplay.data.AnalyzedToken> tokens =
            com.kienhoang.dualsubreplay.data.LanguageAwareTokenizer.INSTANCE.tokenize("We went home.", "en");
        com.kienhoang.dualsubreplay.data.AnalyzedToken went = null;
        for (com.kienhoang.dualsubreplay.data.AnalyzedToken token : tokens)
            if ("went".equals(token.getText())) went = token;
        assertNotNull(went);
        assertEquals("go", went.getBaseForm());
        assertEquals(com.kienhoang.dualsubreplay.data.PartOfSpeech.VERB, went.getPartOfSpeech());
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
