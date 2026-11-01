package com.kienhoang.dualsubreplay.ui

import android.content.Context
import androidx.test.platform.app.InstrumentationRegistry
import com.kienhoang.dualsubreplay.translation.TranslationDiskCache
import kotlinx.coroutines.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class NeutronReaderNativeTest {
    @Test fun packagedTechnicalTermAndPersistentNativeCacheNeedNoHostWebView() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val storage = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        val preferences = context.getSharedPreferences("dual_sub_preferences", Context.MODE_PRIVATE)
        val originalNotebook = storage.getString("notebook", null)
        val originalEngine = preferences.getString("translation_engine", null)
        try {
            withContext(Dispatchers.IO) {
                storage.edit().putString("notebook", "{}").commit()
                preferences.edit().putString("translation_engine", "google_web").commit()
                TranslationDiskCache(File(context.cacheDir, "reader-google-translations")).put("en", "vi", "reader cache fixture 54321", "nghĩa từ bộ đệm")
            }
            val lookup = NeutronReaderLookup(context)
            val start = android.os.SystemClock.elapsedRealtime()
            val term = withTimeout(2000) { lookup.lookup("電圧", "ja") }
            assertEquals("local", term.getString("source"))
            assertTrue(term.getString("meaning").contains("điện áp"))
            val cached = withTimeout(1000) { lookup.lookup("reader cache fixture 54321", "en") }
            assertEquals("nghĩa từ bộ đệm", cached.getString("meaning"))
            val edited = JSONObject().put("envi:reader cache fixture 54321",
                JSONObject().put("means", org.json.JSONArray().put("nghĩa tự sửa sau cache")))
            withContext(Dispatchers.IO) { storage.edit().putString("notebook", edited.toString()).commit() }
            assertEquals("nghĩa tự sửa sau cache", lookup.lookup("reader cache fixture 54321", "en").getString("meaning"))
            withContext(Dispatchers.IO) { storage.edit().putString("notebook", "{}").commit() }
            assertEquals("nghĩa từ bộ đệm", lookup.lookup("reader cache fixture 54321", "en").getString("meaning"))
            println("READER_DEVICE_CACHE_BENCH pack + disk cache + notebook edit/delete: " +
                (android.os.SystemClock.elapsedRealtime() - start) + "ms")
        } finally {
            withContext(Dispatchers.IO) {
                storage.edit().apply { if (originalNotebook == null) remove("notebook") else putString("notebook", originalNotebook) }.commit()
                preferences.edit().apply { if (originalEngine == null) remove("translation_engine") else putString("translation_engine", originalEngine) }.commit()
            }
        }
    }
}
