"""Build an isolated NeutronDict preview from pinned DualSub source. Runs on GitHub."""
from pathlib import Path
import json, shutil, re, xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
ANDROID = HERE.parent
UPSTREAM = HERE / "upstream"
OUT = HERE / "build"
PIN = "25d2a83eeb7c95fc204ac656256b7d3cca5616ae"
A = "{http://schemas.android.com/apk/res/android}"
ET.register_namespace("android", "http://schemas.android.com/apk/res/android")
ET.register_namespace("tools", "http://schemas.android.com/tools")

def patch(path, before, after, count=1):
    text = path.read_text()
    if text.count(before) != count:
        raise RuntimeError(f"Upstream drift: {path.name}, expected {count}, found {text.count(before)}")
    path.write_text(text.replace(before, after))

def put(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)

if not UPSTREAM.joinpath("app/src/main").is_dir():
    raise SystemExit("Checkout the pinned dual-sub-replay source into android/integration/upstream first.")
import subprocess
actual = subprocess.check_output(["git", "-C", str(UPSTREAM), "rev-parse", "HEAD"], text=True).strip()
if actual != PIN: raise SystemExit("Unexpected DualSub commit: " + actual)
if OUT.exists(): shutil.rmtree(OUT)
shutil.copytree(UPSTREAM, OUT, ignore=shutil.ignore_patterns(".git", "site", "tools", ".github", ".gradle", "build"))
main = OUT / "app/src/main"
java = main / "java"
dual = java / "com/kienhoang/dualsubreplay"
generated = ANDROID / "android/app/src/main"

# Preserve the source app, tests, assets, notices and Compose UI. Bring the existing Capacitor shell in.
shutil.copytree(generated / "assets", main / "assets", dirs_exist_ok=True)
shutil.copytree(generated / "res", main / "res", dirs_exist_ok=True)
# Capacitor's generated strings are brand/URI constants, not untranslated UI labels.
brand_strings = main / "res/values/strings.xml"
brands = ET.parse(brand_strings)
for string in brands.getroot().findall("string"):
    string.set("translatable", "false")
brands.write(brand_strings, encoding="utf-8", xml_declaration=True)
shutil.copytree(generated / "java", java, dirs_exist_ok=True)
for source in HERE.joinpath("native").iterdir():
    if source.suffix not in (".java", ".kt"): continue
    package = re.search(r"package\s+([\w.]+)", source.read_text()).group(1)
    target = java / package.replace(".", "/") / source.name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
shutil.copytree(HERE / "tests", OUT / "app/src/test/java/com/neutrondict/app/media", dirs_exist_ok=True)
shutil.copytree(HERE / "androidTest", OUT / "app/src/androidTest/java/com/neutrondict/app/media", dirs_exist_ok=True)
put(main / "assets/neutron/reader-context.js", (HERE / "reader-context.js").read_text())
put(main / "assets/neutron/reader-source.js", (HERE / "reader-source.js").read_text())
for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
    if UPSTREAM.joinpath(name).exists():
        shutil.copy2(UPSTREAM / name, main / "assets/neutron" / name)
put(main / "assets/neutron/UPSTREAM.txt", "DualSub Replay: https://github.com/heynyren/dual-sub-replay\nCommit: " + PIN + "\nNeutronDict integration: source build overlays in android/integration.\n")

# Register only in the trusted Capacitor host. Reader and YouTube WebViews have no native JS bridge.
host = java / "com/neutrondict/app/MainActivity.java"
patch(host, "super.onCreate(savedInstanceState);", "registerPlugin(com.neutrondict.app.media.MediaPlugin.class);\n    super.onCreate(savedInstanceState);")
patch(host, "  /** Phân loại intent:", """  @Override public void onResume() {
    super.onResume();
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('neutrondict-media'))", null);
    }
  }

  /** Phân loại intent:""")

# Full DualSub entry activity keeps its existing setContent and fullscreen behavior.
# A drawer item returns to the notebook; no new toolbar covers the original UI.
appui = dual / "ui/DualSubApp.kt"
text = appui.read_text()
# Find the actual drawer implementation separately when upstream changes.
put(main / "assets/neutron/BUILD.txt", "RaKuLanG preview. App updates are distributed from the NeutronDict branch, not DualSub releases.")

navigation = dual / "ui/AppNavigation.kt"
patch(navigation, "    val drawer = rememberDrawerState(DrawerValue.Closed)", """    val context = androidx.compose.ui.platform.LocalContext.current
    val drawer = rememberDrawerState(DrawerValue.Closed)""")
patch(navigation, "                            Spacer(Modifier.height(8.dp))", """                            Spacer(Modifier.height(8.dp))
                            NavigationDrawerItem(
                                label = { Text(androidx.compose.ui.res.stringResource(com.kienhoang.dualsubreplay.R.string.rakulang_notebook)) },
                                selected = false,
                                modifier = Modifier.testTag("open_neutrondict"),
                                onClick = {
                                    com.kienhoang.dualsubreplay.playback.WebVideoBridge.send(com.kienhoang.dualsubreplay.playback.WebVideoCommand.Pause)
                                    context.startActivity(android.content.Intent(context, com.neutrondict.app.MainActivity::class.java).addFlags(android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT))
                                    scope.launch { drawer.close() }
                                },
                            )""")

# Preserve the source position when returning from a saved notebook entry.
patch(dual / "ui/AppViewModel.kt",
      "        val watchUrl = mobileWatchUrl(videoId)\n        ensureOpenTab(watchUrl)",
      "        val watchUrl = neutronSourceWatchUrl(mobileWatchUrl(videoId), text)\n        ensureOpenTab(watchUrl)")
# Store the complete sentence even when the displayed subtitle is split into shorter rows.
patch(dual / "data/SavedWord.kt", "meaning.trim(), segment?.originalText.orEmpty(), segment?.translatedText, selection.videoId,",
      "meaning.trim(), segment?.sentence?.text ?: segment?.originalText.orEmpty(), segment?.translatedText?.takeIf { segment.sentence == null || segment.sentence.text == segment.originalText }, selection.videoId,")

# Shared AI controller: one key vault, history and settings, no concurrent history writers across screens.
patch(dual / "ui/LearningPlayerRoot.kt", "val aiViewModel: AiAssistantViewModel = viewModel()",
      "val aiViewModel: AiAssistantViewModel = sharedNeutronAssistant(context)")

