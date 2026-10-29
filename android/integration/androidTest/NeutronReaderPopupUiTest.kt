package com.kienhoang.dualsubreplay.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import com.kienhoang.dualsubreplay.data.*
import com.kienhoang.dualsubreplay.ui.theme.DualSubTheme
import kotlinx.coroutines.CompletableDeferred
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class NeutronReaderPopupUiTest {
    @get:Rule val compose=createComposeRule()
    private fun twoSteps(light:Boolean) {
        studyPreferences(InstrumentationRegistry.getInstrumentation().targetContext).edit()
            .putString(APP_COLOR_THEME_PREFERENCE,if(light)"light" else "deep_teal").commit()
        val ready=CompletableDeferred<String>()
        var details by mutableStateOf(false)
        var visible by mutableStateOf(true)
        var saved:String?=null
        val selection=LearningWordSelection(AnalyzedToken("care",0,4,PartOfSpeech.NOUN),"en","vi",null,
            SubtitleSegment(0,0,0,"Take care of your skin."),false)
        compose.setContent { DualSubTheme {
            Box(Modifier.fillMaxSize()) {
                if(visible) {
                    if(!details) PhraseActionBar(Rect(40f,320f,260f,360f),"care",false,null,null,
                        quickTranslate={ready.await()},onTranslate={details=true},onPronounce={},onClose={visible=false})
                    else WordLearningDialog(selection,false,{ready.await()},{meaning,_->saved=meaning},{},null,{visible=false})
                }
            }
        } }
        compose.onNodeWithTag("phrase_action_bar").assertIsDisplayed()
        compose.onNodeWithTag("phrase_quick_translation").assertIsDisplayed()
        compose.onNodeWithTag("word_learning_dialog").assertDoesNotExist()
        saveUiEvidence("reader-quick-"+if(light)"light" else "dark")
        compose.onNodeWithTag("phrase_translate").performClick()
        compose.onNodeWithTag("phrase_action_bar").assertDoesNotExist()
        compose.onNodeWithTag("word_learning_dialog").assertIsDisplayed()
        compose.runOnIdle{ready.complete("chăm sóc")}
        compose.waitForIdle()
        compose.onNodeWithTag("word_meaning_text").assertTextEquals("chăm sóc")
        saveUiEvidence("reader-details-"+if(light)"light" else "dark")
        compose.onNodeWithTag("save_word").performScrollTo().performClick()
        compose.runOnIdle{assertEquals("chăm sóc",saved)}
    }
    @Test fun darkPopupAppearsBeforeSlowLookupAndOpensSameDetailedCard()=twoSteps(false)
    @Test fun lightPopupAppearsBeforeSlowLookupAndOpensSameDetailedCard()=twoSteps(true)
}
