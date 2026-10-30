package com.kienhoang.dualsubreplay.ui

import com.kienhoang.dualsubreplay.data.SubtitleWord

/**
 * YouTube supplies time anchors for chunks, not necessarily each lexical word.
 * Keep the underline on that complete chunk; token text/timings remain available for taps.
 * Bounds are clipped to this display row by its existing text-to-word mapping.
 */
internal fun neutronHighlightSpans(text: String, words: List<SubtitleWord>): List<SubtitleWordSpan> {
    val spans = subtitleWordSpans(text, words)
    val groups = spans.groupBy { span ->
        val word = words[span.wordIndex]
        if (word.highlightStartMs >= 0 && word.highlightEndMs > word.highlightStartMs)
            word.highlightStartMs to word.highlightEndMs
        else null
    }.mapValues { (_, group) -> group.minOf { it.start } to group.maxOf { it.end } }
    return spans.map { span ->
        val word = words[span.wordIndex]
        if (word.highlightStartMs < 0 || word.highlightEndMs <= word.highlightStartMs) span
        else {
            val group = checkNotNull(groups[word.highlightStartMs to word.highlightEndMs])
            SubtitleWordSpan(span.wordIndex, group.first, group.second)
        }
    }
}
