package com.kienhoang.dualsubreplay.ui

import com.kienhoang.dualsubreplay.data.*
import org.junit.Assert.*
import org.junit.Test

class NeutronQuickSaveTest {
    private val row = SubtitleSegment(1, 2000, 3000, "肌のケアをする。", "chăm sóc da",
        sentence = SentenceSlice("クリームを塗って肌のケアをする。", listOf(7), 1, 1000, 4000))
    private val tap = WordTap(AnalyzedToken("ケア", 2, 4, PartOfSpeech.NOUN), row, false)
    private val state = DualSubUiState(resolvedSourceLanguage = "ja", targetLanguage = "vi", activeVideoId = "dQw4w9WgXcQ")
    @Test fun quickSaveKeepsFullSentenceAndItsPlaybackBounds() {
        val saved = savedWordFrom(neutronQuickSelection(tap, state), "chăm sóc", true)
        assertEquals("クリームを塗って肌のケアをする。", saved.sentence)
        assertEquals("dQw4w9WgXcQ", saved.videoId)
        assertEquals(1000L, saved.startMs)
        assertEquals(4000L, saved.endMs)
        assertTrue(saved.online)
        assertEquals("ja", saved.wordLanguage)
        assertEquals("vi", saved.meaningLanguage)
    }
    @Test fun translatedCaptionReversesDirectionAndRetainsSelectedParts() {
        val translated = tap.copy(translated = true)
        val selected = neutronQuickSelection(translated, state)
        assertEquals("vi", selected.wordLanguage)
        assertEquals("ja", selected.meaningLanguage)
        assertEquals(translated.parts, selected.parts)
        assertEquals(row, selected.segment)
    }
    @Test fun liveFallbackNeverInventsAReplayableVideoClip() {
        val selected = neutronQuickSelection(tap, state.copy(liveFallback = true))
        assertNull(selected.videoId)
        assertNull(selected.segment)
        assertFalse(savedWordFrom(selected, "chăm sóc", true).online)
    }
    @Test fun sameWordInAnotherSentenceGetsItsOwnSaveIdentity() {
        val first = savedWordFrom(neutronQuickSelection(tap, state), "", true)
        val second = savedWordFrom(neutronQuickSelection(tap.copy(segment = row.copy(
            startMs = 9000, endMs = 10000, sentence = null)), state), "", true)
        assertNotEquals(first.id, second.id)
    }
}
