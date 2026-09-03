/**
 * Nhạc ga tàu — nền cho chế độ học.
 * ===========================================================================
 *
 * Năm đoạn nhạc báo tàu rời ga của tuyến Yamanote (Tokyo, Shinjuku, Kanda,
 * Shinbashi và bản Yamanote mới). Mỗi đoạn 8–18 giây.
 *
 * Vì sao KHÔNG phát liên tục
 * --------------------------
 * Nhạc chạy nền suốt buổi thì tai quen mất, tới lúc đó nó không còn là nhạc
 * nữa mà thành tiếng ù — mà lại còn giẫm lên tiếng cổ vũ và giọng đọc từ. Ở
 * đây mỗi lượt cách nhau một khoảng NGẪU NHIÊN (lần đầu 40 giây – 1 phút 50,
 * các lần sau 1 phút 50 – 5 phút 40): đủ thưa để mỗi lần vang lên vẫn là một
 * bất ngờ nhỏ, đủ dày để cả buổi học không im lìm.
 *
 * Không có chu kỳ cố định là cố ý. Nhịp đều đặn thì sau vài lượt người ta đoán
 * được lúc nào tới, và cái đoán trước ấy giết mất đúng thứ mình cần.
 *
 * Bỏ lượt chứ không phát dồn
 * --------------------------
 * Tới hẹn mà buổi học đã đóng, hoặc tab đang bị ẩn, thì BỎ lượt đó và hẹn lượt
 * sau. Nếu để dồn thì lúc mở lại app sẽ bị dội một tràng nhạc — đúng cái cảm
 * giác app hỏng.
 *
 * Không lặp lại đoạn vừa phát: nghe hai lần liền một bài thì lộ ngay là máy
 * chọn bừa.
 */
(function (goc) {
  "use strict";

  /** Tên tệp trong thư mục `am/`. */
  const DS = [
    { ma: "yamanote",  ten: "Yamanote" },
    { ma: "tokyo",     ten: "Tokyo" },
    { ma: "shinjuku",  ten: "Shinjuku" },
    { ma: "kanda",     ten: "Kanda" },
    { ma: "shinbashi", ten: "Shinbashi" }
  ];
  const THU_MUC = "am/";
  const CHO_DAU = [40000, 110000];      // trước lượt đầu tiên
  const CHO_SAU = [110000, 340000];     // giữa các lượt sau
  const AM = 0.34;                      // nhạc nền, không phải nhạc chính

  let hen = null, dangPhat = null, cai = null, truoc = -1;

  function ngau(a, b) { return a + Math.random() * (b - a); }

  /** Chọn đoạn kế — không bao giờ trùng đoạn vừa phát. */
  function chon() {
    if (DS.length < 2) return 0;
    let i = truoc;
    while (i === truoc) i = Math.floor(Math.random() * DS.length);
    truoc = i;
    return i;
  }

  /**
   * Phát MỘT đoạn ngay bây giờ.
   * @param {string} [gocDuong] tiền tố đường dẫn; bỏ trống là cùng thư mục trang
   * @param {number} [am] 0–1
   * @returns {object|null} đoạn vừa chọn
   */
  function phatMot(gocDuong, am) {
    const t = DS[chon()];
    try {
      const a = new Audio((gocDuong || "") + THU_MUC + t.ma + ".mp3");
      a.volume = am == null ? AM : am;
      dangPhat = a;
      const p = a.play();
      if (p && p.catch) p.catch(() => { /* máy chưa cho phát trước cú bấm nào */ });
    } catch (e) { return null; }
    return t;
  }

  function nhip() {
    hen = null;
    if (!cai) return;
    if (cai.duoc()) {
      const t = phatMot(cai.goc, cai.am);
      if (t && cai.khiPhat) cai.khiPhat(t);
    }
    hen = setTimeout(nhip, ngau(cai.choSau[0], cai.choSau[1]));
  }

  /**
   * Bắt đầu hẹn nhạc.
   * @param {{goc?:string, am?:number, choDau?:number[], choSau?:number[],
   *          duoc?:function, khiPhat?:function}} [opt]
   *   `duoc()` được hỏi lại ở TỪNG lượt — chỗ gọi trả false khi buổi học đã
   *   đóng hoặc tab đang ẩn.
   */
  function bat(opt) {
    tat();
    cai = Object.assign({ goc: "", am: AM, choDau: CHO_DAU, choSau: CHO_SAU,
                          duoc: function () { return true; } }, opt || {});
    hen = setTimeout(nhip, ngau(cai.choDau[0], cai.choDau[1]));
    return true;
  }

  /** Ngắt hẹn và tắt luôn đoạn đang vang. */
  function tat() {
    if (hen) clearTimeout(hen);
    hen = null;
    if (dangPhat) { try { dangPhat.pause(); } catch (e) {} dangPhat = null; }
    cai = null;
  }

  function dangBat() { return !!hen; }

  goc.NhacTau = { DS, THU_MUC, CHO_DAU, CHO_SAU, AM, bat, tat, dangBat, phatMot, chon };
})(typeof self !== "undefined" ? self : this);
