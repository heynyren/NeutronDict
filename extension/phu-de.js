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
  function hoiTrang(viec, url, them) {
    return new Promise((giai) => {
      const id = "njd" + (++soHoi);
      let xong = false;
      const nghe = (e) => {
        const d = e.data;
        if (e.source !== window || !d || d.__njd !== "tra" || d.id !== id) return;
        xong = true; window.removeEventListener("message", nghe); giai(d.kq || null);
      };
      window.addEventListener("message", nghe);
      window.postMessage(Object.assign({ __njd: "hoi", id: id, viec: viec, url: url }, them || {}), "*");
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
      if (!r.ok) throw new Error(T2("Không tải được trang video (HTTP {ma})", { ma: r.status }));
      pr = catJSON(await r.text(), "ytInitialPlayerResponse");
    }
    if (!pr) throw new Error(T("Không đọc được dữ liệu trình phát"));
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
      throw new Error(T2(
        "Thấy bảng bản chép lời của YouTube nhưng không đọc được dòng nào — có vẻ họ vừa đổi cách dựng bảng. "
        + "Bấm Thử lại; còn không thì báo lại để sửa. (khung: {kh} · thẻ quen: {the})",
        { kh: kh.length, the: document.querySelectorAll("ytd-transcript-segment-renderer").length }));
    }
    throw new Error(T("YouTube không cho tải phụ đề, mà cũng chưa mở được bảng bản chép lời của họ. ")
      + T("Bấm “…” dưới video → “Hiện bản chép lời” — hiện ra là chỗ này tự lấy, không cần bấm gì thêm."));
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
      // Vẫn phải lọc vùng cấm: một khung "transcript" của YouTube có lúc ôm luôn
      // mấy thứ khác bên trong.
      const c = quetSau(k, (el) => laDongTrongCung(el) && !trongVungCam(el));
      if (laBanChepLoi(c)) return c;
    }
    if (!sau) return [];

    // Đường cùng: quét cả trang, kể cả trong shadow root. Tốn, nhưng chỉ chạy
    // một lượt khi mọi cách khác đã trượt. Nhớ bỏ qua CHÍNH BẢNG NÀY — dòng của
    // nó cũng là "mốc giờ rồi tới chữ", ăn lại đầu ra của mình thì thành vòng.
    const d = quetSau(document.body, (el) => laDongTrongCung(el) && !trongVungCam(el));
    return laBanChepLoi(d) ? d : [];
  }

  /**
   * Những chỗ TUYỆT ĐỐI không phải bản chép lời, dù nhìn giống hệt.
   *
   * Danh sách video gợi ý ở cột phải là cái bẫy chính: mỗi mục có huy hiệu thời
   * lượng ("15:15") đứng ngay trước tiêu đề, tức là đúng khuôn "mốc giờ rồi tới
   * chữ" mà mình đang đi tìm. Vớ phải nó thì cả bảng đầy tên video kèm
   * "70K 4mo ago", và vệt sáng thì bám vào những mốc giờ vô nghĩa ấy.
   */
  const KHONG_PHAI_BANG = [
    "[data-ndict-yt]",                            // chính bảng này
    "#related", "#items.ytd-watch-next-secondary-results-renderer",
    "ytd-watch-next-secondary-results-renderer",
    "ytd-compact-video-renderer", "ytd-compact-radio-renderer",
    "ytd-compact-playlist-renderer", "ytd-video-renderer",
    "yt-lockup-view-model", "ytd-playlist-panel-renderer",
    "ytd-comments", "ytd-comment-thread-renderer",
    // Danh sách CHƯƠNG của video. Cái bẫy này qua được mọi phép thử phía dưới:
    // mốc giờ của nó chạy tiến, và nó bắt đầu đúng từ 0:00 — không chặn theo tên
    // thẻ thì không còn dấu hiệu nào phân biệt được với một bản chép lời thưa.
    "ytd-macro-markers-list-renderer", "ytd-macro-markers-list-item-renderer",
    "ytd-chapter-renderer", "[target-id*='macro-markers' i]", "[target-id*='chapter' i]"
  ].join(",");

  /**
   * Dòng này có nằm trong một vùng cấm không — XÉT XUYÊN QUA CẢ SHADOW ROOT.
   *
   * `closest()` dừng lại ở ranh giới shadow: gọi trên một thẻ nằm trong shadow
   * root thì nó không bao giờ nhìn thấy thẻ cha ở ngoài. Mà YouTube dựng gần
   * như mọi thứ bằng shadow DOM, nên danh sách chặn ở trên trượt sạch đúng lúc
   * cần nhất — và bảng đầy tên video gợi ý kèm "70K lượt xem".
   *
   * Nên phải tự trèo: hỏi trong cây hiện tại trước, hết cây thì nhảy sang thẻ
   * chủ của shadow root rồi hỏi tiếp, cho tới khi ra tới tài liệu gốc.
   */
  function trongVungCam(el) {
    let n = el;
    while (n && n.nodeType === 1) {
      if (n.closest && n.closest(KHONG_PHAI_BANG)) return true;
      const goc = n.getRootNode ? n.getRootNode() : null;
      n = (goc && goc.nodeType === 11 && goc.host) ? goc.host : null;
    }
    return false;
  }

  /**
   * Đám dòng này có thật sự là một bản chép lời không.
   *
   * Phép thử không phụ thuộc vào một tên lớp hay tên thẻ nào của YouTube, nên
   * họ đổi giao diện kiểu gì nó vẫn đúng: mốc giờ của bản chép lời chạy TIẾN
   * theo thời gian, dòng sau không bao giờ sớm hơn dòng trước. Còn thời lượng
   * của một dãy video gợi ý thì nhảy loạn xạ.
   */
  function laBanChepLoi(ds) {
    if (!ds || ds.length < 3) return false;
    const t = [];
    for (const el of ds) {
      const m = chuSau(el).match(MOC_GIO);
      if (!m) return false;
      t.push(giayCuaMoc(m[1]));
    }
    let lui = 0;
    for (let i = 1; i < t.length; i++) if (t[i] < t[i - 1]) lui++;
    // Cho phép sai vài dòng (mốc trùng, dòng dựng dở), nhưng lùi nhiều thì
    // chắc chắn không phải bản chép lời.
    if (lui > Math.max(1, Math.floor(t.length * 0.05))) return false;
    // Bản chép lời bắt đầu từ đầu video, không phải từ phút thứ mười.
    return t[0] <= 120;
  }

  /** "1:06" / "1:02:03" -> số giây. */
  function giayCuaMoc(mc) {
    const p = String(mc).split(":").map((x) => +x || 0);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
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

  /** Bao nhiêu mốc giờ nằm trong đoạn chữ này. */
  const DEM_MOC = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;

  /**
   * Trông có giống một dòng bản chép lời không: mốc giờ, RỒI tới chữ.
   *
   * Và chỉ ĐÚNG MỘT mốc giờ. Đây là chỗ chặn quan trọng nhất, vì nó không dựa
   * vào tên thẻ nào của YouTube cả — mà chặn theo tên thẻ thì không bao giờ đuổi
   * kịp: họ đổi tên thẻ luôn, và cột gợi ý còn nằm trong shadow root với những
   * tên mình chưa từng thấy. Nhưng một Ô GOM cả danh sách (sáu video gợi ý, mỗi
   * cái một huy hiệu thời lượng) thì bao giờ cũng mang NHIỀU mốc giờ trong ruột,
   * còn một dòng phụ đề thật thì chỉ có đúng một cái ở đầu. Đó là dấu hiệu phân
   * biệt bền nhất.
   */
  function laDong(el) {
    const chu = chuSau(el);
    const m = chu.match(MOC_GIO);
    if (!m || !m[2] || !m[2].trim()) return false;
    const dem = chu.match(DEM_MOC);
    return !!dem && dem.length === 1;
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

  /**
   * Ngôn ngữ đang bật, đọc từ cùng một khoá settings mà popup và sổ tay dùng.
   *
   * Bảng lời thoại phải theo nó ở HAI chỗ: lưu vào ngăn sổ tay nào, và trong
   * các bản phụ đề của video thì ưu tiên bản tiếng nào. Đóng đinh một ngôn ngữ
   * ở đây là xem video tiếng Nhật mà lưu từ lại rơi vào sổ tiếng Anh.
   */
  let NGU = "en";
  const nganLuu = () => self.Ngu.nganChinh(NGU);
  /** Số lần bấm Nạp lại mà bảng vẫn chưa ra chữ. */
  let soLanNap = 0;
  /** Mã video mà bạn đã tự đóng bảng — đừng dựng lại cho tới khi sang video khác. */
  let tatCho = "";
  /*
   * Tự bật bảng khi mở video, hay đợi người dùng bấm?
   *
   * Mặc định là ĐỢI: mỗi lần lấy phụ đề rồi dịch cả bảng là một loạt lượt gọi
   * API — bật tự động cho MỌI video, kể cả video chỉ lướt qua, là đốt hạn mức
   * dịch vô ích. Nên video mới chỉ hiện một nút mời; bấm vào mới lấy phụ đề và
   * gọi dịch. Ai thích bật sẵn thì mở lại trong Cài đặt.
   */
  let tuBat = false;
  /* Có phơi lời thoại ra DOM thường cho trợ lý AI khác đọc không. */
  let phoiRa = true;
  const datPhoi = (st) => {
    const moi = !st || st.ytPhoi !== false;    // mặc định BẬT
    if (moi === phoiRa) return false;
    phoiRa = moi;
    return true;
  };
  /** Mã video đang chờ người dùng bấm nút mời (chế độ đợi). "" là không chờ ai. */
  let choBat = "";
  const datBat = (st) => {
    const moi = !!(st && st.ytTuBat);
    if (moi === tuBat) return false;
    tuBat = moi;
    return true;
  };
  /*
   * Ngôn ngữ giao diện. Bảng nằm trong shadow DOM do JS dựng ra nên không có
   * lượt quét data-chu nào chạm tới — chữ trên đó sinh ra MỘT LẦN lúc dựng.
   *
   * Nên đổi ngôn ngữ là phải dựng lại bảng. Kể cả lượt đọc cài đặt đầu tiên:
   * nó là một lượt hỏi bất đồng bộ, mà bảng thì có thể dựng xong trước khi câu
   * trả lời về — lúc đó bảng đã mang chữ tiếng Việt rồi. Đừng để chuyện hiện ra
   * đúng thứ tiếng phụ thuộc vào ai nhanh hơn ai.
   */
  const datChu = (st) => {
    if (!self.Chu) return;
    const cu = self.Chu.dang();
    const moi = self.Chu.hopLe((st || {}).chu);
    self.Chu.dat(moi, null);
    if (moi !== cu && (S.v || S.host)) xemLai(true);
  };
  /*
   * Bảng phải ĐỢI lượt đọc cài đặt đầu tiên rồi mới dựng.
   *
   * Đọc cài đặt là một lượt hỏi bất đồng bộ; trên một trang nhẹ, bảng dựng
   * xong trước khi câu trả lời về — và nó mang chữ tiếng Việt trong khi người
   * dùng đã chọn tiếng Nhật. Nút "dựng lại khi đổi ngôn ngữ" cũng không cứu
   * được, vì lúc câu trả lời về thì bảng còn chưa kịp ghi mã video vào S.
   */
  /** Bấm nút có kêu không — cùng một khoá `tach` với sổ tay và popup. */
  let tuTach = true;
  const datTach = (st) => { tuTach = (st || {}).tach !== false; };

  let baoDaDoc;
  const daDocCaiDat = new Promise((giai) => { baoDaDoc = giai; });
  self.Song.doc("settings").then((r) => {
    const st = (r && r.settings) || {};
    NGU = self.Ngu.hopLe(st.ngu);
    datChu(st);
    datBat(st);
    datPhoi(st);
    datTach(st);
    datThuNho(st);
    baoDaDoc();
  });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local" || !ch.settings) return;
    const st = ch.settings.newValue || {};
    datChu(st);
    datTach(st);
    datThuNho(st);
    if (datPhoi(st)) veKhoPhoi();
    if (datBat(st)) {
      // Bật/tắt chế độ tự-bật giữa chừng: dựng lại cho khớp kiểu mới.
      const v = maVideo();
      if (v && v !== tatCho) xemLai(true);
    }
    const moi = self.Ngu.hopLe(st.ngu);
    if (moi === NGU) return;
    NGU = moi;
    // Đổi ngôn ngữ giữa chừng thì bản phụ đề nên ưu tiên cũng đổi theo — dựng
    // lại bảng cho khớp thay vì để người dùng tự tải lại trang.
    if (S.v) xemLai(true);
  });

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
    sua: {},            // bản chép lời bạn tự sửa: mốc giây -> câu đúng
    host: null, root: null, oList: null, oTrong: null,
    hostBat: null       // nút mời "Hiện phụ đề" ở chế độ đợi (khác host của bảng)
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

  /* ================================================================== */
  /* Sửa lời thoại                                                       */
  /* ================================================================== */
  /*
   * Bản chép lời tự động của YouTube sai thường xuyên — nhất là tên riêng, số
   * liệu và mấy chỗ người nói lướt. Đọc thì còn đoán ra được, nhưng LƯU MỘT CÂU
   * SAI VÀO SỔ TAY thì vài tháng sau mở lại chẳng còn gì để đối chiếu: câu sai
   * nằm đó, trông y như câu đúng.
   *
   * Nên cho sửa thẳng trên bảng. Bản sửa:
   *   - nhớ theo VIDEO và theo MỐC GIÂY, không theo chỉ số dòng — đổi sang bản
   *     phụ đề khác thì số dòng đổi hết, còn mốc giây thì vẫn là chỗ đó;
   *   - đi vào cả bản dịch lẫn mục lưu trong sổ tay, vì đó mới là chỗ nó có ích;
   *   - lúc nào cũng quay về được bản gốc của YouTube.
   */

  /** Khoá của một câu trong kho bản sửa: giây bắt đầu, làm tròn. */
  const khoaSua = (c) => String(Math.round(c.t || 0));

  /** Giữ bản sửa của 200 video gần nhất — quá số đó thì bỏ video cũ nhất. */
  const TOI_DA_VIDEO = 200;

  async function docSua(v) {
    try {
      const { phuDeSua } = await self.Song.doc("phuDeSua");
      const kho = (phuDeSua || {})[v];
      return (kho && kho.d) || {};
    } catch (e) { return {}; }
  }

  async function ghiSua(v, d) {
    try {
      const { phuDeSua } = await self.Song.doc("phuDeSua");
      const kho = phuDeSua || {};
      if (Object.keys(d).length) kho[v] = { d: d, ts: Date.now() };
      else delete kho[v];                       // sửa xong lại bỏ hết -> đừng để rác
      const ma = Object.keys(kho);
      if (ma.length > TOI_DA_VIDEO) {
        ma.sort((a, b) => (kho[a].ts || 0) - (kho[b].ts || 0));
        for (let i = 0; i < ma.length - TOI_DA_VIDEO; i++) delete kho[ma[i]];
      }
      await self.Song.ghi({ phuDeSua: kho });
    } catch (e) { /* hết chỗ thì thôi, đừng làm hỏng bảng đang đọc */ }
  }

  /* ================================================================== */
  /* Kho phụ đề của từng video — xem một lần, lần sau khỏi gọi mạng      */
  /* ================================================================== */
  /*
   * Vì sao phải có kho này.
   *
   * Mỗi lần mở lại một video đã xem, bảng lại đi xin YouTube bản chép lời rồi
   * xin dịch lại từng dòng — trong khi chữ y hệt lần trước. Bản dịch thì rơi
   * xuống Apps Script, mà Apps Script có hạn mức lượt gọi mỗi ngày; tiêu vào
   * việc dịch lại thứ đã dịch rồi là phí đúng cái quý nhất.
   *
   * Nên xem xong là cất: cả bản chép lời lẫn bản dịch, theo từng video. Lần
   * sau quay lại thì lấy từ máy, không một lượt gọi mạng nào.
   *
   * Khoá phải kèm MÃ BẢN phụ đề: một video có thể có bản tiếng Nhật, bản tiếng
   * Anh, bản tự động — chữ khác nhau hoàn toàn, trộn vào nhau là hiện nhầm.
   *
   * Hạn 100 ngày, đúng như đã hẹn: quá hạn thì bỏ, để kho không phình mãi và
   * để bản chép lời của YouTube có cơ hội được lấy lại nếu họ sửa.
   */
  const KHO_HAN = 100 * 86400000;     // 100 ngày
  const KHO_VIDEO = 300;              // giữ nhiều nhất bấy nhiêu video
  const KHO_CHU = 6 * 1000 * 1000;    // trần thô: tổng số chữ trong kho

  const khoaKho = (v, maBan) => v + "|" + (maBan || "");

  /** Bỏ mục quá hạn, rồi bỏ mục cũ nhất cho tới khi lọt hai cái trần. */
  function locKhoYt(kho, bayGio) {
    const song = {};
    for (const k in (kho || {})) {
      const m = kho[k];
      if (m && typeof m.ts === "number" && bayGio - m.ts < KHO_HAN) song[k] = m;
    }
    const ma = Object.keys(song).sort((a, b) => (song[b].ts || 0) - (song[a].ts || 0));
    const ra = {};
    let chu = 0, dem = 0;
    for (const k of ma) {
      const co = JSON.stringify(song[k]).length;
      // Mục MỚI NHẤT luôn được giữ — vừa xem xong mà đã bị vứt thì vô nghĩa.
      if (dem > 0 && (dem >= KHO_VIDEO || chu + co > KHO_CHU)) break;
      ra[k] = song[k]; chu += co; dem++;
    }
    return ra;
  }

  /**
   * Video này đã có phụ đề cất sẵn trong máy chưa (bản nào cũng được)?
   *
   * Cần một phép hỏi KHÔNG BIẾT mã bản phụ đề, vì lúc quyết định có tự mở bảng
   * hay không thì trình phát còn chưa nói cho biết nó đang dùng bản nào.
   */
  async function coTrongKho(v) {
    try {
      if (!v) return false;
      const { ytKho } = await self.Song.doc("ytKho");
      const kho = ytKho || {};
      const bayGio = Date.now();
      for (const k in kho) {
        if (k.indexOf(v + "|") !== 0) continue;
        const m = kho[k];
        if (m && bayGio - (m.ts || 0) < KHO_HAN && m.cau && m.cau.length) return true;
      }
      return false;
    } catch (e) { return false; }
  }

  async function docKhoYt(v, maBan) {
    try {
      const { ytKho } = await self.Song.doc("ytKho");
      const m = (ytKho || {})[khoaKho(v, maBan)];
      if (!m || Date.now() - (m.ts || 0) >= KHO_HAN) return null;
      return m;
    } catch (e) { return null; }
  }

  /**
   * Cất (hoặc cập nhật) phần của một video.
   *
   * `vá` chứ không ghi đè cả mục: bản chép lời cất lúc nạp xong, còn bản dịch
   * nhỏ giọt về sau từng loạt — ghi đè thì loạt sau xoá mất loạt trước.
   */
  async function ghiKhoYt(v, maBan, va) {
    try {
      const { ytKho } = await self.Song.doc("ytKho");
      const kho = ytKho || {};
      const k = khoaKho(v, maBan);
      const cu = kho[k] || {};
      kho[k] = Object.assign({}, cu, va, {
        ts: Date.now(),
        dich: Object.assign({}, cu.dich || {}, va.dich || {})
      });
      await self.Song.ghi({ ytKho: locKhoYt(kho, Date.now()) });
    } catch (e) { /* hết chỗ thì thôi, đừng làm hỏng bảng đang đọc */ }
  }

  /** Bỏ bản dịch đã cất của MỘT dòng — dùng khi người dùng vừa sửa dòng đó. */
  async function boDichTrongKho(v, maBan, i) {
    try {
      const { ytKho } = await self.Song.doc("ytKho");
      const kho = ytKho || {};
      const m = kho[khoaKho(v, maBan)];
      if (!m || !m.dich || !(i in m.dich)) return;
      delete m.dich[i];
      await self.Song.ghi({ ytKho: kho });
    } catch (e) { /* không bỏ được thì lượt dịch mới sẽ ghi đè lên */ }
  }

  /** Mã nhận dạng bản phụ đề đang chọn — để không trộn bản nọ với bản kia. */
  function maBanHienTai() {
    const b = S.ban[S.iBan];
    return b ? ((b.ma || "") + (b.tuDong ? ":auto" : "")) : "";
  }

  /**
   * Dời bảng mốc giờ trong câu sang bản chữ vừa sửa.
   *
   * Không làm việc này thì câu đã sửa mất hết mốc, và nó thành một khối chữ
   * chết giữa bảng: bấm vào không nhảy tới đâu, nghe theo cũng chẳng có chữ nào
   * sáng lên — trong khi đó lại đúng là câu người ta vừa ngồi sửa, tức là câu họ
   * quan tâm nhất. Xem CatCau.docLaiManh để biết mốc được dời thế nào.
   */
  function tinhLaiManh(c) {
    if (!self.CatCau || !self.CatCau.docLaiManh) return null;
    return self.CatCau.docLaiManh(c.goc == null ? c.s : c.goc, c.manhGoc, c.s);
  }

  /** Đắp bản sửa lên danh sách câu vừa ghép. Giữ bản gốc để còn quay về. */
  function dapSua() {
    for (const c of S.cau) {
      const k = khoaSua(c);
      const x = S.sua[k];
      if (x && x !== c.s) {
        if (c.goc == null) { c.goc = c.s; c.manhGoc = c.manh; }
        c.s = x;
        c.suaTay = true;
        c.manh = tinhLaiManh(c);
      }
    }
  }

  function video() {
    return document.querySelector("video.html5-main-video") || document.querySelector("#movie_player video") || document.querySelector("video");
  }

  /**
   * Đang chạy quảng cáo phải không.
   *
   * Đây là chỗ dễ quên nhất: YouTube dùng CHÍNH thẻ <video> đó để phát quảng
   * cáo, nên trong lúc quảng cáo chạy thì currentTime là giờ của quảng cáo —
   * thường vài giây — chứ không phải giờ của video. Không biết điều này thì
   * vệt sáng tụt về đầu bảng suốt thời gian quảng cáo rồi mới quay lại, nhìn
   * như bảng bị lỗi.
   *
   * Và tệ hơn: lúc ấy trình phát trả về dữ liệu của QUẢNG CÁO, không có phụ đề
   * nào cả, nên nếu vội đi dựng bảng thì mọi đường lấy phụ đề đều trượt.
   *
   * Nhận biết qua lớp CSS mà chính trình phát tự gắn — thứ này YouTube giữ ổn
   * định nhiều năm nay, và nó là dấu hiệu duy nhất nhìn thấy được từ ngoài.
   */
  function dangQuangCao() {
    const mp = document.querySelector("#movie_player") || document.querySelector(".html5-video-player");
    if (!mp || !mp.classList) return false;
    return mp.classList.contains("ad-showing") || mp.classList.contains("ad-interrupting");
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

  /** Logo của extension, nhúng sẵn để khỏi phải mở web_accessible_resources. */
  const LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAOuElEQVR4nGxZW2xdV5lel73PxZcktuPYses0JZmmSQeiMgwz8NDXzoxmNGgYzTBoxFQabm8FCRUkJCQE4iYekEA88EIleEBI3ARIPIAKSKjh0tKoBZI2CW1utmPH8eUcn7P3Xhe+7197H9stTry8zt7be33r+2/fv5zFGNXBr5t/rK6/4JdfdqtXw8oVp43GE1prpSLGKKPCb2Eeo1Za3qBjiHwi8n4IQSkMIargg4sRUz+aH/+bbPFMZ/HB9oN/P7F0dvw1q+v9gIY74Udf6l38ScX1sSr+YRGt0pz/ZRB88oMI5Dej/AsyDYILn4EjekDBKJhc4BVgkoty/dF3HX3HE0tjh7K/AujyM8X3PrPT3+DK2nJxcENWzL55wxC5eR1DgkagCU+YAwdZAVvejRiS0Y/mh2ftez71hjc+On0A0EsXiqc+vGl0hoXJhyEH9QS3jdaJHN3soyZoH081jhEmleaJJEHghRvX0OYSSenKE187lzAZfA92wnc+vW1AS2Mpk+yVYFm5ZgQcbhhlLJ8w6bqV5w2ZkpF3szZ/N7ErN/HB4Ivcy0M6zfXe+NTHXyoGvgb0/c9v9zb4lNxSzaj3jXiQ6+nRFbs3mj1MMirl3cjKsgdNNPzVGo2V15h6SWFh8071rc9eJaDdrfDi04XYp3nLiJs9TLInQWCyxFnUZg+Htirx91d2IrTs48PWV2oCUuRw9V98+/bOvcq88nypgjyd1khR3UTWAXzCRMoA+2z3OgSj+b4dGvlRIzg46gYrVn75d5vm2nNlc6/JN1qBgslJm95o9mFK1hE0ej8OU1unQTPa1Wje+M3UXJ7lRHDq1JH545P1/upRX724bW78wclHXWcXAXx8KXv8vd3J2Ybz/RzYPe8W/1DW6v95R/c9/zleB2aNIOqUt/Qod3CVrTuIKm7m6Gwrz0xjxxrT1ee3s7VXPeyKCK1Dm0O8dct95cu9w0dVp6vL8qCPy9uZqJXk66itVUdnDeI7a5tqEMS/+AyTs7wNb0ZwA3+QBIKUPr+Q/ebCOrJAgqyi4A7qxp/6WdFXRu/xFpukg0/bG2ryEDDFnR1zwDMkL0juQ/ZT3senvjXExJUR5AGZIdQAKpkbNbM05sg6HGOYn9d3VkrDeapC4tmCaXfHGZlJghtl4YZzXOn1tHP6g+/u/Nc/d0b+ZMx+Xyb2/iD2Bs4IQCb5yPda7dutkGW+lcc8C+02ng3Ts3prwynP1M7XpOcbEFqcU8faVHXVHKGRCqoGA9Uf6tJz7ajiyHZ6L47wuLdMzSHPYrvlxzqq0w6tjrJ5yAxRYjx7fuIjH5s/Ot3Ca0z0fA3sKHuoY0x4yug9yRtINzg3UqGEOVLPn9/43gC+PHtC371d+3iUCosUSJ/wnu4ZfWZjBeBBVcOA+94FLspRlS52x5Sd0sUufimOjevhMFZ4iwOFXKwqYsW3Rf3xt60xnY+iprGFaXLx/upx7IRau11HMZwC/mmtxxtdEUIVfUkcCgUKK3nOMWrZ47FFs3bbDXdZTVG5xif1iZNjF3+/7oKXKyFNUO9MXe1TxW7GVMlVzVyq5Lxy56aeW+B6ypGPVttz930fChVKT1aDpwsE8Sd6ceyMhdkFvfznyg2hkeSZGMpB6PfKw0dyxeirr2MxMJPtCZwGh2nUhTqIj2OIKzf04lK1sW7AR7lLEuhHos74dhE+VrQQrkweAdNx9ZXKULURpReUrvLLN4qqdNaw6NM1iImRWDM0GvW+ea1vEn+iJXA3z/zasp4+UoYCbuItLOljFqONMWOgBmotj33HmTk8EDZXiKDhJs0dgFnjjQ243m3ZJz7xJklwxGSSvNON9qvHoHQczUXn0F10Kwse3jcIK6/qhXmXIaUiH7JgxpaMeRqtmr8v9jdD7x7iPwiaQDvWo+CL0ZXEnVn/0++vqhRriIwoiwOSQBMcATzDCEgSMje0VKuLO64caHqJJOCVW3phzt9dtadOZ0sPtbDKzT8VVy4N8q4ZOxTWrkfvmAm9BxoTGOcwi5O4RVRi8Myq0U8cbr/04k0mVESZUZk4ALKTOeDRhCO6HRUgxnZX+ZKJHjUg7YMlLMaNVfPv75qYeSRXObXCyX9sn3th7Okf3r13O4o/gY/IXUmeDMKTp11CKw8DpgbfHbOhchKSvn4miCjHDsTNGw3aGA/zdkfBRhKbXnPwdH/Gsz73UGvqbN4+pdsntD2i7KSaOpPdv9QFgVYJJiib6CwtVRnl0hw2osZ3mMfxCdXfLsVeXBielIkLSQbjVamaWh06ZIdFLMvQnbDIMcw7JlrDDGYkCFsQakYvnmiDGzYbVplxFYbKtNTCidZLl7Bvn7VpMLwXGSbn5pEp8aizmdrZ8fCzM/9wejjcvbtyLTEnBdBneJ4pA8mP7DKJaK8+8OT43cvh57/dhqWCNA8SyZEVGfQGOpGBTSof+3l5K5oJiYpSMDnVzSvTwhIugwGUxBffS0HSaufDws/Nq87MzD996Fjv+XDpN1cFTV3dstQaiCrwkqOwkP7uU8Vg16+sai99olStmISrSCdEk8qNWr7mjp0Kum1CyRt+EPwddfPKYLBR+aow3il2YdiQEw/weVv1+14KRtBXdy98c/b61bu198BKkh0ysIRUCC7pv0l7BHXlUpF1EJaa9pDwY6x5R9HnaUFYApy9eKl35nQHxNhJRkPsxeFtf+XSpvIFykkMhdXsFUWAe5vrQb9qaVVhVYyu+vUPnil9yFiEyA2iEotk0k55Kb2MOo5oC3KUJ1MrG8+ajOaT6LyoHDCK/aK2t+JPL9yda3WOzsGj1Pry8NZGrzPhijWnQqE1GMLaAcSAgmIXeYttGLzOMdcAGbNokFzqWSHAnMuAgDqFlRZokHWUabOS+Eq0H0xIlMEyLXAfCRPaPHA2eVRvrfitMLx2AyZn/kVByad095Av71V4P+pu3gmu8K5wMLHz3DNKqGQW4UYlNBi1J8qQMTqZFWm1hAmm10n3QZ6axBDNLrI4CEHMqhC422u+GELrsIQZiC56tR+ulofncjMRdYXkHqrdCq/OjXiJIUNA48gcvSsT3cj8GVLmrBJDzH7GZOJDonMSK9qgAYcOIQJNm+pGm44dVr6Ku1uII1jTiQFRKT0SqNGu2ChmTnb7two3qCw9ISb9SruAoUApHZjNgINvE92IDxWMaepzCfLkJGU4lGLpuvFdsX5iZTlPUXJ2ACtmGRXW1h2XqjRME0MFlzCqbHeQurArf+/lexNzrcz4HO6sXMvAQJjDNPQq0EleFWutRLtUXPpcxSoT0vlNM7rKSXA5SeVAnTCBZl5HeptZ1Gs3Sjm7KBnY8ERI5i4rDJ6p+hACpVW+9+rWzBsmiEYTBzEpZiZLTFFL5Tccg9QivoelKZ3iyNv3Tif6OyXksLaOKsvL6YkXtlw1vQAhOwSRSlV5rlot3x2nBHFFNdyBEnCSV+BqGH3v+ub0yQmo/dxGhhvSPbmJiZtDCx0jBZxtUnTSLDHKHL2H1rViY/YtGAc9KBXd7soBBty+wiNh6hgsDq3qWx3x9KpyiNRBmWsktCqnKzppW+A3QYIuluv9qcWx/vKOSDgWSGxQWoTQv92jDqYhKrpooA9lyYfYKwYp8FhbOilko2GhqlKBXqgFZH+o9Lwd165XCFymSgXy8d/lDBRPSYjambSYCayU0m9EsNkP44/9y+7yRnbxGc++MQoO0YBc0UkSxLEdGTJe/Lc5aUunSelsi36D5/C5KKp3P3768f8/s3K9KgsUMO4hnYgpmcuJopclgqyRjvWkGsDhY+fhxybf+Oh9Kl2RLjvWKiO9p5ImhWNGmRlor6CkIyVDKUcjU0npR8Rm+vixDKkFORdZjrFKV4dDwO8cm+ZQKx458PQ2YbIc4beht/Xs16+E/radOxxXtmIjQlFT6ZeM8RoNLKw/+c7fvvJCX5otq5tDK+AD/IxyFJ6o5+9rlT2d5WZ7vSfRwYJiWZ9dztzqGM8YLceWhb72GDMIMczxgEniXMNH8tmJ3lp/MKiGjr3TwKEhC7uuLBBJrpw+M52dODt+7eIWkLDTTl2iKEZN8V5BtZw8N/7KH/qa7lIrhJTFk6ryok1TnpUTBakMzH60Dq1r2KhJlSZrg5tb+XS3PTE+XN+uEDjIhmjHoN8goJSbe3DGLD00Xp9LquQ9zRmlrxB8M/P5yy/sOMQS7jEjRxl5qhpYTnw9irvJQSYGVdExVRnQm8bCBUwKbM6roUfvFO6tbi289S3Tj/wdMlvpHceAztYB09LfzmUnzk02UTbqv5jq3/LmB8Ym7YVfXpOTBdYdRDx83hBTfbKBQKuZoHxhTIGbklWTmDORJOCsSuqCocMOFR+f++4PqE58hYgtURvYgEBauwfOL2anzx85eX782vPbVufEolN0mJW1e3bNMI6kUci0VGMqP/qQk/XkCvspGLySCAK/uUmxhmJbe49UMcRgEEaBAwiioPEYy8jRqWrx/PzDbzstDfKN3kf/9WeDLdZXw+O8dGDEFl6aempFHq9Iaw3EddsrCgastCgd6N0IujQiyjgaSl5KG0lUUi5haZgcRnRIrwWESaiGEJeA2tVf+OXHZhaOULUeW5p4/2cfcXFY+YGj0YtAszgvDLPuSX5yKT7hXVL16D2e47B0SEelHM0XklIwhxZnHHm/i9LYVgPvhoHzIRK7R0y5ASJL0JTRDX3xf59/J9Ac+NPCs0/f/OqTv95cLRHzwhN1QUZFJKdT3DFtIudRohnIExO/HGLjSqqajCqjZKR48lpaJ/ZyrOKgB/thZFUR9NCB8iOt//3cf7z939782r918CBsu/zKk7965sfXYTsezFMK6Qz4IDkMMx9GTfVIIZeJbDOSk6QaQF1EqkTakacIclf0sZbMLgqVHRqyv0oe7R9+7KH3ffG/J6cn1Ov/+DL6Wl/uX37uzuXn1i4/u/7nFzdhcCtHuvSkqKxofulAgvxBIcgpYSAfwpOcjkWp9oHdQKp0zMLSQNk49cDU4puOn37r/Wfffmru/qOvWf0vAAAA//+Q1x6HAAAABklEQVQDANA/PhzqxTdoAAAAAElFTkSuQmCC";

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
    .top .lg { flex:0 0 auto; border-radius:4px; display:block }
    /* Chip cho biết đang lưu vào sổ nào — chữ, nên cần cỡ nhỏ hơn nút icon. */
    .chip.ngu { font-size: 11px; font-weight: 700; padding: 3px 8px; letter-spacing: -.01em; }
    .top .nm { font-size: 13.5px; font-weight: 750; letter-spacing: -.01em; flex: 1; min-width: 0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
    /* Hai nút xếp CHỒNG lên nhau, cả cụm chỉ rộng bằng nút rộng nhất. Nằm ngang
       thì chúng ăn mất một khoảng bề ngang của dòng chữ, mà bảng vốn đã hẹp:
       chữ xuống dòng sớm, mắt đọc theo tiếng không kịp. */
    .acts { flex: none; display: flex; flex-direction: column; align-items: stretch; gap: 4px; }
    .ln .sv {
      flex: none; visibility: hidden; border: 1px solid var(--line); background: var(--surface);
      color: var(--accent); border-radius: 999px; padding: 3px 8px; font-size: 11px; font-weight: 650;
      display: inline-flex; align-items: center; justify-content: center; gap: 3px;
      white-space: nowrap;
    }
    .ln:hover .sv, .ln.on .sv { visibility: visible; }
    .ln .sv.done { color: var(--good); background: var(--good-soft); border-color: transparent; }
    /* Nút sửa của dòng ĐÃ SỬA thì hiện thường trực: đó là dấu cho biết dòng này
       không còn là bản của YouTube nữa, mà giấu đi thì chẳng còn chỗ nào nói. */
    .ln .sv.ed.done { visibility: visible; }
    .ln.dasua .tx { border-left: 2px solid var(--good); padding-left: 7px; }

    /* --- ô sửa lời thoại ---
       Chiếm trọn một dòng riêng bên dưới, để mấy dòng trước và sau vẫn nhìn
       thấy: chép lời sai thì thường sai một cụm, phải có ngữ cảnh mới đoán ra
       người ta nói gì. */
    /* Ba nút đọc theo xếp ngang trong cụm dọc: chúng chỉ có hình nên một hàng
       ngang vẫn hẹp hơn nút Lưu ở trên. */
    .acts .ghiam { display: flex; gap: 2px; justify-content: center; }
    .ln .sv.ga { padding: 3px 5px; }
    .ln .sv.ga.dangthu { color: #d33; border-color: #d33; visibility: visible; }
    /* Đang phát thì nút đổi thành ô vuông và hiện thường trực — bấm lần nữa là
       dừng, chứ không chồng thêm một giọng nữa. */
    .ln .sv.ga.dangphat { color: var(--accent); border-color: var(--accent); visibility: visible; }
    .ln .sv.ga.hong { color: var(--ink-3); }

    .edbox {
      flex-basis: 100%; margin: 8px 0 2px; cursor: default;
      background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
      padding: 10px 11px 9px;
      box-shadow: 0 1px 2px rgba(16,24,40,.05), 0 8px 24px rgba(16,24,40,.10);
    }
    .edtop {
      display: flex; align-items: center; gap: 6px; margin-bottom: 7px;
      color: var(--ink-3); font-size: 11px; font-weight: 650;
      -webkit-user-select: none; user-select: none;
    }
    .edtop b { color: var(--accent); font-variant-numeric: tabular-nums; font-weight: 700; }
    .edta {
      width: 100%; box-sizing: border-box; resize: none; overflow: hidden; display: block;
      font: inherit; font-size: calc(var(--cx) * 0.9); line-height: 1.55;
      color: var(--ink); background: var(--surface-2); border: 1px solid transparent;
      border-radius: 9px; padding: 9px 11px; transition: border-color .12s, box-shadow .12s;
    }
    .edta:focus {
      outline: none; background: var(--surface);
      border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .edrow { display: flex; align-items: center; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
    /* Nút trong ô sửa không núp theo chuột như nút ngoài dòng: đang gõ mà nút
       Lưu chỉ hiện khi rê chuột tới thì gõ xong chẳng biết bấm vào đâu. */
    .edbox .sv {
      visibility: visible; border: 1px solid var(--line); background: var(--surface);
      color: var(--accent); border-radius: 999px; padding: 5px 12px; font-size: 12px;
      font-weight: 650; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
      -webkit-user-select: none; user-select: none;
    }
    .edbox .sv:hover { background: var(--surface-2); }
    .edbox .sv.pri { background: var(--accent); border-color: var(--accent); color: #fff; }
    .edbox .sv.pri:hover { filter: brightness(1.07); }
    .edhint { color: var(--ink-3); font-size: 11px; margin-left: auto; }
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

  /* ================================================================== */
  /* Thu nhỏ khung video                                                 */
  /* ================================================================== */
  /*
   * Người xem để học thì mắt ở BẢNG LỜI THOẠI, không ở hình. Mà bố cục mặc định
   * của YouTube cho khung hình gần hết bề ngang, đẩy cột phải — chỗ đặt bảng —
   * xuống còn hơn 400px, đọc lời thoại như đọc qua khe cửa.
   *
   * Nên thu khung hình lại và trả phần thừa cho cột phải.
   *
   * Vì sao phải nhắc trình phát "cửa sổ vừa đổi cỡ": trình phát HTML5 của
   * YouTube đặt kích thước bằng PIXEL lên thẻ video và chỉ tính lại khi cửa sổ
   * đổi cỡ — nó không theo dõi cái khung bọc ngoài. Không nhắc thì khung co lại
   * mà hình vẫn to như cũ rồi tràn ra ngoài.
   */
  let oThuNho = null;
  let thuNho = false, thuNhoW = 620;
  /**
   * Thu nhỏ chỉ đúng khi ĐANG HỌC — thẻ do NeutronDict mở ra từ sổ tay hay từ
   * chế độ học. Lướt YouTube bình thường mà hình bị bó lại là phá trang của
   * người ta, không phải giúp.
   *
   * Dấu do bên mở đặt vào URL (xem danhDauHoc trong notebook.js). Đọc một lần
   * lúc nạp là đủ: chuyển sang video khác thì YouTube thay hẳn URL, dấu rụng —
   * mà lúc đó cũng đúng là đã rời buổi học.
   */
  const tuApp = (() => {
    try { return new URL(location.href).searchParams.get("nd_hoc") === "1"; }
    catch (e) { return false; }
  })();
  /** Người xem tự bấm nút thu nhỏ trên bảng — chỉ có giá trị cho THẺ NÀY. */
  let batTay = false;
  /** Các nấc cỡ khung hình, xếp TO -> NHỎ. Xem nút .khung trên thanh tiêu đề. */
  const CO_KHUNG = [760, 620, 520, 440, 360];

  function datThuNho(st) {
    /*
     * `!== false`, KHÔNG phải `!!`. Đây chính là lỗi làm ba bản vá trước thành
     * mã chết đối với người dùng.
     *
     * `SET_DEFAULTS` trong notebook.js chỉ dùng để VẼ màn Cài đặt; nó không ghi
     * gì vào kho. Nên với người đã dùng app từ trước, đối tượng `settings` trong
     * kho KHÔNG hề có khoá `ytNho` cho tới khi họ mở Cài đặt và bấm Lưu. Viết
     * `!!(st && st.ytNho)` thì undefined ra false — tính năng tắt ngóm, mà nhìn
     * vào mã thì tưởng mặc định là bật.
     *
     * Mọi cài đặt "mặc định BẬT" khác trong tệp này đều viết `!== false` (xem
     * datPhoi). Tôi viết lệch đúng một chỗ, và mất ba lượt vá mới thấy.
     */
    // Công tắc trong Cài đặt là cái CHO PHÉP; còn có thu hay không thì phải
    // đúng cảnh: thẻ do app mở, hoặc người xem tự bấm nút trên bảng.
    const bat = (!st || st.ytNho !== false) && (tuApp || batTay);
    const w = Math.max(320, Math.min(1200, parseInt((st || {}).ytNhoW, 10) || 620));
    if (bat === thuNho && w === thuNhoW) return false;
    thuNho = bat; thuNhoW = w;
    veThuNho();
    if (S.veNutKhung) S.veNutKhung();     // chip trên bảng phải hiện đúng cỡ mới
    return true;
  }

  /** Những thẻ đã bị ép bề ngang bằng JS — nhớ lại để còn trả nguyên trạng. */
  const daEp = new Set();

  /** Lớp đánh dấu đặt trên <html>. Xem veThuNho về việc vì sao không bám vào
      thuộc tính của ytd-watch-flexy nữa. */
  const LOP_NHO = "nd-yt-nho";      // đang bật thu nhỏ
  const LOP_TO = "nd-yt-to";        // tạm để yên (rạp / toàn màn hình)

  function veThuNho() {
    const g = document.documentElement;
    if (!thuNho || dangHang) {
      if (oThuNho) { oThuNho.remove(); oThuNho = null; }
      g.classList.remove(LOP_NHO, LOP_TO);
      for (const n of daEp) { try { n.style.removeProperty("max-width"); } catch (e) {} }
      daEp.clear();
      nhacDoiCo();
      return;
    }
    if (!oThuNho) {
      oThuNho = document.createElement("style");
      oThuNho.id = "neutrondict-thu-nho";
      (document.head || document.documentElement).appendChild(oThuNho);
    }
    g.classList.add(LOP_NHO);
    /*
     * ĐÂY mới là chỗ hỏng thật, và nó không nằm ở selector.
     *
     * Trình phát của YouTube ghi kích thước BẰNG PIXEL thẳng vào thẻ video:
     *     <video class="video-stream html5-main-video"
     *            style="width: 865px; height: 487px; left: 0px; top: 4px">
     * (đọc được nguyên văn trong DevTools của người dùng). Bó `max-width` lên
     * mấy khung bọc thì khung co lại thật, nhưng thẻ video bên trong vẫn giữ
     * đúng 865px và TRÀN RA NGOÀI — nhìn vào thì y như chưa làm gì.
     *
     * Cách chữa: ép chính thẻ video vừa khít khung. Luật trong bảng kiểu có
     * `!important` THẮNG kiểu nội tuyến không `!important` — mà kiểu YouTube ghi
     * vào là loại không important. Nên chỉ cần nói to hơn nó một bậc.
     *
     * Và bỏ luôn việc bám vào `ytd-watch-flexy[...]`: tên thẻ với thuộc tính đó
     * là thứ YouTube đổi thường xuyên nhất. Giờ khoá bằng một lớp mình tự đặt
     * lên <html>, còn việc "khi nào thì để yên" do JS quyết (xem canhToNho).
     */
    const K = "html." + LOP_NHO + ":not(." + LOP_TO + ") ";
    const W = thuNhoW + "px";
    const bo = ["#movie_player", "#player", "#player-container-outer",
                "#player-container-inner", "#full-bleed-container",
                "#player-full-bleed-container", "#primary"];
    oThuNho.textContent =
      bo.map((x) => K + x).join(",") +
        "{max-width:" + W + "!important;min-width:0!important}" +
      K + "#movie_player{height:auto!important;aspect-ratio:16/9!important;" +
        "margin-left:auto!important;margin-right:auto!important}" +
      // Khung bọc trong cùng của trình phát và CHÍNH thẻ video: bắt vừa khít.
      K + "#movie_player .html5-video-container{" +
        "width:100%!important;height:100%!important;position:relative!important}" +
      K + "#movie_player video.html5-main-video{" +
        "position:absolute!important;left:0!important;top:0!important;" +
        "width:100%!important;height:100%!important;object-fit:contain!important}" +
      /*
       * Dải đen dưới khung hình.
       *
       * Ở bố cục một cột, YouTube ghi CHIỀU CAO cố định cho khung bọc
       * full-bleed, tính theo khung hình 865px. Thu trình phát xuống 620px thì
       * chiều cao ấy vẫn nguyên, thừa ra gần 180px nền đen.
       *
       * ĐẶT ĐÚNG SỐ, chứ KHÔNG dùng `height:auto`. Trình phát nằm trong khung
       * bọc này bằng định vị TUYỆT ĐỐI, nên nó không chống được chiều cao cho
       * cha: `height:auto` làm khung bọc co về 0 và cả video biến mất — đúng
       * cái người dùng gặp ở bản trước, mở ra chỉ thấy bảng lời thoại, không
       * còn hình đâu. Cao đúng bằng bề ngang đã đặt theo tỉ lệ 16:9.
       */
      K + "#full-bleed-container,#player-full-bleed-container{" +
        "height:" + Math.round(thuNhoW * 9 / 16) + "px!important;" +
        "min-height:0!important;max-height:none!important;" +
        // Và canh giữa, không dán vào mép trái của một cửa sổ rộng hơn nó.
        "margin-left:auto!important;margin-right:auto!important}" +
      K + "#primary{flex:1 1 auto!important}" +
      K + "#secondary{width:auto!important;max-width:none!important;" +
        "min-width:300px!important;flex:1 1 auto!important}";
    canhToNho();
    nhacDoiCo();
    epBeNgang();
  }

  /**
   * Khi nào thì TẠM ĐỂ YÊN cho hình to: rạp và toàn màn hình.
   *
   * Hai chế độ đó là ý muốn rõ ràng của người xem. Trước đây việc này nằm trong
   * selector CSS (`:not([theater])`), mà thuộc tính ấy là của YouTube — họ đổi
   * là hỏng. Hỏi bằng JS thì hỏng cũng chỉ hỏng một chiều: cùng lắm là hình vẫn
   * nhỏ trong chế độ rạp, chứ không phải cả tính năng ngừng chạy.
   */
  function canhToNho() {
    if (!thuNho || dangHang) return;
    let to = false;
    try {
      to = !!document.fullscreenElement
        || !!document.querySelector("ytd-watch-flexy[theater], ytd-watch-flexy[fullscreen]")
        || !!document.querySelector(".ytp-fullscreen");
    } catch (e) { to = false; }
    document.documentElement.classList.toggle(LOP_TO, to);
  }

  /**
   * Chốt chặn cuối: ĐO rồi mới ép.
   *
   * Đo chính THẺ VIDEO — đó là thứ người dùng nhìn thấy, và cũng là thứ mang
   * kích thước pixel nội tuyến. Còn rộng hơn mức đã đặt thì đi ngược lên tìm
   * đúng thẻ đang phình ra và bó chính nó, không cần biết YouTube gọi nó là gì.
   */
  /**
   * Nhờ CHÍNH TRÌNH PHÁT tự đổi cỡ, bằng API của nó.
   *
   * Đây mới là đường mà mấy extension đổi cỡ YouTube dùng: `movie_player` có sẵn
   * `setSize(w, h)`. Gọi nó thì trình phát tự tính lại mọi thứ — thẻ video, lớp
   * điều khiển, phụ đề — thay vì mình đè CSS lên rồi nó tính một đằng, hiển thị
   * một nẻo.
   *
   * Phải gọi từ THẾ GIỚI CỦA TRANG: content script chạy trong thế giới cách ly,
   * ở đó `movie_player` chỉ là một thẻ DOM trơn, không có mấy hàm ấy. Cầu nối
   * phu-de-trang.js vốn đã có sẵn cho việc đọc getPlayerResponse.
   *
   * Vẫn giữ cả CSS: `setSize` là đường tốt nhất nhưng không chắc chắn — Chrome
   * cũ không cho world:MAIN, và YouTube có thể đổi tên hàm. Hai lớp cùng làm một
   * việc thì hỏng một lớp vẫn còn lớp kia.
   */
  let henCoSize = null;
  /** Nhờ trình phát tự tính lại theo cỡ này. Gộp nhịp: bố cục đổi liên tục. */
  function doiCoTrinhPhat(w, h) {
    if (!(w > 0 && h > 0)) return;
    clearTimeout(henCoSize);
    henCoSize = setTimeout(() => {
      hoiTrang("cosize", "", { w: Math.round(w), h: Math.round(h) }).catch(() => {});
    }, 120);
  }
  function nhoTrinhPhatDoiCo() {
    if (!thuNho) return;
    doiCoTrinhPhat(thuNhoW, Math.round(thuNhoW * 9 / 16));
  }

  function epBeNgang() {
    if (!thuNho || dangHang) return;
    nhoTrinhPhatDoiCo();
    const vd = document.querySelector("#movie_player video.html5-main-video")
      || document.querySelector("video.html5-main-video");
    const mp = document.querySelector("#movie_player");
    const dich = vd || mp;
    if (!dich) return;
    const rong = dich.getBoundingClientRect().width;
    if (!rong || rong <= thuNhoW + 8) return;        // kiểu đã đủ việc
    let n = dich, doi = false;
    for (let i = 0; i < 7 && n && n !== document.body; i++) {
      if (n.getBoundingClientRect().width > thuNhoW + 8) {
        n.style.setProperty("max-width", thuNhoW + "px", "important");
        daEp.add(n); doi = true;
      }
      n = n.parentElement;
    }
    if (doi) nhacDoiCo();
  }

  let henDoiCo = null;
  function nhacDoiCo() {
    clearTimeout(henDoiCo);
    // Vài nhịp chứ không một nhịp: YouTube dựng lại bố cục nhiều lần lúc vào
    // video, nhắc sớm quá thì nó tính theo cỡ cũ rồi lại ghi đè.
    let n = 0;
    henDoiCo = setInterval(() => {
      try { window.dispatchEvent(new Event("resize")); } catch (e) {}
      if (++n >= 4) clearInterval(henDoiCo);
    }, 350);
  }

  /**
   * Chỗ đặt bảng: bình thường là cột phải, ngay trên danh sách video gợi ý.
   *
   * Nhưng cửa sổ hẹp thì YouTube xếp cột phải XUỐNG DƯỚI phần mô tả — bảng lời
   * thoại rơi ra ngoài tầm nhìn, phải cuộn một quãng dài mới thấy. Đó đúng là
   * cảnh người dùng gặp khi mở nguồn ở nửa màn hình.
   *
   * Nên: đo xem cột phải đang NẰM CẠNH hay NẰM DƯỚI khung hình. Nằm dưới thì
   * đặt bảng ngay dưới khung hình, trên cả tiêu đề — chỗ mắt đang nhìn.
   */
  function choDat() {
    /*
     * Hai thẻ khác nhau cho hai việc khác nhau, và lẫn chúng là một cái bẫy:
     *   - ĐO thì phải đo #secondary. #secondary-inner lúc chưa có gì bên trong
     *     thì cao 0, mà "cao 0" lại đúng là dấu hiệu tôi dùng để nhận ra thẻ bị
     *     ẩn — thành ra cửa sổ rộng cũng bị đẩy bảng xuống dưới khung hình.
     *   - ĐẶT thì đặt vào #secondary-inner, đúng nếp cũ.
     */
    const secDo = document.querySelector("#secondary") || document.querySelector("#secondary-inner");
    const sec = document.querySelector("#secondary-inner") || secDo;
    const duoi = document.querySelector("ytd-watch-flexy #below") || document.querySelector("#below");
    const mp = document.querySelector("#movie_player");

    // Chưa có trình phát trong trang: không đo được gì, cứ theo nếp cũ.
    if (!mp) return sec || duoi;
    const a = mp.getBoundingClientRect();
    // Có trình phát nhưng CHƯA dựng xong (chưa có kích thước): chưa quyết vội.
    // Trả null là "chờ thêm" — vòng thử lại bên xemLai sẽ hỏi lại sau 500ms.
    // Quyết lúc này thì cửa sổ rộng cũng bị đẩy bảng xuống dưới khung hình.
    if (!(a.width > 0)) return null;

    /*
     * Hỏi ĐÚNG một câu, và hỏi theo chiều KHẲNG ĐỊNH: cột phải có đang nằm
     * CẠNH khung hình không? Nằm cạnh = mép trái của nó bắt đầu từ mép phải
     * khung hình trở đi, VÀ đỉnh nó còn cao hơn đáy khung hình.
     *
     * Bản trước hỏi ngược lại ("cột phải có nằm DƯỚI không") rồi mới đổi chỗ.
     * Câu hỏi ngược có một lỗ: cột phải bị ẩn hẳn (display:none) thì rect toàn
     * số 0 — không "nằm dưới", nên hàm trả về ngay cột phải ĐANG ẨN, và bảng
     * được dựng vào một thẻ không hiển thị. Người dùng thấy: dưới khung hình là
     * tiêu đề, không có bảng nào, mà trong DOM thì bảng vẫn có.
     *
     * Nhưng câu trả lời có BA khả năng, không phải hai — và gộp hai cái sau
     * làm một chính là lỗi tôi vừa gây ra:
     *
     *   1. Cột phải nằm cạnh khung hình      -> đặt vào cột phải.
     *   2. Cột phải ẩn hẳn, hoặc xếp xuống dưới -> đặt dưới khung hình.
     *   3. CHƯA BIẾT: thẻ đã có trong DOM nhưng chưa có kích thước, mà cũng
     *      không phải display:none            -> ĐỢI, hỏi lại nhịp sau.
     *
     * YouTube dựng cột phải sau khung hình, nên trạng thái 3 luôn xảy ra trong
     * vài trăm mili giây đầu. Trả lời "không nằm cạnh" lúc ấy là chốt bảng
     * xuống dưới video và để nó nằm im ở đó, trong khi cột phải rộng rãi hiện
     * ra ngay sau. Cửa sổ rộng, video cao thì bảng rơi hẳn khỏi tầm nhìn —
     * người dùng mở YouTube lên và thấy bảng "không thèm hiện ra".
     *
     * Phân biệt 2 với 3 bằng display: ẩn thật thì display là none, còn chưa
     * dựng xong thì không.
     */
    // Bố cục một cột: YouTube không có cột phải nào để đặt vào. Tự dựng một
    // hàng ngang cạnh khung hình — xem khungCanh.
    if (secDo && sec) {
      const b = secDo.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) {
        /*
         * Đo theo CHIỀU DỌC, không theo trái/phải.
         *
         * Tôi từng đổi sang so mép trái cột phải với mép phải khung hình. Nghe
         * chặt chẽ hơn, mà lại mong manh hơn hẳn: trình phát YouTube nhiều lúc
         * RỘNG HƠN cột chứa nó và tràn ra ngoài, thế là "mép phải khung hình"
         * nằm quá cả cột phải và phép đo kết luận sai. Còn "cột phải bắt đầu từ
         * dưới đáy khung hình" thì đúng theo đúng nghĩa của hai bố cục: xếp dọc
         * hay xếp ngang.
         */
        const duoiHan = b.top >= a.bottom - 4;
        if (!duoiHan) { goCanh(); return sec; }        // cột phải sẵn có: dùng luôn
        return khungCanh() || duoi || sec;
      }
      let an = false;
      try { an = getComputedStyle(secDo).display === "none"; } catch (e) { an = false; }
      if (!an && conChoCot()) return null;          // chưa biết: hỏi lại nhịp sau
    } else if (conChoCot()) {
      return null;                                  // chưa có cả thẻ cột phải
    }
    return khungCanh() || duoi || sec;
  }

  /* ================================================================== */
  /* Hàng ngang tự dựng: khung hình bên trái, bảng bên phải              */
  /* ================================================================== */
  /*
   * Cửa sổ hẹp thì YouTube chuyển sang MỘT CỘT: không còn cột phải nào, khung
   * hình kéo ra sát hai mép, mọi thứ khác xếp dọc xuống dưới. Bảng lời thoại đi
   * theo bố cục ấy thì nằm dưới khung hình — mà người học nhìn bảng là chính,
   * nằm dưới nghĩa là vừa xem vừa cuộn.
   *
   * Nên ở cảnh đó tự dựng một hàng ngang. Ba nguyên tắc:
   *
   *   1. KHÔNG dời thẻ trình phát. Trình phát YouTube giữ trạng thái theo cây
   *      DOM; nhấc nó sang chỗ khác là mất tiến trình phát, có khi treo hẳn.
   *      Chỉ chèn một thẻ bọc của mình vào NGAY SAU khối bọc khung hình, rồi
   *      biến thẻ cha chung thành hàng ngang.
   *   2. Khối bọc khung hình trong bố cục full-bleed định vị TUYỆT ĐỐI, tức là
   *      nằm ngoài dòng chảy — để nguyên thì hàng ngang không thấy nó và bảng
   *      trườn lên đè khung hình. Phải kéo nó về position:relative.
   *   3. Khung hình phải NHƯỜNG bề ngang thật sự, không chỉ bị cắt: đặt cỡ cho
   *      nó và nhờ chính trình phát tính lại (setSize), như phần thu nhỏ.
   */
  const LOP_HANG = "nd-yt-hang";     // thẻ cha, biến thành hàng ngang
  const LOP_KHUNG = "nd-yt-khung";   // khối bọc khung hình trong hàng ấy
  const ID_CANH = "neutrondict-canh";
  const RONG_BANG = 380;             // bề ngang dành cho bảng, tối thiểu
  let oCanh = null, canhW = 0;
  /*
   * Đang ở chế độ hàng ngang hay không.
   *
   * Hai chế độ này bó CÙNG những thẻ ấy, nên phải nhường nhau. Thu nhỏ bó
   * `#full-bleed-container` về 620px; hàng ngang lại cần chính thẻ đó rộng hết
   * cỡ để chia đôi cho khung hình và bảng. Để cả hai cùng chạy thì hàng ngang
   * chỉ còn 620px, hẹp tới mức không dựng nổi, và bảng lại rơi xuống dưới —
   * đúng lỗi đo được ở lượt mở từ extension.
   *
   * Hàng ngang thắng, vì nó đã tự lo việc thu khung hình rồi: nó chốt cỡ cho
   * khối bọc và gọi setSize. Bật hàng ngang thì gỡ hẳn bảng kiểu thu nhỏ.
   */
  let dangHang = false;

  /** Khối bọc khung hình mà ta bó lại — KHÔNG phải chính thẻ trình phát. */
  function khoiKhung() {
    const mp = document.querySelector("#movie_player");
    if (!mp) return null;
    return document.querySelector("#player-full-bleed-container")
        || document.querySelector("#player-container-inner")
        || document.querySelector("#player-container-outer")
        || mp.parentElement;
  }

  function khungCanh() {
    const khoi = khoiKhung();
    const cha = khoi && khoi.parentElement;
    if (!khoi || !cha) return null;
    const rong = Math.round(cha.getBoundingClientRect().width);
    if (!(rong > RONG_BANG + 320)) { goCanh(); return null; }   // hẹp quá thì thôi, xếp dọc còn hơn

    let hop = document.getElementById(ID_CANH);
    if (!hop) { hop = document.createElement("div"); hop.id = ID_CANH; }
    if (hop.parentElement !== cha || hop.previousElementSibling !== khoi) {
      khoi.insertAdjacentElement("afterend", hop);
    }
    cha.classList.add(LOP_HANG);
    khoi.classList.add(LOP_KHUNG);
    if (!dangHang) { dangHang = true; veThuNho(); }
    veCanh(rong);
    return hop;
  }

  /** Bề ngang cho khung hình: phần còn lại sau khi chừa chỗ cho bảng. */
  function veCanh(rong) {
    const w = Math.max(300, Math.min(rong - RONG_BANG - 12,
      thuNho ? thuNhoW : Math.round(rong * 0.62)));
    if (w === canhW && oCanh) return;
    canhW = w;
    const h = Math.round(w * 9 / 16);
    if (!oCanh) {
      oCanh = document.createElement("style");
      oCanh.id = "neutrondict-hang";
      (document.head || document.documentElement).appendChild(oCanh);
    }
    const H = "." + LOP_HANG, K = H + " > ." + LOP_KHUNG;
    oCanh.textContent =
      H + "{display:flex!important;align-items:flex-start!important;flex-wrap:nowrap!important;" +
        "height:auto!important;min-height:0!important;max-height:none!important}" +
      // Kéo khối bọc khung hình về trong dòng chảy, rồi chốt cỡ cho nó.
      K + "{position:relative!important;left:auto!important;top:auto!important;" +
        "right:auto!important;bottom:auto!important;flex:0 0 auto!important;" +
        "width:" + w + "px!important;max-width:" + w + "px!important;height:" + h + "px!important}" +
      K + " #movie_player{position:absolute!important;left:0!important;top:0!important;" +
        "width:100%!important;height:100%!important;max-width:none!important}" +
      K + " #movie_player .html5-video-container{width:100%!important;height:100%!important;" +
        "position:relative!important}" +
      K + " #movie_player video.html5-main-video{position:absolute!important;left:0!important;" +
        "top:0!important;width:100%!important;height:100%!important;object-fit:contain!important}" +
      H + " > #" + ID_CANH + "{flex:1 1 auto!important;min-width:320px!important;" +
        "align-self:stretch!important;box-sizing:border-box!important;padding-left:12px!important}";
    doiCoTrinhPhat(w, h);
  }

  /** Trả trang về nguyên trạng khi không còn cần hàng ngang nữa. */
  function goCanh() {
    const hop = document.getElementById(ID_CANH);
    if (hop && !hop.firstChild) hop.remove();
    for (const n of document.querySelectorAll("." + LOP_HANG)) n.classList.remove(LOP_HANG);
    for (const n of document.querySelectorAll("." + LOP_KHUNG)) n.classList.remove(LOP_KHUNG);
    if (oCanh) { oCanh.remove(); oCanh = null; }
    canhW = 0;
    if (dangHang) { dangHang = false; veThuNho(); }
  }

  /**
   * Còn trong thời hạn chờ cột phải dựng xong không.
   *
   * Phải CÓ hạn: cột phải có thể không bao giờ xuất hiện (bố cục một cột, hoặc
   * YouTube đổi tên thẻ). Hết hạn thì đặt dưới khung hình, có bảng ở chỗ hơi
   * lệch vẫn hơn là không có bảng nào.
   */
  const HAN_CHO_COT = 4000;
  let mocCho = Date.now();
  function conChoCot() { return Date.now() - mocCho < HAN_CHO_COT; }

  /**
   * Trên trang chỉ được có ĐÚNG MỘT bảng của NeutronDict.
   *
   * Bản content script cũ vẫn nằm nguyên trong trang sau khi extension được nạp
   * lại, và bảng nó dựng ra thì không ai gỡ. Người dùng thấy hai bảng chồng
   * nhau mà không hiểu vì sao. Gỡ mọi bảng không phải bảng đang dựng — dấu
   * data-ndict-yt là của riêng app này nên không đụng vào extension khác.
   */
  function donBangLac(giu) {
    for (const n of document.querySelectorAll("div[data-ndict-yt]")) {
      if (n !== giu) n.remove();
    }
  }

  function goBang() {
    goPhoi();
    if (quanSat) { quanSat.disconnect(); quanSat = null; }
    hangCho.clear(); clearTimeout(henDich);
    if (S.host) { S.host.remove(); S.host = null; S.root = null; S.oList = null; }
    S.veNutKhung = null;      // nút đã theo bảng đi rồi, đừng gọi vào chỗ trống
  }

  function dungBang() {
    goBang();
    const noi = choDat();
    if (!noi) return false;

    const host = document.createElement("div");
    host.setAttribute("data-ndict-yt", "1");   // content.js nhìn dấu này để không cướp sự kiện
    host.style.cssText = "all:initial;display:block;margin-bottom:16px";
    const root = host.attachShadow({ mode: "open" });
    if (self.CoVu) self.CoVu.ngheNut(root, () => tuTach);
    const st = document.createElement("style"); st.textContent = CSS;
    root.appendChild(st);

    const box = document.createElement("div"); box.className = "box";
    root.appendChild(box);

    /* --- thanh tiêu đề --- */
    const top = document.createElement("div"); top.className = "top";
    // Logo của chính extension này, không phải một icon "phụ đề" chung chung:
    // cài cả mấy app cùng lúc thì trên một video có mấy bảng giống hệt nhau
    // xếp chồng, nhìn vào không biết cái nào của ai. Lấy đúng hình đang nằm
    // trên thanh công cụ Chrome thì khỏi phải đoán.
    //
    // Nhúng thẳng dạng base64 chứ không dùng chrome.runtime.getURL: đường ấy
    // đòi khai báo web_accessible_resources, tức là mở cho MỌI trang web đọc
    // được tệp trong extension, chỉ để lấy một cái hình 48px.
    const lg = document.createElement("img"); lg.className = "lg";
    lg.src = LOGO; lg.alt = ""; lg.width = 18; lg.height = 18;
    top.appendChild(lg);
    const nm = document.createElement("span"); nm.className = "nm";
    nm.textContent = T("NeutronDict · Lời thoại");
    top.appendChild(nm);
    const demCau = document.createElement("span"); demCau.className = "n";
    top.appendChild(demCau);

    // Đang lưu vào sổ nào — hỏi lúc bấm Lưu thì muộn rồi, phải thấy TRƯỚC.
    // Bấm vào là đổi ngay tại chỗ, khỏi mở popup hay sổ tay.
    const nutNgu = nutChip("", "", "");
    nutNgu.classList.add("ngu");
    top.appendChild(nutNgu);

    const nutNap = nutChip("arrows-clockwise", "", T("Nạp lại bảng"));
    top.appendChild(nutNap);
    const nutCo = nutChip("text-aa", "", T("Cỡ chữ — bấm để đổi"));
    top.appendChild(nutCo);
    /*
     * Cỡ KHUNG HÌNH — CHỈ hiện ở thẻ do app mở ra để học.
     *
     * Ô nhập bề ngang trong Cài đặt vẫn còn cho ai muốn con số chính xác, nhưng
     * "hình vẫn to quá" là thứ người ta nhận ra ĐÚNG LÚC đang xem — bắt mở sổ
     * tay, tìm mục Cài đặt, gõ số, bấm Lưu rồi quay lại thì không ai làm quá
     * một lần. Chip này để ngay cạnh cỡ chữ, cùng một nếp.
     *
     * Ở thẻ YouTube mở theo đường thường thì KHÔNG dựng nó: thu nhỏ không chạy
     * ở đó, nên một cái nút bấm vào chẳng thấy gì đổi chỉ làm người ta hoang
     * mang "nút này để làm gì".
     */
    const nutKhung = tuApp ? nutChip("", "", "") : null;
    if (nutKhung) { nutKhung.classList.add("khung"); top.appendChild(nutKhung); }
    const nutThu = nutChip("caret-up", "", T("Thu gọn"));
    top.appendChild(nutThu);
    const nutTat = nutChip("x", "", T("Đóng bảng"));
    top.appendChild(nutTat);
    box.appendChild(top);

    const veNutNgu = () => {
      nutNgu.textContent = "";
      const t = document.createElement("span");
      t.textContent = NGU === "ja" ? T("Nhật – Việt") : T("Anh – Việt");
      nutNgu.appendChild(t);
      nutNgu.title = T2("Đang lưu vào sổ tiếng {ngu} — bấm để đổi",
        { ngu: NGU === "ja" ? T("Nhật") : T("Anh") });
    };
    veNutNgu();
    S.veNutNgu = veNutNgu;
    /*
     * Các nấc đi từ TO xuống NHỎ, nên "bấm một cái là nhỏ thêm một nấc" chỉ là
     * lấy nấc đầu tiên nhỏ hơn cỡ hiện tại. Hết nấc thì vòng lại cỡ to nhất —
     * cùng một nút vừa thu vừa trả về như cũ, khỏi cần thêm nút phóng to.
     * Không dùng indexOf: cỡ đang dùng có thể là số người dùng tự gõ trong Cài
     * đặt (560 chẳng hạn), không nằm trong bảng nấc nào cả.
     */
    const veNutKhung = () => {
      if (!nutKhung) return;
      nutKhung.textContent = "";
      const t = document.createElement("span");
      t.textContent = thuNho ? String(thuNhoW) : T("Thu nhỏ hình");
      nutKhung.appendChild(t);
      nutKhung.title = T("Cỡ khung hình — bấm để thu nhỏ thêm");
    };
    veNutKhung();
    S.veNutKhung = veNutKhung;
    if (nutKhung) nutKhung.addEventListener("click", async () => {
      const { settings } = await self.Song.doc("settings");
      const st = settings || {};
      // Đang để nguyên (thẻ tự mở, không phải từ app): bấm lần đầu là BẬT cho
      // riêng thẻ này, giữ nguyên cỡ đang đặt. Bấm tiếp mới nhỏ dần.
      if (!thuNho) {
        batTay = true;
        datThuNho(st);
        veNutKhung();
        return;
      }
      const nho = CO_KHUNG.filter((x) => x < thuNhoW);
      const moi = nho.length ? nho[0] : CO_KHUNG[0];
      await self.Song.ghi({ settings: Object.assign({}, st, { ytNho: true, ytNhoW: moi }) });
      // Không tự đổi thuNhoW ở đây: onChanged gọi datThuNho, và chính nó vẽ lại.
    });

    nutNgu.addEventListener("click", async () => {
      const moi = NGU === "ja" ? "en" : "ja";
      const { settings } = await self.Song.doc("settings");
      await self.Song.ghi({ settings: Object.assign({}, settings || {}, { ngu: moi }) });
      // Không tự đổi NGU ở đây: onChanged sẽ lo, và chính nó dựng lại bảng.
    });

    /*
     * Nạp lại. Hai lần đầu chỉ dựng lại bảng — đủ cho trường hợp YouTube trả
     * phụ đề chậm hoặc vừa hết quảng cáo. Vẫn không ra thì lần thứ ba tải lại
     * hẳn trang, vì lúc đó thứ hỏng nằm ngoài tầm với của bảng này.
     */
    nutNap.addEventListener("click", () => {
      if (soLanNap >= 2) { soLanNap = 0; location.reload(); return; }
      soLanNap += 1;
      nutNap.title = T2("Nạp lại bảng (lần {n}/2 — lần nữa sẽ tải lại cả trang)", { n: soLanNap });
      xemLai(true);
    });

    // Đóng bảng cho video này. Sang video khác thì bảng hiện lại — đóng là để
    // dẹp chỗ lúc này, không phải tắt hẳn tính năng.
    nutTat.addEventListener("click", () => { tatCho = S.v; goBang(); dungTheoDoi(); });

    /* --- thanh công cụ --- */
    const bar = document.createElement("div"); bar.className = "bar";
    const chonBan = document.createElement("select");
    chonBan.title = T("Chọn bản phụ đề");
    const oTim = document.createElement("input");
    oTim.className = "find"; oTim.type = "search"; oTim.placeholder = T("Tìm…");
    oTim.title = T("Tìm trong lời thoại");
    const nutSong = nutChip("translate", T("Song ngữ"), T("Hiện kèm bản dịch tiếng Việt"));
    const nutBam = nutChip("crosshair-simple", T("Bám"), T("Tự cuộn theo dòng đang nói"));
    nutSong.classList.toggle("on", S.songNgu);   // giữ lựa chọn khi chuyển video
    bar.appendChild(chonBan); bar.appendChild(oTim); bar.appendChild(nutSong); bar.appendChild(nutBam);
    box.appendChild(bar);

    /* --- danh sách --- */
    const wrap = document.createElement("div"); wrap.className = "wrap";
    const list = document.createElement("div"); list.className = "list";
    const tip = document.createElement("div"); tip.className = "tip";
    const back = document.createElement("button"); back.className = "back"; back.type = "button";
    back.appendChild(ic("arrow-down", 13));
    const bt = document.createElement("span"); bt.textContent = T("Về dòng đang nói"); back.appendChild(bt);
    wrap.appendChild(list); wrap.appendChild(tip); wrap.appendChild(back);
    box.appendChild(wrap);

    donBangLac(host);
    noi.insertBefore(host, noi.firstChild);

    S.host = host; S.root = root; S.oList = list;

    /* --- hành vi --- */
    const apDungCo = () => {
      box.style.setProperty("--cx", CO_CHU[S.co] + "px");
      nutCo.title = T2("Cỡ chữ {px}px — bấm để đổi", { px: CO_CHU[S.co] });
      // Bảng đang bám theo video mà chữ giãn ra thì dòng đang nói trôi mất chỗ.
      if (S.bam) requestAnimationFrame(() => cuonToi(S.hien));
    };
    apDungCo();
    nutCo.addEventListener("click", () => {
      S.co = (S.co + 1) % CO_CHU.length;
      apDungCo();
      self.Song.ghi({ ytCoChu: S.co });   // nhớ không được thì thôi, Song tự nuốt
    });

    nutThu.addEventListener("click", () => {
      const thu = box.classList.toggle("hide");
      nutThu.innerHTML = "";
      nutThu.appendChild(ic(thu ? "caret-down" : "caret-up", 13));
      nutThu.title = thu ? T("Mở ra") : T("Thu gọn");
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
      sp.textContent = S.dich.get(i) || T("Đang dịch…");
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
  /* ================================================================== */
  /* Phơi lời thoại ra DOM thường — để trợ lý AI khác đọc được           */
  /* ================================================================== */
  /*
   * Bảng này nằm trong shadow DOM. Đo ra thì shadow DOM KHÔNG có trong
   * `document.body.innerText`, mà innerText chính là thứ các tiện ích trợ lý
   * (ChatGPT, Gemini for Chrome…) đọc khi chúng "xem trang này". Nghĩa là bảng
   * đang hiện rành rành trên màn hình nhưng với chúng thì vô hình — hỏi gì về
   * video cũng chịu.
   *
   * Nên đặt thêm một bản chữ ở DOM THƯỜNG. Ba điều phải giữ:
   *
   *   1. Mắt không được thấy. Nhưng `display:none`, `visibility:hidden` và
   *      thuộc tính `hidden` đều bị innerText bỏ qua — đo rồi, cả ba đều trượt.
   *      Chỉ lối "sr-only" (đẩy ra ngoài, cắt còn 1px) là vừa khuất mắt vừa còn
   *      trong innerText. Đây cũng đúng là lối mà trình đọc màn hình dùng.
   *   2. `aria-hidden` để trình đọc màn hình KHÔNG đọc nó lên — người khiếm thị
   *      đã nghe bảng chính rồi, nghe lại lần nữa là tra tấn.
   *   3. Gắn ở CUỐI body và có `data-` riêng, để trang chủ nhà không nhầm nó là
   *      nội dung của họ.
   */
  const MA_PHOI = "neutrondict-loi-thoai";
  let choPhoi = null;

  function goPhoi() {
    if (choPhoi) { choPhoi.remove(); choPhoi = null; }
    const cu = document.getElementById(MA_PHOI);
    if (cu) cu.remove();
  }

  function veKhoPhoi() {
    if (!phoiRa) { goPhoi(); return; }
    if (!S.cau.length) { goPhoi(); return; }
    let o = document.getElementById(MA_PHOI);
    if (!o) {
      o = document.createElement("div");
      o.id = MA_PHOI;
      o.setAttribute("data-ndict-phoi", "1");
      o.setAttribute("aria-hidden", "true");
      // Khuất mắt nhưng vẫn nằm trong innerText — xem chú thích ở trên.
      o.style.cssText = "position:absolute!important;left:-9999px!important;top:auto!important;" +
        "width:1px!important;height:1px!important;overflow:hidden!important;" +
        "clip:rect(0 0 0 0)!important;white-space:pre-wrap!important";
      document.body.appendChild(o);
      choPhoi = o;
    }
    const dong = [];
    dong.push("### Lời thoại video (NeutronDict)");
    if (S.tieuDe) dong.push("Tiêu đề: " + S.tieuDe);
    if (S.kenh) dong.push("Kênh: " + S.kenh);
    dong.push("Nguồn: https://www.youtube.com/watch?v=" + S.v);
    dong.push("");
    S.cau.forEach((c, i) => {
      const vi = S.dich.get(i);
      dong.push("[" + dem(c.t) + "] " + c.s + (vi && vi !== "—" ? "\n    → " + vi : ""));
    });
    o.textContent = dong.join("\n");
  }

  function veDanhSach() {
    veKhoPhoi();            // giữ bản cho trợ lý AI khớp với bảng đang hiện
    const list = S.oList;
    if (!list) return;
    // Vẽ lại là xoá sạch mọi ô sửa đang mở. Phải trả lại dấu "đang gõ" cho từng
    // ô một, không thì trang bên dưới cứ tưởng còn người đang gõ mãi và phím
    // tắt của nó chết luôn từ đó.
    if (self.Phim) list.querySelectorAll(".edbox").forEach(() => self.Phim.giuPhim(S.host, false));
    list.textContent = "";
    S.cau.forEach((c, i) => {
      const ln = document.createElement("div");
      ln.className = "ln";
      ln.dataset.i = String(i);
      ln.dataset.ts = dem(c.t);            // mốc giờ vẫn giữ, chỉ không chiếm chỗ nữa
      if (c.suaTay) ln.classList.add("dasua");
      ln.title = T2("Bấm để nghe lại từ {t}", { t: dem(c.t) });

      const tx = document.createElement("div"); tx.className = "tx";
      veManh(tx, c);
      if (S.songNgu) {
        const vi = document.createElement("span"); vi.className = "vi";
        vi.textContent = S.dich.has(i) ? S.dich.get(i) : "…";
        tx.appendChild(vi);
      }
      ln.appendChild(tx);

      /* Hai nút xếp CHỒNG chứ không nằm ngang: nằm ngang thì chúng ăn hết
         phần bề ngang của dòng chữ, mà bảng lời thoại vốn đã hẹp — chữ bị đẩy
         xuống dòng sớm, đọc theo tiếng không kịp. Xếp dọc thì cả cụm chỉ rộng
         bằng nút rộng nhất. */
      const nut = document.createElement("div"); nut.className = "acts";

      const sv = document.createElement("button");
      sv.className = "sv"; sv.type = "button"; sv.title = T("Lưu câu này vào sổ tay");
      sv.appendChild(ic("plus", 12));
      const svt = document.createElement("span"); svt.textContent = T("Lưu"); sv.appendChild(svt);
      sv.addEventListener("click", (e) => { e.stopPropagation(); luuCau(i, sv, svt); });
      nut.appendChild(sv);

      const ed = document.createElement("button");
      ed.className = "sv ed"; ed.type = "button";
      ed.title = c.suaTay ? T("Câu này bạn đã sửa — bấm để sửa tiếp hoặc lấy lại bản gốc")
                          : T("Câu này chép sai? Bấm để sửa lại");
      ed.appendChild(ic("pencil-simple", 12));
      const edt = document.createElement("span");
      edt.textContent = c.suaTay ? T("Đã sửa") : T("Sửa");
      ed.appendChild(edt);
      if (c.suaTay) ed.classList.add("done");
      ed.addEventListener("click", (e) => { e.stopPropagation(); moSua(i); });
      nut.appendChild(ed);

      // Đọc theo ngay tại dòng: nghe câu, đọc lại, nghe lại giọng mình. Ba nút
      // xếp NGANG trong cụm dọc — chúng chỉ có hình, không có chữ, nên một hàng
      // ngang vẫn hẹp hơn cái nút Lưu ở trên.
      if (self.GhiAm && self.GhiAm.hoTro() && S.v) nut.appendChild(cumGhiAm(c));

      ln.appendChild(nut);

      list.appendChild(ln);
    });
    S.uiDem.textContent = S.cau.length ? S.cau.length + " câu" : "";
    batQuanSat();
    danhDau(true);
  }

  /**
   * Cụm đọc theo cho một dòng lời thoại: Ghi · Nghe · Xoá.
   *
   * Đọc theo không phải việc làm một lần — nghe mẫu, đọc lại, nghe lại giọng
   * mình, thấy chỗ vấp rồi XOÁ ĐI ĐỌC LẠI cho tới lúc vừa ý. Nên cả ba việc đều
   * nằm ngay trên dòng, không chôn cái nào vào menu; "Ghi" khi đã có bản thu thì
   * đè thẳng lên bản cũ, đúng như người ta nghĩ khi bấm Ghi lại.
   *
   * Bản thu đánh mã theo VIDEO và MỐC GIÂY, giống hệt bản sửa lời thoại: đổi
   * sang bản phụ đề khác thì số dòng đổi hết, còn mốc giây thì vẫn là chỗ đó.
   */
  function cumGhiAm(c) {
    const cum = document.createElement("div");
    cum.className = "ghiam";
    cum.addEventListener("click", (e) => e.stopPropagation());   // đừng tua video khi bấm nút
    const ma = self.GhiAm.maDongYt(S.v, c.t);
    let dangThu = null;

    const nutNho = (ten, title, cls) => {
      const b = document.createElement("button");
      b.className = "sv ga" + (cls ? " " + cls : "");
      b.type = "button"; b.title = title;
      b.appendChild(ic(ten, 12));
      return b;
    };

    /**
     * Bắt đầu thu tại dòng này.
     *
     * Hai việc phải làm TRƯỚC khi micro bật, và cả hai đều vì cùng một lý do:
     * đừng để máy thu lại thứ không phải giọng người dùng. Video đang chạy thì
     * dừng lại — đọc theo mà tiếng mẫu vẫn vang thì bản thu lẫn hai giọng, mà
     * người đọc cũng bị chính tiếng ấy kéo đi. Bản thu đang phát cũng tắt nốt.
     */
    const batThu = async (nut) => {
      self.GhiAm.dungPhat();
      const v = video();
      if (v && !v.paused) { try { v.pause(); } catch (e) { /* trình phát chặn thì thôi */ } }
      try { dangThu = await self.GhiAm.batDau(); ve(); }
      catch (e) {
        // Bảng này chạy trong trang YouTube nên quyền micro là quyền của
        // YouTube — nói thẳng ra thay vì để cái nút bấm mãi không lên.
        //
        // Nhưng chỉ nói thế khi lỗi ĐÚNG LÀ chuyện quyền. Micro đang bị app
        // khác giữ, hay máy không có micro nào, mà cũng bảo người ta đi bấm ổ
        // khoá thì họ bấm mười lần vẫn hỏng và không hiểu tại sao.
        const x = self.GhiAm.loiMicro(e);
        const quyen = x.ten === "NotAllowedError" || x.ten === "PermissionDeniedError";
        if (nut) {
          nut.classList.add("hong");
          nut.title = (quyen
            ? T("YouTube chưa được cấp quyền micro. Bấm vào ổ khoá trên thanh địa chỉ để bật.")
            : T(x.loi)) + (x.ten ? " (" + x.ten + ")" : "");
        }
      }
    };

    const ve = async () => {
      cum.textContent = "";
      if (dangThu) {
        const b = nutNho("stop", T("Dừng ghi"), "dangthu");
        b.dataset.viec = "dung";
        b.addEventListener("click", async () => {
          const t = dangThu; dangThu = null;
          let xong = false;
          try { xong = await self.GhiAm.luu(ma, await t.dung()); } catch (e) { xong = false; }
          await ve();
          // Ghi hụt thì phải nói ra ngay trên dòng ấy. Bảng này không có chỗ
          // hiện thông báo, mà im lặng thì người ta tưởng đã thu xong.
          if (!xong) {
            const n = cum.querySelector('[data-viec="thu"]');
            if (n) { n.classList.add("hong"); n.title = T("Không lưu được bản thu — có lẽ máy đã hết chỗ."); }
          }
        });
        cum.appendChild(b);
        return;
      }
      const ban = await self.GhiAm.doc(ma);
      const thu = nutNho("microphone", ban ? T("Ghi lại — đè lên bản cũ") : T("Ghi giọng mình để đọc theo"));
      thu.dataset.viec = "thu";
      thu.addEventListener("click", () => batThu(thu));
      if (ban) {
        // Đang phát chính bản này thì nút đổi thành DỪNG — nhìn ra ngay là đang
        // chạy, và bấm lần nữa là dừng chứ không chồng thêm một giọng nữa.
        const dangNghe = self.GhiAm.maDangPhat() === ma;
        const nghe = nutNho(dangNghe ? "stop" : "play",
          dangNghe ? T("Dừng phát") : T("Nghe lại giọng mình"), dangNghe ? "dangphat" : "");
        nghe.addEventListener("click", async () => {
          if (self.GhiAm.maDangPhat() === ma) { self.GhiAm.dungPhat(); ve(); return; }
          // Lấy tiếng nói đúng lúc sắp phát — lúc vẽ chỉ có phần mô tả.
          const day = await self.GhiAm.docBan(ma);
          if (day) self.GhiAm.phat(ma, day, ve);
          ve();
        });
        cum.appendChild(nghe);
        cum.appendChild(thu);
        const bo = nutNho("trash", T("Xoá bản thu này"));
        bo.addEventListener("click", async () => { await self.GhiAm.xoa(ma); ve(); });
        cum.appendChild(bo);
      } else {
        cum.appendChild(thu);
      }
    };
    ve();
    return cum;
  }

  /**
   * Mở ô sửa ngay tại dòng đó.
   *
   * Sửa TẠI CHỖ chứ không mở hộp thoại: cái phải nhìn trong lúc gõ là mấy dòng
   * TRƯỚC và SAU nó — chép lời sai thì thường sai một cụm, và chỉ nhìn ngữ cảnh
   * mới đoán ra người ta nói gì.
   */
  function moSua(i) {
    const c = S.cau[i];
    const ln = S.oList && S.oList.querySelector('.ln[data-i="' + i + '"]');
    if (!c || !ln || ln.querySelector(".edbox")) return;

    S.bam = false;                         // đang gõ thì đừng để bảng tự cuộn đi

    const hop = document.createElement("div");
    hop.className = "edbox";
    hop.addEventListener("click", (e) => e.stopPropagation());

    /* Đầu ô nhắc lại đang sửa câu ở phút nào: cuộn một lúc rồi thì mấy ô sửa
       giống hệt nhau, không có mốc giờ là không biết mình đang ở đâu. */
    const dinh = document.createElement("div");
    dinh.className = "edtop";
    dinh.appendChild(ic("pencil-simple", 12));
    const mocGio = document.createElement("b"); mocGio.textContent = dem(c.t);
    dinh.appendChild(mocGio);
    const nhanDinh = document.createElement("span");
    nhanDinh.textContent = T("Sửa lại lời thoại");
    dinh.appendChild(nhanDinh);
    hop.appendChild(dinh);

    const o = document.createElement("textarea");
    o.className = "edta";
    o.value = c.s;
    o.rows = 1;
    hop.appendChild(o);

    /* Ô tự cao lên theo chữ. Để nguyên `rows` cố định thì câu dài phải cuộn
       trong một khung bé tí — sửa chép lời mà không nhìn được cả câu thì sửa
       chỗ này lại hỏng chỗ kia. */
    const vuaChu = () => {
      o.style.height = "auto";
      o.style.height = Math.min(320, o.scrollHeight) + "px";
    };
    o.addEventListener("input", vuaChu);

    const hang = document.createElement("div");
    hang.className = "edrow";

    const luu = document.createElement("button");
    luu.className = "sv pri"; luu.type = "button";
    luu.appendChild(ic("check", 13));
    luu.appendChild(document.createTextNode(T("Lưu")));

    const huy = document.createElement("button");
    huy.className = "sv"; huy.type = "button";
    huy.appendChild(document.createTextNode(T("Huỷ")));

    hang.appendChild(luu);
    hang.appendChild(huy);

    if (c.suaTay) {
      const goc = document.createElement("button");
      goc.className = "sv"; goc.type = "button";
      goc.appendChild(ic("arrow-counter-clockwise", 13));
      goc.appendChild(document.createTextNode(T("Bản gốc")));
      goc.title = T("Bỏ bản sửa của bạn, lấy lại đúng chữ YouTube chép");
      goc.addEventListener("click", () => xong(c.goc != null ? c.goc : c.s, true));
      hang.appendChild(goc);
    }

    const nhac = document.createElement("span");
    nhac.className = "edhint";
    nhac.textContent = T("Enter để lưu · Esc để huỷ");
    hang.appendChild(nhac);

    hop.appendChild(hang);
    ln.appendChild(hop);
    vuaChu();
    o.focus();
    o.setSelectionRange(o.value.length, o.value.length);
    /* Từ giờ tới lúc đóng ô, trang bên dưới phải hiểu là ĐANG CÓ NGƯỜI GÕ —
       không thì mỗi lần bấm Space giữa câu là video dừng lại. Xem phim.js. */
    if (self.Phim) self.Phim.giuPhim(S.host, true);

    let daDong = false;
    function dong() {
      if (daDong) return;
      daDong = true;
      if (self.Phim) self.Phim.giuPhim(S.host, false);
      hop.remove();
    }

    async function xong(chuMoi, veGoc) {
      const moi = String(chuMoi == null ? o.value : chuMoi).replace(/\s+/g, " ").trim();
      dong();
      if (!moi) return;                        // xoá trắng thì coi như không sửa
      const goc = c.goc != null ? c.goc : c.s;
      const k = khoaSua(c);

      if (veGoc || moi === goc) {
        delete S.sua[k];
        c.s = goc; c.suaTay = false;
        c.manh = c.manhGoc || c.manh;          // lấy lại nguyên bảng mốc của YouTube
        c.goc = null; c.manhGoc = null;
      } else {
        if (c.goc == null) { c.goc = c.s; c.manhGoc = c.manh; }
        S.sua[k] = moi;
        c.s = moi; c.suaTay = true;
        c.manh = tinhLaiManh(c);
      }
      // Bản dịch cũ là bản dịch của CÂU CŨ — giữ lại là hiện một câu tiếng Việt
      // chẳng ăn nhập gì với dòng tiếng Nhật ngay bên trên nó. Phải bỏ ở CẢ HAI
      // chỗ: trong phiên đang xem, và trong kho — không thì lần sau mở lại video
      // này, kho lại dọn ra đúng bản dịch cũ đã sai ấy.
      S.dich.delete(i);
      boDichTrongKho(S.v, maBanHienTai(), i);
      await ghiSua(S.v, S.sua);
      veDanhSach();
      if (S.songNgu) { hangCho.add(i); henGui(); }
    }

    luu.addEventListener("click", () => xong());
    huy.addEventListener("click", dong);
    o.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); dong(); }
      // Enter lưu, Shift+Enter xuống dòng — câu chép lời hiếm khi cần xuống dòng.
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); xong(); }
    });
    // Chặn nốt hai loại còn lại: có trang bắt phím tắt ở keypress/keyup chứ
    // không phải keydown, và Space là phím hay bị bắt nhất.
    o.addEventListener("keypress", (e) => e.stopPropagation());
    o.addEventListener("keyup", (e) => e.stopPropagation());
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
      const b = nutChip("arrows-clockwise", T("Thử lại"));
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
      // Quảng cáo dùng chung thẻ <video>, nên currentTime lúc này là giờ của
      // quảng cáo. Giữ nguyên vệt sáng ở chỗ cũ chứ đừng tin con số đó.
      if (dangQuangCao()) return;
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
    self.Song.gui({ type: "TRANSLATE_MANY", texts: texts, from: nguNguon(), to: "vi" }, (res) => {
      const ra = (res && res.ok) ? (res.texts || []) : [];
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
      veKhoPhoi();          // bản dịch vừa về -> bản cho trợ lý AI cũng phải có
      // Cất những dòng vừa dịch được. Lần sau mở lại video này là có sẵn, khỏi
      // nhờ Apps Script dịch lại — hạn mức để dành cho video mới.
      const caiMoi = {};
      ids.forEach((i) => { const t = S.dich.get(i); if (t && t !== "—") caiMoi[i] = t; });
      if (Object.keys(caiMoi).length) ghiKhoYt(S.v, maBanHienTai(), { dich: caiMoi });
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
      self.Song.gui({
        type: "SAVE_WORD",
        entry: { word: c.s, reading: "", means: nghia ? [nghia] : [], kind: "sent", src: nguon(i) },
        dict: nganLuu()
      }, () => {
        nut.classList.add("done"); nut.disabled = false;
        nut.textContent = ""; nut.appendChild(ic("check", 12));
        const t = document.createElement("span"); t.textContent = T("Đã lưu"); nut.appendChild(t);
      });
    };
    // Lưu kèm luôn bản dịch: một câu trần trụi nằm trong sổ tay thì đến lúc ôn
    // lại chẳng có gì để lật ra cả.
    if (S.dich.get(i)) { gui(S.dich.get(i)); return; }
    self.Song.gui({ type: "TRANSLATE", text: c.s, from: nguNguon(), to: "vi" }, (res) => {
      gui((!chrome.runtime.lastError && res && res.ok) ? res.text : "");
    });
  }

  /* ================================================================== */
  /* Vòng đời                                                            */
  /* ================================================================== */

  async function napCue() {
    const ban = S.ban[S.iBan];
    if (!ban) { trangThai(T("Video này không có phụ đề nào."), "subtitles-slash"); return; }
    S.dich.clear(); hangCho.clear();
    const maBan = maBanHienTai();

    /*
     * Xem lại video cũ: lấy thẳng từ kho, KHÔNG gọi mạng lần nào.
     *
     * Cất cả bản chép lời lẫn bản dịch nên lần này không phải xin YouTube, cũng
     * không phải nhờ Apps Script dịch lại — thứ tốn hạn mức nhất.
     */
    const daCo = await docKhoYt(S.v, maBan);
    if (daCo && daCo.cau && daCo.cau.length) {
      S.cau = daCo.cau;
      dapSua();
      if (daCo.dich) for (const i in daCo.dich) {
        const t = daCo.dich[i];
        if (t && t !== "—") S.dich.set(+i, t);
      }
      S.uiBan.disabled = false;
      S.uiBan.title = T("Chọn bản phụ đề");
      soLanNap = 0;
      veDanhSach();
      batTheoDoi();
      return;
    }

    trangThai(T("Đang tải lời thoại…"));
    try {
      const kq = await layCue(ban);
      S.cau = ghepCau(kq.cue);
      dapSua();                         // đắp bản sửa lên trước khi vẽ
      // Lấy qua bảng của YouTube thì bản phụ đề là do HỌ chọn, đổi ở ô này cũng
      // không có tác dụng — nói thẳng ra thay vì để bấm rồi thấy không đổi gì.
      S.uiBan.disabled = (kq.cach === "bang");
      S.uiBan.title = S.uiBan.disabled
        ? T("YouTube đang chặn đường tải phụ đề, phải đọc lại từ bảng của họ — đổi bản ở đây thì hãy đổi trong bảng đó")
        : T("Chọn bản phụ đề");
      if (!S.cau.length) { trangThai(T("Bản phụ đề này rỗng."), "warning-circle"); return; }
      soLanNap = 0;              // đã ra chữ -> lần bấm Nạp lại sau lại tính từ đầu
      veDanhSach();
      batTheoDoi();
      // Cất bản chép lời ngay: từ giờ mở lại video này là khỏi hỏi YouTube nữa.
      ghiKhoYt(S.v, maBan, { cau: S.cau, tieuDe: S.tieuDe, kenh: S.kenh });
    } catch (e) {
      trangThai((e && e.message) || T("Không tải được lời thoại."), "warning-circle", napCue);
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

  /** Gỡ nút mời (nếu có). Nút mời tách khỏi bảng chính nên phải dọn riêng. */
  function goMoiBat() { if (S.hostBat) { S.hostBat.remove(); S.hostBat = null; } }

  /**
   * Chế độ ĐỢI: thay vì lấy phụ đề và dịch ngay, chỉ hiện một nút mời. Bấm vào
   * mới chạy khoiDong — tức là mới tốn lượt gọi API. Nút nằm đúng chỗ bảng sẽ
   * hiện (cột phải, trên video gợi ý), mang cùng khung để nhìn liền mạch.
   */
  function moiBat(v) {
    goMoiBat(); goBang();
    const noi = choDat();
    if (!noi) return;
    choBat = v;
    const host = document.createElement("div");
    host.setAttribute("data-ndict-yt", "1");
    host.style.cssText = "all:initial;display:block;margin-bottom:16px";
    const root = host.attachShadow({ mode: "open" });
    if (self.CoVu) self.CoVu.ngheNut(root, () => tuTach);
    const stEl = document.createElement("style"); stEl.textContent = CSS; root.appendChild(stEl);
    const box = document.createElement("div"); box.className = "box"; root.appendChild(box);

    const top = document.createElement("div"); top.className = "top";
    const lg = document.createElement("img"); lg.className = "lg"; lg.src = LOGO; lg.alt = ""; lg.width = 18; lg.height = 18;
    top.appendChild(lg);
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = T("NeutronDict · Lời thoại");
    top.appendChild(nm);
    const spacer = document.createElement("span"); spacer.className = "n"; top.appendChild(spacer);
    const nutX = nutChip("x", "", T("Ẩn cho video này"));
    top.appendChild(nutX);
    box.appendChild(top);

    const body = document.createElement("div");
    body.style.cssText = "padding:16px;display:flex;flex-direction:column;gap:10px;align-items:flex-start";
    const nutBat = nutChip("subtitles", T("Hiện phụ đề & dịch"), "");
    nutBat.style.cssText = "padding:9px 15px;font-size:14px";
    const tip = document.createElement("div");
    tip.style.cssText = "font-size:12px;opacity:.66;line-height:1.5";
    tip.textContent = T("Để tiết kiệm, bảng chỉ lấy phụ đề và gọi dịch khi bạn bấm.");
    body.appendChild(nutBat); body.appendChild(tip);
    box.appendChild(body);

    donBangLac(host);
    noi.insertBefore(host, noi.firstChild);
    S.hostBat = host;

    nutBat.addEventListener("click", () => { choBat = ""; goMoiBat(); khoiDong(v); });
    nutX.addEventListener("click", () => { choBat = ""; tatCho = v; goMoiBat(); });
  }

  async function khoiDong(v) {
    await daDocCaiDat;      // đừng dựng bảng bằng thứ tiếng chưa biết là gì
    S.v = v; S.cau = []; S.hien = -1; S.dich.clear(); S.bam = true;
    S.sua = await docSua(v);            // bản chép lời bạn đã sửa cho video này
    if (!dungBang()) return false;
    trangThai(T("Đang tìm phụ đề…"));
    try {
      const d = await layBanPhuDe(v);
      if (S.v !== v) return true;                       // đã chuyển video khác
      S.tieuDe = d.tieuDe; S.kenh = d.kenh; S.ban = d.ban;
      if (!S.ban.length) {
        trangThai(T("Video này không có phụ đề — không có gì để đọc."), "subtitles-slash");
        S.uiBan.style.display = "none";
        return true;
      }
      // Ưu tiên bản người thật làm, và trong đó ưu tiên đúng thứ tiếng đang bật.
      const diem = (b) => (b.tuDong ? 0 : 2) + (b.ma === NGU ? 1 : 0);
      let best = 0;
      S.ban.forEach((b, i) => { if (diem(b) > diem(S.ban[best])) best = i; });
      S.iBan = best;
      S.uiBan.style.display = S.ban.length > 1 ? "" : "none";
      S.uiBan.innerHTML = "";
      S.ban.forEach((b, i) => {
        const o = document.createElement("option");
        o.value = String(i);
        o.textContent = b.ten + (b.tuDong ? T(" (tự động)") : "");
        S.uiBan.appendChild(o);
      });
      S.uiBan.value = String(S.iBan);
      await napCue();
    } catch (e) {
      trangThai((e && e.message) || T("Không lấy được phụ đề."), "warning-circle");
    }
    return true;
  }

  self.Song.doc("ytCoChu").then((r) => {
    if (r && typeof r.ytCoChu === "number" && CO_CHU[r.ytCoChu]) S.co = r.ytCoChu;
  });   // đọc được thì tốt, không thì dùng cỡ mặc định

  function maVideo() {
    if (location.pathname !== "/watch") return "";
    return new URLSearchParams(location.search).get("v") || "";
  }

  let dangCho = null;
  /** @param {boolean} [ep] dựng lại kể cả khi vẫn đúng video đó (đổi ngôn ngữ). */
  function xemLai(ep) {
    const v = maVideo();
    if (ep) tatCho = "";              // tự bấm Nạp lại thì tất nhiên là muốn bảng hiện lại
    if (v && v === tatCho) return;    // video này bạn đã đóng bảng
    if (!v) { dungTheoDoi(); goBang(); goMoiBat(); choBat = ""; S.v = ""; return; }
    goMoiBat(); if (v !== choBat) choBat = "";
    mocCho = Date.now();          // video mới thì cột phải cũng dựng lại từ đầu
    if (!ep && v === S.v && S.host && S.host.isConnected) return;
    if (ep) S.v = "";
    dungTheoDoi();
    // Cột phải của YouTube dựng sau khi trang đã "xong", nên thử lại vài nhịp.
    clearInterval(dangCho);
    let lan = 0;
    const thu = async () => {
      if (maVideo() !== v) { clearInterval(dangCho); return; }
      // Chờ hết quảng cáo. Trong lúc quảng cáo chạy, trình phát trả về dữ liệu
      // của quảng cáo — không có phụ đề — nên dựng bảng lúc này là chắc chắn
      // trượt hết mọi đường, rồi rơi xuống đường đọc DOM và vớ nhầm thứ khác.
      // Đây chính là lý do vào video có quảng cáo thì phải F5 mới ra bảng đúng.
      if (dangQuangCao() && lan < 240) { lan++; return; }
      if (choDat()) {
        clearInterval(dangCho);
        // Phải ĐỢI đọc xong cài đặt rồi mới quyết: `tuBat` mặc định là false,
        // mà lượt đọc cài đặt là bất đồng bộ — quyết sớm thì video nào cũng rơi
        // vào nhánh "đợi" kể cả khi người dùng đã bật tự-động. (khoiDong tự đợi
        // daDocCaiDat, nhưng quyết định RẼ NHÁNH này thì ở ngoài nó.)
        await daDocCaiDat;
        if (maVideo() !== v) return;
        /*
         * Chế độ "đợi bấm" sinh ra để TIẾT KIỆM: mỗi lần mở bảng cho một video
         * mới là một lượt xin phụ đề của YouTube và một loạt lượt dịch qua Apps
         * Script, mà hạn mức Apps Script thì có giới hạn tháng.
         *
         * Nhưng video ĐÃ XEM RỒI thì phụ đề lẫn bản dịch nằm sẵn trong máy —
         * mở bảng lúc đó không tốn một lượt gọi nào. Bắt bấm thêm một nút để
         * đọc lại thứ đã có trong máy là bắt trả giá cho một việc miễn phí.
         *
         * Nên: có sẵn thì mở luôn, chưa có thì vẫn hỏi.
         */
        if (tuBat || await coTrongKho(v)) await khoiDong(v);
        else moiBat(v);
        return;
      }
      if (++lan > 240) clearInterval(dangCho);
    };
    dangCho = setInterval(thu, 500);
    thu();
  }

  /** Bảng đang nằm sai chỗ được mấy nhịp liên tiếp rồi. Xem ganLaiBang. */
  let lechCho = 0;

  /**
   * Bảng bị YouTube cuốn khỏi trang thì GẮN LẠI ĐÚNG NÓ, đừng dựng cái mới.
   *
   * Trước đây thấy bảng mất là gọi khoiDong dựng lại từ đầu. Mà YouTube vẽ lại
   * cột phải khá thường xuyên, nên mỗi lần như thế người dùng thấy bảng biến
   * mất rồi hiện lại — đúng cái "lúc hiện lúc không". Dựng lại còn xoá chỗ đang
   * đọc, xoá vệt sáng đang bám câu, và trong khoảnh khắc giao nhau có thể thấy
   * hai bảng. Cái bảng cũ vẫn còn nguyên trong tay, kể cả khi đã rời khỏi
   * trang: gắn lại là xong, không mất gì.
   *
   * Chỉ dựng mới khi thật sự CHƯA có bảng nào.
   */
  function ganLaiBang() {
    const noi = choDat();
    if (!noi) return;
    if (!S.host) { khoiDong(S.v); return; }
    if (!S.host.isConnected) { noi.insertBefore(S.host, noi.firstChild); lechCho = 0; return; }
    /*
     * Còn trong trang nhưng SAI CỘT: xảy ra khi lúc dựng bố cục chưa xong, đo
     * ra một đằng rồi YouTube xếp lại một nẻo. Đợi ba nhịp mới dời, để một lần
     * đo lệch thoáng qua (quảng cáo, đang đổi cỡ cửa sổ) không làm bảng nhảy
     * qua nhảy lại.
     */
    if (S.host.parentElement === noi) { lechCho = 0; return; }
    if (++lechCho < 3) return;
    noi.insertBefore(S.host, noi.firstChild);
    lechCho = 0;
  }

  // YouTube là ứng dụng một trang: chuyển video không tải lại trang.
  document.addEventListener("yt-navigate-finish", () => xemLai());
  let urlCu = location.href;
  const vongCanh = setInterval(() => {
    // Trình phát ghi lại kích thước nội tuyến mỗi lần bố cục đổi (đổi video,
    // vào/ra chế độ rạp, xoay màn hình). Nên phải canh lại chứ không chỉ đặt
    // một lần lúc mở trang.
    if (thuNho) { canhToNho(); epBeNgang(); }
    if (location.href !== urlCu) { urlCu = location.href; xemLai(); return; }
    // YouTube dựng lại cột phải khá tuỳ hứng — đổi video, hết quảng cáo, đổi cỡ
    // cửa sổ — và cuốn theo cả bảng này.
    if (S.v && S.v !== tatCho) ganLaiBang();
    // Chế độ đợi: nút mời cũng bị YouTube cuốn mất như bảng — dựng lại cho video
    // đang chờ, miễn là chưa mở bảng và chưa bị đóng.
    if (!tuBat && choBat && choBat === maVideo() && !S.host && choBat !== tatCho) {
      const noi = choDat();
      // Nút mời cũng bị YouTube cuốn mất như bảng, và cũng có thể bị đặt nhầm
      // chỗ lúc cột phải chưa dựng xong. Gắn lại / dời đúng như với bảng.
      if (noi) {
        if (!S.hostBat) moiBat(choBat);
        else if (!S.hostBat.isConnected) noi.insertBefore(S.hostBat, noi.firstChild);
        else if (S.hostBat.parentElement !== noi) noi.insertBefore(S.hostBat, noi.firstChild);
      }
    }
  }, 700);

  /*
   * Extension bị nạp lại hoặc gỡ đi thì bản content script NÀY vẫn nằm nguyên
   * trong trang, chỉ mất đường về nền. Nó không được báo, không tự dừng — mà
   * bảng này lại chạy hẹn giờ 150ms, một vòng canh 700ms và một hàng đợi dịch,
   * nên nó bắn "Extension context invalidated" hàng chục lần một phút, mãi mãi.
   *
   * Nên khi Song phát hiện đường đã đứt: dừng hết, gỡ bảng, và im. Không bày
   * lỗi ra — người dùng chẳng làm gì sai, và tải lại trang là mọi thứ trở lại.
   */
  self.Song.khiChet(() => {
    goMoiBat();
    clearInterval(vongCanh);
    clearInterval(dangCho);
    clearTimeout(henDich);
    dungTheoDoi();
    goBang();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => xemLai());
  else xemLai();

  /**
   * Phím R: thu giọng ngay tại câu đang nói.
   *
   * Đọc theo thì hai tay đang bận và mắt đang bám chữ — với tới con chuột, tìm
   * đúng dòng rồi bấm cái nút bé tí là đã lỡ mất câu. Một phím là xong: R bật
   * micro và dừng video, R lần nữa là thu xong.
   *
   * Không được cướp phím của người đang GÕ. Ba lớp chặn, và cả ba đều rẻ:
   *   - có phím bổ trợ (Ctrl/Alt/Shift/Cmd) thì bỏ qua — đó là phím tắt khác;
   *   - đang gõ ở bất cứ ô nhập nào trên trang thì bỏ qua. Ô sửa lời thoại và ô
   *     sửa trong popup đều được đánh dấu contenteditable trong lúc gõ (xem
   *     phim.js), nên `document.activeElement.isContentEditable` bắt được cả
   *     hai — đúng chỗ người dùng sợ xung đột nhất;
   *   - chưa có bảng thì thôi.
   */
  function dangGoODau() {
    const a = document.activeElement;
    if (!a) return false;
    const t = (a.tagName || "").toUpperCase();
    return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || !!a.isContentEditable;
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if ((e.key || "").toLowerCase() !== "r") return;
    if (dangGoODau()) return;
    if (!S.root || !S.host || !S.host.isConnected) return;
    if (!self.GhiAm || !self.GhiAm.hoTro()) return;

    // Câu đang nói; chưa chạy tới đâu thì lấy câu đầu.
    const i = S.hien >= 0 ? S.hien : 0;
    const ln = S.root.querySelector('.ln[data-i="' + i + '"]');
    const nut = ln && ln.querySelector('.ghiam [data-viec="dung"], .ghiam [data-viec="thu"]');
    if (!nut) return;
    e.preventDefault();
    e.stopPropagation();
    nut.click();
    // Kéo dòng ấy vào tầm mắt: bấm R rồi mà không thấy dòng nào sáng lên thì
    // không biết mình đang thu cho câu nào.
    try { ln.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (er) { /* trình duyệt cũ */ }
  }, true);

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
