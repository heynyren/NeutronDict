/**
 * Tiến độ của chế độ "Ôn thi JLPT": luật mở khoá, sao, ngọc, chuỗi ngày.
 * Thuần dữ liệu — không đụng DOM, không đụng bộ nhớ — để test được và để extension / Android dùng chung.
 *
 * Luật 60% (do chủ dự án đặt ra):
 *   - một CHẶNG đạt ≥ 60% thì chặng kế mở;
 *   - trùm chương đạt ≥ 60% thì chương sau mở;
 *   - trùm cuối màn đạt ≥ 60% thì hoàn thành màn và mở màn kế tiếp.
 *
 * Dạng lưu (một khoá duy nhất `jlpt`):
 *   { v:1, ngoc:0, ngayCuoi:"2026-10-27", chuoi:3, thu:false,
 *     mon:{ n3:{ chang:{ "<id>":{ tot:84, sao:2, lan:3, ts:… } }, thoai:{ "<khoá>":1 } } },
 *     sai:{ "<idMuc>":2 },        // số lần sai của từng mục, để ôn lại
 *     baoLoi:{ "<idMuc>:<kiểu>":ts } }
 */
(function (goc) {
  "use strict";

  const NGUONG = 60;                 // phần trăm tối thiểu để qua
  const MOC_SAO = [60, 80, 95];      // 1, 2, 3 sao

  /** Thứ tự các màn; màn đứng sau mở khi màn đứng trước hoàn thành. */
  const THU_TU_MON = ["n5", "n4", "n3", "n2", "n1"];

  function macDinh() {
    return { v: 1, ngoc: 0, ngayCuoi: "", chuoi: 0, thu: false, mon: {}, sai: {}, baoLoi: {} };
  }

  /** Chuẩn hoá dữ liệu đọc từ kho (thiếu trường thì bù, sai kiểu thì bỏ). */
  function chuan(d) {
    const m = macDinh();
    if (!d || typeof d !== "object") return m;
    if (typeof d.ngoc === "number" && d.ngoc >= 0) m.ngoc = Math.floor(d.ngoc);
    if (typeof d.ngayCuoi === "string") m.ngayCuoi = d.ngayCuoi;
    if (typeof d.chuoi === "number" && d.chuoi >= 0) m.chuoi = Math.floor(d.chuoi);
    m.thu = d.thu === true;
    if (d.mon && typeof d.mon === "object") m.mon = d.mon;
    if (d.sai && typeof d.sai === "object") m.sai = d.sai;
    if (d.baoLoi && typeof d.baoLoi === "object") m.baoLoi = d.baoLoi;
    return m;
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
  function changMo(td, monId, ids, i, monMo) {
    if (!monMo) return false;
    if (td.thu) return true;
    if (i <= 0) return true;
    return qua(tot(td, monId, ids[i - 1]));
  }

  /** Màn đã hoàn thành chưa: trùm cuối màn đạt ngưỡng. */
  function monXong(td, monId, idTrumCuoi) {
    return qua(tot(td, monId, idTrumCuoi));
  }

  /**
   * Màn `monId` đã mở chưa. Màn đầu tiên trong số các màn CÓ DỮ LIỆU luôn mở; các màn sau mở khi màn
   * có dữ liệu liền trước đã hoàn thành.
   * @param {Object<string,string>} trumCuoi  monId → id trùm cuối, chỉ gồm các màn có dữ liệu
   */
  function monMo(td, monId, trumCuoi) {
    if (td.thu) return true;
    const co = THU_TU_MON.filter((m) => trumCuoi[m]);
    const i = co.indexOf(monId);
    if (i < 0) return false;
    if (i === 0) return true;
    return monXong(td, co[i - 1], trumCuoi[co[i - 1]]);
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
    const phanTram = kq.tong > 0 ? Math.round((kq.dung / kq.tong) * 100) : 0;
    const sao = qua(phanTram) ? saoTu(phanTram) : 0;
    const o = monCua(td, monId);
    const cu = o.chang[changId] || { tot: 0, sao: 0, lan: 0, ts: 0 };
    const laKyLuc = phanTram > cu.tot;
    // Ngọc: mỗi câu đúng một viên; thêm thưởng khi lập kỷ lục sao mới, để chơi lại có lý do.
    let ngoc = kq.dung;
    if (sao > cu.sao) ngoc += (sao - cu.sao) * 5;
    o.chang[changId] = {
      tot: Math.max(cu.tot, phanTram),
      sao: Math.max(cu.sao, sao),
      lan: cu.lan + 1,
      ts: bayGio
    };
    td.ngoc += ngoc;
    (kq.saiIds || []).forEach((id) => { td.sai[id] = (td.sai[id] || 0) + 1; });
    chamChuoi(td, bayGio);
    return { phanTram, sao, qua: qua(phanTram), ngoc, laKyLuc };
  }

  /** Tổng số sao / số chặng đã qua của một màn. */
  function tomTat(td, monId, ids) {
    const o = (td.mon[monId] || {}).chang || {};
    let sao = 0, xong = 0;
    ids.forEach((id) => { const c = o[id]; if (c) { sao += c.sao || 0; if (qua(c.tot || 0)) xong++; } });
    return { sao, xong, tong: ids.length, tiLe: ids.length ? Math.round((xong / ids.length) * 100) : 0 };
  }

  /** Chặng nào là chặng đầu tiên CHƯA qua (để bản đồ cuộn tới). */
  function changHienTai(td, monId, ids) {
    for (let i = 0; i < ids.length; i++) if (!qua(tot(td, monId, ids[i]))) return i;
    return ids.length - 1;
  }

  goc.JlptTienDo = {
    NGUONG, MOC_SAO, THU_TU_MON, macDinh, chuan, monCua, saoTu, qua, tot, changMo, monXong, monMo,
    ngay, chamChuoi, ghiKetQua, tomTat, changHienTai
  };
})(typeof self !== "undefined" ? self : this);
