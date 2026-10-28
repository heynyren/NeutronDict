package com.kienhoang.dualsubreplay.ui

/** Keep the saved cue position instead of silently returning to the video's beginning. */
internal fun neutronSourceWatchUrl(canonical: String, source: String): String {
    val value = Regex("[?&#](?:t|start)=([0-9]+)(?:s)?(?:[&#]|$)").find(source)
        ?.groupValues?.get(1)?.toLongOrNull() ?: return canonical
    if (value > 604800) return canonical
    return canonical + "&t=" + value
}
