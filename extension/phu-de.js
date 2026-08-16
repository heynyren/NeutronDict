/**
 * LỜI THOẠI YOUTUBE — bảng phụ đề bám theo video, nối thẳng vào sổ tay
 * ====================================================================
 *
 * Xem một video tiếng Anh mà nghe hụt một câu thì bình thường phải: bật phụ
 * đề của YouTube, tua đi tua lại, chép tay câu đó sang chỗ khác để tra. Đến khi
 * tra xong thì quên mất mình đang xem tới đâu, và vài hôm sau nhìn lại cái từ
 * trong sổ cũng chẳng nhớ nó ở video nào, phút thứ mấy.
 *
 * File này bỏ hết chỗ đó đi: lời thoại nằm ngay cạnh video, tự sáng dòng đang
 * nói, bấm dòng nào là tua tới đó, bôi đen chữ nào là ra đúng cái popup ba tab
 * quen thuộc — và mục lưu về sổ tay mang theo cả **video lẫn mốc giây**, nên
 * sau này mở nguồn là nhảy về đúng chỗ người ta đang nói câu đó.
 *
 * Ba điều đáng nói về cách làm:
 *
 * 1. KHÔNG nghe gì cả. Trang xem video đã có sẵn danh sách phụ đề kèm mốc thời
 *    gian; việc còn lại chỉ là tìm nhị phân theo `video.currentTime`. Nhờ vậy
 *    "thời gian thực" không tốn mạng, không lệch, và chạy được cả khi tua.
 *
 * 2. GHÉP CUE THÀNH CÂU trước khi làm bất cứ việc gì. Phụ đề tự sinh cắt theo
 *    hơi thở chứ không theo câu — "và cái mà tôi muốn" / "nói ở đây là" / "thiết
 *    bị đóng cắt". Ném từng mẩu đó đi dịch thì ra rác, mà lưu vào sổ tay thì ra
 *    những mục cụt đầu cụt đuôi. Xem `ghepCau`.
 *
 * 3. Đây KHÔNG phải một loại mục mới. Nó chỉ là một loại **nguồn** mới:
 *    `src.yt = {v, t}` nằm cạnh `src.url` sẵn có. Nhờ vậy sổ tay, sóng ôn tập,
 *    sửa nghĩa, ghi chú, xuất Anki, đồng bộ — chạy nguyên, không sửa gì.
 */
