/**
 * Thuật ngữ chuyên ngành — bộ tra ƯU TIÊN trước Google Dịch.
 *
 * Google dịch câu dài có đủ ngữ cảnh khá tốt, nhưng từ kỹ thuật đứng một mình
 * thì hay dịch vớ vẩn (sag → "chùng xuống" thay vì "độ võng"). Gói thuật ngữ do
 * người dùng cung cấp sửa đúng chỗ đó — và CHỈ chỗ đó:
 *
 *   - tra TỪ / CỤM: nghĩa của gói đứng trước, nghĩa của Google nối sau;
 *   - từ CHUNG (toàn hiragana, một chữ, hoặc từ Anh đa nghĩa như "work", "line"):
 *     Google đứng trước, gói chỉ bổ sung — kẻo "あう" hay "work" bị kéo về nghĩa
 *     ngành điện khi người ta đang đọc một bài báo bình thường;
 *   - dịch ĐOẠN DÀI: không đụng vào — câu dài đủ ngữ cảnh thì Google dịch khá tốt.
 *
 * Kết quả hiện như một nghĩa bình thường, không dán nhãn nguồn.
 *
 * Nhiều gói cùng lúc (điện, IT, y…): mỗi gói có `id`. Một từ khớp ở nhiều gói thì
 * nghĩa của các gói được GỘP (bus → "thanh cái; bus (máy tính)") chứ không gói nào
 * nuốt gói nào. Gói đánh dấu `sau:true` (dữ liệu chưa có người duyệt, hoặc ngành mà
 * nghĩa sai có hại như y khoa) luôn đứng SAU Google, như từ chung.
 *
 * Dùng chung một tệp cho extension và Android. Dữ liệu nạp từ ngoài (goi/*.json):
 *   { id, ten, ngu, sau?, m: [[từ, cách đọc, [nghĩa…], cờ, [dạng viết khác…], môn], …] }
 * Cờ bit 1 = từ chung. Bit 2 = đã biên tập lại.
 */
