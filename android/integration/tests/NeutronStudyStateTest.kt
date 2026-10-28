package com.kienhoang.dualsubreplay.ui

import org.junit.Assert.*
import org.junit.Test

class NeutronStudyStateTest {
    private val url = "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42"
    private fun range() = neutronStudyRange(url, 42.25, 47.75, 1.5)!!

    @Test fun keepsPreciseSentenceBoundsAndTheHearingRate() {
        val r = range()
        assertEquals("dQw4w9WgXcQ", r.videoId)
        assertEquals(42.25, r.start, 0.0)
        assertEquals(47.75, r.end, 0.0)
        assertEquals(1.5, r.rate, 0.0)
        assertNotNull(neutronStudyRange(url, 0.0, 1.0, 1.0))
    }
    @Test fun rejectsMissingBoundsInvalidRatesAndUntrustedAddresses() {
        for (bad in listOf("http://m.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ", "https://user@m.youtube.com/watch?v=dQw4w9WgXcQ", "https://m.youtube.com:444/watch?v=dQw4w9WgXcQ"))
            assertNull(neutronStudyRange(bad, 1.0, 2.0, 1.0))
        for ((start,end,rate) in listOf(Triple(-1.0,2.0,1.0), Triple(2.0,2.0,1.0), Triple(0.0,181.0,1.0), Triple(604799.0,604801.0,1.0), Triple(1.0,2.0,0.8), Triple(1.0,2.0,1.6), Triple(Double.NaN,2.0,1.0), Triple(1.0,Double.POSITIVE_INFINITY,1.0)))
            assertNull(neutronStudyRange(url,start,end,rate))
    }
    @Test fun loadingOrAdsCannotHoldStudyBeyondThirtySeconds() {
        val clock=NeutronStudyClock(range(),100L)
        assertNull(clock.page(200L,false,true))
        assertNull(clock.status(20_000L,"waiting"))
        assertNull(clock.check(30_099L))
        assertEquals("unavailable",clock.check(30_100L))
    }
    @Test fun actualPlaybackGetsItsOwnBoundedTimeBudget() {
        val clock=NeutronStudyClock(range(),0L)
        assertNull(clock.page(29_000L,true,true))
        assertNull(clock.status(29_100L,"playing"))
        assertNull(clock.check(30_000L))
        assertNull(clock.status(31_000L,"playing"))
        assertEquals("unavailable",clock.check(63_000L))
    }
    @Test fun leavingTheExpectedVideoCancelsWithoutReplayingAnotherOne() {
        val clock=NeutronStudyClock(range(),0L)
        assertNull(clock.page(100L,false,true))
        assertNull(clock.page(200L,true,true))
        assertEquals("cancelled",clock.page(300L,false,true))
    }
    @Test fun onlyExplicitTerminalStatesFinishAReplay() {
        for (status in listOf("waiting","seeking","playing","ad","buffering","unknown"))
            assertNull(NeutronStudyClock(range(),0L).status(100L,status))
        for (status in listOf("completed","cancelled","unavailable"))
            assertEquals(status,NeutronStudyClock(range(),0L).status(100L,status))
    }

    @Test fun setupMustCompleteWithoutBypassingTheNewUserGuide() {
        assertFalse(neutronStudySetupReady(false,false,false,false,false))
        assertFalse(neutronStudySetupReady(true,true,false,false,false))
        assertFalse(neutronStudySetupReady(true,true,true,true,false))
        assertTrue(neutronStudySetupReady(true,true,true,true,true))
    }
    @Test fun existingUsersRetainTheOriginalSetupMigration() {
        assertTrue(neutronStudySetupReady(true,false,false,false,false))
    }
}
