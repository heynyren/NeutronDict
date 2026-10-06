importScripts("kho-ghi.js");   // khóa ghi chung với các trang sổ tay
importScripts("kanji-data.js");  // self.KANJI — bảng Hán tự, để tính âm Hán Việt ở nền
importScripts("kana.js");      // self.Kana — suy furigana khi từ điển không cho
importScripts("ngu.js");        // self.Ngu — hai ngôn ngữ trong một extension
importScripts("han-tu.js");     // self.HanTu — Hán tự là một loại mục của sổ tay
importScripts("srs.js");       // self.Srs — cấp độ thuộc đo bằng nhiều đường
importScripts("pdf-auto.js");
importScripts("pdf-source.js");
importScripts("web-context.js");
importScripts("cau-nghe.js");  // self.CauNghe — moi câu trọn vẹn quanh từ, cho bài nghe
importScripts("tien-do.js");   // self.TienDo — để trộn tiến độ học khi đồng bộ
importScripts("muc.js");        // self.Muc — đọc/xoá một mục sổ tay, dùng chung mọi màn

// NeutronDict — service worker (nền).
// Tra từ tiếng Anh: nghĩa tiếng Việt (Google Dịch) + phiên âm IPA, phát âm, định nghĩa &
// ví dụ tiếng Anh (Free Dictionary API). Không dùng dữ liệu Hán tự.

// ==== Cấu hình ====
const CACHE_MAX = 1000;              // số từ giữ trong bộ nhớ đệm
const CACHE_TTL = 30 * 86400000;     // 30 ngày
const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";

const DEFAULT_SETTINGS = { inline: true, requireCtrl: false, maxLen: 40 };

// ==== Menu chuột phải ====
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "tra-neutron-popup",
      title: 'Tra "%s" bằng NeutronDict',
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "luu-neutron",
      title: 'Lưu "%s" vào NeutronDict (kèm nguồn)',
      contexts: ["selection"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "tra-neutron-popup" && info.selectionText) {
    const src = await contextSource(info, tab);
    await openPopupWindow(info.selectionText, tab, src);
  } else if (info.menuItemId === "luu-neutron" && info.selectionText) {
    await handleContextSave(info, tab);
  }
});

// ==== Lưu từ menu chuột phải: dịch sang tiếng Việt + lưu kèm nguồn & ngữ cảnh ====
// Hàm này được TIÊM vào trang để lấy đoạn bôi đen + vài từ trước/sau (giúp định vị lại).
const grabSelCtx = self.WebContext.capture;

function pdfSourceUrl(info, tab) {
  // Chrome's PDF viewer may report an internal extension frame. Keep the actual document URL.
  const url = [info.frameUrl, info.pageUrl, tab && tab.url].find(u => /^(https?:|file:|blob:)/i.test(u || "")) || "";
  // The event's frame URL can omit the PDF's existing page/zoom fragment.
  const top = (tab && tab.url) || "";
  return top.includes("#") && top.split("#")[0] === url.split("#")[0] ? top : url;
}
async function contextSource(info, tab) {
  const url = pdfSourceUrl(info, tab);
  let ctx = null;
  if (tab && tab.id != null && /^(https?|file):/i.test(url) && !/\.pdf(?:[?#]|$)/i.test(url)) {
    try {
      // Existing content scripts already have access to their own DOM. Prefer messaging;
      // activeTab injection is the fallback for a tab opened before the extension loaded.
      ctx = await chrome.tabs.sendMessage(tab.id,{type:"CAPTURE_WEB_CONTEXT",word:info.selectionText||""},{frameId:info.frameId||0}).catch(()=>null);
      if (!ctx) {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id, frameIds: [info.frameId || 0] }, func: grabSelCtx, args: [info.selectionText || ""]
        });
        ctx = result[0] && result[0].result;
      }
    } catch (_) {}
  }
  const src = { url, title: ((tab && tab.title) || "").slice(0,200),
    sel: (ctx && ctx.sel) || (info.selectionText || "").trim() };
  if (/\.pdf(?:[?#]|$)/i.test(url) || (ctx && ctx.pdf)) src.pdf = true;
  if (ctx && ctx.prefix) src.prefix = ctx.prefix;
  if (ctx && ctx.suffix) src.suffix = ctx.suffix;
  if (ctx && ctx.cau) src.cau = ctx.cau;
  if (ctx && ctx.cauDich) src.cauDich = ctx.cauDich;
  if (ctx && ctx.yt) src.yt = ctx.yt;
  if (ctx) { src.contextStart = ctx.contextStart; src.contextEnd = ctx.contextEnd; src.capture = ctx.capture; }
  const c = self.CauNghe.nguCanh(src, src.sel);
  if (c) src.cau = c.cau;
  // Native PDF DOM is private. Parse the original file in a hidden extension document.
  if (!src.cau && (!ctx || ctx.pdf) && /^(https?:|file:|blob:)/i.test(url)) {
    const result = await extractPdfContext(url, src.sel, await pdfGoiY(url));
    if (result && result.ok) {
      pdfGhiNho(url, result.page);
      Object.assign(src, { cau: result.cau, pdf: true, capture: "pdf-auto",
        page: result.page, paragraph: result.paragraph, start: result.start, end: result.end,
        documentId: result.documentId, contextStatus: "complete" });
    } else if (src.pdf || (result && result.pdf)) {
      src.pdf = true; src.contextStatus = result && result.reason || "unreadable";
    }
  }
  if (src.pdf) await self.PdfSource.remember(src, tab);
  return src;
}


/**
 * @param {string} [tu] mã ngôn ngữ nguồn. Nói rõ chứ đừng để "auto": một chữ
 *   Hán trơ như 丘 thì máy dịch hay nhận nhầm là tiếng Trung rồi trả về CHÍNH
 *   chữ ấy — và thế là mục sổ tay có "nghĩa" là đúng cái từ cần học.
 */
async function translateToVi(text, tu) {
  // gtxTranslate đã gồm cả đường dự phòng Apps Script (xem dichTu).
  try { return (await gtxTranslate(text, tu || "auto", "vi")) || ""; } catch (e) { return ""; }
}

function flashBadge(txt, color) {
  try {
    chrome.action.setBadgeText({ text: txt });
    chrome.action.setBadgeBackgroundColor({ color: color || "#1a9d5a" });
    setTimeout(() => { try { chrome.action.setBadgeText({ text: "" }); } catch (e) {} }, 1600);
  } catch (e) {}
}

async function handleContextSave(info, tab) {
  const rawSel = (info.selectionText || "").replace(/\s+/g, " ").trim();
  if (!rawSel) return;
  const src = await contextSource(info, tab);
  if (src.pdf && src.cau) {
    await savePdfSelection({ word: src.sel, src });
    await reportContextSave(src); return;
  }
  const ctx = { sel: src.sel || rawSel };

  try {
    const ngu = await nguHienTai();
    const ngan = self.Ngu.nganChinh(ngu);
    const laTu = laMotTu(ctx.sel, ngu);

    /*
     * MỘT TỪ thì phải tra TỪ ĐIỂN, không phải đưa cho máy dịch.
     *
     * Lối cũ ném thẳng đoạn bôi đen cho Google Dịch rồi lấy kết quả làm nghĩa.
     * Với một câu thì đúng; với một từ thì hỏng hai đường: không có cách đọc
     * (nên không có furigana), và với một chữ Hán trơ, máy dịch trả về chính
     * chữ ấy — mục sổ tay thành ra "丘 nghĩa là 丘". Đây chính là lỗi người
     * dùng gặp khi lưu từ trong PDF.
     */
    let entry = null;
    if (laTu) {
      try {
        const kq = await handleLookup(ctx.sel, ngan);
        const k = ketQuaKhop((kq && kq.entries) || [], ctx.sel);
        if (k) {
          // Chữ lưu vào sổ LUÔN LÀ CHỮ NGƯỜI TA BÔI. Từ điển chỉ được cho mượn
          // nghĩa và cách đọc, không được quyền đổi từ.
          entry = { word: ctx.sel, means: k.e.means, reading: "", src };
          if (k.khop === "dung") {
            entry.reading = k.e.reading || "";
            if (k.e.pos && k.e.pos.length) entry.pos = k.e.pos;
            if (k.e.audio) entry.audio = k.e.audio;
          }
          // Khớp kiểu "dạng gốc" thì để trống cách đọc: かすか là của 微か, chữ
          // đang lưu là 微かな. saveWord sẽ suy đúng cách đọc cho chữ này.
        }
      } catch (e) { /* từ điển trượt -> rơi xuống đường máy dịch */ }
    }

    if (!entry) {
      // Một TỪ mà đường tra không ra gì thì máy dịch cũng vừa được hỏi trong lúc
      // tra (cùng câu hỏi, kể cả đường dự phòng) — hỏi lại chỉ bắt người dùng
      // chờ thêm một vòng timeout. Chỉ CÂU mới cần đi đường dịch riêng.
      const vi = laTu ? "" : await translateToVi(ctx.sel, ngu).catch(() => "");
      // Máy dịch trả về ĐÚNG chữ vừa gửi tức là nó không dịch được gì. Lấy cái
      // đó làm nghĩa thì mục ấy vô dụng mà lại trông như đã xong — thà để trống
      // rồi tự điền, ít ra còn biết là đang thiếu.
      const nghia = (vi && vi.trim() && vi.trim() !== ctx.sel.trim()) ? [vi] : [];
      entry = { word: ctx.sel.slice(0, 400), reading: "", means: nghia, src };
      // `kind: "sent"` cũng là thứ chặn saveWord đi hỏi cách đọc. Một TỪ thì
      // không được mang nhãn đó, kể cả khi từ điển không ra gì.
      if (!laTu) entry.kind = "sent";
    }

    await saveWord(entry, ngan);
    scheduleSync(ngu);
    await reportContextSave(src);
    // Chưa có nghĩa thì báo bằng dấu "?" (cam) thay vì dấu tích như thể đã xong;
    // nghiaVaSau (chạy từ saveWord) sẽ thử lại và điền nghĩa vào mục.
    if (!(entry.means || []).length) flashBadge("?", "#e08a00");
  } catch (e) {
    flashBadge("!", "#d33");
  }
}

/**
 * Kết quả tra nào ĐÚNG là chữ người ta vừa bôi đen?
 *
 * Đường tra giờ là Google Dịch nên thường chỉ có MỘT kết quả và nó mang đúng
 * chữ đã hỏi. Hàm này vẫn giữ làm chốt chặn: chữ đưa vào sổ phải là chữ người
 * ta bôi, không bao giờ là một chữ khác mà nguồn tra tự đề xuất (từ điển theo
 * chuỗi từng trả 微かな笑み khi bôi 微かな — người dùng mở sổ ra thấy một từ họ
 * chưa hề nhìn thấy).
 *
 * Hai kiểu khớp được chấp nhận:
 *   "dung" — trùng khít.
 *   "goc"  — chữ đã bôi là DẠNG CHIA của kết quả: 微かな→微か, 食べた→食べる.
 *            Phần dôi ra phải là kana và ngắn.
 * Và tuyệt đối không nhận kết quả DÀI HƠN chữ đã bôi: dài hơn nghĩa là nó mang
 * thêm chữ mà người ta không hề chọn.
 */
function ketQuaKhop(ds, sel) {
  const s = (sel || "").trim();
  if (!s) return null;
  const co = (ds || []).filter((e) => e && e.word && (e.means || []).length);
  const dung = co.find((e) => e.word === s);
  if (dung) return { e: dung, khop: "dung" };
  const goc = co.find((e) => e.word.length < s.length
    && s.indexOf(e.word) === 0
    && /^[\u3041-\u3096\u30a1-\u30fa\u30fc]{1,3}$/.test(s.slice(e.word.length)));
  return goc ? { e: goc, khop: "goc" } : null;
}

/**
 * Đoạn bôi đen này là MỘT TỪ hay là một CÂU?
 *
 * Không có câu trả lời hoàn hảo, nhưng ba dấu hiệu này đủ chắc: có dấu kết câu
 * thì là câu; tiếng Nhật viết liền nên một từ hiếm khi quá 12 chữ và không có
 * khoảng trắng; tiếng Anh thì một từ (hoặc một cụm hai từ như "look up").
 */
function laMotTu(s, ngu) {
  const t = (s || "").trim();
  if (!t) return false;
  if (/[.!?;…。！？；\n]/.test(t)) return false;
  if (self.Ngu.hopLe(ngu) === "ja") return t.length <= 12 && !/\s/.test(t);
  return t.length <= 32 && t.split(/\s+/).length <= 2;
}

async function openPopupWindow(rawText, tab, captured) {
  const word = (rawText || "").trim();
  const src = captured || ((word && tab && /^https?:/i.test(tab.url || ""))
    ? { url: tab.url, title: (tab.title || "").slice(0, 200), sel: word } : null);
  // Rỗng thì vẫn mở — popup tự đọc clipboard (getInitialWord), đúng cảnh
  // Ctrl+C ở một app khác rồi bấm phím tắt.
  if (word) await chrome.storage.local.set({ pendingLookup: { word, ts: Date.now(), src } });
  else await chrome.storage.local.remove("pendingLookup");
  const W = 430, H = 620;
  const opts = { url: chrome.runtime.getURL("popup.html?ctx=1"), type: "popup", width: W, height: H };
  try {
    if (tab && tab.windowId != null) {
      const win = await chrome.windows.get(tab.windowId);
      if (win && win.width) {
        opts.left = Math.max(0, (win.left || 0) + win.width - W - 24);
        opts.top = Math.max(0, (win.top || 0) + 80);
      }
    }
  } catch (e) { /* để Chrome tự đặt */ }

  // Mở cho BẰNG ĐƯỢC. Toạ độ tính ra có thể rơi ra ngoài vùng nhìn thấy — nhiều
  // màn hình, cửa sổ kéo sát mép phải, hay màn hình nhỏ hơn cửa sổ nguồn — và
  // khi đó Chrome NÉM LỖI "Bounds must be at least 50% within visible screen
  // space" rồi KHÔNG mở gì cả. Đó đúng là cảnh "bấm phím tắt mà cửa sổ không
  // hiện ra". Vấp thì bỏ toạ độ cho Chrome tự đặt; vẫn không được thì mở tab.
  try {
    await chrome.windows.create(opts);
  } catch (e) {
    delete opts.left; delete opts.top;
    try {
      await chrome.windows.create(opts);
    } catch (e2) {
      await chrome.tabs.create({ url: opts.url });
    }
  }
}

// ==== Tin nhắn ====
let syncTimer = null;
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  if (msg.type === "LOOKUP") {
    // msg.chiHanTu: chỉ cần liệt kê Hán tự trong đoạn, khỏi tra từ điển.
    handleLookup(msg.word, msg.dict || "envi", msg.chiHanTu)
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "SAVE_WORD") {
    saveWord(msg.entry, msg.dict || "envi")
      .then(() => { scheduleSync(self.Ngu.nguCuaKhoa((msg.dict || "envi") + ":")); sendResponse({ ok: true }); })
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "TRANSLATE_MANY") {
    handleTranslateMany(msg.texts, msg.from, msg.to)
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "TRANSLATE") {
    handleTranslate(msg.text, msg.from, msg.to)
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "SYNC_NOW") {
    // Không nói rõ ngôn ngữ thì đồng bộ cả hai cloud.
    (msg.ngu ? syncNow(msg.ngu) : syncTatCa()).then((n) => sendResponse({ ok: true, count: n }))
             .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "MO_GEMINI") {
    moGeminiVaCanh(msg.key)
      .then((id) => sendResponse({ ok: true, tabId: id }))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "DICH_CAU_NGHE") {
    dichCauNghe(msg.key)
      .then((t) => sendResponse({ ok: true, dich: t }))
      .catch(() => sendResponse({ ok: false, dich: "" }));
    return true;
  }
  if (msg.type === "DICH_NGU_CANH") {
    dichNguCanh(msg.key)
      .then((t) => sendResponse({ ok: true, dich: t }))
      .catch(() => sendResponse({ ok: false, dich: "" }));
    return true;
  }
  if (msg.type === "BOI_DUONG") {
    boiThemDuong(msg.toiDa)
      .then((n) => sendResponse({ ok: true, count: n }))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "VA_FURIGANA") {
    vaFurigana(msg.toiDa)
      .then((n) => sendResponse({ ok: true, count: n }))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "OPEN_LOOKUP") {
    // Content script bắt Ctrl+Shift+Z rồi nhờ nền mở cửa sổ popup — đúng đường
    // mà menu chuột phải "Tra bằng NeutronDict" vẫn dùng.
    //
    // PHẢI return true + sendResponse: mở cửa sổ là việc bất đồng bộ, mà service
    // worker MV3 có thể bị ngắt ngay khi hàm nghe tin trả về. Không giữ nó sống
    // thì đôi khi ghi xong pendingLookup là worker chết, chưa kịp tạo cửa sổ.
    openPopupWindow(msg.text || "", sender && sender.tab, msg.src)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "SYNC_SOON") { scheduleSync(msg.ngu); return; }
  if (msg.type === "IPA_CAU") {
    ipaCua(msg.text).then((ds) => sendResponse({ ok: true, ipa: ds }),
                          () => sendResponse({ ok: false, ipa: [] }));
    return true;
  }
  if (msg.type === "RUBY_CAU") {
    // Furigana cho câu đang xem ở popup. rubyCua có bộ nhớ đệm riêng nên mở lại
    // cùng một câu không tốn thêm lượt gọi nào.
    rubyCua(msg.text).then((rb) => sendResponse({ ok: true, ruby: rb }),
                           () => sendResponse({ ok: false, ruby: [] }));
    return true;
  }
  if (msg.type === "GOP_CLOUD") {
    gopCloudCu().then((n) => sendResponse({ ok: true, n }),
                      (e) => sendResponse({ ok: false, error: (e && e.message) || String(e) }));
    return true;
  }
});

