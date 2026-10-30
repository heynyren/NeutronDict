package com.kienhoang.dualsubreplay.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.background
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.test.platform.app.InstrumentationRegistry
import com.kienhoang.dualsubreplay.data.*
import com.kienhoang.dualsubreplay.ui.theme.DualSubTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class NeutronCaptionChunkUiTest {
    @get:Rule val compose=createComposeRule()
    private fun grouped(light:Boolean) {
        studyPreferences(InstrumentationRegistry.getInstrumentation().targetContext).edit()
            .putString(APP_COLOR_THEME_PREFERENCE,if(light)"light" else "deep_teal").commit()
        val cue=CaptionDocumentParser.parse(
            """{"events":[{"tStartMs":1000,"dDurationMs":4000,"segs":[{"utf8":"we really learn ","tOffsetMs":0},{"utf8":"every day","tOffsetMs":2000}]}]}"""
        ).single()
        val row=SubtitleSegment(0,1000,5000,cue.text,"Chúng tôi thực sự học mỗi ngày.",cue.words)
        var active by mutableStateOf(0)
        compose.setContent { DualSubTheme {
            Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(20.dp)) {
                CompactSubtitleCard(row,true,1f,{},activeWordIndex=active,
                    originalColor=MaterialTheme.colorScheme.onSurface,
                    highlightColor=MaterialTheme.colorScheme.primary,
                    tapToLearnEnabled=false)
            }
        } }
        compose.onNodeWithText(cue.text).assertIsDisplayed()
        fun range() = compose.onNodeWithText(cue.text).fetchSemanticsNode()
            .config[androidx.compose.ui.semantics.SemanticsProperties.Text].single().spanStyles
            .single { it.item.textDecoration==TextDecoration.Underline }
        val first=range()
        assertEquals(0,first.start);assertEquals("we really learn".length,first.end)
        compose.runOnIdle { active=2 }
        assertEquals(first.start,range().start);assertEquals(first.end,range().end)
        saveUiEvidence("caption-chunk-"+if(light)"light" else "dark")
        compose.runOnIdle { active=3 }
        val next=range()
        assertEquals("we really learn ".length,next.start);assertEquals(cue.text.length,next.end)
        compose.onNodeWithText(row.translatedText!!).assertIsDisplayed()
    }
    @Test fun darkChunkKeepsTheWholeSourcePhrase()=grouped(false)
    @Test fun lightChunkKeepsTheWholeSourcePhrase()=grouped(true)
}
