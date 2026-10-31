package com.kienhoang.dualsubreplay.ui
import com.kienhoang.dualsubreplay.data.*
import org.junit.Assert.*
import org.junit.Test

class NeutronObservedPlaybackTest {
    private fun sample(second: Float = 10f, epoch: Long = 1000, session: String = "a") =
        WebPlaybackSnapshot("https://m.youtube.com/watch?v=dQw4w9WgXcQ", second, sampledAtEpochMs = epoch, sessionId = session)
    @Test fun neverPredictsAnUnheardWordAtAnyRate() {
        for (rate in listOf(0.5, 1.0, 1.5, 2.0, 4.0)) {
            val clock = NeutronObservedPlaybackClock()
            assertTrue(clock.accept(sample().copy(playbackRate = rate), 100, 180, 1080))
            assertEquals(10000L, clock.position(200))
            assertEquals(10000L, clock.position(349))
            assertNull(clock.position(351))
        }
    }
    @Test fun stallPauseAndSmallBackwardSeekFollowObservedTime() {
        val clock = NeutronObservedPlaybackClock()
        clock.accept(sample(), 100, 100, 1000)
        assertEquals(10000L, clock.position(199))
        for (stopped in listOf(sample(9.95f, 1100), sample(9.9f, 1200).copy(paused = true), sample(9.8f, 1300).copy(buffering = true))) {
            val at = stopped.sampledAtEpochMs - 900
            assertTrue(clock.accept(stopped, at, at, stopped.sampledAtEpochMs))
            assertEquals((stopped.currentSecond!! * 1000).toLong(), clock.position(at + 100))
        }
    }
    @Test fun delayedAndRetiredCallbacksCannotMoveNewVideo() {
        val clock = NeutronObservedPlaybackClock()
        assertFalse(clock.accept(sample(), 100, 800, 1700))
        assertTrue(clock.accept(sample(), 100, 110, 1010))
        assertTrue(clock.accept(sample(2f, 1100, "b"), 200, 210, 1110))
        assertFalse(clock.accept(sample(11f, 1050), 200, 220, 1120))
        assertFalse(clock.accept(sample(12f, 1200), 300, 310, 1210))
        assertEquals(2000L, clock.position(240))
    }
    @Test fun adClockIsExcludedAndContentCanResumeAtEarlierTime() {
        val clock = NeutronObservedPlaybackClock()
        clock.accept(sample(90f), 100, 100, 1000)
        assertFalse(clock.accept(sample(3f, 1100).copy(currentSecond = null), 200, 200, 1100))
        assertEquals(90000L, clock.position(250))
        assertNull(clock.position(351))
        assertTrue(clock.accept(sample(89.9f, 2000, "content"), 1100, 1100, 2000))
        assertEquals((89.9f * 1000).toLong(), clock.position(1100))
    }
    @Test fun futureLiveTextNeverChangesTimedRowEvenDuringGap() {
        val rows = listOf(SubtitleSegment(0, 1000, 2000, "same"), SubtitleSegment(1, 4000, 5000, "same"))
        val resolver = CaptionHighlightResolver()
        for (time in listOf(0L, 1000L, 2500L, 3999L, 4000L, 1500L)) {
            val expected = neutronObservedSubtitleIndex(rows, time)
            val result = resolver.resolve(true, true, expected, -1, KaraokePosition(1, 0), time, rows)
            assertEquals(expected, result?.segmentIndex ?: -1)
        }
    }
    @Test fun layoutCannotSplitOneSourceChunkIntoFictitiousTimedRows() {
        val text = "This long sentence has many different words and punctuation, but the source only timestamps this entire chunk."
        val words = estimateWordTimings(text, 1000, 10000)
        val source = SubtitleSegment(0, 1000, 10000, text, words = words)
        val rows = SubtitleMerger.splitLongSegments(listOf(source), 24)
        assertEquals(1, rows.size)
        assertEquals(text, rows.single().originalText)
        assertEquals(1000L, rows.single().startMs)
    }
    @Test fun independentSourceChunksStillSplitAtTheirRealAnchors() {
        val a = "This is the first spoken source chunk."
        val b = "This is another source chunk with its own timestamp."
        val source = SubtitleSegment(0, 1000, 9000, "$a $b", words = estimateWordTimings(a,1000,5000) + estimateWordTimings(b,5000,9000))
        val rows = SubtitleMerger.splitLongSegments(listOf(source), 24)
        assertEquals(listOf(1000L, 5000L), rows.map { it.startMs })
        assertEquals(listOf(a,b), rows.map { it.originalText })
    }
}