/**
 * Vá furigana cho những mục ĐÃ nằm sẵn trong sổ.
 *
 * Chạy mỗi lần mở sổ tay. Phần đổi romaji sang kana thì làm hết, vì không tốn
 * gì; phần phải đi hỏi mạng thì mỗi lượt chỉ làm `toiDa` mục, để mở sổ không
 * biến thành mấy trăm lượt gọi mạng — mở vài lần là hết.
 *
 * KHÔNG đụng vào `ts`. Cách đọc suy ra là như nhau trên mọi máy, nên để yên
 * mốc thời gian thì máy nào tự vá của máy đó, mà cloud không phải nhận một
 * lượt tải lên "cả sổ vừa đổi".
 */
/**
 * Ghi một loạt bản vá vào sổ.
 *
 * Đọc LẠI sổ ngay trước khi ghi: giữa lúc vá có thể đã có lượt lưu từ khác.
 * @returns {Promise<number>} số mục thực sự đổi.
 */
async function ghiVaDoc(doi, doiRuby) {
  const keys = Object.keys(doi), keysRb = Object.keys(doiRuby);
  if (!keys.length && !keysRb.length) return 0;
  /*
   * ĐI QUA CHUNG MỘT HÀNG ĐỢI với mấy lượt vá kia.
   *
   * Hàm này đọc CẢ SỔ, sửa một trường, rồi ghi CẢ SỔ về — y hệt cauNgheVaSau và
   * cauNgheVaSau. Chạy song song với chúng thì đứa ghi sau đè lên đứa ghi
   * trước: mục vừa được bồi `lien` xong thì lượt vá furigana ghi đè bản đọc từ
   * trước đó và `lien` biến mất. Đo được: bồi cho ba từ thì chỉ một từ giữ
   * được kết quả. vaSau đã sinh ra đúng để chặn chuyện này, chỉ là hàm này
   * chưa đi qua nó.
   */
  return vaSau(async () => {
  const moi = (await chrome.storage.local.get("notebook")).notebook || {};
  for (const k of keys) {
    const it = moi[k];
    if (!it || it.del) continue;
    it.reading = doi[k].doc;
    if (doi[k].suy) it.docSuy = 1;
  }
  for (const k of keysRb) {
    const it = moi[k];
    if (!it || it.del) continue;
    it.ruby = doiRuby[k].rb;
    if (doiRuby[k].suy) it.docSuy = 1;   // ruby chuẩn từ từ điển thì không gạch "suy ra"
  }
  await chrome.storage.local.set({ notebook: moi });
  return keys.length + keysRb.length;
  });
}

/** Mục này có thuộc diện vá cách đọc không. */
function dienVaDoc(it) {
  // Thẻ chữ Hán cũng là mục tiếng Nhật. Bỏ sót nhóm này là cả một loại thẻ nằm
  // trong sổ mà không bao giờ có cách đọc — đúng thứ cần furigana nhất.
  return !!it && !it.del
    && (it.dict === "javi" || it.dict === "vija" || it.dict === "kanji");
}

/**
 * GIAI ĐOẠN 1 — vá những gì KHÔNG cần mạng, và ghi ngay.
 *
 * Hai việc, cả hai đều là ghép chuỗi thuần:
 *   - Cách đọc còn là romaji ("Hatsubai") -> đổi sang kana.
 *   - Furigana dựng LẠI từ chính cách đọc của mục.
 *
 * Việc thứ hai là chỗ chữa lỗi "furigana lệch với phiên âm": trước đây ruby đi
 * qua romaji của Google, một nguồn TÁCH khỏi cách đọc từ điển đã cho, nên có
 * ngày lệch — 発売 phiên âm はつばい mà furigana lại ra わつばい. Một nguồn thì
 * không tự lệch với mình.
 */
async function vaDocNgoaiTuyen() {
  const { notebook } = await chrome.storage.local.get("notebook");
  const nb = notebook || {};
  const doi = {}, doiRuby = {};
  for (const k of Object.keys(nb)) {
    const it = nb[k];
    if (!dienVaDoc(it)) continue;

    // Cả câu đi đường khác (furigana trên từng khúc chữ Hán) và cần mạng —
    // để giai đoạn 2.
    const coHan = self.Kana.catKhuc(it.word).some((x) => x.han);
    if (it.kind === "sent" || (coHan && !self.Kana.canDoc(it.word, ""))) continue;

    // choPhepMang = false: chỉ nhận phần đổi được tại chỗ.
    const r = await docKana(it.word, it.reading, false);
    if (r && r.doc && r.doc !== it.reading) doi[k] = r;

    const docChot = (doi[k] && doi[k].doc) || it.reading || "";
    if (docChot && !self.Kana.laRomaji(docChot) && self.Kana.canDoc(it.word, "")) {
      // MỘT cách đọc thôi: từ điển hay trả "せい/しょう/なま" trong một chuỗi, mà
      // nhét cả cụm lên đỉnh chữ thì furigana dài gấp mấy lần chữ nó chú.
      const docMot = self.Kana.motCachDoc(docChot);
      const rb = self.Kana.gonRuby(self.Kana.ghepFurigana(it.word, docMot));
      if (rb.length && rb.join("␟") !== ((it.ruby || []).join("␟"))) {
        // Cách đọc từ điển thì furigana theo nó cũng chuẩn — đừng gắn dấu "suy
        // ra". Chỉ đánh dấu khi chính cách đọc là suy.
        doiRuby[k] = { rb: rb, suy: !!(doi[k] && doi[k].suy) || !!it.docSuy };
      }
    }
  }
  return ghiVaDoc(doi, doiRuby);
}

/** Bao nhiêu mục được ghi một lần ở giai đoạn mạng. Xem vaDocQuaMang. */
const DOT_VA = 5;

/**
 * GIAI ĐOẠN 2 — những mục phải đi hỏi mạng, ghi theo từng ĐỢT NHỎ.
 *
 * Ghi theo đợt chứ không dồn tới cuối. Service worker MV3 bị dừng bất cứ lúc
 * nào, mà một vòng lặp mấy chục lượt gọi mạng nối đuôi thì rất dễ chạm giới
 * hạn — dồn tới cuối thì nó chết trước dòng ghi và MỌI thứ vừa vá đều mất, lần
 * mở sau lại làm lại từ đầu, mãi mãi không xong. Đây đúng là lý do có người mở
 * sổ hàng chục lần mà cách đọc vẫn nguyên dạng romaji.
 */
async function vaDocQuaMang(toiDa) {
  let conMang = Math.max(0, toiDa == null ? 20 : Math.min(toiDa, 20));
  if (!conMang) return 0;
  const { notebook } = await chrome.storage.local.get("notebook");
  const nb = notebook || {};
  let xong = 0, doi = {}, doiRuby = {};
  const xa = async () => { xong += await ghiVaDoc(doi, doiRuby); doi = {}; doiRuby = {}; };

  for (const k of Object.keys(nb)) {
    if (conMang <= 0) break;
    const it = nb[k];
    if (!dienVaDoc(it)) continue;

    const coHan = self.Kana.catKhuc(it.word).some((x) => x.han);
    if (it.kind === "sent" || (coHan && !self.Kana.canDoc(it.word, ""))) {
      if (!coHan) continue;                       // toàn kana: chẳng có gì để đặt furigana lên
      // "Đã ghép rồi" chưa đủ: bảng cũ bám theo từng khúc chữ Hán, sửa lại chữ
      // của mục là nó hết khớp và ruby lặng lẽ biến mất.
      if (self.Kana.rubyKhop(it.word, it.ruby)) continue;
      const rb = await rubyCua(it.word);
      conMang--;                                  // trừ cả lượt hỏi hụt
      if (rb.length) doiRuby[k] = { rb: rb, suy: true };
    } else {
      if (it.reading || !self.Kana.canDoc(it.word, "")) continue;   // giai đoạn 1 lo rồi
      const r = await docKana(it.word, "", true);
      conMang--;
      if (r && r.doc) {
        doi[k] = r;
        const rb = self.Kana.gonRuby(
          self.Kana.ghepFurigana(it.word, self.Kana.motCachDoc(r.doc)));
        if (rb.length) doiRuby[k] = { rb: rb, suy: !!r.suy };
      }
    }
    if (Object.keys(doi).length + Object.keys(doiRuby).length >= DOT_VA) await xa();
  }
  await xa();
  return xong;
}

/**
 * Nghĩa ngắn cho MỘT LOẠT từ, để bày ra sau khi chấm bài liên kết.
 *
 * Người học vừa nhặt đúng/sai một chùm từ; lúc ấy mới là lúc mấy từ kia đáng
 * nhớ nhất, mà chúng chỉ hiện ra trơ mỗi chữ Hán thì nhìn xong quên ngay.
 *
 * Chạy SONG SONG và có đệm: một đề có nhiều nhất 16 ô, làm nối đuôi thì người
 * học ngồi nhìn màn hình trống mất chục giây. Đệm theo từ nên các đề sau gặp
 * lại từ cũ là có ngay.
 */
/* ==================================================================== */
/* Nhặt lại đường link đoạn chat Gemini                                 */
/* ==================================================================== */

/*
 * Hỏi Gemini xong thì đoạn chat ấy có một địa chỉ riêng, và đó là thứ đáng
 * giữ: câu trả lời thường dài, đọc một lần không nhớ hết, mà tìm lại trong
 * lịch sử Gemini thì không có cách nào lọc theo từ.
 *
 * Không cần cắm mã vào trang của Google. Extension đã có quyền `tabs`, nên nền
 * đọc được địa chỉ của chính cái tab nó vừa mở. Gemini đổi `/app` thành
 * `/app/<mã>` bằng `pushState`, và `tabs.onUpdated` báo cả những lượt đổi kiểu
 * đó.
 *
 * CHỖ DỄ HỎNG NHẤT — và lý do phải làm đúng ngay từ đầu:
 * service worker MV3 bị giết sau khoảng 30 giây nhàn rỗi, mà người học thì
 * ngồi đọc Gemini vài phút. Nên:
 *
 *   - Bảng chờ nằm trong `chrome.storage.local`, KHÔNG phải biến của tệp này.
 *     Biến bay mất cùng service worker, và triệu chứng của nó rất dễ đọc nhầm:
 *     mọi thứ vẫn chạy, chỉ là link không bao giờ được ghi.
 *   - `tabs.onUpdated` đăng ký ở CẤP CAO NHẤT, để Chrome đánh thức nền dậy khi
 *     sự kiện nổ.
 */
const GEMINI_CHO = "geminiCho";
const GEMINI_HAN = 2 * 60 * 60 * 1000;      // quá hai tiếng thì coi như bỏ cuộc
// Chỉ nhận đoạn chat THẬT. Trang `/app` trơn là trang vừa mở, chưa có gì để
// lưu; ghi nó vào là người học bấm nút mở lại ra một ô chat trống.
const GEMINI_RE = /^https:\/\/gemini\.google\.com\/app\/([\w-]+)/;

async function geminiChoDoc() {
  const o = await chrome.storage.local.get(GEMINI_CHO);
  return (o && o[GEMINI_CHO]) || {};
}

/** Dọn mục quá hạn ngay lúc ghi — không cần hẹn giờ riêng cho việc này. */
async function geminiChoGhi(cho) {
  const bay = Date.now();
  for (const id in cho) if (!cho[id] || bay - (cho[id].ts || 0) > GEMINI_HAN) delete cho[id];
  await chrome.storage.local.set({ [GEMINI_CHO]: cho });
}

/** Mở Gemini rồi canh chính tab ấy cho tới khi nó có mã đoạn chat. */
async function moGeminiVaCanh(key) {
  const tab = await chrome.tabs.create({ url: "https://gemini.google.com/app" });
  if (!key || !tab || tab.id == null) return tab && tab.id;
  const cho = await geminiChoDoc();
  cho[String(tab.id)] = { key: key, ts: Date.now() };
  await geminiChoGhi(cho);
  return tab.id;
}

async function geminiGhiLink(tabId, url) {
  return vaSau(async () => {
  const cho = await geminiChoDoc();
  const m = cho[String(tabId)];
  if (!m || !m.key) return;
  delete cho[String(tabId)];
  await geminiChoGhi(cho);
  const nb = (await chrome.storage.local.get("notebook")).notebook || {};
  const e = nb[m.key];
  if (!e || e.del) return;                 // mục bị xoá trong lúc chờ
  // Chỉ giữ link MỚI NHẤT: hỏi lại là câu hỏi đã khác, đoạn chat cũ không còn
  // là chỗ để quay về.
  nb[m.key] = Object.assign({}, e, { hoiAi: { url: url, ts: Date.now() } });
  await chrome.storage.local.set({ notebook: nb });
  });
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  // `info.url` chỉ có khi địa chỉ vừa đổi; lượt đổi tiêu đề hay favicon thì
  // không. Lấy thêm `tab.url` cho chắc, vì với pushState thì tuỳ phiên bản
  // Chrome mà `info.url` có thể vắng mặt.
  const u = info.url || (tab && tab.url) || "";
  if (!GEMINI_RE.test(u)) return;
  geminiGhiLink(tabId, u).catch(() => {});
});

// Đóng tab mà chưa hỏi gì thì bỏ mục chờ đi, đừng để nó nằm lại chiếm chỗ.
chrome.tabs.onRemoved.addListener((tabId) => {
  geminiChoDoc().then((cho) => {
    if (!cho[String(tabId)]) return;
    delete cho[String(tabId)];
    return geminiChoGhi(cho);
  }).catch(() => {});
});

/**
 * Dịch câu NGỮ CẢNH của một mục để hiện ngay dưới nghĩa trong sổ tay.
 *
 * Mục đã có câu nghe (`cauNghe`) thì dùng đúng đường của bài nghe — một câu, một
 * bản dịch, dùng chung cho cả hai chỗ. Mục chỉ có ngữ cảnh gốc `src.cau` (câu
 * dài quá để làm bài nghe) thì lưu bản dịch vào `src.cauDich`.
 *
 * Như mọi bản vá do máy làm: không đụng `ts`/`srs`, ghi qua `vaSau`, và đọc lại
 * mục ngay trước khi ghi vì giữa lúc hỏi mạng nó có thể đã đổi hoặc bị xoá.
 */
async function dichNguCanh(key) {
  const nb0 = (await chrome.storage.local.get("notebook")).notebook || {};
  const it = nb0[key];
  if (!it || it.del) return "";
  if (it.cauNghe && it.cauNghe.cau) return dichCauNghe(key);
  const h = self.CauNghe.hienThi(it);
  if (!h) return "";
  if (h.dich) return h.dich;
  const tu = (it.dict === "javi" || it.dict === "vija") ? "ja" : "en";
  const dich = await dichChuoi(h.cau, tu, "vi");
  if (!dich || dich.trim() === h.cau.trim()) return "";
  return vaSau(async () => {
    const kho = (await chrome.storage.local.get("notebook")).notebook || {};
    const cu = kho[key];
    const hc = cu && self.CauNghe.hienThi(cu);
    if (!cu || cu.del || !hc || hc.cau !== h.cau) return "";
    if (hc.dich) return hc.dich;
    kho[key] = Object.assign({}, cu, { src: Object.assign({}, cu.src, { cauDich: dich }) });
    await chrome.storage.local.set({ notebook: kho });
    return dich;
  });
}

/**
 * Dịch CẢ CÂU của bài nghe, theo yêu cầu, rồi vá vào mục.
 *
 * Lượt bồi nền dịch với hạn ngắn nên có mục về tay trắng. Lúc người học lật
 * thẻ nghe ra mà không có bản dịch thì cả bài mất nghĩa: nghe được câu nhưng
 * không biết câu ấy nói gì. Ở đây người ta đang đứng chờ, nên dùng hạn đầy đủ.
 */
