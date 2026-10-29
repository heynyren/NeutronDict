package com.neutrondict.app.media

import android.app.Application
import com.kienhoang.dualsubreplay.data.JapaneseDictionaryStore
import com.kienhoang.dualsubreplay.data.JapaneseMorphology
import com.kienhoang.dualsubreplay.data.LearnerData
import java.io.File

/** Every entry point has learner data, even before the user first opens YouTube. */
class NeutronApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Register sources only. Heavy parsing/download remains lazy, on background threads.
        LearnerData.useAssets(assets)
        JapaneseMorphology.useStore(JapaneseDictionaryStore(File(filesDir, "japanese-dictionary")))
    }
}
