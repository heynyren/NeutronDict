package com.neutrondict.app.media;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.UUID;

/** Native producers never write notebook or SRS. JS acknowledges only after its serialized commit. */
public final class MediaInbox {
    private MediaInbox() {}
    public static synchronized String add(Context context, JSONObject item) throws Exception {
        JSONArray queue = list(context);
        if (queue.length() >= 1000) throw new IllegalStateException("Hộp nhận đầy. Mở NeutronDict để nhập các từ đã lưu.");
        String id = UUID.randomUUID().toString();
        item.put("id", id).put("createdAt", System.currentTimeMillis());
        queue.put(item);
        write(context, queue);
        return id;
    }
    public static synchronized JSONArray list(Context context) throws Exception {
        return new JSONArray(context.getSharedPreferences("neutrondict_media", 0).getString("inbox", "[]"));
    }
    public static synchronized void ack(Context context, JSONArray ids) throws Exception {
        java.util.Set<String> accepted = new java.util.HashSet<>();
        for (int i = 0; i < ids.length(); i++) accepted.add(ids.getString(i));
        JSONArray remaining = new JSONArray(), queue = list(context);
        for (int i = 0; i < queue.length(); i++) {
            JSONObject item = queue.getJSONObject(i);
            if (!accepted.contains(item.optString("id"))) remaining.put(item);
        }
        write(context, remaining);
    }
    private static void write(Context context, JSONArray queue) throws Exception {
        if (!context.getSharedPreferences("neutrondict_media", 0).edit().putString("inbox", queue.toString()).commit())
            throw new java.io.IOException("Không ghi được dữ liệu. Vui lòng thử lại.");
    }
}