async function dichCauNghe(key) {
  const { notebook } = await chrome.storage.local.get("notebook");
  const nb = notebook || {};
  const it = nb[key];
  const cau = it && it.cauNghe && it.cauNghe.cau;
  if (!cau) return "";
  if (it.cauNghe.dich) return it.cauNghe.dich;
  const tu = (it.dict === "javi" || it.dict === "vija") ? "ja" : "en";
  const sourceVersion = it.cauNghe.ts;
  const dich = await dichChuoi(cau, tu, "vi");
  if (!dich || dich.trim() === cau.trim()) return "";
  return vaSau(async () => {
    const kho = (await chrome.storage.local.get("notebook")).notebook || {};
    const cu = kho[key];
    if (!cu || cu.del || !cu.cauNghe || cu.cauNghe.cau !== cau || cu.cauNghe.ts !== sourceVersion) return "";
    if (cu.cauNghe.dich) return cu.cauNghe.dich;
    kho[key] = Object.assign({}, cu, {
      cauNghe: Object.assign({}, cu.cauNghe, { dich: dich }) });
    await chrome.storage.local.set({ notebook: kho });
    return dich;
  });
}

/**
 * BỒI THÊM ĐƯỜNG cho những từ đã nằm sẵn trong sổ.
 *
 * Chế độ học có ba đường, nhưng hai đường sau chỉ mở khi mục CÓ DỮ LIỆU cho
 * chúng (xem Srs.duongCo):
 *     nghe -> cần cauNghe.cau              (câu ngữ cảnh chứa từ)
 *     dien -> cần cauNghe.cau + cauNghe.dich (câu và BẢN DỊCH của nó: lời hỏi)
 *
 * Hai trường ấy trước giờ chỉ được sinh ra lúc bấm Lưu một từ mới. Nên mọi từ đã
 * có trong sổ từ trước đó thì vĩnh viễn chỉ có mỗi đường "nhìn". Chúng không hỏng;
 * chúng không có dữ liệu để chạy.
 *
 * Hàm này bồi cho những mục ấy, mỗi lần mở sổ một ít: moi câu ngữ cảnh từ nguồn đã
 * lưu (miễn phí) rồi dịch câu ấy — mỗi mục một lượt gọi mạng, nên có hạn mức, mở vài
 * lần là xong. Mục có câu mà lượt dịch trước hụt thì được dịch lại.
 *
 * Không đụng `ts`, y như vaFurigana: đây là máy tự bồi thêm, không phải người
 * dùng sửa mục.
 */
// Restore only missing context from data already stored; merge inside the shared write lock.
async function phucHoiNguCanhWeb() {
  return vaSau(async () => {
    const nb=(await chrome.storage.local.get("notebook")).notebook||{};
    let count=0;
    for(const it of Object.values(nb)){
      if(!it||it.del||!it.src||!it.word)continue;
      const context=self.CauNghe.nguCanh(it.src,it.word);
      if(!context)continue;
      let changed=false;
      if(!it.src.cau){it.src=Object.assign({},it.src,{cau:context.cau});changed=true;}
      if(!it.cauNghe && it.kind!=="sent"){
        const listening=self.CauNghe.tuNguon(it.src,it.word);
        if(listening){it.cauNghe={cau:listening.cau,dich:it.src.cauDich||"",ts:Date.now()};changed=true;}
      }
      if(changed)count++;
    }
    if(count)await chrome.storage.local.set({notebook:nb});
    return count;
  });
}

async function boiThemDuong(toiDa) {
  const recovered=await phucHoiNguCanhWeb();
  let conMang = Math.max(0, toiDa == null ? 24 : Math.min(toiDa, 24));
  const { notebook } = await chrome.storage.local.get("notebook");
  const nb = notebook || {};
  let n = recovered;
  const dienBoi = (it) => {
    if (!it || it.del || it.kind === "sent") return false;
    const d = it.dict;
    return d === "javi" || d === "vija" || d === "envi" || d === "kanji";
  };

  /*
   * LƯỢT 1 — không đụng mạng, làm cho hết: gom các mục chung ngữ cảnh.
   */
  try { n += await nheChungVaSau(); } catch (e) { /* không gom được thì thôi, bài nghe vẫn chạy */ }

  // LƯỢT 2 — cần mạng để dịch câu ngữ cảnh, nên có hạn mức. Gom việc trước rồi
  // chạy SONG SONG (bốn lượt một lúc): mỗi lượt dịch là một vòng đi-về tới
  // Google, xếp hàng thì mở sổ ra chờ cả chục giây mới có bản dịch dưới nghĩa.
  const viec = [];
  for (const k of Object.keys(nb)) {
    if (viec.length >= conMang) break;
    const it = nb[k];
    if (!dienBoi(it) || !it.src) continue;
    if (it.cauNghe) {
      if (!it.cauNghe.dich) viec.push(async () => { await dichCauNghe(k).catch(() => {}); });
      continue;
    }
    // Hỏi trước xem có moi được câu không: moi hụt mà vẫn trừ hạn mức thì
    // những mục không có nguồn tử tế sẽ ăn hết lượt của các mục moi được.
    let co = null;
    try { co = self.CauNghe.tuNguon(it.src, it.word); } catch (e) { co = null; }
    if (!co) {
      // Không đủ điều kiện làm bài nghe, nhưng vẫn có ngữ cảnh để HIỆN dưới nghĩa
      // trong sổ tay — thì chỉ cần dịch nó.
      const h = self.CauNghe.hienThi(it);
      if (h && !h.dich) viec.push(async () => { try { if (await dichNguCanh(k)) n++; } catch (e) { /* mục sau */ } });
      continue;
    }
    viec.push(async () => { try { if (await cauNgheVaSau(k, it, it.dict, true)) n++; } catch (e) { /* mục sau */ } });
  }
  let ke = 0;
  await Promise.all(new Array(Math.min(4, viec.length)).fill(0).map(async () => {
    while (ke < viec.length) await viec[ke++]();
  }));
  return n;
}

/**
 * Vá cách đọc và furigana cho những mục ĐÃ nằm sẵn trong sổ.
 *
 * Chạy mỗi lần mở sổ tay. Phần ghép chuỗi làm HẾT và ghi TRƯỚC, vì nó không
 * tốn gì và không được phép phụ thuộc vào việc mạng có chạy hay không. Phần
 * phải đi hỏi mạng mỗi lượt chỉ làm một ít, ghi theo đợt — mở vài lần là hết.
 *
 * KHÔNG đụng vào `ts`. Cách đọc suy ra là như nhau trên mọi máy, nên để yên
 * mốc thời gian thì máy nào tự vá của máy đó, mà cloud không phải nhận một
 * lượt tải lên "cả sổ vừa đổi".
 */
async function vaFurigana(toiDa) {
  let n = 0;
  try {
    n += await vaDocNgoaiTuyen();
    /*
     * Báo NGAY, đừng đợi giai đoạn mạng.
     *
     * Bên sổ tay chỉ vẽ lại khi lượt vá trả lời xong, mà giai đoạn 2 có thể
     * treo cả phút vì mạng. Phần ngoại tuyến đã ghi vào kho rồi thì màn hình
     * phải thấy ngay — không thì người dùng vẫn đang nhìn đúng cái furigana sai
     * mà kho thì đã đúng từ lâu.
     */
    if (n) chrome.runtime.sendMessage({ type: "VA_FURIGANA_XONG", n: n }).catch(() => {});
  } catch (e) { /* còn giai đoạn 2 */ }
  try { n += await vaDocQuaMang(toiDa); } catch (e) { /* phần ngoại tuyến đã ghi rồi */ }
  return n;
}

/** Ngôn ngữ đang bật. Một khoá duy nhất, mọi màn đều đọc từ đây. */
async function nguHienTai() {
  const { settings } = await chrome.storage.local.get("settings");
  return self.Ngu.hopLe((settings || {}).ngu);
}

let nguHen = "";
function scheduleSync(ngu) {
  // Nhớ ngôn ngữ vừa đổi để chỉ đẩy đúng cloud đó; không rõ thì đẩy cả hai.
  nguHen = (nguHen && nguHen !== ngu) ? "" : (ngu || "");
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { (nguHen ? syncNow(nguHen) : syncTatCa()).catch(() => {}); nguHen = ""; }, 2500);
}

