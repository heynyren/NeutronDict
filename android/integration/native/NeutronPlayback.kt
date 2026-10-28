package com.kienhoang.dualsubreplay.ui

import android.os.SystemClock
import android.webkit.WebView

/** One audible playback request per explicit notebook source tap. Never fights a later mute. */
object NeutronPlayback {
    private var videoId: String? = null
    private var expires = 0L
    private var generation = 0
    private var inFlight = false
    @JvmStatic fun request(url: String) {
        videoId = browseVideoSelection(url)?.videoId
        expires = SystemClock.elapsedRealtime() + 30000
        generation++
        inFlight = false
    }
    @JvmStatic fun apply(view: WebView) {
        val id = videoId ?: return
        if (SystemClock.elapsedRealtime() > expires) { videoId = null; return }
        if (inFlight || !isYouTubeWebUrl(view.url.orEmpty()) || browseVideoSelection(view.url.orEmpty())?.videoId != id) return
        inFlight = true
        val token = generation
        view.evaluateJavascript("""(function(){
          const video=document.querySelector('video');
          if(!video || video.readyState<2)return false;
          video.muted=false;
          if(video.volume===0)video.volume=1;
          const player=document.getElementById('movie_player');
          if(player && typeof player.unMute==='function')player.unMute();
          const playing=video.play();if(playing && playing.catch)playing.catch(function(){});
          return true;
        })()""") { result ->
            if (token == generation) {
                inFlight = false
                if (result == "true") videoId = null
            }
        }
    }
}
