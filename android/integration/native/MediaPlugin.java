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
            if (plugin == null || plugin.getActivity().isDestroyed()) { reply.complete(null, "Mở lại NeutronDict rồi thử tra lại."); return; }
            String id = java.util.UUID.randomUUID().toString();
            try { request.put("requestId", id); } catch (Exception e) { reply.complete(null, e.getMessage()); return; }
            replies.put(id, reply);
            plugin.getBridge().getWebView().evaluateJavascript("window.NeutronReaderRequest && window.NeutronReaderRequest(" + request.toString() + ")", null);
            MAIN.postDelayed(() -> {
                Reply waiting = replies.remove(id);
                if (waiting != null) waiting.complete(null, "Tra từ chưa phản hồi. Kiểm tra mạng và thử lại.");
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

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    @PluginMethod public void openYouTube(PluginCall call) {
        String url = call.getString("url", "https://m.youtube.com/");
        Uri u = Uri.parse(url);
        String host = u.getHost();
        if (!"https".equals(u.getScheme()) || host == null ||
            !(host.equals("youtube.com") || host.endsWith(".youtube.com") || host.equals("youtu.be"))) {
            call.reject("Đường dẫn YouTube không hợp lệ."); return;
        }
        getActivity().runOnUiThread(() -> {
            Intent intent = new Intent(getContext(), com.kienhoang.dualsubreplay.MainActivity.class);
            intent.setAction(Intent.ACTION_VIEW).setData(u).addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            getActivity().startActivity(intent);
            call.resolve();
        });
    }
    @PluginMethod public void openArticle(PluginCall call) {
        String url = call.getString("url", "");
        if (!NewsRepository.validUrl(url)) { call.reject("Chỉ mở địa chỉ HTTPS."); return; }
        getActivity().runOnUiThread(() -> {
            Intent intent = new Intent(getContext(), com.kienhoang.dualsubreplay.ui.NewsReaderActivity.class);
            intent.putExtra("url", url).putExtra("language", call.getString("language", "ja"));
            intent.putExtra("sentence", call.getString("sentence", ""));
            intent.putExtra("title", call.getString("title", ""));
            getActivity().startActivity(intent); call.resolve();
        });
    }
    @PluginMethod public void inbox(PluginCall call) {
        io.execute(() -> { try { call.resolve(new JSObject().put("items", MediaInbox.list(getContext()))); }
            catch (Exception e) { call.reject(e.getMessage()); } });
    }
    @PluginMethod public void acknowledge(PluginCall call) {
        io.execute(() -> { try { MediaInbox.ack(getContext(), call.getArray("ids", new JSArray())); call.resolve(); }
            catch (Exception e) { call.reject(e.getMessage()); } });
    }
    @PluginMethod public void news(PluginCall call) {
        io.execute(() -> { try {
            NewsRepository repo = new NewsRepository(getContext());
            if (Boolean.TRUE.equals(call.getBoolean("refresh", false))) repo.refresh();
            call.resolve(JSObject.fromJSONObject(repo.snapshot()));
        } catch (Exception e) { call.reject(e.getMessage()); } });
    }
    @PluginMethod public void configureNews(PluginCall call) {
        io.execute(() -> { try {
            new NewsRepository(getContext()).configure(call.getArray("feeds"), call.getInt("minutes", 30));
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); } });
    }
    @PluginMethod public void bookmark(PluginCall call) {
        io.execute(() -> { try {
            new NewsRepository(getContext()).bookmark(call.getObject("article"), Boolean.TRUE.equals(call.getBoolean("saved", true)));
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); } });
    }
    @Override protected void handleOnDestroy() { io.shutdown(); }
}
