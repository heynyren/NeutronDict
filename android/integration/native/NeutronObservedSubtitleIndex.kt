package com.kienhoang.dualsubreplay.ui
import com.kienhoang.dualsubreplay.data.SubtitleSegment
/** Binary search matches extension timCau: keep the last started row during gaps. */
internal fun neutronObservedSubtitleIndex(rows: List<SubtitleSegment>, timeMs: Long): Int {
    var low = 0
    var high = rows.lastIndex
    var found = -1
    while (low <= high) {
        val mid = (low + high) ushr 1
        if (rows[mid].startMs <= timeMs) { found = mid; low = mid + 1 }
        else high = mid - 1
    }
    return found
}
