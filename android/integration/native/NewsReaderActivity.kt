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
import androidx.compose.ui.geometry.Rect as ComposeRect
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.geometry.Offset
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
    override fun attachBaseContext(base:Context) { super.attachBaseContext(NeutronInterface.wrap(base)) }
    private lateinit var page: WebView
    private var selection by mutableStateOf<JSONObject?>(null)
    private var entry by mutableStateOf<JSONObject?>(null)
    private var details by mutableStateOf(false)
    private var selectionSaved by mutableStateOf(false)
    private var lookupResult: CompletableDeferred<JSONObject>? = null
    private var selectedTokens by mutableStateOf<List<AnalyzedToken>>(emptyList())
    private var status by mutableStateOf("")
    private var pageTitle by mutableStateOf("")
    private var currentUrl = ""
    private var language = "ja"
    private var lookupJob: Job? = null
    private val meaningLookup by lazy { NeutronReaderLookup.get(this) }
    private var voice: TextToSpeech? = null
    private var voiceReady = false
    private var offline = false
    private var lookupGeneration = 0
    private var pageProgress by mutableFloatStateOf(0f)
    private var sourceTarget: JSONObject? = null
    private var sourceRestoreGeneration = 0
    private var sourceRestoreCancelled = false
    private var sourceRestoreFinished = false
    private var readerActive = false
    private var readableText: String? = null
    private val sourceRestoreTasks = mutableListOf<Runnable>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        currentUrl = savedInstanceState?.getString("url") ?: intent.getStringExtra("url").orEmpty()
        language = savedInstanceState?.getString("language") ?: intent.getStringExtra("language") ?: "ja"
        pageTitle = savedInstanceState?.getString("title") ?: intent.getStringExtra("title").orEmpty()
        offline = savedInstanceState?.getBoolean("offline", false) ?: false
        sourceRestoreCancelled = savedInstanceState?.getBoolean("sourceRestoreCancelled", false) ?: false
        sourceTarget = runCatching { JSONObject(savedInstanceState?.getString("sourceTarget").orEmpty()) }.getOrNull()
            ?: JSONObject().apply {
                for (key in listOf("word", "sentence", "prefix", "suffix")) put(key, intent.getStringExtra(key).orEmpty())
                put("language", language)
            }.takeIf { it.optString("word").isNotBlank() || it.optString("sentence").isNotBlank() }
        if (!NewsRepository.validUrl(currentUrl)) { finish(); return }
        voice = TextToSpeech(this) { result -> voiceReady = result == TextToSpeech.SUCCESS }
        page = SelectionWebView(this, { captureSelection() }, {
            cancelSourceRestore(user = true)
            lookupGeneration++; dismissLookup()
        }, {
            // Opening details deliberately ends native selection after snapshotting the phrase.
            if (!details) { lookupGeneration++; dismissLookup() }
        })
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
        page.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, progress: Int) { pageProgress = progress / 100f }
        }
        page.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (!request.isForMainFrame) return false
                val allowed = NewsRepository.validUrl(request.url.toString())
                if (allowed && request.hasGesture()) cancelSourceRestore(user = true)
                return !allowed
            }
            override fun onPageStarted(view: WebView, url: String, icon: android.graphics.Bitmap?) {
                cancelSourceRestore()
                sourceRestoreFinished = false
                (page as? SelectionWebView)?.finishSelectionMenu()
                lookupGeneration++; dismissLookup()
                if (!offline) currentUrl = url
                status = NeutronUiStrings.text(this@NewsReaderActivity,"Đang mở bài…")
            }
            override fun onPageFinished(view: WebView, url: String) {
                pageTitle = view.title ?: pageTitle
                status = if (offline) NeutronUiStrings.text(this@NewsReaderActivity,"Bản đã lưu trên máy") else ""
                sourceRestoreFinished = false
                scheduleSourceRestore()
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (!request.isForMainFrame) return
                val cached = cacheFile(currentUrl)
                if (!offline && cached.isFile) {
                    offline = true
                    val data = runCatching { JSONObject(cached.readText()) }.getOrNull()
                    if (data != null) showText(data.optString("text"))
                } else status = NeutronUiStrings.text(this@NewsReaderActivity,"Chưa mở được bài. Kiểm tra mạng hoặc bấm tải lại.")
            }
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                Toast.makeText(this@NewsReaderActivity, NeutronUiStrings.text(this@NewsReaderActivity,"Trang đã đóng để giải phóng bộ nhớ. Hãy mở lại bài."), Toast.LENGTH_LONG).show()
                finish()
                return true
            }
        }
        val savedReader = savedInstanceState?.getString("readerText")
        if (offline && !savedReader.isNullOrBlank()) showText(savedReader, resetSource = false)
        else if (savedInstanceState?.getBundle("web")?.let { page.restoreState(it) } == null) page.loadUrl(currentUrl)
        lifecycleScope.launch { runCatching { meaningLookup.warm(language) } }
        setContent { DualSubTheme { ReaderScreen() } }
    }

    private fun cancelSourceRestore(user: Boolean = false) {
        sourceRestoreGeneration++
        if (user) sourceRestoreCancelled = true
        if (::page.isInitialized) sourceRestoreTasks.forEach { page.removeCallbacks(it) }
        sourceRestoreTasks.clear()
    }
    private fun restartSourceRestore() {
        cancelSourceRestore()
        sourceRestoreCancelled = false
        sourceRestoreFinished = false
    }
    private fun scheduleSourceRestore() {
        cancelSourceRestore()
        val target = sourceTarget ?: return
        if (!readerActive || sourceRestoreCancelled || sourceRestoreFinished || isFinishing || isDestroyed) return
        val generation = sourceRestoreGeneration
        val payload = JSONObject(target.toString()).put("language", language)
        val template = runCatching { assets.open("neutron/reader-source.js").bufferedReader().use { it.readText() } }.getOrNull() ?: return
        val script = template.replace("__NEUTRON_SOURCE__", payload.toString())
        val delays = longArrayOf(0L, 300L, 1000L, 2500L, 5000L, 8000L)
        for ((index, delay) in delays.withIndex()) {
            val task = Runnable {
                if (generation != sourceRestoreGeneration || !readerActive || sourceRestoreCancelled || isFinishing || isDestroyed) return@Runnable
                page.evaluateJavascript(script) { raw ->
                    if (generation != sourceRestoreGeneration || !readerActive || sourceRestoreCancelled || isFinishing || isDestroyed) return@evaluateJavascript
                    if (index == delays.lastIndex) sourceRestoreFinished = true
                }
            }
            sourceRestoreTasks.add(task)
            page.postDelayed(task, delay)
        }
    }

    @Composable private fun ReaderScreen() {
        val context = LocalContext.current
        val model = remember { sharedNeutronAssistant(context) }
        val aiHost = remember(model) { AiAssistantHost(model.controller) { model.guide } }
        val state = selection
        val result = entry
        var rootOffset by remember { mutableStateOf(Offset.Zero) }
        var pageOffset by remember { mutableStateOf(Offset.Zero) }
        var pageWidth by remember { mutableIntStateOf(0) }
        BackHandler {
            if (state != null) {
                (page as? SelectionWebView)?.finishSelectionMenu()
                dismissLookup()
            }
            else if (page.canGoBack() && !offline) { cancelSourceRestore(user = true); page.goBack() } else finish()
        }
        Box(Modifier.fillMaxSize().onGloballyPositioned { rootOffset = it.positionInWindow() }) {
        Surface(Modifier.fillMaxSize().safeDrawingPadding()) {
            Column {
                Surface(color = MaterialTheme.colorScheme.surfaceContainer) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    TextButton(onClick = { finish() }) { Text(getString(com.kienhoang.dualsubreplay.R.string.rakulang_return)) }
                    TextButton(onClick = { askAi() }) { Text("✦ AI") }
                }
                }
                Text(pageTitle, style = MaterialTheme.typography.titleMedium, maxLines = 2, modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp))
                Text(Uri.parse(currentUrl).host.orEmpty(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(horizontal = 20.dp))
                Row(Modifier.padding(horizontal = 8.dp)) {
                    TextButton(onClick = { offline = false; readableText = null; restartSourceRestore(); page.loadUrl(currentUrl) }) { Text(NeutronUiStrings.text(this@NewsReaderActivity,"Tải lại")) }
                    TextButton(onClick = { readerText(false) }) { Text(NeutronUiStrings.text(this@NewsReaderActivity,"Dễ đọc")) }
                    TextButton(onClick = { readerText(true) }) { Text(NeutronUiStrings.text(this@NewsReaderActivity,"Lưu bài")) }
                }
                if (status.isNotBlank()) Text(NeutronUiStrings.text(this@NewsReaderActivity,status), style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(8.dp))
                if (pageProgress < 1f) LinearProgressIndicator(progress = { pageProgress }, modifier = Modifier.fillMaxWidth())
                AndroidView(factory = { page }, modifier = Modifier.weight(1f).fillMaxWidth()
                    .onGloballyPositioned {
                        pageOffset = it.positionInWindow()
                        pageWidth = it.size.width
                    })
            }
        }
        if (state != null) {
            val word = state.optString("word")
            val lang = state.optString("language", language).substringBefore('-').lowercase()
            val sentence = state.optString("sentence")
            val pending = lookupResult
            val parts = selectedTokens
            val token = parts.singleOrNull()?.takeIf { it.text == word }
                ?: AnalyzedToken(word, 0, word.length, PartOfSpeech.OTHER, result?.optString("reading")?.ifBlank { null })
            val selected = remember(state, token, parts) {
                LearningWordSelection(token, lang, "vi", null,
                    SubtitleSegment(0, 0, 0, sentence), false, parts)
            }
            val saveSelection: suspend (String) -> Unit = { meaning ->
                val found = readerSelectionResult(state, checkNotNull(pending))
                val item = JSONObject(state.toString()).put("meaning", meaning).put("meaningLanguage", "vi")
                    .put("reading", found.optString("reading").ifBlank { selected.token.reading.orEmpty() }).put("kind", "article")
                neutronRequest(JSONObject().put("op", "save").put("item", item))
                if (selection === state) {
                    selectionSaved = true
                    status = NeutronUiStrings.text(this@NewsReaderActivity,"Đã lưu vào sổ tay NeutronDict")
                }
            }
            CompositionLocalProvider(LocalAiAssistant provides aiHost) {
                if (!details) {
                    val bounds = state.optJSONObject("bounds")
                    // Observe layout changes: status/title rows can move the WebView after
                    // selection capture. Reading its old position during composition covers the word.
                    val scale = pageWidth.toFloat() / state.optDouble("viewportWidth", pageWidth.toDouble()).coerceAtLeast(1.0).toFloat()
                    val rect = ComposeRect(
                        pageOffset.x - rootOffset.x + (bounds?.optDouble("left") ?: 0.0).toFloat() * scale,
                        pageOffset.y - rootOffset.y + (bounds?.optDouble("top") ?: 0.0).toFloat() * scale,
                        pageOffset.x - rootOffset.x + (bounds?.optDouble("right") ?: 1.0).toFloat() * scale,
                        pageOffset.y - rootOffset.y + (bounds?.optDouble("bottom") ?: 1.0).toFloat() * scale)
                    PhraseActionBar(rect, word, false, null, null,
                        quickTranslate = { readerSelectionResult(state, checkNotNull(pending)).optString("meaning") },
                        onTranslate = {
                            details = true
                            (page as? SelectionWebView)?.finishSelectionMenu()
                        },
                        onPronounce = { speak(word, lang) },
                        onClose = {
                            (page as? SelectionWebView)?.finishSelectionMenu()
                            dismissLookup()
                        },
                        onSave = saveSelection, alreadySaved = selectionSaved, saveKey = state)
                } else {
                    WordLearningDialog(selected, false,
                        onTranslateWord = { readerSelectionResult(state, checkNotNull(pending)).optString("meaning") },
                        onSave = { meaning, _ -> saveSelection(meaning) },
                        onSpeak = { speak(word, lang) }, speechMessage = null,
                        onDismiss = { dismissLookup() },
                        onSpeakPart = { part -> speak(part.text, lang) })
                }
            }
        }
        }
        // Grammar/kanji questions launched by the unchanged word card use the shared AI panel.
        val aiState by model.controller.state.collectAsState()
        LaunchedEffect(aiState.pendingQuestion) {
            if (aiState.pendingQuestion != null) {
                dismissLookup()
                askAi()
            }
        }
    }
    /** A retry starts a native lookup, never re-awaits the same failed deferred forever. */
    private suspend fun readerSelectionResult(state: JSONObject, pending: CompletableDeferred<JSONObject>): JSONObject {
        if (selection !== state) throw CancellationException("Selection changed")
        entry?.let { return it }
        if (!pending.isCompleted) return pending.await()
        return try {
            pending.await()
        } catch (cancel: CancellationException) {
            throw cancel
        } catch (_: Exception) {
            val fresh = meaningLookup.lookup(state.optString("word"), state.optString("language"))
            if (selection !== state) throw CancellationException("Selection changed")
            entry = fresh
            status = ""
            fresh
        }
    }
    private fun speak(text: String, lang: String) {
        if (voiceReady) { voice?.language = Locale.forLanguageTag(lang); voice?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "reader-word") }
    }
    private fun captureSelection() {
        if (isFinishing || isDestroyed) return
        val generation = lookupGeneration
        val script = assets.open("neutron/reader-context.js").bufferedReader().use { it.readText() }
        page.evaluateJavascript(script) { raw ->
            val json = runCatching { JSONTokener(raw).nextValue() as? String }.getOrNull()
            val data = json?.let { runCatching { JSONObject(it) }.getOrNull() }
            if (generation != lookupGeneration || !readerActive || isFinishing || isDestroyed) return@evaluateJavascript
            if (data == null) { lookupGeneration++; dismissLookup(); return@evaluateJavascript }
            if (data.has("error")) { status = data.optString("error"); return@evaluateJavascript }
            // Hide only the floating toolbar. Finishing ActionMode also destroys the
            // highlight and native drag handles, making phrase selection impossible.
            (page as? SelectionWebView)?.hideSelectionToolbar()
            data.put("url", currentUrl).put("title", pageTitle)
            val detected = data.optString("language").substringBefore('-').lowercase()
            data.put("language", detected.ifBlank { language.substringBefore('-') })
            val old = selection
            if (old != null && listOf("word", "sentence", "url", "language", "prefix", "suffix").all {
                    old.optString(it) == data.optString(it)
                }) return@evaluateJavascript
            val requestGeneration = ++lookupGeneration
            dismissLookup()
            val pending = CompletableDeferred<JSONObject>()
            lookupResult = pending
            selection = data; details = false; status = ""
            lookupJob = lifecycleScope.launch {
                launch {
                    val tokens = withContext(Dispatchers.Default) {
                        LanguageAwareTokenizer.tokenize(data.optString("word"), data.optString("language"))
                    }
                    if (selection === data) selectedTokens = tokens
                }
                try {
                    val found = meaningLookup.lookup(data.optString("word"), data.optString("language"))
                    if (requestGeneration == lookupGeneration && selection === data) {
                        entry = found
                        pending.complete(found)
                    }
                } catch (e: CancellationException) { pending.cancel(); throw e }
                catch (e: Exception) {
                    pending.completeExceptionally(e)
                    if (selection === data) status = NeutronUiStrings.text(this@NewsReaderActivity,e.message) .takeIf { it.isNotBlank() } ?: NeutronUiStrings.text(this@NewsReaderActivity,"Chưa tra được từ.")
                }
            }
        }
    }
    private fun dismissLookup() {
        lookupJob?.cancel(); lookupJob = null
        lookupResult?.cancel(); lookupResult = null
        selection = null; entry = null; selectedTokens = emptyList(); details = false; selectionSaved = false
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
            if (text.isBlank()) { status = NeutronUiStrings.text(this@NewsReaderActivity,"Chưa lấy được nội dung bài."); return@evaluateJavascript }
            if (!save) { offline = true; showText(text); return@evaluateJavascript }
            lifecycleScope.launch {
                try {
                    withContext(Dispatchers.IO) {
                        val file = cacheFile(currentUrl)
                        val temp = File(file.parentFile, file.name + ".tmp")
                        temp.writeText(JSONObject().put("text", text).put("title", pageTitle).put("url", currentUrl).toString())
                        check(temp.renameTo(file)) { NeutronUiStrings.text(this@NewsReaderActivity,"Không lưu được bài.") }
                        file.parentFile?.listFiles()?.filter { it.extension == "json" }?.sortedByDescending { it.lastModified() }
                            ?.drop(50)?.forEach { it.delete() }
                        NewsRepository(this@NewsReaderActivity).bookmark(JSONObject().put("url", currentUrl)
                            .put("title", pageTitle).put("language", language).put("offline", true), true)
                    }
                    status = NeutronUiStrings.text(this@NewsReaderActivity,"Đã lưu bài để đọc ngoại tuyến")
                } catch (e: Exception) { status = NeutronUiStrings.text(this@NewsReaderActivity,e.message) .takeIf { it.isNotBlank() } ?: NeutronUiStrings.text(this@NewsReaderActivity,"Không lưu được bài.") }
            }
        }
    }
    private fun showText(text: String, resetSource: Boolean = true) {
        if (resetSource) restartSourceRestore() else cancelSourceRestore()
        offline = true
        readableText = text.take(250000)
        val escaped = android.text.TextUtils.htmlEncode(readableText.orEmpty())
        val html = "<!doctype html><html lang='" + language.replace(Regex("[^a-zA-Z-]"), "") +
            "'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
            "<style>body{font:19px/1.9 sans-serif;margin:24px;white-space:pre-wrap;overflow-wrap:anywhere;color:#172a31;background:#fafaf7}p{margin:1em 0}</style><article>" +
            escaped.split("\n").joinToString("") { "<p>" + it + "</p>" } + "</article></html>"
        page.loadDataWithBaseURL(currentUrl, html, "text/html", "UTF-8", null)
    }
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString("url", currentUrl)
        outState.putString("title", pageTitle)
        outState.putString("language", language)
        outState.putBoolean("offline", offline)
        outState.putString("sourceTarget", sourceTarget?.toString())
        outState.putBoolean("sourceRestoreCancelled", sourceRestoreCancelled)
        if (offline && readableText != null) outState.putString("readerText", readableText)
        else if (::page.isInitialized) outState.putBundle("web", Bundle().also { page.saveState(it) })
    }
    override fun onPause() {
        readerActive = false
        lookupGeneration++; dismissLookup()
        cancelSourceRestore()
        super.onPause()
        if (::page.isInitialized) {
            (page as? SelectionWebView)?.finishSelectionMenu()
            page.onPause()
        }
        voice?.stop()
    }
    override fun onResume() {
        super.onResume()
        readerActive = true
        if (::page.isInitialized) {
            page.onResume()
            if (!sourceRestoreFinished) scheduleSourceRestore()
        }
    }
    override fun onDestroy() {
        readerActive = false
        cancelSourceRestore()
        lookupJob?.cancel()
        voice?.shutdown()
        if (::page.isInitialized) {
            (page as? SelectionWebView)?.finishSelectionMenu()
            page.destroy()
        }
        super.onDestroy()
    }
}

