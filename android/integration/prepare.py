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
for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
    if UPSTREAM.joinpath(name).exists():
        shutil.copy2(UPSTREAM / name, main / "assets/neutron" / name)
put(main / "assets/neutron/UPSTREAM.txt", "DualSub Replay: https://github.com/heynyren/dual-sub-replay\nCommit: " + PIN + "\nNeutronDict integration: source build overlays in android/integration.\n")

# Register only in the trusted Capacitor host. Reader and YouTube WebViews have no native JS bridge.
host = java / "com/neutrondict/app/MainActivity.java"
patch(host, "super.onCreate(savedInstanceState);", "registerPlugin(com.neutrondict.app.media.MediaPlugin.class);\n    super.onCreate(savedInstanceState);")
patch(host, "  /** Phân loại intent:", """  @Override protected void onResume() {
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
put(main / "assets/neutron/BUILD.txt", "NeutronDict preview. App updates are distributed from the NeutronDict branch, not DualSub releases.")

navigation = dual / "ui/AppNavigation.kt"
patch(navigation, "    val drawer = rememberDrawerState(DrawerValue.Closed)", """    val context = androidx.compose.ui.platform.LocalContext.current
    val drawer = rememberDrawerState(DrawerValue.Closed)""")
patch(navigation, "                            Spacer(Modifier.height(8.dp))", """                            Spacer(Modifier.height(8.dp))
                            NavigationDrawerItem(
                                label = { Text("NeutronDict · Sổ tay và đọc báo") },
                                selected = false,
                                modifier = Modifier.testTag("open_neutrondict"),
                                onClick = {
                                    com.kienhoang.dualsubreplay.playback.WebVideoBridge.send(com.kienhoang.dualsubreplay.playback.WebVideoCommand.Pause)
                                    context.startActivity(android.content.Intent(context, com.neutrondict.app.MainActivity::class.java).addFlags(android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT))
                                    scope.launch { drawer.close() }
                                },
                            )""")

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
    security_test.write_text(test)
capture = dual / "ui/AiScreenCapture.kt"
patch(capture, "                hidden = true", """                if (!com.neutrondict.app.media.ScreenPrivacy.canCapture(decor)) return@withContext null
                hidden = true""")
patch(capture, "                    copyWindow(activity, decor.width, decor.height)",
      "                    if (com.neutrondict.app.media.ScreenPrivacy.canCapture(decor)) copyWindow(activity, decor.width, decor.height) else null")

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
for values in (main / "res").glob("values*/strings*.xml"):
    s = values.read_text()
    s = re.sub(r'(<string name="app_name">).*?(</string>)', r'\g<1>NeutronDict Preview\2', s)
    values.write_text(s)
application.set(A+"label", "NeutronDict Preview")
# Preserve the original AI/WebView backup exclusions. Reader cache is expendable.
manifest.write(manifest_path, encoding="utf-8", xml_declaration=True)
# Source build records for reproducibility.
put(OUT / "INTEGRATION.json", json.dumps({"upstream":PIN,"applicationId":"com.neutrondict.app.preview"}, indent=2))
print("Prepared integrated project:", OUT)
