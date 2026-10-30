package com.kienhoang.dualsubreplay.ui

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.Looper

/** Apply the notebook's UI language through DualSub's existing locale mechanism. */
object NeutronInterface {
    @JvmStatic fun wrap(context:Context):Context = AppLanguageSettings.wrap(context)
    @JvmStatic fun selected(context:Context):String =
        AppLanguageSettings.selected(context)?.tag
            ?: context.resources.configuration.locales[0].language
    @JvmStatic fun explicit(context:Context):Boolean = AppLanguageSettings.selected(context)!=null
    @JvmStatic fun select(activity:Activity,tag:String) {
        require(tag in listOf("vi","en","ja"))
        if (selected(activity)==tag && explicit(activity)) return
        // Resolve the Capacitor call before Android recreates its host for the new locale.
        Handler(Looper.getMainLooper()).postDelayed({
            if (!activity.isDestroyed) AppLanguageSettings.select(activity,appLanguageOptionFor(tag))
        },200L)
    }
}
