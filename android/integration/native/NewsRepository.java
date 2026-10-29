package com.neutrondict.app.media;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.*;
import org.xmlpull.v1.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import okhttp3.*;

public final class NewsRepository {
    private static final ReentrantLock REFRESH = new ReentrantLock();
    private static final Object STORAGE = new Object();
    private final Context context;
    private final SharedPreferences prefs;
    private static final int MAX_BYTES = 4 * 1024 * 1024;
    private static final class Network { private static final OkHttpClient HTTP = new OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS).readTimeout(15, TimeUnit.SECONDS).callTimeout(25, TimeUnit.SECONDS)
        .dns(host -> {
            List<InetAddress> addresses = Dns.SYSTEM.lookup(host);
            for (InetAddress a : addresses) {
                byte[] bytes = a.getAddress();
                if (a.isAnyLocalAddress() || a.isLoopbackAddress() || a.isLinkLocalAddress() ||
                    a.isSiteLocalAddress() || a.isMulticastAddress() ||
                    (bytes.length == 16 && (bytes[0] & 0xfe) == 0xfc))
                    throw new UnknownHostException("Nguồn tin phải là địa chỉ Internet công khai.");
            }
            return addresses;
        }).addNetworkInterceptor(chain -> {
            if (!validUrl(chain.request().url().toString())) throw new IOException("Đường dẫn nguồn không hợp lệ.");
            return chain.proceed(chain.request());
        }).build(); }

    public NewsRepository(Context context) {
        this.context = context.getApplicationContext();
        prefs = context.getSharedPreferences("neutrondict_news", 0);
    }
    public static boolean validUrl(String value) {
        try {
            URI u = new URI(value);
            return "https".equalsIgnoreCase(u.getScheme()) && u.getHost() != null &&
                u.getUserInfo() == null && (u.getPort() == -1 || u.getPort() == 443) &&
                !u.getHost().equalsIgnoreCase("localhost");
        } catch (Exception e) { return false; }
    }
    private static JSONArray defaults() throws JSONException {
        JSONArray feeds = new JSONArray();
        feeds.put(new JSONObject().put("title", "Google News · 日本語").put("language", "ja")
            .put("url", "https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja"));
        feeds.put(new JSONObject().put("title", "Google News · English").put("language", "en")
            .put("url", "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"));
        return feeds;
    }
    public JSONObject snapshot() throws Exception {
        synchronized (STORAGE) {
            return new JSONObject().put("feeds", new JSONArray(prefs.getString("feeds", defaults().toString())))
                .put("articles", new JSONArray(prefs.getString("articles", "[]")))
                .put("bookmarks", new JSONArray(prefs.getString("bookmarks", "[]")))
                .put("errors", new JSONArray(prefs.getString("errors", "[]")))
                .put("updatedAt", prefs.getLong("updatedAt", 0)).put("minutes", prefs.getInt("minutes", 30));
        }
    }
    public void configure(JSONArray feeds, int minutes) throws Exception {
        if (feeds == null || feeds.length() > 12) throw new IOException("Tối đa 12 nguồn tin.");
        if (minutes != 0 && minutes != 15 && minutes != 30 && minutes != 60 && minutes != 120)
            throw new IOException("Chu kỳ không hợp lệ.");
        JSONArray clean = new JSONArray();
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < feeds.length(); i++) {
            JSONObject feed = feeds.getJSONObject(i);
            String url = feed.getString("url").trim();
            if (!validUrl(url)) throw new IOException("Nguồn RSS phải dùng HTTPS.");
            if (!seen.add(url)) continue;
            String language = feed.optString("language", "und").trim().toLowerCase(Locale.ROOT);
            if (!language.matches("[a-z]{2,3}(-[a-z0-9]{2,8})*")) throw new IOException("Mã ngôn ngữ không hợp lệ.");
            clean.put(new JSONObject().put("url", url).put("language", language)
                .put("title", feed.optString("title", new URI(url).getHost()).substring(0, Math.min(120, feed.optString("title", new URI(url).getHost()).length()))));
        }
        synchronized (STORAGE) {
            if (!prefs.edit().putString("feeds", clean.toString()).putInt("minutes", minutes).commit()) throw new IOException("Không lưu được nguồn.");
        }
        NewsWorker.schedule(context, minutes);
    }
    public void refresh() throws Exception {
        if (!REFRESH.tryLock()) return;
        try {
            JSONArray feeds = snapshot().getJSONArray("feeds"), errors = new JSONArray();
            List<JSONObject> articles = new ArrayList<>();
            Set<String> seen = new HashSet<>(), succeeded = new HashSet<>();
            for (int i = 0; i < feeds.length(); i++) {
                JSONObject feed = feeds.getJSONObject(i);
                try {
                    for (JSONObject item : parse(fetch(feed.getString("url")), feed)) {
                        if (seen.add(item.getString("url"))) articles.add(item);
                    }
                    succeeded.add(feed.getString("url"));
                } catch (Exception e) {
                    errors.put(new JSONObject().put("title", feed.optString("title")).put("message",
                        e.getMessage() == null ? "Chưa tải được nguồn." : e.getMessage()));
                }
            }
            synchronized (STORAGE) {
                // Preserve cached entries for failed feeds, but do not resurrect removed subscriptions.
                JSONArray currentFeeds = snapshot().getJSONArray("feeds");
                Set<String> active = new HashSet<>();
                for (int i = 0; i < currentFeeds.length(); i++) active.add(currentFeeds.getJSONObject(i).getString("url"));
                JSONArray old = new JSONArray(prefs.getString("articles", "[]"));
                for (int i = 0; i < old.length(); i++) {
                    JSONObject item = old.getJSONObject(i);
                    if (active.contains(item.optString("feed")) && !succeeded.contains(item.optString("feed")) && seen.add(item.optString("url")))
                        articles.add(item);
                }
                articles.removeIf(item -> !active.contains(item.optString("feed")));
                articles.sort((a,b) -> Long.compare(b.optLong("date"), a.optLong("date")));
                JSONArray result = new JSONArray();
                for (int i = 0; i < Math.min(400, articles.size()); i++) result.put(articles.get(i));
                SharedPreferences.Editor edit = prefs.edit().putString("articles", result.toString()).putString("errors", errors.toString());
                if (!succeeded.isEmpty()) edit.putLong("updatedAt", System.currentTimeMillis());
                if (!edit.commit()) throw new IOException("Không lưu được tin.");
            }
        } finally { REFRESH.unlock(); }
    }
    private static String fetch(String url) throws Exception {
        if (!validUrl(url)) throw new IOException("Nguồn RSS phải dùng HTTPS.");
        Request request = new Request.Builder().url(url).header("User-Agent", "NeutronDict/NewsReader")
            .header("Accept", "application/rss+xml, application/atom+xml, application/xml, text/xml").build();
        try (Response response = Network.HTTP.newCall(request).execute()) {
            if (!response.isSuccessful()) throw new IOException("HTTP " + response.code());
            ResponseBody body = response.body();
            if (body == null || body.contentLength() > MAX_BYTES) throw new IOException("Nguồn vượt giới hạn 4 MB.");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (InputStream input = body.byteStream()) {
                byte[] buffer = new byte[8192]; int n;
                while ((n = input.read(buffer)) >= 0) {
                    if (out.size() + n > MAX_BYTES) throw new IOException("Nguồn vượt giới hạn 4 MB.");
                    out.write(buffer, 0, n);
                }
            }
            // RSS sources should declare UTF-8. XmlPullParser handles XML encodings in parseBytes.
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }
    public static List<JSONObject> parse(String xml, JSONObject feed) throws Exception {
        if (xml.length() > MAX_BYTES || xml.toUpperCase(Locale.ROOT).contains("<!DOCTYPE") ||
            xml.toUpperCase(Locale.ROOT).contains("<!ENTITY")) throw new IOException("XML không an toàn hoặc quá lớn.");
        XmlPullParserFactory factory = XmlPullParserFactory.newInstance();
        factory.setNamespaceAware(true);
        XmlPullParser parser = factory.newPullParser();
        parser.setInput(new StringReader(xml));
        List<JSONObject> result = new ArrayList<>();
        JSONObject item = null;
        int entryDepth = -1;
        String field = null;
        StringBuilder value = new StringBuilder();
        for (int event = parser.getEventType(); event != XmlPullParser.END_DOCUMENT; event = parser.nextToken()) {
            if (event == XmlPullParser.DOCDECL) throw new IOException("XML chứa DTD.");
            if (event == XmlPullParser.START_TAG) {
                String tag = parser.getName();
                if (item == null && ("item".equals(tag) || "entry".equals(tag))) {
                    item = new JSONObject().put("feed", feed.getString("url")).put("source", feed.optString("title"))
                        .put("language", feed.optString("language", "und"));
                    entryDepth = parser.getDepth();
                } else if (item != null && parser.getDepth() == entryDepth + 1) {
                    field = tag; value.setLength(0);
                    if ("link".equals(tag)) {
                        String href = parser.getAttributeValue(null, "href");
                        String rel = parser.getAttributeValue(null, "rel");
                        if (href != null && (rel == null || rel.equals("alternate"))) item.put("url", resolve(feed.getString("url"), href));
                    }
                }
            } else if ((event == XmlPullParser.TEXT || event == XmlPullParser.CDSECT || event == XmlPullParser.ENTITY_REF) && item != null && field != null) {
                String text = parser.getText();
                if (text != null && value.length() < 20000) value.append(text);
            } else if (event == XmlPullParser.END_TAG && item != null) {
                if (parser.getDepth() == entryDepth + 1 && field != null) {
                    String text = value.toString().trim();
                    if (field.equals("title")) item.put("title", text.replaceAll("<[^>]+>", "").substring(0, Math.min(500, text.replaceAll("<[^>]+>", "").length())));
                    if (field.equals("link") && !text.isEmpty() && !item.has("url")) item.put("url", resolve(feed.getString("url"), text));
                    if (field.equals("pubDate") || field.equals("published") || field.equals("updated")) item.put("date", date(text));
                    field = null;
                } else if (parser.getDepth() == entryDepth) {
                    if (validUrl(item.optString("url")) && !item.optString("title").isEmpty()) result.add(item);
                    item = null; field = null;
                    if (result.size() >= 100) break;
                }
            }
        }
        return result;
    }
    private static String resolve(String base, String link) {
        try { return new URI(base).resolve(link).toString(); } catch (Exception e) { return ""; }
    }
    private static long date(String value) {
        try { return OffsetDateTime.parse(value).toInstant().toEpochMilli(); } catch (Exception ignored) {}
        try { return ZonedDateTime.parse(value, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant().toEpochMilli(); } catch (Exception ignored) {}
        return 0;
    }
    public void bookmark(JSONObject article, boolean saved) throws Exception {
        if (article == null || !validUrl(article.optString("url"))) throw new IOException("Bài báo không hợp lệ.");
        synchronized (STORAGE) {
            JSONArray old = new JSONArray(prefs.getString("bookmarks", "[]")), next = new JSONArray();
            if (saved) next.put(article);
            for (int i = 0; i < old.length(); i++) if (!old.getJSONObject(i).optString("url").equals(article.optString("url"))) next.put(old.get(i));
            if (next.length() > 200) throw new IOException("Đã có 200 bài đánh dấu. Hãy bỏ bớt bài cũ.");
            if (!prefs.edit().putString("bookmarks", next.toString()).commit()) throw new IOException("Không lưu được bài.");
        }
    }
}
