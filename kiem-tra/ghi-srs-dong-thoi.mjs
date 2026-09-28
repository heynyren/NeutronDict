/**
 * Hồi quy chống mất SRS: extension thật, hai trang và service worker.
 * Giữ lượt ghi thứ nhất, xác nhận lượt thứ hai chờ khóa, rồi cho cả hai xong.
 * Chạy bằng dữ liệu giả; tất cả kết quả chấm/bản vá phải được giữ lại.
 */
import assert from "node:assert/strict";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ext = path.resolve(process.argv[2] || "extension");
const output = process.argv[3] ? path.resolve(process.argv[3]) : null;
const profile = mkdtempSync(path.join(tmpdir(), "nd-srs-audit-"));
const ctx = await chromium.launchPersistentContext(profile, {
  channel: "chromium", headless: true,
  args: ["--disable-extensions-except=" + ext, "--load-extension=" + ext]
});
const report = { commit: process.env.GITHUB_SHA || "", generatedAt: new Date().toISOString(),
  method: "Concurrent real extension writers must serialize and retain both updates; synthetic notebook only.",
  cases: [], pageErrors: [] };
const A = "javi:改善", B = "javi:写真";
try {
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker");
  const id = sw.url().split("/")[2];
  await sw.evaluate(() => {
    self.fetch = () => Promise.reject(new Error("Diagnostic is offline"));
  });

  const seed = async () => sw.evaluate(async (now) => {
    const notebook = {};
    for (const [word, reading] of [["改善", "かいせん"], ["写真", "しゃじん"]]) {
      notebook["javi:" + word] = {
        word, reading, ruby: self.Kana.gonRuby(self.Kana.ghepFurigana(word, reading)),
        dict: "javi", means: [word === "改善" ? "cải thiện" : "ảnh chụp"], ts: now,
        lien: { dong: [], trai: [] },
        duong: { nhin: { lv: 2, ngay: 7, due: now - 86400000, ts: now - 8 * 86400000 } },
        srs: { lv: 2, due: now - 86400000, ts: now }
      };
    }
    await chrome.storage.local.set({ notebook, decks: {}, hoc: {}, nhipMs: {}, soDoSrs: {},
      settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false } });
  }, Date.now());
  await seed();
  const pages = [];
  for (let i = 0; i < 2; i++) {
    const page = await ctx.newPage();
    page.on("pageerror", (e) => report.pageErrors.push(e.message));
    await page.goto("chrome-extension://" + id + "/notebook.html");
    await page.waitForFunction(() => document.querySelectorAll(".entry").length === 2);
    pages.push(page);
  }
  const [page, other] = pages;
  const reset = async () => {
    await seed();
    for (const p of pages) await p.evaluate(async () => { await load(); });
  };
  const read = () => sw.evaluate(async () => (await chrome.storage.local.get(["notebook", "nhipMs"])));
  const patch = async (key, hold = false) => sw.evaluate(([key, hold]) => {
    const doc = key === "javi:改善" ? "かいぜん" : "しゃしん";
    const job = ghiVaDoc({ [key]: { doc } }, { [key]: { rb: [doc] } });
    if (hold) { self.__auditTask = job; return; }
    return job;
  }, [key, hold]);
  const grade = (p, key, hold = false) => p.evaluate(([key, hold]) => {
    const job = gradeWord(key, true, 2000, "nhin");
    if (hold) { self.__auditTask = job; return; }
    return job;
  }, [key, hold]);

  const holdNextWrite = async (surface) => surface.evaluate(() => {
    const store = chrome.storage.local;
    self.__auditOriginalSet = store.set.bind(store);
    self.__auditEntered = false;
    self.__auditHold = true;
    store.set = async (...args) => {
      if (self.__auditHold && args[0] && args[0].notebook) {
        self.__auditHold = false;
        self.__auditSnapshot = structuredClone(args[0]);
        self.__auditEntered = true;
        await new Promise((resolve) => { self.__auditRelease = resolve; });
      }
      return self.__auditOriginalSet(...args);
    };
  });
  const waitHeld = async (surface) => {
    for (let i = 0; i < 100; i++) {
      if (await surface.evaluate(() => !!self.__auditEntered)) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("Writer never reached storage.set");
  };
  const release = async (surface) => {
    const result = await surface.evaluate(async () => {
      self.__auditRelease();
      return await self.__auditTask;
    });
    await surface.evaluate(() => {
      chrome.storage.local.set = self.__auditOriginalSet;
      delete self.__auditOriginalSet;
    });
    return result;
  };

  // Đối chứng: chạy lần lượt phải giữ được cả lịch mới và cách đọc mới.
  for (const order of ["background-then-grade", "grade-then-background"]) {
    await reset();
    let result;
    if (order === "background-then-grade") {
      await patch(A); result = await grade(page, A);
    } else {
      result = await grade(page, A); await patch(A);
    }
    const after = await read();
    assert.ok(result.duong.ngay > 7, "SRS must compute a longer interval");
    assert.equal(after.notebook[A].duong.nhin.ngay, result.duong.ngay);
    assert.equal(after.notebook[A].reading, "かいぜん");
    report.cases.push({ name: order, control: true, calculatedDays: result.duong.ngay,
      persistedDays: after.notebook[A].duong.nhin.ngay, reading: after.notebook[A].reading });
  }

  const waitQueued = async () => {
    for (let i = 0; i < 100; i++) {
      const waiting = await sw.evaluate(async () =>
        (await navigator.locks.query()).pending.some((x) => x.name === self.KhoGhi.TEN));
      if (waiting) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("Concurrent writer did not wait for the shared lock");
  };
  const task = (surface) => surface.evaluate(() => self.__auditTask);

  for (const target of [A, B]) {
    await reset();
    await holdNextWrite(sw);
    await patch(target, true);
    await waitHeld(sw);
    await grade(page, A, true);
    await waitQueued();
    assert.equal((await read()).notebook[A].duong.nhin.ngay, 7);
    await release(sw);
    const result = await task(page);
    const after = await read();
    assert.ok(result.duong.ngay > 7);
    assert.equal(after.notebook[A].duong.nhin.ngay, result.duong.ngay);
    assert.equal(after.notebook[target].reading, target === A ? "かいぜん" : "しゃしん");
    report.cases.push({ name: target === A ? "background-same-word" : "background-different-word",
      sharedLockWaited: true, calculatedDays: result.duong.ngay,
      persistedDays: after.notebook[A].duong.nhin.ngay, lostSrs: false });
  }

  await reset();
  await holdNextWrite(page);
  await grade(page, A, true);
  await waitHeld(page);
  await patch(B, true);
  await waitQueued();
  const result = await release(page);
  await task(sw);
  const afterPage = await read();
  assert.equal(afterPage.notebook[B].reading, "しゃしん");
  assert.equal(afterPage.notebook[A].duong.nhin.ngay, result.duong.ngay);
  report.cases.push({ name: "page-then-background", lostReading: false, lostSrs: false });

  for (const secondKey of [A, B]) {
    await reset();
    await holdNextWrite(page);
    await grade(page, A, true);
    await waitHeld(page);
    await grade(other, secondKey, true);
    await waitQueued();
    const first = await release(page);
    const second = await task(other);
    const after = await read();
    assert.equal(after.notebook[secondKey].duong.nhin.ngay, second.duong.ngay);
    if (secondKey === A) assert.equal(second.truoc.ngay, first.duong.ngay, "second grade reads first grade");
    else assert.equal(after.notebook[A].duong.nhin.ngay, first.duong.ngay);
    assert.equal(after.nhipMs.nhin.n, 2, "both timing samples are retained");
    report.cases.push({ name: secondKey === A ? "two-pages-same-word" : "two-pages-different-word",
      samples: after.nhipMs.nhin.n, lostSrs: false });
  }

  // Xóa đang ghi thì bản vá nền phải chờ và đọc được bia mộ.
  await reset();
  await holdNextWrite(page);
  await page.evaluate((key) => {
    self.__auditTask = capNhat((nb) => { nb[key] = Muc.biaMo(nb[key]); });
  }, A);
  await waitHeld(page);
  await patch(A, true);
  await waitQueued();
  await release(page);
  await task(sw);
  assert.equal((await read()).notebook[A].del, true);
  assert.equal(await grade(other, A), null, "stale card cannot grade a tombstone");
  assert.equal((await read()).notebook[A].del, true);
  report.cases.push({ name: "delete-then-background-or-grade", tombstoneRetained: true });

  // Một lần ghi lỗi phải được báo và không làm khóa/hàng đợi kẹt.
  await reset();
  const error = await sw.evaluate(async (key) => {
    const original = chrome.storage.local.set.bind(chrome.storage.local);
    let fail = true;
    chrome.storage.local.set = (...args) => {
      if (fail && args[0].notebook) { fail = false; return Promise.reject(new Error("injected write failure")); }
      return original(...args);
    };
    try {
      await ghiVaDoc({ [key]: { doc: "かいぜん" } }, {});
      return "";
    } catch (e) { return e.message; }
    finally { chrome.storage.local.set = original; }
  }, A);
  assert.match(error, /injected write failure/);
  const recovered = await grade(page, A);
  assert.equal((await read()).notebook[A].duong.nhin.ngay, recovered.duong.ngay);
  report.cases.push({ name: "write-error-releases-lock", recovered: true });

  // Lưu lại từ trong lúc tra cách đọc chờ mạng: chấm bài không bị khóa,
  // và saveWord phải giữ cả duong lẫn srs mới nhất.
  await reset();
  await sw.evaluate(() => {
    self.__oldDocKana = docKana;
    docKana = () => new Promise((resolve) => { self.__finishLookup = resolve; });
    self.__auditTask = saveWord({ word: "改善", reading: "", means: ["cải thiện"] }, "javi");
  });
  for (let i = 0; i < 100 && !(await sw.evaluate(() => !!self.__finishLookup)); i++)
    await new Promise((resolve) => setTimeout(resolve, 25));
  const whileLookup = await grade(page, A);
  await sw.evaluate(async () => {
    self.__finishLookup({ doc: "かいぜん" });
    await self.__auditTask;
    docKana = self.__oldDocKana;
  });
  const afterSave = await read();
  assert.equal(afterSave.notebook[A].duong.nhin.ngay, whileLookup.duong.ngay);
  assert.equal(afterSave.notebook[A].reading, "かいぜん");
  report.cases.push({ name: "save-word-after-slow-lookup", preservedRoutes: true, networkOutsideLock: true });

  // Đồng bộ đã gửi snapshot cũ, trong lúc chờ trả lời người dùng vẫn chấm.
  await reset();
  await sw.evaluate(async () => {
    const snapshot = (await chrome.storage.local.get("notebook")).notebook;
    self.__oldDrive = driveRequest;
    driveRequest = async (body) => {
      if (body.action === "load") return { ok: true, data: { notebook: snapshot } };
      return new Promise((resolve) => { self.__finishSync = () => resolve({ ok: true }); });
    };
    self.__auditTask = doSync("ja");
  });
  for (let i = 0; i < 100 && !(await sw.evaluate(() => !!self.__finishSync)); i++)
    await new Promise((resolve) => setTimeout(resolve, 25));
  const whileSync = await grade(page, A);
  await sw.evaluate(async () => {
    self.__finishSync();
    await self.__auditTask;
    driveRequest = self.__oldDrive;
    clearTimeout(syncTimer);
  });
  assert.equal((await read()).notebook[A].duong.nhin.ngay, whileSync.duong.ngay);
  report.cases.push({ name: "sync-after-concurrent-grade", latestGradeRetained: true });

  // Giữ ngay tại bước lưu cuối của sync để kiểm tra khóa, không chỉ merge.
  await reset();
  await sw.evaluate(async () => {
    const snapshot = (await chrome.storage.local.get("notebook")).notebook;
    self.__oldDrive = driveRequest;
    driveRequest = async (body) => body.action === "load"
      ? { ok: true, data: { notebook: snapshot } } : { ok: true };
  });
  await holdNextWrite(sw);
  await sw.evaluate(() => { self.__auditTask = doSync("ja"); });
  await waitHeld(sw);
  await grade(page, A, true);
  await waitQueued();
  await release(sw);
  const afterSyncGrade = await task(page);
  assert.equal((await read()).notebook[A].duong.nhin.ngay, afterSyncGrade.duong.ngay);
  await sw.evaluate(() => { driveRequest = self.__oldDrive; clearTimeout(syncTimer); });
  report.cases.push({ name: "sync-final-write-lock", sharedLockWaited: true });

  // Ghi liên kết Gemini cũng phải nhường lượt chấm, dù không sửa trường SRS.
  await reset();
  await sw.evaluate(async (key) => { await geminiChoGhi({ "42": { key, ts: Date.now() } }); }, A);
  await holdNextWrite(sw);
  await sw.evaluate(() => { self.__auditTask = geminiGhiLink(42, "https://gemini.google.com/app/test"); });
  await waitHeld(sw);
  await grade(page, B, true);
  await waitQueued();
  await release(sw);
  const geminiGrade = await task(page);
  const afterGemini = await read();
  assert.equal(afterGemini.notebook[B].duong.nhin.ngay, geminiGrade.duong.ngay);
  assert.equal(afterGemini.notebook[A].hoiAi.url, "https://gemini.google.com/app/test");
  report.cases.push({ name: "gemini-link-and-grade", bothRetained: true });

  // Khóa của tab đóng phải được giải phóng, không chặn ôn ở tab còn lại.
  await reset();
  const closing = await ctx.newPage();
  await closing.goto("chrome-extension://" + id + "/notebook.html");
  await closing.waitForFunction(() => document.querySelectorAll(".entry").length === 2);
  await closing.evaluate(() => {
    self.__auditTask = KhoGhi.chay(() => {
      self.__holdingForever = true;
      return new Promise(() => {});
    });
  });
  await closing.waitForFunction(() => !!self.__holdingForever);
  await grade(page, A, true);
  await waitQueued();
  await closing.close();
  const afterClose = await task(page);
  assert.equal((await read()).notebook[A].duong.nhin.ngay, afterClose.duong.ngay);
  report.cases.push({ name: "closed-tab-releases-lock", recovered: true });

  assert.deepEqual(report.pageErrors, [], "The diagnostic must not rely on page errors");
  report.lostWriteConfirmed = report.cases.some((x) => x.lostSrs || x.lostReading);
  assert.equal(report.lostWriteConfirmed, false);
  report.status = "REGRESSIONS_PASSED";
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = "DIAGNOSTIC_ERROR";
  report.error = String(error.stack || error);
  throw error;
} finally {
  if (output) writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
}