/** Open only after the native selection settles; never expose a bridge to article scripts. */
internal class SelectionWebView(context: Context, private val lookup: () -> Unit, private val touched: () -> Unit, private val selectionEnded: () -> Unit) : WebView(context) {
    private var selectionMode: ActionMode? = null
    private var fingerDown = false
    private var lastRect: Rect? = null
    private var pendingLookup: Runnable? = null
    private var toolbarHidden = false
    private val keepToolbarHidden = object : Runnable {
        override fun run() {
            val mode = selectionMode ?: return
            if (!toolbarHidden || !isAttachedToWindow) return
            mode.hide(2000L)
            postDelayed(this, 1000L)
        }
    }
    fun hideSelectionToolbar() {
        toolbarHidden = true
        removeCallbacks(keepToolbarHidden)
        keepToolbarHidden.run()
    }
    private fun stopHidingToolbar() {
        toolbarHidden = false
        removeCallbacks(keepToolbarHidden)
    }
    private fun cancelPending() {
        pendingLookup?.let { removeCallbacks(it) }
        pendingLookup = null
    }
    private fun scheduleLookup() {
        cancelPending()
        val mode = selectionMode ?: return
        if (fingerDown) return
        val task = Runnable {
            pendingLookup = null
            if (!fingerDown && selectionMode === mode && isAttachedToWindow) lookup()
        }
        pendingLookup = task
        postDelayed(task, 250L)
    }
    fun finishSelectionMenu() {
        stopHidingToolbar()
        cancelPending()
        selectionMode?.finish()
        fingerDown = false
    }
    override fun onDetachedFromWindow() {
        stopHidingToolbar()
        cancelPending()
        super.onDetachedFromWindow()
    }
    override fun onTouchEvent(event: android.view.MotionEvent): Boolean {
        when (event.actionMasked) {
            android.view.MotionEvent.ACTION_DOWN -> {
                fingerDown = true
                cancelPending()
                touched()
            }
            android.view.MotionEvent.ACTION_UP, android.view.MotionEvent.ACTION_CANCEL -> {
                fingerDown = false
                scheduleLookup()
            }
        }
        return super.onTouchEvent(event)
    }
    override fun startActionMode(callback: ActionMode.Callback, type: Int): ActionMode? =
        super.startActionMode(object : ActionMode.Callback2() {
            override fun onCreateActionMode(mode: ActionMode, menu: Menu): Boolean {
                val created = callback.onCreateActionMode(mode, menu)
                if (created) {
                    selectionMode = mode
                    lastRect = null
                    scheduleLookup()
                }
                return created
            }
            override fun onPrepareActionMode(mode: ActionMode, menu: Menu): Boolean {
                val result = callback.onPrepareActionMode(mode, menu)
                scheduleLookup()
                return result
            }
            override fun onActionItemClicked(mode: ActionMode, item: MenuItem): Boolean =
                callback.onActionItemClicked(mode, item)
            override fun onDestroyActionMode(mode: ActionMode) {
                if (selectionMode === mode) {
                    cancelPending()
                    selectionMode = null
                    lastRect = null
                    stopHidingToolbar()
                    selectionEnded()
                }
                callback.onDestroyActionMode(mode)
            }
            override fun onGetContentRect(mode: ActionMode, view: View, rect: Rect) {
                if (callback is ActionMode.Callback2) callback.onGetContentRect(mode, view, rect)
                else super.onGetContentRect(mode, view, rect)
                if (selectionMode === mode && lastRect != rect) {
                    lastRect = Rect(rect)
                    // WebView selection handles live in another window; their drags do
                    // not necessarily pass through this WebView's onTouchEvent.
                    touched()
                    scheduleLookup()
                }
            }
        }, type)
}