(() => {
  "use strict";
  if (location.hostname.indexOf("youtube.com") < 0) return;

  /* ================================================================== */
  /* Lấy phụ đề                                                          */
  /* ================================================================== */

  /**
   * Cắt một object JSON nhúng trong HTML, đếm ngoặc chứ không dùng biểu thức
   * chính quy: nội dung bên trong có cả `}` lẫn `;` nằm trong chuỗi, regex sẽ
   * cắt nhầm ở video đầu tiên có dấu ngoặc trong tiêu đề.
   */
  function catJSON(html, khoa) {
    const i = html.indexOf(khoa);
    if (i < 0) return null;
    const b = html.indexOf("{", i);
    if (b < 0) return null;
    let sau = 0, trongChuoi = false, thoat = false;
    for (let k = b; k < html.length; k++) {
      const c = html[k];
      if (thoat) { thoat = false; continue; }
      if (c === "\\") { if (trongChuoi) thoat = true; continue; }
      if (c === '"') { trongChuoi = !trongChuoi; continue; }
      if (trongChuoi) continue;
      if (c === "{") sau++;
      else if (c === "}") { sau--; if (!sau) { try { return JSON.parse(html.slice(b, k + 1)); } catch (e) { return null; } } }
    }
    return null;
  }

  /* ---- Cầu nối sang thế giới của trang (xem phu-de-trang.js) ---- */

  let soHoi = 0;
  function hoiTrang(viec, url) {
    return new Promise((giai) => {
      const id = "njd" + (++soHoi);
      let xong = false;
      const nghe = (e) => {
        const d = e.data;
        if (e.source !== window || !d || d.__njd !== "tra" || d.id !== id) return;
        xong = true; window.removeEventListener("message", nghe); giai(d.kq || null);
      };
      window.addEventListener("message", nghe);
      window.postMessage({ __njd: "hoi", id: id, viec: viec, url: url }, "*");
      // Không có bên kia trả lời (trang chặn, hoặc Chrome cũ không cho world:MAIN)
      // thì đừng treo mãi — còn hai đường khác để đi.
      setTimeout(() => { if (!xong) { window.removeEventListener("message", nghe); giai(null); } }, 4000);
    });
  }

  /** Thân trả về có đúng là JSON không — YouTube hay trả 200 kèm thân RỖNG. */
  function laJson(t) {
    const x = (t || "").trim();
    return x.length > 2 && (x[0] === "{" || x[0] === "[");
  }

  /**
   * Danh sách bản phụ đề của một video.
   *
   * Tải lại chính trang xem thay vì đọc `ytInitialPlayerResponse` của trang
   * đang mở: YouTube là ứng dụng một trang, chuyển video KHÔNG tải lại trang,
   * nên biến toàn cục đó thường vẫn là của video trước. Tự tải theo đúng mã
   * video thì không bao giờ nhầm. Đây là fetch cùng nguồn từ content script nên
   * có sẵn cookie và không cần xin thêm quyền nào.
   */
  async function layBanPhuDe(v) {
    // Hỏi thẳng trình phát trước: nhanh, và chắc chắn là của ĐÚNG video đang mở.
    let pr = null;
    const q = await hoiTrang("player");
    if (q && q.ok && q.pr && q.pr.videoDetails && q.pr.videoDetails.videoId === v) pr = q.pr;

    if (!pr) {
      const r = await fetch("/watch?v=" + encodeURIComponent(v), { credentials: "include" });
      if (!r.ok) throw new Error("Không tải được trang video (HTTP " + r.status + ")");
      pr = catJSON(await r.text(), "ytInitialPlayerResponse");
    }
    if (!pr) throw new Error("Không đọc được dữ liệu trình phát");
    const ds = pr.videoDetails || {};
    const ct = ((pr.captions || {}).playerCaptionsTracklistRenderer || {}).captionTracks || [];
    return {
      tieuDe: ds.title || "",
      kenh: ds.author || "",
      ban: ct.map((t) => ({
        url: t.baseUrl,
        ma: t.languageCode || "",
        ten: (t.name && (t.name.simpleText || (t.name.runs || []).map((x) => x.text).join(""))) || t.languageCode || "?",
        tuDong: t.kind === "asr"
      })).filter((t) => t.url)
    };
  }

  /**
   * Đọc json3 thành các MẨU nhỏ nhất còn giữ được mốc thời gian.
   *
   * Phụ đề tự sinh thường kèm `tOffsetMs` cho từng từ. Giữ lại thì tô sáng được
   * đúng chữ đang nói chứ không chỉ đúng câu — mà đó mới là thứ giúp bám kịp
   * người bản xứ nói nhanh. Phụ đề người làm thường mỗi sự kiện một mẩu, lúc đó
   * mẩu = một dòng phụ đề, vẫn nhỏ hơn câu nhiều.
   *
   * Cố ý KHÔNG cắt bỏ khoảng trắng đầu/cuối mỗi mẩu: với tiếng có dấu cách,
   * dấu cách nằm ở đầu mẩu sau, cắt đi là dính chữ.
   */
  function docJson3(txt) {
    const d = JSON.parse(txt);
    const out = [];
    (d.events || []).forEach((e) => {
      if (!e.segs) return;
      const t0 = (e.tStartMs || 0) / 1000;
      const dai = (e.dDurationMs || 0) / 1000;
      const segs = e.segs.filter((x) => (x.utf8 || "").trim());
      segs.forEach((x, i) => {
        const lech = (x.tOffsetMs || 0) / 1000;
        const sau = segs[i + 1];
        const lechSau = sau ? ((sau.tOffsetMs || 0) / 1000) : dai;
        out.push({
          t: t0 + lech,
          d: Math.max(0.05, lechSau - lech),
          s: String(x.utf8).replace(/\s+/g, " "),
          // Mẩu cuối của một sự kiện = chỗ YouTube xuống dòng. Không đáng tin để
          // làm ranh giới câu, nhưng cat-cau.js vẫn nhận nó làm gợi ý yếu.
          ev: i === segs.length - 1
        });
      });
    });
    return out;
  }

  /**
   * Tải một bản phụ đề về dạng [{t, d, s}] (giây, giây, chữ).
   *
   * Ba đường, đi lần lượt cho tới khi có chữ:
   *   1. fetch TỪ TRONG TRANG — đúng ngữ cảnh trình phát, cửa còn rộng nhất.
   *   2. fetch từ content script — cùng nguồn, có cookie.
   *   3. nhờ chính YouTube: mở bảng "bản chép lời" của họ rồi đọc DOM.
   *
   * Vì sao phải ba đường: YouTube đang siết `timedtext`, và khi từ chối thì nó
   * trả về 200 kèm thân RỖNG chứ không báo lỗi tử tế. Đường 3 chậm và xấu, bù
   * lại gần như không bao giờ hỏng — vì phần khó (giấy phép, mã thông báo) do
   * chính YouTube làm, mình chỉ đọc lại kết quả.
   */
  async function layCue(ban) {
    const u = ban.url + "&fmt=json3";
    let txt = "";

    const a = await hoiTrang("fetch", u);
    if (a && a.ok && laJson(a.text)) txt = a.text;

    if (!txt) {
      try {
        const r = await fetch(u, { credentials: "include" });
        if (r.ok) { const t = await r.text(); if (laJson(t)) txt = t; }
      } catch (e) { /* rơi xuống đường 3 */ }
    }

    if (txt) {
      try { const cs = docJson3(txt); if (cs.length) return { cue: cs, cach: "api" }; } catch (e) { /* rơi xuống */ }
    }

    const cs = await capBangYouTube();
    if (cs.length) return { cue: cs, cach: "bang" };
    const kh = khungBang();
    if (kh.length) {
      throw new Error("Thấy bảng bản chép lời của YouTube nhưng không đọc được dòng nào — "
        + "có vẻ họ vừa đổi cách dựng bảng. Bấm Thử lại; còn không thì báo lại để sửa. "
        + "(khung: " + kh.length + " · thẻ quen: "
        + document.querySelectorAll("ytd-transcript-segment-renderer").length + ")");
    }
    throw new Error("YouTube không cho tải phụ đề, mà cũng chưa mở được bảng bản chép lời của họ. "
      + "Bấm “…” dưới video → “Hiện bản chép lời” — hiện ra là chỗ này tự lấy, không cần bấm gì thêm.");
  }

  /* ---- Đường 3: đọc lại bảng bản chép lời của chính YouTube ---- */

  const doi = (ms) => new Promise((r) => setTimeout(r, ms));

  /** "1:06" -> 66; "1:02:03" -> 3723. */
  function giayTu(s) {
    const p = String(s || "").trim().split(":").map((x) => parseInt(x, 10) || 0);
    if (!p.length) return 0;
    return p.reduce((a, b) => a * 60 + b, 0);
  }

  /** Bảng bản chép lời của YouTube, nếu đang có trên trang. */
  /**
   * MỌI khung có thể là bảng bản chép lời, chứ không chỉ khung đầu tiên.
   *
   * Hai chỗ từng làm hỏng và giờ đều được tính tới:
   *  · YouTube đổi target-id của bảng (bản cập nhật giao diện 02/2026), nên dò
   *    đúng một chuỗi cũ là trượt — dò theo "có chứa chữ transcript" thì không.
   *  · Trên trang luôn có SẴN vài khung engagement panel rỗng nằm chờ. Lấy đúng
   *    khung đầu tiên tìm được thì rất dễ vớ phải một khung rỗng, rồi kết luận
   *    "thấy bảng mà không đọc được dòng nào" trong khi bảng thật đầy chữ ngay
   *    bên cạnh.
   */
  function khungBang() {
    const ra = [];
    const them = (n) => { if (n && ra.indexOf(n) < 0) ra.push(n); };
    document.querySelectorAll('[target-id*="transcript" i]').forEach(them);
    document.querySelectorAll(
      "ytd-transcript-renderer, ytd-transcript-segment-list-renderer, ytd-transcript-search-panel-renderer"
    ).forEach(them);
    return ra;
  }

  /** Quét cả trong shadow root mở — dùng trong phạm vi hẹp thôi, vì tốn. */
  function quetSau(goc, hop, ra) {
    ra = ra || [];
    const con = goc.querySelectorAll ? goc.querySelectorAll("*") : [];
    for (const el of con) {
      if (hop(el)) ra.push(el);
      if (el.shadowRoot) quetSau(el.shadowRoot, hop, ra);
    }
    return ra;
  }

  /**
   * Các dòng trong bảng bản chép lời của YouTube.
   *
   * Đi từ chắc nhất tới liều nhất, vì đây là DOM của người khác và họ đổi luôn:
   *   1. đúng tên thẻ quen thuộc;
   *   2. tên thẻ nào có chứa "transcript-segment", tìm cả trong shadow root;
   *   3. bí quá thì bất cứ dòng nào trong bảng mà chữ MỞ ĐẦU bằng một mốc giờ —
   *      cái đó thì YouTube có đổi kiểu gì cũng còn, vì người đọc cần nhìn thấy.
   */
  /**
   * Con theo cây ĐÃ DÀN PHẲNG.
   *
   * Phải dùng cái này chứ không phải el.children: một khối dựng nội dung trong
   * shadow root thì nhìn từ ngoài là "không có con nào", nên nó tự nhận mình là
   * dòng trong cùng — và thế là cả khối chứa ba dòng lại bị đếm thành một dòng
   * thứ tư, dính cả ba câu vào nhau.
   */
  function conDaDan(el) {
    if (el.shadowRoot) return [...el.shadowRoot.children];
    return [...(el.children || [])];
  }

  /** Dòng trong cùng trông giống một dòng bản chép lời. */
  function laDongTrongCung(el) {
    if (!laDong(el)) return false;
    // Phải xét con bằng laDong chứ không phải "có mốc giờ": ô chứa RIÊNG mốc giờ
    // ("0:00") cũng có mốc giờ, và nếu tính nó là con hợp lệ thì chính dòng cha
    // bị loại — rốt cuộc không nhặt được dòng nào.
    for (const c of conDaDan(el)) if (laDong(c)) return false;
    return true;
  }

  /**
   * @param {boolean} [sau] quét sâu cả trang khi mọi cách trên đều trượt. Chỉ
   *   bật ở lượt nạp, KHÔNG bật trong vòng canh DOM — quét cả trang YouTube mỗi
   *   250ms thì chính mình làm trang giật.
   */
  function doanBang(sau) {
    const a = document.querySelectorAll("ytd-transcript-segment-renderer");
    if (a.length) return [...a];

    const khung = khungBang();
    // Khung nào cũng thử, và lấy khung ĐẦU TIÊN CÓ CHỮ — không phải khung đầu tiên.
    for (const k of khung) {
      const b = quetSau(k, (el) => /transcript-segment/i.test(el.tagName || ""));
      if (b.length) return b;
    }
    for (const k of khung) {
      // Đòi ít nhất 3 dòng: một dòng lẻ trông giống mốc giờ thì trang nào chẳng
      // có (thời lượng video, mốc chương…), ba dòng liền thì mới là bản chép lời.
      const c = quetSau(k, laDongTrongCung);
      if (c.length >= 3) return c;
    }
    if (!sau) return [];

    // Đường cùng: quét cả trang, kể cả trong shadow root. Tốn, nhưng chỉ chạy
    // một lượt khi mọi cách khác đã trượt. Nhớ bỏ qua CHÍNH BẢNG NÀY — dòng của
    // nó cũng là "mốc giờ rồi tới chữ", ăn lại đầu ra của mình thì thành vòng.
    const d = quetSau(document.body, (el) =>
      laDongTrongCung(el) && !(el.closest && el.closest("[data-ndict-yt]")));
    return d.length >= 3 ? d : [];
  }

  const MOC_GIO = /^(\d{1,2}:\d{2}(?::\d{2})?)\s*([\s\S]+)$/;

  /**
   * Chữ của một phần tử, tính cả phần nằm trong shadow root mở.
   *
   * textContent thường không thấy gì nếu thành phần đó dựng nội dung bên trong
   * shadow root — mà từ ngoài nhìn vào thì chữ vẫn hiện đầy trên màn hình. Đi
   * theo cây ĐÃ DÀN PHẲNG (gặp <slot> thì lấy phần được gán vào) để không đếm
   * trùng chữ hai lần.
   */
  function chuSau(el) {
    let s = "";
    const di = (n) => {
      if (!n) return;
      if (n.nodeType === 3) { s += n.nodeValue; return; }
      if (n.nodeType !== 1 && n.nodeType !== 11) return;
      if (n.tagName === "SLOT" && n.assignedNodes) { n.assignedNodes({ flatten: true }).forEach(di); return; }
      if (n.shadowRoot) { di(n.shadowRoot); return; }
      n.childNodes.forEach(di);
    };
    di(el);
    return s.replace(/\s+/g, " ").trim();
  }

  /** Trông có giống một dòng bản chép lời không: mốc giờ, RỒI tới chữ. */
  function laDong(el) {
    const m = chuSau(el).match(MOC_GIO);
    return !!(m && m[2] && m[2].trim());
  }

  /**
   * Đọc một dòng thành {t, s}.
   *
   * Bản trước bám vào hai lớp CSS .segment-timestamp / .segment-text. Bảng của
   * YouTube hiện ra đầy chữ ngay trên màn hình mà chỗ này vẫn đọc ra rỗng, rồi
   * báo "không mở được" — nhìn rất vô lý. Nay không có lớp quen thuộc thì đọc
   * thẳng chữ của cả dòng và tách mốc giờ ở đầu.
   */
/**
   * Số giây của một cụm giờ ĐỌC THÀNH CHỮ: "43 seconds", "1 minute, 11 seconds",
   * "1 phút 11 giây", "20秒". Trả về null nếu đầu chuỗi không phải cụm như vậy.
   */
  function giayTuChu(chu) {
    const m = String(chu || "").match(
      /^\s*((?:\d+\s*(?:hours?|hrs?|minutes?|mins?|seconds?|secs?|giờ|phút|giây|時間|分|秒)[,\s]*)+)/i);
    if (!m) return null;
    let tong = 0, co = false;
    m[1].replace(/(\d+)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?|giờ|phút|giây|時間|分|秒)/gi,
      (_, n, dv) => {
        const d = dv.toLowerCase();
        const he = /^(h|giờ|時間)/.test(d) ? 3600 : /^(m|phút|分)/.test(d) ? 60 : 1;
        tong += (+n) * he; co = true; return "";
      });
    return co ? { giay: tong, dai: m[1].length } : null;
  }

  /**
   * Gỡ phần mốc giờ bị lặp ở đầu dòng.
   *
   * Bảng của YouTube nhét thêm một bản mốc giờ ĐỌC THÀNH CHỮ cho trình đọc màn
   * hình ("43 seconds"). Mắt không thấy, nhưng đọc chữ thô thì thấy — và thế là
   * nó chui vào câu, rồi chui luôn sang bản dịch: "20 giây Đó là một cánh đồng
   * lúa…". Vô nghĩa với người đọc, mà còn làm máy dịch hiểu lệch cả câu.
   *
   * Chỉ gỡ khi cụm đó ĐÚNG BẰNG mốc giờ của chính dòng này. Gỡ bừa mọi cụm giờ
   * ở đầu câu thì có ngày cắt mất chữ thật — người ta vẫn mở đầu bằng "20秒で…".
   */
  function donDauDong(chu, t) {
    let s = String(chu || "").trim();
    for (let i = 0; i < 3; i++) {
      const g = giayTuChu(s);
      if (g && Math.abs(g.giay - t) <= 1) { s = s.slice(g.dai).trim(); continue; }
      const lap = s.match(/^(\d{1,2}:\d{2}(?::\d{2})?)[\s·-]*/);
      if (lap && Math.abs(giayTu(lap[1]) - t) <= 1) { s = s.slice(lap[0].length).trim(); continue; }
      break;
    }
    return s;
  }

  function docDoan(el) {
    const tim = (sel) => (el.querySelector && el.querySelector(sel))
      || (el.shadowRoot && el.shadowRoot.querySelector(sel)) || null;
    const ts = tim(".segment-timestamp"), tx = tim(".segment-text");
    if (ts && tx && chuSau(tx)) {
      const t = giayTu(chuSau(ts));
      return { t: t, s: donDauDong(chuSau(tx), t) };
    }
    const m = chuSau(el).match(MOC_GIO);
    if (m) {
      const t = giayTu(m[1]);
      return { t: t, s: donDauDong(m[2], t) };
    }
    return null;
  }

  /** Nút mở bản chép lời của YouTube — thử theo cấu trúc trước, rồi theo nhãn. */
  function timNutChepLoi() {
    const a = document.querySelector(
      "ytd-video-description-transcript-section-renderer button, " +
      "ytd-video-description-transcript-section-renderer ytd-button-renderer button");
    if (a) return a;
    // YouTube đổi cấu trúc HTML luôn xoành xoạch, nhưng CHỮ trên nút thì bền hơn.
    const nhan = /transcript|bản chép lời|文字起こし|스크립트/i;
    const ds = document.querySelectorAll("button, tp-yt-paper-button, yt-button-shape button");
    for (const b of ds) {
      const chu = (b.getAttribute("aria-label") || "") + " " + (b.textContent || "");
      if (nhan.test(chu)) return b;
    }
    return null;
  }

  /**
   * Chờ tới khi bảng bản chép lời của YouTube CÓ CHỮ.
   *
   * Dùng MutationObserver chứ không đếm nhịp cho đủ số lần: video một tiếng thì
   * YouTube dựng bảng lâu hơn hẳn video năm phút, mà đặt sẵn một hạn cứng thì
   * kiểu gì cũng có video vượt qua — và lúc đó người dùng nhìn thấy bảng của họ
   * đầy chữ ngay trên màn hình trong khi mình báo "không mở được", vô lý.
   */
  function choDoan(han) {
    return new Promise((giai) => {
      if (doanBang().length) { giai(true); return; }
      let xong = false;
      const thoi = (v) => { if (xong) return; xong = true; qs.disconnect(); clearTimeout(h); clearTimeout(hen); giai(v); };
      // YouTube đụng vào DOM liên tục, mà việc dò dòng thì không phải rẻ — hãm
      // lại, đừng chạy theo từng thay đổi một.
      let hen = 0;
      const qs = new MutationObserver(() => {
        if (hen) return;
        hen = setTimeout(() => { hen = 0; if (doanBang().length) thoi(true); }, 250);
      });
      qs.observe(document.body, { childList: true, subtree: true });
      const h = setTimeout(() => thoi(false), han || 20000);
    });
  }

  /**
   * Đóng bảng bản chép lời của YouTube.
   *
   * Ba cách, vì cách thứ nhất bám vào id của người ta: nút đóng theo id, nút nào
   * trong bảng có nhãn "đóng", và cuối cùng là đặt thẳng thuộc tính trạng thái
   * mà chính YouTube dùng để ẩn bảng. Không đóng được thì bảng của họ nằm lại
   * chình ình bên cạnh bảng này — hai bảng lời thoại cùng lúc, thừa và rối.
   */
  function dongBangYouTube() {
    for (const bang of khungBang()) {
      const nut = bang.querySelector("#visibility-button button")
        || [...bang.querySelectorAll("button")].find((b) =>
          /close|đóng|閉じ/i.test((b.getAttribute("aria-label") || "") + " " + (b.title || "")));
      if (nut) { nut.click(); continue; }
      try { bang.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_HIDDEN"); } catch (e) { /* thôi vậy */ }
    }
  }

  async function capBangYouTube() {
    let taMo = false, taMoTa = false;       // mình mở hay vốn đã mở sẵn
    if (!doanBang().length) {
      // Nút "bản chép lời" nằm trong phần mô tả, mà phần mô tả thì đang thu gọn.
      const mo = document.querySelector(
        "#description-inline-expander #expand, ytd-text-inline-expander #expand, tp-yt-paper-button#expand");
      if (mo) { mo.click(); taMoTa = true; await doi(500); }
      const nut = timNutChepLoi();
      if (nut) { nut.click(); taMo = true; }
      await choDoan(20000);
    }

    const ds = [];
    doanBang(true).forEach((el) => {
      const d = docDoan(el);
      if (d && d.s) ds.push({ t: d.t, d: 0, s: d.s });
    });
    // Bảng của YouTube không cho biết mỗi mẩu dài bao lâu -> suy từ mốc mẩu sau.
    for (let i = 0; i < ds.length; i++) ds[i].d = (i + 1 < ds.length) ? Math.max(0, ds[i + 1].t - ds[i].t) : 4;
    // Bảng của họ không có mốc theo từ, nên mẩu nhỏ nhất ở đây là một dòng —
    // vẫn đủ để tô sáng nhỏ hơn câu.

    // Chỉ đóng bảng nếu CHÍNH MÌNH mở nó ra. Bạn tự mở để đọc mà nó tự đóng lại
    // thì khó chịu hơn nhiều so với việc bảng này bị đẩy xuống một đoạn.
    if (taMo) dongBangYouTube();
    if (taMoTa) {
      const gap = document.querySelector("#description-inline-expander #collapse, ytd-text-inline-expander #collapse, tp-yt-paper-button#collapse");
      if (gap) gap.click();
    }
    return ds;
  }

  /* ================================================================== */
  /* Ghép cue thành câu                                                  */
  /* ================================================================== */

  // Thuật toán nằm ở cat-cau.js — nó dài và có luật riêng của tiếng Nhật, để
  // lẫn vào đây thì vừa khó đọc vừa khó thử. Xem đầu tệp đó để biết cách cắt.
  const ghepCau = (cues, opt) => self.CatCau.ghepCau(cues, opt);

  /**
   * Mã ngôn ngữ của bản chép lời, đoán từ chính chữ chứ không tin mã mà YouTube
   * khai. Dùng làm ngôn ngữ NGUỒN khi dịch: kênh tiếng Anh mở trong NeutronDict thì
   * cũng phải dịch đúng từ tiếng Nhật, chứ ép "en" là ra một mớ vô nghĩa.
   */
  function nguNguon() {
    const c = S.cau && S.cau[0];
    if (!c) return "en";
    return self.CatCau.doanNgu(S.cau.slice(0, 20).map((x) => x.s).join(" ")).ma;
  }

  /* ================================================================== */
  /* Trạng thái                                                          */
  /* ================================================================== */

  const S = {
    v: "",              // mã video đang xem
    tieuDe: "", kenh: "",
    ban: [], iBan: 0,   // các bản phụ đề + bản đang chọn
    cau: [],            // câu đã ghép
    hien: -1,           // chỉ số câu đang nói
    manh: -1,           // chỉ số mẩu đang được nói TRONG câu đó
    bam: true,          // tự cuộn theo video
    songNgu: false,
    co: 2,              // nấc cỡ chữ đang dùng
    dich: new Map(),    // chỉ số câu -> bản dịch
    host: null, root: null, oList: null, oTrong: null
  };

  /**
   * Các nấc cỡ chữ.
   *
   * Mặc định là nấc 27px — gấp đôi cỡ cũ. Đây là bảng để ĐỌC, mắt phải bám kịp
   * lời người nói, chứ không phải một danh sách để liếc qua.
   * Vẫn để nút chỉnh vì màn hình mỗi người một khác.
   */
  const CO_CHU = [15, 20, 27, 34];

  const dem = (t) => {
    const g = Math.max(0, Math.floor(t));
    const gio = Math.floor(g / 3600), phut = Math.floor((g % 3600) / 60), giay = g % 60;
    const hai = (n) => (n < 10 ? "0" : "") + n;
    return (gio ? gio + ":" + hai(phut) : phut) + ":" + hai(giay);
  };

  function video() {
    return document.querySelector("video.html5-main-video") || document.querySelector("#movie_player video") || document.querySelector("video");
  }

  /**
   * Chữ trong vùng bôi đen — CHỈ phần lời thoại.
   *
   * Không dùng thẳng chuỗi của Selection: bôi đen vắt qua mấy dòng thì nó lôi
   * theo cả chữ "Lưu" trên nút và cả dòng bản dịch nằm dưới, rồi chỗ đó chui
   * vào bản dịch lẫn mục lưu sổ tay. Đặt user-select:none cho các nút cũng
   * không cứu được: nó chặn thao tác kéo, chứ chuỗi Selection vẫn mang đủ chữ.
   *
   * Nên nhân bản vùng chọn ra rồi bỏ hẳn mấy phần không phải lời thoại.
   */
  function chuVungChon(sel) {
    if (!sel || !sel.rangeCount) return "";
    let fr;
    try { fr = sel.getRangeAt(0).cloneContents(); } catch (e) { return String(sel).trim(); }
    if (fr.querySelectorAll) {
      fr.querySelectorAll(".sv, .vi, .tip, .back, .top, .bar").forEach((n) => n.remove());
    }
    return String(fr.textContent || "").replace(/\s+/g, " ").trim();
  }

  /**
   * Dòng SỚM NHẤT mà vùng bôi đen chạm tới.
   *
   * Bôi đen vắt qua mấy dòng thì mốc giây đáng lưu là mốc của dòng ĐẦU — quay
   * lại đó mới nghe được trọn đoạn vừa chọn; lấy dòng cuối thì nghe hụt mất đầu.
   *
   * Bản trước lấy dòng chứa CHỖ THẢ CHUỘT, nên bôi ngược từ dưới lên là ra dòng
   * sai, mà thả trúng khoảng đệm giữa hai dòng thì không ra dòng nào — lúc đó
   * mục lưu về sổ tay chỉ còn một đường dẫn youtube.com trơ trọi, không mốc giây.
   */
  function dongDauVungChon(sel, moc) {
    let ra = null;
    const xet = (m) => { if (m && (!ra || m.t < ra.t)) ra = m; };
    if (sel && sel.rangeCount && S.oList) {
      const rg = sel.getRangeAt(0);
      const cham = (el) => { try { return rg.intersectsNode(el); } catch (e) { return false; } };
      // Xét tới từng MẨU, không chỉ từng dòng: bôi đen nửa sau một câu ghép thì
      // mốc đáng lưu là mốc của nửa sau, chứ không phải mốc đầu câu.
      S.oList.querySelectorAll(".pc").forEach((pc) => { if (cham(pc)) xet(mocCuaManh(pc)); });
      if (!ra) {
        S.oList.querySelectorAll(".ln").forEach((ln) => {
          if (!cham(ln)) return;
          const i = +ln.dataset.i, c = S.cau[i];
          if (c) xet({ i: i, k: -1, t: c.t, d: c.tEnd - c.t });
        });
      }
    }
    if (!ra && moc && moc.closest) {
      const pc = moc.closest(".pc");
      if (pc) ra = mocCuaManh(pc);
      else {
        const ln = moc.closest(".ln");
        const c = ln && S.cau[+ln.dataset.i];
        if (c) ra = { i: +ln.dataset.i, k: -1, t: c.t, d: c.tEnd - c.t };
      }
    }
    return ra;
  }

  /**
   * Mẩu (và mốc giờ của nó) ứng với một phần tử .pc.
   *
   * Ghép cue thành câu là để DỊCH cho tử tế, chứ không phải để gộp luôn cả
   * chuyện bấm: một câu ghép từ ba mẩu thì vẫn là ba chỗ nghe lại được khác
   * nhau, y như ba dòng trong bảng của YouTube.
   */
  function mocCuaManh(pc) {
    const ln = pc && pc.closest ? pc.closest(".ln") : null;
    if (!ln) return null;
    const i = +ln.dataset.i;
    const c = S.cau[i];
    if (!c) return null;
    const m = c.manh && c.manh[+pc.dataset.k];
    return m ? { i: i, k: +pc.dataset.k, t: m.t, d: m.d } : { i: i, k: -1, t: c.t, d: c.tEnd - c.t };
  }

  /** Nguồn để lưu vào sổ tay: URL + tiêu đề + MỐC GIÂY. */
  function nguon(i, chu, giayChiDinh, dai) {
    const c = S.cau[i];
    if (!c) return null;
    const t = Math.max(0, Math.floor(giayChiDinh == null ? c.t : giayChiDinh));
    return {
      url: "https://www.youtube.com/watch?v=" + S.v,
      title: S.tieuDe || document.title,
      sel: (chu || c.s).slice(0, 400),
      yt: { v: S.v, t: t, dur: Math.max(1, Math.round(dai == null ? (c.tEnd - c.t) : dai)), kenh: S.kenh }
    };
  }

  /* ================================================================== */
  /* Bảng lời thoại                                                      */
  /* ================================================================== */

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .box {
      --surface: #fff; --surface-2: #f1f4f9; --ink: #131a2a;
      --ink-2: rgba(19,26,42,.68); --ink-3: rgba(19,26,42,.45);
      --line: rgba(19,26,42,.09); --accent: #2f4fb5; --accent-soft: rgba(47,79,181,.10);
      --good: #12855b; --good-soft: rgba(18,133,91,.12);
      display: flex; flex-direction: column; max-height: 72vh; margin-bottom: 16px;
      background: var(--surface); color: var(--ink);
      font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      border-radius: 18px; box-shadow: 0 1px 2px rgba(16,24,40,.05), 0 8px 28px rgba(16,24,40,.12);
      overflow: hidden;
    }
    @media (prefers-color-scheme: dark) {
      .box {
        --surface: #171b26; --surface-2: #1f2431; --ink: #f2f4f8;
        --ink-2: rgba(238,242,250,.72); --ink-3: rgba(238,242,250,.44);
        --line: rgba(255,255,255,.09); --accent: #8aa4ff; --accent-soft: rgba(138,164,255,.16);
        --good: #2fd18a; --good-soft: rgba(47,209,138,.14);
        box-shadow: 0 1px 2px rgba(0,0,0,.4), 0 10px 30px rgba(0,0,0,.5);
      }
    }
    svg { display: inline-block; vertical-align: -.18em; flex: none; fill: currentColor; }
    button { font-family: inherit; cursor: pointer; }
    .top { display: flex; align-items: center; gap: 8px; padding: 11px 13px; }
    .top .nm { font-size: 13.5px; font-weight: 750; letter-spacing: -.01em; flex: 1; min-width: 0; }
    .top .n { color: var(--ink-3); font-size: 12px; font-weight: 600; }
    .chip {
      display: inline-flex; align-items: center; gap: 4px; flex: none;
      border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
      border-radius: 999px; font-size: 11.5px; font-weight: 650; padding: 4px 9px;
    }
    .chip:hover { background: var(--surface-2); color: var(--ink); }
    .chip.on { border-color: transparent; color: var(--accent); background: var(--accent-soft); }
    .bar { display: flex; align-items: center; gap: 6px; padding: 0 13px 10px; flex-wrap: wrap; }
    select, .find {
      font: inherit; font-size: 12px; color: var(--ink); background: var(--surface-2);
      border: 1px solid var(--line); border-radius: 999px; padding: 5px 10px; outline: none;
    }
    /* Cột phải của YouTube chỉ rộng ~400px: giữ cả hàng công cụ trên MỘT dòng,
       không thì "Bám" rơi xuống dòng riêng và bảng cao thêm vô ích. */
    select { max-width: 108px; }
    .find { flex: 1 1 70px; min-width: 0; }
    .find:focus { border-color: var(--accent); }
    .list { overflow-y: auto; padding: 2px 6px 10px; scroll-behavior: smooth; }
    .ln {
      display: flex; gap: 8px; align-items: flex-start; padding: 7px 7px;
      border-radius: 12px; cursor: text;
    }
    .ln:hover { background: var(--surface-2); }
    .ln.on { background: var(--accent-soft); }
    /* Cả dòng là chỗ bấm để nghe lại — không cần một nút mốc giây riêng chiếm
       chỗ nữa. Mốc giờ vẫn còn, nằm trong ô dịch nhanh khi rê chuột tới. */
    .ln { cursor: pointer; }
    .tip {
      position: absolute; left: 10px; right: 10px; z-index: 5;
      background: var(--surface); color: var(--ink);
      border-radius: 12px; padding: 8px 11px; font-size: 13.5px; line-height: 1.5;
      box-shadow: 0 2px 4px rgba(16,24,40,.08), 0 10px 30px rgba(16,24,40,.22);
      display: none; pointer-events: none;
    }
    .tip.hien { display: block; }
    .tip b {
      color: var(--accent); font-variant-numeric: tabular-nums;
      margin-right: 6px; font-weight: 700;
    }
    /* Cỡ chữ lấy từ một biến duy nhất, phần dịch và mốc giờ ăn theo tỉ lệ — đổi
       một chỗ là cả thẻ giãn ra cân đối, không phải chỉnh ba con số rời. */
    .ln .tx { flex: 1; min-width: 0; font-size: var(--cx); line-height: 1.5; overflow-wrap: anywhere; }
    .ln .vi { display: block; margin-top: 4px; color: var(--ink-2); font-size: calc(var(--cx) * 0.76); }
    /* Mẩu đang được nói. Chỉ tô trong dòng đang chạy — tô cả bảng thì mắt không
       biết nhìn đâu. Bo góc + nền mềm chứ không gạch chân: chữ có nhiều nét
       chạm đáy, gạch chân là dính vào chữ. */
    .pc { border-radius: 5px; padding: 0 1px; }
    /* Rê vào mẩu nào thì mẩu đó sáng lên: cho thấy mỗi mẩu là một chỗ nghe lại
       riêng, đúng như từng dòng trong bảng của YouTube. */
    .ln:hover .pc:hover { background: var(--accent-soft); color: var(--accent); }
    .ln.on .pc.now {
      background: var(--accent-soft); color: var(--accent);
      font-weight: 700; box-shadow: 0 0 0 2px var(--accent-soft);
    }
    /* Câu đang nói thì bản dịch của nó cũng đậm lên theo. Chỉ tới mức CÂU thôi
       — xem ghi chú ở đầu file về việc vì sao không tô tới từng từ. */
    .ln.on .vi { color: var(--ink); }
    /* Chỉ CHỮ của lời thoại mới bôi đen được. Nút Lưu, thanh công cụ, ô dịch
       nhanh… đều là đồ điều khiển — bôi đen vắt qua mấy dòng mà lôi luôn chữ
       "Lưu" vào giữa câu thì bản dịch hỏng, mà lưu vào sổ tay cũng hỏng theo. */
    .top, .bar, .back, .tip, .ln .sv {
      -webkit-user-select: none; user-select: none;
    }
    .ln .sv {
      flex: none; visibility: hidden; border: 1px solid var(--line); background: var(--surface);
      color: var(--accent); border-radius: 999px; padding: 3px 7px; font-size: 11px; font-weight: 650;
      display: inline-flex; align-items: center; gap: 3px;
    }
    .ln:hover .sv, .ln.on .sv { visibility: visible; }
    .ln .sv.done { color: var(--good); background: var(--good-soft); border-color: transparent; }
    .st { display: flex; align-items: center; gap: 8px; color: var(--ink-3); font-size: 13px; padding: 14px 13px; }
    .back {
      position: absolute; left: 50%; transform: translateX(-50%); bottom: 12px;
      border: none; background: var(--accent); color: #fff; border-radius: 999px;
      padding: 6px 13px; font-size: 12px; font-weight: 700; box-shadow: 0 4px 14px rgba(16,24,40,.25);
      display: none; align-items: center; gap: 5px;
    }
    .wrap { position: relative; display: flex; flex-direction: column; min-height: 0; }
    .hide .bar, .hide .wrap { display: none; }
  `;

  function ic(ten, size) {
    const s = document.createElement("span");
    s.style.display = "inline-flex";
    s.innerHTML = (window.Icon ? window.Icon(ten, { size: size || 15 }) : "");
    return s.firstChild || s;
  }

  function nutChip(iconTen, chu, title) {
    const b = document.createElement("button");
    b.className = "chip"; b.type = "button";
    if (title) b.title = title;
    if (iconTen) b.appendChild(ic(iconTen, 13));
    if (chu) { const t = document.createElement("span"); t.textContent = chu; b.appendChild(t); }
    return b;
  }

  /** Chỗ đặt bảng: cột phải của YouTube, ngay trên danh sách video gợi ý. */
  function choDat() {
    return document.querySelector("#secondary-inner") || document.querySelector("#secondary");
  }

  function goBang() {
    if (quanSat) { quanSat.disconnect(); quanSat = null; }
    hangCho.clear(); clearTimeout(henDich);
    if (S.host) { S.host.remove(); S.host = null; S.root = null; S.oList = null; }
  }

  function dungBang() {
    goBang();
    const noi = choDat();
    if (!noi) return false;

    const host = document.createElement("div");
    host.setAttribute("data-ndict-yt", "1");   // content.js nhìn dấu này để không cướp sự kiện
    host.style.cssText = "all:initial;display:block;margin-bottom:16px";
    const root = host.attachShadow({ mode: "open" });
    const st = document.createElement("style"); st.textContent = CSS;
    root.appendChild(st);

    const box = document.createElement("div"); box.className = "box";
    root.appendChild(box);

    /* --- thanh tiêu đề --- */
    const top = document.createElement("div"); top.className = "top";
    top.appendChild(ic("subtitles", 17));
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = "Lời thoại";
    top.appendChild(nm);
    const demCau = document.createElement("span"); demCau.className = "n";
    top.appendChild(demCau);
    const nutCo = nutChip("text-aa", "", "Cỡ chữ — bấm để đổi");
    top.appendChild(nutCo);
    const nutThu = nutChip("caret-up", "", "Thu gọn");
    top.appendChild(nutThu);
    box.appendChild(top);

    /* --- thanh công cụ --- */
    const bar = document.createElement("div"); bar.className = "bar";
    const chonBan = document.createElement("select");
    chonBan.title = "Chọn bản phụ đề";
    const oTim = document.createElement("input");
    oTim.className = "find"; oTim.type = "search"; oTim.placeholder = "Tìm…";
    oTim.title = "Tìm trong lời thoại";
    const nutSong = nutChip("translate", "Song ngữ", "Hiện kèm bản dịch tiếng Việt");
    const nutBam = nutChip("crosshair-simple", "Bám", "Tự cuộn theo dòng đang nói");
    nutSong.classList.toggle("on", S.songNgu);   // giữ lựa chọn khi chuyển video
    bar.appendChild(chonBan); bar.appendChild(oTim); bar.appendChild(nutSong); bar.appendChild(nutBam);
    box.appendChild(bar);

    /* --- danh sách --- */
    const wrap = document.createElement("div"); wrap.className = "wrap";
    const list = document.createElement("div"); list.className = "list";
    const tip = document.createElement("div"); tip.className = "tip";
    const back = document.createElement("button"); back.className = "back"; back.type = "button";
    back.appendChild(ic("arrow-down", 13));
    const bt = document.createElement("span"); bt.textContent = "Về dòng đang nói"; back.appendChild(bt);
    wrap.appendChild(list); wrap.appendChild(tip); wrap.appendChild(back);
    box.appendChild(wrap);

    noi.insertBefore(host, noi.firstChild);

    S.host = host; S.root = root; S.oList = list;

    /* --- hành vi --- */
    const apDungCo = () => {
      box.style.setProperty("--cx", CO_CHU[S.co] + "px");
      nutCo.title = "Cỡ chữ " + CO_CHU[S.co] + "px — bấm để đổi";
      // Bảng đang bám theo video mà chữ giãn ra thì dòng đang nói trôi mất chỗ.
      if (S.bam) requestAnimationFrame(() => cuonToi(S.hien));
    };
    apDungCo();
    nutCo.addEventListener("click", () => {
      S.co = (S.co + 1) % CO_CHU.length;
      apDungCo();
      try { chrome.storage.local.set({ ytCoChu: S.co }); } catch (e) { /* không nhớ được thì thôi */ }
    });

    nutThu.addEventListener("click", () => {
      const thu = box.classList.toggle("hide");
      nutThu.innerHTML = "";
      nutThu.appendChild(ic(thu ? "caret-down" : "caret-up", 13));
      nutThu.title = thu ? "Mở ra" : "Thu gọn";
    });
    chonBan.addEventListener("change", () => { S.iBan = +chonBan.value; napCue(); });
    oTim.addEventListener("input", () => loc(oTim.value.trim()));
    nutSong.addEventListener("click", () => {
      S.songNgu = !S.songNgu;
      nutSong.classList.toggle("on", S.songNgu);
      veDanhSach();
    });
    nutBam.addEventListener("click", () => {
      S.bam = !S.bam;
      nutBam.classList.toggle("on", S.bam);
      if (S.bam) { back.style.display = "none"; cuonToi(S.hien); }
    });
    nutBam.classList.add("on");
    back.addEventListener("click", () => {
      S.bam = true; nutBam.classList.add("on"); back.style.display = "none"; cuonToi(S.hien);
    });

    /*
     * Người dùng tự cuộn -> ngừng bám, hiện nút quay lại. Thiếu chỗ này thì
     * không đọc lùi được câu nào: cứ cuộn lên là bị kéo về ngay.
     *
     * Nghe THAO TÁC của người dùng (lăn chuột, vuốt, kéo thanh cuộn) chứ KHÔNG
     * nghe sự kiện "scroll". Bản trước nghe "scroll" rồi cố lọc bỏ những lần
     * chính mình cuộn bằng một cái cờ hẹn giờ 120ms — và sai, vì danh sách này
     * cuộn mượt (scroll-behavior: smooth): sự kiện scroll của CHÍNH MÌNH còn
     * rơi rớt lại rất lâu sau khi cờ đã tắt, nên chế độ Bám cứ tự tắt dù không
     * ai đụng vào. Vẽ lại danh sách (bật/tắt Song ngữ) cũng đưa scrollTop về 0
     * và dính đúng cái bẫy đó.
     */
    const nguoiDungCuon = () => {
      if (!S.bam) return;
      S.bam = false; nutBam.classList.remove("on"); back.style.display = "flex";
    };
    list.addEventListener("wheel", nguoiDungCuon, { passive: true });
    list.addEventListener("touchmove", nguoiDungCuon, { passive: true });
    // Bấm vào vùng thanh cuộn: clientWidth không tính thanh cuộn, nên offsetX
    // vượt quá nó nghĩa là đang kéo thanh cuộn chứ không bấm vào chữ.
    list.addEventListener("mousedown", (e) => { if (e.offsetX > list.clientWidth) nguoiDungCuon(); });

    // Bôi đen trong bảng -> đúng popup ba tab quen thuộc, kèm mốc giây.
    root.addEventListener("mouseup", (e) => {
      setTimeout(() => {
        const sel = root.getSelection ? root.getSelection() : document.getSelection();
        const chu = chuVungChon(sel);
        if (!chu || chu.length > 400) return;
        if (!window.__ND_popup) return;
        const m = dongDauVungChon(sel, e.target);
        window.__ND_popup(e.clientX + 12, e.clientY + 16, chu,
          m ? nguon(m.i, chu, m.t, m.d) : null);
      }, 10);
    });

    /*
     * Bấm một cái vào dòng là nghe lại từ đúng chỗ đó.
     *
     * Nhưng KHÔNG tua khi đang có vùng bôi đen: kéo chuột để chọn chữ cũng kết
     * thúc bằng một cú click, mà lúc ấy ý bạn là chọn chữ chứ không phải tua —
     * tua lúc đó là cướp mất chỗ đang xem.
     */
    list.addEventListener("click", (e) => {
      const sel = root.getSelection ? root.getSelection() : document.getSelection();
      if (sel && String(sel).trim()) return;
      const el = e.target;
      if (!el || !el.closest) return;
      const pc = el.closest(".pc");
      if (pc) { const m = mocCuaManh(pc); if (m) { tuaGiay(m.t, m.i); return; } }
      const ln = el.closest(".ln");
      if (ln) tuaToi(+ln.dataset.i);
    });

    /*
     * Rê chuột tới dòng nào thì hiện ngay bản dịch dòng đó.
     *
     * "Ngay" chỉ có được nhờ dịch sẵn từ trước: mọi dòng lọt vào tầm mắt đều
     * được dịch ngầm và cất vào bộ nhớ, kể cả khi đang tắt Song ngữ. Đợi tới lúc
     * rê chuột mới gọi mạng thì cái ô này bật ra rồi ngồi chờ, vô duyên.
     *
     * Đang bật Song ngữ thì thôi: bản dịch đã nằm ngay dưới từng dòng rồi, bày
     * thêm một ô đè lên chính chữ đang đọc chỉ tổ vướng.
     */
    let dongDangRe = -1, khoaDangRe = "";
    const anTip = () => { tip.classList.remove("hien"); dongDangRe = -1; khoaDangRe = ""; };
    const veTip = (i, giay) => {
      const ln = list.querySelector('.ln[data-i="' + i + '"]');
      if (!ln) return;
      tip.textContent = "";
      const b = document.createElement("b");
      b.textContent = dem(giay != null ? giay : (S.cau[i] ? S.cau[i].t : 0));
      tip.appendChild(b);
      const sp = document.createElement("span");
      sp.textContent = S.dich.get(i) || "Đang dịch…";
      tip.appendChild(sp);
      tip.classList.add("hien");
      // Đặt dưới dòng; sát đáy quá thì lật lên trên cho khỏi tràn ra ngoài bảng.
      const tren = ln.offsetTop - list.scrollTop + ln.offsetHeight + 6;
      const cao = tip.offsetHeight || 40;
      tip.style.top = (tren + cao > list.clientHeight ? Math.max(4, tren - ln.offsetHeight - cao - 12) : tren) + "px";
    };
    list.addEventListener("mousemove", (e) => {
      if (S.songNgu) { anTip(); return; }
      const el = e.target;
      const ln = el && el.closest ? el.closest(".ln") : null;
      if (!ln) { anTip(); return; }
      const pc = el.closest(".pc");
      const m = pc ? mocCuaManh(pc) : null;
      const i = +ln.dataset.i;
      const giay = m ? m.t : (S.cau[i] ? S.cau[i].t : 0);
      const khoa = i + ":" + (m ? m.k : -1);
      if (khoa === khoaDangRe) return;
      khoaDangRe = khoa; dongDangRe = i;
      if (!S.dich.has(i)) { hangCho.add(i); henGui(); }   // chưa kịp dịch thì giục
      veTip(i, giay);
    });
    list.addEventListener("mouseleave", anTip);
    list.addEventListener("scroll", anTip);

    S.uiBan = chonBan; S.uiDem = demCau; S.uiBack = back; S.uiTim = oTim; S.uiTip = tip;
    S.veTip = veTip; S.dongDangRe = () => dongDangRe;
    return true;
  }

  /**
   * Vẽ một câu thành từng mẩu có mốc thời gian, để còn tô sáng được.
   *
   * Phần chữ nằm GIỮA hai mẩu (dấu cách do noiChu chèn) vẫn để làm text thường —
   * bọc nó vào span thì lúc tô sáng sẽ thấy nền loang sang cả khoảng trắng.
   */
  function veManh(el, c) {
    const manh = c.manh || [];
    if (!manh.length) { el.appendChild(document.createTextNode(c.s)); return; }
    let pos = 0;
    manh.forEach((m, k) => {
      if (m.a > pos) el.appendChild(document.createTextNode(c.s.slice(pos, m.a)));
      const sp = document.createElement("span");
      sp.className = "pc"; sp.dataset.k = String(k);
      sp.textContent = c.s.slice(m.a, m.b);
      el.appendChild(sp);
      pos = m.b;
    });
    if (pos < c.s.length) el.appendChild(document.createTextNode(c.s.slice(pos)));
  }

  /* --- vẽ danh sách --- */
  function veDanhSach() {
    const list = S.oList;
    if (!list) return;
    list.textContent = "";
    S.cau.forEach((c, i) => {
      const ln = document.createElement("div");
      ln.className = "ln";
      ln.dataset.i = String(i);
      ln.dataset.ts = dem(c.t);            // mốc giờ vẫn giữ, chỉ không chiếm chỗ nữa
      ln.title = "Bấm để nghe lại từ " + dem(c.t);

      const tx = document.createElement("div"); tx.className = "tx";
      veManh(tx, c);
      if (S.songNgu) {
        const vi = document.createElement("span"); vi.className = "vi";
        vi.textContent = S.dich.has(i) ? S.dich.get(i) : "…";
        tx.appendChild(vi);
      }
      ln.appendChild(tx);

      const sv = document.createElement("button");
      sv.className = "sv"; sv.type = "button"; sv.title = "Lưu câu này vào sổ tay";
      sv.appendChild(ic("plus", 12));
      const svt = document.createElement("span"); svt.textContent = "Lưu"; sv.appendChild(svt);
      sv.addEventListener("click", (e) => { e.stopPropagation(); luuCau(i, sv, svt); });
      ln.appendChild(sv);

      list.appendChild(ln);
    });
    S.uiDem.textContent = S.cau.length ? S.cau.length + " câu" : "";
    batQuanSat();
    danhDau(true);
  }

  /** @param {Function} [thuLai] có thì hiện kèm nút "Thử lại". */
  function trangThai(chu, iconTen, thuLai) {
    if (!S.oList) return;
    S.oList.textContent = "";
    const d = document.createElement("div"); d.className = "st";
    d.appendChild(ic(iconTen || "spinner-gap", 16));
    const s = document.createElement("span"); s.textContent = chu;
    d.appendChild(s);
    S.oList.appendChild(d);
    if (thuLai) {
      const hang = document.createElement("div");
      hang.style.cssText = "padding:0 13px 12px";
      const b = nutChip("arrows-clockwise", "Thử lại");
      b.addEventListener("click", thuLai);
      hang.appendChild(b);
      S.oList.appendChild(hang);
    }
    S.uiDem.textContent = "";
  }

  function loc(q) {
    if (!S.oList) return;
    const k = q.toLowerCase();
    S.oList.querySelectorAll(".ln").forEach((ln) => {
      ln.style.display = (!k || ln.textContent.toLowerCase().indexOf(k) >= 0) ? "" : "none";
    });
  }

  /* --- bám theo video --- */
  function timCau(t) {
    let lo = 0, hi = S.cau.length - 1, ra = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (S.cau[m].t <= t) { ra = m; lo = m + 1; } else hi = m - 1;
    }
    return ra;
  }

  function cuonToi(i) {
    if (i < 0 || !S.oList) return;
    const ln = S.oList.querySelector('.ln[data-i="' + i + '"]');
    if (!ln) return;
    // Tự tính scrollTop chứ không dùng scrollIntoView: hàm đó cuộn cả các khối
    // cha, tức là kéo luôn cả trang YouTube bên dưới.
    S.oList.scrollTop = ln.offsetTop - S.oList.clientHeight / 2 + ln.offsetHeight / 2;
  }

  /** Mẩu đang được nói trong câu i, hoặc -1. */
  function timManh(i, t) {
    const c = S.cau[i];
    if (!c || !c.manh || !c.manh.length) return -1;
    const m = c.manh;
    let lo = 0, hi = m.length - 1, ra = -1;
    while (lo <= hi) {
      const g = (lo + hi) >> 1;
      if (m[g].t <= t) { ra = g; lo = g + 1; } else hi = g - 1;
    }
    // Cố ý GIỮ mẩu cuối vừa nói khi rơi vào khoảng lặng, thay vì tắt hẳn: nhấp
    // nháy theo từng quãng nghỉ giữa các từ còn khó theo dõi hơn là không tô.
    return ra;
  }

  function danhDauManh(k) {
    if (!S.oList) return;
    const cu = S.oList.querySelector(".pc.now");
    if (cu) cu.classList.remove("now");
    if (S.hien < 0 || k < 0) return;
    const ln = S.oList.querySelector('.ln[data-i="' + S.hien + '"]');
    const sp = ln && ln.querySelector('.pc[data-k="' + k + '"]');
    if (sp) sp.classList.add("now");
  }

  function danhDau(epCuon) {
    if (!S.oList) return;
    const cu = S.oList.querySelector(".ln.on");
    if (cu) cu.classList.remove("on");
    if (S.hien < 0) return;
    const ln = S.oList.querySelector('.ln[data-i="' + S.hien + '"]');
    if (ln) ln.classList.add("on");
    danhDauManh(S.manh);
    if (S.bam || epCuon) cuonToi(S.hien);
  }

  let dongHo = null, rvfc = null;
  function batTheoDoi() {
    dungTheoDoi();
    const vd = video();
    if (!vd) return;
    const nhip = () => {
      const t = vd.currentTime;
      const i = timCau(t);
      if (i !== S.hien) {
        S.hien = i; S.manh = -1;
        danhDau(false);
        dichCauDangNoi(i);
      }
      const k = timManh(i, t);
      if (k !== S.manh) { S.manh = k; danhDauManh(k); }
    };
    if (vd.requestVideoFrameCallback) {
      const vong = () => { nhip(); rvfc = vd.requestVideoFrameCallback(vong); };
      rvfc = vd.requestVideoFrameCallback(vong);
    }
    // Vẫn giữ một nhịp đếm giờ: requestVideoFrameCallback đứng im khi video
    // tạm dừng, mà tua lúc đang dừng thì dòng sáng vẫn phải chạy theo.
    dongHo = setInterval(nhip, 150);
  }
  function dungTheoDoi() {
    if (dongHo) { clearInterval(dongHo); dongHo = null; }
    if (rvfc != null) { const vd = video(); if (vd && vd.cancelVideoFrameCallback) vd.cancelVideoFrameCallback(rvfc); rvfc = null; }
  }

  function tuaGiay(t, i) {
    const vd = video();
    if (!vd) return;
    vd.currentTime = Math.max(0, t + 0.02);
    const p = vd.play();
    if (p && p.catch) p.catch(() => {});
    if (i != null) { S.hien = i; S.manh = -1; danhDau(true); }
  }

  function tuaToi(i) {
    const c = S.cau[i];
    if (c) tuaGiay(c.t, i);
  }

  /* --- dịch song ngữ --- */
  /*
   * Ba thứ làm bản cũ ì ạch, sửa cả ba:
   *
   *  · Chỉ dịch thêm mỗi khi video sang câu mới. Cuộn xuống đọc trước thì cứ
   *    nằm im ở dấu "…" cho tới lúc video chạy tới — nhìn như treo. Nay dùng
   *    IntersectionObserver: dòng nào lọt vào tầm mắt là dịch dòng đó.
   *
   *  · Mỗi câu một tin nhắn riêng sang nền, mà mỗi lượt dịch lẻ lại đọc-rồi-ghi
   *    CẢ bộ đệm vào chrome.storage. Gần trăm câu thành gần trăm vòng như thế.
   *    Nay gom thành một tin nhắn cho cả loạt (TRANSLATE_MANY).
   *
   *  · Bản cũ đo offsetTop của TỪNG dòng mỗi lần chạy — bắt trình duyệt tính
   *    lại bố cục cả bảng. IntersectionObserver không phải đo gì cả.
   */

  let quanSat = null;
  const hangCho = new Set();
  let henDich = null;

  function batQuanSat() {
    if (quanSat) { quanSat.disconnect(); quanSat = null; }
    // Cố ý KHÔNG phụ thuộc Song ngữ: dịch ngầm cả khi đang tắt, để rê chuột tới
    // dòng nào là có bản dịch NGAY. Bản dịch nằm sẵn trong bộ nhớ thì bật Song
    // ngữ sau đó cũng hiện tức thì, không phải chờ lần nữa.
    if (!S.oList || typeof IntersectionObserver !== "function") return;
    quanSat = new IntersectionObserver((mps) => {
      let co = false;
      mps.forEach((m) => {
        if (!m.isIntersecting) return;
        const i = +m.target.dataset.i;
        if (S.dich.has(i)) return;
        hangCho.add(i); co = true;
      });
      if (co) henGui();
    }, { root: S.oList, rootMargin: "400px 0px" });
    // Dịch sẵn cả phần ngay ngoài khung nhìn để cuộn tới là đã có chữ.
    S.oList.querySelectorAll(".ln").forEach((ln) => quanSat.observe(ln));
  }

  /** Đếm số lượt dịch trượt của từng câu, để biết lúc nào thì thôi thử lại. */
  const soLanTruot = new Map();

  /** Gom vài nhịp rồi mới gửi: cuộn nhanh sẽ bắn ra hàng chục lượt liền nhau. */
  function henGui() {
    clearTimeout(henDich);
    henDich = setTimeout(guiDich, 120);
  }

  function guiDich() {
    const cho = [...hangCho].filter((i) => !S.dich.has(i) && S.cau[i]);
    const ids = cho.slice(0, 40);
    // Phần vượt quá một loạt phải GIỮ LẠI, không được xoá sạch hàng chờ: các
    // dòng đó đang nằm sẵn trong tầm mắt nên sẽ không có lượt "lọt vào khung"
    // nào nữa để đánh thức chúng — bỏ là chúng đứng mãi ở dấu "…".
    hangCho.clear();
    cho.slice(40).forEach((i) => hangCho.add(i));
    if (!ids.length) return;
    ids.forEach((i) => S.dich.set(i, ""));      // giữ chỗ, khỏi gửi trùng
    const texts = ids.map((i) => S.cau[i].s.trim());
    chrome.runtime.sendMessage({ type: "TRANSLATE_MANY", texts: texts, from: nguNguon(), to: "vi" }, (res) => {
      const ra = (!chrome.runtime.lastError && res && res.ok) ? (res.texts || []) : [];
      let truot = 0;
      ids.forEach((i, k) => {
        const t = ra[k] || "";
        if (!t) {
          // Lượt gọi trượt. TUYỆT ĐỐI không ghi "—" rồi coi như xong: ghi vào
          // S.dich là câu đó bị đóng dấu vĩnh viễn, chẳng bao giờ hỏi lại nữa,
          // và bạn nhìn thấy một câu không có nghĩa nằm giữa hai câu có nghĩa.
          // Nhả nó ra, xếp lại hàng chờ, thử lại loạt sau.
          S.dich.delete(i);
          const lan = (soLanTruot.get(i) || 0) + 1;
          soLanTruot.set(i, lan);
          if (lan <= 3) { hangCho.add(i); truot++; return; }
          S.dich.set(i, "—");               // thử mãi không được thì đành chịu
        } else {
          S.dich.set(i, t);
          soLanTruot.delete(i);
        }
        const ln = S.oList && S.oList.querySelector('.ln[data-i="' + i + '"]');
        const vi = ln && ln.querySelector(".vi");
        if (vi) vi.textContent = S.dich.get(i);
        // Đang rê chuột đúng dòng này mà bản dịch vừa về -> thay chữ "Đang dịch…"
        if (S.veTip && S.dongDangRe && S.dongDangRe() === i) S.veTip(i);
      });
      // Trượt thì lùi lại một nhịp cho bên kia thở, đừng nã lại ngay lập tức.
      if (hangCho.size) truot ? setTimeout(henGui, 1200) : henGui();
    });
  }

  /** Đảm bảo câu đang nói có bản dịch, kể cả khi bạn đã cuộn đi chỗ khác. */
  function dichCauDangNoi(i) {
    if (!S.songNgu || i < 0 || S.dich.has(i)) return;
    hangCho.add(i); henGui();
  }

  /* --- lưu một câu vào sổ tay --- */
  function luuCau(i, nut, nhan) {
    const c = S.cau[i];
    if (!c) return;
    nut.disabled = true; nhan.textContent = "…";
    const gui = (nghia) => {
      chrome.runtime.sendMessage({
        type: "SAVE_WORD",
        entry: { word: c.s, reading: "", means: nghia ? [nghia] : [], kind: "sent", src: nguon(i) },
        dict: "envi"
      }, () => {
        nut.classList.add("done"); nut.disabled = false;
        nut.textContent = ""; nut.appendChild(ic("check", 12));
        const t = document.createElement("span"); t.textContent = "Đã lưu"; nut.appendChild(t);
      });
    };
    // Lưu kèm luôn bản dịch: một câu trần trụi nằm trong sổ tay thì đến lúc ôn
    // lại chẳng có gì để lật ra cả.
    if (S.dich.get(i)) { gui(S.dich.get(i)); return; }
    chrome.runtime.sendMessage({ type: "TRANSLATE", text: c.s, from: nguNguon(), to: "vi" }, (res) => {
      gui((!chrome.runtime.lastError && res && res.ok) ? res.text : "");
    });
  }

  /* ================================================================== */
  /* Vòng đời                                                            */
  /* ================================================================== */

  async function napCue() {
    const ban = S.ban[S.iBan];
    if (!ban) { trangThai("Video này không có phụ đề nào.", "subtitles-slash"); return; }
    trangThai("Đang tải lời thoại…");
    S.dich.clear(); hangCho.clear();
    try {
      const kq = await layCue(ban);
      S.cau = ghepCau(kq.cue);
      // Lấy qua bảng của YouTube thì bản phụ đề là do HỌ chọn, đổi ở ô này cũng
      // không có tác dụng — nói thẳng ra thay vì để bấm rồi thấy không đổi gì.
      S.uiBan.disabled = (kq.cach === "bang");
      S.uiBan.title = S.uiBan.disabled
        ? "YouTube đang chặn đường tải phụ đề, phải đọc lại từ bảng của họ — đổi bản ở đây thì hãy đổi trong bảng đó"
        : "Chọn bản phụ đề";
      if (!S.cau.length) { trangThai("Bản phụ đề này rỗng.", "warning-circle"); return; }
      veDanhSach();
      batTheoDoi();
    } catch (e) {
      trangThai((e && e.message) || "Không tải được lời thoại.", "warning-circle", napCue);
      ngongBangYouTube();
    }
  }

  /**
   * Cả ba đường tắc thì đừng bỏ cuộc hẳn: ngồi chờ bảng bản chép lời của YouTube
   * xuất hiện rồi tự nhặt lấy.
   *
   * Có hai lối dẫn tới đây, và cả hai đều kết thúc bằng việc bảng của họ hiện ra:
   * hoặc YouTube dựng bảng chậm hơn hạn chờ, hoặc bạn tự bấm "…" → "Hiện bản
   * chép lời" theo lời nhắc. Bắt bạn bấm thêm nút Thử lại trong khi chữ đã nằm
   * sờ sờ trên màn hình là thừa một bước vô duyên.
   */
  let dangNgong = false;
  async function ngongBangYouTube() {
    if (dangNgong) return;
    dangNgong = true;
    const v = S.v;
    try {
      const co = await choDoan(5 * 60000);
      if (co && S.v === v && S.host && S.host.isConnected) await napCue();
    } finally { dangNgong = false; }
  }

  async function khoiDong(v) {
    S.v = v; S.cau = []; S.hien = -1; S.dich.clear(); S.bam = true;
    if (!dungBang()) return false;
    trangThai("Đang tìm phụ đề…");
    try {
      const d = await layBanPhuDe(v);
      if (S.v !== v) return true;                       // đã chuyển video khác
      S.tieuDe = d.tieuDe; S.kenh = d.kenh; S.ban = d.ban;
      if (!S.ban.length) {
        trangThai("Video này không có phụ đề — không có gì để đọc.", "subtitles-slash");
        S.uiBan.style.display = "none";
        return true;
      }
      // Ưu tiên bản người thật làm, tiếng Anh trước, rồi mới tới bản tự sinh.
      const diem = (b) => (b.tuDong ? 0 : 2) + (b.ma === "en" ? 1 : 0);
      let best = 0;
      S.ban.forEach((b, i) => { if (diem(b) > diem(S.ban[best])) best = i; });
      S.iBan = best;
      S.uiBan.style.display = S.ban.length > 1 ? "" : "none";
      S.uiBan.innerHTML = "";
      S.ban.forEach((b, i) => {
        const o = document.createElement("option");
        o.value = String(i);
        o.textContent = b.ten + (b.tuDong ? " (tự động)" : "");
        S.uiBan.appendChild(o);
      });
      S.uiBan.value = String(S.iBan);
      await napCue();
    } catch (e) {
      trangThai((e && e.message) || "Không lấy được phụ đề.", "warning-circle");
    }
    return true;
  }

  try {
    chrome.storage.local.get("ytCoChu", (r) => {
      if (r && typeof r.ytCoChu === "number" && CO_CHU[r.ytCoChu]) S.co = r.ytCoChu;
    });
  } catch (e) { /* chạy được thì tốt, không thì dùng cỡ mặc định */ }

  function maVideo() {
    if (location.pathname !== "/watch") return "";
    return new URLSearchParams(location.search).get("v") || "";
  }

  let dangCho = null;
  function xemLai() {
    const v = maVideo();
    if (!v) { dungTheoDoi(); goBang(); S.v = ""; return; }
    if (v === S.v && S.host && S.host.isConnected) return;
    dungTheoDoi();
    // Cột phải của YouTube dựng sau khi trang đã "xong", nên thử lại vài nhịp.
    clearInterval(dangCho);
    let lan = 0;
    const thu = async () => {
      if (maVideo() !== v) { clearInterval(dangCho); return; }
      if (choDat()) { clearInterval(dangCho); await khoiDong(v); return; }
      if (++lan > 40) clearInterval(dangCho);
    };
    dangCho = setInterval(thu, 300);
    thu();
  }

  // YouTube là ứng dụng một trang: chuyển video không tải lại trang.
  document.addEventListener("yt-navigate-finish", xemLai);
  let urlCu = location.href;
  setInterval(() => {
    if (location.href !== urlCu) { urlCu = location.href; xemLai(); return; }
    // YouTube dựng lại cột phải khá tuỳ hứng và cuốn theo cả bảng này; dựng lại
    // khi thấy nó biến mất, chứ không bắt người dùng tải lại trang.
    if (S.v && (!S.host || !S.host.isConnected) && choDat()) khoiDong(S.v);
  }, 700);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", xemLai);
  else xemLai();

  // Sổ tay bảo "về đúng giây đó" -> tua, và sáng đúng dòng.
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== "YT_SEEK") return;
    if (msg.v && msg.v !== maVideo()) return;
    const vd = video();
    if (!vd) return;
    vd.currentTime = Math.max(0, msg.t || 0);
    const p = vd.play(); if (p && p.catch) p.catch(() => {});
    S.bam = true;
    const i = timCau(msg.t || 0);
    if (i >= 0) { S.hien = i; danhDau(true); }
  });
})();
