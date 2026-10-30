package com.kienhoang.dualsubreplay.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextDecoration
import com.kienhoang.dualsubreplay.data.*
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files

class NeutronCaptionChunkTest {
    private fun parsed() = CaptionDocumentParser.parse(
        """{"events":[{"tStartMs":1000,"dDurationMs":4000,"segs":[
        {"utf8":"we really learn ","tOffsetMs":0},{"utf8":"every day","tOffsetMs":2000}]}]}"""
    ).single()

    @Test fun realJsonChunksDoNotPretendToHaveWordAccurateUnderlines() {
        val cue = parsed()
        assertEquals(listOf("we","really","learn","every","day"), cue.words.map { it.text })
        for (time in listOf(1000L,1500L,2999L)) {
            val index = activeWordIndex(cue.words,time)
            val spans = neutronHighlightSpans(cue.text,cue.words)
            assertEquals("we really learn",cue.text.substring(spans[index].start,spans[index].end))
        }
        val atNext=neutronHighlightSpans(cue.text,cue.words)[activeWordIndex(cue.words,3000)]
        assertEquals("every day",cue.text.substring(atNext.start,atNext.end))
    }

    @Test fun unknownWordTimesUseWholeCueRatherThanAFakeWordCursor() {
        val words=estimateWordTimings("one very useful example",1000,5000)
        val spans=neutronHighlightSpans("one very useful example",words)
        assertTrue(spans.all { it.start==0 && it.end=="one very useful example".length })
        assertEquals(-1,activeWordIndex(words,999))
    }

    @Test fun chunkBoundsSurvivePagingAndRecentTrackCache() = runBlocking {
        val cue=parsed()
        val directory=Files.createTempDirectory("neutron-chunks").toFile()
        try {
            val row=SubtitleSegment(0,cue.startMs,cue.endMs,cue.text,words=cue.words)
            SubtitleStore.create(directory,listOf(row)).use { store ->
                assertEquals(cue.words,store.read(0..0).single().words)
            }
            val track=CaptionTrackResult("en",true,listOf(cue))
            var fetches=0
            val provider=object:CaptionProvider {
                override suspend fun fetch(videoId:String,preferredLanguages:List<String>,learningLanguage:String?,preferredTrack:String?):CaptionTrackResult {
                    fetches++;return track
                }
            }
            val cache=java.io.File(directory,"cache")
            RecentCaptionTracks(provider,cache).fetch("abcdefghijk",listOf("en"))
            val restored=RecentCaptionTracks(provider,cache).fetch("abcdefghijk",listOf("en"))
            assertEquals(1,fetches)
            assertEquals(cue.words,restored.cues.single().words)
        } finally { directory.deleteRecursively() }
    }

    @Test fun repeatedWordsAndJapaneseRangesStayInsideTheirOwnRow() {
        val words=listOf(
            SubtitleWord("日本",1000,1400,1000,2000),SubtitleWord("語",1400,1600,1000,2000),
            SubtitleWord("です",1600,2000,1000,2000))
        assertTrue(neutronHighlightSpans("日本語です",words).all { it.start==0 && it.end==5 })
        val repeated=listOf(SubtitleWord("yes",0,500,0,1000),SubtitleWord("yes",500,1000,0,1000),
            SubtitleWord("yes",1000,1500,1000,1500))
        val spans=neutronHighlightSpans("yes yes yes",repeated)
        assertEquals(0,spans[1].start);assertEquals(7,spans[1].end)
        assertEquals(8,spans[2].start)
        val clipped=neutronHighlightSpans("learn",parsed().words.filter { it.text=="learn" })
        assertEquals(SubtitleWordSpan(0,0,5),clipped.single())
    }

    @Test fun underlineKeepsPlainTextAndExistingPosColors() {
        val cue=parsed()
        val result=annotatedSubtitleText(cue.text,cue.words,1,Color.White,Color.Yellow)
        assertEquals(cue.text,result.text)
        val underline=result.spanStyles.single { it.item.textDecoration==TextDecoration.Underline }
        assertEquals(0,underline.start);assertEquals("we really learn".length,underline.end)
        assertNull(underline.item.fontWeight)
    }
}
