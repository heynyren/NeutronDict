package com.kienhoang.dualsubreplay.ui

import android.view.View
import android.webkit.WebView

/** Native polling still runs when Chromium throttles background page timers. */
object NeutronAdResume {
    private var source:String?=null
    fun apply(webView:WebView,backgroundAllowed:Boolean) {
        val script=source ?: runCatching {
            webView.context.assets.open("neutron/youtube-ad-resume.js").bufferedReader().use { it.readText() }
        }.getOrNull()?.also { source=it } ?: return
        webView.evaluateJavascript(script+"\nwindow.__rakuAdResume && window.__rakuAdResume.tick("+backgroundAllowed+");") { result ->
            if(backgroundAllowed && result=="\"recovering\"") {
                webView.onResume()
                webView.dispatchWindowVisibilityChanged(View.VISIBLE)
            }
        }
    }
}
