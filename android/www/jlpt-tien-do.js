/**
 * Tiến độ của chế độ "Ôn thi JLPT": luật mở khoá, sao, ngọc, chuỗi ngày.
 * Thuần dữ liệu — không đụng DOM, không đụng bộ nhớ — để test được và để extension / Android dùng chung.
 *
 * Chặng thường mở tự do. Bài cuối chỉ mở sau khi hoàn thành mọi chặng trước đó.
 * Điểm số chỉ dùng tính sao; hoàn thành nghĩa là làm hết lượt có câu hỏi.
 *
 * Dạng lưu (một khoá duy nhất `jlpt`):
 *   { v:1, ngoc:0, ngayCuoi:"2026-10-27", chuoi:3, thu:false, nhac:true,
 *     mon:{ n3:{ chang:{ "<id>":{ tot:84, sao:2, lan:3, ts:… } }, thoai:{ "<khoá>":1 } } },
 *     sai:{ "<idMuc>":2 },        // số lần sai của từng mục, để ôn lại
 *     baoLoi:{ "<idMuc>:<kiểu>":ts } }
 */
(function (goc) {
  "use strict";

  const NGUONG = 60;                 // chỉ tính sao, không khoá chặng
  const MOC_SAO = [60, 80, 95];      // 1, 2, 3 sao

  /** Thứ tự hiển thị các màn (từ dễ đến khó). */
  const THU_TU_MON = ["n5", "n4", "n3", "n2", "n1", "kaiwa"];

  function macDinh() {
    return { v: 1, ngoc: 0, ngayCuoi: "", chuoi: 0, thu: false, nhac: true, mon: {}, sai: {}, baoLoi: {} };
  }

  /** Chuẩn hoá dữ liệu đọc từ kho (thiếu trường thì bù, sai kiểu thì bỏ). */
  function chuan(d) {
    const m = macDinh();
    if (!laObj(d)) return m;
    Object.assign(m, hop(d, {}));
    m.v = Math.max(1, so(d.v));
    m.ngoc = so(d.ngoc);
    m.ngayCuoi = typeof d.ngayCuoi === "string" && /^(?:|\d{4}-\d{2}-\d{2})$/.test(d.ngayCuoi) ? d.ngayCuoi : "";
    m.chuoi = so(d.chuoi);
    m.thu = d.thu === true;
    m.nhac = d.nhac !== false;                // nhạc nền: mặc định bật, người dùng tắt được
    m.mon = laObj(d.mon) ? hop(d.mon, {}) : {};
    m.sai = laObj(d.sai) ? hop(d.sai, {}) : {};
    m.baoLoi = laObj(d.baoLoi) ? hop(d.baoLoi, {}) : {};
    return m;
  }


  const laObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  const so = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  const khoa = (o) => Object.keys(laObj(o) ? o : {}).filter(k => !["__proto__", "constructor", "prototype"].includes(k)).sort();

  // Phép hợp tăng dần, thuần dữ liệu: giữ cả hai nhánh, max số đếm/điểm/mốc.
  // Không cộng hai snapshot vì chúng có thể chứa lại cùng một lượt đã đồng bộ.
  function hop(a, b) {
    if (laObj(a) || laObj(b)) {
      const r = {};
      for (const k of [...new Set([...khoa(a), ...khoa(b)])].sort()) {
        const x = laObj(a) ? a[k] : undefined, y = laObj(b) ? b[k] : undefined;
        r[k] = hop(x, y);
      }
      return r;
    }
    if (a === undefined) return b === undefined ? null : JSON.parse(JSON.stringify(b));
    if (b === undefined) return JSON.parse(JSON.stringify(a));
    if (typeof a === "number" && typeof b === "number") return Math.max(so(a), so(b));
    if (typeof a === "boolean" && typeof b === "boolean") return a || b;
    // Trường lạ vẫn được chuyển tiếp; thứ tự chọn ổn định khi hai bản cùng mốc.
    return JSON.parse(JSON.stringify(JSON.stringify(a) >= JSON.stringify(b) ? a : b));
  }

  /** Gộp tiến độ theo cấp/chặng, KHÔNG lấy nguyên kho của máy mới hơn đè máy kia. */
  function tron(a, b) {
    const x = chuan(a), y = chuan(b), r = hop(x, y);
    // Nhạc/chế độ thử là tuỳ chọn của máy này, không lấy từ thiết bị khác.
    r.thu = x.thu; r.nhac = x.nhac;
    for (const id of khoa(r.mon)) {
      const m = r.mon[id] = laObj(r.mon[id]) ? r.mon[id] : {};
      m.chang = laObj(m.chang) ? m.chang : {};
      m.thoai = laObj(m.thoai) ? m.thoai : {};
      for (const k of khoa(m.chang)) {
        const c = m.chang[k] = laObj(m.chang[k]) ? m.chang[k] : {};
        c.lan = so(c.lan); c.ts = so(c.ts);
        c.tot = Math.min(100, so(c.tot)); c.sao = Math.min(3, so(c.sao));
        c.xong = c.xong === true || c.lan > 0; // tương thích tiến độ cũ dưới 60%
      }
    }
    // Chuỗi thuộc về ngày học gần nhất, không ghép "chuỗi dài nhất" với ngày khác.
    const cuoi = x.ngayCuoi > y.ngayCuoi ? x : y;
    r.ngayCuoi = cuoi.ngayCuoi;
    r.chuoi = x.ngayCuoi === y.ngayCuoi ? Math.max(x.chuoi, y.chuoi) : cuoi.chuoi;
    return hop(r, {}); // thứ tự khoá ổn định để nhận ra sync không có thay đổi
  }

  /** Chỉ tiến độ đi lên cloud, không mang lựa chọn nhạc/chế độ thử của thiết bị. */
  function gui(d) {
    const r = tron(d, null);
    delete r.thu; delete r.nhac;
    return r;
  }

  function monCua(td, monId) {
    if (!td.mon[monId]) td.mon[monId] = { chang: {}, thoai: {} };
    const o = td.mon[monId];
    if (!o.chang) o.chang = {};
    if (!o.thoai) o.thoai = {};
    return o;
  }

  function saoTu(phanTram) {
    let s = 0;
    for (let i = 0; i < MOC_SAO.length; i++) if (phanTram >= MOC_SAO[i]) s = i + 1;
    return s;
  }
  function qua(phanTram) { return phanTram >= NGUONG; }

  /** Điểm cao nhất đã đạt ở một chặng (0 nếu chưa chơi). */
  function tot(td, monId, changId) {
    const c = ((td.mon[monId] || {}).chang || {})[changId];
    return c ? c.tot || 0 : 0;
  }

  /**
   * Chặng thứ `i` trong danh sách có đang mở không?
   * @param {string[]} ids   id các chặng theo thứ tự đi
   * @param {boolean} monMo  màn này đã mở chưa (nếu chưa thì không chặng nào mở)
   */
  function daXong(td, monId, id) {
    const c = ((td.mon[monId] || {}).chang || {})[id];
    // Legacy lan is only written after the full quiz, including scores below 60%.
    return !!(c && (c.xong === true || c.lan > 0));
  }
  function changMo(td, monId, ids, i, monMo) {
    if (!monMo || i < 0 || i >= ids.length) return false;
    return ids[i] !== "boss" || ids.filter(id => id !== "boss").every(id => daXong(td, monId, id));
  }

  /** Màn đã hoàn thành chưa: trùm cuối màn đạt ngưỡng. */
  function monXong(td, monId, idTrumCuoi) {
    return daXong(td, monId, idTrumCuoi);
  }

  /**
   * Màn `monId` đã mở chưa. Các màn mở SONG SONG: người học tự chọn cấp hợp với trình độ của mình,
   * không phải đỗ N3 rồi mới được vào N2. Màn nào có dữ liệu thì vào được ngay.
   * @param {Object<string,string>} trumCuoi  monId → id trùm cuối, chỉ gồm các màn có dữ liệu
   */
  function monMo(td, monId, trumCuoi) {
    return !!trumCuoi[monId];
  }

  /** Ngày dạng YYYY-MM-DD theo giờ máy. */
  function ngay(ts) {
    const d = new Date(ts);
    const p = (n) => (n < 10 ? "0" : "") + n;
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  /** Cập nhật chuỗi ngày học liên tiếp khi vừa xong một lượt chơi. */
  function chamChuoi(td, bayGio) {
    const hom = ngay(bayGio);
    if (td.ngayCuoi === hom) return;
    const qua1 = ngay(bayGio - 86400000);
    td.chuoi = td.ngayCuoi === qua1 ? td.chuoi + 1 : 1;
    td.ngayCuoi = hom;
  }

  /**
   * Ghi kết quả một lượt chơi. Sửa `td` tại chỗ.
   * @param {{dung:number, tong:number, saiIds:string[]}} kq
   * @returns {{phanTram:number, sao:number, qua:boolean, ngoc:number, laKyLuc:boolean}}
   */
  function ghiKetQua(td, monId, changId, kq, bayGio) {
    if (!(kq.tong > 0)) return { phanTram: 0, sao: 0, qua: false, ngoc: 0, laKyLuc: false };
    const phanTram = kq.tong > 0 ? Math.round((kq.dung / kq.tong) * 100) : 0;
    const sao = qua(phanTram) ? saoTu(phanTram) : 0;
    const o = monCua(td, monId);
    const cu = o.chang[changId] || { tot: 0, sao: 0, lan: 0, ts: 0 };
    const laKyLuc = phanTram > cu.tot;
    // Ngọc: mỗi câu đúng một viên; thêm thưởng khi lập kỷ lục sao mới, để chơi lại có lý do.
    let ngoc = kq.dung;
    if (sao > cu.sao) ngoc += (sao - cu.sao) * 5;
    o.chang[changId] = {
      xong: true,
      tot: Math.max(cu.tot, phanTram),
      sao: Math.max(cu.sao, sao),
      lan: cu.lan + 1,
      ts: bayGio
    };
    td.ngoc += ngoc;
    (kq.saiIds || []).forEach((id) => { td.sai[id] = (td.sai[id] || 0) + 1; });
    chamChuoi(td, bayGio);
    return { phanTram, sao, qua: true, ngoc, laKyLuc };
  }

  /** Tổng số sao / số chặng đã qua của một màn. */
  function tomTat(td, monId, ids) {
    const o = (td.mon[monId] || {}).chang || {};
    let sao = 0, xong = 0;
    ids.forEach((id) => { const c = o[id]; if (c) { sao += c.sao || 0; if (daXong(td, monId, id)) xong++; } });
    return { sao, xong, tong: ids.length, tiLe: ids.length ? Math.round((xong / ids.length) * 100) : 0 };
  }

  /** Chặng nào là chặng đầu tiên CHƯA qua (để bản đồ cuộn tới). */
  function changHienTai(td, monId, ids) {
    for (let i = 0; i < ids.length; i++) if (!daXong(td, monId, ids[i])) return i;
    return ids.length - 1;
  }

  goc.JlptTienDo = {
    NGUONG, MOC_SAO, THU_TU_MON, daXong, macDinh, chuan, monCua, saoTu, qua, tot, changMo, monXong, monMo,
    ngay, chamChuoi, ghiKetQua, tomTat, changHienTai, tron, gui
  };
})(typeof self !== "undefined" ? self : this);
