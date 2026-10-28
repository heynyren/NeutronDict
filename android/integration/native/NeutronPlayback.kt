package com.kienhoang.dualsubreplay.ui

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.webkit.WebView
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import java.lang.ref.WeakReference
import org.json.JSONTokener

/** One visible YouTube page serves source taps and bounded Study replays. */
object NeutronPlayback {
    private val main by lazy { Handler(Looper.getMainLooper()) }
    private var videoId: String? = null
    private var expires = 0L
    private var generation = 0
    private var inFlight = false
    private var studyActive by mutableStateOf(false)
    private var study: StudyTask? = null
    private var studyGeneration = 0
    private var cleanups = 0
    private val idleWaiters = mutableListOf<() -> Unit>()

    private class StudyTask(
        val range: NeutronStudyRange,
        val token: Int,
        val clock: NeutronStudyClock,
        val complete: (String) -> Unit,
    ) {
        var view: WeakReference<WebView>? = null
        var pendingAt = 0L
        var ticket = 0
        var pending = false
    }

    @JvmStatic fun activeStudy(): Boolean = studyActive
    @JvmStatic fun readyForStudy(context: Context): Boolean {
        val p = context.getSharedPreferences("dual_sub_preferences", Context.MODE_PRIVATE)
        return neutronStudySetupReady(
            p.getBoolean("onboarding_completed", false),
            p.contains(GUIDE_COMPLETED_PREFERENCE), p.getBoolean(GUIDE_COMPLETED_PREFERENCE, false),
            p.contains(DAILY_GOAL_PROMPT_COMPLETED_PREFERENCE), p.getBoolean(DAILY_GOAL_PROMPT_COMPLETED_PREFERENCE, false),
        )
    }

    @JvmStatic fun requestStudy(
        url: String,
        start: Double,
        end: Double,
        rate: Double,
        complete: (String) -> Unit,
    ): Boolean {
        interruptStudy()
        videoId = null
        generation++
        inFlight = false
        val range = neutronStudyRange(url, start, end, rate)
        if (range == null) {
            complete("unavailable")
            return false
        }
        val task = StudyTask(range, ++studyGeneration, NeutronStudyClock(range, SystemClock.elapsedRealtime()), complete)
        study = task
        studyActive = true
        watch(task)
        return true
    }

    @JvmStatic fun cancelStudy() { finishStudy("cancelled") }
    @JvmStatic fun cancelStudy(done: () -> Unit) {
        cancelStudy()
        if (study == null && cleanups == 0) done() else idleWaiters += done
    }
    @JvmStatic fun interruptStudy() { finishStudy("interrupted") }
    @JvmStatic fun failStudy() { finishStudy("unavailable") }

    private fun watch(task: StudyTask) {
        main.postDelayed({
            if (study !== task) return@postDelayed
            val reason = task.clock.check(SystemClock.elapsedRealtime())
            if (reason == null) watch(task) else finishStudy(reason)
        }, 250L)
    }

    private fun finishStudy(reason: String) {
        val task = study ?: return
        cleanups++
        study = null
        task.ticket++
        val view = task.view?.get()
        var replied = false
        val done = Runnable {
            if (!replied) {
                replied = true
                cleanups--
                if (study == null && cleanups == 0) studyActive = false
                runCatching { task.complete(reason) }
                if (study == null && cleanups == 0) {
                    val waiting = idleWaiters.toList()
                    idleWaiters.clear()
                    waiting.forEach { runCatching { it() } }
                }
            }
        }
        if (view == null) {
            done.run()
            return
        }
        // The script checks its token: a late cleanup cannot pause a newer replay.
        runCatching {
            view.evaluateJavascript(neutronStudyStopScript(task.token, task.range.videoId)) { done.run() }
        }.onFailure { done.run() }
        // A destroyed renderer can discard callbacks; still release the Study request.
        main.postDelayed(done, 500L)
    }

    @JvmStatic fun request(url: String) {
        interruptStudy()
        videoId = browseVideoSelection(url)?.videoId
        expires = SystemClock.elapsedRealtime() + 30000
        generation++
        inFlight = false
    }

