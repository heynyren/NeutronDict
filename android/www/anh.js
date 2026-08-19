/**
 * Ảnh đính kèm cho một mục sổ tay.
 *
 * Byte ảnh nằm trong IndexedDB của MÁY NÀY, cố ý không nằm chung với sổ tay
 * trong chrome.storage: mỗi lượt đồng bộ đẩy cả sổ tay lên Drive dưới dạng một
 * tài liệu JSON, mà nhét vài tấm ảnh chụp màn hình vào đó thì tệp phình lên rất
 * nhanh rồi tới lúc đồng bộ hỏng hẳn. Mục sổ tay chỉ mang một mô tả nhẹ
 * ({id, ten, kieu, cd}), còn byte thì ở lại đây.
 *
 * Cùng một cách làm với attach.js của Neuron Note — hai app là của một người,
 * gặp đúng một bài toán, thì đừng nghĩ ra hai lời giải khác nhau.
 */
(function (goc) {
  "use strict";

  const TEN_KHO = "neutrondict-files";
  const KHO = "blobs";
  const BAN = 1;

  const A = {};

  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((nhan, tu) => {
      const req = indexedDB.open(TEN_KHO, BAN);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(KHO)) d.createObjectStore(KHO, { keyPath: "id" });
      };
      req.onsuccess = () => nhan(req.result);
      req.onerror = () => tu(req.error);
    });
    return dbp;
  }

  function tx(che, fn) {
    return db().then((d) => new Promise((nhan, tu) => {
      const t = d.transaction(KHO, che);
      const kho = t.objectStore(KHO);
      let ra;
      try { ra = fn(kho); } catch (e) { tu(e); return; }
      // IDBRequest LÚC NÀO cũng có `result` — bằng undefined khi không tìm thấy
      // khoá — nên phải xét sự CÓ MẶT của thuộc tính chứ không xét giá trị; xét
      // giá trị thì một lượt "không thấy" lại trả về chính cái request, và mọi
      // phép kiểm "có chưa" đều đọc ra là có.
      t.oncomplete = () => nhan(ra && typeof ra === "object" && "result" in ra ? ra.result : ra);
      t.onerror = () => tu(t.error);
      t.onabort = () => tu(t.error);
    }));
  }

  A.TOI_DA = 20 * 1024 * 1024;   // 20MB một tệp — thoải mái cho ảnh chụp màn hình
  A.CANH_TOI_DA = 1600;          // thu ảnh chụp màn hình về cỡ vừa phải

  A.laAnh = function (kieu) { return /^image\//.test(kieu || ""); };

  A.coChu = function (byte) {
    const b = Number(byte) || 0;
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + " KB";
    return (b / 1024 / 1024).toFixed(1) + " MB";
  };

  function ma() {
    return "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Thu nhỏ ảnh quá khổ trước khi cất. Một ảnh chụp màn hình 4K là chừng 8MB
   * PNG mà nằm trong thẻ sổ tay thì cũng chẳng nét hơn bản 1600px. Thứ không
   * phải ảnh, hoặc ảnh giải mã không nổi, thì cất nguyên xi.
   */
  function thuNho(blob) {
    if (!A.laAnh(blob.type) || blob.type === "image/gif" || blob.type === "image/svg+xml") {
      return Promise.resolve(blob);
    }
    // Thiếu API thì ném lỗi ngay lúc gọi, một .catch() đặt ở cuối không đỡ được.
    if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") {
      return Promise.resolve(blob);
    }
    return Promise.resolve().then(() => createImageBitmap(blob)).then((bmp) => {
      const canh = Math.max(bmp.width, bmp.height);
      if (canh <= A.CANH_TOI_DA) { bmp.close && bmp.close(); return blob; }
      const ti = A.CANH_TOI_DA / canh;
      const w = Math.round(bmp.width * ti), h = Math.round(bmp.height * ti);
      const canvas = new OffscreenCanvas(w, h);
      canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
      bmp.close && bmp.close();
      return canvas.convertToBlob({ type: "image/webp", quality: 0.9 });
    }).catch(() => blob);
  }

  /**
   * Cất một File/Blob, trả về bản mô tả để treo lên mục sổ tay.
   * Tệp quá khổ thì từ chối hẳn, chứ không lặng lẽ làm đầy ổ đĩa của người dùng.
   */
  A.luu = function (tep, ten) {
    if (!tep) return Promise.reject(new Error("Chưa có tệp"));
    if (tep.size > A.TOI_DA) {
      return Promise.reject(new Error("Tệp lớn hơn " + A.coChu(A.TOI_DA)));
    }
    return thuNho(tep).then((blob) => {
      const ban = {
        id: ma(),
        ten: ten || tep.name || (A.laAnh(blob.type) ? "ảnh" : "tệp"),
        kieu: blob.type || tep.type || "application/octet-stream",
        cd: blob.size,
        ts: Date.now(),
        blob
      };
      return tx("readwrite", (kho) => kho.put(ban)).then(() => ({
        id: ban.id, ten: ban.ten, kieu: ban.kieu, cd: ban.cd, ts: ban.ts
      }));
    });
  };

  A.lay = function (id) {
    return tx("readonly", (kho) => kho.get(id)).then((r) => r || null);
  };

  A.xoa = function (id) { return tx("readwrite", (kho) => kho.delete(id)); };

  /** URL phát ra ở đây được A.nhaUrl thu lại mỗi lần vẽ lại danh sách. */
  const urls = new Map();
  A.url = function (id) {
    if (urls.has(id)) return Promise.resolve(urls.get(id));
    return A.lay(id).then((ban) => {
      if (!ban || !ban.blob) return "";
      const u = URL.createObjectURL(ban.blob);
      urls.set(id, u);
      return u;
    });
  };
  A.nhaUrl = function () {
    urls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} });
    urls.clear();
  };

  /** Bỏ những blob không còn mục sống nào trỏ tới. */
  A.quet = function (so) {
    const giu = new Set();
    Object.keys(so || {}).forEach((k) => {
      const e = so[k];
      if (e && !e.del) (e.anh || []).forEach((f) => f && f.id && giu.add(f.id));
    });
    return tx("readonly", (kho) => kho.getAllKeys()).then((ks) =>
      Promise.all((ks || []).filter((k) => !giu.has(k)).map((k) => A.xoa(k)))
    ).then((bo) => bo.length);
  };

  goc.Anh = A;
  if (typeof module !== "undefined" && module.exports) module.exports = A;
})(typeof self !== "undefined" ? self : this);
