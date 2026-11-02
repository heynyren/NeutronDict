package com.kienhoang.dualsubreplay.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
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
                        quickTranslate={ready.await()},onTranslate={details=true},onPronounce={},onClose={visible=false},
                        onSave={saved=it})
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

    private fun quickSave(light: Boolean) {
        studyPreferences(InstrumentationRegistry.getInstrumentation().targetContext).edit()
            .putString(APP_COLOR_THEME_PREFERENCE, if (light) "light" else "deep_teal").commit()
        val ready = CompletableDeferred<String>()
        val disk = CompletableDeferred<Unit>()
        var translations = 0
        var writes = 0
        var savedMeaning: String? = null
        var source by mutableIntStateOf(1)
        compose.setContent { DualSubTheme {
            Box(Modifier.fillMaxSize()) {
                PhraseActionBar(Rect(40f,320f,260f,360f), "care", false, null, null,
                    quickTranslate = { translations++; ready.await() }, onTranslate = {}, onPronounce = {}, onClose = {},
                    onSave = { writes++; savedMeaning = it; disk.await() }, saveKey = source)
            }
        } }
        compose.onNodeWithTag("phrase_save_word").assertIsDisplayed().assertIsNotEnabled()
        compose.runOnIdle { ready.complete("chăm sóc") }
        compose.waitForIdle()
        compose.onNodeWithTag("phrase_save_word").assertIsEnabled()
        saveUiEvidence("reader-save-" + if (light) "light" else "dark")
        compose.onNodeWithTag("phrase_save_word").performClick()
        compose.onNodeWithTag("phrase_save_word").assertIsNotEnabled().performClick()
        compose.runOnIdle {
            assertEquals(1, writes)
            assertEquals(1, translations)
            assertEquals("chăm sóc", savedMeaning)
            disk.complete(Unit)
        }
        compose.waitForIdle()
        compose.onNodeWithTag("phrase_save_word").assertIsNotEnabled()
        compose.onNodeWithTag("word_learning_dialog").assertDoesNotExist()
        // Another occurrence of the same word must not inherit the first source's Saved state.
        compose.runOnIdle { source = 2 }
        compose.waitForIdle()
        compose.onNodeWithTag("phrase_save_word").assertIsEnabled()
        compose.runOnIdle { assertEquals(2, translations) }
    }
    @Test fun firstPopupSavesWithoutDetailsAndPreventsDoubleSaveLight() = quickSave(true)
    @Test fun firstPopupSavesWithoutDetailsAndPreventsDoubleSaveDark() = quickSave(false)

    @Test fun failedLookupAndSaveCanRetryWithoutSavingErrorText() {
        var attempts = 0
        var saves = 0
        compose.setContent { DualSubTheme {
            PhraseActionBar(Rect(40f,320f,260f,360f), "care", false, null, null,
                quickTranslate = { if (++attempts == 1) error("offline"); "chăm sóc" },
                onTranslate = {}, onPronounce = {}, onClose = {},
                onSave = { assertEquals("chăm sóc", it); if (++saves == 1) error("disk") })
        } }
        compose.onNodeWithTag("phrase_save_word").assertIsNotEnabled()
        compose.onNodeWithTag("phrase_retry_lookup").performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("phrase_save_word").assertIsEnabled().performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("phrase_save_error").assertIsDisplayed()
        compose.onNodeWithTag("phrase_save_word").performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("phrase_save_word").assertIsNotEnabled()
        compose.runOnIdle { assertEquals(2, attempts); assertEquals(2, saves) }
    }

    @Test fun captionSelectionSavesExactTapWithoutOpeningDetailedCard() {
        val row = SubtitleSegment(7, 94000, 97000, "care")
        val controller = PhraseSelectionController()
        var savedTap: WordTap? = null
        var savedMeaning: String? = null
        var details = 0
        controller.actions = PhraseActions(translate = { _, _ -> "chăm sóc" },
            save = { tap, meaning -> savedTap = tap; savedMeaning = meaning })
        compose.setContent { DualSubTheme {
            CompositionLocalProvider(LocalPhraseSelection provides controller) {
                Box(Modifier.fillMaxSize().padding(top = 160.dp, start = 24.dp)) {
                    SelectableSubtitleText("care", AnnotatedString("care"), MaterialTheme.typography.titleLarge,
                        "en", row, false, MaterialTheme.colorScheme.primary,
                        onWordClick = { details++ }, onBlankTap = {}, modifier = Modifier.testTag("caption_save_fixture"))
                }
            }
        } }
        val caption = compose.onNodeWithText("care", useUnmergedTree = true)
        val layouts = mutableListOf<TextLayoutResult>()
        caption.performSemanticsAction(SemanticsActions.GetTextLayoutResult) { it(layouts) }
        caption.performTouchInput { click(layouts.single().getBoundingBox(1).center) }
        compose.onNodeWithTag("phrase_save_word").assertIsDisplayed().performClick()
        compose.waitForIdle()
        compose.runOnIdle {
            assertEquals("care", savedTap?.token?.text)
            assertEquals(row, savedTap?.segment)
            assertEquals(false, savedTap?.translated)
            assertEquals("chăm sóc", savedMeaning)
            assertEquals(0, details)
        }
        saveUiEvidence("caption-quick-save")
    }

    @Test fun existingSavedEntryCannotBeOverwrittenByQuickSave() {
        var writes = 0
        compose.setContent { DualSubTheme {
            PhraseActionBar(Rect(40f,320f,260f,360f), "care", false, null, null,
                quickTranslate = { "different translation" }, onTranslate = {}, onPronounce = {}, onClose = {},
                onSave = { writes++ }, alreadySaved = true)
        } }
        compose.onNodeWithTag("phrase_save_word").assertIsNotEnabled().performClick()
        compose.runOnIdle { assertEquals(0, writes) }
    }
}