// ==== Google Dịch (endpoint công khai gtx) ====
// dt=t (bản dịch) + dt=bd (từ điển nhiều nghĩa theo loại từ).
//
// Làm sạch chuỗi TRƯỚC khi gửi. Bôi đen xuyên qua công thức MathJax/KaTeX kéo
// theo cả phần MathML ẩn và ký tự vô hình (zero-width, ký tự định dạng), làm
// chuỗi phình ra và lẫn thứ Google không cần. Không dọn thì hoặc URL quá dài,
// hoặc bản dịch dính rác.
function donDich(s) {
  return String(s || "")
    .normalize("NFC")
    .replace(/[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")  // vô hình / định dạng
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")                  // điều khiển
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gọi endpoint gtx cho chắc — và cho NHANH.
 *
 * Hai chuyện hay làm hỏng dịch, cả hai đều không phân biệt tiếng gì:
 *
 *  1. Đoạn DÀI: URL GET có trần cứng, Google trả 400 rồi 431 (URL/header quá
 *     khổ). Nên chuỗi dài đi POST — bỏ hẳn giới hạn URL; chuỗi ngắn vẫn GET.
 *     Cách này trượt vì lý do URL thì thử nốt cách kia.
 *
 *  2. Gọi NHIỀU: endpoint gtx công khai giới hạn tần suất theo IP — tra một hồi
 *     là nó chặn bớt, trả 429/403. Đây là chặn TẠM THỜI, tự hết. Đỡ bằng cách
 *     xoay sang một cổng Google khác (clients5): hai cổng đếm tần suất riêng nên
 *     thường một cái còn sống. Cùng đường /translate_a/single nên dạng dữ liệu
 *     trả về y hệt, chỗ đọc khỏi phải đổi.
 *
 * Cách cũ thử TUẦN TỰ — cổng treo thì chờ trọn hạn rồi mới sang cổng kia, một
 * lượt tra có thể ngốn cả chục giây. Giờ là ĐUA: cổng đầu đi ngay; sau DO_TRE ms
 * mà chưa có tin thì cổng kế đi song song, ai về trước thắng và những lượt còn
 * lại bị huỷ. Lượt trượt (429, mạng rớt) thì cổng kế đi LUÔN, không chờ hẹn giờ.
 * Cổng vừa bị chặn được xếp xuống cuối hàng một lúc (gtxXau), để lượt tra sau
 * khỏi mất một vòng đi-về vô ích vào đúng cái cổng đang chặn mình.
 */
const GTX_HOST = [
  "https://translate.googleapis.com/translate_a/single?client=gtx&",
  "https://clients5.google.com/translate_a/single?client=gtx&"
];
const GTX_DO_TRE = 1000;        // chậm hơn mức này thì bắn cổng dự phòng song song
const GTX_XAU_MS = 45000;       // cổng bị chặn thì lùi xuống cuối hàng bấy lâu
const gtxXau = {};              // cổng -> thời điểm trượt gần nhất

function gtxLanhCong(h) { return !gtxXau[h] || Date.now() - gtxXau[h] > GTX_XAU_MS; }
/** Mọi cổng đều vừa trượt: gọi tiếp gần như chắc chắn trượt, nên đi đường khác ngay. */
function gtxChet() { return GTX_HOST.every((h) => !gtxLanhCong(h)); }
function gtxThuTu(hosts) {
  return hosts.filter(gtxLanhCong).concat(hosts.filter((h) => !gtxLanhCong(h)));
}

/** MỘT lượt gọi tới MỘT cổng. Ném lỗi có `status` / `doiCach` để chỗ đua quyết định. */
async function gtxMot(host, params, enc, post, hanMs, huy) {
  const base = host + params;
  const r = post
    ? await layCoHan(base, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
        body: "q=" + enc
      }, hanMs, huy)
    : await layCoHan(base + "&q=" + enc, null, hanMs, huy);
  if (!r.ok) {
    const e = new Error("gtx HTTP " + r.status);
    e.status = r.status;
    e.doiCach = r.status === 400 || r.status === 405 || r.status === 413 || r.status === 414 || r.status === 431;
    throw e;
  }
  const data = await r.json();   // trang "Sorry…" của Google là HTML -> ném ở đây
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error("gtx: dữ liệu lạ");
  return data;
}

/**
 * @param {boolean} [nhanh] lượt chạy NGẦM: chỉ một cổng, hạn 4 giây. Lượt bồi nền
 *   cho cả sổ mà để chạy lâu thì service worker MV3 bị dừng trước khi bồi xong
 *   và lần nào mở sổ cũng làm lại từ đầu.
 */
function gtxLay(params, enc, nhanh) {
  const dai = enc.length > 4000;
  const hanMot = nhanh ? 4000 : 6000;
  const hanTong = nhanh ? 4500 : 9000;
  const hang = gtxThuTu(nhanh ? GTX_HOST.slice(0, 1) : GTX_HOST).map((h) => ({ h, post: dai }));
  return new Promise((xong, hong) => {
    const huy = new AbortController();
    let dang = 0, het = false, loi = null, hen = null;
    const thoat = (fn, v) => {
      if (het) return;
      het = true; clearTimeout(hen); clearTimeout(tong); huy.abort(); fn(v);
    };
    const tong = setTimeout(() => thoat(hong, loi || new Error("gtx: quá hạn")), hanTong);
    const tiep = () => {
      if (het) return;
      const l = hang.shift();
      if (!l) { if (!dang) thoat(hong, loi || new Error("gtx: mọi cổng đều trượt")); return; }
      dang++;
      gtxMot(l.h, params, enc, l.post, hanMot, huy.signal).then((data) => {
        delete gtxXau[l.h];
        thoat(xong, data);
      }, (e) => {
        dang--;
        if (het) return;              // thua cuộc đua (bị huỷ) — không phải lỗi của cổng
        loi = e;
        if (e && e.doiCach) { if (!nhanh && !l.thu) hang.unshift({ h: l.h, post: !l.post, thu: 1 }); }
        else gtxXau[l.h] = Date.now();
        clearTimeout(hen);
        tiep();                       // trượt thì cổng kế đi ngay, khỏi chờ hẹn giờ
      });
      clearTimeout(hen);
      if (hang.length) hen = setTimeout(tiep, GTX_DO_TRE);
    };
    tiep();
  });
}

/*
 * Đệm trong RAM + gộp lượt gọi trùng.
 *
 * Bôi đen một từ là popup bắn CÙNG LÚC hai việc — tra từ và dịch — mà với một
 * từ thì cả hai hỏi Google đúng một câu như nhau. Trước đây là hai lượt gọi
 * (đã chậm, lại còn nhanh chạm trần tần suất rồi bị chặn). Giờ lượt thứ hai bám
 * vào lời hứa đang bay của lượt thứ nhất, và lượt thứ ba trở đi lấy luôn từ RAM.
 *
 * Luôn xin dt=t + dt=bd + dt=rm trong MỘT lượt: bản dịch, các nghĩa theo loại từ
 * và phiên âm La-tinh (nguồn cho furigana). Một lượt đủ ba thứ nên không ai phải
 * quay lại hỏi thêm.
 */
const gtxDem = new Map();       // "từ>sang:chữ" -> { data, ts }
const gtxBay = new Map();       // "từ>sang:chữ" -> Promise đang bay
const GTX_DEM_MAX = 400;
const GTX_DEM_TTL = 15 * 60000;

function gtxData(from, to, text, nhanh) {
  const q = donDich(text);
  if (!q) return Promise.reject(new Error("gtx: rỗng"));
  const khoa = from + ">" + to + ":" + q;
  const c = gtxDem.get(khoa);
  if (c && Date.now() - c.ts < GTX_DEM_TTL) return Promise.resolve(c.data);
  const bay = gtxBay.get(khoa);
  if (bay) return bay;
  const params = "dt=t&dt=bd&dt=rm&sl=" + encodeURIComponent(from) + "&tl=" + encodeURIComponent(to);
  const p = gtxLay(params, encodeURIComponent(q), nhanh).then((data) => {
    if (gtxDem.size >= GTX_DEM_MAX) gtxDem.delete(gtxDem.keys().next().value);
    gtxDem.set(khoa, { data, ts: Date.now() });
    return data;
  }).finally(() => { gtxBay.delete(khoa); });
  gtxBay.set(khoa, p);
  return p;
}
function gtxMain(data) { return ((data && data[0]) || []).map((s) => (s && s[0]) || "").join("").trim(); }
function gtxSenses(data) {
  const out = [];
  for (const g of ((data && data[1]) || [])) out.push({ pos: g[0] || "", terms: (g[1] || []).slice(0, 8) });
  return out;
}
/**
 * Phiên âm La-tinh trong dữ liệu gtx (dt=rm). Google để nó ở đoạn cuối, chỗ [0]
 * rỗng: [2] là phiên âm của BẢN DỊCH, [3] là phiên âm của CHUỖI GỐC.
 */
function gtxRomaji(data, ai) {
  let rm = "";
  for (const seg of ((data && data[0]) || [])) {
    if (seg && seg[0] == null && typeof seg[ai] === "string") rm += seg[ai];
  }
  return rm.replace(/\s+/g, " ").trim();
}
// Việt hoá nhãn loại từ do Google trả về (verb/noun/…).
const POS_VI = {
  noun: "danh từ", verb: "động từ", adjective: "tính từ", adverb: "trạng từ",
  pronoun: "đại từ", preposition: "giới từ", conjunction: "liên từ", interjection: "thán từ",
  exclamation: "thán từ", determiner: "từ hạn định", article: "mạo từ", numeral: "số từ",
  "proper noun": "danh từ riêng", "auxiliary verb": "trợ động từ", particle: "tiểu từ",
  prefix: "tiền tố", suffix: "hậu tố", abbreviation: "viết tắt", phrase: "cụm từ"
};
function posVi(p) { return POS_VI[(p || "").toLowerCase()] || p; }
function meansFromSenses(main, senses) {
  const out = [];
  if (main) out.push(main);          // nghĩa chính (thông dụng nhất) lên đầu
  for (const s of (senses || [])) {
    if (s.terms && s.terms.length) out.push((s.pos ? "(" + posVi(s.pos) + ") " : "") + s.terms.join(", "));
  }
  return out.slice(0, 6);
}
/**
 * Dịch một chuỗi: Google Dịch trực tiếp, Apps Script dự phòng (xem `dichTu`).
 * Ném lỗi khi cả hai đường cùng trượt hoặc ra rỗng.
 */
async function gtxTranslate(text, f, t, nhanh) {
  const g = await dichTu(text, f || "en", t || "vi", nhanh);
  if (!g.main) throw new Error("gtx rỗng");
  return g.main;
}
async function gtxDict(text, from, to) {
  const data = await gtxData(from, to, text);
  return { main: gtxMain(data), senses: gtxSenses(data), data };
}

/**
 * Nghĩa của một từ/cụm: Google Dịch trực tiếp, Apps Script làm dự phòng.
 *
 * Hai đường chạy ĐUA chứ không nối đuôi: gtx đi ngay; nếu nó trượt thì Apps
 * Script đi LUÔN, còn nếu nó chỉ chậm thì sau DO_TRE_AS ms Apps Script mới được
 * bắn song song. Người dùng không phải ngồi chờ gtx chết hẳn (có thể cả chục
 * giây) mới được thử đường dự phòng. Mọi cổng gtx vừa trượt thì bỏ qua hẹn giờ.
 * Chưa cấu hình Apps Script thì đường dự phòng trả rỗng ngay, không tốn gì.
 *
 * @returns {Promise<{main:string, senses:Array, data:Array|null, qua:string}>}
 *   `data` chỉ có khi đi đường gtx (có kèm phiên âm); Apps Script chỉ trả bản
 *   dịch chính. Ném lỗi khi cả hai đường cùng trượt.
 */
const DO_TRE_AS = 2500;
function dichTu(text, from, to, nhanh) {
  const q = donDich(text);
  return new Promise((xong, hong) => {
    let het = false, gtxHong = false, asHong = false, asBay = false, loi = null, hen = null;
    const thang = (v) => { if (!het) { het = true; clearTimeout(hen); xong(v); } };
    const kiemHet = () => { if (!het && gtxHong && asHong) { het = true; hong(loi); } };
    const batAs = () => {
      if (asBay) return;
      asBay = true; clearTimeout(hen);
      dichMayChu(q, from, to).then((t) => {
        if (t && t.trim()) thang({ main: t.trim(), senses: [], data: null, qua: "appscript" });
        else { asHong = true; kiemHet(); }
      }, () => { asHong = true; kiemHet(); });
    };
    gtxData(from, to, q, nhanh).then((data) => {
      thang({ main: gtxMain(data), senses: gtxSenses(data), data, qua: "gtx" });
    }, (e) => { loi = e; gtxHong = true; batAs(); kiemHet(); });
    if (gtxChet()) batAs(); else hen = setTimeout(batAs, DO_TRE_AS);
  });
}

// ==== Free Dictionary API (IPA, phát âm, định nghĩa, ví dụ) ====
/*
 * Có HẠN GIỜ và có ĐỆM. Trước đây là một `fetch` trần: dictionaryapi.dev chậm
 * hay treo là cả thẻ tra từ treo theo (nó chạy song song với bản dịch nhưng
 * `await Promise.all` vẫn phải chờ cả hai). Chỉ IPA / định nghĩa phụ thuộc vào
 * nó, nên quá hạn thì cứ bỏ — nghĩa tiếng Việt vẫn ra.
 *
 * 404 ("không có từ này") được nhớ luôn, kẻo mỗi lần gặp lại một từ chia như
 * "running" lại mất một vòng đi-về để nghe lại cùng câu trả lời. Lỗi mạng thì
 * KHÔNG nhớ — lần sau còn thử lại.
 */
const dictDem = new Map();     // từ -> dữ liệu | null (404)
const dictBay = new Map();     // từ -> Promise đang bay
const DICT_DEM_MAX = 600;
const DICT_HAN = 3500;
function fetchDictionary(word) {
  const w = String(word || "").toLowerCase().trim();
  if (!w) return Promise.resolve(null);
  if (dictDem.has(w)) return Promise.resolve(dictDem.get(w));
  if (dictBay.has(w)) return dictBay.get(w);
  const p = (async () => {
    try {
      const r = await layCoHan(DICT_API + encodeURIComponent(w), null, DICT_HAN);
      if (r.status === 404) { nhoDict(w, null); return null; }
      if (!r.ok) return null;
      const data = await r.json();
      const ra = Array.isArray(data) ? data : null;
      nhoDict(w, ra);
      return ra;
    } catch (e) { return null; }
  })().finally(() => { dictBay.delete(w); });
  dictBay.set(w, p);
  return p;
}
function nhoDict(w, v) {
  if (dictDem.size >= DICT_DEM_MAX) dictDem.delete(dictDem.keys().next().value);
  dictDem.set(w, v);
}
function ipaFrom(dictData) {
  for (const d of dictData) {
    if (d.phonetic && d.phonetic.trim()) return d.phonetic.trim();
    for (const p of (d.phonetics || [])) if (p.text && p.text.trim()) return p.text.trim();
  }
  return "";
}
function audioFrom(dictData) {
  for (const d of dictData) for (const p of (d.phonetics || [])) {
    if (p.audio && p.audio.trim()) return p.audio.trim().replace(/^\/\//, "https://");
  }
  return "";
}
function posFrom(dictData) {
  const out = [];
  for (const d of dictData) for (const m of (d.meanings || [])) {
    const defs = (m.definitions || []).slice(0, 4).map((x) => ({ def: x.definition || "", ex: x.example || "" })).filter((x) => x.def);
    const syn = (m.synonyms || []).slice(0, 6);
    // Free Dictionary trả về CẢ trái nghĩa; trước giờ chỗ này vứt đi vì chưa có
    // ai dùng. Bài liên kết dùng tới, nên giữ lại.
    const ant = (m.antonyms || []).slice(0, 6);
    if (defs.length || syn.length || ant.length) out.push({ p: m.partOfSpeech || "", defs, syn, ant });
  }
  return out.slice(0, 6);
}
function firstDefOf(pos) {
  for (const g of pos) for (const d of g.defs) if (d.def) return d.def;
  return "";
}


// Có phải tiếng Việt (có dấu) không — để nhận diện nhanh trước khi gọi mạng.
function key0(text, f, t) { return f + ">" + t + ":" + text; }
function looksVietnamese(s) {
  return /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(s || "");
}

// Google Dịch với nhận diện ngôn ngữ nguồn (sl=auto). Trả về { text, src }.
async function gtxTranslateDetect(text, to) {
  const data = await gtxData("auto", to || "vi", text);
  return { text: gtxMain(data), src: (data && data[2]) || "" };
}

// ==== Tra một mục ====
/* ================== đường tra TIẾNG NHẬT (từ NJDict) ================== */

function kanjiInfo(word) {
  return self.HanTu.LIET_KE(word);
}

/** Chữ nào trong danh sách đã có trong sổ tay rồi. `nb` = sổ đã đọc sẵn. */
function savedKanji(list, nb) {
  const out = {};
  (list || []).forEach((k) => {
    const t = tomTat(nb[self.HanTu.KHOA(k.ch)]);
    if (t) out[k.ch] = t;
  });
  return out;
}

/**
 * fetch có HẠN GIỜ.
 *
 * Không có cái này thì một cổng treo là cả lượt tra treo theo: trình duyệt chờ
 * tới hạn mặc định của nó (hàng chục giây) rồi mới báo hỏng — người dùng ngồi
 * nhìn vòng quay không biết bao lâu. Thà chịu mất một lượt tra còn hơn treo.
 */
async function layCoHan(url, opt, hanMs, ngoai) {
  const bo = new AbortController();
  const dong = setTimeout(() => bo.abort(), hanMs || 6000);
  // `ngoai`: tín hiệu huỷ của chỗ đua nhiều lượt — thua cuộc thì dừng ngay,
  // khỏi chiếm kết nối tới hết hạn.
  if (ngoai) {
    if (ngoai.aborted) bo.abort();
    else ngoai.addEventListener("abort", () => bo.abort(), { once: true });
  }
  try {
    return await fetch(url, Object.assign({}, opt || {}, { signal: bo.signal }));
  } finally { clearTimeout(dong); }
}

/** Có phải văn bản tiếng Nhật không (hiragana/katakana/kanji)? */
function hasJapanese(s) { return /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(s || ""); }

/* ====================================================================== */
/* Furigana                                                               */
/* ====================================================================== */
/*
 * Cách đọc của một từ tiếng Nhật không còn đến từ từ điển nào: Google Dịch trả
 * phiên âm La-tinh (dt=rm) cùng lượt với bản dịch, rồi kana.js đổi ngược về
 * hiragana. Một mục nằm trong sổ mà không đọc nổi thì đến buổi ôn là bỏ qua, nên
 * ở đây vá các chỗ còn hụt:
 *
 *   - cách đọc đang là romaji  -> đổi ngược về hiragana, không tốn một lần gọi
 *     mạng nào;
 *   - không có cách đọc gì cả  -> hỏi phiên âm của Google (dt=rm) rồi đổi.
 *
 * Cách đọc suy ra được đánh dấu `docSuy` để giao diện nói thật với người đọc:
 * romaji đã đánh mất một phần thông tin (ō là おう hay おお?) nên chỗ nào phải
 * đoán thì đây chọn lối phổ biến hơn, và có thể trật.
 */

/** Đệm cách đọc theo từ, để tra lại cùng một từ không gọi mạng lần nữa. */
const kanaDem = new Map();

/**
 * Phiên âm La-tinh của một chuỗi tiếng Nhật (dt=rm).
 *
 * Đi chung đường `gtxData` với bản dịch nên lượt tra từ vừa xong đã mang sẵn
 * phiên âm trong đệm — lưu từ vào sổ hay ghép furigana khỏi hỏi Google lần nữa.
 */
async function romajiCua(text) {
  return gtxRomaji(await gtxData("ja", "vi", text), 3);
}

/**
 * Cách đọc bằng kana cho một từ.
 * @returns {Promise<{doc: string, suy: boolean}|null>} null = cứ để nguyên.
 * @param {boolean} [choPhepMang] có được gọi mạng không. Lúc tra một lượt hai
 *   chục kết quả thì không, lúc BẤM LƯU một từ thì có — chỗ đó chỉ một từ, mà
 *   lại đúng là chỗ người dùng cần có furigana nhất.
 */
/** Những chữ đang có một lượt hỏi mạng bay dở — xem chú thích trong docKana. */
const kanaBay = new Map();

async function docKana(word, reading, choPhepMang) {
  const K = self.Kana;
  const w = (word || "").trim();
  if (!w || !hasJapanese(w)) return null;

  // Cách đọc đang là romaji: đổi tại chỗ, khỏi mạng.
  if (K.laRomaji(reading)) {
    const k = K.tuRomajiCum(reading);
    return k ? { doc: k, suy: true } : null;      // không đổi được thì giữ romaji còn hơn mất
  }
  if (reading && String(reading).trim()) return null;   // đã có kana rồi

  const san = K.docSan(w);
  if (san) return { doc: san, suy: false };             // toàn kana: chính nó là cách đọc
  if (!K.canDoc(w, reading) || !choPhepMang) return null;

  if (kanaDem.has(w)) { const c = kanaDem.get(w); return c ? { doc: c, suy: true } : null; }
  // Mọi cổng Google vừa trượt: hỏi nữa chỉ làm nút Lưu đứng chờ. Mục vẫn được
  // lưu, `vaFurigana` sẽ bồi cách đọc sau.
  if (gtxChet()) return null;
  // Chạy song song rồi thì hai kết quả cùng một chữ sẽ cùng lúc thấy đệm rỗng
  // và cùng đi hỏi mạng. Giữ lại lời hứa đang bay để lượt sau bám vào.
  if (kanaBay.has(w)) { const c = await kanaBay.get(w); return c ? { doc: c, suy: true } : null; }
  const hua = (async () => {
    let k = "";
    try { k = self.Kana.tuRomajiCum(await romajiCua(w)); } catch (e) { k = ""; }
    kanaDem.set(w, k);
    kanaBay.delete(w);
    return k;
  })();
  kanaBay.set(w, hua);
  const k = await hua;
  return k ? { doc: k, suy: true } : null;
}

/** Vá cách đọc cho cả danh sách kết quả tra. Chỉ vài mục đầu mới được gọi mạng. */
async function themDoc(entries, soDuocGoiMang) {
  const ds = entries || [];
  const n = soDuocGoiMang || 0;
  /*
   * SONG SONG, không nối đuôi.
   *
   * Bốn kết quả đầu đều được phép hỏi mạng, mà mỗi lượt hỏi là một vòng đi-về
   * tới Google. Vòng `for … await` cũ bắt chúng xếp hàng: đo trên một lượt tra
   * 丘 với độ trễ 300ms mỗi lượt thì mất 1.510ms, các lượt bắt đầu cách nhau
   * đúng 300ms — nối đuôi thấy rõ. Chúng chẳng phụ thuộc gì vào nhau cả.
   *
   * Đây đúng là lỗi tôi từng mắc ở phần IPA và đã sửa; chỗ này sót lại.
   */
  await Promise.all(ds.map(async (e, i) => {
    const r = await docKana(e.word, e.reading, i < n);
    if (r) { e.reading = r.doc; if (r.suy) e.docSuy = 1; else delete e.docSuy; }
  }));
  return ds;
}

/**
 * Cách đọc IPA cho từng từ của một câu TIẾNG ANH.
 *
 * Câu tiếng Nhật đã có furigana; câu tiếng Anh thì trước giờ trơ ra một dòng
 * chữ Latin, mà chữ Latin đọc được không có nghĩa là đọc ĐÚNG — "vows",
 * "seeking", "funding" mỗi chữ một kiểu. Nên chú IPA lên trên, đúng chỗ và
 * đúng vai như furigana.
 *
 * Từ điển chỉ tra được TỪNG TỪ, nên câu dài là nhiều lượt gọi. Ba chốt để nó
 * không thành gánh nặng:
 *   - Đệm theo TỪ, không theo câu: "the", "of", "is" tra một lần rồi dùng mãi,
 *     nên càng dùng càng ít phải hỏi mạng.
 *   - Mỗi câu chỉ cho phép một số lượt hỏi mạng nhất định; phần còn lại lấy
 *     những gì đã có trong đệm, chữ nào chưa có thì để trần.
 *   - Từ nào từ điển không có IPA thì BỎ TRỐNG, không bịa.
 */
const ipaDem = new Map();
const IPA_TOI_DA_HOI = 14;      // số từ được phép hỏi mạng trong MỘT câu

async function ipaCua(text) {
  const cau = String(text || "").trim();
  if (!cau) return [];
  // Tách giữ nguyên dấu câu và khoảng trắng: chỉ mẩu có chữ cái mới đi tra.
  const mieng = cau.split(/(\s+)/);
  const khoaCua = (m) => {
    if (!m.trim()) return "";
    const sach = m.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "").toLowerCase();
    return /[a-z]/.test(sach) ? sach : "";
  };

  // Những từ THẬT SỰ phải hỏi mạng: chưa có trong đệm, và mỗi từ chỉ một lần
  // dù nó lặp lại mấy lần trong câu.
  const canHoi = [];
  for (const m of mieng) {
    const k = khoaCua(m);
    if (k && !ipaDem.has(k) && canHoi.indexOf(k) < 0) canHoi.push(k);
  }
  const hoi = canHoi.slice(0, IPA_TOI_DA_HOI);

  /*
   * Hỏi SONG SONG, không nối đuôi nhau.
   *
   * Bản đầu tiên viết `await` ngay trong vòng lặp, nên một câu mười ba từ là
   * mười ba lượt gọi xếp hàng — đo được 2 468 ms trong khi bản dịch đã xong từ
   * giây thứ 0,5. Chạy song song thì cả loạt tốn đúng bằng lượt chậm nhất.
   *
   * Vẫn chặn số lượng cùng lúc: mở mười bốn kết nối một phát tới cùng một máy
   * chủ là cách nhanh nhất để bị nó chặn.
   */
  const SONG = 6;
  let ke = 0;
  await Promise.all(new Array(Math.min(SONG, hoi.length)).fill(0).map(async () => {
    while (ke < hoi.length) {
      const k = hoi[ke++];
      let ip = "";
      try { const d = await fetchDictionary(k); if (d) ip = ipaFrom(d) || ""; } catch (e) { ip = ""; }
      if (ipaDem.size > 3000) ipaDem.clear();
      ipaDem.set(k, ip);
    }
  }));

  return mieng.map((m) => {
    const k = khoaCua(m);
    return { t: m, r: (k && ipaDem.get(k)) || "" };
  });
}

/**
 * Furigana cho một CÂU, đặt trên từng khúc chữ Hán.
 *
 * Vì sao không dùng `docKana`: nó trả về MỘT dòng kana cho cả cụm, mà một dòng
 * kana dài bằng cả câu thì đọc còn mệt hơn đọc chữ Hán. Cách đọc của câu phải
 * nằm đúng trên chữ sinh ra nó. Xem kana.js: xin kana của cả câu rồi trừ đi
 * phần kana đã có sẵn trong câu để suy ra phần của từng khúc chữ Hán.
 *
 * @returns {Promise<string[]>} cách đọc của các khúc chữ Hán, đúng thứ tự.
 *   [] = canh không khớp; furigana đặt sai chỗ còn tệ hơn không có.
 */
const rubyDem = new Map();
async function rubyCua(text) {
  const w = (text || "").trim();
  if (!w || !hasJapanese(w)) return [];
  if (rubyDem.has(w)) return rubyDem.get(w);
  let ra = [];
  try {
    const kana = self.Kana.tuRomajiCum(await romajiCua(w));
    ra = kana ? self.Kana.gonRuby(self.Kana.ghepFurigana(w, kana)) : [];
  } catch (e) { ra = []; }
  if (rubyDem.size > 400) rubyDem.clear();
  rubyDem.set(w, ra);
  return ra;
}

/**
 * Dựng câu ngữ cảnh + bản dịch cho một mục ĐÃ nằm trong sổ, rồi vá tại chỗ.
 *
 * Không đụng `ts` và không đụng `srs`: đây là máy tự bồi thêm dữ liệu, không
 * phải người dùng sửa mục. Chạm vào `ts` là lượt đồng bộ sau tưởng mục vừa được
 * sửa và đem nó đi đè lên bản ở máy kia.
 */
/** @param {boolean} [nhanh] lượt bồi nền: dịch với hạn ngắn, xem gtxLay. */
async function cauNgheVaSau(key, e, dict, nhanh) {
  const c = self.CauNghe.tuNguon(e.src, e.word);
  if (!c) return false;
  const saved = await vaSau(async () => {
    const nb = (await chrome.storage.local.get("notebook")).notebook || {};
    const cu = nb[key];
    if (!cu || cu.del || cu.cauNghe ||
        JSON.stringify(cu.src || {}) !== JSON.stringify(e.src || {})) return false;
    nb[key] = Object.assign({}, cu, {
      src: Object.assign({}, cu.src, { cau: c.cau }),
      cauNghe: { cau: c.cau, dich: "", ts: Date.now() }
    });
    await chrome.storage.local.set({ notebook: nb });
    return true;
  });
  if (saved) {
    nheChungVaSau().catch(() => {});
    await dichCauNghe(key).catch(() => "");
    scheduleSync(self.Ngu.nguCuaKhoa(key));
  }
  return saved;
}

/**
 * Điền nghĩa cho một mục vừa lưu mà còn trắng nghĩa.
 *
 * Đây là lỗi "bôi đen, chuột phải, lưu — mở sổ ra không thấy nghĩa": lúc lưu mà
 * cả Google lẫn Apps Script cùng trượt thì mục vẫn được lưu (con chữ đáng giữ),
 * nhưng không còn ai quay lại hỏi. Giờ hỏi lại một lần sau vài giây, khi cơn
 * chặn tần suất tạm thời đã nguôi. Bản sửa tay của người dùng (`mEdit`) hay
 * nghĩa đã có thì không bao giờ bị đè.
 */
async function nghiaVaSau(key, word, dict) {
  await new Promise((r) => setTimeout(r, 3000));
  const vi = String(await dichChuoi(word, dict === "javi" ? "ja" : "en", "vi") || "").trim();
  if (!vi || vi === String(word).trim()) return;
  const ghi = await vaSau(async () => {
    const nb = (await chrome.storage.local.get("notebook")).notebook || {};
    const it = nb[key];
    if (!it || it.del || it.mEdit || (it.means || []).length) return false;
    // Bump `ts`: đây là nội dung người dùng đọc, máy kia phải nhận được.
    nb[key] = Object.assign({}, it, { means: [vi], ts: Date.now() });
    await chrome.storage.local.set({ notebook: nb });
    return true;
  });
  if (ghi) scheduleSync(self.Ngu.nguCuaKhoa(key));
}

/**
 * Gom các từ CÙNG NGỮ CẢNH về một đường nghe chung — xem CauNghe.nhomChung.
 *
 * Chạy sau mỗi lần dựng câu nghe và mỗi lượt mở sổ (BOI_DUONG). Không gọi mạng và
 * không đụng `ts`/`srs`; chỉ ghi khi có mục thật sự đổi nên không thêm một lượt ghi
 * cả sổ nào vào đường người dùng đang chờ.
 * @returns {Promise<number>} số mục đổi
 */
async function nheChungVaSau() {
  const nb0 = (await chrome.storage.local.get("notebook")).notebook || {};
  if (!self.CauNghe.capNhatNheChung(nb0, true)) return 0;       // quét thử trên bản đọc, khỏi vào hàng đợi ghi
  return vaSau(async () => {
    const nb = (await chrome.storage.local.get("notebook")).notebook || {};
    const n = self.CauNghe.capNhatNheChung(nb);
    if (n) await chrome.storage.local.set({ notebook: nb });
    return n;
  });
}

/** Ghép furigana cho một mục ĐÃ nằm trong sổ, rồi vá tại chỗ. Không đụng `ts`. */
/**
 * Xếp hàng cho các lượt VÁ SAU KHI LƯU.
 *
 * Một lượt lưu châm ngòi cho ba việc chạy ngầm: ghép furigana, moi câu ngữ
 * cảnh, tìm từ liên. Cả ba đều đọc CẢ SỔ TAY, sửa một trường, rồi ghi CẢ SỔ
 * TAY về. Chạy song song thì đứa ghi sau đè lên đứa ghi trước và làm mất trường
 * của nó — đúng như bài kiểm bắt được: mục có `lien` thì mất `ruby`.
 *
 * Nối đuôi chúng lại. Đây là việc chạy ngầm, chậm hơn vài trăm mili-giây không
 * ai thấy; mất dữ liệu thì thấy.
 */
let hangVa = Promise.resolve();
function vaSau(lam) {
  const chay = hangVa.then(() => self.KhoGhi.chay(lam));
  hangVa = chay.catch(() => {}); // lỗi không làm kẹt lượt sau
  return chay;                   // caller vẫn nhận được lỗi ghi
}

async function rubyVaSau(key, word) {
  // Lượt hỏi Google để ghép furigana làm NGOÀI hàng đợi — xem cauNgheVaSau.
  const rb = await rubyCua(word);
  if (!rb.length) return;
  return vaSau(async () => {
    const { notebook } = await chrome.storage.local.get("notebook");
    const nb = notebook || {};
    const it = nb[key];
    // Đọc lại ngay trước khi ghi: giữa lúc hỏi mạng có thể đã có lượt lưu khác,
    // mà mục cũng có thể đã bị xoá.
    if (!it || it.del || self.Kana.rubyKhop(it.word, it.ruby)) return;
    it.ruby = rb;
    it.docSuy = 1;
    await chrome.storage.local.set({ notebook: nb });
  });
}

/* ====================================================================== */

/**
 * Tra một từ TIẾNG NHẬT → Việt, hoàn toàn bằng Google Dịch.
 *
 * MỘT lượt gọi cho cả ba thứ: bản dịch chính, các nghĩa theo loại từ (dt=bd) và
 * phiên âm La-tinh (dt=rm) — từ phiên âm đó kana.js dựng lại cách đọc hiragana.
 * Cách đọc này là SUY RA (romaji mất thông tin: ō là おう hay おお?) nên được
 * đánh `docSuy` để giao diện nói thật; từ toàn kana thì chính nó là cách đọc.
 *
 * Google Dịch không phải từ điển nên chỉ có MỘT mục, mang đúng chữ đã hỏi.
 * Đổi lại không còn kết quả "gần đúng" của từ khác lọt vào sổ.
 */
async function lookupJa(word) {
  let g = null;
  try { g = await dichTu(word, "ja", "vi"); } catch (e) { g = null; }
  if (!g) return [];
  // Google trả đúng chữ vừa gửi tức là nó không dịch được — đừng lấy làm nghĩa.
  const means = meansFromSenses(g.main, g.senses).filter((m) => m.trim() !== word);
  if (!means.length) return [];
  const K = self.Kana;
  let reading = K.docSan(word), suy = false;
  if (!reading && g.data && K.canDoc(word, "")) {
    const k = K.tuRomajiCum(gtxRomaji(g.data, 3));
    if (k) { reading = k; suy = true; kanaDem.set(word, k); }
  }
  const entry = { word, reading: reading || "", means, dict: "javi" };
  if (suy) entry.docSuy = 1;
  return [entry];
}

/**
 * Việt → Nhật: dịch sang tiếng Nhật; cách đọc lấy luôn từ phiên âm của chính
 * lượt dịch đó (đoạn dt=rm của bản DỊCH, không phải của chuỗi gốc).
 *
 * Vì sao phải có cách đọc: một từ tiếng Nhật trơ gần như luôn là chữ Hán, mà
 * chữ Hán không có cách đọc thì người học không đọc lên được — tức là không
 * dùng được để nói, đúng thứ họ đang cần. Mấy cách nói khác cho cùng một ý (các
 * nghĩa theo loại từ) đi kèm để chọn đúng sắc thái.
 */
async function lookupViJa(word) {
  let g = null;
  try { g = await dichTu(word, "vi", "ja"); } catch (e) { g = null; }
  const ja = g ? g.main : "";
  if (!ja) return [];
  const K = self.Kana;
  const entry = { word: ja, reading: K.docSan(ja), means: [word], dict: "vija" };
  if (!entry.reading && g.data && K.canDoc(ja, "")) {
    const k = K.tuRomajiCum(gtxRomaji(g.data, 2));
    if (k) { entry.reading = k; entry.docSuy = 1; kanaDem.set(ja, k); }
  }
  const thay = [];
  for (const sn of (g.senses || [])) for (const t of (sn.terms || [])) {
    const x = String(t || "").trim();
    if (x && x !== ja && thay.indexOf(x) < 0) thay.push(x);
  }
  const khac = thay.slice(0, 5).map((x) => ({ word: x, reading: "", means: [word], dict: "vija" }));
  // Cách đọc cho mấy cách nói khác: chỉ vài mục đầu được hỏi mạng, song song.
  const ds = await themDoc([entry].concat(khac), 3);
  return ds;
}

async function lookupEntry(rawWord, dict) {
  const word = (rawWord || "").trim();
  if (!word) return [];

  // Tiếng Nhật đi đường Google Dịch; tiếng Anh đi các đường bên dưới.
  if (dict === "javi" || dict === "jvi") return lookupJa(word);
  if (dict === "vija") return lookupViJa(word);

  if (dict === "vien") {
    // Việt -> Anh: lấy từ tiếng Anh (nhiều lựa chọn) rồi làm giàu IPA/định nghĩa
    let gv = null;
    try { gv = await dichTu(word, "vi", "en"); } catch (e) { gv = null; }
    const en = gv ? gv.main : "";
    if (!en) return [];
    const dictData = await fetchDictionary(en);
    const synonyms = (gv.senses || []).map((s) => ({ p: s.pos, defs: [], syn: s.terms })).filter((s) => s.syn.length);
    const entry = {
      word: en,
      reading: dictData ? ipaFrom(dictData) : "",   // phiên âm IPA chuẩn
      audio: dictData ? audioFrom(dictData) : "",
      means: [word],                 // đầu vào tiếng Việt chính là nghĩa
      pos: (dictData ? posFrom(dictData) : []).concat(synonyms).slice(0, 8),
      dict: "vien"
    };
    return [entry];
  }

  // Anh -> Việt (mặc định): nghĩa tiếng Việt NHIỀU TẦNG (dt=bd)
  const [dictData, gv] = await Promise.all([
    fetchDictionary(word),
    dichTu(word, "en", "vi").catch(() => null)
  ]);
  const pos = dictData ? posFrom(dictData) : [];
  const means = gv ? meansFromSenses(gv.main, gv.senses) : [];
  if (!means.length) { const fd = firstDefOf(pos); if (fd) means.push("(EN) " + fd); }

  const entry = {
    word: word,
    reading: dictData ? ipaFrom(dictData) : "",   // phiên âm IPA chuẩn
    audio: dictData ? audioFrom(dictData) : "",
    means: means,
    pos: pos,
    dict: "envi"
  };
  if (!entry.means.length && !entry.pos.length && !entry.reading) return [];
  return [entry];
}

// Tự động nhận diện: tiếng Việt -> tra Việt→Anh, còn lại -> tra Anh→Việt.
async function lookupAuto(word) {
  if (looksVietnamese(word)) return lookupEntry(word, "vien");
  const en = await lookupEntry(word, "envi");
  if (en.length) return en;
  // Không ra kết quả tiếng Anh -> có thể là tiếng Việt không dấu / ngôn ngữ khác
  let src = "";
  try { const d = await gtxTranslateDetect(word, "en"); src = d.src; } catch (e) {}
  if (src && !src.startsWith("en")) return lookupEntry(word, "vien");
  return en;
}

// ==== Tra từ + bộ nhớ đệm ====
/**
 * @param {boolean} [chiHanTu] chỉ cần danh sách Hán tự, bỏ qua từ điển.
 *   Dùng khi bôi đen cả đoạn văn: tra nguyên đoạn như một từ thì chắc chắn
 *   rỗng, gọi mạng chỉ tổ chậm — mà Hán tự trong đoạn thì vẫn phải liệt kê đủ.
 */
async function handleLookup(rawWord, dict, chiHanTu) {
  const word = (rawWord || "").trim();
  if (!word) return { ok: false, error: "Chưa có từ" };
  const key = dict + ":" + word;

  // Hán tự chỉ có nghĩa ở phía tiếng Nhật; bên tiếng Anh thì bỏ qua hẳn cho nhẹ.
  const laJa = (dict === "javi" || dict === "kanji");
  const ks = () => (laJa ? kanjiInfo(word) : []);

  // Đọc sổ tay SONG SONG với việc tra (để biết từ nào đã lưu), và đọc đúng MỘT
  // lần: trước đây `savedKeys` và `savedKanji` mỗi bên đọc cả sổ một lượt, mà
  // sổ vài nghìn mục thì mỗi lượt đọc là hàng chục mili-giây.
  const nbP = chrome.storage.local.get("notebook").then((o) => o.notebook || {}, () => ({}));

  if (chiHanTu) {
    const k0 = ks();
    return { ok: true, word, dict, entries: [], kanji: k0, saved: {}, savedKanji: savedKanji(k0, await nbP) };
  }

  const c = await demTra.lay();
  const hit = c[key];
  const now = Date.now();
  if (hit && (now - (hit.ts || 0) < CACHE_TTL)) {
    const kC = ks(), nb = await nbP;
    return {
      ok: true, word, dict, entries: hit.entries, kanji: kC,
      saved: savedKeys(hit.entries, dict, nb), savedKanji: savedKanji(kC, nb), cached: true
    };
  }

  const entries = (dict === "auto") ? await lookupAuto(word) : await lookupEntry(word, dict);
  if (entries.length) {
    c[key] = { entries, ts: now };
    trimCache(c);
    demTra.ghi();
  }
  const kR = ks(), nb = await nbP;
  return {
    ok: true, word, dict, entries, kanji: kR,
    saved: savedKeys(entries, dict, nb), savedKanji: savedKanji(kR, nb)
  };
}

/**
 * Bộ đệm bền, giữ trong RAM của service worker, ghi xuống đĩa theo lô.
 *
 * Cách cũ đọc CẢ bộ đệm (tới 1.000 từ, hàng trăm KB) rồi ghi lại cả bộ đệm sau
 * MỖI lượt tra — phần việc đó chạy ngay trên đường người dùng đang chờ. Giờ đọc
 * đúng một lần khi service worker thức dậy, lượt tra sau chỉ chạm RAM, và việc
 * ghi được gom lại sau `hanMs` ms yên tĩnh. Service worker MV3 chỉ bị dừng sau
 * ~30 giây rảnh nên một nhịp ghi 1,5 giây là an toàn.
 *
 * Bộ đệm bị xoá từ nơi khác (nút "xoá bộ đệm" trong sổ tay ghi `{}`) thì bản
 * trong RAM cũng bỏ theo, kẻo lượt ghi kế tiếp chép lại đúng cái vừa xoá.
 *
 * @param {(o:object)=>void} [loc] chỉnh bộ đệm vừa nạp (gỡ mục cũ không còn dùng).
 */
function demBen(khoa, loc, hanMs) {
  let mem = null, nap = null, hen = null;
  const lay = () => {
    if (mem) return Promise.resolve(mem);
    if (!nap) {
      nap = chrome.storage.local.get(khoa).then((o) => {
        mem = o[khoa] || {};
        if (loc) loc(mem);
        return mem;
      }, () => { mem = {}; return mem; });
    }
    return nap;
  };
  const day = async () => {
    clearTimeout(hen); hen = null;
    if (mem) await chrome.storage.local.set({ [khoa]: mem });
  };
  const ghi = () => { if (!hen) hen = setTimeout(() => { day().catch(() => {}); }, hanMs || 1500); };
  chrome.storage.onChanged.addListener((ch, vung) => {
    if (vung !== "local" || !ch[khoa]) return;
    const nv = ch[khoa].newValue;
    if (!nv || !Object.keys(nv).length) { mem = null; nap = null; }
  });
  return { lay, ghi, day };
}
// Mục tra tiếng Nhật còn lại từ thời Mazii: bỏ đi, để từ nay chỉ có kết quả của
// Google Dịch (thêm nữa là chúng có thể mang nghĩa/cách đọc sai mà không ai biết).
const demTra = demBen("cache", (o) => { for (const k in o) if (/^(javi|vija|jvi):/.test(k)) delete o[k]; });
const demDich = demBen("trCache");

function trimCache(c) {
  const keys = Object.keys(c);
  if (keys.length <= CACHE_MAX) return;
  keys.sort((a, b) => (c[a].ts || 0) - (c[b].ts || 0));
  const drop = keys.length - CACHE_MAX;
  for (let i = 0; i < drop; i++) delete c[keys[i]];
}

/**
 * Tóm tắt một mục trong sổ tay cho các màn tra cứu.
 *
 * Bao gồm cả mục ĐÃ XOÁ mà bạn từng sửa tay: xem muc.js để biết vì sao bản dịch
 * của bạn phải sống lâu hơn mục đã xoá.
 */
function tomTat(en) { return self.Muc.banCuaBan(en); }

function savedKeys(entries, dict, nb) {
  const out = {};
  (entries || []).forEach((e) => {
    const t = tomTat(nb[(e.dict || dict) + ":" + e.word]);
    if (t) out[e.word] = t;
  });
  return out;
}

/**
 * Dịch NHIỀU câu trong một lượt.
 *
 * Vì sao cần hàm riêng thay vì gọi handleTranslate nhiều lần: mỗi lượt dịch lẻ
 * phải ĐỌC cả bộ đệm rồi GHI lại cả bộ đệm (tối đa 300 mục) vào chrome.storage.
 * Dịch một câu thì không thấy gì, nhưng bảng lời thoại có gần trăm câu — thành
 * gần trăm vòng đọc-ghi cả bộ đệm, và đó mới là thứ làm giao diện khựng, chứ
 * không phải mạng. Ở đây: đọc MỘT lần, ghi MỘT lần.
 *
 * Tiện thể sửa luôn một lỗi âm thầm của cách cũ: các lượt lẻ chạy song song đều
 * đọc-sửa-ghi cùng một object, nên lượt ghi sau xoá mất bản dịch của lượt trước
 * — bộ đệm gần như không giữ được gì, lần sau mở lại vẫn phải dịch lại từ đầu.
 */
async function handleTranslateMany(rawTexts, from, to) {
  const texts = (rawTexts || []).map((x) => String(x || "").trim());
  if (!texts.length) return { ok: true, texts: [] };
  const f = from || "en", t = to || "vi";

  const c = await demDich.lay();
  const now = Date.now();
  const out = new Array(texts.length).fill("");
  const can = [];
  texts.forEach((x, i) => {
    if (!x) return;
    const h = c[f + ">" + t + ":" + x];
    if (h && now - (h.ts || 0) < TR_TTL) out[i] = h.v; else can.push(i);
  });

  // Song song có giới hạn: mở hết cùng lúc thì trình duyệt cũng xếp hàng ở tầng
  // kết nối, mà lỡ hỏng thì hỏng cả loạt.
  //
  // Và phải THỬ LẠI: gửi một loạt 40 câu thì bên kia hay chặn bớt vài câu giữa
  // chừng. Bỏ luôn câu hỏng thì trên bảng nó nằm mãi ở dấu "—" trong khi hàng
  // xóm hai bên đều có nghĩa — trông như mình bỏ sót, mà thật ra chỉ là một
  // lượt gọi trượt.
  const SONG = 6;
  let ke = 0;
  await Promise.all(new Array(Math.min(SONG, can.length)).fill(0).map(async () => {
    while (ke < can.length) {
      const i = can[ke++];
      for (let lan = 0; lan < 3; lan++) {
        try {
          // gtxTranslate ở đây trả về CHUỖI (khác NJDict trả về object) — bộ đệm
          // của handleTranslate cũng ghi theo dạng { v, target }, nên phải giữ
          // đúng dạng ấy, kẻo hai đường ghi hai kiểu rồi đá nhau.
          const g = await gtxTranslate(texts[i], f, t);
          if (g) {
            out[i] = g;
            c[f + ">" + t + ":" + texts[i]] = { v: g, target: t, ts: now };
            break;
          }
        } catch (e) { /* thử lại, đừng kéo cả loạt xuống theo */ }
        if (lan < 2) await new Promise((r) => setTimeout(r, 250 * Math.pow(3, lan)));
      }
    }
  }));

  // gtx chết hẳn (bị chặn tần suất theo IP) thì bảng lời thoại trắng cả loạt —
  // đúng lúc đó máy chủ Apps Script là lối thoát, vì nó dịch TRÊN máy Google
  // chứ không từ IP người dùng. Chỉ gọi cho những dòng gtx bỏ lại, và giới hạn
  // song song để khỏi nện máy chủ nhà.
  const conThieu = can.filter((i) => !out[i] && texts[i]);
  if (conThieu.length) {
    // MỘT lượt gọi cho cả loạt. Máy chủ cũ chưa hiểu lối gộp thì trả null, lúc
    // đó mới lùi về gọi từng câu (chậm, nhưng vẫn ra chữ).
    const gop = await dichMayChuNhieu(conThieu.map((i) => texts[i]), f, t);
    if (gop) {
      gop.forEach((v, j) => {
        if (!v) return;
        const i = conThieu[j];
        out[i] = v; c[f + ">" + t + ":" + texts[i]] = { v: v, target: t, ts: now };
      });
    } else {
      let m = 0;
      await Promise.all(new Array(Math.min(4, conThieu.length)).fill(0).map(async () => {
        while (m < conThieu.length) {
          const i = conThieu[m++];
          const v = await dichMayChu(texts[i], f, t);
          if (v) { out[i] = v; c[f + ">" + t + ":" + texts[i]] = { v: v, target: t, ts: now }; }
        }
      }));
    }
  }

  const keys = Object.keys(c);
  if (keys.length > TR_MAX) {
    keys.sort((a, b) => (c[a].ts || 0) - (c[b].ts || 0));
    for (let i = 0; i < keys.length - TR_MAX; i++) delete c[keys[i]];
  }
  await demDich.day();
  return { ok: true, texts: out };
}

/** Câu này đã lưu vào sổ tay chưa — và bạn đã sửa lại bản dịch của nó chưa. */
async function daLuuCau(text) {
  try {
    const { notebook } = await chrome.storage.local.get("notebook");
    return tomTat((notebook || {})["envi:" + text]);
  } catch (e) { return null; }
}

// ==== Lưu từ vào sổ tay ====
async function saveWord(entry, dict) {
  if (!entry || !entry.word) throw new Error("Thiếu dữ liệu từ");
  const d = (entry.dict && entry.dict !== "auto") ? entry.dict : (dict === "auto" ? "envi" : dict);
  const key = d + ":" + entry.word;
  let old;
  const e = {
    word: entry.word, reading: entry.reading || "", means: entry.means || [], dict: d, ts: Date.now()
  };
  // Chốt chặn cuối cho furigana: popup, thẻ tra trong trang và bảng lời thoại
  // YouTube đều đi qua đây, nên vá ở đây là vá cho tất cả. Một từ thì gọi mạng
  // được — mà đây đúng là lúc người dùng cần cách đọc nhất.
  if (d === "javi" || d === "vija") {
    try {
      const r = await docKana(e.word, e.reading, entry.kind !== "sent");
      if (r) { e.reading = r.doc; if (r.suy) e.docSuy = 1; }
    } catch (err) { /* không có furigana thì vẫn lưu, đừng chặn việc lưu */ }
  }
  if (entry.pos && entry.pos.length) e.pos = entry.pos;      // định nghĩa/ví dụ tiếng Anh
  if (entry.audio) e.audio = entry.audio;                     // link phát âm
  if (entry.kanji) e.kanji = entry.kanji;                     // on/kun/số nét/JLPT/bộ thủ
  if (entry.kind) e.kind = entry.kind;                        // "sent" = câu đã dịch
  if (entry.src && entry.src.url) e.src = entry.src;          // nguồn: {url, title, sel}
  // Lần lưu này có mang theo bản sửa tay (sửa ngay trong popup) hay không.
  if (entry.note != null) e.note = String(entry.note);
  if (entry.mEdit) { e.mEdit = 1; if (entry.mOrig) e.mOrig = entry.mOrig; }
  await vaSau(async () => {
  const nb = (await chrome.storage.local.get("notebook")).notebook || {};
  old = nb[key];
  e.ts = Date.now();
  // Lưu lại một mục ĐÃ XOÁ: chỉ nhặt lại phần bạn tự viết, không nhặt lại tiến
  // độ ôn hay sổ con — bạn xoá nó vì đã thuộc, không phải vì viết nhầm.
  if (old && old.del) {
    if (e.note == null && old.note) e.note = old.note;
    // Kể cả đường link: lượt lưu này thường không có nguồn nào (gõ vào ô tra chứ
    // không phải bôi đen trên trang), mà cái link cũ — nhất là mốc phút video —
    // thì không tìm lại được nữa. Xem muc.js.
    if (!(e.src && e.src.url) && old.src && old.src.url) e.src = old.src;
    if (!entry.mEdit && old.mEdit) {
      e.mEdit = 1; e.means = old.means; if (old.mOrig) e.mOrig = old.mOrig;
    }
    if (e.mEdit && !e.mOrig && old.mOrig) e.mOrig = old.mOrig;
  }
  if (old && !old.del) {                                      // lưu lại từ đã có -> GIỮ mọi thứ bạn đã tự làm
    if (old.deck) e.deck = old.deck;
    if (old.srs) e.srs = old.srs;
    if (old.duong) e.duong = old.duong;
    if (old.lichRieng) e.lichRieng = old.lichRieng;
    if (old.kind && !e.kind) e.kind = old.kind;
    if (old.src && !e.src) e.src = old.src;
    if (old.hoiAi && !e.hoiAi) e.hoiAi = old.hoiAi;   // link đoạn chat Gemini
    // Công tắc đóng băng giữ NGUYÊN qua lượt lưu đè: tra lại một từ rồi bấm Lưu không có
    // nghĩa "cho từ này học lại từ đầu" — không giữ thì từ đã đóng băng lặng lẽ quay về hàng đợi.
    if (old.dongBang) e.dongBang = 1;
    if (old.kanji && !e.kanji) e.kanji = old.kanji;
    if (old.ruby && !e.ruby) { e.ruby = old.ruby; if (old.docSuy) e.docSuy = 1; }
    if (old.fav) e.fav = old.fav;
    if (e.note == null && old.note) e.note = old.note;
    // Bản dịch bạn đã sửa tay thì KHÔNG được để máy dịch đè lên. Tra lại cùng
    // một từ là chuyện thường xuyên; mỗi lần tra lại mà mất công hiệu đính thì
    // chẳng ai buồn sửa nữa. Ngoại lệ duy nhất: chính lần lưu này là một bản
    // sửa mới — lúc đó cái mới mới là ý bạn, bản cũ phải nhường.
    if (!entry.mEdit && old.mEdit) {
      e.mEdit = 1; e.means = old.means; if (old.mOrig) e.mOrig = old.mOrig;
    }
    // Bản gốc của máy chỉ ghi một lần, ở lần sửa đầu tiên; sửa tiếp lần hai
    // thì "gốc" vẫn phải là bản máy dịch chứ không phải bản sửa lần trước.
    if (e.mEdit && !e.mOrig && old.mOrig) e.mOrig = old.mOrig;
  }
  // Save original context before translation; re-saving a bare word keeps its sentence.
  const sourceContext = self.CauNghe.nguCanh(e.src, e.word);
  if (sourceContext) e.src = Object.assign({}, e.src, { cau: sourceContext.cau });
  const context = self.CauNghe.tuNguon(e.src, e.word);
  if (context) {
    e.src = Object.assign({}, e.src, { cau: context.cau });
    e.cauNghe = old && !old.del && old.cauNghe && old.cauNghe.cau === context.cau
      ? old.cauNghe : { cau: context.cau, dich: e.src.cauDich || "", ts: Date.now() };
  } else if (old && !old.del && old.cauNghe) {
    e.cauNghe = old.cauNghe;
    if (!sourceContext && old.src) e.src = old.src;
  }
  nb[key] = e;
  await chrome.storage.local.set({ notebook: nb });
  });
  // Còn trắng cách đọc mà vẫn có chữ Hán, tức đây là một CÂU (hoặc một cụm dài)
  // — thứ mà `docKana` cố tình không đụng tới, nên câu lời thoại YouTube lưu
  // xong là chẳng có cách đọc nào. Ghép furigana theo từng khúc chữ Hán.
  //
  // Vá SAU khi đã ghi, và KHÔNG chờ: bấm Lưu thì phải lưu xong ngay. Bắt cả
  // lượt lưu đứng chờ một lượt hỏi mạng chỉ để làm đẹp cách đọc là đổi một thứ
  // chắc chắn lấy một thứ hên xui — mạng chậm thì nút treo, mạng hỏng thì mất
  // luôn cảm giác "đã lưu".
  if ((d === "javi" || d === "vija") && !e.reading && !e.ruby) rubyVaSau(key, e.word).catch(() => {});
  // Câu ngữ cảnh cho bài NGHE — cũng vá SAU và KHÔNG chờ, vì nó phải gọi máy
  // dịch. Mục nào không moi được câu trọn vẹn thì đơn giản là không có đường
  // nghe; xem cau-nghe.js về việc vì sao thà bỏ còn hơn dựng câu cụt.
  if (!e.cauNghe) cauNgheVaSau(key, e, d).catch(() => {});
  else if (!e.cauNghe.dich) dichCauNghe(key).then(() => scheduleSync(self.Ngu.nguCuaKhoa(key))).catch(() => {});
  // Chưa có nghĩa (Google bị chặn lúc lưu, mạng chập chờn…) — thử lại một lần
  // sau ít giây thay vì để mục nằm trong sổ trống trơn.
  if (!e.means.length && (d === "javi" || d === "envi") && e.kind !== "sent") nghiaVaSau(key, e.word, d).catch(() => {});
  // Mục MỚI hoàn toàn mới tính vào "hôm nay lưu bao nhiêu"; lưu đè một mục đã có
  // (tra lại cùng một từ) thì không, nếu không con số đó chỉ đếm số lần bấm nút.
  if (!old || old.del) await ghiNhanLuu(self.Ngu.nguCuaKhoa(key));
}

/**
 * Cộng một mục vào nhật ký học của hôm nay, ĐÚNG NGĂN ngôn ngữ của mục đó.
 *
 * Service worker không dùng được bộ theo dõi trong tien-do.js (nó cần DOM để vẽ),
 * nên chỗ này ghi thẳng vào cùng cấu trúc dữ liệu — vẫn qua TienDo.chuanHoa để
 * không bao giờ ghi ra hình dạng lạ.
 *
 * PHẢI đi qua Ngu.tachHoc. Từ ngày gộp hai ngôn ngữ, `hoc` có hình dạng
 * {ja, en}; đưa thẳng nó cho TienDo.chuanHoa thì nó không thấy log/badges nào ở
 * cấp ngoài nên trả về một bản TRẮNG, và lượt ghi kế tiếp đè bản trắng ấy lên
 * cả hai ngôn ngữ — lưu đúng một từ là bay sạch chuỗi ngày, nhật ký và huy hiệu
 * của cả hai bên.
 */
async function ghiNhanLuu(ngu) {
  try {
    const { hoc } = await chrome.storage.local.get("hoc");
    const tach = self.Ngu.tachHoc(hoc);
    const n = self.Ngu.hopLe(ngu || (await nguHienTai()));
    const d = self.TienDo.chuanHoa(tach[n]);
    const iso = self.TienDo.homNay();
    if (!d.log[iso]) d.log[iso] = { r: 0, y: 0, n: 0, s: 0, sm: 0, km: 0 };
    d.log[iso].s += 1;
    await chrome.storage.local.set({ hoc: Object.assign({}, tach, { [n]: d }) });
  } catch (e) { /* không ghi được nhật ký thì cũng không được làm hỏng việc lưu từ */ }
}

// ==== Dịch câu: gọi thẳng Google Dịch (nhanh), Apps Script làm dự phòng ====
const TR_MAX = 1200;
const TR_TTL = 30 * 86400000;

/**
 * Dịch qua máy chủ Apps Script của người dùng — đường DỰ PHÒNG không dính IP.
 *
 * Khi gtx bị Google chặn tần suất theo IP, đây là lối thoát: LanguageApp chạy
 * TRÊN máy chủ Google, không phải từ trình duyệt của người dùng, nên không bị
 * cùng cái chặn ấy. Trả về chuỗi rỗng khi không dùng được (chưa cấu hình, hỏng
 * mạng, máy chủ báo lỗi) — chỗ gọi tự quyết nói lỗi thế nào; nới cả vài cách
 * đặt tên trường mà bản Apps Script cũ có thể trả về.
 */
/**
 * Dịch một chuỗi qua ĐÚNG chuỗi đường mà mọi chỗ khác trong app vẫn dùng:
 * gtx của Google trước, hụt thì sang máy chủ Apps Script của người dùng.
 *
 * Đây là chỗ tôi đã làm sai. dichCauNghe, và cả lượt bồi câu ngữ cảnh, gọi
 * THẲNG gtxTranslate — không có chặng dự phòng nào. Với người mà Google đang
 * chặn (quá nhiều lượt, hoặc mạng chặn hẳn), bảng lời thoại YouTube vẫn dịch
 * được bình thường vì nó đi qua handleTranslate có đủ hai chặng, còn thẻ nghe
 * thì không bao giờ có bản dịch. Cùng một máy, cùng một lúc, hai kết quả khác
 * nhau — và nhìn từ ngoài thì trông như tính năng chưa được làm.
 *
 * @param {boolean} [nhanh] chỉ áp cho chặng gtx: một cổng, một cách, 4 giây.
 */
async function dichChuoi(text, f, t, nhanh) {
  try { return (await gtxTranslate(text, f, t, nhanh)) || ""; } catch (e) { return ""; }
}

async function dichMayChu(text, f, t) {
  try {
    const { syncUrl, syncToken } = await chrome.storage.local.get(["syncUrl", "syncToken"]);
    if (!syncUrl) return "";
    const r = await layCoHan(syncUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: syncToken || "", action: "translate", text, from: f, to: t })
    }, 12000);
    const data = await r.json().catch(() => null);
    if (!data || data.ok === false) return "";
    return String(data.text || data.translation || data.result || "");
  } catch (e) { return ""; }
}