# A vocabulary save also enters the durable inbox; reviewing/updating old vocabulary does not.
vocab = dual / "data/VocabularyRepository.kt"
patch(vocab, '    private val database =', '    private val appContext = context.applicationContext\n    private val database =')
patch(vocab, "                publish()\n                updated\n            }\n        }\n\n    suspend fun update", """                com.neutrondict.app.media.MediaInbox.add(appContext, encodeWord(updated))
                publish()
                updated\n            }\n        }\n\n    suspend fun update""")
# This upstream migration cancels every WorkManager job. It must not cancel the news schedule.
patch(vocab, 'serviceName.contains("androidx.work") || serviceName.contains("SystemJobService")',
      'serviceName.contains("dualsubreplay.legacydownload")')

# Embedded auth only trusts the existing explicit allowlist.
browser = dual / "ui/YouTubeBrowserScreen.kt"
patch(browser, "): Boolean = shouldOpenInsideApp(destination) ||\n    (signInEmbeddingActive && destination == EmbeddedNavigationDecision.OPEN_EXTERNAL)",
      "): Boolean = shouldOpenInsideApp(destination)")
security_test = OUT / "app/src/test/java/com/kienhoang/dualsubreplay/ui/PlaybackArchitectureTest.kt"
if security_test.exists():
    test = security_test.read_text()
    # Update the one expectation whose behavior intentionally changed.
    test = test.replace("assertTrue(shouldOpenInsideApp(EmbeddedNavigationDecision.OPEN_EXTERNAL, true))",
                        "assertFalse(shouldOpenInsideApp(EmbeddedNavigationDecision.OPEN_EXTERNAL, true))")
    test = test.replace("activeSignInKeepsUnknownHostsEmbeddedInsteadOfChrome", "activeSignInNeverEmbedsUnknownHosts")
    test = test.replace("assertTrue(\n            shouldOpenInsideApp(EmbeddedNavigationDecision.OPEN_EXTERNAL, signInEmbeddingActive = true),",
                        "assertFalse(\n            shouldOpenInsideApp(EmbeddedNavigationDecision.OPEN_EXTERNAL, signInEmbeddingActive = true),")
    security_test.write_text(test)
capture = dual / "ui/AiScreenCapture.kt"
patch(capture, "                hidden = true", """                if (!com.neutrondict.app.media.ScreenPrivacy.canCapture(decor)) return@withContext null
                hidden = true""")
patch(capture, "                    copyWindow(activity, decor.width, decor.height)",
      "                    if (com.neutrondict.app.media.ScreenPrivacy.canCapture(decor)) copyWindow(activity, decor.width, decor.height) else null")


# Device UI tests must finish IME resizing before tapping the next control.
# Keep every original assertion and all production UI/animations unchanged.
ai_ui_test = OUT / "app/src/androidTest/java/com/kienhoang/dualsubreplay/ui/AiAssistantPanelUiTest.kt"
ai_test_source = ai_ui_test.read_text()
ai_test_source, keyboard_inputs = re.subn(
    r"(?m)^([ \t]*)(composeRule[^\n]*\.performTextInput\([^\n]*\))$",
    lambda m: m.group(0) + "\n" + m.group(1) + "Espresso.closeSoftKeyboard()\n" + m.group(1) + "composeRule.waitForIdle()",
    ai_test_source)
if keyboard_inputs != 12: raise RuntimeError("Upstream AI keyboard test inputs changed")
ai_ui_test.write_text(ai_test_source)

# An integrated APK must never offer an unrelated DualSub package update.
updater = dual / "update/AppUpdater.kt"
updater_text = updater.read_text()
# Channel resolver already rejects custom IDs. Pin distribution links to this repository as well.
updates = dual / "data/AppUpdates.kt"
if updates.exists():
    s = updates.read_text()
    updates.write_text(s)

# Convert npm plugin source into modern AGP modules. Keep the actual native sources/manifests/resources.
modules = [
 ("capacitor-android", "@capacitor/android/capacitor", "com.getcapacitor"),
 ("capacitor-app", "@capacitor/app/android", "com.capacitorjs.plugins.app"),
 ("capacitor-preferences", "@capacitor/preferences/android", "com.capacitorjs.plugins.preferences"),
 ("capacitor-local-notifications", "@capacitor/local-notifications/android", "com.capacitorjs.plugins.localnotifications"),
 ("capacitor-text-to-speech", "@capacitor-community/text-to-speech/android", "com.getcapacitor.community.tts"),
]
settings = (OUT / "settings.gradle.kts").read_text().replace('include(":benchmark")', '')
for name, npm_path, namespace in modules:
    source = ANDROID / "node_modules" / npm_path
    # Namespace must match the npm module's generated R/BuildConfig imports.
    source_gradle = source.joinpath("build.gradle").read_text()
    namespace_match = re.search(r"""namespace\s*(?:=\s*)?["']([^"']+)["']""", source_gradle)
    if not namespace_match: raise RuntimeError("Missing namespace: " + npm_path)
    namespace = namespace_match.group(1)
    dest = OUT / name
    shutil.copytree(source / "src", dest / "src", dirs_exist_ok=True)
    dependencies = '''
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.core:core-ktx:1.19.1")
    implementation("androidx.activity:activity:1.11.0")
    implementation("androidx.fragment:fragment:1.8.9")
    implementation("androidx.coordinatorlayout:coordinatorlayout:1.2.0")
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("org.apache.cordova:framework:10.1.1")
    implementation("com.google.android.material:material:1.12.0")
    '''
    if name != "capacitor-android": dependencies += '\n    implementation(project(":capacitor-android"))'
    put(dest / "build.gradle.kts", '''
plugins { id("com.android.library") }
android {
    namespace = "''' + namespace + '''"
    compileSdk = 37
    defaultConfig { minSdk = 26 }
    buildFeatures { buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
dependencies {''' + dependencies + '\n}\n')
    settings += '\ninclude(":' + name + '")\n'
put(OUT / "settings.gradle.kts", settings)
root = OUT / "build.gradle.kts"
patch(root, '    id("com.android.application") version "9.4.1" apply false',
      '    id("com.android.application") version "9.4.1" apply false\n    id("com.android.library") version "9.4.1" apply false')
