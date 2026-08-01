package com.neutrondict.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    handleIntent(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    handleIntent(intent);
  }

  /** Phân loại intent: menu bôi đen (PROCESS_TEXT) hoặc Chia sẻ (SEND). */
  private void handleIntent(Intent intent) {
    if (intent == null) return;
    String action = intent.getAction();
    if (Intent.ACTION_PROCESS_TEXT.equals(action)) {
      handleProcessText(intent);
    } else if (Intent.ACTION_SEND.equals(action)) {
      String type = intent.getType();
      if (type != null && type.startsWith("text/")) handleSend(intent);
    }
  }

  /** Nhận chữ từ menu bôi đen của Android (ACTION_PROCESS_TEXT). */
  private void handleProcessText(Intent intent) {
    CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
    if (text == null || text.toString().trim().isEmpty()) return;
    String json;
    try {
      json = new org.json.JSONObject()
        .put("word", text.toString().trim())
        .put("ts", System.currentTimeMillis())
        .toString();
    } catch (org.json.JSONException e) { return; }
    save("processText", json, "neutrondict-process-text");
  }

  /** Nhận nội dung Chia sẻ (ACTION_SEND) — thường kèm cả đường link của trang. */
  private void handleSend(Intent intent) {
    CharSequence textCs = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
    String text = textCs == null ? "" : textCs.toString().trim();
    String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
    if (subject == null) subject = "";
    subject = subject.trim();
    if (text.isEmpty() && subject.isEmpty()) return;
    String json;
    try {
      json = new org.json.JSONObject()
        .put("text", text)
        .put("subject", subject)
        .put("ts", System.currentTimeMillis())
        .toString();
    } catch (org.json.JSONException e) { return; }
    save("shareData", json, "neutrondict-share");
  }

  /** Ghi vào đúng kho mà plugin Capacitor Preferences dùng, rồi báo cho phần web. */
  private void save(String key, String json, String eventName) {
    SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
    prefs.edit().putString(key, json).apply();
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().post(() ->
        getBridge().getWebView().evaluateJavascript(
          "window.dispatchEvent(new Event('" + eventName + "'))", null)
      );
    }
  }
}