/**
 * Dịch CẢ LOẠT qua Apps Script — MỘT lượt gọi cho tất cả.
 *
 * Vì sao phải có: mỗi lượt gọi Apps Script tốn một hai giây chỉ để Google dựng
 * máy chạy script. Bảng lời thoại YouTube có bốn chục dòng; gọi riêng từng dòng
 * là trả cái phí ấy bốn chục lần — đúng cảnh "app script phản hồi rất lâu".
 * Gộp lại thì chỉ trả một lần.
 *
 * Máy chủ CŨ chưa có lối "translateMany" sẽ trả "unknown action"; lúc đó lùi về
 * gọi từng câu như trước. Người dùng không phải deploy lại mới dùng được app —
 * chỉ là chưa nhanh lên thôi.
 *
 * @returns {Promise<string[]|null>} mảng đúng thứ tự, hoặc null nếu máy chủ
 *   không hiểu lối gộp (để chỗ gọi tự lùi).
 */
async function dichMayChuNhieu(texts, f, t) {
  try {
    const { syncUrl, syncToken } = await chrome.storage.local.get(["syncUrl", "syncToken"]);
    if (!syncUrl || !texts || !texts.length) return null;
    const r = await fetch(syncUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: syncToken || "", action: "translateMany", texts, from: f, to: t })
    });
    const data = await r.json().catch(() => null);
    if (!data || data.ok === false || !Array.isArray(data.texts)) return null;
    return data.texts.map((x) => String(x || ""));
  } catch (e) { return null; }
}

