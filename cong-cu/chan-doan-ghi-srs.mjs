/**
 * Chẩn đoán ghi đồng thời trong extension thật, bằng dữ liệu giả.
 * Không phải bài kiểm thử đạt/trượt của thuật toán SRS.
 * Giữ một lượt storage.set để chủ động tạo thứ tự xen kẽ; không sửa payload.
 * Chạy: node cong-cu/chan-doan-ghi-srs.mjs <extension> <report.json>
 */
import assert from "node:assert/strict";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ext = path.resolve(process.argv[2] || "extension");
const output = path.resolve(process.argv[3] || "srs-write-report.json");
const profile = mkdtempSync(path.join(tmpdir(), "nd-srs-audit-"));
const ctx = await chromium.launchPersistentContext(profile, {
  channel: "chromium", headless: true,
  args: ["--disable-extensions-except=" + ext, "--load-extension=" + ext]
});
const report = { commit: process.env.GITHUB_SHA || "", generatedAt: new Date().toISOString(),
  method: "Controlled interleaving of actual gradeWord and ghiVaDoc in Chromium extension; synthetic notebook only.",
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

  // Background đã đọc sổ cũ; trang chấm và lưu xong; background ghi muộn.
  for (const target of [A, B]) {
    await reset();
    await holdNextWrite(sw);
    await patch(target, true);
    await waitHeld(sw);
    const held = await sw.evaluate(() => self.__auditSnapshot.notebook);
    assert.equal(held[A].duong.nhin.ngay, 7);
    const result = await grade(page, A);
    const graded = await read();
    assert.equal(graded.notebook[A].duong.nhin.ngay, result.duong.ngay);
    assert.ok(result.duong.ngay > 7);
    await release(sw);
    const after = await read();
    report.cases.push({
      name: target === A ? "stale-background-same-word" : "stale-background-different-word",
      patchedKey: target, gradedKey: A, snapshotDays: held[A].duong.nhin.ngay,
      calculatedDays: result.duong.ngay, persistedBeforeBackground: graded.notebook[A].duong.nhin.ngay,
      persistedAfterBackground: after.notebook[A].duong.nhin.ngay,
      lostSrs: JSON.stringify(graded.notebook[A].duong) !== JSON.stringify(after.notebook[A].duong),
      lostCompositeSrs: JSON.stringify(graded.notebook[A].srs) !== JSON.stringify(after.notebook[A].srs),
      readingAfter: after.notebook[target].reading,
      timingCountAfter: after.nhipMs?.nhin?.n
    });
  }

  // Thứ tự ngược: trang giữ bản cũ rồi ghi sau bản vá, làm mất cách đọc mới.
  await reset();
  await holdNextWrite(page);
  await grade(page, A, true);
  await waitHeld(page);
  await patch(B);
  const patched = await read();
  assert.equal(patched.notebook[B].reading, "しゃしん");
  const result = await release(page);
  const afterPage = await read();
  report.cases.push({ name: "stale-page-loses-background-patch", patchedKey: B, gradedKey: A,
    readingBeforePageWrite: patched.notebook[B].reading, readingAfterPageWrite: afterPage.notebook[B].reading,
    lostReading: patched.notebook[B].reading !== afterPage.notebook[B].reading,
    calculatedDays: result.duong.ngay, persistedDays: afterPage.notebook[A].duong.nhin.ngay });

  // Hai trang sổ tay có hai hàng đợi riêng, ngay cả khi chấm hai từ khác nhau.
  await reset();
  await holdNextWrite(page);
  await grade(page, A, true);
  await waitHeld(page);
  const otherResult = await grade(other, B);
  const beforeLastWrite = await read();
  assert.equal(beforeLastWrite.notebook[B].duong.nhin.ngay, otherResult.duong.ngay);
  await release(page);
  const afterBothPages = await read();
  report.cases.push({ name: "two-notebook-pages", delayedPageKey: A, overwrittenKey: B,
    calculatedDays: otherResult.duong.ngay,
    persistedBeforeLastWrite: beforeLastWrite.notebook[B].duong.nhin.ngay,
    persistedAfterLastWrite: afterBothPages.notebook[B].duong.nhin.ngay,
    lostSrs: beforeLastWrite.notebook[B].duong.nhin.ngay !== afterBothPages.notebook[B].duong.nhin.ngay });

  assert.deepEqual(report.pageErrors, [], "The diagnostic must not rely on page errors");
  report.lostWriteConfirmed = report.cases.some((x) => x.lostSrs || x.lostReading);
  report.status = report.lostWriteConfirmed ? "CONFIRMED_LOST_WRITE" : "NO_LOSS_OBSERVED";
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = "DIAGNOSTIC_ERROR";
  report.error = String(error.stack || error);
  throw error;
} finally {
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
}
