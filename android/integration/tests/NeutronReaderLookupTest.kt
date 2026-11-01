package com.kienhoang.dualsubreplay.ui

import kotlinx.coroutines.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class NeutronReaderLookupTest {
    private fun notebook(meaning: String, deleted: Boolean = false) =
        JSONObject().put("javi:ケア", JSONObject().put("means", org.json.JSONArray().put(meaning))
            .put("reading", "ケア").put("del", deleted).put("duong", JSONObject().put("nghe", 123))).toString()

    @Test fun notebookIsIndexedOnceButEditsAndDeletionWinImmediately() {
        var raw: String? = notebook("nghĩa tự sửa")
        val cache = ReaderNotebook { raw }
        repeat(1000) { assertEquals("nghĩa tự sửa", cache.find("ケア", "ja")?.meaning) }
        assertEquals(1, cache.parses)
        raw = notebook("nghĩa mới")
        assertEquals("nghĩa mới", cache.find("ケア", "ja")?.meaning)
        raw = notebook("đã xóa", true)
        assertNull(cache.find("ケア", "ja"))
        assertNull(cache.find("ケア", "en"))
        raw = null
        assertNull(cache.find("ケア", "ja"))
        assertEquals(3, cache.parses)
    }
    @Test fun legacyMeaningObjectsAndNumericTombstones() {
        val cache = ReaderNotebook { """{"javi:生":{"means":[{"text":"sống"},{"mean":"sinh"}]},"envi:care":{"means":["care"],"del":1}}""" }
        assertEquals("sống\nsinh", cache.find("生", "ja")?.meaning)
        assertNull(cache.find("care", "en"))
    }
    @Test fun notebookHitNeverCallsNetworkOrTerms() = runBlocking {
        val engine = ReaderLookupEngine({ _, _ -> ReaderMeaning("riêng", "よみ", "notebook") },
            { _, _ -> error("must not load terms") }, { _, _ -> error("must not call network") })
        assertEquals("notebook", engine.lookup("test", "ja").source)
    }
    @Test fun technicalTermDoesNotWaitForUnavailableNetwork() = runBlocking {
        var calls = 0
        val engine = ReaderLookupEngine({ _, _ -> null }, { _, _ -> ReaderTerm("でんあつ", listOf("điện áp"), false) },
            { _, _ -> calls++; delay(10_000); "late" })
        val result = withTimeout(500) { engine.lookup("電圧", "ja") }
        assertEquals("điện áp", result.meaning); assertEquals(0, calls)
    }
    @Test fun commonAndDeferredTermsKeepGeneralMeaningFirst() = runBlocking {
        val engine = ReaderLookupEngine({ _, _ -> null }, { _, _ -> ReaderTerm("", listOf("công", "công việc"), true) },
            { _, _ -> "công việc" })
        assertEquals("công việc\ncông", engine.lookup("work", "en").meaning)
    }
    @Test fun offlineCommonTermIsStillUsefulButCancellationNeverBecomesResult() = runBlocking {
        val local: suspend (String, String) -> ReaderTerm? = { _, _ -> ReaderTerm("", listOf("công"), true) }
        assertEquals("local", ReaderLookupEngine({ _, _ -> null }, local, { _, _ -> error("offline") }).lookup("work", "en").source)
        val slow = ReaderLookupEngine({ _, _ -> null }, local, { _, _ -> delay(10_000); "late" })
        assertNull(withTimeoutOrNull(30) { slow.lookup("work", "en") })
    }
    @Test fun missingAndEmptyTranslationsFailInsteadOfShowingBlankMeaning() = runBlocking {
        for (translation in listOf("", "  ")) {
            try {
                ReaderLookupEngine({ _, _ -> null }, { _, _ -> null }, { _, _ -> translation }).lookup("test", "en")
                fail("empty translation must fail")
            } catch (_: IllegalStateException) {}
        }
    }
    @Test fun nativePackIndexPreservesAliasesReadingsAndMultiplePacks() {
        var loads = 0
        val terms = ReaderTerms {
            loads++
            listOf(
                JSONObject("""{"m":[["電圧","でんあつ",["điện áp"],0,["電圧値"]],["work","",["công"],1,[]]]}"""),
                JSONObject("""{"sau":true,"m":[["電圧","",["điện thế"],0,[]],["care","",["chăm sóc y tế"],0,[]]]}"""),
            )
        }
        assertEquals(listOf("điện áp", "điện thế"), terms.find("「電圧」", "ja")?.meanings)
        assertEquals("でんあつ", terms.find("電圧が", "ja")?.reading)
        assertEquals(false, terms.find("でんあつ", "ja")?.common)
        assertEquals("điện áp", terms.find("電圧値", "ja")?.meanings?.first())
        assertEquals(true, terms.find("care", "ja")?.common)
        repeat(100) { terms.find("電圧", "ja") }
        assertEquals(1, loads)
    }
    @Test fun englishVariantsDoNotCrossLanguagesOrLosePackPriority() {
        val terms = ReaderTerms { lang -> if (lang == "en") listOf(JSONObject(
            """{"m":[["power supply","",["nguồn điện"],0,[]],["supply","",["nguồn cấp"],0,[]],["work","",["công"],1,[]]]}"""
        )) else emptyList() }
        assertEquals("nguồn điện", terms.find("Power-supply", "en")?.meanings?.first())
        assertEquals("nguồn cấp", terms.find("the supplies", "en")?.meanings?.first())
        assertEquals(true, terms.find("works", "en")?.common)
        assertNull(terms.find("power supply", "ja"))
    }
    @Test fun largeNotebookHasNoRepeatedFullParse() {
        val data = JSONObject()
        repeat(10000) { n -> data.put("javi:語$n", JSONObject().put("means", org.json.JSONArray().put("nghĩa $n"))) }
        val raw = data.toString()
        val cache = ReaderNotebook { raw }
        cache.find("語9999", "ja")
        val start = System.nanoTime()
        repeat(2000) { assertEquals("nghĩa 9999", cache.find("語9999", "ja")?.meaning) }
        val ms = (System.nanoTime() - start) / 1_000_000
        println("READER_BENCH 10000 entries, 2000 warm lookups: " + ms + "ms, parses=" + cache.parses)
        assertEquals(1, cache.parses)
        assertTrue("Warm lookup must not repeatedly parse the whole notebook: " + ms + "ms", ms < 2000)
        assertEquals(raw, data.toString())
    }
}
