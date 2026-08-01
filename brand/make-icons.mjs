// Rasterize the NeutronDict SVG brand into PNG icons using headless Chromium.
//   NODE_PATH=$(npm root -g) node make-icons.mjs
// Produces extension icons (16/48/128), a 512 master, and Android adaptive assets.
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
// Resolve playwright even when installed globally (set PW_PKG to override).
const require = createRequire(import.meta.url);
const pwEntry = process.env.PW_PKG || require.resolve("playwright", { paths: (process.env.NODE_PATH || "").split(":").filter(Boolean) });
const pw = await import(pwEntry);
const chromium = pw.chromium || (pw.default && pw.default.chromium);

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const EXE = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium/chrome-linux/chrome";

const logo = readFileSync(join(here, "logo.svg"), "utf8");        // full panel (own background)
const mark = readFileSync(join(here, "logo-mark.svg"), "utf8");   // transparent mark, safe-zone scaled

// bg-only 512 for Android adaptive background layer
const bgOnly = logo
  .replace(/<!-- Cosmos orbit ring -->[\s\S]*?<circle cx="244" cy="244"[^/]*\/>/, "")
  .replace(/<\/svg>\s*$/, "</svg>");

const targets = [
  { svg: logo, out: "extension/icons/icon16.png", w: 16, transparent: false },
  { svg: logo, out: "extension/icons/icon48.png", w: 48, transparent: false },
  { svg: logo, out: "extension/icons/icon128.png", w: 128, transparent: false },
  { svg: logo, out: "brand/logo-512.png", w: 512, transparent: false },
  { svg: logo, out: "android/assets/icon.png", w: 512, transparent: false },
  { svg: mark, out: "android/assets/icon-foreground.png", w: 512, transparent: true },
  { svg: bgOnly, out: "android/assets/icon-background.png", w: 512, transparent: false },
];

const browser = await chromium.launch({ executablePath: EXE });
try {
  for (const t of targets) {
    const page = await browser.newPage({ viewport: { width: t.w, height: t.w }, deviceScaleFactor: 1 });
    const b64 = Buffer.from(t.svg, "utf8").toString("base64");
    await page.setContent(
      `<!doctype html><html><head><style>*{margin:0;padding:0}html,body{width:${t.w}px;height:${t.w}px;overflow:hidden;background:transparent}img{width:${t.w}px;height:${t.w}px;display:block}</style></head>` +
      `<body><img src="data:image/svg+xml;base64,${b64}"></body></html>`
    );
    const outPath = join(root, t.out);
    mkdirSync(dirname(outPath), { recursive: true });
    await page.screenshot({ path: outPath, omitBackground: t.transparent, clip: { x: 0, y: 0, width: t.w, height: t.w } });
    await page.close();
    console.log("✓", t.out, `${t.w}px`);
  }
} finally {
  await browser.close();
}
console.log("Done.");
