package com.kienhoang.dualsubreplay.ui

import com.kienhoang.dualsubreplay.data.*
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files

class NeutronCaptionTimingTest {
    @Test fun fullSentenceBoundsSurviveDiskPagingAndSavingAnyRow() = runBlocking {
        val text = "I learn new words every day, because I want to understand what people say."
        val rows = captionDisplaySegments(
            listOf(SubtitleSegment(0, 10_000, 18_000, text)),
            CaptionFormat.SHORT_PHRASES, true)
        assertTrue(rows.size > 1)
        val directory = Files.createTempDirectory("neutron-sentence").toFile()
        try {
            SubtitleStore.create(directory, rows).use { store ->
                val restored = store.read(0 until store.size)
                assertEquals(rows, restored)
                val saved = restored.map { row ->
                    savedWordFrom(LearningWordSelection(
                        AnalyzedToken("learn", 0, 5, PartOfSpeech.VERB), "en", "vi",
                        "dQw4w9WgXcQ", row, false), "học", true)
                }
                saved.forEach {
                    assertEquals(text, it.sentence)
                    assertEquals(10_000L, it.startMs)
                    assertEquals(18_000L, it.endMs)
                    assertTrue(it.online)
                }
                assertEquals(1, saved.map { it.id }.distinct().size)
            }
        } finally { directory.deleteRecursively() }
    }

    @Test fun repeatedWordsCannotMoveCaptionsToAFarFutureRow() {
        val rows = listOf(
            SubtitleSegment(0, 0, 6_000, "look here"),
            SubtitleSegment(1, 20_000, 26_000, "look here again"))
        val resolver = CaptionHighlightResolver()
        assertEquals(CaptionHighlightPosition(0, 0),
            resolver.resolve(true, true, 0, 0, KaraokePosition(1, 0), 2_000, rows))
    }

    @Test fun heldFutureRowRecoversWhenCurrentBoundsBecomeAvailable() {
        val rows = listOf(
            SubtitleSegment(0, 0, 6_000, "now"),
            SubtitleSegment(1, 20_000, 26_000, "later"))
        val resolver = CaptionHighlightResolver()
        resolver.resolve(true, true, 0, 0, KaraokePosition(1, 0), 1_000)
        assertEquals(CaptionHighlightPosition(0, 1),
            resolver.resolve(true, true, 0, 1, null, 2_000, rows))
    }

    @Test fun nearbyRowTransitionStillUsesOriginalKaraokeBehavior() {
        val rows = listOf(
            SubtitleSegment(0, 0, 3_000, "first"),
            SubtitleSegment(1, 3_000, 6_000, "second"))
        val resolver = CaptionHighlightResolver()
        assertEquals(CaptionHighlightPosition(1, 0),
            resolver.resolve(true, true, 0, 0, KaraokePosition(1, 0), 2_800, rows))
        assertEquals(CaptionHighlightPosition(1, 0),
            resolver.resolve(true, true, 0, 0, null, 2_900, rows))
    }

    @Test fun futureLiveSnapshotAfterSeekingBackIsRejected() {
        val tracker = LiveCaptionTracker()
        val row = SubtitleSegment(0, 0, 30_000, "look here",
            words = listOf(SubtitleWord("look", 0, 10_000), SubtitleWord("here", 10_000, 30_000)))
        assertNull(tracker.resolve(LiveCaptionSample("look", 1, 20_000, true), listOf(row), 0, 1_000))
        assertNull(tracker.resolve(LiveCaptionSample("look here", 2, 20_100, true), listOf(row), 0, 1_100))
    }
}