# Upstream quality tasks expect tools not copied into this generated build; CI tests source separately.
patch(root, 'apply(from = "quality.gradle.kts")', '// Integration patches are validated in the NeutronDict workflow.')
gradle = OUT / "app/build.gradle.kts"
patch(gradle, 'applicationId = "com.kienhoang.dualsubreplay"', 'applicationId = "com.neutrondict.app.preview"')
patch(gradle, 'val appVersionName = "1.0.4"', 'val appVersionName = "1.0.4-neutrondict-preview"')
extra = '\n'.join('    implementation(project(":' + name + '"))' for name,_,_ in modules)
patch(gradle, "dependencies {", '''dependencies {
''' + extra + '''
    implementation("androidx.work:work-runtime:2.10.5")
    implementation("androidx.core:core-splashscreen:1.0.1")
    testImplementation("net.sf.kxml:kxml2:2.3.0")
''')
# Native tests compile under the original namespace; ND Java refers to no generated app R.
manifest_path = main / "AndroidManifest.xml"
manifest = ET.parse(manifest_path)
application = manifest.getroot().find("application")
for element in application:
    if element.tag in ("activity", "service", "receiver", "provider"):
        name = element.get(A + "name", "")
        if name.startswith("."): element.set(A + "name", "com.kienhoang.dualsubreplay" + name)
for activity in application.findall("activity"):
    if activity.get(A + "name") == "com.kienhoang.dualsubreplay.MainActivity":
        # Main NeutronDict owns launch/share. Keep YouTube VIEW deep links.
        activity.set(A + "launchMode", "singleTop")
        for intent_filter in list(activity.findall("intent-filter")):
            actions = {x.get(A + "name") for x in intent_filter.findall("action")}
            if "android.intent.action.MAIN" in actions or "android.intent.action.SEND" in actions: activity.remove(intent_filter)
host_manifest = ET.parse(generated / "AndroidManifest.xml")
for perm in host_manifest.getroot().findall("uses-permission"):
    if not any(p.get(A+"name") == perm.get(A+"name") for p in manifest.getroot().findall("uses-permission")):
        manifest.getroot().insert(0, perm)
host_app = host_manifest.getroot().find("application")
for element in host_app:
    if element.tag not in ("activity", "activity-alias", "provider"): continue
    for attr in ("name", "targetActivity"):
        value = element.get(A + attr, "")
        if value.startswith("."): element.set(A + attr, "com.neutrondict.app" + value)
    if element.tag == "activity":
        element.set(A + "theme", "@style/AppTheme.NoActionBarLaunch")
    application.append(element)
ET.SubElement(application, "activity", {
    A+"name":"com.kienhoang.dualsubreplay.ui.NewsReaderActivity",
    A+"exported":"false", A+"theme":"@style/Theme.DualSubReplay",
    A+"windowSoftInputMode":"adjustResize"
})
# Stable label in every locale (upstream has translated app_name).
for values in OUT.glob("app/src/*/res/values*/strings*.xml"):
    s = values.read_text()
    s = re.sub(r'(<string name="app_name">).*?(</string>)', r'\g<1>RaKuLanG\2', s)
    values.write_text(s)
if application.get(A+"name") not in (None, "android.app.Application"):
    raise RuntimeError("Upstream introduced an Application class; integrate its initialization explicitly")
application.set(A+"name", "com.neutrondict.app.media.NeutronApplication")
application.set(A+"label", "RaKuLanG")
# Preserve the original AI/WebView backup exclusions. Reader cache is expendable.
manifest.write(manifest_path, encoding="utf-8", xml_declaration=True)
# Source build records for reproducibility.
put(OUT / "INTEGRATION.json", json.dumps({"upstream":PIN,"applicationId":"com.neutrondict.app.preview"}, indent=2))
print("Prepared integrated project:", OUT)

# Source replay comes from an explicit tap in the trusted notebook.
patch(dual / "ui/YouTubeBrowserScreen.kt",
      "settings.mediaPlaybackRequiresUserGesture = true",
      "settings.mediaPlaybackRequiresUserGesture = false")
patch(dual / "ui/YouTubeBrowserScreen.kt",
      "        webView.evaluateJavascript(WEB_VIDEO_STATE_SCRIPT) { rawValue ->",
      "        NeutronPlayback.apply(webView)\n        webView.evaluateJavascript(WEB_VIDEO_STATE_SCRIPT) { rawValue ->")

# Full-sentence text and playback bounds must remain one context, even after disk paging.

patch(dual / "data/SubtitleModels.kt", "    val index: Int,\n)", "    val index: Int,\n    val startMs: Long = -1,\n    val endMs: Long = -1,\n)")

patch(dual / "ui/CaptionFormat.kt", "SentenceSlice(sentence, cuts, index)", "SentenceSlice(sentence, cuts, index, rows.minOf { it.startMs }, rows.maxOf { it.endMs })")

patch(dual / "data/SubtitleStore.kt", "        writeInt(sentence.index)", "        writeInt(sentence.index)\n        writeLong(sentence.startMs)\n        writeLong(sentence.endMs)")

patch(dual / "data/SubtitleStore.kt", "SentenceSlice(text, List(count) { readInt() }, readInt())", "SentenceSlice(text, List(count) { readInt() }, readInt(), readLong(), readLong())")

patch(dual / "data/SavedWord.kt", "    val segment = selection.segment", "    val segment = selection.segment?.let { row ->\n        val whole = row.sentence\n        if (whole != null && whole.startMs >= 0 && whole.endMs > whole.startMs)\n            row.copy(startMs = whole.startMs, endMs = whole.endMs)\n        else row\n    }")

# Keep row arbitration close to the actual media clock, not a repeated phrase far ahead.

patch(dual / "ui/KaraokeTiming.kt", "        playbackTimeMs: Long = 0L,\n    ): CaptionHighlightPosition?", "        playbackTimeMs: Long = 0L,\n        segments: List<SubtitleSegment>? = null,\n    ): CaptionHighlightPosition?")

patch(dual / "ui/KaraokeTiming.kt", "        val fromLive = wordHighlightEnabled && generatedCaptions && livePosition != null", "        fun near(index: Int): Boolean {\n            if (segments == null) return true\n            val row = segments.getOrNull(index) ?: return false\n            return row.startMs <= playbackTimeMs + 1_000L && row.endMs >= playbackTimeMs - 1_000L\n        }\n        if (lastPosition?.let { !near(it.segmentIndex) } == true) reset()\n        val fromLive = wordHighlightEnabled && generatedCaptions &&\n            livePosition != null && near(livePosition.segmentIndex)")