(function (goc) {
  "use strict";

  /** ngu -> Map<id gói, { id, ten, sau, khoa: Map<khoá, mục> }> (theo thứ tự nạp) */
  const goi = {};

  const MAX_NGHIA = 8;

  function chuan(s, ngu) {
    let t = String(s || "").normalize("NFKC").trim();
    if (ngu === "en") t = t.toLowerCase().replace(/[-_‐-―]/g, " ").replace(/\s+/g, " ");
    return t;
  }

  /** Bỏ dấu câu / ngoặc bao quanh vùng chọn. */
  function lotVien(t) {
    return t.replace(/^[\s"'“”‘’「」『』()（）\[\]【】.,;:!?。、]+|[\s"'“”‘’「」『』()（）\[\]【】.,;:!?。、]+$/g, "");
  }

  /** Nạp một gói. Gọi lại với cùng `ngu` + `id` thì thay hẳn gói đó. */
  function nap(ngu, du) {
    const khoa = new Map();
    const dat = (k, muc) => {
      if (!k) return;
      const cu = khoa.get(k);
      // trùng khoá (hai từ cùng cách đọc): để mục chuyên ngành thắng mục từ chung
      if (cu && !(cu[3] & 1)) return;
      khoa.set(k, muc);
    };
    const ds = (du && du.m) || [];
    for (let i = 0; i < ds.length; i++) {
      const m = ds[i];
      dat(chuan(m[0], ngu), m);
      const khac = m[4] || [];
      for (let j = 0; j < khac.length; j++) dat(chuan(khac[j], ngu), m);
      if (ngu === "ja" && m[1] && !(m[3] & 1)) {
        // cách đọc cũng là khoá, để gõ/bôi kana ra đúng thuật ngữ — trừ từ chung
        // (cách đọc của chúng trùng lắm từ khác).
        const dd = m[1].split(" / ");
        for (let j = 0; j < dd.length; j++) { const k = chuan(dd[j], ngu); if (k.length >= 3) dat(k, m); }
      }
    }
    const id = (du && du.id) || "dien";
    if (!goi[ngu]) goi[ngu] = new Map();
    goi[ngu].set(id, { id: id, ten: (du && du.ten) || "", sau: !!(du && du.sau), khoa: khoa });
  }

  function coSan(ngu) { return !!goi[ngu] && goi[ngu].size > 0; }
  function go(ngu, id) { if (id && goi[ngu]) goi[ngu].delete(id); else delete goi[ngu]; }

  /** Các dạng của `q` đáng thử, từ sát nghĩa nhất tới lỏng nhất. */
  function dang(q, ngu) {
    const ds = [q];
    if (ngu === "ja") {
      // "励磁電流が" / "変圧器の" — trợ từ dính theo vùng chọn. Cắt dần tối đa 3 chữ
      // hiragana ở đuôi, nhưng phải còn lại ít nhất một chữ không phải hiragana.
      let t = q;
      for (let i = 0; i < 3; i++) {
        if (!/[ぁ-ん]$/.test(t)) break;
        t = t.slice(0, -1);
        if (t.length < 2 || !/[^ぁ-んー]/.test(t)) break;
        ds.push(t);
      }
    } else {
      const t = q.replace(/^(a|an|the) /, "");
      if (t !== q) ds.push(t);
      const u = ds[ds.length - 1];
      if (/ies$/.test(u)) ds.push(u.replace(/ies$/, "y"));
      else if (/(ch|sh|x|s|z)es$/.test(u)) ds.push(u.replace(/es$/, ""));
      else if (/s$/.test(u) && !/ss$/.test(u)) ds.push(u.slice(0, -1));
    }
    return ds;
  }

  /**
   * Tra MỘT từ / cụm trong các gói đang bật.
   *
   * @param {string[]} [bat] id các gói được dùng; bỏ trống = tất cả
   * @returns {{muc:Array, khop:string}|null} `muc` có cùng dạng một mục của gói, nhưng
   *   nghĩa đã gộp từ mọi gói khớp; cờ "chung" chỉ bật khi MỌI gói khớp đều coi nó là
   *   từ chung (hoặc là gói `sau`). `khop` = chữ đã khớp.
   */
  function tra(text, ngu, bat) {
    const g = goi[ngu];
    if (!g || !g.size) return null;
    const q = lotVien(chuan(text, ngu));
    if (!q) return null;
    const ds = dang(q, ngu);
    let tu = "", doc = "", khop = "", chung = true, co = 0;
    const nghia = [];
    for (const p of g.values()) {
      if (bat && bat.indexOf(p.id) < 0) continue;
      let m = null, k = "";
      for (let i = 0; i < ds.length && !m; i++) { m = p.khoa.get(ds[i]); k = ds[i]; }
      if (!m) continue;
      if (!co++) { tu = m[0]; khop = k; }
      if (!doc && m[1]) doc = m[1];
      if (!p.sau && !(m[3] & 1)) chung = false;
      for (const x of m[2]) if (!nghia.some((y) => bo(y) === bo(x))) nghia.push(x);
    }
    return co ? { muc: [tu, doc, nghia, chung ? 1 : 0, [], 0], khop: khop } : null;
  }

  const bo = (s) => String(s || "").toLowerCase().replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();

  /**
   * Trộn nghĩa của gói vào kết quả tra của Google.
   *
   * KHÔNG sửa các đối tượng trong `entries`: chúng nằm trong bộ đệm của nền, sửa
   * tại chỗ là lần sau tắt gói đi mà nghĩa của gói vẫn còn dính trong đệm.
   *
   * @param {Array}  entries kết quả tra (có thể rỗng)
   * @param {string} text    chữ người dùng bôi đen / gõ
   * @param {string} ngu     "ja" | "en"
   * @param {string[]} [bat] id các gói được dùng; bỏ trống = tất cả
   * @returns {Array} mục mới (nghĩa của gói đã trộn vào `means` của mục đầu)
   */
  function tron(entries, text, ngu, bat) {
    const h = tra(text, ngu, bat);
    if (!h) return entries;
    const m = h.muc, chung = !!(m[3] & 1);
    const dbNghia = m[2].slice();
    const e0 = entries && entries[0];
    let words = [];
    const them = (ds) => {
      for (const x of ds) {
        const k = bo(x);
        if (!k || words.some((y) => bo(y) === k)) continue;
        words.push(x);
      }
    };
    if (chung) { them((e0 && e0.means) || []); them(dbNghia); }
    else { them(dbNghia); them((e0 && e0.means) || []); }
    if (words.length > MAX_NGHIA) words = words.slice(0, MAX_NGHIA);

    // Cách đọc: chỉ thay khi Google không có, hoặc chỉ có bản SUY từ romaji.
    let reading = e0 ? e0.reading : "";
    let docSuy = e0 ? e0.docSuy : 0;
    if (ngu === "ja" && m[1] && (!reading || docSuy)) { reading = m[1]; docSuy = 0; }

    const moi = Object.assign({}, e0 || {}, {
      word: e0 ? e0.word : (ngu === "ja" ? m[0] : String(text || "").trim()),
      reading: reading || "",
      means: words,
      dict: e0 ? e0.dict : (ngu === "ja" ? "javi" : "envi")
    });
    if (docSuy) moi.docSuy = docSuy; else delete moi.docSuy;
    return [moi].concat((entries || []).slice(1));
  }

  goc.ThuatNgu = { nap: nap, go: go, coSan: coSan, tra: tra, tron: tron };
})(typeof self !== "undefined" ? self : this);