async function handleTranslate(rawText, from, to) {
  // Dọn ngay đầu vào: vùng chọn dính công thức mang theo ký tự vô hình và
  // MathML ẩn. Dọn ở đây thì khoá bộ nhớ đệm, chuỗi lưu vào sổ, và chuỗi gửi
  // Google đều là một bản sạch như nhau.
  const text = donDich(rawText).slice(0, 5000);
  if (!text) return { ok: false, error: "Chưa có nội dung" };
  let f = from || "en", t = to || "vi";

  const c = await demDich.lay();
  const now = Date.now();
  const fresh = (k) => { const h = c[k]; return (h && (now - (h.ts || 0) < TR_TTL)) ? h : null; };
  const store = (k, v, target) => {
    c[k] = { v, target, ts: now };
    const keys = Object.keys(c);
    if (keys.length > TR_MAX) { keys.sort((a, b) => (c[a].ts || 0) - (c[b].ts || 0)); for (let i = 0; i < keys.length - TR_MAX; i++) delete c[keys[i]]; }
  };

  // Tự động nhận diện nguồn rồi dịch sang ngôn ngữ còn lại (Việt <-> Anh).
  if (f === "auto") {
    if (looksVietnamese(text)) { f = "vi"; t = "en"; }
    else if (/^[A-Za-z][A-Za-z'’-]*$/.test(text)) {
      // MỘT chữ Latin trơ: đi thẳng en→vi như đường tra từ vẫn đi (lookupAuto
      // cũng coi nó là tiếng Anh trước). Cùng một câu hỏi với lượt tra từ nên
      // hai lượt dùng chung một lần gọi Google — xem gtxData — và khỏi mất một
      // vòng nhận diện ngôn ngữ.
      f = "en"; t = "vi";
    } else {
      const ak = "auto>en:" + text;
      const ah = fresh(ak);
      if (ah) return { ok: true, text: ah.v, target: ah.target || "en", cached: true, saved: await daLuuCau(text) };
      /*
       * Hỏi MỘT lượt với đích là tiếng Việt: nếu nguồn hoá ra là tiếng Anh (ca
       * thường gặp nhất) thì đó đã là bản dịch cần dùng, khỏi gọi thêm lượt nữa.
       * Cách cũ luôn hỏi đích tiếng Anh để nhận diện rồi mới hỏi lại en→vi: hai
       * lượt nối đuôi cho mọi câu tiếng Anh.
       */
      let det = null;
      try { det = await gtxTranslateDetect(text, "vi"); } catch (e) {}
      if (det && det.text && det.src && det.src.startsWith("en")) {
        store(key0(text, "en", "vi"), det.text, "vi");
        demDich.ghi();
        return { ok: true, text: det.text, target: "vi", saved: await daLuuCau(text) };
      }
      // Tiếng Việt không dấu thì xuống dưới dịch vi→en; nguồn khác thì dịch
      // sang tiếng Anh như cũ.
      const laViet = !!(det && det.src && det.src.startsWith("vi"));
      let detected = null;
      if (!laViet && det && det.src) {
        try { detected = await gtxTranslateDetect(text, "en"); } catch (e) {}
      }
      if (detected && detected.text && detected.src && !detected.src.startsWith("en")) {
        store(ak, detected.text, "en");
        demDich.ghi();
        return { ok: true, text: detected.text, target: "en", saved: await daLuuCau(text) };
      }
      if (laViet) { f = "vi"; t = "en"; }
      else { f = "en"; t = "vi"; }   // nguồn là tiếng Anh -> dịch sang tiếng Việt
    }
  }

  const key = f + ">" + t + ":" + text;
  const hit = fresh(key);
  if (hit) return { ok: true, text: hit.v, target: t, cached: true, saved: await daLuuCau(text) };

  // Hai đường chạy đua (xem dichTu), lấy cái ĐẦU TIÊN ra kết quả:
  //   1) gtx của Google (xoay vòng cổng)   2) máy chủ Apps Script của người dùng
  let out = "";
  try { out = await gtxTranslate(text, f, t); } catch (e) { out = ""; }
  if (!out) {
    const { syncUrl } = await chrome.storage.local.get("syncUrl");
    return { ok: false, error: syncUrl
      ? "Google đang tạm chặn dịch vì quá nhiều lượt, mà máy chủ dự phòng cũng chưa trả về được. Hãy thử lại sau ít phút."
      : "Google đang tạm chặn dịch vì quá nhiều lượt. Thử lại sau ít phút, hoặc cấu hình đồng bộ để dùng máy chủ dự phòng." };
  }

  store(key, out, t);
  demDich.ghi();
  return { ok: true, text: out, target: t, saved: await daLuuCau(text) };
}

// ==== Đồng bộ Google Drive qua Apps Script ====
/**
 * Đang dùng KHO CHUNG hay mỗi ngôn ngữ một cloud?
 *
 * Khai kho chung thì mọi ngôn ngữ đi chung một máy chủ — xem KHOA_CHUNG trong
 * ngu.js. Chưa khai thì chạy nếp cũ, người đang dùng không phải đổi gì.
 */
async function cauHinhSync(ngu) {
  const c = self.Ngu.KHOA_CHUNG;
  const khoC = await chrome.storage.local.get([c.url, c.token]);
  if (khoC[c.url]) return { url: khoC[c.url], token: khoC[c.token] || "", chung: true };
  const k = self.Ngu.khoaSync(ngu || "en");
  const kho = await chrome.storage.local.get([k.url, k.token]);
  return { url: kho[k.url] || "", token: kho[k.token] || "", chung: false };
}

async function driveRequest(body, ngu) {
  const cfg = await cauHinhSync(ngu);
  const syncUrl = cfg.url, syncToken = cfg.token;
  if (!syncUrl) throw new Error("Chưa cấu hình URL đồng bộ cho tiếng " + self.Ngu.ten(ngu));
  const r = await fetch(syncUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ token: syncToken || "" }, body))
  });
  const data = await r.json();
  if (!data || data.ok === false) throw new Error((data && data.error) || "Lỗi máy chủ đồng bộ");
  return data;
}

