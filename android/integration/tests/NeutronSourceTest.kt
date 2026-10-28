package com.kienhoang.dualsubreplay.ui
import org.junit.Assert.assertEquals
import org.junit.Test
import com.kienhoang.dualsubreplay.data.*
class NeutronSourceTest {
    @Test fun fullSentenceNeverGetsPartialRowTranslation() {
        val segment=SubtitleSegment(1,2000,3000,"肌のケアをする。","chăm sóc da",sentence=SentenceSlice("クリームを塗って肌のケアをする。",listOf(7),1))
        val selection=LearningWordSelection(AnalyzedToken("ケア",2,4,PartOfSpeech.NOUN),"ja","vi","dQw4w9WgXcQ",segment,false)
        val saved=savedWordFrom(selection,"chăm sóc",true)
        assertEquals("クリームを塗って肌のケアをする。",saved.sentence)
        assertEquals(null,saved.translatedSentence)
        assertEquals(2000L,saved.startMs)
        assertEquals("chăm sóc da",savedWordFrom(selection.copy(segment=segment.copy(sentence=null)),"chăm sóc",true).translatedSentence)
    }
    @Test fun savesActualSentenceForAiWords() {
        val context="Bài báo\nhttps://example.org/article\n古い文です。クリームを塗って肌のケアをする。次の文です。"
        assertEquals("クリームを塗って肌のケアをする。",neutronSourceSentence(context,"ケア","ja"))
        assertEquals("https://example.org/article",neutronSourceUrl(context))
        assertEquals("",neutronSourceSentence(context,"不在","ja"))
    }
    @Test fun preservesNotebookPosition() {
        val canonical="https://m.youtube.com/watch?v=dQw4w9WgXcQ"
        assertEquals(canonical+"&t=94",neutronSourceWatchUrl(canonical,canonical+"&t=94"))
        assertEquals(canonical+"&t=94",neutronSourceWatchUrl(canonical,canonical+"&t=94s"))
        assertEquals(canonical,neutronSourceWatchUrl(canonical,canonical))
        assertEquals(canonical,neutronSourceWatchUrl(canonical,canonical+"&t=-5"))
        assertEquals(canonical,neutronSourceWatchUrl(canonical,canonical+"&t=94evil"))
    }
}
