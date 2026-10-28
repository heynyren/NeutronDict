package com.kienhoang.dualsubreplay.ui

import android.content.Context
import android.graphics.Rect
import android.net.Uri
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.ActionMode
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.webkit.*
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.lifecycleScope
import com.kienhoang.dualsubreplay.data.*
import com.kienhoang.dualsubreplay.ui.theme.DualSubTheme
import com.neutrondict.app.media.*
import kotlinx.coroutines.*
import org.json.JSONObject
import org.json.JSONTokener
import java.io.File
import java.security.MessageDigest
import java.util.Locale

class NewsReaderActivity : ComponentActivity() {
    private lateinit var page: WebView
    private var selection by mutableStateOf<JSONObject?>(null)
    private var entry by mutableStateOf<JSONObject?>(null)
    private var status by mutableStateOf("")
    private var pageTitle by mutableStateOf("")
    private var currentUrl = ""
    private var language = "ja"
    private var lookupJob: Job? = null
    private var voice: TextToSpeech? = null
    private var voiceReady = false
    private var offline = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        currentUrl = savedInstanceState?.getString("url") ?: intent.getStringExtra("url").orEmpty()
        language = intent.getStringExtra("language") ?: "ja"
        pageTitle = intent.getStringExtra("title").orEmpty()
        if (!NewsRepository.validUrl(currentUrl)) { finish(); return }
        voice = TextToSpeech(this) { result -> voiceReady = result == TextToSpeech.SUCCESS }
        page = SelectionWebView(this) { captureSelection() }
        page.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            safeBrowsingEnabled = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }
        page.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (!request.isForMainFrame) return false
                return !NewsRepository.validUrl(request.url.toString())
            }
            override fun onPageStarted(view: WebView, url: String, icon: android.graphics.Bitmap?) {
                if (!offline) currentUrl = url
                status = "Đang mở bài…"
            }
            override fun onPageFinished(view: WebView, url: String) {
                pageTitle = view.title ?: pageTitle
                status = if (offline) "Bản đã lưu trên máy" else ""
                val sentence = intent.getStringExtra("sentence").orEmpty()
                if (sentence.isNotBlank()) {
                    view.findAllAsync(sentence)
                    intent.removeExtra("sentence")
                }
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (!request.isForMainFrame) return
                val cached = cacheFile(currentUrl)
                if (!offline && cached.isFile) {
                    offline = true
                    val data = runCatching { JSONObject(cached.readText()) }.getOrNull()
                    if (data != null) showText(data.optString("text"))
                } else status = "Chưa mở được bài. Kiểm tra mạng hoặc bấm tải lại."
            }
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                Toast.makeText(this@NewsReaderActivity, "Trang đã đóng để giải phóng bộ nhớ. Hãy mở lại bài.", Toast.LENGTH_LONG).show()
                finish()
                return true
            }
        }
        if (savedInstanceState?.getBundle("web")?.let { page.restoreState(it) } == null) page.loadUrl(currentUrl)
        setContent { DualSubTheme { ReaderScreen() } }
    }

    @Composable private fun ReaderScreen() {
        val context = LocalContext.current
        val model = remember { sharedNeutronAssistant(context) }
        val aiHost = remember(model) { AiAssistantHost(model.controller) { model.guide } }
        val state = selection
        val result = entry
        BackHandler {
            if (state != null) { selection = null; entry = null }
            else if (page.canGoBack() && !offline) page.goBack() else finish()
        }
        Surface(Modifier.fillMaxSize().safeDrawingPadding()) {
            Column {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    TextButton(onClick = { finish() }) { Text("‹ NeutronDict") }
                    TextButton(onClick = { captureSelection() }) { Text("Tra từ") }
                    TextButton(onClick = { askAi() }) { Text("✦ AI") }
                }
                Text(pageTitle, style = MaterialTheme.typography.labelMedium, maxLines = 1, modifier = Modifier.padding(horizontal = 12.dp))
                Row {
                    TextButton(onClick = { offline = false; page.loadUrl(currentUrl) }) { Text("Tải lại") }
                    TextButton(onClick = { readerText(false) }) { Text("Dễ đọc") }
                    TextButton(onClick = { readerText(true) }) { Text("Lưu bài") }
                }
                if (status.isNotBlank()) Text(status, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(8.dp))
                AndroidView(factory = { page }, modifier = Modifier.weight(1f).fillMaxWidth())
            }
        }
        if (state != null && result != null) {
            val word = state.optString("word")
            val lang = state.optString("language", language).substringBefore('-').lowercase()
            val sentence = state.optString("sentence")
            val token = AnalyzedToken(word, 0, word.length, PartOfSpeech.OTHER, result.optString("reading").ifBlank { null })
            val selected = LearningWordSelection(token, lang, "vi", null,
                SubtitleSegment(0, 0, 0, sentence, translatedText = result.optString("translation").ifBlank { null }), false)
            CompositionLocalProvider(LocalAiAssistant provides aiHost) {
                WordLearningDialog(selected, false,
                    onTranslateWord = { result.optString("meaning") },
                    onSave = { meaning, _ ->
                        val item = JSONObject(state.toString()).put("meaning", meaning).put("meaningLanguage", "vi")
                            .put("reading", result.optString("reading")).put("translatedSentence", result.optString("translation"))
                            .put("kind", "article")
                        neutronRequest(JSONObject().put("op", "save").put("item", item))
                        status = "Đã lưu vào sổ tay NeutronDict"
                    },
                    onSpeak = { speak(word, lang) }, speechMessage = null,
                    onDismiss = { selection = null; entry = null })
            }
        }
        // Grammar/kanji questions launched by the unchanged word card use the shared AI panel.
        val aiState by model.controller.state.collectAsState()
        LaunchedEffect(aiState.pendingQuestion) {
            if (aiState.pendingQuestion != null) {
                selection = null; entry = null
                askAi()
            }
        }
    }
    private fun speak(text: String, lang: String) {
        if (voiceReady) { voice?.language = Locale.forLanguageTag(lang); voice?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "reader-word") }
    }
    private fun captureSelection() {
        val script = assets.open("neutron/reader-context.js").bufferedReader().use { it.readText() }
        page.evaluateJavascript(script) { raw ->
            val json = runCatching { JSONTokener(raw).nextValue() as? String }.getOrNull()
            val data = json?.let { runCatching { JSONObject(it) }.getOrNull() }
            if (data == null) { status = "Bôi đen từ trong bài rồi chọn Tra NeutronDict."; return@evaluateJavascript }
            if (data.has("error")) { status = data.optString("error"); return@evaluateJavascript }
            data.put("url", currentUrl).put("title", pageTitle)
            val detected = data.optString("language").substringBefore('-').lowercase()
            data.put("language", detected.ifBlank { language.substringBefore('-') })
            lookupJob?.cancel()
            lookupJob = lifecycleScope.launch {
                status = "Đang tra “" + data.optString("word") + "”…"
                try {
                    val found = neutronRequest(JSONObject().put("op", "lookup").put("item", data))
                    selection = data; entry = found; status = ""
                } catch (e: CancellationException) { throw e }
                catch (e: Exception) { status = e.message ?: "Chưa tra được từ." }
            }
        }
    }
    private fun askAi() {
        page.evaluateJavascript("(function(){const e=document.querySelector('article,main')||document.body;return (window.getSelection().toString()||e.innerText||'').slice(0,14000)})()") { raw ->
            val text = runCatching { JSONTokener(raw).nextValue() as? String }.getOrNull().orEmpty()
            NeutronAssistant.show(this, pageTitle + "\n" + currentUrl + "\n" + text, language)
        }
    }
    private fun cacheFile(url: String): File {
        val dir = File(filesDir, "neutron-articles").apply { mkdirs() }
        val key = MessageDigest.getInstance("SHA-256").digest(url.toByteArray()).joinToString("") { "%02x".format(it) }
        return File(dir, key + ".json")
    }
    private fun readerText(save: Boolean) {
        page.evaluateJavascript("(function(){const e=document.querySelector('article,main')||document.body;return (e.innerText||'').slice(0,250000)})()") { raw ->
            val text = runCatching { JSONTokener(raw).nextValue() as? String }.getOrNull().orEmpty()
            if (text.isBlank()) { status = "Chưa lấy được nội dung bài."; return@evaluateJavascript }
            if (!save) { offline = true; showText(text); return@evaluateJavascript }
            lifecycleScope.launch {
                try {
                    withContext(Dispatchers.IO) {
                        val file = cacheFile(currentUrl)
                        val temp = File(file.parentFile, file.name + ".tmp")
                        temp.writeText(JSONObject().put("text", text).put("title", pageTitle).put("url", currentUrl).toString())
                        check(temp.renameTo(file)) { "Không lưu được bài." }
                        file.parentFile?.listFiles()?.filter { it.extension == "json" }?.sortedByDescending { it.lastModified() }
                            ?.drop(50)?.forEach { it.delete() }
                        NewsRepository(this@NewsReaderActivity).bookmark(JSONObject().put("url", currentUrl)
                            .put("title", pageTitle).put("language", language).put("offline", true), true)
                    }
                    status = "Đã lưu bài để đọc ngoại tuyến"
                } catch (e: Exception) { status = e.message ?: "Không lưu được bài." }
            }
        }
    }
    private fun showText(text: String) {
        val escaped = android.text.TextUtils.htmlEncode(text)
        val html = "<!doctype html><html lang='" + language.replace(Regex("[^a-zA-Z-]"), "") +
            "'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
            "<style>body{font:19px/1.9 sans-serif;margin:24px;white-space:pre-wrap;overflow-wrap:anywhere;color:#172a31;background:#fafaf7}p{margin:1em 0}</style><article>" +
            escaped.split("\n").joinToString("") { "<p>" + it + "</p>" } + "</article></html>"
        page.loadDataWithBaseURL(currentUrl, html, "text/html", "UTF-8", null)
    }
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString("url", currentUrl)
        outState.putBundle("web", Bundle().also { page.saveState(it) })
    }
    override fun onPause() { super.onPause(); page.onPause(); voice?.stop() }
    override fun onResume() { super.onResume(); if (::page.isInitialized) page.onResume() }
    override fun onDestroy() { lookupJob?.cancel(); voice?.shutdown(); page.destroy(); super.onDestroy() }
}

/** Only a native, user-clicked command reads selection. The article has no JS bridge to app storage. */
private class SelectionWebView(context: Context, private val lookup: () -> Unit) : WebView(context) {
    override fun startActionMode(callback: ActionMode.Callback, type: Int): ActionMode? =
        super.startActionMode(object : ActionMode.Callback2() {
            override fun onCreateActionMode(mode: ActionMode, menu: Menu): Boolean {
                val created = callback.onCreateActionMode(mode, menu)
                menu.add(0, 0x4e44, 0, "Tra NeutronDict").setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS)
                return created
            }
            override fun onPrepareActionMode(mode: ActionMode, menu: Menu) = callback.onPrepareActionMode(mode, menu)
            override fun onActionItemClicked(mode: ActionMode, item: MenuItem): Boolean {
                if (item.itemId == 0x4e44) { lookup(); return true }
                return callback.onActionItemClicked(mode, item)
            }
            override fun onDestroyActionMode(mode: ActionMode) = callback.onDestroyActionMode(mode)
            override fun onGetContentRect(mode: ActionMode, view: View, rect: Rect) {
                if (callback is ActionMode.Callback2) callback.onGetContentRect(mode, view, rect)
                else super.onGetContentRect(mode, view, rect)
            }
        }, type)
}