    @JvmStatic fun apply(view: WebView) {
        val task = study
        if (task != null) {
            applyStudy(view, task)
            return
        }
        val id = videoId ?: return
        if (SystemClock.elapsedRealtime() > expires) { videoId = null; return }
        if (inFlight || !isYouTubeWebUrl(view.url.orEmpty()) || browseVideoSelection(view.url.orEmpty())?.videoId != id) return
        inFlight = true
        val token = generation
        view.evaluateJavascript("""(function(){
          const host=window.location.hostname.toLowerCase();
          if(window.location.protocol!=='https:' || !(host==='youtube.com'||host.endsWith('.youtube.com')))return false;
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

    private fun applyStudy(view: WebView, task: StudyTask) {
        if (study !== task) return
        val now = SystemClock.elapsedRealtime()
        val url = view.url.orEmpty()
        val expected = isYouTubeWebUrl(url) && browseVideoSelection(url)?.videoId == task.range.videoId
        task.clock.page(now, expected, url.isNotBlank())?.let { finishStudy(it); return }
        if (!expected) return
        task.view = WeakReference(view)
        if (task.pending && now - task.pendingAt < 2000L) return
        task.pending = true
        task.pendingAt = now
        val ticket = ++task.ticket
        view.evaluateJavascript(neutronStudyScript(task.range, task.token)) { raw ->
            if (study !== task || ticket != task.ticket) return@evaluateJavascript
            task.pending = false
            val status = runCatching { JSONTokener(raw).nextValue() as? String }.getOrNull() ?: return@evaluateJavascript
            task.clock.status(SystemClock.elapsedRealtime(), status)?.let(::finishStudy)
        }
    }
}

internal fun neutronStudyStopScript(token: Int, videoId: String): String =
    "(function(){const host=window.location.hostname.toLowerCase();" +
        "if(window.location.protocol!=='https:' || !(host==='youtube.com'||host.endsWith('.youtube.com')))return false;" +
        "const url=new URL(window.location.href);" +
        "const id=url.searchParams.get('v')||(url.pathname.match(/^\\/(?:shorts|live|embed)\\/([A-Za-z0-9_-]{11})/)||[])[1];" +
        "if(id!=='" + videoId + "')return false;" +
        "const s=window.__neutronStudyClip;if(s && s.token!==" + token + ")return false;" +
        "if(s){s.close();delete window.__neutronStudyClip;}else{const v=document.querySelector('video');if(v)v.pause();}" +
        "return true;})()"

internal fun neutronStudyScript(range: NeutronStudyRange, token: Int): String =
    """
    (function(){
      const expected='__VIDEO__', token=__TOKEN__, start=__START__, end=__END__, rate=__RATE__;
      const valid=function(){
        const host=window.location.hostname.toLowerCase().replace(/\.$/,'');
        if(window.location.protocol!=='https:' || !(host==='youtube.com'||host.endsWith('.youtube.com')))return false;
        const url=new URL(window.location.href);
        const id=url.searchParams.get('v')||(url.pathname.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})/)||[])[1];
        return id===expected;
      };
      if(!valid())return 'cancelled';
      let old=window.__neutronStudyClip;
      if(old && old.token===token)return old.status;
      const player=document.getElementById('movie_player')||document.querySelector('.html5-video-player');
      const video=document.querySelector('video');
      if(!video || video.readyState<2 || document.querySelector('.ad-showing,.ad-interrupting'))return 'waiting';
      if(video.error)return 'unavailable';
      if(player && typeof player.getVideoData==='function'){
        const data=player.getVideoData();
        if(!data || data.video_id!==expected)return 'waiting';
      }
      if(Number.isFinite(video.duration) && end>video.duration+0.5)return 'unavailable';
      if(old)old.close();
      clearInterval(window.__dualSubClipTimer);
      clearTimeout(window.__dualSubGapTimer);window.__dualSubGapTimer=null;
      if(typeof video.__dualSubGapRate==='number'){
        video.playbackRate=video.__dualSubGapRate;
        delete video.__dualSubGapRate;delete video.__dualSubGapFast;
      }
      const s={
        token:token, video:video, status:'seeking', began:false, seeking:true, ad:false, closed:false,
        requested:Date.now(), timer:null, oldRate:video.playbackRate,
        oldMuted:video.muted, oldVolume:video.volume,
        oldPitch:video.preservesPitch, oldWebkitPitch:video.webkitPreservesPitch,
        close:function(){
          clearInterval(s.timer);
          if(s.closed)return;s.closed=true;
          try {
            s.video.pause();s.video.playbackRate=s.oldRate;
            s.video.muted=s.oldMuted;s.video.volume=s.oldVolume;
            if(s.oldPitch!==undefined)s.video.preservesPitch=s.oldPitch;
            if(s.oldWebkitPitch!==undefined)s.video.webkitPreservesPitch=s.oldWebkitPitch;
          }catch(_){}
        },
        end:function(status){if(s.closed)return;s.status=status;s.close();}
      };
      window.__neutronStudyClip=s;
      video.pause();
      video.currentTime=start;
      const tick=function(){
        if(!valid()){s.end('cancelled');return;}
        if(document.querySelector('video')!==video){s.end('unavailable');return;}
        if(document.querySelector('.ad-showing,.ad-interrupting')){s.ad=true;return;}
        if(s.ad){
          s.ad=false;s.seeking=true;s.requested=Date.now();
          video.pause();video.currentTime=start;
        }
        if(video.error){s.end('unavailable');return;}
        if(video.readyState<2 || video.seeking)return;
        if(s.seeking){
          if(Math.abs(video.currentTime-start)>Math.min(0.35,(end-start)/3)){
            if(Date.now()-s.requested>5000)s.end('unavailable');
            return;
          }
          s.seeking=false;
          video.playbackRate=rate;
          if('preservesPitch' in video)video.preservesPitch=true;
          if('webkitPreservesPitch' in video)video.webkitPreservesPitch=true;
          video.muted=false;if(video.volume===0)video.volume=1;
          if(player && typeof player.unMute==='function')player.unMute();
          try {
            const promise=video.play();
            if(promise && promise.catch)promise.catch(function(){s.end('unavailable');});
          }catch(_){s.end('unavailable');}
          return;
        }
        if(video.ended || video.currentTime>=end){s.end('completed');return;}
        if(video.currentTime<start-0.8){s.end('cancelled');return;}
        if(!video.paused){s.began=true;s.status='playing';}
        else if(s.began){s.end('cancelled');}
      };
      s.timer=setInterval(tick,50);
      tick();
      return s.status;
    })()
    """.trimIndent()
        .replace("__VIDEO__", range.videoId)
        .replace("__TOKEN__", token.toString())
        .replace("__START__", range.start.toString())
        .replace("__END__", range.end.toString())
        .replace("__RATE__", range.rate.toString())
