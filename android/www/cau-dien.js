/**
 * BÀI ĐIỀN KHUYẾT — dựng đề từ câu ngữ cảnh đã lưu của một từ.
 * ===========================================================================
 *
 * Câu nguồn của từ (`cauNghe.cau`) bị ĐỤC LỖ ở chỗ từ đang học; lời hỏi là BẢN
 * DỊCH tiếng Việt của câu (`cauNghe.dich`); đáp án là TỪ GỐC (`word`, dạng từ
 * điển) nằm lẫn với vài từ nhiễu lấy từ chính sổ tay của người học.
 *
 * Vì sao thay bài đồng/trái nghĩa bằng bài này
 * --------------------------------------------
 * Bài đồng nghĩa dựa vào một bộ từ điển liên kết mà tiếng Nhật không có nguồn tốt:
 * từ đưa ra không sát nghĩa nên đề vừa sai vừa khó. Bài điền khuyết thì mọi thứ
 * cần đã nằm trong sổ: câu có từ, bản dịch của câu, và các từ khác của chính người
 * học làm nhiễu. Đề cũng đo đúng việc cần — nhận ra từ khi gặp nó trong câu, và
 * chọn đúng giữa mấy từ trông na ná — thay vì một phép đo gián tiếp qua từ khác.
 *
 * Từ nhiễu
 * --------
 * Chọn những từ GIỐNG HÌNH THỨC với đáp án (cùng loại chữ — Hán/kana/Latin —, cùng
 * độ dài ±1, cùng chữ cuối như đuôi い/る) để người học phải nhìn kỹ chứ không loại
 * trừ bằng cách liếc độ dài. Không chọn từ có mặt trong chính câu (lộ đáp án), và
 * không chọn từ trùng nghĩa đầu tiên với đáp án (đề sẽ có hai đáp án đúng). Sổ quá
 * ít từ thì bù bằng bảng từ thông dụng bên dưới, nên đề luôn dựng được.
 */
(function (goc) {
  "use strict";

  const SO_NHIEU = 3;
  const LO = "＿＿＿";

  const THONG_DUNG = {
    ja: ["今日", "明日", "学校", "先生", "友達", "時間", "仕事", "食べる", "行く", "見る", "聞く", "大きい",
      "小さい", "新しい", "高い", "安い", "元気", "勉強", "会社", "電車", "天気", "彼女", "毎日", "旅行",
      "料理", "病院", "買い物", "約束", "意見", "経験", "必要", "問題", "世界", "自然", "文化", "社会"],
    en: ["house", "water", "never", "answer", "simple", "bridge", "garden", "family", "market", "window",
      "travel", "forget", "listen", "remain", "choose", "reason", "change", "common", "future", "safety",
      "number", "season", "moment", "person", "public", "second", "street", "winter", "yellow", "animal"]
  };

  /** "Hình dạng" chữ: Hán=K, hiragana=H, katakana=A, Latin=L, khác=X; gộp chữ liền nhau. */
  function dang(w) {
    let r = "", cuoi = "";
    for (const ch of String(w)) {
      const c = /[一-鿿々]/.test(ch) ? "K" : /[぀-ゟ]/.test(ch) ? "H" :
        /[゠-ヿ]/.test(ch) ? "A" : /[A-Za-z]/.test(ch) ? "L" : "X";
      if (c !== cuoi) { r += c; cuoi = c; }
    }
    return r;
  }
  /** Độ giống hình thức của hai từ: càng cao càng đáng làm nhiễu. */
  function diemGiong(a, b) {
    const la = [...a].length, lb = [...b].length;
    let d = 0;
    if (dang(a) === dang(b)) d += 3;
    if (la === lb) d += 2; else if (Math.abs(la - lb) === 1) d += 1;
    if ([...a].pop() === [...b].pop()) d += 2;
    if ([...a][0] === [...b][0]) d += 1;
    return d;
  }
  const nghiaDau = (x) => String((x.means && x.means[0]) || "").toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, "").trim();

  /**
   * @param {object} it  mục sổ tay đang hỏi (đã qua Srs.mauKhuyet, tức có câu + dịch)
   * @param {object[]} ds  cả sổ tay (hoặc phần của ngôn ngữ đang học) để lấy từ nhiễu
   * @param {()=>number} [ngauNhien]
   * @returns {{cau:string,dich:string,mat:string,doan:string[],o:string[],dung:string}|null}
   *   `doan` là câu cắt thành các đoạn quanh chỗ trống (số đoạn = số chỗ trống + 1)
   */
  function dungDe(it, ds, ngauNhien) {
    const mau = goc.Srs && goc.Srs.mauKhuyet(it);
    if (!mau) return null;
    const rd = typeof ngauNhien === "function" ? ngauNhien : Math.random;
    const dung = String(it.word);
    const trongCau = (w) => mau.cau.toLowerCase().includes(String(w).toLowerCase());
    const nghiaDung = nghiaDau(it);
    const thay = new Set([dung.toLowerCase(), mau.mat.toLowerCase()]);
    const ung = [];
    for (const x of ds || []) {
      if (!x || x.del || !x.word || x.key === it.key) continue;
      const w = String(x.word).trim();
      if (!w || thay.has(w.toLowerCase()) || trongCau(w)) continue;
      if (x.dict && it.dict && x.dict !== it.dict) continue;
      if (nghiaDung && nghiaDau(x) === nghiaDung) continue;
      thay.add(w.toLowerCase());
      ung.push({ w: w, d: diemGiong(dung, w) + rd() * 0.9 });
    }
    ung.sort((a, b) => b.d - a.d);
    const nhieu = ung.slice(0, SO_NHIEU).map((x) => x.w);
    // Sổ ít từ quá: bù bằng bảng thông dụng, vẫn tránh từ có trong câu và từ đã chọn.
    if (nhieu.length < SO_NHIEU) {
      const bang = (THONG_DUNG[/[A-Za-z]/.test(dung) && !/[぀-ヿ一-鿿]/.test(dung) ? "en" : "ja"]).slice();
      for (let i = bang.length - 1; i > 0; i--) { const j = Math.floor(rd() * (i + 1)); [bang[i], bang[j]] = [bang[j], bang[i]]; }
      for (const w of bang) {
        if (nhieu.length >= SO_NHIEU) break;
        if (thay.has(w.toLowerCase()) || trongCau(w) || nhieu.includes(w)) continue;
        nhieu.push(w);
      }
    }
    const o = nhieu.concat([dung]);
    for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
    // Che MỌI chỗ từ xuất hiện, không chỉ chỗ đầu: chừa lại một chỗ là lộ đáp án.
    const doan = cat(mau.cau, mau.mat);
    return { cau: mau.cau, dich: mau.dich, mat: mau.mat, doan: doan, o: o, dung: dung };
  }

  function cat(cau, mat) {
    const latin = /^[A-Za-z]/.test(mat);
    const re = new RegExp((latin ? "(?<![A-Za-z])" : "") + mat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + (latin ? "(?![A-Za-z])" : ""), latin ? "gi" : "g");
    return cau.split(re);
  }

  /** Chấm: chọn đúng từ gốc thì nhớ. */
  function cham(de, chon) { return !!de && chon === de.dung; }

  goc.CauDien = { dungDe, cham, cat, diemGiong, dang, LO, SO_NHIEU, THONG_DUNG };
})(typeof self !== "undefined" ? self : this);
