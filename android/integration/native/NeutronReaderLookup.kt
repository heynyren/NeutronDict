package com.kienhoang.dualsubreplay.ui

import android.content.Context
import com.kienhoang.dualsubreplay.translation.*
import kotlinx.coroutines.*
import okhttp3.OkHttpClient
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.Normalizer
import java.util.Locale
import java.util.concurrent.TimeUnit

internal data class ReaderMeaning(val meaning: String, val reading: String = "", val source: String = "translation") {
    fun json() = JSONObject().put("meaning", meaning).put("reading", reading).put("source", source)
}

private fun meaningText(value: Any?): String = when (value) {
    is String -> value
    is JSONObject -> listOf("text", "mean", "means", "v").firstNotNullOfOrNull { key ->
        (value.opt(key) as? String)?.takeIf { it.isNotBlank() }
    }.orEmpty()
    else -> ""
}

/** Same Capacitor notebook, read only. Rebuild only after its serialized value changes. */
internal class ReaderNotebook(private val read: () -> String?) {
    private var serialized: String? = null
    private var entries = emptyMap<String, ReaderMeaning>()
    internal var parses = 0
        private set

    @Synchronized fun find(word: String, language: String): ReaderMeaning? {
        val raw = read()
        if (raw != serialized) {
            val next = mutableMapOf<String, ReaderMeaning>()
            if (!raw.isNullOrBlank()) {
                val notebook = JSONObject(raw)
                parses++
                for (key in notebook.keys()) {
                    if (!key.startsWith("javi:") && !key.startsWith("envi:")) continue
                    val item = notebook.optJSONObject(key) ?: continue
                    if (item.opt("del") == true || (item.opt("del") as? Number)?.toDouble()?.let { it != 0.0 } == true) continue
                    val means = item.optJSONArray("means") ?: continue
                    val meaning = (0 until means.length()).map { meaningText(means.opt(it)) }.filter { it.isNotBlank() }.joinToString("\n")
                    if (meaning.isNotBlank()) next[key] = ReaderMeaning(meaning, item.optString("reading"), "notebook")
                }
            }
            entries = next
            serialized = raw
        }
        val dict = when (language) { "ja" -> "javi"; "en" -> "envi"; else -> return null }
        return entries["$dict:$word"]
    }
}

internal data class ReaderTerm(val reading: String, val meanings: List<String>, val common: Boolean)

/** Mirrors thuat-ngu.js: variants, pack ordering, common words and deferred medical packs. */
internal class ReaderTerms(private val load: (String) -> List<JSONObject>) {
    private data class Pack(val after: Boolean, val keys: Map<String, JSONArray>)
    private val languages = mutableMapOf<String, List<Pack>>()
    private fun normal(text: String, lang: String): String {
        val n = Normalizer.normalize(text, Normalizer.Form.NFKC).trim()
        return if (lang == "en") n.lowercase(Locale.ROOT).replace(Regex("[-_‐-―]"), " ").replace(Regex("\\s+"), " ") else n
    }
    private fun plain(text: String) = text.lowercase(Locale.ROOT).replace(Regex("\\s*\\([^)]*\\)\\s*"), " ").replace(Regex("\\s+"), " ").trim()
    private fun variants(text: String, lang: String): List<String> {
        val q = normal(text, lang).trim { it.isWhitespace() || it in "\"'“”‘’「」『』()（）[]【】.,;:!?。、" }
        val result = mutableListOf(q)
        if (lang == "ja") {
            var t = q
            repeat(3) {
                val last = t.lastOrNull() ?: return@repeat
                if (last !in 'ぁ'..'ん') return@repeat
                t = t.dropLast(1)
                if (t.length >= 2 && t.any { it !in 'ぁ'..'ん' && it != 'ー' }) result += t
            }
        } else {
            val t = q.replace(Regex("^(a|an|the) "), "")
            if (t != q) result += t
            if (t.endsWith("ies")) result += t.dropLast(3) + "y"
            else if (Regex("(ch|sh|x|s|z)es$").containsMatchIn(t)) result += t.dropLast(2)
            else if (t.endsWith("s") && !t.endsWith("ss")) result += t.dropLast(1)
        }
        return result
    }
    @Synchronized fun warm(lang: String) {
        if (lang !in listOf("ja", "en") || languages.containsKey(lang)) return
        languages[lang] = load(lang).map { pack ->
            val keys = mutableMapOf<String, JSONArray>()
            fun add(raw: String, item: JSONArray) {
                val key = normal(raw, lang)
                if (key.isNotBlank() && (keys[key] == null || keys[key]!!.optInt(3) and 1 != 0)) keys[key] = item
            }
            val rows = pack.optJSONArray("m") ?: JSONArray()
            for (i in 0 until rows.length()) {
                val item = rows.optJSONArray(i) ?: continue
                add(item.optString(0), item)
                item.optJSONArray(4)?.let { aliases -> for (j in 0 until aliases.length()) add(aliases.optString(j), item) }
                if (lang == "ja" && item.optInt(3) and 1 == 0)
                    item.optString(1).split(" / ").filter { normal(it, lang).length >= 3 }.forEach { add(it, item) }
            }
            Pack(pack.optBoolean("sau"), keys)
        }
    }
    @Synchronized fun find(word: String, lang: String): ReaderTerm? {
        warm(lang)
        val variants = variants(word, lang)
        val meanings = mutableListOf<String>()
        var common = true
        var reading = ""
        for (pack in languages[lang].orEmpty()) {
            val item = variants.firstNotNullOfOrNull { pack.keys[it] } ?: continue
            if (reading.isBlank()) reading = item.optString(1)
            if (!pack.after && item.optInt(3) and 1 == 0) common = false
            item.optJSONArray(2)?.let { values ->
                for (i in 0 until values.length()) {
                    val value = values.optString(i)
                    if (value.isNotBlank() && meanings.none { plain(it) == plain(value) }) meanings += value
                }
            }
        }
        return if (meanings.isEmpty()) null else ReaderTerm(reading, meanings.take(8), common)
    }
}

