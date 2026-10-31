package com.kienhoang.dualsubreplay.data
internal fun sameNeutronCaptionChunk(a: SubtitleWord, b: SubtitleWord): Boolean =
    a.highlightStartMs >= 0 && a.highlightEndMs > a.highlightStartMs &&
        a.highlightStartMs == b.highlightStartMs && a.highlightEndMs == b.highlightEndMs
