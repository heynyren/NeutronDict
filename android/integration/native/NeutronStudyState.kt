package com.kienhoang.dualsubreplay.ui

/** Pure validation and deadlines for a single bounded notebook replay. */
internal data class NeutronStudyRange(
    val videoId: String,
    val start: Double,
    val end: Double,
    val rate: Double,
)

internal fun neutronStudyRange(url: String, start: Double, end: Double, rate: Double): NeutronStudyRange? {
    val uri = runCatching { java.net.URI(url) }.getOrNull() ?: return null
    val host = uri.host?.lowercase()?.removeSuffix(".") ?: return null
    if (uri.scheme != "https" || uri.rawUserInfo != null || uri.port !in setOf(-1, 443) || !(host == "youtu.be" || host == "youtube.com" || host.endsWith(".youtube.com"))) return null
    val id = browseVideoSelection(url)?.videoId ?: return null
    if (!start.isFinite() || !end.isFinite() || !rate.isFinite() ||
        start < 0 || end <= start || end > 604800 || end - start > 180 || rate !in 1.0..1.5) return null
    return NeutronStudyRange(id, start, end, rate)
}

internal class NeutronStudyClock(private val range: NeutronStudyRange, createdAt: Long) {
    private var deadline = createdAt + 30_000L
    private var seenExpectedPage = false
    private var started = false

    fun check(now: Long): String? = if (now >= deadline) "unavailable" else null

    fun page(now: Long, expected: Boolean, hasAddress: Boolean): String? {
        check(now)?.let { return it }
        if (expected) seenExpectedPage = true
        else if (seenExpectedPage && hasAddress) return "cancelled"
        return null
    }

    fun status(now: Long, status: String): String? {
        check(now)?.let { return it }
        when (status) {
            "completed" -> return "completed"
            "cancelled" -> return "cancelled"
            "unavailable" -> return "unavailable"
            "playing" -> if (!started) {
                started = true
                deadline = now + ((range.end - range.start) / range.rate * 1000).toLong() + 30_000L
            }
        }
        return null
    }
}

/** Reuse the original migration rules; never skip setup on a fresh installation. */
internal fun neutronStudySetupReady(onboarding: Boolean, guideExists: Boolean, guideValue: Boolean,
                                    goalExists: Boolean, goalValue: Boolean): Boolean {
    val guide = initialGuideCompleted(guideExists, guideValue, onboarding)
    val goal = com.kienhoang.dualsubreplay.data.initialDailyGoalPromptCompleted(goalExists, goalValue, guide)
    return onboarding && guide && goal
}
