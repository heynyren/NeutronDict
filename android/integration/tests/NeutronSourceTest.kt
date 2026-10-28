package com.kienhoang.dualsubreplay.ui
import org.junit.Assert.assertEquals
import org.junit.Test
class NeutronSourceTest {
    @Test fun preservesNotebookPosition() {
        val canonical="https://m.youtube.com/watch?v=dQw4w9WgXcQ"
        assertEquals(canonical+"&t=94",neutronSourceWatchUrl(canonical,canonical+"&t=94"))
        assertEquals(canonical+"&t=94",neutronSourceWatchUrl(canonical,canonical+"&t=94s"))
        assertEquals(canonical,neutronSourceWatchUrl(canonical,canonical))
        assertEquals(canonical,neutronSourceWatchUrl(canonical,canonical+"&t=-5"))
        assertEquals(canonical,neutronSourceWatchUrl(canonical,canonical+"&t=94evil"))
    }
}
