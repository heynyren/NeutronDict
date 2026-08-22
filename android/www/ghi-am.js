/**
 * GHI ÂM ĐỂ ĐỌC THEO (shadowing)
 * ==============================
 *
 * Đọc theo là cách luyện nói rẻ nhất mà hiệu quả nhất: nghe một câu, đọc lại
 * ngay, rồi nghe lại CHÍNH GIỌNG MÌNH đặt cạnh câu mẫu. Bước cuối mới là bước
 * dạy được — tai mình lúc đang nói thì nghe qua xương sọ, khác hẳn lúc nghe lại.
 *
 * Ba chỗ cần nó, và cả ba dùng chung tệp này: bảng lời thoại YouTube (đọc theo
 * video), sổ tay (đọc lại từ đã lưu) và buổi học (đọc trong lúc ôn).
 *
 * Vì sao lưu vào kho khoá–giá trị chứ không phải IndexedDB
 * --------------------------------------------------------
 * Bảng lời thoại là content script nên nó chạy trong nguồn gốc của
 * youtube.com, còn sổ tay là trang của chính extension. IndexedDB tách theo
 * nguồn gốc, nên ghi âm ở bảng YouTube thì sổ tay KHÔNG đọc được — mà "ghi ở
 * video rồi mở sổ tay nghe lại" đúng là việc người ta muốn làm.
 * `chrome.storage.local` thì cả hai bên nhìn thấy như nhau. Bản Android không
 * có kho ấy nên đi qua lớp `Store` của riêng nó — xem khoLuu() ở dưới.
 *
 * Cái giá phải trả là âm thanh phải nằm ở dạng base64 (chuỗi), phồng thêm
 * khoảng một phần ba. Chấp nhận được, vì mấy tệp này CỐ Ý ngắn hạn.
 *
 * Ngắn hạn nghĩa là gì
 * --------------------
 * Xoá sau MỘT NGÀY. Đây không phải kho tư liệu — nó là cái gương để soi ngay
 * lúc đang tập. Giữ lâu thì vừa phình bộ nhớ vừa chẳng ai nghe lại bản thu tuần
 * trước. Dọn ngay mỗi lượt đọc/ghi, nên không cần hẹn giờ nền: mở app ra là
 * bản cũ đã đi rồi.
 *
 * Và vì hạn mức `storage.local` không rộng, còn hai cái chặn nữa: giữ tối đa
 * một số bản gần nhất, và tổng dung lượng có trần. Quá thì bỏ bản CŨ NHẤT —
 * bản vừa thu bao giờ cũng là bản đang cần.
 */