patch(dual / "ui/AppViewModel.kt", "                playbackTimeMs = timeMs,\n            )\n        val index = position?.segmentIndex", "                playbackTimeMs = timeMs,\n                segments = current.segments,\n            )\n        val index = position?.segmentIndex")

patch(dual / "ui/KaraokeTiming.kt", "        val stale = playbackTimeMs - lastMappedMediaTimeMs > LIVE_CAPTION_STALE_MS", "        val stale = playbackTimeMs - lastMappedMediaTimeMs > LIVE_CAPTION_STALE_MS ||\n            lastMappedMediaTimeMs - playbackTimeMs > LIVE_CAPTION_BACKWARD_SEEK_RESET_MS")


# Study sentence replay reuses DualSub's single YouTube page, with bounded
# playback and an automatic return to the still-live NeutronDict Study host.
patch(dual / "ui/YouTubeBrowserScreen.kt",
      "            delay(MEDIA_STATE_POLL_INTERVAL_MS)",
      "            delay(if (NeutronPlayback.activeStudy()) 100L else MEDIA_STATE_POLL_INTERVAL_MS)")
patch(dual / "ui/YouTubeBrowserScreen.kt",
      "        if (canGoBack) webView.goBack() else (context as? Activity)?.leaveKeepingState()",
      "        if (NeutronPlayback.activeStudy()) NeutronPlayback.cancelStudy()\n        else if (canGoBack) webView.goBack() else (context as? Activity)?.leaveKeepingState()")
patch(dual / "ui/StudyPlayback.kt",
      "        val current = state ?: return",
      "        if (NeutronPlayback.activeStudy()) return\n        val current = state ?: return")
patch(dual / "MainActivity.kt",
      "        super.onStop()",
      "        super.onStop()\n        if (!isChangingConfigurations) com.kienhoang.dualsubreplay.ui.NeutronPlayback.interruptStudy()")
# Hide learning captions temporarily; do not change the user's saved settings.
patch(dual / "ui/DualSubApp.kt",
      "val tracksVisible = state.showOriginal() || state.showTranslation()",
      "val tracksVisible = !NeutronPlayback.activeStudy() && (state.showOriginal() || state.showTranslation())")
patch(dual / "ui/DualSubApp.kt",
      "suppressPageCaptions = shouldSuppressNativeCaptions(state, liveCaptionCaptureEnabled, effectivePlayerMode),",
      "suppressPageCaptions = NeutronPlayback.activeStudy() || shouldSuppressNativeCaptions(state, liveCaptionCaptureEnabled, effectivePlayerMode),")
patch(dual / "ui/LearningPlayerRoot.kt",
      "val overlayContent = learningOverlayContent(state)",
      "val overlayContent = if (NeutronPlayback.activeStudy()) null else learningOverlayContent(state)")

patch(dual / "ui/YouTubeBrowserScreen.kt",
      "    fun pageChanged(url: String) {",
      "    fun pageChanged(url: String) {\n        if (NeutronPlayback.activeStudy()) { pendingClip = null; playingClipVideo = null; return }")
patch(dual / "ui/YouTubeBrowserScreen.kt",
      "    fun observePage(url: String) {",
      "    fun observePage(url: String) {\n        if (NeutronPlayback.activeStudy()) { pendingClip = null; playingClipVideo = null; return }")

# Share DualSub's first-step popup with the explicitly invoked article lookup.
patch(dual / "ui/PhraseSelection.kt", "private fun PhraseActionBar(", "internal fun PhraseActionBar(")

# Like extension/phu-de.js: media time + word anchors win over delayed caption DOM.
patch(dual / "ui/KaraokeTiming.kt",
      "        val fromLive = wordHighlightEnabled && generatedCaptions &&",
      """        val timedRow = segments?.getOrNull(timedSegmentIndex)
        val timedWords = timedRow?.words.orEmpty()
        val anchored = timedWords.isNotEmpty() && timedWords.all {
            it.startMs >= 0 && it.endMs > it.startMs
        } && timedWords.zipWithNext().all { (a, b) -> b.startMs >= a.startMs }
        if (anchored) {
            lastPosition = timedPosition
            behindSinceMs = null
            return timedPosition
        }
        val fromLive = wordHighlightEnabled && generatedCaptions &&""")
patch(dual / "ui/CaptionPlaybackClock.kt",
      "        snapshot = sample",
      """        // Re-anchor to actual media after an unreported seek or stopped renderer.
        // Never retain a projected future cursor while video is paused/buffering.
        val predictedAtSample = positionMs + if (previous == null || previous.paused || previous.buffering) 0L
            else (((receivedAt - age) - sampledAt).coerceAtLeast(0) * previous.playbackRate).toLong()
        val observedMs = (second * 1000).toLong()
        if (sample.paused || sample.buffering || sample.seeking ||
            kotlin.math.abs(observedMs - predictedAtSample) > 150L) {
            lastEmittedPositionMs = null
        }
        snapshot = sample""")

# The extension selects anchors at actual media time, with no fixed visual lead.
patch(dual / "data/WordTiming.kt",
      "internal const val KARAOKE_HIGHLIGHT_LEAD_MS = 75L",
      "internal const val KARAOKE_HIGHLIGHT_LEAD_MS = 0L")
# This expectation deliberately changes with the authorized media-time policy.
patch(OUT / "app/src/test/java/com/kienhoang/dualsubreplay/data/WordTimingTest.kt",
      "assertEquals(2, activeWordIndex(words, timeMs = 950))",
      "assertEquals(1, activeWordIndex(words, timeMs = 950))")

patch(dual / "data/WordTiming.kt",
      "/** v0.9.5's visual lead, applied only after the first word has started. */",
      "/** Follow actual video time, as NeutronDict's web extension does. */")
patch(OUT / "app/src/test/java/com/kienhoang/dualsubreplay/data/WordTimingTest.kt",
      "activeWordIndexTracksTheSpokenWordWithSmallLatencyLead",
      "activeWordIndexTracksActualAnchorsWithoutAnEarlyOffset")
