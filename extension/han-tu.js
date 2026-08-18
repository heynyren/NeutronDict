/**
 * HÁN TỰ — dùng chung cho mọi màn của NJDict
 * ===========================================
 * Trước đây mỗi nơi tự viết lại một bản `hanVietOf` hơi khác nhau, và Hán tự
 * chỉ là một dòng chữ đọc cho biết. Nay Hán tự là **một loại mục của sổ tay,
 * ngang hàng với từ vựng**: lưu được, ôn được, sửa nghĩa và ghi chú được.
 *
 * Vì sao đáng làm vậy: một chữ Hán không phải chú thích của từ, nó là đơn vị
 * học riêng. Nhớ 電 = "điện" thì đọc được 電気, 電車, 停電 mà chẳng cần tra lại
 * chữ nào. Bắt nó nằm mãi trong một dòng phụ dưới từ vựng là phí.
 *
 * File này KHÔNG cần tới bảng kanji-data.js, trừ hàm LIET_KE và HAN_VIET.
 * Nhờ vậy content script nhúng vào trang web chỉ nạp vài trăm dòng này, còn
 * bảng dữ liệu hơn mười nghìn chữ thì để nguyên bên service worker.
 */
"use strict";
(function (root) {

  /** Ô chữ Hán trong Unicode (gồm cả phần mở rộng A và dạng tương thích). */
  function laHanTu(ch) {
    const c = ch.codePointAt(0);
    return (c >= 0x4e00 && c <= 0x9fff)      // CJK cơ bản
      || (c >= 0x3400 && c <= 0x4dbf)        // mở rộng A
      || (c >= 0xf900 && c <= 0xfaff);       // dạng tương thích
  }

  /**
   * Mọi chữ Hán có trong đoạn văn, không trùng lặp, giữ nguyên thứ tự xuất hiện.
   * Cần window.KANJI (bảng tra offline).
   *
   * @param {string} text
   * @param {number} [toiDa] chặn trên, mặc định 60 — bôi đen cả trang báo thì
   *        danh sách vài trăm chữ không ai đọc, mà dựng ra cũng chậm.
   */
  function LIET_KE(text, toiDa) {
    const DB = root.KANJI || {};
    const han = toiDa || 60;
    const daCo = Object.create(null);
    const out = [];
    for (const ch of (text || "")) {
      if (!laHanTu(ch) || daCo[ch]) continue;
      daCo[ch] = 1;
      const d = DB[ch] || null;
      out.push(Object.assign({ ch: ch }, d || {}));
      if (out.length >= han) break;
    }
    return out;
  }

  /** Âm Hán Việt của cả đoạn, ví dụ 開閉器 -> "Khai Bế Khí". */
  function HAN_VIET(text) {
    const DB = root.KANJI || {};
    const phan = [];
    for (const ch of (text || "")) {
      if (!laHanTu(ch)) continue;
      const d = DB[ch];
      phan.push(d && d.hv ? d.hv.split(/[\s,]+/)[0] : "?");
    }
    if (!phan.length) return "";
    return phan.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }

  /**
   * Cắt bớt danh sách cách đọc.
   * Có chữ mang cả chục âm kun; in hết ra thì dòng thông tin dài hơn cả phần
   * nghĩa và đẩy thẻ cao gấp đôi. Ba âm đầu là đủ để nhận ra chữ, muốn đủ thì
   * lưu vào sổ tay rồi xem ở đó.
   */
  function gonDoc(s, soToiDa) {
    const phan = String(s || "").split(/[\s、,]+/).filter(Boolean);
    const han = soToiDa || 3;
    if (phan.length <= han) return phan.join(" ");
    return phan.slice(0, han).join(" ") + "…";
  }

  /** Dòng thông tin phụ: "On: デン · Kun: いなずま · 13 nét · N5 · Bộ: vũ 雨". */
  function META(k) {
    if (!k) return "";
    const bit = [];
    if (k.on) bit.push("On: " + gonDoc(k.on));
    if (k.kun) bit.push("Kun: " + gonDoc(k.kun));
    if (k.s) bit.push(k.s + " nét");
    if (k.jlpt) bit.push("N" + k.jlpt);
    if (k.rad) bit.push("Bộ: " + k.rad);
    return bit.join(" · ");
  }

  /** Cách đọc gọn để làm phần "phiên âm" của mục sổ tay. */
  function CACH_DOC(k) {
    if (!k) return "";
    const bit = [];
    if (k.on) bit.push("On: " + k.on);
    if (k.kun) bit.push("Kun: " + k.kun);
    return bit.join(" ・ ");
  }

  /** Hướng lưu của mục Hán tự — dùng làm tiền tố khoá trong sổ tay. */
  const HUONG = "kanji";

  /** Khoá của một chữ trong sổ tay. */
  function KHOA(ch) { return HUONG + ":" + ch; }

  /**
   * Dựng một mục sổ tay từ bản ghi Hán tự.
   *
   * Cố ý ra đúng hình dạng của mục từ vựng (word / reading / means / dict / ts)
   * để mọi thứ đã có sẵn — sóng học tập, sửa nghĩa, ghi chú, tim, sổ con, xuất
   * Anki, đồng bộ — chạy được ngay mà không phải thêm nhánh xử lý riêng nào.
   * Phần dữ liệu riêng của chữ Hán nằm gọn trong `kanji`, các màn khác không
   * hiểu thì cũng chỉ là một trường thừa vô hại.
   */
  function MUC(k) {
    const e = {
      word: k.ch,
      reading: CACH_DOC(k),
      // Nghĩa trong bảng có dạng "[điện] điện" — cắt phần phân loại trong ngoặc
      // vuông đi cho gọn, vì ở đây đã biết chắc đang xem một chữ Hán rồi.
      means: (k.m || []).map((m) => String(m).replace(/^\s*\[[^\]]*\]\s*/, "")).filter(Boolean),
      dict: HUONG,
      kind: "kanji",
      ts: Date.now()
    };
    const meta = {};
    ["hv", "on", "kun", "s", "jlpt", "rad"].forEach((f) => { if (k[f]) meta[f] = k[f]; });
    if (Object.keys(meta).length) e.kanji = meta;
    return e;
  }

  /** Nhãn hiển thị cho mục Hán tự trong sổ tay. */
  function NHAN() { return "Hán tự"; }

  root.HanTu = {
    laHanTu, LIET_KE, HAN_VIET, META, CACH_DOC, MUC, KHOA, NHAN, HUONG
  };
})(typeof window !== "undefined" ? window : self);