/*
 * Ảnh đính kèm KHÔNG đi lên Drive.
 *
 * Byte ảnh nằm trong IndexedDB của từng máy (xem anh.js), nên bản mô tả `anh`
 * gửi lên chỉ là một con trỏ trỏ vào ổ đĩa của máy này — sang máy khác nó là
 * con trỏ chết, hiện ra một ô ảnh trắng không ai giải thích được. Bỏ nó khỏi
 * gói gửi đi, và trả lại vào bản ghi xuống máy, để một lượt đồng bộ không bao
 * giờ gỡ mất ảnh của chính mình.
 */
function boAnh(nb) {
  const ra = {};
  for (const k in (nb || {})) {
    const e = nb[k];
    if (e && e.anh) { const b = Object.assign({}, e); delete b.anh; ra[k] = b; }
    else ra[k] = e;
  }
  return ra;
}
function traAnh(dich, nguon) {
  for (const k in (nguon || {})) {
    const cu = nguon[k];
    if (cu && cu.anh && cu.anh.length && dich[k] && !dich[k].anh) {
      dich[k] = Object.assign({}, dich[k], { anh: cu.anh });
    }
  }
  return dich;
}

/**
 * Gộp hai kho mục. Mốc nào mới hơn thì đè, RIÊNG tiến độ ôn so bằng mốc của
 * lần chấm bài — xem `Muc.tron` trong muc.js để biết vì sao phải tách ra.
 */
function mergeByTs(a, b) {
  return self.Muc.tron(a, b);
}
function countActive(nb) { let n = 0; for (const k in nb) if (!nb[k].del) n++; return n; }

// Mỗi ngôn ngữ một lượt đồng bộ riêng, và không cho hai lượt CÙNG ngôn ngữ
// chạy chồng lên nhau (chồng nhau thì hai bên đọc-sửa-ghi cùng một kho).
const syncing = {};

/**
 * Gộp hai cloud cũ về KHO CHUNG.
 *
 * Chạy đúng một lần, lúc người dùng chuyển sang nếp mới. Đọc cả hai cloud cũ,
 * hợp với sổ đang có trên máy, rồi ghi trọn vào kho chung.
 *
 * Phép hợp dùng chính Muc.tron của lượt đồng bộ thường, nên KHÔNG bên nào bị
 * đè mất: máy này giữ tiếng Nhật, máy kia giữ tiếng Anh — gộp xong có cả hai.
 * Cloud cũ để nguyên, không xoá: lỡ có chuyện thì vẫn còn đường lui.
 */
async function gopCloudCu() {
  const c = self.Ngu.KHOA_CHUNG;
  const khoC = await chrome.storage.local.get([c.url, c.token]);
  if (!khoC[c.url]) throw new Error("Chưa khai URL kho chung");

  const may = await chrome.storage.local.get(["notebook", "decks", "hoc"]);
  let nb = may.notebook || {}, decks = may.decks || {};
  let hoc = self.Ngu.tachHoc(may.hoc);

  for (const ngu of self.Ngu.DS) {
    const k = self.Ngu.khoaSync(ngu);
    const kho = await chrome.storage.local.get([k.url, k.token]);
    if (!kho[k.url]) continue;                     // ngôn ngữ này chưa từng có cloud
    let data;
    try {
      const r = await fetch(kho[k.url], {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ token: kho[k.token] || "", action: "load" })
      });
      const d = await r.json();
      if (!d || d.ok === false) continue;          // cloud này hỏng thì bỏ qua, đừng kéo cả lượt gộp xuống
      data = d.data || {};
    } catch (e) { continue; }
    const xaNb = data.notebook !== undefined ? (data.notebook || {}) : (data || {});
    nb = mergeByTs(nb, xaNb);
    decks = mergeByTs(decks, data.decks || {});
    const xaHoc = self.Ngu.tachHoc(data.hoc);
    // Cloud cũ giữ tiến độ của ĐÚNG ngôn ngữ nó phụ trách; tachHoc trả nó về
    // nhánh "en" khi gói không có vỏ { ja, en } — nên lấy theo cả hai đường.
    hoc[ngu] = self.TienDo.tron(hoc[ngu], xaHoc[ngu] || (data.hoc && !data.hoc.ja && !data.hoc.en ? data.hoc : null));
  }

  await vaSau(async () => {
    const fresh = await chrome.storage.local.get(["notebook", "decks", "hoc"]);
    nb = traAnh(mergeByTs(fresh.notebook || {}, nb), fresh.notebook || {});
    decks = mergeByTs(fresh.decks || {}, decks);
    const freshHoc = self.Ngu.tachHoc(fresh.hoc);
    for (const n of self.Ngu.DS) hoc[n] = self.TienDo.tron(freshHoc[n], hoc[n]);
    await chrome.storage.local.set({ notebook: nb, decks: decks, hoc: hoc });
  });
  /*
   * Ghi trọn lên kho chung, không lọc theo ngôn ngữ nữa.
   *
   * Phải mang theo cả `luyenNoi` và `soDoSrs` của máy: Apps Script lưu NGUYÊN
   * cả gói `data`, nên gửi gói thiếu hai khoá ấy là xoá sạch chúng trên kho
   * chung. Lượt gộp này chỉ chạy một lần lúc chuyển nếp, nhưng một lần cũng đủ
   * mất các đoạn Luyện nói người dùng tự viết.
   */
  const them = await chrome.storage.local.get(["luyenNoi", "soDoSrs", "phuDeSua", "nguPhapSrs"]);
  await driveRequest({ action: "save", data: { notebook: boAnh(nb), decks: decks, hoc: hoc,
    luyenNoi: them.luyenNoi || {}, soDoSrs: them.soDoSrs || {}, nguPhapSrs: them.nguPhapSrs || {},
    phuDeSua: them.phuDeSua || {} } }, "ja");
  return countActive(nb);
}

