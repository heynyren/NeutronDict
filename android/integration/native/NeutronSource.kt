package com.kienhoang.dualsubreplay.ui

/** Keep the saved cue position instead of silently returning to the video's beginning. */
internal fun neutronSourceWatchUrl(canonical: String, source: String): String {
    val value = Regex("[?&#](?:t|start)=([0-9]+)(?:s)?(?:[&#]|$)").find(source)
        ?.groupValues?.get(1)?.toLongOrNull() ?: return canonical
    if (value > 604800) return canonical
    return canonical + "&t=" + value
}

/** Select actual source text, never ask the model to invent the saved example. */
internal fun neutronSourceSentence(context: String, word: String, language: String): String {
    if (word.isBlank()) return ""
    for (paragraph in context.lineSequence()) {
        if (!paragraph.contains(word) || paragraph.trim().startsWith("https://")) continue
        val iterator=java.text.BreakIterator.getSentenceInstance(java.util.Locale.forLanguageTag(language))
        iterator.setText(paragraph)
        var start=iterator.first()
        var end=iterator.next()
        while(end!=java.text.BreakIterator.DONE) {
            val sentence=paragraph.substring(start,end).trim()
            if(sentence.contains(word) && sentence.length>word.length && sentence.length<=4000) return sentence
            start=end;end=iterator.next()
        }
    }
    return ""
}
internal fun neutronSourceUrl(context: String): String =
    context.lineSequence().map { it.trim() }.firstOrNull {
        it.startsWith("https://") && runCatching {
            val url=java.net.URI(it);url.host!=null && url.userInfo==null
        }.getOrDefault(false)
    }.orEmpty()
