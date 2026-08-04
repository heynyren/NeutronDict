/* Popup tra nhanh hiện ngay tại chỗ bôi đen (chỉ trên trang web thường).
   Bấm chuột ra ngoài là tắt. Tắt tuỳ chọn trong trang Sổ tay -> ⚙ Cài đặt. */
(() => {
  const DEFAULTS = { inline: true, requireCtrl: false, maxLen: 40, translate: true, maxSent: 400 };
  let S = Object.assign({}, DEFAULTS);
  let host = null, root = null, boxEl = null, lastCtrl = false;
  let anchor = { x: 0, y: 0 };

  chrome.storage.local.get("settings", (r) => { if (r && r.settings) S = Object.assign({}, DEFAULTS, r.settings); });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === "local" && ch.settings) S = Object.assign({}, DEFAULTS, ch.settings.newValue || {});
  });

  function close() {
    if (host) { host.remove(); host = null; root = null; boxEl = null; }
  }

  function ensureHost(x, y) {
    close();
    anchor = { x: x, y: y };
    host = document.createElement("div");
    host.style.cssText = "all:initial;position:fixed;z-index:2147483647;left:" + x + "px;top:" + y + "px;";
    root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      .box { width: 340px; max-height: 360px; overflow-y: auto; background:#fff; color:#1c2430;
        font: 14px/1.5 -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
        border:1px solid #e6e9ef; border-radius:12px; box-shadow:0 8px 28px rgba(124,58,237,.28); padding:10px 12px; }
      .st { color:#6b7684; font-size:13px; padding:6px 2px; }
      .en { padding:7px 0; border-bottom:1px solid #eef1f5; }
      .en:last-child { border-bottom:none; }
      .hd { display:flex; justify-content:space-between; gap:8px; align-items:flex-start; }
      .w { font-size:19px; font-weight:700; }
      .rd { color:#7c3aed; font-size:12.5px; margin-left:5px; font-weight:600; }
      .spk { border:none; background:none; font-size:14px; cursor:pointer; padding:0 3px; }
      ul { margin:4px 0 0; padding-left:18px; font-size:13.5px; }
      li { margin:1px 0; }
      .sv { flex:none; border:1px solid #7c3aed; color:#7c3aed; background:#fff; border-radius:7px;
        font-size:12px; font-weight:700; padding:4px 8px; cursor:pointer; white-space:nowrap; }
      .sv.on { border-color:#1a9d5a; color:#1a9d5a; background:#f0faf4; cursor:default; }
      .tr { font-size:14.5px; line-height:1.55; }
      .src { color:#6b7684; font-size:12.5px; margin-top:7px; padding-top:6px; border-top:1px dashed #e6e9ef;
        max-height:70px; overflow:hidden; }
      .lbl { display:inline-block; font-size:10.5px; font-weight:700; color:#7c3aed; border:1px solid #e4d4ff;
        background:#f6f1ff; border-radius:5px; padding:0 6px; margin-bottom:6px; }
      .defs { margin-top:7px; padding-top:6px; border-top:1px dashed #e6e9ef; font-size:12.5px; color:#3b3350; }
      .pos { display:inline-block; font-size:11px; font-weight:700; color:#9333ea; margin-right:4px; text-transform:lowercase; }
      .ex { color:#6b7684; font-style:italic; }
    `;
    const box = document.createElement("div");
    box.className = "box";
    root.appendChild(style);
    root.appendChild(box);
    document.documentElement.appendChild(host);
    boxEl = box;
    const myHost = host;
    requestAnimationFrame(() => { if (myHost === host) place(); });
    return box;
  }

  // Tính vị trí tối ưu quanh con trỏ: ưu tiên dưới, thiếu chỗ thì lật lên trên;
  // ưu tiên phải, thiếu chỗ thì lật sang trái; luôn nằm trọn trong màn hình.
  function computePos(o) {
    const M = 8, GAP = 14;
    const vw = o.vw, vh = o.vh;
    const w = Math.min(o.w, vw - 2 * M);

    let x = o.ax + 12;
    if (x + w > vw - M) x = o.ax - 12 - w;
    if (x < M) x = Math.min(M, vw - w - M);
    if (x + w > vw - M) x = Math.max(M, vw - w - M);

    const below = vh - o.ay - GAP - M;
    const above = o.ay - GAP - M;
    let y, maxH;
    if (o.h <= below) { y = o.ay + GAP; maxH = below; }
    else if (o.h <= above) { y = o.ay - GAP - o.h; maxH = above; }
    else if (below >= above) { y = o.ay + GAP; maxH = Math.max(120, below); }
    else { maxH = Math.max(120, above); y = Math.max(M, o.ay - GAP - maxH); }
    if (y < M) y = M;
    if (y + Math.min(o.h, maxH) > vh - M) y = Math.max(M, vh - Math.min(o.h, maxH) - M);
    return { x, y, w, maxH };
  }

  function place() {
    if (!host || !boxEl || !host.isConnected) return;
    boxEl.style.maxHeight = "none";
    boxEl.style.width = Math.min(340, innerWidth - 16) + "px";
    const natural = boxEl.offsetHeight || boxEl.scrollHeight || 0;
    const p = computePos({ ax: anchor.x, ay: anchor.y, w: 340, h: natural, vw: innerWidth, vh: innerHeight });
    boxEl.style.width = p.w + "px";
    boxEl.style.maxHeight = Math.min(360, p.maxH) + "px";
    host.style.left = p.x + "px";
    host.style.top = p.y + "px";
  }

  // Phát âm: ưu tiên file audio thật của từ điển, không có thì dùng giọng máy (en-US).
  // Giữ sẵn (preload) audio để bấm loa là phát ngay.
  const _audioCache = new Map();
  function getAudio(url) {
    let a = _audioCache.get(url);
    if (!a) { a = new Audio(url); a.preload = "auto"; _audioCache.set(url, a); }
    return a;
  }
  function preloadAudio(url) { if (url) { try { getAudio(url); } catch (e) {} } }
  function ttsSpeak(text) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US"; u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* không có giọng Anh */ }
  }
  function speak(text, audio) {
    if (audio) {
      try {
        const a = getAudio(audio);
        a.currentTime = 0;
        const p = a.play();
        if (p && p.catch) p.catch(() => ttsSpeak(text));
        return;
      } catch (e) { /* rơi xuống TTS */ }
    }
    ttsSpeak(text);
  }
  try { speechSynthesis.getVoices(); } catch (e) {}

  function render(box, res, word) {
    box.textContent = "";
    const entries = (res && res.entries) || [];
    if (!entries.length) {
      const d = document.createElement("div");
      d.className = "st";
      d.textContent = res && res.error ? ("Lỗi: " + res.error) : "Không tìm thấy nghĩa.";
      box.appendChild(d);
      place(); requestAnimationFrame(place);
      return;
    }
    entries.slice(0, 3).forEach((en) => {
      preloadAudio(en.audio);
      const wrap = document.createElement("div"); wrap.className = "en";
      const hd = document.createElement("div"); hd.className = "hd";
      const left = document.createElement("div");
      const w = document.createElement("span"); w.className = "w"; w.textContent = en.word; left.appendChild(w);
      const spk = document.createElement("button"); spk.className = "spk"; spk.textContent = "🔊";
      spk.addEventListener("click", (e) => { e.stopPropagation(); speak(en.word, en.audio); }); left.appendChild(spk);
      if (en.reading) { const r = document.createElement("span"); r.className = "rd"; r.textContent = en.reading; left.appendChild(r); }
      hd.appendChild(left);
      const sv = document.createElement("button"); sv.className = "sv";
      if (res.saved && res.saved[en.word]) { sv.textContent = "✓ Đã lưu"; sv.classList.add("on"); }
      else {
        sv.textContent = "＋ Lưu";
        sv.addEventListener("click", (e) => {
          e.stopPropagation();
          chrome.runtime.sendMessage({ type: "SAVE_WORD", entry: Object.assign({}, en, { src: pageSrc(word) }), dict: res.dict || "envi" }, () => {
            sv.textContent = "✓ Đã lưu"; sv.classList.add("on");
          });
        });
      }
      hd.appendChild(sv);
      wrap.appendChild(hd);
      // Nghĩa tiếng Việt nhiều tầng (định nghĩa tiếng Anh chỉ để ở tab Chi tiết của popup).
      if (en.means && en.means.length) {
        const ul = document.createElement("ul");
        en.means.slice(0, 6).forEach((m) => { const li = document.createElement("li"); li.textContent = m; ul.appendChild(li); });
        wrap.appendChild(ul);
      }
      box.appendChild(wrap);
    });
    place();
    requestAnimationFrame(place);
  }

  function renderTranslate(box, res, text) {
    box.textContent = "";
    if (!res || !res.ok) {
      const d = document.createElement("div");
      d.className = "st";
      d.textContent = (res && res.error) || "Không dịch được.";
      box.appendChild(d);
      return;
    }
    const lbl = document.createElement("div"); lbl.className = "lbl"; lbl.textContent = "DỊCH CÂU";
    box.appendChild(lbl);

    const engText = res.target === "en" ? res.text : text;   // phần tiếng Anh để đọc
    const hd = document.createElement("div"); hd.className = "hd";
    const tr = document.createElement("div"); tr.className = "tr"; tr.textContent = res.text;
    hd.appendChild(tr);
    const right = document.createElement("div"); right.style.cssText = "display:flex;gap:3px;align-items:flex-start;flex:none";
    const spk = document.createElement("button"); spk.className = "spk"; spk.textContent = "🔊"; spk.title = "Nghe câu tiếng Anh";
    spk.addEventListener("click", (e) => { e.stopPropagation(); speak(engText); });
    right.appendChild(spk);
    const sv = document.createElement("button"); sv.className = "sv"; sv.textContent = "＋ Lưu";
    sv.addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({
        type: "SAVE_WORD",
        entry: { word: text, reading: "", means: [res.text], kind: "sent", src: pageSrc(text) },
        dict: "envi"
      }, () => { sv.textContent = "✓ Đã lưu"; sv.classList.add("on"); });
    });
    right.appendChild(sv);
    hd.appendChild(right);
    box.appendChild(hd);

    const src = document.createElement("div"); src.className = "src"; src.textContent = text;
    box.appendChild(src);
    place();
    requestAnimationFrame(place);
  }

  function triggerTranslate(x, y, text) {
    const box = ensureHost(x, y);
    const st = document.createElement("div"); st.className = "st";
    st.textContent = "Đang dịch…";
    box.appendChild(st);
    chrome.runtime.sendMessage({ type: "TRANSLATE", text: text, from: "auto", to: "" }, (res) => {
      if (!host) return;
      if (chrome.runtime.lastError) { st.textContent = "Lỗi: " + chrome.runtime.lastError.message; return; }
      renderTranslate(box, res || {}, text);
    });
  }

  function trigger(x, y, text) {
    const box = ensureHost(x, y);
    const st = document.createElement("div"); st.className = "st";
    st.textContent = "Đang tra “" + text + "”…";
    box.appendChild(st);
    chrome.runtime.sendMessage({ type: "LOOKUP", word: text, dict: "auto" }, (res) => {
      if (!host) return;
      if (chrome.runtime.lastError) { st.textContent = "Lỗi: " + chrome.runtime.lastError.message; return; }
      render(box, res || {}, text);
    });
  }

  function pageSrc(sel) {
    try {
      if (!/^https?:/i.test(location.href)) return null;
      const ctx = selContext();
      return { url: location.href, title: (document.title || "").slice(0, 200),
        sel: (sel || "").slice(0, 400), prefix: ctx.prefix, suffix: ctx.suffix };
    } catch (e) { return null; }
  }
  // Lấy vài chục ký tự ngay trước/sau vùng bôi đen (trong cùng khối) để khi quay lại
  // biết chọn đúng đoạn nếu có nhiều chỗ giống nhau trên trang.
  function selContext() {
    const out = { prefix: "", suffix: "" };
    try {
      const s = window.getSelection();
      if (!s || !s.rangeCount) return out;
      const range = s.getRangeAt(0);
      let c = range.commonAncestorContainer;
      if (c.nodeType === 3) c = c.parentNode;
      const block = (c && c.closest && c.closest("p,li,td,th,blockquote,h1,h2,h3,h4,h5,article,section,main,div")) || document.body;
      const pre = range.cloneRange(); pre.collapse(true); pre.setStart(block, 0);
      out.prefix = (pre.toString() || "").replace(/\s+/g, " ").trim().slice(-60);
      const post = range.cloneRange(); post.collapse(false); post.setEnd(block, block.childNodes.length);
      out.suffix = (post.toString() || "").replace(/\s+/g, " ").trim().slice(0, 60);
    } catch (e) { /* trang lạ — bỏ qua ngữ cảnh */ }
    return out;
  }

  // ===== Mở lại nguồn: tô sáng lại từ/câu đã lưu khi quay về trang gốc =====
  function sameDoc(a, b) {
    try { const ua = new URL(a), ub = new URL(b);
      return ua.origin === ub.origin && ua.pathname === ub.pathname && ua.search === ub.search;
    } catch (e) { return a === b; }
  }
  function hlStyle() {
    if (document.getElementById("__neu_hl_style")) return;
    const s = document.createElement("style");
    s.id = "__neu_hl_style";
    s.textContent =
      "mark.__neu_hl{background:#f6d5ff!important;color:inherit!important;" +
      "box-shadow:0 0 0 3px #f6d5ff,0 0 0 5px #a855f7!important;border-radius:2px!important;" +
      "animation:__neu_pulse 1s ease-in-out 3!important;cursor:pointer}" +
      "@keyframes __neu_pulse{0%,100%{box-shadow:0 0 0 3px #f6d5ff,0 0 0 5px #a855f7}" +
      "50%{box-shadow:0 0 0 3px #fbe6ff,0 0 0 8px #c084fc}}" +
      ".__neu_toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);" +
      "background:#1c2430;color:#fff;font:13px/1.4 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;" +
      "padding:9px 14px;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.3);z-index:2147483647;" +
      "max-width:80vw;opacity:0;transition:opacity .25s}.__neu_toast.show{opacity:1}";
    (document.head || document.documentElement).appendChild(s);
  }
  function neuToast(msg) {
    hlStyle();
    const t = document.createElement("div");
    t.className = "__neu_toast";
    t.textContent = msg;
    document.documentElement.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 3500);
  }
  // ===== Bộ tô sáng bền vững, bám theo NỘI DUNG (đa-node) =====
  // Dựng chỉ mục văn bản chuẩn hoá của cả trang rồi tìm lại ĐÚNG đoạn đã lưu — kể cả
  // đoạn dài trải nhiều thẻ — và bọc <mark>. Kỹ thuật tham khảo từ Neuron Note.
  const squash = (s) => String(s || "").replace(/[\s\u200b]+/g, " ").trim();
  const HL_BLOCK = { P:1,DIV:1,LI:1,TD:1,TH:1,TR:1,BLOCKQUOTE:1,PRE:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,
    ARTICLE:1,SECTION:1,MAIN:1,HEADER:1,FOOTER:1,ASIDE:1,UL:1,OL:1,DL:1,DT:1,DD:1,FIGURE:1,
    FIGCAPTION:1,BR:1,HR:1,TABLE:1,NAV:1 };
  function nearestBlock(el) {
    let e = el;
    while (e && e !== document.body) { if (HL_BLOCK[e.tagName]) return e; e = e.parentElement; }
    return document.body;
  }
  function acceptTextNode(n) {
    const p = n.parentElement;
    if (!p) return NodeFilter.FILTER_REJECT;
    const tag = p.nodeName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA" || tag === "TITLE")
      return NodeFilter.FILTER_REJECT;
    if (p.closest && p.closest("mark.__neu_hl")) return NodeFilter.FILTER_REJECT;
    if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }
  // map[i] = {node, off} cho từng ký tự; chèn dấu cách ở ranh giới khối như khi trình duyệt nối chuỗi.
  function makeIndex(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: acceptTextNode });
    let norm = ""; const map = [];
    let prevBlock = null, first = true, needSpace = false, spaceSrc = null, n;
    while ((n = walker.nextNode())) {
      const block = nearestBlock(n.parentElement);
      if (!first && block !== prevBlock) needSpace = true;
      prevBlock = block; first = false;
      const s = n.nodeValue;
      for (let k = 0; k < s.length; k++) {
        const ch = s[k];
        if (/[\s\u200b]/.test(ch)) { needSpace = true; if (!spaceSrc) spaceSrc = { node: n, off: k }; continue; }
        if (needSpace && norm.length) { norm += " "; map.push(spaceSrc); }
        needSpace = false; spaceSrc = null;
        norm += ch; map.push({ node: n, off: k });
      }
    }
    return { norm, map };
  }
  function rangesFromNorm(idx, start, end) {
    const segs = []; let cur = null;
    for (let i = start; i < end; i++) {
      const e = idx.map[i];
      if (!e) continue;                       // dấu cách ranh giới — bỏ qua
      if (cur && cur.node === e.node) cur.end = e.off + 1;
      else { if (cur) segs.push(cur); cur = { node: e.node, start: e.off, end: e.off + 1 }; }
    }
    if (cur) segs.push(cur);
    return segs;
  }
  function tailMatch(a, b){ let i=0; while(i<a.length&&i<b.length&&a[a.length-1-i]===b[b.length-1-i])i++; return i; }
  function headMatch(a, b){ let i=0; while(i<a.length&&i<b.length&&a[i]===b[i])i++; return i; }
  function firstWords(s,n){ return squash(s).split(" ").filter(Boolean).slice(0,n).join(" "); }
  function lastWords(s,n){ return squash(s).split(" ").filter(Boolean).slice(-n).join(" "); }
  // Tìm lại đoạn đã lưu → trả {start,end} theo chỉ số norm, hoặc null.
  function findAnchor(idx, note) {
    const target = squash(note.text); if (!target) return null;
    const hay = idx.norm;
    let hits = []; let p = hay.indexOf(target);
    while (p !== -1 && hits.length < 80) { hits.push(p); p = hay.indexOf(target, p + 1); }
    if (!hits.length) {
      const lowHay = hay.toLowerCase(), lowT = target.toLowerCase();
      p = lowHay.indexOf(lowT);
      while (p !== -1 && hits.length < 80) { hits.push(p); p = lowHay.indexOf(lowT, p + 1); }
    }
    if (hits.length) {
      let pos = hits[0];
      if (hits.length > 1) {                  // trùng nhiều chỗ → dùng prefix/suffix chọn đúng
        const pfx = squash(note.prefix || "").slice(-40);
        const sfx = squash(note.suffix || "").slice(0, 40);
        let best = -1;
        hits.forEach((h) => {
          const before = squash(hay.slice(Math.max(0, h - 60), h));   // squash: bỏ dấu cách ranh giới
          const after = squash(hay.slice(h + target.length, h + target.length + 60));
          const score = (pfx ? tailMatch(before, pfx) : 0) + (sfx ? headMatch(after, sfx) : 0);
          if (score > best) { best = score; pos = h; }
        });
      }
      return { start: pos, end: pos + target.length };
    }
    // Đoạn dài: khớp vài từ đầu + vài từ cuối, lấy cả khoảng ở giữa.
    const words = target.split(" ");
    if (words.length >= 8) {
      const head = firstWords(target, 6), tail = lastWords(target, 6);
      const lowHay = hay.toLowerCase();
      let hp = hay.indexOf(head); if (hp === -1) hp = lowHay.indexOf(head.toLowerCase());
      if (hp !== -1) {
        let tp = hay.indexOf(tail, hp + head.length);
        if (tp === -1) tp = lowHay.indexOf(tail.toLowerCase(), hp + head.length);
        if (tp !== -1) { const end = tp + tail.length; if (end - hp <= target.length * 1.8 + 40) return { start: hp, end }; }
      }
    }
    return null;
  }
  function paintAnchor(note) {
    const idx = makeIndex(document.body);
    const anchor = findAnchor(idx, note);
    if (!anchor) return false;
    const segs = rangesFromNorm(idx, anchor.start, anchor.end);
    if (!segs.length) return false;
    // bọc từ đoạn CUỐI về đầu: splitText chỉ dịch offset của chính node đó
    for (let i = segs.length - 1; i >= 0; i--) {
      const seg = segs[i]; let node = seg.node;
      try {
        const len = node.nodeValue.length;
        const end = Math.min(seg.end, len);
        const start = Math.min(seg.start, end);
        if (end < len) node.splitText(end);
        if (start > 0) node = node.splitText(start);
        const m = document.createElement("mark");
        m.className = "__neu_hl";
        node.parentNode.insertBefore(m, node);
        m.appendChild(node);
      } catch (e) { /* bỏ qua đoạn không tách được */ }
    }
    return document.querySelectorAll("mark.__neu_hl").length > 0;
  }
  function doHighlight(note) {
    hlStyle();
    if (!paintAnchor(note)) return false;
    const marks = document.querySelectorAll("mark.__neu_hl");
    if (!marks.length) return false;
    try { marks[0].scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }); } catch (e) {}
    const clean = () => {
      document.querySelectorAll("mark.__neu_hl").forEach((m) => {
        const parent = m.parentNode; if (!parent) return;
        while (m.firstChild) parent.insertBefore(m.firstChild, m);
        parent.removeChild(m); parent.normalize();
      });
    };
    marks.forEach((m) => m.addEventListener("click", clean));
    setTimeout(clean, 15000);
    return true;
  }
  function tryHighlight(note, tries) {
    if (doHighlight(note)) return;
    if (tries > 0) { setTimeout(() => tryHighlight(note, tries - 1), 400); return; }
    neuToast("NeutronDict: không tìm thấy vị trí của mục này trên trang (nội dung có thể đã thay đổi).");
  }
  (function checkPendingHighlight() {
    try {
      if (!/^https?:/i.test(location.href)) return;
      chrome.storage.local.get("pendingHighlight", (r) => {
        const ph = r && r.pendingHighlight;
        if (!ph || !ph.url || !ph.text) return;
        if (Date.now() - (ph.ts || 0) > 60000) { chrome.storage.local.remove("pendingHighlight"); return; }
        if (!sameDoc(ph.url, location.href)) return;
        chrome.storage.local.remove("pendingHighlight");
        const run = () => tryHighlight({ text: ph.text, prefix: ph.prefix || "", suffix: ph.suffix || "" }, 15);
        if (document.readyState === "complete") setTimeout(run, 300);
        else window.addEventListener("load", () => setTimeout(run, 300), { once: true });
      });
    } catch (e) { /* bỏ qua */ }
  })();

  document.addEventListener("mousedown", (e) => {
    lastCtrl = e.ctrlKey || e.metaKey;
    if (host && !e.composedPath().includes(host)) close();
  }, true);

  document.addEventListener("mouseup", (e) => {
    if (host && e.composedPath().includes(host)) return;
    if (!S.inline) return;
    if (S.requireCtrl && !(lastCtrl || e.ctrlKey || e.metaKey)) return;
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (!text) return;
      const x = e.clientX + 12, y = e.clientY + 16;
      const lim = S.maxLen || 40;
      // Là CÂU nếu dài hơn giới hạn hoặc có dấu câu / xuống dòng -> dịch, không tra từ điển.
      const isSentence = text.length > lim || /[.!?;:\n]/.test(text);
      if (!isSentence) { trigger(x, y, text); return; }
      if (S.translate !== false && text.length <= (S.maxSent || 400)) triggerTranslate(x, y, text);
    }, 10);
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("blur", close);
  window.addEventListener("resize", () => { if (host) place(); });
})();
