package com.neutrondict.app.media

import android.content.Context

/** One allowlisted native preference drives YouTube and reader controls too. */
object NeutronPastelTheme {
    private val keys=setOf("blue","mint","rose","peach","lavender","butter")
    @JvmStatic fun read(context:Context):String =
        context.getSharedPreferences("dual_sub_preferences",0)
            .getString("app_theme_accent","pastel_blue").orEmpty()
            .removePrefix("pastel_").takeIf { it in keys } ?: "blue"

    @JvmStatic fun write(context:Context,key:String):String {
        require(key in keys)
        check(context.getSharedPreferences("dual_sub_preferences",0).edit()
            .putString("app_theme_accent","pastel_"+key).commit())
        return key
    }
}
