package com.kienhoang.dualsubreplay.ui
import org.junit.Assert.assertEquals
import org.junit.Test
class NeutronSourceTest {
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