patch(OUT / "app/src/test/java/com/kienhoang/dualsubreplay/data/WordTimingTest.kt",
      "// Near the next boundary, the small visual lead compensates for WebView/UI latency.",
      "// The next word stays inactive until the video's clock reaches its actual anchor.")

# Zero lead means even a short opening token remains active at its own real start.
patch(OUT / "app/src/test/java/com/kienhoang/dualsubreplay/ui/CaptionFormatTest.kt",
      "val expected = words[if (wordIndex == 0) 1 else wordIndex]",
      "val expected = word")
patch(OUT / "app/src/test/java/com/kienhoang/dualsubreplay/ui/CaptionFormatTest.kt",
      """        // v0.9.5's 75 ms lead skips this fixture's 30 ms opening token once
        // the cue starts. All later token starts are at least 90 ms apart.""",
      """        // Match the web extension: each token is active at its own anchor,
        // including the 30 ms opening token; never jump ahead by a fixed offset.""")

# Preserve source chunk bounds while retaining lexical timings for word lookup/replay.
patch(dual / "data/SubtitleModels.kt",
      "data class SubtitleWord(\n    val text: String,\n    val startMs: Long,\n    val endMs: Long,\n)",
      "data class SubtitleWord(\n    val text: String,\n    val startMs: Long,\n    val endMs: Long,\n    val highlightStartMs: Long = -1,\n    val highlightEndMs: Long = -1,\n)")
patch(dual / "data/WordTiming.kt",
      "SubtitleWord(text = token, startMs = cursor, endMs = safeEnd)",
      "SubtitleWord(text = token, startMs = cursor, endMs = safeEnd, highlightStartMs = startMs, highlightEndMs = endMs)")
patch(dual / "data/SubtitleStore.kt",
      "        writeLong(word.endMs)",
      "        writeLong(word.endMs)\n        writeLong(word.highlightStartMs)\n        writeLong(word.highlightEndMs)")
patch(dual / "data/SubtitleStore.kt",
      "SubtitleWord(readText(), readLong(), readLong())",
      "SubtitleWord(readText(), readLong(), readLong(), readLong(), readLong())")
patch(dual / "data/RecentCaptionTracks.kt", "const val VERSION = 4",
      "const val VERSION = 5 // 5: preserve source highlight chunks, not estimated per-word cursors.")
patch(dual / "data/RecentCaptionTracks.kt",
      ".put(word.startMs).put(word.endMs)",
      ".put(word.startMs).put(word.endMs).put(word.highlightStartMs).put(word.highlightEndMs)")
patch(dual / "data/RecentCaptionTracks.kt",
      "SubtitleWord(word.getString(0), word.getLong(1), word.getLong(2))",
      "SubtitleWord(word.getString(0), word.getLong(1), word.getLong(2), word.optLong(3, -1), word.optLong(4, -1))")
# Use the same original chunk on the transcript and on-video overlay; text/POS/taps stay intact.
patch(dual / "ui/SubtitleWordHighlight.kt",
      "subtitleWordSpans(text, words)", "neutronHighlightSpans(text, words)", count=2)
# A timestamped current row is authoritative even when its words were only estimated.
patch(dual / "ui/KaraokeTiming.kt",
      """        val anchored = timedWords.isNotEmpty() && timedWords.all {
            it.startMs >= 0 && it.endMs > it.startMs
        } && timedWords.zipWithNext().all { (a, b) -> b.startMs >= a.startMs }""",
      """        val anchored = timedRow != null &&
            playbackTimeMs >= timedRow.startMs && playbackTimeMs < timedRow.endMs""")
patch(dual / "ui/KaraokeTiming.kt",
      "row.startMs <= playbackTimeMs + 1_000L", "row.startMs <= playbackTimeMs")