function syncNow(rawNgu) {
  const ngu = self.Ngu.hopLe(rawNgu);
  if (syncing[ngu]) return syncing[ngu];
  syncing[ngu] = doSync(ngu).finally(() => { syncing[ngu] = null; });
  return syncing[ngu];
}

/** Đồng bộ CẢ HAI cloud. Bên nào chưa khai URL thì lặng lẽ bỏ qua. */
async function syncTatCa() {
  // Kho chung thì một lượt là xong cả sổ — chạy vòng theo ngôn ngữ chỉ tổ đẩy
  // cùng một gói lên hai lần.
  /*
   * HỎNG THÌ PHẢI NÓI RA.
   *
   * Bản trước nuốt mọi lỗi rồi trả 0, nên giao diện báo "đồng bộ xong, 0 mục" —
   * nhìn y hệt một lượt đồng bộ sạch sẽ trên quyển sổ chẳng có gì mới. Một lỗi
   * làm hỏng TOÀN BỘ phép gộp (xem `goc`/`root` trong muc.js) vẫn hiện ra là
   * thành công, và nó im lặng như thế rất lâu: hai máy không hề chép được gì
   * cho nhau mà cả hai đều báo đã đồng bộ.
   *
   * Giờ: một bên hỏng mà bên kia chạy thì vẫn tính là có chạy; hỏng SẠCH thì
   * ném ra, để chỗ gọi hiện đúng câu lỗi.
   */
  const c = self.Ngu.KHOA_CHUNG;
  const khoC = await chrome.storage.local.get(c.url);
  if (khoC[c.url]) return syncNow("ja");

  let n = 0, coChay = false, loiCuoi = null;
  for (const ngu of self.Ngu.DS) {
    const k = self.Ngu.khoaSync(ngu);
    const kho = await chrome.storage.local.get(k.url);
    if (!kho[k.url]) continue;
    try { n += await syncNow(ngu); coChay = true; }
    catch (e) { loiCuoi = e; }        // bên kia hỏng thì bên này vẫn chạy
  }
  if (!coChay && loiCuoi) throw loiCuoi;
  return n;
}

/**
 * Đồng bộ MỘT ngôn ngữ với cloud của chính nó.
 *
 * Hai điều phải tuyệt đối giữ đúng, vì sai là mất dữ liệu thật trên Drive:
 *
 *  1. Chỉ GỬI LÊN phần thuộc ngôn ngữ này (Ngu.locSo). Cloud tiếng Nhật không
 *     được nhận từ vựng tiếng Anh, và ngược lại — mỗi kho giữ đúng thứ của nó,
 *     y như hồi còn là hai extension riêng.
 *  2. Khi GHI XUỐNG MÁY thì phải giữ nguyên phần của ngôn ngữ KIA. Ở đây dùng
 *     mergeByTs, mà phép đó là phép HỢP — nên phần kia không thể bị xoá, kể cả
 *     lúc cloud này trả về rỗng.
 *
 * Và như bản cũ: sổ tay rỗng không bao giờ xoá được cloud, vì rỗng ∪ cloud =
 * cloud. Cài mới rồi bấm đồng bộ là kéo hết về, không mất gì.
 */
async function doSync(rawNgu) {
  const ngu = self.Ngu.hopLe(rawNgu);
  // Kho chung: KHÔNG lọc theo ngôn ngữ nữa — cả sổ đi lên, cả sổ nhận về. Đây
  // là toàn bộ khác biệt giữa hai nếp; phần gộp bên dưới vốn đã là phép HỢP nên
  // không phải đổi gì thêm.
  const dungChung = (await cauHinhSync(ngu)).chung;
  const resp = await driveRequest({ action: "load" }, ngu);
  const data = (resp && resp.data) || {};
  let remoteNb, remoteDecks, remoteHoc;
  let remoteNoi, remoteDo, remoteSua;
  if (data && typeof data === "object" && data.notebook !== undefined) {
    remoteNb = data.notebook || {};
    remoteDecks = data.decks || {};
    remoteHoc = data.hoc || null;
    remoteNoi = data.luyenNoi || {};
    remoteDo = data.soDoSrs || {};
    remoteSua = data.phuDeSua || {};
  } else {
    remoteNb = data || {}; remoteDecks = {}; remoteHoc = null;
    remoteNoi = {}; remoteDo = {}; remoteSua = {};
  }
  // Cloud cũ có thể lẫn khoá của ngôn ngữ khác (đồng bộ nhầm một lần nào đó).
  // Vẫn nhận về máy — không vứt dữ liệu của người dùng — nhưng khi gửi lên thì
  // lọc lại cho sạch.
  const remoteCuaToi = dungChung ? remoteNb : self.Ngu.locSo(remoteNb, ngu);

  const store = await chrome.storage.local.get(["notebook", "decks", "hoc", "luyenNoi", "soDoSrs", "phuDeSua", "nguPhapSrs"]);
  const hocTach = self.Ngu.tachHoc(store.hoc);
  const nbCuaToi = dungChung ? (store.notebook || {}) : self.Ngu.locSo(store.notebook || {}, ngu);

  const mergedNgu = mergeByTs(nbCuaToi, remoteCuaToi);
  // Sổ con cũng tách theo ngôn ngữ, đúng như hồi còn là hai extension: cloud
  // tiếng Nhật không nhận sổ tiếng Anh và ngược lại.
  const soCuaToi = dungChung ? (store.decks || {})
    : self.Ngu.locSoCon(store.decks || {}, store.notebook || {}, ngu);
  const mergedDecks = mergeByTs(soCuaToi,
    dungChung ? remoteDecks : self.Ngu.locSoCon(remoteDecks, remoteNb, ngu));
  // Tiến độ học KHÔNG trộn theo kiểu "bản mới hơn thắng" như sổ tay — xem
  // TienDo.tron() để biết vì sao (tóm tắt: 8 lượt trên điện thoại và 5 lượt
  // trên máy tính đều là lượt thật, không bên nào được xoá bên nào).
  /*
   * Tiến độ học.
   *
   * Nếp cũ: mỗi cloud giữ tiến độ của MỘT ngôn ngữ, nên gửi thẳng nhánh ấy.
   * Kho chung: phải giữ cả hai nhánh trong một gói { ja, en } — gộp riêng từng
   * nhánh, vì tron() làm việc trên một nhánh chứ không hiểu cái vỏ ngoài.
   */
  let mergedHoc;
  if (dungChung) {
    const xa = self.Ngu.tachHoc(remoteHoc);
    mergedHoc = {};
    for (const n of self.Ngu.DS) mergedHoc[n] = self.TienDo.tron(hocTach[n], xa[n]);
  } else {
    mergedHoc = self.TienDo.tron(hocTach[ngu], remoteHoc);
  }

  /*
   * Hai thứ nữa đi theo gói đồng bộ, mỗi thứ một phép gộp KHÁC NHAU.
   *
   * luyenNoi — các đoạn người dùng TỰ VIẾT, mỗi đoạn một mã riêng và có `ts`.
   *   Gộp y như sổ tay: bản mới hơn thắng, mã không trùng nên không ai đè ai.
   *   Đây là chữ người ta tự gõ, mất là mất thật.
   *
   * soDoSrs — bảng đếm CỘNG DỒN, không gộp kiểu ấy được. Xem Srs.tronSoDo:
   *   mỗi máy một nhánh, gộp là giữ nguyên từng nhánh, chỉ cộng lúc đọc. Cộng
   *   lúc gộp thì đồng bộ hai lần là số đo tự nhân đôi.
   *
   * Cả hai chỉ là KHOÁ MỚI trong cùng một gói. Apps Script lưu nguyên
   * `req.data` rồi trả lại nguyên như thế, không hề nhìn vào bên trong — nên
   * KHÔNG phải deploy lại máy chủ. Bản cũ trên cloud thiếu hai khoá này thì
   * đọc ra {} và phép hợp giữ nguyên phần của máy.
   */
  const mergedNoi = self.Muc.tron(store.luyenNoi || {}, remoteNoi);
  const mergedDo = self.Srs.tronSoDo(store.soDoSrs || {}, remoteDo);
  /*
   * `phuDeSua` — những dòng lời thoại YouTube người dùng TỰ SỬA lại.
   *
   * Cũng là chữ người ta tự gõ, và gõ trong lúc đang nghe, nên còn khó làm lại
   * hơn cả một đoạn Luyện nói. Kho hình dạng { mã video: { d: {...}, ts } }:
   * có `ts` sẵn nên gộp y như sổ tay, mỗi video một khoá nên hai máy sửa hai
   * video khác nhau thì được cả hai.
   *
   * Bản chép lời GỐC thì không đi theo (kho ytKho) — máy mới tự xin lại
   * YouTube, rồi đắp bản sửa này lên trên theo mốc giây. Đó chính là cách nó
   * vẫn chạy giữa hai lần mở trên cùng một máy.
   */
  const mergedSua = self.Muc.tron(store.phuDeSua || {}, remoteSua);
  const mergedGrammar = self.Muc.tron(store.nguPhapSrs || {}, data.nguPhapSrs || {});

  const guiDi = boAnh(mergedNgu);
  await driveRequest({
    action: "save",
    data: { notebook: guiDi, decks: mergedDecks, hoc: mergedHoc,
            luyenNoi: mergedNoi, soDoSrs: mergedDo, phuDeSua: mergedSua, nguPhapSrs: mergedGrammar }
  }, ngu);

  // Đọc lại dữ liệu máy NGAY TRƯỚC KHI GHI: người dùng có thể vừa sửa (phân
  // loại sổ, xoá, chấm điểm...) trong lúc chờ mạng -> phải giữ các thay đổi đó.
  const { finalNb, finalDecks, finalHoc, finalHocNgu, finalNoi, finalDo, finalSua, finalGrammar } = await vaSau(async () => {
  const fresh = await chrome.storage.local.get(["notebook", "decks", "hoc", "luyenNoi", "soDoSrs", "phuDeSua", "nguPhapSrs"]);
  const freshHoc = self.Ngu.tachHoc(fresh.hoc);
  // mergeByTs là phép HỢP: phần ngôn ngữ kia trong fresh.notebook đi qua nguyên vẹn.
  // traAnh: bản trên Drive không mang `anh`, nên nếu để nguyên thì mỗi lượt
  // đồng bộ lại gỡ sạch ảnh của chính máy này.
  const finalNb = traAnh(mergeByTs(fresh.notebook || {}, mergeByTs(remoteNb, mergedNgu)), fresh.notebook || {});
  const finalDecks = mergeByTs(fresh.decks || {}, mergedDecks);
  // Kho chung: mergedHoc là gói { ja, en }, phải gộp từng nhánh vào bản mới
  // nhất trên máy. Nếp cũ: nó là tiến độ của đúng một ngôn ngữ.
  let finalHoc, finalHocNgu;
  if (dungChung) {
    finalHoc = Object.assign({}, freshHoc);
    for (const n of self.Ngu.DS) finalHoc[n] = self.TienDo.tron(freshHoc[n], (mergedHoc || {})[n]);
    finalHocNgu = finalHoc[ngu];
  } else {
    finalHocNgu = self.TienDo.tron(freshHoc[ngu], mergedHoc);
    finalHoc = Object.assign({}, freshHoc, { [ngu]: finalHocNgu });
  }
  // Đọc lại rồi mới gộp, y như sổ tay: người dùng có thể vừa thêm một đoạn nói
  // hoặc vừa chấm xong một thẻ trong lúc chờ mạng.
  const finalNoi = self.Muc.tron(fresh.luyenNoi || {}, mergedNoi);
  const finalDo = self.Srs.tronSoDo(fresh.soDoSrs || {}, mergedDo);
  const finalSua = self.Muc.tron(fresh.phuDeSua || {}, mergedSua);
  const finalGrammar = self.Muc.tron(fresh.nguPhapSrs || {}, mergedGrammar);
  await chrome.storage.local.set({ notebook: finalNb, decks: finalDecks, hoc: finalHoc,
                                   luyenNoi: finalNoi, soDoSrs: finalDo, phuDeSua: finalSua, nguPhapSrs: finalGrammar });

    return { finalNb, finalDecks, finalHoc, finalHocNgu, finalNoi, finalDo, finalSua, finalGrammar };
  });

  // Có thay đổi mới phát sinh -> đẩy nốt lên Drive ở lượt sau
  // So bản ĐÃ BỎ ẢNH với gói vừa gửi: so bản còn ảnh thì lần nào cũng khác
  // nhau, và lượt đồng bộ này tự hẹn lượt sau, mãi mãi.
  const nbSo = dungChung ? finalNb : self.Ngu.locSo(finalNb, ngu);
  const soSo = dungChung ? finalDecks : self.Ngu.locSoCon(finalDecks, finalNb, ngu);
  const hocSo = dungChung ? finalHoc : finalHocNgu;
  if (JSON.stringify(boAnh(nbSo)) !== JSON.stringify(guiDi) ||
      JSON.stringify(soSo) !== JSON.stringify(mergedDecks) ||
      JSON.stringify(hocSo) !== JSON.stringify(mergedHoc) ||
      JSON.stringify(finalNoi) !== JSON.stringify(mergedNoi) ||
      JSON.stringify(finalDo) !== JSON.stringify(mergedDo) ||
      JSON.stringify(finalSua) !== JSON.stringify(mergedSua) ||
       JSON.stringify(finalGrammar) !== JSON.stringify(mergedGrammar)) {
    scheduleSync(ngu);
  }
  return countActive(self.Ngu.locSo(finalNb, ngu));
}

// Save PDF context atomically before dictionary lookup, furigana or translation.
async function savePdfSelection(msg) {
  const word = String(msg.word || "").trim();
  const cau = self.CauNghe.cauHopLe(msg.src && msg.src.cau, word);
  if (!word || word.length > 80 || !cau) throw new Error("Hãy chọn từ và câu chứa từ đó (tối đa 220 ký tự).");
  const raw = msg.src || {};
  if (!/^(https?:|file:|blob:)/i.test(raw.url || "")) throw new Error("Thiếu nguồn PDF.");
  const ngu = await nguHienTai(), dict = self.Ngu.nganChinh(ngu), key = dict + ":" + word;
  const src = { url: String(raw.url).slice(0,4000), title: String(raw.title || "").slice(0,200),
    sel: word, cau, pdf: true, page: Math.max(1, Math.floor(Number(raw.page) || 1)),
    documentId: String(raw.documentId || "").slice(0,100),
    capture: "pdf-auto", contextStatus: "complete", capturedAt: Date.now() };
  const origin = self.PdfSource.cleanOrigin(raw.pdfOrigin, raw.url);
  if (origin) src.pdfOrigin = origin;
  if (Number.isInteger(raw.start) && Number.isInteger(raw.end)) {
    src.start = raw.start; src.end = raw.end;
  }
  if (Number.isInteger(raw.paragraph)) src.paragraph = raw.paragraph;
  let fresh = false;
  await vaSau(async () => {
    const nb = (await chrome.storage.local.get("notebook")).notebook || {};
    const old = nb[key];
    fresh = !old || old.del;
    const version = Math.max(Date.now(), ((old && old.cauNghe && old.cauNghe.ts) || 0) + 1);
    const it = fresh ? { word, dict, means: [], reading: "" } : Object.assign({}, old);
    // Keep every learning/manual field of an existing entry, including unknown future fields.
    it.src = src; it.ts = Date.now();
    it.cauNghe = old && !old.del && old.cauNghe && old.cauNghe.cau === cau
      ? old.cauNghe : { cau, dich: "", ts: version };
    nb[key] = it;
    await chrome.storage.local.set({ notebook: nb });
  });
  scheduleSync(ngu);
  nheChungVaSau().catch(() => {});
  if (fresh) ghiNhanLuu(ngu).catch(() => {});
  dichCauNghe(key).then(() => scheduleSync(ngu)).catch(() => {});
  boiTuPdf(key, word, dict).catch(() => {});
  return { ok: true, key, context: true };
}
async function boiTuPdf(key, word, dict) {
  const result = await handleLookup(word, dict);
  const match = ketQuaKhop((result && result.entries) || [], word);
  if (!match) return;
  await vaSau(async () => {
    const nb = (await chrome.storage.local.get("notebook")).notebook || {};
    const it = nb[key];
    if (!it || it.del) return;
    if (!it.mEdit && !(it.means || []).length) it.means = match.e.means;
    if (!it.reading && match.khop === "dung") it.reading = match.e.reading || "";
    await chrome.storage.local.set({ notebook: nb });
  });
  scheduleSync(self.Ngu.nguCuaKhoa(key));
}