/** No browser/bridge dependency. Notebook edits always beat cached machine translations. */
internal class ReaderLookupEngine(
    private val notebook: suspend (String, String) -> ReaderMeaning?,
    private val terms: suspend (String, String) -> ReaderTerm?,
    private val translate: suspend (String, String) -> String,
) {
    suspend fun lookup(word: String, language: String): ReaderMeaning {
        require(word.isNotBlank() && word.length <= 200)
        notebook(word, language)?.let { return it }
        val local = terms(word, language)
        if (local != null && !local.common) return ReaderMeaning(local.meanings.joinToString("\n"), local.reading, "local")
        val translated = try {
            translate(word, language).trim().also { check(it.isNotBlank()) }
        } catch (cancel: CancellationException) {
            throw cancel
        } catch (error: Exception) {
            if (local == null) throw error
            return ReaderMeaning(local.meanings.joinToString("\n"), local.reading, "local")
        }
        val meanings = (listOf(translated) + local?.meanings.orEmpty()).distinctBy { it.lowercase(Locale.ROOT).trim() }.take(8)
        return ReaderMeaning(meanings.joinToString("\n"), local?.reading.orEmpty())
    }
}

/** Process-wide read cache; only application context is retained. Work stays off the UI thread. */
internal class NeutronReaderLookup(context: Context) {
    companion object {
        @Volatile private var instance: NeutronReaderLookup? = null
        fun get(context: Context): NeutronReaderLookup = instance ?: synchronized(this) {
            instance ?: NeutronReaderLookup(context.applicationContext).also { instance = it }
        }
    }
    private val app = context.applicationContext
    // This is Capacitor Preferences 6.x's default group; no native writes to this group.
    private val notebook = ReaderNotebook { app.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE).getString("notebook", null) }
    private val terms = ReaderTerms { lang ->
        listOf("dien", "it", "y").map { id ->
            app.assets.open("public/goi/$id-$lang-vi.json").bufferedReader().use { JSONObject(it.readText()) }
        }
    }
    private val preferences = app.getSharedPreferences("dual_sub_preferences", Context.MODE_PRIVATE)
    private val google by lazy {
        GoogleWebTranslator(
            cacheDirectory = File(app.cacheDir, "reader-google-translations"),
            retryDelaysMs = emptyList(),
            client = OkHttpClient.Builder().connectTimeout(1200, TimeUnit.MILLISECONDS)
                .readTimeout(2000, TimeUnit.MILLISECONDS).callTimeout(2500, TimeUnit.MILLISECONDS).build(),
            addressMemory = app.googleAddressMemory(GOOGLE_TRANSLATE_ADDRESS_KEY),
        )
    }
    private val device by lazy { OnDeviceTranslator(File(app.cacheDir, "reader-device-translations")) }
    private val engine = ReaderLookupEngine(
        notebook = { word, lang -> notebook.find(word, lang) },
        terms = { word, lang -> terms.find(word, lang) },
        translate = { word, lang -> translate(word, lang) },
    )
    suspend fun warm(language: String) = withContext(Dispatchers.IO) {
        val lang = language.substringBefore('-').substringBefore('_').lowercase(Locale.ROOT)
        notebook.find("", lang)
        terms.warm(lang)
        // Initialise the HTTP client/SSL while the article opens. Blank cache lookups never use the network.
        if (storedTranslationEngine(preferences.getString(TRANSLATION_ENGINE_PREFERENCE, null)) == TranslationEngine.GOOGLE_WEB)
            google.cachedTranslation(lang, "vi", "")
        Unit
    }
    suspend fun lookup(word: String, language: String): JSONObject = withContext(Dispatchers.IO) {
        val lang = language.substringBefore('-').substringBefore('_').lowercase(Locale.ROOT)
        engine.lookup(word.trim(), lang).json()
    }
    private suspend fun installedTranslation(word: String, lang: String): String? = withTimeoutOrNull(4000L) {
        val installed = device.downloadedLanguages() + "en"
        if (lang !in installed || "vi" !in installed) null else device.translateSingle(lang, "vi", word)
    }
    private suspend fun translate(word: String, lang: String): String {
        val chosen = storedTranslationEngine(preferences.getString(TRANSLATION_ENGINE_PREFERENCE, null))
        if (chosen == TranslationEngine.ON_DEVICE) {
            return installedTranslation(word, lang)?.takeIf { it.isNotBlank() }
                ?: throw IllegalStateException(app.getString(com.kienhoang.dualsubreplay.R.string.rakulang_lookup_error))
        }
        val wait = googleWaitMs(storedGoogleWait(preferences.getString(GOOGLE_WAIT_PREFERENCE, null)), app.onWifi())
        val online = withTimeoutOrNull(wait) {
            try { google.translate(lang, "vi", word) }
            catch (cancel: CancellationException) { throw cancel }
            catch (_: Exception) { null }
        }
        return online?.takeIf { it.isNotBlank() } ?: installedTranslation(word, lang)?.takeIf { it.isNotBlank() }
            ?: throw IllegalStateException(app.getString(com.kienhoang.dualsubreplay.R.string.rakulang_lookup_error))
    }
}