(function (goc) {
  "use strict";

  const KHOA = "ghiAm";
  const MOT_NGAY = 24 * 3600 * 1000;
  const TOI_DA_BAN = 80;              // số bản thu giữ cùng lúc
  const TOI_DA_BYTE = 4 * 1024 * 1024; // trần tổng dung lượng (tính trên chuỗi base64)
  const DAI_NHAT = 30000;             // một bản thu dài nhất 30 giây

  /** Trình duyệt này có ghi âm được không. */
  function hoTro() {
    return typeof MediaRecorder !== "undefined"
      && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Kiểu tệp ghi được. Duyệt theo thứ tự vì không máy nào cũng đủ cả ba, và
   * chọn sai kiểu thì MediaRecorder ném lỗi ngay lúc bắt đầu chứ không báo
   * trước.
   */
  function kieu() {
    const ds = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for (const k of ds) {
      try { if (MediaRecorder.isTypeSupported(k)) return k; } catch (e) { /* thử kiểu sau */ }
    }
    return "";
  }

  function b64Cua(blob) {
    return new Promise((xong, hong) => {
      const fr = new FileReader();
      fr.onerror = () => hong(new Error("Không đọc được bản thu"));
      fr.onload = () => {
        const s = String(fr.result || "");
        const i = s.indexOf(",");
        xong(i >= 0 ? s.slice(i + 1) : "");
      };
      fr.readAsDataURL(blob);
    });
  }

  /**
   * Bắt đầu thu. Trả về một tay cầm có `dung()` để kết thúc và `bo()` để huỷ.
   *
   * Micro được TẮT HẲN khi thu xong: giữ luồng lại thì đèn micro của trình duyệt
   * cứ sáng mãi sau khi người ta đã bấm dừng, trông như app đang nghe lén.
   */
  async function batDau() {
    if (!hoTro()) throw new Error("Máy này không ghi âm được");
    const luong = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = kieu();
    let mr;
    try {
      mr = new MediaRecorder(luong, mime ? { mimeType: mime } : undefined);
    } catch (e) {
      luong.getTracks().forEach((t) => t.stop());
      throw e;
    }
    const mau = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size) mau.push(e.data); };
    const batDauLuc = Date.now();
    mr.start();

    const tatMicro = () => luong.getTracks().forEach((t) => t.stop());
    let hen = setTimeout(() => { try { if (mr.state !== "inactive") mr.stop(); } catch (e) {} }, DAI_NHAT);

    return {
      /** Dừng và trả về bản thu. */
      dung() {
        clearTimeout(hen);
        return new Promise((xong, hong) => {
          mr.onstop = async () => {
            tatMicro();
            try {
              const blob = new Blob(mau, { type: mr.mimeType || mime || "audio/webm" });
              if (!blob.size) { hong(new Error("Bản thu rỗng")); return; }
              xong({ b64: await b64Cua(blob), mime: blob.type, dai: Date.now() - batDauLuc });
            } catch (e) { hong(e); }
          };
          try {
            if (mr.state === "inactive") mr.onstop();
            else mr.stop();
          } catch (e) { tatMicro(); hong(e); }
        });
      },
      /** Bỏ giữa chừng: không lấy gì cả, chỉ cần micro tắt đi. */
      bo() {
        clearTimeout(hen);
        try { if (mr.state !== "inactive") mr.stop(); } catch (e) {}
        tatMicro();
      },
    };
  }

  /** Bỏ bản quá hạn, rồi bỏ tiếp bản cũ nhất cho tới khi lọt hai cái trần. */
  function locKho(kho, bayGio) {
    const ra = {};
    for (const id in kho) {
      const b = kho[id];
      if (b && typeof b.ts === "number" && bayGio - b.ts < MOT_NGAY) ra[id] = b;
    }
    const ma = Object.keys(ra).sort((a, b) => (ra[b].ts || 0) - (ra[a].ts || 0));  // mới nhất trước
    let tong = 0;
    const giu = {};
    for (const id of ma) {
      const co = (ra[id].b64 || "").length;
      if (Object.keys(giu).length >= TOI_DA_BAN || tong + co > TOI_DA_BYTE) break;
      giu[id] = ra[id]; tong += co;
    }
    return giu;
  }

  /**
   * Kho lưu, hỏi ngay lúc dùng chứ không chốt lúc nạp.
   *
   * Bản extension có `chrome.storage.local`; bản Android không, nó đi qua lớp
   * `Store` của riêng nó (Capacitor Preferences, hoặc localStorage khi chạy
   * trong trình duyệt). Cùng một tệp phải chạy được ở cả hai chỗ, mà thứ tự nạp
   * tệp thì không bảo đảm — nên hỏi lúc gọi mới chắc.
   */
  function khoLuu() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return {
        doc: async () => (await chrome.storage.local.get(KHOA))[KHOA] || {},
        ghi: (d) => chrome.storage.local.set({ [KHOA]: d }),
      };
    }
    // `const Store = …` ở đầu app.js tạo ràng buộc TOÀN CỤC nhưng KHÔNG phải
    // thuộc tính của window — nên `goc.Store` là undefined. Phải hỏi thêm bằng
    // chính tên đó; `typeof` an toàn kể cả khi chẳng có Store nào.
    const S = goc.Store || (typeof Store !== "undefined" ? Store : null);
    if (S) return { doc: async () => (await S.get(KHOA)) || {}, ghi: (d) => S.set(KHOA, d) };
    return null;
  }

  async function docKho() {
    try {
      const k = khoLuu();
      if (!k) return {};
      return locKho(await k.doc(), Date.now());
    } catch (e) { return {}; }
  }

  /** Dọn bản quá hạn. Gọi lúc mở màn hình cũng được, không cần hẹn giờ nền. */
  async function don() {
    const con = await docKho();
    try { const k = khoLuu(); if (k) await k.ghi(con); } catch (e) { /* đầy thì thôi */ }
    return Object.keys(con).length;
  }

  async function luu(id, ban) {
    if (!id || !ban || !ban.b64) return false;
    const con = await docKho();
    con[id] = { b64: ban.b64, mime: ban.mime || "audio/webm", dai: ban.dai || 0, ts: Date.now() };
    try {
      const k = khoLuu();
      if (!k) return false;
      await k.ghi(locKho(con, Date.now()));
      return true;
    } catch (e) { return false; }
  }

  async function doc(id) {
    if (!id) return null;
    const con = await docKho();
    return con[id] || null;
  }

  async function xoa(id) {
    const con = await docKho();
    if (!(id in con)) return false;
    delete con[id];
    try { const k = khoLuu(); if (!k) return false; await k.ghi(con); return true; } catch (e) { return false; }
  }

  /** Danh sách mã của những bản thu còn sống — để giao diện biết chỗ nào có. */
  async function co() { return Object.keys(await docKho()); }

  /**
   * Đường phát cho một bản thu.
   *
   * Dùng thẳng `data:` chứ không dựng blob URL: blob URL phải nhớ thu hồi, quên
   * một chỗ là rò bộ nhớ, mà mấy tệp này vốn đã bé.
   */
  function duong(ban) {
    if (!ban || !ban.b64) return "";
    return "data:" + (ban.mime || "audio/webm") + ";base64," + ban.b64;
  }

  /* ==================================================================== */
  /* Phát lại — MỘT bản thu tại một thời điểm                             */
  /* ==================================================================== */
  /*
   * Mỗi lần bấm Nghe mà dựng một `new Audio` rồi thả trôi thì bấm hai lần là
   * hai giọng chồng lên nhau, bấm ba lần là ba — mà chẳng có cách nào dừng lại,
   * vì không ai còn giữ cái nào cả. Nên chỗ phát phải nằm ở ĐÂY, một chỗ duy
   * nhất giữ bản đang vang lên: bấm lần nữa là phát lại từ đầu chứ không chồng
   * thêm, bấm sang mục khác là mục cũ im, và bấm Ghi thì tiếng đang phát tắt
   * trước khi micro bật — không thì máy thu lại chính giọng nó vừa phát ra.
   */

  let dangPhat = null;   // { am, ma, bao }

  /** Mã của bản thu đang vang lên, "" nếu đang im. */
  function maDangPhat() { return dangPhat ? dangPhat.ma : ""; }

  /** Dừng hẳn bản đang phát và báo cho giao diện vẽ lại. */
  function dungPhat() {
    if (!dangPhat) return;
    const { am, bao } = dangPhat;
    dangPhat = null;
    try { am.pause(); am.currentTime = 0; am.src = ""; } catch (e) { /* đã hỏng thì thôi */ }
    if (bao) { try { bao(); } catch (e) { /* giao diện đi rồi cũng không sao */ } }
  }

  /**
   * Phát một bản thu. Trả về true nếu bắt đầu được.
   * @param {Function} [bao] gọi lại khi ngừng phát (hết bài, bị dừng, hoặc lỗi)
   *   — để nút đổi lại hình.
   */
  function phat(ma, ban, bao) {
    dungPhat();
    const d = duong(ban);
    if (!d) return false;
    const am = new Audio(d);
    dangPhat = { am, ma: ma || "", bao: bao };
    const xong = () => { if (dangPhat && dangPhat.am === am) dungPhat(); };
    am.onended = xong;
    am.onerror = xong;
    am.play().catch(xong);
    return true;
  }

  /** Mã của một dòng lời thoại: theo video và mốc giây, giống bản sửa lời thoại. */
  function maDongYt(v, giay) { return "yt:" + v + ":" + Math.round(giay || 0); }

  goc.GhiAm = { hoTro, batDau, luu, doc, xoa, co, don, duong, maDongYt,
                phat, dungPhat, maDangPhat,
                MOT_NGAY, TOI_DA_BAN, TOI_DA_BYTE, DAI_NHAT, locKho };
})(typeof self !== "undefined" ? self : this);
