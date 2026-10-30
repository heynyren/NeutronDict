package com.neutrondict.app.media;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.*;

@CapacitorPlugin(name = "NeutronMedia")
public class MediaPlugin extends Plugin {
    private static java.lang.ref.WeakReference<MediaPlugin> current = new java.lang.ref.WeakReference<>(null);
    private static final android.os.Handler MAIN = new android.os.Handler(android.os.Looper.getMainLooper());
    private static final java.util.Map<String, Reply> replies = new java.util.HashMap<>();
    public interface Reply { void complete(JSONObject result, String error); }
    @Override public void load() { current = new java.lang.ref.WeakReference<>(this); }
    public static void request(JSONObject request, Reply reply) {
        MAIN.post(() -> {
            MediaPlugin plugin = current.get();
            if (plugin == null || plugin.getActivity().isDestroyed()) { reply.complete(null, NeutronUiStrings.text(plugin.getContext(),"Mở lại NeutronDict rồi thử tra lại.")); return; }
            String id = java.util.UUID.randomUUID().toString();
            try { request.put("requestId", id); } catch (Exception e) { reply.complete(null, e.getMessage()); return; }
            replies.put(id, reply);
            plugin.getBridge().getWebView().evaluateJavascript("window.NeutronReaderRequest && window.NeutronReaderRequest(" + request.toString() + ")", null);
            MAIN.postDelayed(() -> {
                Reply waiting = replies.remove(id);
                if (waiting != null) waiting.complete(null, NeutronUiStrings.text(plugin.getContext(),"Tra từ chưa phản hồi. Kiểm tra mạng và thử lại."));
            }, 30000);
        });
    }
    @PluginMethod public void readerReply(PluginCall call) {
        MAIN.post(() -> {
            Reply reply = replies.remove(call.getString("requestId", ""));
            if (reply != null) reply.complete(call.getObject("result"), call.getString("error"));
            call.resolve();
        });
    }
    @PluginMethod public void openAssistant(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            com.kienhoang.dualsubreplay.ui.NeutronAssistant.show(getActivity(), call.getString("context", ""), call.getString("language", "ja"));
            call.resolve();
        });
    }

    private final ExecutorService voiceIo = Executors.newSingleThreadExecutor();
    @PluginMethod public void voiceSettings(PluginCall call) {
        voiceIo.execute(() -> { try {
            AzureSpeech speech = new AzureSpeech(getContext());
            JSONObject result = call.getBoolean("save", false) ? speech.configure(call.getData()) : speech.status();
            call.resolve(JSObject.fromJSONObject(result));
        } catch (Exception e) { call.reject(NeutronUiStrings.text(getContext(),"Không lưu được cấu hình giọng đọc.")); } });
    }
    @PluginMethod public void azureSpeech(PluginCall call) {
        voiceIo.execute(() -> { try {
            call.resolve(JSObject.fromJSONObject(new AzureSpeech(getContext()).synthesize(call.getData())));
        } catch (Exception e) { call.resolve(new JSObject().put("available", false)); } });
    }
    @PluginMethod public void pastelTheme(PluginCall call) {
        String key=call.getString("key");
        io.execute(() -> { try {
            String value=key==null ? NeutronPastelTheme.read(getContext()) : NeutronPastelTheme.write(getContext(),key);
            call.resolve(new JSObject().put("key",value));
        } catch(Exception e) { call.reject(getContext().getString(com.kienhoang.dualsubreplay.R.string.rakulang_theme_error)); } });
    }
    @PluginMethod public void interfaceLanguage(PluginCall call) {
        String language=call.getString("language");
        if(language!=null && !java.util.Arrays.asList("vi","en","ja").contains(language)){
            call.reject("Unsupported UI language"); return;
        }
        getActivity().runOnUiThread(() -> {
            call.resolve(new JSObject()
                .put("language",com.kienhoang.dualsubreplay.ui.NeutronInterface.selected(getActivity()))
                .put("explicit",com.kienhoang.dualsubreplay.ui.NeutronInterface.explicit(getActivity())));
            if(language!=null)com.kienhoang.dualsubreplay.ui.NeutronInterface.select(getActivity(),language);
        });
    }
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    @PluginMethod public void playYouTubeSentence(PluginCall call) {
        String url = call.getString("url", "");
        double start = call.getData().optDouble("start", -1);
        double end = call.getData().optDouble("end", -1);
        double rate = call.getData().optDouble("rate", 1);
        getActivity().runOnUiThread(() -> {
            if (!com.kienhoang.dualsubreplay.ui.NeutronPlayback.readyForStudy(getContext())) {
                call.resolve(new JSObject().put("status", "unavailable").put("reason", "setup"));
                return;
            }
            try {
                boolean started = com.kienhoang.dualsubreplay.ui.NeutronPlayback.requestStudy(url, start, end, rate, status -> {
                    // Home or another app must never pull the user back into NeutronDict.
                    if (!status.equals("interrupted") && !com.kienhoang.dualsubreplay.ui.NeutronPlayback.activeStudy() && !getActivity().isDestroyed()) {
                        Intent back = new Intent(getContext(), com.neutrondict.app.MainActivity.class)
                            .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                        try { getActivity().startActivity(back); } catch (Exception ignored) {}
                    }
                    call.resolve(new JSObject().put("status", status));
                    return kotlin.Unit.INSTANCE;
                });
                if (started) {
                    Intent intent = new Intent(getContext(), com.kienhoang.dualsubreplay.MainActivity.class);
                    intent.setAction(Intent.ACTION_VIEW).setData(Uri.parse(url))
                        .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                    getActivity().startActivity(intent);
                }
            } catch (Exception e) {
                if (com.kienhoang.dualsubreplay.ui.NeutronPlayback.activeStudy())
                    com.kienhoang.dualsubreplay.ui.NeutronPlayback.failStudy();
                else call.resolve(new JSObject().put("status", "unavailable"));
            }
        });
    }
    @PluginMethod public void cancelYouTubeSentence(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            com.kienhoang.dualsubreplay.ui.NeutronPlayback.cancelStudy(() -> {
                call.resolve();
                return kotlin.Unit.INSTANCE;
            });
        });
    }
    @PluginMethod public void openYouTube(PluginCall call) {
        String url = call.getString("url", "https://m.youtube.com/");
        Uri u = Uri.parse(url);
        String host = u.getHost();
        if (!"https".equals(u.getScheme()) || host == null ||
            !(host.equals("youtube.com") || host.endsWith(".youtube.com") || host.equals("youtu.be"))) {
            call.reject(NeutronUiStrings.text(getContext(),"Đường dẫn YouTube không hợp lệ.")); return;
        }
        getActivity().runOnUiThread(() -> {
            com.kienhoang.dualsubreplay.ui.NeutronPlayback.request(url);
            Intent intent = new Intent(getContext(), com.kienhoang.dualsubreplay.MainActivity.class);
            intent.setAction(Intent.ACTION_VIEW).setData(u).addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            getActivity().startActivity(intent);
            call.resolve();
        });
    }
    @PluginMethod public void openArticle(PluginCall call) {
        String url = call.getString("url", "");
        if (!NewsRepository.validUrl(url)) { call.reject(NeutronUiStrings.text(getContext(),"Chỉ mở địa chỉ HTTPS.")); return; }
        getActivity().runOnUiThread(() -> {
            Intent intent = new Intent(getContext(), com.kienhoang.dualsubreplay.ui.NewsReaderActivity.class);
            intent.putExtra("url", url).putExtra("language", call.getString("language", "ja"));
            intent.putExtra("sentence", call.getString("sentence", ""));
            intent.putExtra("word", call.getString("word", ""));
            intent.putExtra("prefix", call.getString("prefix", ""));
            intent.putExtra("suffix", call.getString("suffix", ""));
            intent.putExtra("title", call.getString("title", ""));
            getActivity().startActivity(intent); call.resolve();
        });
    }
    @PluginMethod public void inbox(PluginCall call) {
        io.execute(() -> { try { call.resolve(new JSObject().put("items", MediaInbox.list(getContext()))); }
            catch (Exception e) { call.reject(NeutronUiStrings.text(getContext(),e.getMessage())); } });
    }
    @PluginMethod public void acknowledge(PluginCall call) {
        io.execute(() -> { try { MediaInbox.ack(getContext(), call.getArray("ids", new JSArray())); call.resolve(); }
            catch (Exception e) { call.reject(NeutronUiStrings.text(getContext(),e.getMessage())); } });
    }
    @PluginMethod public void news(PluginCall call) {
        io.execute(() -> { try {
            NewsRepository repo = new NewsRepository(getContext());
            if (Boolean.TRUE.equals(call.getBoolean("refresh", false))) repo.refresh();
            call.resolve(JSObject.fromJSONObject(repo.snapshot()));
        } catch (Exception e) { call.reject(NeutronUiStrings.text(getContext(),e.getMessage())); } });
    }
    @PluginMethod public void configureNews(PluginCall call) {
        io.execute(() -> { try {
            new NewsRepository(getContext()).configure(call.getArray("feeds"), call.getInt("minutes", 30));
            call.resolve();
        } catch (Exception e) { call.reject(NeutronUiStrings.text(getContext(),e.getMessage())); } });
    }
    @PluginMethod public void bookmark(PluginCall call) {
        io.execute(() -> { try {
            new NewsRepository(getContext()).bookmark(call.getObject("article"), Boolean.TRUE.equals(call.getBoolean("saved", true)));
            call.resolve();
        } catch (Exception e) { call.reject(NeutronUiStrings.text(getContext(),e.getMessage())); } });
    }
    @Override protected void handleOnDestroy() { io.shutdown(); voiceIo.shutdownNow(); }
}