# Always brand the integrated launcher too; generated Capacitor resources alone are not authoritative.
bear_res = main / "res/drawable-nodpi"
bear_res.mkdir(parents=True, exist_ok=True)
shutil.copy2(ANDROID / "assets/icon.png", bear_res / "neutron_launcher.png")
shutil.copy2(ANDROID / "assets/icon-foreground.png", bear_res / "neutron_launcher_foreground.png")
put(main / "res/mipmap-anydpi-v26/neutron_launcher.xml",
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@android:color/white"/><foreground android:drawable="@drawable/neutron_launcher_foreground"/></adaptive-icon>')
put(main / "res/mipmap-anydpi/neutron_launcher.xml",
    '<bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@drawable/neutron_launcher" android:gravity="fill"/>')
branded_manifest = ET.parse(manifest_path)
branded_app = branded_manifest.getroot().find("application")
branded_app.set(A+"icon", "@mipmap/neutron_launcher")
branded_app.set(A+"roundIcon", "@mipmap/neutron_launcher")
branded_manifest.write(manifest_path, encoding="utf-8", xml_declaration=True)


# RaKuLanG presets are separate from semantic subtitle/POS colors.
colors = dual / "ui/SubtitleColors.kt"
patch(colors, '    CYAN("cyan", R.string.settings_color_cyan, 0xFF13C6D7),', '''    PASTEL_BLUE("pastel_blue", R.string.settings_color_blue, 0xFF8BD4E6),
    PASTEL_MINT("pastel_mint", R.string.settings_color_mint, 0xFFB4E2CE),
    PASTEL_ROSE("pastel_rose", R.string.settings_color_rose, 0xFFF1C5D6),
    PASTEL_PEACH("pastel_peach", R.string.rakulang_color_peach, 0xFFF6CFB4),
    PASTEL_LAVENDER("pastel_lavender", R.string.settings_color_lavender, 0xFFD6CBEF),
    PASTEL_BUTTER("pastel_butter", R.string.settings_color_amber, 0xFFF3E4AA),
    CYAN("cyan", R.string.settings_color_cyan, 0xFF13C6D7),''')
patch(colors, '?: Color(AppThemeAccentOption.CYAN.argb)', '?: Color(AppThemeAccentOption.PASTEL_BLUE.argb)')
patch(colors, 'internal val DEFAULT_APP_THEME_ACCENT_KEY = AppThemeAccentOption.CYAN.key',
              'internal val DEFAULT_APP_THEME_ACCENT_KEY = AppThemeAccentOption.PASTEL_BLUE.key')
theme = dual / "ui/theme/Theme.kt"
patch(theme, 'lightDualSubColorScheme(appThemeAccentColor(accentKey))',
             'lightDualSubColorScheme(appThemeAccentColor(accentKey), accentKey.startsWith("pastel_"))')
patch(theme, 'private fun lightDualSubColorScheme(accent: Color): ColorScheme {',
             'private fun lightDualSubColorScheme(accent: Color, pastel: Boolean = false): ColorScheme {')
patch(theme, 'val primary = lerp(accent, Color.Black, LIGHT_ACCENT_DARKENING)',
             'val primary = lerp(accent, Color.Black, if (pastel) 0.55f else LIGHT_ACCENT_DARKENING)')
# Reuse locale wrapping on pre-Android-13 devices too.
patch(host, 'public class MainActivity extends BridgeActivity {', '''public class MainActivity extends BridgeActivity {
  @Override protected void attachBaseContext(android.content.Context base) {
    super.attachBaseContext(com.kienhoang.dualsubreplay.ui.NeutronInterface.wrap(base));
  }''')

# Localized integration chrome and error messages. Keep source-data errors stable.
RAKU_STRINGS = {"rakulang_theme_error":{"vi":"Chưa lưu được màu. Hãy chọn lại.","en":"Could not save the color. Please select it again.","ja":"色を保存できませんでした。もう一度選んでください。"},"rakulang_color_peach":{"vi":"Đào","en":"Peach","ja":"ピーチ"},"rakulang_notebook":{"vi":"RaKuLanG · Sổ tay và đọc báo","en":"RaKuLanG · Notebook and news","ja":"RaKuLanG · 単語帳とニュース"},"rakulang_return":{"vi":"‹ RaKuLanG","en":"‹ RaKuLanG","ja":"‹ RaKuLanG"},"rakulang_lookup":{"vi":"Tra RaKuLanG","en":"Look up with RaKuLanG","ja":"RaKuLanGで検索"},"rakulang_opening":{"vi":"Đang mở bài…","en":"Opening article…","ja":"記事を開いています…"},"rakulang_offline":{"vi":"Bản đã lưu trên máy","en":"Saved on this device","ja":"この端末に保存した記事"},"rakulang_open_error":{"vi":"Chưa mở được bài. Kiểm tra mạng hoặc bấm tải lại.","en":"Could not open the article. Check your connection or tap Reload.","ja":"記事を開けませんでした。接続を確認するか、再読み込みしてください。"},"rakulang_page_closed":{"vi":"Trang đã đóng để giải phóng bộ nhớ. Hãy mở lại bài.","en":"The page was closed to free memory. Reopen the article.","ja":"メモリ確保のためページを閉じました。記事を開き直してください。"},"rakulang_reload":{"vi":"Tải lại","en":"Reload","ja":"再読み込み"},"rakulang_readable":{"vi":"Dễ đọc","en":"Reader view","ja":"読みやすく表示"},"rakulang_save_article":{"vi":"Lưu bài","en":"Save article","ja":"記事を保存"},"rakulang_saved_word":{"vi":"Đã lưu vào sổ tay RaKuLanG","en":"Saved to your RaKuLanG notebook","ja":"RaKuLanGの単語帳に保存しました"},"rakulang_select_word":{"vi":"Bôi đen từ rồi bấm Tra RaKuLanG.","en":"Select a word, then tap Look up with RaKuLanG.","ja":"単語を選択して「RaKuLanGで検索」をタップしてください。"},"rakulang_lookup_error":{"vi":"Chưa tra được từ.","en":"Could not look up this word.","ja":"単語を検索できませんでした。"},"rakulang_article_empty":{"vi":"Chưa lấy được nội dung bài.","en":"Could not extract the article text.","ja":"記事の本文を取得できませんでした。"},"rakulang_save_error":{"vi":"Không lưu được bài.","en":"Could not save the article.","ja":"記事を保存できませんでした。"},"rakulang_article_saved":{"vi":"Đã lưu bài để đọc ngoại tuyến","en":"Article saved for offline reading","ja":"オフライン閲覧用に記事を保存しました"},"rakulang_reopen":{"vi":"Mở lại RaKuLanG rồi thử tra lại.","en":"Reopen RaKuLanG and try the lookup again.","ja":"RaKuLanGを開き直して、もう一度検索してください。"},"rakulang_lookup_timeout":{"vi":"Tra từ chưa phản hồi. Kiểm tra mạng và thử lại.","en":"The lookup did not respond. Check your connection and try again.","ja":"検索の応答がありません。接続を確認して、もう一度お試しください。"},"rakulang_voice_error":{"vi":"Không lưu được cấu hình giọng đọc.","en":"Could not save voice settings.","ja":"音声設定を保存できませんでした。"},"rakulang_youtube_url":{"vi":"Đường dẫn YouTube không hợp lệ.","en":"Invalid YouTube URL.","ja":"YouTubeのURLが無効です。"},"rakulang_https_only":{"vi":"Chỉ mở địa chỉ HTTPS.","en":"Only HTTPS addresses can be opened.","ja":"HTTPSのアドレスのみ開けます。"},"rakulang_public_feed":{"vi":"Nguồn tin phải là địa chỉ Internet công khai.","en":"News feeds must use a public Internet address.","ja":"ニュース配信元には公開インターネットアドレスを使用してください。"},"rakulang_feed_url":{"vi":"Đường dẫn nguồn không hợp lệ.","en":"Invalid feed URL.","ja":"配信元のURLが無効です。"},"rakulang_feed_limit":{"vi":"Tối đa 12 nguồn tin.","en":"You can add up to 12 news feeds.","ja":"配信元は12件まで追加できます。"},"rakulang_feed_interval":{"vi":"Chu kỳ không hợp lệ.","en":"Invalid update interval.","ja":"更新間隔が無効です。"},"rakulang_feed_https":{"vi":"Nguồn RSS phải dùng HTTPS.","en":"RSS feeds must use HTTPS.","ja":"RSSの配信元にはHTTPSを使用してください。"},"rakulang_language_code":{"vi":"Mã ngôn ngữ không hợp lệ.","en":"Invalid language code.","ja":"言語コードが無効です。"},"rakulang_save_feed":{"vi":"Không lưu được nguồn.","en":"Could not save the feed.","ja":"配信元を保存できませんでした。"},"rakulang_load_feed":{"vi":"Chưa tải được nguồn.","en":"Could not load the feed.","ja":"配信元を読み込めませんでした。"},"rakulang_save_news":{"vi":"Không lưu được tin.","en":"Could not save the news.","ja":"ニュースを保存できませんでした。"},"rakulang_feed_size":{"vi":"Nguồn vượt giới hạn 4 MB.","en":"The feed exceeds the 4 MB limit.","ja":"配信データが上限の4 MBを超えています。"},"rakulang_xml_unsafe":{"vi":"XML không an toàn hoặc quá lớn.","en":"The XML is unsafe or too large.","ja":"XMLが安全でないか、サイズが大きすぎます。"},"rakulang_xml_dtd":{"vi":"XML chứa DTD.","en":"XML contains a DTD.","ja":"XMLにDTDが含まれています。"},"rakulang_article_invalid":{"vi":"Bài báo không hợp lệ.","en":"Invalid article.","ja":"記事が無効です。"},"rakulang_bookmark_limit":{"vi":"Đã có 200 bài đánh dấu. Hãy bỏ bớt bài cũ.","en":"You have 200 bookmarks. Remove some old ones first.","ja":"保存済みの記事が200件あります。古い記事をいくつか削除してください。"},"rakulang_azure_region":{"vi":"Mã vùng Azure không hợp lệ.","en":"Invalid Azure region code.","ja":"Azureのリージョンコードが無効です。"},"rakulang_azure_key":{"vi":"Khóa Azure không hợp lệ.","en":"Invalid Azure key.","ja":"Azureのキーが無効です。"},"rakulang_device_voice":{"vi":"Đang dùng giọng trên máy.","en":"Using the device voice.","ja":"端末の音声を使用しています。"},"rakulang_azure_retry":{"vi":"Azure tạm hết lượt hoặc chưa khả dụng · dùng giọng trên máy.","en":"Azure is temporarily unavailable or out of quota · using the device voice.","ja":"Azureが利用できないか上限に達しています · 端末の音声を使用します。"},"rakulang_azure_limit":{"vi":"Đã chạm giới hạn Azure của app tháng này · dùng giọng trên máy.","en":"This app's monthly Azure limit has been reached · using the device voice.","ja":"アプリ内のAzure月間上限に達しました · 端末の音声を使用します。"},"rakulang_azure_missing":{"vi":"Chưa có khóa Azure hợp lệ · dùng giọng trên máy.","en":"No valid Azure key · using the device voice.","ja":"有効なAzureキーがありません · 端末の音声を使用します。"},"rakulang_azure_bad_region":{"vi":"Vùng Azure không hợp lệ.","en":"Invalid Azure region.","ja":"Azureのリージョンが無効です。"},"rakulang_azure_unavailable":{"vi":"Azure chưa khả dụng · dùng giọng trên máy.","en":"Azure is unavailable · using the device voice.","ja":"Azureを利用できません · 端末の音声を使用します。"},"rakulang_audio_invalid":{"vi":"Audio không hợp lệ.","en":"Invalid audio.","ja":"音声データが無効です。"},"rakulang_azure_network":{"vi":"Azure lỗi hoặc mất mạng · dùng giọng trên máy.","en":"Azure failed or the connection was lost · using the device voice.","ja":"Azureのエラーまたは接続切れです · 端末の音声を使用します。"}}
for suffix, language in (("", "en"), ("-vi", "vi"), ("-ja", "ja")):
    resources = ET.Element("resources")
    for key, translations in RAKU_STRINGS.items():
        item = ET.SubElement(resources, "string", {"name":key, "formatted":"false"})
        item.text = translations[language].replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')
    target = main / ("res/values" + suffix) / "rakulang.xml"
    target.parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(resources).write(target, encoding="utf-8", xml_declaration=True)

# User-facing YouTube module branding. Keep package names and attribution assets intact.
patch(navigation, 'Text("DualSub Replay", style = MaterialTheme.typography.titleLarge)',
                  'Text("Rakubidio", style = MaterialTheme.typography.titleLarge)')
footer = dual / "ui/DrawerFooter.kt"
patch(footer, '    CheckForUpdatesRow(onOpen = { scope.launch { beforeOpen() } })\n', '')
footer_text = footer.read_text()
link_start = footer_text.index('        Text("·", style = MaterialTheme.typography.labelSmall')
link_end = footer_text.index('\n    }\n    if (showLicense)', link_start)
footer.write_text(footer_text[:link_start] + footer_text[link_end:])


# Post-ad recovery is driven by the native media poll, even with the screen off.
put(main / "assets/neutron/youtube-ad-resume.js", (HERE / "youtube-ad-resume.js").read_text())
patch(browser, "        NeutronPlayback.apply(webView)\n        webView.evaluateJavascript(WEB_VIDEO_STATE_SCRIPT)",
               "        NeutronPlayback.apply(webView)\n        NeutronAdResume.apply(webView, !lifecycleStarted && !NeutronPlayback.activeStudy())\n        webView.evaluateJavascript(WEB_VIDEO_STATE_SCRIPT)")
commands = dual / "playback/WebVideoPlayback.kt"
patch(commands, '"const request = video.play(); if (request && request.catch) request.catch(function() {});"',
                '"window.__rakuAdResume && window.__rakuAdResume.command(true); const request = video.play(); if (request && request.catch) request.catch(function() {});"')
patch(commands, 'WebVideoCommand.Pause -> "video.pause();"',
                'WebVideoCommand.Pause -> "window.__rakuAdResume && window.__rakuAdResume.command(false); video.pause();"')


# Presets and legacy accents must wrap instead of spilling off a phone's settings row.
appearance = dual / "ui/AppearanceCustomizationSettings.kt"
patch(appearance, 'private fun SettingsColorSwatchRow(',
                  '@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)\nprivate fun SettingsColorSwatchRow(')
patch(appearance, '''    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    )''', '''    androidx.compose.foundation.layout.FlowRow(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    )''')


# Resource-based onboarding/help also uses the YouTube module name in every locale.
for resource in OUT.glob("app/src/*/res/values*/*.xml"):
    if "license" in resource.name.lower(): continue
    document = ET.parse(resource)
    changed = False
    for item in document.getroot().findall("string"):
        for node in item.iter():
            for field in ("text", "tail"):
                original = getattr(node, field)
                if not original: continue
                value = original
                for old in ("DualSub Replay", "DualSub-Replay", "DualSub"):
                    value = value.replace(old, "Rakubidio")
                if value != original:
                    setattr(node, field, value)
                    changed = True
    if changed: document.write(resource, encoding="utf-8", xml_declaration=True)


# The assistant must accept and enumerate every accent the UI can save.
ai_actions = dual / "assistant/AiActions.kt"
patch(ai_actions, 'internal val AI_ACCENT_COLORS = listOf("cyan", "blue", "mint", "amber", "rose", "lavender")',
                  'internal val AI_ACCENT_COLORS = listOf("pastel_blue", "pastel_mint", "pastel_rose", "pastel_peach", "pastel_lavender", "pastel_butter", "cyan", "blue", "mint", "amber", "rose", "lavender")')
# Preserve the original strong-accent check explicitly, and add the new pastel/on-primary contract.
color_test = OUT / "app/src/test/java/com/kienhoang/dualsubreplay/ui/theme/AppColorThemeTest.kt"
patch(color_test, '''    fun theLightThemeHasDarkTextAndADarkenedAccent() {
        val light = scheme(AppColorThemeOption.LIGHT)''', '''    fun theLightThemeHasDarkTextAndADarkenedAccent() {
        val light = dualSubColorScheme("cyan", AppColorThemeOption.LIGHT.key)''')
patch(color_test, '    private fun lightness(color: Color)', '''    @Test
    fun pastelAccentsAndButtonsStayReadableInBothThemes() {
        for (key in listOf("pastel_blue", "pastel_mint", "pastel_rose", "pastel_peach", "pastel_lavender", "pastel_butter")) {
            for (theme in listOf(AppColorThemeOption.LIGHT, AppColorThemeOption.DEEP_TEAL)) {
                val colors=dualSubColorScheme(key,theme.key)
                assertTrue(key+theme.key,contrast(colors.onPrimary,colors.primary)>=4.5f)
                if (theme.isLight) {
                    for (surface in listOf(colors.background,colors.surface,colors.surfaceContainerHigh,colors.primaryContainer)) {
                        assertTrue(key+" accent on light surface",contrast(colors.primary,surface)>=4.5f)
                    }
                }
            }
        }
        assertEquals(Color(0xFF8BD4E6),com.kienhoang.dualsubreplay.ui.appThemeAccentColor("pastel_blue"))
    }

    private fun lightness(color: Color)''')

# Match the extension: observed video.currentTime, not a projected future cursor.
patch(dual / "ui/YouTubeBrowserScreen.kt",
      "val clock = CaptionPlaybackClock()", "val clock = NeutronObservedPlaybackClock()")
patch(dual / "ui/YouTubeWebScripts.kt",
      "const second = video && Number.isFinite(video.currentTime) ? video.currentTime : null;",
      """const ad = document.querySelector('.html5-video-player.ad-showing, .html5-video-player.ad-interrupting');
      const second = !ad && video && Number.isFinite(video.currentTime) ? video.currentTime : null;""")
# Timestamped tracks keep their last started row across quiet gaps. DOM text cannot
# select another row, even when words repeat or YouTube reveals a line early.
patch(dual / "ui/AppViewModel.kt",
      "val timedIndex = activeSubtitleIndex(current.segments, timeMs)",
      "val timedIndex = neutronObservedSubtitleIndex(current.segments, timeMs)")
patch(dual / "ui/KaraokeTiming.kt",
      """        val anchored = timedRow != null &&
            playbackTimeMs >= timedRow.startMs && playbackTimeMs < timedRow.endMs""",
      "        val anchored = segments != null")
# A layout wrap must not invent a new sentence timestamp inside one source chunk.
patch(dual / "data/SubtitleMerger.kt",
      "val boundaries = ends.filter { end -> starts.any { it >= end } }.distinct() + segment.originalText.length",
      """val boundaries = ends.filter { end ->
            val next = starts.indexOfFirst { it >= end }
            next > 0 && !sameNeutronCaptionChunk(segment.words[next - 1], segment.words[next])
        }.distinct() + segment.originalText.length""")
patch(dual / "data/SubtitleMerger.kt",
      "output += buildSplitSegments(segment, chunks).takeIf { it.size > 1 } ?: estimateSplitSegments(segment, chunks)",
      """val built = buildSplitSegments(segment, chunks)
            output += if (segment.words.any { it.highlightStartMs >= 0 }) built
                else built.takeIf { it.size > 1 } ?: estimateSplitSegments(segment, chunks)""")

# An untimed cue has no evidence for a word-level sentence anchor.
patch(OUT / "app/src/test/java/com/kienhoang/dualsubreplay/data/SubtitleMergerTest.kt",
"    @Test fun rowSplitInsideAnUntimedCueSeeksNearTheSpokenWord() {\n        val cues =\n            listOf(\n                RawCaptionCue(10_000, 13_500, \"how do we give it a realistic\"),\n                RawCaptionCue(12_000, 15_500, \"enough scenario so it doesn't\"),\n                RawCaptionCue(14_000, 17_000, \"think it's being tested?\"),\n            )\n        val rows = SubtitleMerger.splitLongSegments(SubtitleMerger.merge(cues))\n        val second = rows.first { it.originalText.startsWith(\"it doesn't\") }\n\n        // \"it\" is spoken inside the second cue (12–14 s); the display-time estimate put it after 14 s.\n        assertTrue(\"row starts at ${second.startMs}\", second.startMs in 12_000L until 14_000L)\n    }\n",
"    @Test fun untimedCueLayoutNeverInventsSpeechAnchors() {\n        val cues = listOf(\n            RawCaptionCue(10_000, 13_500, \"how do we give it a realistic\"),\n            RawCaptionCue(12_000, 15_500, \"enough scenario so it doesn't\"),\n            RawCaptionCue(14_000, 17_000, \"think it's being tested?\"),\n        )\n        val rows = SubtitleMerger.splitLongSegments(SubtitleMerger.merge(cues))\n        assertTrue(rows.isNotEmpty())\n        assertEquals(cues.joinToString(\" \") { it.text }, rows.joinToString(\" \") { it.originalText })\n        assertTrue(rows.all { row -> cues.any { it.startMs == row.startMs } })\n        assertTrue(rows.none { it.originalText.startsWith(\"it doesn't\") })\n    }\n")
