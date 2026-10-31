/**
 * Dựng CHẶNG và CÂU HỎI cho chế độ "Ôn thi JLPT" từ dữ liệu giáo trình (extension/jlpt/n3.json, n2.json).
 * Thuần tính toán — không DOM, không bộ nhớ — dùng chung cho extension và Android.
 *
 * Nguyên tắc: mọi đáp án ĐÚNG đều lấy thẳng từ giáo trình (nghĩa, cách đọc, Hán Việt, ví dụ có dịch),
 * không bao giờ tự sinh nghĩa. Câu hỏi trắc nghiệm có sẵn trong sách KHÔNG được dùng vì database ghi rõ là
 * chưa có đáp án đã kiểm chứng. Đáp án nhiễu lấy từ cùng chương (rồi tới cả màn) và được chọn cho giống đáp
 * án đúng (độ dài, loại từ) để không lộ ra bằng mẹo.
 *
 * Dạng dữ liệu một màn: { cap, chuong:[ { so, bai:[ { so, tu:[{id,w,r,m,hv}], han:[{id,c,hv,kun,on,nho}],
 *   pp:[{id,p,m,cn,gt}], vd:[{j,v,t?,g?}] } ] } ] }
 */
(function (goc) {
  "use strict";

  const SO_LUA_CHON = 4;
  const TU_MOI_CHANG = 20;     // từ vựng tối đa mỗi chặng
  const HAN_MOI_CHANG = 10;    // chữ Hán tối đa mỗi chặng

  /* ---------------------------------------------------------------- tiện ích */

  function xaoTron(a, rng) {
    const r = rng || Math.random;
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; }
    return b;
  }
  function lay(a, n, rng) { return xaoTron(a, rng).slice(0, n); }

  /** Chia đều `a` thành các nhóm không quá `max` phần tử (các nhóm gần bằng nhau). */
  function chia(a, max) {
    if (!a.length) return [];
    const k = Math.ceil(a.length / max);
    const out = [];
    for (let i = 0; i < k; i++) out.push(a.slice(Math.floor((a.length * i) / k), Math.floor((a.length * (i + 1)) / k)));
    return out;
  }

  const bo = (s) => String(s || "").replace(/[〜～]/g, "");
  const chuanNghia = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

  /** Nghĩa rút gọn để làm lựa chọn: tối đa hai nghĩa đầu, không quá ~60 ký tự. */
  function nghiaNgan(m) {
    const p = String(m || "").split(/[;,]/).map((x) => x.trim()).filter(Boolean);
    let s = p.slice(0, 2).join(", ");
    if (s.length > 60) s = p[0].slice(0, 60);
    return s;
  }

  /* ------------------------------------------------------------- chuẩn bị màn */

  /**
   * Nhiều cách đọc (âm On / âm Kun) phải tách bạch bằng dấu "/", không viết liền:
   * "カイ エ" → "カイ / エ". Dấu "・" trong âm Kun là chỗ ngăn gốc từ với okurigana (よ・る) nên giữ nguyên.
   */
  function tachDoc(s) {
    if (!s || s === "---") return "";
    return String(s).split(/[\s、,，;；/／]+/).filter(Boolean).join(" / ");
  }

  /**
   * Gắn chỉ mục vào dữ liệu màn (chỉ làm một lần). Trả về chính `mon` để gọi nối tiếp.
   */
  function chuanBi(mon) {
    if (mon._idx) return mon;
    const idx = { tu: [], han: [], pp: [], tuTheoId: new Map(), ppTheoId: new Map(), vdTu: new Map(), vdPp: new Map(),
                  chuongTu: [], chuongHan: [], chuongPp: [] };
    mon.chuong.forEach((ch, ci) => {
      const ct = [], chh = [], cp = [];
      ch.bai.forEach((b) => {
        b.tu.forEach((t) => { t._ch = ci; ct.push(t); idx.tu.push(t); idx.tuTheoId.set(t.id, t); });
        b.han.forEach((h) => { h._ch = ci; h.on = tachDoc(h.on); h.kun = tachDoc(h.kun); chh.push(h); idx.han.push(h); });
        b.pp.forEach((p) => { p._ch = ci; cp.push(p); idx.pp.push(p); idx.ppTheoId.set(p.id, p); });
        b.vd.forEach((v) => {
          if (v.t) { if (!idx.vdTu.has(v.t)) idx.vdTu.set(v.t, []); idx.vdTu.get(v.t).push(v); }
          if (v.g) { if (!idx.vdPp.has(v.g)) idx.vdPp.set(v.g, []); idx.vdPp.get(v.g).push(v); }
        });
      });
      idx.chuongTu.push(ct); idx.chuongHan.push(chh); idx.chuongPp.push(cp);
    });
    mon._idx = idx;
    return mon;
  }

  /* -------------------------------------------------------------- chia chặng */

  /**
   * Danh sách chặng theo thứ tự đi: với mỗi bài là chữ Hán → từ vựng → ngữ pháp; hết mỗi chương có trùm
   * chương; cuối cùng là trùm cuối màn.
   * @returns {Array<{id:string, loai:string, chuong:number, bai:number, items:Array, ten:string, soCau:number}>}
   */
  function chiaChang(mon) {
    chuanBi(mon);
    if (mon._chang) return mon._chang;
    const ds = [];
    mon.chuong.forEach((ch, ci) => {
      ch.bai.forEach((b) => {
        const k0 = "c" + ch.so + "b" + b.so;
        const han = chia(b.han, HAN_MOI_CHANG);
        han.forEach((g, i) => ds.push({ id: k0 + "h" + (i + 1), loai: "han", chuong: ch.so, bai: b.so, ci: ci,
          items: g, phan: i + 1, tongPhan: han.length, soCau: Math.max(8, Math.min(16, Math.round(g.length * 1.2))) }));
        const tu = chia(b.tu, TU_MOI_CHANG);
        tu.forEach((g, i) => ds.push({ id: k0 + "t" + (i + 1), loai: "tu", chuong: ch.so, bai: b.so, ci: ci,
          items: g, phan: i + 1, tongPhan: tu.length, soCau: Math.min(16, g.length) }));
        if (b.pp.length) ds.push({ id: k0 + "p", loai: "pp", chuong: ch.so, bai: b.so, ci: ci,
          items: b.pp, phu: b.tu, phan: 1, tongPhan: 1, soCau: Math.min(12, b.pp.length * 2) });
      });
      ds.push({ id: "c" + ch.so + "boss", loai: "boss-chuong", chuong: ch.so, bai: 0, ci: ci, items: [], phan: 1, tongPhan: 1, soCau: 20 });
    });
    ds.push({ id: "boss", loai: "boss", chuong: 0, bai: 0, ci: -1, items: [], phan: 1, tongPhan: 1, soCau: 30 });
    if (mon.id === "kaiwa" || mon.quizMode === "reviewed-choices") ds.forEach(c => {
      const pool = c.loai === "boss" ? mon._idx.tu.concat(mon._idx.han, mon._idx.pp) :
        c.loai === "boss-chuong" ? mon._idx.chuongTu[c.ci].concat(mon._idx.chuongHan[c.ci], mon._idx.chuongPp[c.ci]) : c.items;
      c.soCau = Math.min(c.loai === "boss" ? 30 : c.loai === "boss-chuong" ? 20 : pool.length, pool.length);
      const lesson = mon.chuong[c.ci]?.bai.find(b => b.so === c.bai);
      c.lessonTitle = lesson?.ten || "";
    });
    mon._chang = ds;
    return ds;
  }

  /* ------------------------------------------------------------ đáp án nhiễu */

  /** Điểm giống nhau của hai từ để chọn đáp án nhiễu "khó": cùng loại, cùng độ dài, chung chữ Hán. */
  function giong(a, b) {
    let d = 0;
    const wa = bo(a.w), wb = bo(b.w);
    const dua = (s) => (/[るうくぐすつぬぶむ]$/.test(s) ? "v" : /い$/.test(s) ? "i" : "n");
    if (dua(a.r || wa) === dua(b.r || wb)) d += 2;
    if (Math.abs(wa.length - wb.length) <= 1) d += 1;
    const kanji = (s) => s.match(/[一-鿿]/g) || [];
    const ka = kanji(wa);
    if (ka.length && kanji(wb).some((c) => ka.indexOf(c) >= 0)) d += 2;
    if (wa[wa.length - 1] === wb[wb.length - 1]) d += 1;
    return d;
  }

  /** Chọn `n` đáp án nhiễu từ `pool` (đã loại chính nó), ưu tiên giống `mau`, không trùng giá trị hiển thị. */
  function chonNhieu(pool, mau, hien, cam, n, rng) {
    const dung = new Set(cam.map(chuanNghia));
    const cand = [];
    xaoTron(pool, rng).some((x) => {
      if (x === mau) return false;
      const v = hien(x);
      if (!v || dung.has(chuanNghia(v))) return false;
      cand.push(x); dung.add(chuanNghia(v));
      return cand.length >= 60;
    });
    cand.sort((p, q) => giong(mau, q) - giong(mau, p));
    // lấy 2 ứng viên giống nhất và phần còn lại ngẫu nhiên trong top 12: đủ khó mà vẫn đa dạng
    const top = cand.slice(0, 12);
    const out = top.slice(0, 2).concat(lay(top.slice(2), Math.max(0, n - 2), rng));
    return out.slice(0, n);
  }

  /** Xếp đáp án đúng + nhiễu thành danh sách lựa chọn ngẫu nhiên. */
  function lap(dungStr, nhieuStr, rng) {
    const ds = xaoTron([dungStr].concat(nhieuStr), rng);
    return { chon: ds, dung: ds.indexOf(dungStr) };
  }

  /** Nguồn đáp án nhiễu: cùng chương trước, thiếu thì lấy cả màn. */
  function nguon(mon, ci, loai) {
    const idx = mon._idx;
    const ch = loai === "tu" ? idx.chuongTu[ci] : loai === "han" ? idx.chuongHan[ci] : idx.chuongPp[ci];
    const all = loai === "tu" ? idx.tu : loai === "han" ? idx.han : idx.pp;
    return ch && ch.length >= 12 ? ch : all;
  }

  /* ------------------------------------------------------------ câu điền chỗ trống */

  const KY_HIEU_SO = /^[\s❶-➓⓵-⓾①-⑳➀-➉➊-➓0-9.．)）]+/;

  /** Các dạng chữ của một mẫu ngữ pháp có thể xuất hiện NGUYÊN VĂN trong câu (dài trước). */
  function dangPhapChu(p) {
    const s = String(p || "").replace(KY_HIEU_SO, "");
    const out = [];
    s.split(/[\/／]/).forEach((alt) => {
      let a = alt.replace(/[〜～]/g, "").replace(/\([^)]*\)|（[^）]*）/g, "").replace(/^[\sNVAnva]+(?=[ぁ-んァ-ヶ一-龠])/, "").replace(/\s+/g, "");
      a = a.replace(/^[るたなだ]+(?=[ぁ-んァ-ヶ一-龠]{2,})/, (m) => (a.length - m.length >= 2 ? "" : m));
      if (a.length >= 2) out.push(a);
    });
    return out.sort((x, y) => y.length - x.length);
  }

  /** Tách câu thành [trước, sau] quanh `chu` (lần xuất hiện đầu tiên); null nếu không có. */
  function cat(cau, chu) {
    const i = cau.indexOf(chu);
    return i < 0 ? null : [cau.slice(0, i), cau.slice(i + chu.length)];
  }

  /* --------------------------------------------------------------- các kiểu câu hỏi */

  const KIEU_TU = ["tu-nghia", "nghia-tu", "tu-doc", "nghe", "dien-tu"];
  const KIEU_HAN = ["han-hv", "han-on", "hv-han"];
  const KIEU_PP = ["pp-nghia", "pp-dien"];

  function moTa(t) { return { w: t.w, r: t.r, m: t.m }; }

  function cauTu(mon, kieu, t, rng, vdTu) {
    const pool = nguon(mon, t._ch, "tu");
    if (kieu === "tu-nghia" || kieu === "nghe") {
      const nh = chonNhieu(pool, t, (x) => nghiaNgan(x.m), [nghiaNgan(t.m)], SO_LUA_CHON - 1, rng);
      if (nh.length < SO_LUA_CHON - 1) return null;
      const o = lap(nghiaNgan(t.m), nh.map((x) => nghiaNgan(x.m)), rng);
      if (kieu === "nghe") return { id: t.id + ":nghe", kieu, mucId: t.id, de: { lenh: "Nghe rồi chọn nghĩa đúng", nghe: bo(t.r) }, ...o, dapAn: moTa(t) };
      return { id: t.id + ":tu-nghia", kieu, mucId: t.id, de: { lenh: "Chọn nghĩa đúng", chinh: t.w, phu: t.r, nghe: bo(t.r) }, ...o, dapAn: moTa(t) };
    }
    if (kieu === "nghia-tu") {
      const nh = chonNhieu(pool, t, (x) => x.w, [t.w], SO_LUA_CHON - 1, rng);
      if (nh.length < SO_LUA_CHON - 1) return null;
      const o = lap(t.w, nh.map((x) => x.w), rng);
      return { id: t.id + ":nghia-tu", kieu, mucId: t.id, de: { lenh: "Chọn từ có nghĩa này", chinh: nghiaNgan(t.m) }, ...o, dapAn: moTa(t) };
    }
    if (kieu === "tu-doc") {
      // Đáp án nhiễu: cách đọc của các từ khác có độ dài gần; loại những cách đọc trùng cách đọc đúng
      const p2 = pool.filter((x) => x !== t && x.r !== t.r && Math.abs(bo(x.r).length - bo(t.r).length) <= 1);
      const nh = chonNhieu(p2, t, (x) => x.r, [t.r], SO_LUA_CHON - 1, rng);
      if (nh.length < SO_LUA_CHON - 1) return null;
      const o = lap(t.r, nh.map((x) => x.r), rng);
      return { id: t.id + ":tu-doc", kieu, mucId: t.id, de: { lenh: "Chọn cách đọc đúng", chinh: t.w, nghe: bo(t.r) }, ...o, dapAn: moTa(t) };
    }
    if (kieu === "dien-tu") {
      const ds = (vdTu.get(t.id) || []).filter((v) => bo(t.w) && v.j.indexOf(bo(t.w)) >= 0);
      if (!ds.length) return null;
      const vd = ds[Math.floor((rng || Math.random)() * ds.length)];
      const p = cat(vd.j, bo(t.w));
      if (!p) return null;
      const nh = chonNhieu(pool.filter((x) => vd.j.indexOf(bo(x.w)) < 0), t, (x) => x.w, [t.w], SO_LUA_CHON - 1, rng);
      if (nh.length < SO_LUA_CHON - 1) return null;
      const o = lap(t.w, nh.map((x) => x.w), rng);
      return { id: t.id + ":dien-tu", kieu, mucId: t.id, de: { lenh: "Điền từ vào chỗ trống", truoc: p[0], sau: p[1], dich: vd.v || "" }, ...o,
        dapAn: Object.assign(moTa(t), { cau: vd.j, dich: vd.v || "" }) };
    }
    return null;
  }

  function cauHan(mon, kieu, h, rng) {
    const pool = nguon(mon, h._ch, "han");
    if (kieu === "han-hv") {
      if (!h.hv) return null;
      const nh = chonNhieu(pool.filter((x) => x.hv), h, (x) => x.hv, [h.hv], SO_LUA_CHON - 1, rng);
      if (nh.length < SO_LUA_CHON - 1) return null;
      const o = lap(h.hv, nh.map((x) => x.hv), rng);
      return { id: h.id + ":han-hv", kieu, mucId: h.id, de: { lenh: "Âm Hán Việt của chữ này", chinh: h.c }, ...o, dapAn: { c: h.c, hv: h.hv, on: h.on, kun: h.kun } };
    }
    if (kieu === "han-on") {
      if (!h.on || h.on === "---") return null;
      const nh = chonNhieu(pool.filter((x) => x.on && x.on !== "---"), h, (x) => x.on, [h.on], SO_LUA_CHON - 1, rng);
      if (nh.length < SO_LUA_CHON - 1) return null;
      const o = lap(h.on, nh.map((x) => x.on), rng);
      return { id: h.id + ":han-on", kieu, mucId: h.id, de: { lenh: "Âm On của chữ này", chinh: h.c }, ...o, dapAn: { c: h.c, hv: h.hv, on: h.on, kun: h.kun } };
    }
    if (kieu === "hv-han") {
      if (!h.hv) return null;
      const nh = chonNhieu(pool, h, (x) => x.c, [h.c], SO_LUA_CHON - 1, rng);
      if (nh.length < SO_LUA_CHON - 1) return null;
      const o = lap(h.c, nh.map((x) => x.c), rng);
      return { id: h.id + ":hv-han", kieu, mucId: h.id, de: { lenh: "Chọn chữ Hán có âm Hán Việt này", chinh: h.hv }, ...o, dapAn: { c: h.c, hv: h.hv, on: h.on, kun: h.kun } };
    }
    return null;
  }

  /** Nghĩa mẫu ngữ pháp dùng được làm đáp án: ngắn gọn, không lẫn công thức nối. */
  function nghiaPhapSach(m) {
    const s = String(m || "").trim();
    return !!s && s.length <= 80 && !/[＋+❶❷❸]/.test(s);
  }
  function tenPhap(p) { return String(p || "").replace(KY_HIEU_SO, "").trim(); }

  function cauPhap(mon, kieu, p, rng, vdPp) {
    const pool = nguon(mon, p._ch, "pp");
    if (kieu === "pp-nghia") {
      if (!nghiaPhapSach(p.m)) return null;
      const nh = chonNhieu(pool.filter((x) => nghiaPhapSach(x.m)), p, (x) => x.m, [p.m], SO_LUA_CHON - 1, rng);
      if (nh.length < SO_LUA_CHON - 1) return null;
      const o = lap(p.m, nh.map((x) => x.m), rng);
      return { id: p.id + ":pp-nghia", kieu, mucId: p.id, de: { lenh: "Mẫu ngữ pháp này có nghĩa", chinh: tenPhap(p.p) }, ...o, dapAn: { p: tenPhap(p.p), m: p.m, cn: p.cn } };
    }
    if (kieu === "pp-dien") {
      const ds = vdPp.get(p.id) || [];
      const dang = dangPhapChu(p.p);
      for (const vd of xaoTron(ds, rng)) {
        const chu = dang.find((d) => vd.j.indexOf(d) >= 0);
        if (!chu) continue;
        const pc = cat(vd.j, chu);
        const nhHien = (x) => dangPhapChu(x.p)[0];
        const nh = chonNhieu(pool.filter((x) => x !== p && nhHien(x) && vd.j.indexOf(nhHien(x)) < 0), p, nhHien, [chu], SO_LUA_CHON - 1, rng);
        if (nh.length < SO_LUA_CHON - 1) continue;
        const o = lap(chu, nh.map(nhHien), rng);
        return { id: p.id + ":pp-dien", kieu, mucId: p.id, de: { lenh: "Điền mẫu ngữ pháp vào chỗ trống", truoc: pc[0], sau: pc[1], dich: vd.v || "" }, ...o,
          dapAn: { p: tenPhap(p.p), m: p.m, cau: vd.j, dich: vd.v || "" } };
      }
      return null;
    }
    return null;
  }

  /* --------------------------------------------------------------- dựng đề */

  /** Thử lần lượt các kiểu (bắt đầu từ `bat`) cho tới khi dựng được một câu hỏi chưa bị báo lỗi. */
  function thuKieu(ds, bat, fn, baoLoi) {
    for (let k = 0; k < ds.length; k++) {
      const kieu = ds[(bat + k) % ds.length];
      const q = fn(kieu);
      if (q && !(baoLoi && baoLoi[q.id])) return q;
    }
    return null;
  }

  function dungTu(mon, items, n, rng, baoLoi, bat0) {
    const out = [];
    lay(items, n, rng).forEach((t, i) => {
      const q = thuKieu(KIEU_TU, ((bat0 || 0) + i) % KIEU_TU.length, (k) => cauTu(mon, k, t, rng, mon._idx.vdTu), baoLoi);
      if (q) out.push(q);
    });
    return out;
  }
  function dungHan(mon, items, n, rng, baoLoi) {
    const out = [], co = new Set();
    // Vòng 1: mỗi chữ một câu; vòng 2 trở đi: hỏi lại các chữ bằng kiểu khác cho tới khi đủ `n` câu.
    for (let vong = 0; vong < 3 && out.length < n; vong++) {
      xaoTron(items, rng).forEach((h, i) => {
        if (out.length >= n) return;
        for (let k = 0; k < KIEU_HAN.length; k++) {
          const q = cauHan(mon, KIEU_HAN[(i + vong + k) % KIEU_HAN.length], h, rng);
          if (q && !co.has(q.id) && !(baoLoi && baoLoi[q.id])) { co.add(q.id); out.push(q); return; }
        }
      });
    }
    return out;
  }
  function dungPhap(mon, items, n, rng, baoLoi) {
    const out = [];
    xaoTron(items, rng).forEach((p) => {
      KIEU_PP.forEach((k) => {
        if (out.length >= n) return;
        const q = cauPhap(mon, k, p, rng, mon._idx.vdPp);
        if (q && !(baoLoi && baoLoi[q.id])) out.push(q);
      });
    });
    return out;
  }

  /**
   * Dựng đề cho một chặng.
   * @param {object} mon   dữ liệu màn (đã `chuanBi`)
   * @param {object} chang một phần tử của `chiaChang`
   * @param {{rng?:Function, baoLoi?:object}} [opt]
   * @returns {Array} danh sách câu hỏi (đã xáo)
   */
  function dungDe(mon, chang, opt) {
    chuanBi(mon);
    const o = opt || {};
    const rng = o.rng || Math.random;
    const baoLoi = o.baoLoi || {};
    let ds = [];
    if (mon.id === "kaiwa") return dungDeKaiwa(mon, chang, rng, baoLoi);
    if (mon.quizMode === "reviewed-choices") return dungDeReviewed(mon, chang, rng, baoLoi);
    if (chang.loai === "tu") ds = dungTu(mon, chang.items, chang.soCau, rng, baoLoi, Math.floor(rng() * KIEU_TU.length));
    else if (chang.loai === "han") ds = dungHan(mon, chang.items, chang.soCau, rng, baoLoi);
    else if (chang.loai === "pp") {
      ds = dungPhap(mon, chang.items, chang.soCau, rng, baoLoi);
      // Bài ít mẫu / mẫu nào cũng thiếu ví dụ hoặc nghĩa sạch: bù vài câu điền từ của chính bài đó cho đủ một lượt chơi.
      if (ds.length < 6 && chang.phu && chang.phu.length) {
        ds = ds.concat(dungTu(mon, chang.phu, 6 - ds.length, rng, baoLoi, KIEU_TU.indexOf("dien-tu")));
      }
    }
    else {
      const idx = mon._idx;
      const tuP = chang.loai === "boss" ? idx.tu : idx.chuongTu[chang.ci] || [];
      const hanP = chang.loai === "boss" ? idx.han : idx.chuongHan[chang.ci] || [];
      const ppP = chang.loai === "boss" ? idx.pp : idx.chuongPp[chang.ci] || [];
      const n = chang.soCau;
      const nTu = Math.round(n * 0.5), nHan = Math.round(n * 0.2), nPp = n - nTu - nHan;
      ds = dungTu(mon, tuP, nTu, rng, baoLoi).concat(dungHan(mon, hanP, nHan, rng, baoLoi), dungPhap(mon, ppP, nPp, rng, baoLoi));
      // thiếu (một nhóm quá ít mục) thì bù bằng từ vựng
      if (ds.length < n) ds = ds.concat(dungTu(mon, tuP.filter((t) => !ds.some((q) => q.mucId === t.id)), n - ds.length, rng, baoLoi));
    }
    return xaoTron(ds, rng).slice(0, chang.soCau);
  }


  // N4/N5 use inspected answer sets, not raw exercise-page OCR or random semantic neighbours.
  function dungDeReviewed(mon, chang, rng, baoLoi) {
    const idx=mon._idx;
    const groups=chang.loai==="boss" ? [idx.tu,idx.han,idx.pp] :
      chang.loai==="boss-chuong" ? [idx.chuongTu[chang.ci],idx.chuongHan[chang.ci],idx.chuongPp[chang.ci]] : [chang.items];
    // Round-robin the shuffled groups so chapter/final challenges exercise all available skills.
    const buckets=groups.map(items=>xaoTron(items,rng));
    const pool=[];for(let i=0;buckets.some(b=>i<b.length);i++)for(const b of buckets)if(b[i])pool.push(b[i]);
    const out=[];
    for(const item of pool) {
      const q=item.quiz;if(!q || !q.answer || q.wrong.length!==3 || new Set([q.answer,...q.wrong].map(chuanNghia)).size!==4)continue;
      const variant=item.w && item.r && rng()<0.3 ? "nghe" : item.readQuiz && rng()<0.4 ? "tu-doc" : q.kind;
      const answerSet=variant==="tu-doc"?item.readQuiz:q;
      const id=item.id+":"+variant;
      if(baoLoi[id])continue;
      const de=variant==="nghe"?{lenh:"Nghe rồi chọn nghĩa đúng",nghe:item.r}:
        variant==="tu-doc"?{lenh:"Chọn cách đọc đúng",chinh:item.w,phu:item.m}:
        item.p?{lenh:"Mẫu bên dưới có chức năng gì trong câu?",chinh:q.context,phu:item.p}:
        item.c?{lenh:"Âm Hán Việt của chữ này",chinh:item.c}:
        {lenh:"Chọn nghĩa đúng",chinh:item.w,phu:item.r,nghe:item.r};
      out.push({id,mucId:item.id,kieu:variant,de,...lap(answerSet.answer,answerSet.wrong,rng),source:item.source,
        dapAn:{w:item.w,r:item.r,p:item.p,c:item.c,hv:item.hv,on:item.on,kun:item.kun,m:q.answer,
          cau:q.context,dich:q.translation}});
      if(out.length>=chang.soCau)break;
    }
    return xaoTron(out,rng);
  }

  // Kaiwa choices are authored per context: never pick synonyms from another card as distractors.
  function dungDeKaiwa(mon, chang, rng, baoLoi) {
    const pool = chang.loai === "boss" ? mon._idx.tu.concat(mon._idx.pp) :
      chang.loai === "boss-chuong" ? mon._idx.chuongTu[chang.ci].concat(mon._idx.chuongPp[chang.ci]) : chang.items;
    return xaoTron(pool, rng).map(item => {
      const q = item.quiz, id = item.id + ":context";
      if (!q || baoLoi[id] || q.wrong.length !== 3 || new Set([q.answer, ...q.wrong]).size !== 4) return null;
      const o = lap(q.answer, q.wrong, rng);
      return {id, mucId:item.id, kieu:item.p ? "pp-context" : "tu-context",
        de:{lenh:"Chọn cách hiểu phù hợp với ngữ cảnh", chinh:q.context, phu:item.p || item.w},
        ...o, source:item.source,
        dapAn:{p:item.p, w:item.w, r:item.r, m:q.answer, cau:q.context, dich:q.translation, explanation:q.explanation}};
    }).filter(Boolean).slice(0, chang.soCau);
  }

  /* ------------------------------------------------------------ thẻ học nhanh */

  /** Mục cần học ở một chặng thường: chính các `items`; trùm không có phần học. */
  function theHoc(mon, chang) {
    chuanBi(mon);
    if (chang.loai === "tu") return chang.items.map((t) => ({ kieu: "tu", muc: t, vd: (mon._idx.vdTu.get(t.id) || [])[0] || null }));
    if (chang.loai === "han") return chang.items.map((h) => ({ kieu: "han", muc: h }));
    if (chang.loai === "pp") return chang.items.map((p) => ({ kieu: "pp", muc: p, vd: (mon._idx.vdPp.get(p.id) || [])[0] || null }));
    return [];
  }

  function theYeu(mon, id) {
    chuanBi(mon);
    const x = mon._idx;
    const t = x.tuTheoId.get(id);
    if (t) return { kieu: "tu", muc: t, vd: (x.vdTu.get(id) || [])[0] || null };
    const p = x.ppTheoId.get(id);
    if (p) return { kieu: "pp", muc: p, vd: (x.vdPp.get(id) || [])[0] || null };
    const h = x.han.find(h => h.id === id);
    if (!h) return null;
    const related = x.tu.filter(t => t.w.includes(h.c));
    const example = related.flatMap(t => x.vdTu.get(t.id) || []).find(v => v.j.includes(h.c));
    return { kieu: "han", muc: h, vd: example || null };
  }

  goc.JlptCauHoi = {
    chuanBi, chiaChang, dungDe, theHoc, theYeu, tachDoc, xaoTron, chia, dangPhapChu, nghiaNgan, tenPhap,
    KIEU_TU, KIEU_HAN, KIEU_PP, SO_LUA_CHON
  };
})(typeof self !== "undefined" ? self : this);
