package com.kienhoang.dualsubreplay.ui

import android.content.Context
import android.content.Intent
import android.graphics.PointF
import android.os.SystemClock
import android.view.MotionEvent
import android.view.ViewConfiguration
import android.webkit.WebView
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.json.JSONTokener
import org.junit.Assert.*
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/** Real WebView long press + native handle drag: no injected DOM selection or fake ActionMode. */
class ReaderSelectionGestureTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private fun page(activity: NewsReaderActivity): WebView =
        NewsReaderActivity::class.java.getDeclaredField("page").apply { isAccessible = true }.get(activity) as WebView

    private fun evaluate(scenario: ActivityScenario<NewsReaderActivity>, script: String): String {
        val result = AtomicReference<String>()
        val done = CountDownLatch(1)
        scenario.onActivity { activity -> page(activity).evaluateJavascript(script) { result.set(it); done.countDown() } }
        check(done.await(10, TimeUnit.SECONDS)) { "Article JavaScript did not reply" }
        return result.get()
    }
    private fun selection(scenario: ActivityScenario<NewsReaderActivity>): String =
        JSONTokener(evaluate(scenario, "getSelection().toString().trim()")).nextValue() as? String ?: ""

    private fun popupWord(scenario: ActivityScenario<NewsReaderActivity>): String? {
        var result: String? = null
        scenario.onActivity { activity ->
            val get = NewsReaderActivity::class.java.getDeclaredMethod("getSelection").apply { isAccessible = true }
            result = (get.invoke(activity) as? JSONObject)?.optString("word")
        }
        return result
    }
    private fun awaitWord(scenario: ActivityScenario<NewsReaderActivity>, word: String) {
        val deadline = SystemClock.uptimeMillis() + 10000
        while (SystemClock.uptimeMillis() < deadline) {
            if (selection(scenario) == word && popupWord(scenario) == word) return
            SystemClock.sleep(80)
        }
        fail("Expected selected phrase and popup '$word'; DOM='" + selection(scenario) + "', popup='" + popupWord(scenario) + "'")
    }
    private fun point(scenario: ActivityScenario<NewsReaderActivity>, id: String, handle: Boolean): PointF {
        val script = "(function(){const e=document.getElementById('" + id + "');const r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect();return JSON.stringify({left:b.left,right:b.right,top:b.top,bottom:b.bottom,height:b.height,lineHeight:parseFloat(getComputedStyle(e).lineHeight),width:innerWidth})})()"
        val data = JSONObject(JSONTokener(evaluate(scenario, script)).nextValue() as String)
        var point = PointF()
        scenario.onActivity { activity ->
            val web = page(activity)
            val origin = IntArray(2).also { web.getLocationOnScreen(it) }
            val scale = web.width / data.getDouble("width").toFloat()
            val density = activity.resources.displayMetrics.density
            // Chromium's handle is attached to the line box, below the glyph box returned by Range.
            val leading = ((data.getDouble("lineHeight") - data.getDouble("height")) / 2).coerceAtLeast(0.0).toFloat() * scale
            point = if (handle) PointF(origin[0] + data.getDouble("right").toFloat() * scale + 7 * density,
                origin[1] + data.getDouble("bottom").toFloat() * scale + leading + 12 * density)
            else PointF(origin[0] + (data.getDouble("left") + data.getDouble("right")).toFloat() * scale / 2,
                origin[1] + (data.getDouble("top") + data.getDouble("bottom")).toFloat() * scale / 2)
        }
        println("READER_GESTURE point id=$id handle=$handle x=${point.x} y=${point.y} rect=$data")
        return point
    }
    private fun touch(down: Long, action: Int, point: PointF) {
        val event = MotionEvent.obtain(down, SystemClock.uptimeMillis(), action, point.x, point.y, 0)
        event.source = android.view.InputDevice.SOURCE_TOUCHSCREEN
        instrumentation.sendPointerSync(event)
        event.recycle()
    }
    private fun longPress(point: PointF) {
        val down = SystemClock.uptimeMillis()
        touch(down, MotionEvent.ACTION_DOWN, point)
        SystemClock.sleep(ViewConfiguration.getLongPressTimeout().toLong() + 250)
        touch(down, MotionEvent.ACTION_UP, point)
        instrumentation.waitForIdleSync()
    }
    private fun drag(from: PointF, to: PointF) {
        val down = SystemClock.uptimeMillis()
        touch(down, MotionEvent.ACTION_DOWN, from)
        SystemClock.sleep(80)
        for (step in 1..20) {
            touch(down, MotionEvent.ACTION_MOVE, PointF(from.x + (to.x - from.x) * step / 20f,
                from.y + (to.y - from.y) * step / 20f))
            SystemClock.sleep(30)
        }
        touch(down, MotionEvent.ACTION_UP, to)
        instrumentation.waitForIdleSync()
    }

    @Test fun popupKeepsNativeHandlesAndTracksExpandedPhrase() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val storage = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        val oldNotebook = storage.getString("notebook", null)
        storage.edit().putString("notebook", """{"envi:care":{"word":"care","means":["chăm sóc"]},"envi:care of":{"word":"care of","means":["chăm sóc cho"]}}""").commit()
        val intent = Intent(context, NewsReaderActivity::class.java)
            .putExtra("url", "https://example.org/selection-gesture").putExtra("language", "en")
        try {
            ActivityScenario.launch<NewsReaderActivity>(intent).use { scenario ->
                try {
                    scenario.onActivity { activity ->
                        page(activity).stopLoading()
                        page(activity).loadDataWithBaseURL("https://example.org/selection-gesture",
                            """<html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1">
                            <style>body{margin:24px;font:20px/2.5 sans-serif;background:white;color:#172a31}p{white-space:nowrap}</style>
                            <title>Reader selection test</title><p>We take <span id="word">care</span> <span id="tail">of</span> our skin.</p>
                            <p>Choose a word, then extend it.</p></html>""", "text/html", "UTF-8", null)
                    }
                    val ready = SystemClock.uptimeMillis() + 10000
                    while (evaluate(scenario, "!!document.getElementById('word')") != "true" && SystemClock.uptimeMillis() < ready) SystemClock.sleep(80)
                    longPress(point(scenario, "word", false))
                    awaitWord(scenario, "care")
                    // The old bug removed the range shortly after the popup appeared.
                    SystemClock.sleep(1600)
                    assertEquals("care", selection(scenario))
                    scenario.onActivity { activity ->
                        val mode = page(activity).javaClass.getDeclaredField("selectionMode").apply { isAccessible = true }.get(page(activity))
                        assertNotNull("Opening lookup must keep native selection handles alive", mode)
                    }
                    saveUiEvidence("reader-selection-word")
                    drag(point(scenario, "word", true), point(scenario, "tail", true))
                    awaitWord(scenario, "care of")
                    assertEquals("care of", selection(scenario))
                    saveUiEvidence("reader-selection-phrase")
                    // Shrinking uses the same native handle and must replace the phrase result too.
                    drag(point(scenario, "tail", true), point(scenario, "word", true))
                    awaitWord(scenario, "care")
                    // A normal outside tap ends selection and prevents stale auto-popup callbacks.
                    var outside = PointF()
                    scenario.onActivity { activity ->
                        val web = page(activity)
                        val origin = IntArray(2).also { web.getLocationOnScreen(it) }
                        outside = PointF(origin[0] + web.width / 2f, origin[1] + web.height - 80f)
                    }
                    val down = SystemClock.uptimeMillis()
                    touch(down, MotionEvent.ACTION_DOWN, outside)
                    touch(down, MotionEvent.ACTION_UP, outside)
                    SystemClock.sleep(700)
                    assertEquals("", selection(scenario))
                    assertNull("Clearing selection must close its popup", popupWord(scenario))
                } finally {
                    saveUiEvidence("reader-selection-last-state")
                }
            }
        } finally {
            storage.edit().apply { if (oldNotebook == null) remove("notebook") else putString("notebook", oldNotebook) }.commit()
        }
    }
}
