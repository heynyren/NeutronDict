/**
 * Luyện ngữ pháp: lấy câu gốc có chứa từ đã lưu rồi cắt thành 2–4 mảnh.
 * Thuần dữ liệu; không đọc/ghi SRS hay kho lưu trữ.
 */
(function (goc) {
  "use strict";

  const CO_CHU_NHAT = /[\u3040-\u30ff\u3400-\u9fff]/u;

  function chuan(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function layCau(it) {
    if (!it || it.del) return "";
    const tu = chuan(it.word);
    if (!tu) return "";
    const src = it.src || {};
    let tuNguon = null;
    try { if (goc.CauNghe) tuNguon = goc.CauNghe.tuNguon(src, tu); } catch (e) { /* dữ liệu nguồn cũ có thể sai */ }
    const co = [
      it.cauNghe && it.cauNghe.cau,
      src.cau,
      it.kind === "sent" ? it.word : "",
      tuNguon && tuNguon.cau
    ];
    for (const raw of co) {
      const cau = chuan(raw);
      if (cau.length >= 10 && cau.length <= 180 && cau.includes(tu) && CO_CHU_NHAT.test(cau)) return cau;
    }
    return "";
  }

  /** Cắt tại ranh giới từ của tiếng Nhật; dấu câu ở lại với mảnh phía trước. */
  function catCau(cau) {
    const s = chuan(cau);
    if (!s || !goc.Intl || !goc.Intl.Segmenter) return null;
    const words = [...new goc.Intl.Segmenter("ja", { granularity: "word" }).segment(s)]
      .filter((x) => x.isWordLike);
    // Mỗi mảnh có ít nhất hai đơn vị từ; câu quá ngắn không làm bài xếp mảnh.
    const so = Math.min(4, Math.floor(words.length / 2));
    if (so < 2) return null;
    const moc = [0];
    for (let i = 1; i < so; i++) moc.push(words[Math.floor(i * words.length / so)].index);
    moc.push(s.length);
    const manh = [];
    for (let i = 0; i < so; i++) {
      const p = s.slice(moc[i], moc[i + 1]);
      if (p.trim().length < 2) return null;
      manh.push({ id: i, text: p });
    }
    if (manh.map((x) => x.text).join("") !== s) return null;
    return manh;
  }

  function xaoTron(manh, random) {
    const ra = manh.slice();
    const ngauNhien = typeof random === "function" ? random : Math.random;
    for (let i = ra.length - 1; i > 0; i--) {
      const j = Math.floor(ngauNhien() * (i + 1));
      [ra[i], ra[j]] = [ra[j], ra[i]];
    }
    if (ra.every((x, i) => x.id === i)) [ra[0], ra[ra.length - 1]] = [ra[ra.length - 1], ra[0]];
    // Hai mảnh giống hệt nhau có thể khiến thứ tự id đổi nhưng câu vẫn y nguyên.
    if (ra.map((x) => x.text).join("") === manh.map((x) => x.text).join("")) return null;
    return ra;
  }

  /**
   * Mục video cũ chỉ có mã video và mốc giây. Nếu bản chép lời còn trong
   * cache cục bộ, tìm lại câu chứa từ để có bài tập mà không sửa dữ liệu SRS.
   */
  function boSungTuKho(items, kho) {
    const nhom = new Map();
    for (const [key, ban] of Object.entries(kho || {})) {
      const v = key.split("|")[0];
      if (!v || !ban || !Array.isArray(ban.cau)) continue;
      if (!nhom.has(v)) nhom.set(v, []);
      nhom.get(v).push(...ban.cau.map((c, i) => Object.assign({}, c, { cauDich: (ban.dich || {})[i] || "" })));
    }
    return (items || []).map((it) => {
      const src = it && it.src;
      const yt = src && src.yt;
      if (!src || src.cau || !yt || !yt.v || !it.word) return it;
      const t = Number(yt.t);
      if (!Number.isFinite(t)) return it;
      let best = null, cach = Infinity;
      for (const c of (nhom.get(yt.v) || [])) {
        const dau = Number(c.t), cuoi = Number(c.tEnd);
        if (!Number.isFinite(dau) || !c.s || !c.s.includes(it.word)) continue;
        const trong = t >= dau - 1 && t <= (Number.isFinite(cuoi) ? cuoi : dau + 6) + 1;
        if (!trong) continue;
        const d = Math.abs(t - dau);
        if (d < cach) { best = c; cach = d; }
      }
      return best ? Object.assign({}, it, { src: Object.assign({}, src, { cau: best.s, cauDich: best.cauDich }) }) : it;
    });
  }

  function taoBai(it, random) {
    const cau = layCau(it);
    if (!cau) return null;
    const manh = catCau(cau);
    if (!manh) return null;
    const xao = xaoTron(manh, random);
    if (!xao) return null;
    return {
      key: it.key || "",
      tu: chuan(it.word),
      cau: cau,
      manh: manh,
      xao: xao,
      nghia: chuan(
        (it.cauNghe && chuan(it.cauNghe.cau) === cau && it.cauNghe.dich) ||
        (it.src && chuan(it.src.cau) === cau && it.src.cauDich) ||
        (it.kind === "sent" && chuan(it.word) === cau && Array.isArray(it.means) && it.means[0]) || ""
      )
    };
  }

  function danhSach(items, random) {
    const seen = new Set(), ra = [];
    for (const it of (items || [])) {
      const bai = taoBai(it, random);
      if (!bai || seen.has(bai.cau)) continue;
      seen.add(bai.cau);
      ra.push(bai);
    }
    const ngauNhien = typeof random === "function" ? random : Math.random;
    for (let i = ra.length - 1; i > 0; i--) {
      const j = Math.floor(ngauNhien() * (i + 1));
      [ra[i], ra[j]] = [ra[j], ra[i]];
    }
    return ra;
  }

  goc.NguPhap = { layCau, catCau, xaoTron, boSungTuKho, taoBai, danhSach };
})(typeof self !== "undefined" ? self : this);
