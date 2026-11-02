package com.kienhoang.dualsubreplay.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.kienhoang.dualsubreplay.R
import com.kienhoang.dualsubreplay.data.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

/** Same language direction and trusted source rules as the detailed word card. */
internal fun neutronQuickSelection(tap: WordTap, state: DualSubUiState): LearningWordSelection =
    learningSelection(
        if (state.liveFallback) tap.copy(segment = null) else tap,
        learningSourceLanguage(state.resolvedSourceLanguage, state.sourcePreference),
        state.targetLanguage,
        state.activeVideoId.takeUnless { state.liveFallback },
    )

/** One lookup supplies the displayed and saved meaning. The caller keys this by source. */
@Composable
internal fun NeutronQuickMeaning(
    translate: suspend () -> String,
    onSave: (suspend (String) -> Unit)?,
    alreadySaved: Boolean = false,
) {
    var meaning by remember { mutableStateOf<String?>(null) }
    var lookupFailed by remember { mutableStateOf(false) }
    var attempt by remember { mutableIntStateOf(0) }
    var saving by remember { mutableStateOf(false) }
    var saved by remember { mutableStateOf(false) }
    var saveFailed by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(attempt) {
        lookupFailed = false
        try {
            meaning = translate().trim().takeIf { it.isNotEmpty() }
            lookupFailed = meaning == null
        } catch (cancel: CancellationException) {
            throw cancel
        } catch (_: Exception) {
            lookupFailed = true
        }
    }
    Text(
        meaning ?: stringResource(if (lookupFailed) R.string.practice_translation_unavailable else R.string.practice_translating),
        style = MaterialTheme.typography.titleMedium,
        color = if (meaning == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
        modifier = Modifier.padding(start = 12.dp, end = 12.dp, bottom = 6.dp).testTag("phrase_quick_translation"),
    )
    if (lookupFailed) {
        TextButton(onClick = { attempt++ }, modifier = Modifier.testTag("phrase_retry_lookup")) {
            Text(stringResource(R.string.rakulang_retry_lookup))
        }
    }
    if (onSave != null) {
        val done = saved || alreadySaved
        FilledTonalButton(
            onClick = {
                val value = meaning
                if (value != null && !saving && !done) {
                    saving = true
                    saveFailed = false
                    scope.launch {
                        try {
                            onSave(value)
                            saved = true
                        } catch (cancel: CancellationException) {
                            throw cancel
                        } catch (_: Exception) {
                            saveFailed = true
                        } finally {
                            saving = false
                        }
                    }
                }
            },
            enabled = meaning != null && !saving && !done,
            modifier = Modifier.padding(start = 6.dp, end = 6.dp, bottom = 6.dp).fillMaxWidth().testTag("phrase_save_word"),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
        ) {
            if (saving) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
            else Icon(if (done) Icons.Default.Check else Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
            Text(stringResource(when {
                done -> R.string.rakulang_quick_saved
                saving -> R.string.rakulang_quick_saving
                else -> R.string.rakulang_quick_save
            }))
        }
        if (saveFailed) Text(
            stringResource(R.string.rakulang_quick_save_error),
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp).testTag("phrase_save_error"),
        )
    }
}
