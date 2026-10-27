/**
 * "Thế giới" liền mạch của chế độ Ôn thi JLPT: mỗi màn có 10 KHUNG CẢNH (9 chương + trùm cuối), mỗi khung vẽ riêng
 * theo độ cao (Phú Sĩ: chân núi → rừng → suối → vách đá → trạm → núi lửa → biển mây → gió tuyết → sát đỉnh → đỉnh)
 * hoặc độ sâu (Okinawa: rạn san hô → rừng tảo → tàu đắm → hang đá có cá mập → vách sâu có bạch tuộc, cá mập voi →
 * vùng nước tối có cá voi → đàn cá phát sáng → rãnh sâu có mực khổng lồ → cửa hang ngọc → ngọc trai).
 *
 * Giao diện chồng 10 khung này thành MỘT sân khấu dính đầu màn hình; cuộn tới đâu thì khung tương ứng hiện dần lên
 * (mờ chồng mờ) nên không có đường nối hay khoảng hở giữa các chương.
 *
 * Mọi khung vẽ trong hệ toạ độ cao 100, rộng `W` (= 100 × tỉ lệ màn hình) nên vừa cả điện thoại dọc lẫn máy tính
 * ngang; hoạt ảnh là CSS (transform/opacity) do jlpt.css định nghĩa, tự tắt khi người dùng chọn giảm chuyển động.
 */
(function (goc) {
  "use strict";

  const f1 = (n) => (Math.round(n * 10) / 10).toString();

  function tron(a, b, t) {
    const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    const x = h(a), y = h(b);
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }

  /** Số ngẫu nhiên lặp lại được: cùng hạt giống → cùng cảnh (không nhấp nháy mỗi lần vẽ lại). */
  function gieo(h) {
    let a = h >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------------------------------------------------------- viên gạch dùng chung */

  const khung = (id, W, c1, c2, trong, c3) =>
    '<svg viewBox="0 0 ' + f1(W) + ' 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
    '<linearGradient id="' + id + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c1 + '"/>' +
    (c3 ? '<stop offset=".55" stop-color="' + c3 + '"/>' : "") + '<stop offset="1" stop-color="' + c2 + '"/></linearGradient>' +
    '<radialGradient id="' + id + 'g"><stop offset="0" stop-color="#fff6cf"/><stop offset=".3" stop-color="#ffd985" stop-opacity=".85"/><stop offset="1" stop-color="#ff9a5a" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '</defs><rect width="' + f1(W) + '" height="100" fill="url(#' + id + 's)"/>' + trong + "</svg>";

  const sao = (W, n, seed, y1, op) => {
    const r = gieo(seed);
    let s = "";
    for (let i = 0; i < n; i++) s += '<circle class="jl-tw" style="animation-delay:' + (r() * 2.6).toFixed(2) + 's" cx="' + f1(r() * W) + '" cy="' + f1(r() * y1) + '" r="' + f1(0.18 + r() * 0.3) + '" fill="#fff" opacity="' + op + '"/>';
    return s;
  };

  /** Dãy núi nhấp nhô hết bề ngang. */
  function dayNui(W, y0, bien, gieoN, mau, op) {
    const r = gieo(gieoN);
    let d = "M-2 101L-2 " + f1(y0);
    for (let x = -2, i = 0; x < W + 8; x += 5 + r() * 7, i++) d += "L" + f1(x) + " " + f1(y0 - r() * bien);
    return '<path d="' + d + "L" + f1(W + 4) + ' 101Z" fill="' + mau + '"' + (op ? ' opacity="' + op + '"' : "") + "/>";
  }

  /** Đám mây trôi chậm: nhiều elip chồng nhau. */
  function may(W, y, n, seed, mau, op, to) {
    const r = gieo(seed);
    let s = "";
    for (let i = 0; i < n; i++) {
      const cx = r() * W, rx = (to || 9) * (0.7 + r() * 0.8);
      s += '<g class="jl-troi" style="--k:' + f1(6 + r() * 14) + 'px;animation-duration:' + f1(24 + r() * 30) + 's;animation-delay:-' + f1(r() * 20) + 's">' +
        '<ellipse cx="' + f1(cx) + '" cy="' + f1(y + r() * 6) + '" rx="' + f1(rx) + '" ry="' + f1(rx * 0.22) + '" fill="' + mau + '" opacity="' + op + '"/>' +
        '<ellipse cx="' + f1(cx + rx * 0.3) + '" cy="' + f1(y + r() * 6 - rx * 0.12) + '" rx="' + f1(rx * 0.55) + '" ry="' + f1(rx * 0.2) + '" fill="' + mau + '" opacity="' + op + '"/></g>';
    }
    return s;
  }

  /** Biển mây: dải mây gợn sóng kín bề ngang. */
  function bienMay(W, y, mau, op, dai, dur) {
    let q = "M-30 " + f1(y + 4);
    for (let x = -30, i = 0; x < W + 40; x += 9, i++) q += "q" + f1(dai + (i % 3) * 0.6) + " -" + f1(3 + (i % 2) * 1.8) + " 9 0";
    return '<g class="jl-troi" style="--k:9px;animation-duration:' + (dur || 34) + 's"><path d="' + q + 'V104H-30z" fill="' + mau + '" opacity="' + op + '"/></g>';
  }

  /** Sương mù: dải elip mờ lững lờ. */
  const suong = (W, y, op, k) => '<g class="jl-troi" style="--k:' + (k || 12) + 'px;animation-duration:' + (20 + (k || 12)) + 's"><ellipse cx="' + f1(W * 0.3) + '" cy="' + y + '" rx="' + f1(W * 0.5) + '" ry="3.2" fill="#fff" opacity="' + op + '"/><ellipse cx="' + f1(W * 0.8) + '" cy="' + (y + 3) + '" rx="' + f1(W * 0.45) + '" ry="2.6" fill="#fff" opacity="' + op + '"/></g>';

  /** Cây thông kiểu tam giác chồng, gốc ở (x, y), cao h. */
  function thong(x, y, h, mau) {
    const w = h * 0.34;
    return '<path d="M' + f1(x) + " " + f1(y) + "l0-" + f1(h * 0.18) + "l-" + f1(w * 0.8) + " 0l" + f1(w * 0.8) + "-" + f1(h * 0.3) + "l-" + f1(w * 0.6) + " 0l" + f1(w * 0.6) + "-" + f1(h * 0.3) +
      "l-" + f1(w * 0.45) + " 0L" + f1(x) + " " + f1(y - h) + "l" + f1(w * 0.45) + " " + f1(h * 0.28) + "l-" + f1(w * 0.45) + " 0l" + f1(w * 0.6) + " " + f1(h * 0.3) + "l-" + f1(w * 0.6) + " 0l" + f1(w * 0.8) + " " + f1(h * 0.3) + "l-" + f1(w * 0.8) + ' 0z" fill="' + mau + '"/>';
  }
  function rung(W, y, n, seed, mau, hMin, hMax, op) {
    const r = gieo(seed);
    let s = '<g' + (op ? ' opacity="' + op + '"' : "") + ">";
    for (let i = 0; i < n; i++) s += thong(-4 + (W + 8) * (i + r() * 0.6) / n, y + r() * 3, hMin + r() * (hMax - hMin), mau);
    return s + "</g>";
  }

  /** Ngọn núi Phú Sĩ (đủ thân + tuyết + bóng), đặt tâm đỉnh ở (cx, yDinh) với tỉ lệ s (s=1 → rộng 480, cao 98). */
  const THAN = "M-40 121C20 118 92 100 150 52C164 40 172 30 184 25L191 23.2Q200 21.6 209 23.2L216 25C228 30 236 40 250 52C308 100 380 118 440 121Z";
  function fuji(id, cx, yDinh, s, t, op) {
    const mau1 = tron("#5468a8", "#c0869e", t), mau2 = tron("#2f3f78", "#7c5a8e", t), mau3 = tron("#1a2552", "#4a3a68", t);
    const sn = 41 + t * 5;
    let mep = "";
    for (let i = 0, x = 292; x >= 108; i++, x -= 9) mep += "L" + x + " " + f1(sn + Math.abs(x - 200) * 0.1 + (i % 2 ? 8 + (i % 3) * 2 : (i * 5) % 4));
    return '<g transform="translate(' + f1(cx - 200 * s) + " " + f1(yDinh - 21.6 * s) + ") scale(" + f1(s * 1000) / 1000 + ')"' + (op ? ' opacity="' + op + '"' : "") + ">" +
      '<defs><linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + mau1 + '"/><stop offset=".55" stop-color="' + mau2 + '"/><stop offset="1" stop-color="' + mau3 + '"/></linearGradient>' +
      '<clipPath id="' + id + 'c"><path d="' + THAN + '"/></clipPath></defs>' +
      '<path d="' + THAN + '" fill="url(#' + id + 'b)"/><g clip-path="url(#' + id + 'c)">' +
      '<path d="M200 0L196 30L206 70L200 121H440V0Z" fill="#0a1030" opacity=".3"/>' +
      '<path d="M150 70C170 90 160 100 176 121M232 60C238 80 252 96 262 121" stroke="#0a1030" stroke-width="3" fill="none" opacity=".18"/>' +
      '<path d="M108 0H292V' + f1(sn) + mep + 'Z" fill="#f4f8ff"/>' +
      '<path d="M200 0H292V' + f1(sn) + mep.replace(/L(\d+) /g, (m, x) => (+x < 200 ? "L200 " : m)) + 'Z" fill="#9fb4e6" opacity=".55"/></g></g>';
  }

  /* --------------------------------------------------------------------------- sinh vật biển */

  /** Cá nhỏ bơi ngang (đuôi bên trái); `--x0/--x1` là điểm đầu/cuối theo đơn vị của khung. */
  function ca(x, y, s, mau, d, sang, W, nguoc) {
    return '<g transform="translate(' + f1(x) + " " + f1(y) + ") scale(" + (nguoc ? -s : s) + " " + s + ')"><g class="jl-boi2" style="--x0:' + f1(-W * 0.3) + "px;--x1:" + f1(W * 0.9) + "px;animation-duration:" + f1(28 + d * 3) + "s;animation-delay:-" + f1(d * 4.3) + 's">' +
      (sang ? '<circle r="2.6" fill="' + mau + '" opacity=".25"/>' : "") +
      '<ellipse rx="1.9" ry="1" fill="' + mau + '"/><path d="M-1.6 0L-3.4 -1.1V1.1z" fill="' + mau + '"/><circle cx="1" cy="-.2" r=".22" fill="#10243a"/></g></g>';
  }
  function dan(W, n, seed, y0, y1, mau, sang, s) {
    const r = gieo(seed);
    let o = "";
    for (let i = 0; i < n; i++) o += ca(r() * W * 0.7, y0 + r() * (y1 - y0), (s || 1) * (0.7 + r() * 0.6), mau, i * 0.7 + r() * 3, sang, W, false);
    return o;
  }

  /** Cá mập (đầu quay sang phải), dài ~ 30 đơn vị khi s=1. */
  function caMap(x, y, s, mau, W, dur, delay, vang) {
    s = s * Math.min(1, 0.5 + W / 160);          // màn hình dọc hẹp: con vật nhỏ lại cho khỏi tràn khung
    return '<g transform="translate(' + f1(x) + " " + f1(y) + ") scale(" + s + ')"><g class="jl-boi2" style="--x0:' + f1(-W * 0.4 / s) + "px;--x1:" + f1(W * 1.1 / s) + "px;animation-duration:" + dur + "s;animation-delay:-" + (delay || 0) + 's">' +
      '<g class="jl-dau-duoi"><path d="M-14 0L-20 -8L-17 0L-20 8Z" fill="' + mau + '"/></g>' +
      '<path d="M-15 0C-9 -5 4 -6 14 -1.4C17 0 18 1 17 1.7C10 4.4 -5 4.6 -15 1.6Z" fill="' + mau + '"/>' +
      '<path d="M-10 1.8C-2 4.2 8 4 15 1.9C8 3.4 -2 3 -10 1.8Z" fill="#e8f1f6" opacity=".9"/>' +
      '<path d="M-2 -5L2 -11.4L5 -4.6Z" fill="' + mau + '"/><path d="M3 2L-1 8.4L7 3.4Z" fill="' + mau + '" opacity=".92"/>' +
      '<path d="M8.4 -1.2l.2 2.4M10 -1.2l.2 2.4" stroke="#0a1c30" stroke-width=".3" opacity=".6"/><circle cx="12.6" cy="-.4" r=".5" fill="#06121f"/>' +
      (vang ? '<circle cx="-4" cy="0" r="9" fill="' + vang + '" opacity=".1"/>' : "") + "</g></g>";
  }

  /** Cá voi lưng gù, dài ~ 60 đơn vị khi s=1, lướt chậm ngang màn hình. */
  function caVoi(x, y, s, mau, bung, W, dur, delay, op) {
    s = s * Math.min(1, 0.5 + W / 160);          // màn hình dọc hẹp: con vật nhỏ lại cho khỏi tràn khung
    return '<g transform="translate(' + f1(x) + " " + f1(y) + ") scale(" + s + ')"' + (op ? ' opacity="' + op + '"' : "") + '><g class="jl-boi2" style="--x0:' + f1(-W * 0.6 / s) + "px;--x1:" + f1(W * 1.3 / s) + "px;animation-duration:" + dur + "s;animation-delay:-" + (delay || 0) + 's">' +
      '<g class="jl-dau-duoi"><path d="M-26 0C-32 -4 -36 -10 -33 -14C-30 -9 -27 -5 -22 -3Z" fill="' + mau + '"/><path d="M-26 0C-32 4 -36 10 -33 14C-30 9 -27 5 -22 3Z" fill="' + mau + '"/></g>' +
      '<path d="M-26 0C-20 -9 2 -12 22 -6C30 -3 34 2 31 6C26 12 4 12 -12 9C-20 7 -25 3 -26 0Z" fill="' + mau + '"/>' +
      '<path d="M-14 6C0 10 18 10 29 5C20 9 2 10 -14 6Z" fill="' + bung + '"/><path d="M-6 8.4h16M-4 9.8h14M-2 11h10" stroke="' + bung + '" stroke-width=".4" opacity=".7"/>' +
      '<path d="M8 6C14 13 20 15 24 16C20 11 16 8 14 5Z" fill="' + mau + '"/><circle cx="25" cy="-.6" r=".7" fill="#0a1424"/>' +
      '<path d="M2 -9L6 -12.4L9 -8Z" fill="' + mau + '"/><circle cx="-4" cy="-4" r=".5" fill="' + bung + '" opacity=".6"/><circle cx="3" cy="-3" r=".4" fill="' + bung + '" opacity=".5"/></g></g>';
  }

  /** Cá đuối manta. */
  function manta(x, y, s, mau, W, dur, delay) {
    s = s * Math.min(1, 0.5 + W / 160);          // màn hình dọc hẹp: con vật nhỏ lại cho khỏi tràn khung
    return '<g transform="translate(' + f1(x) + " " + f1(y) + ") scale(" + s + ')"><g class="jl-boi2" style="--x0:' + f1(-W * 0.4 / s) + "px;--x1:" + f1(W * 1.1 / s) + "px;animation-duration:" + dur + "s;animation-delay:-" + (delay || 0) + 's">' +
      '<g class="jl-vay-canh"><path d="M0 0C8 -6 20 -8 28 -3C18 -3 12 1 0 8C-12 1 -18 -3 -28 -3C-20 -8 -8 -6 0 0Z" fill="' + mau + '"/></g><path d="M0 7C-2 14 -4 18 -10 22" stroke="' + mau + '" stroke-width=".8" fill="none"/>' +
      '<path d="M-4 1.4C-1 3 1 3 4 1.4" stroke="#e8f1f6" stroke-width=".7" fill="none" opacity=".8"/><circle cx="-2.4" cy="-1.4" r=".35" fill="#06121f"/><circle cx="2.4" cy="-1.4" r=".35" fill="#06121f"/></g></g>';
  }

  /** Bạch tuộc: đầu tròn + 8 xúc tu đung đưa. */
  function bachTuoc(x, y, s, mau) {
    let tay = "";
    for (let i = 0; i < 8; i++) {
      const a = -40 + i * 11.5;
      tay += '<path class="jl-lac" style="transform-origin:50% 0;animation-delay:-' + (i * 0.4) + 's" d="M' + f1((i - 3.5) * 1.4) + " 4c" + f1(a / 10) + " 5 " + f1(-a / 8) + " 8 " + f1(a / 6) + ' 12" stroke="' + mau + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
    }
    return '<g transform="translate(' + f1(x) + " " + f1(y) + ") scale(" + s + ')"><g class="jl-nhay">' + tay +
      '<ellipse cx="0" cy="-2" rx="6.2" ry="6.8" fill="' + mau + '"/><ellipse cx="-2.2" cy="-1" rx="1.5" ry="1.7" fill="#fff"/><ellipse cx="2.2" cy="-1" rx="1.5" ry="1.7" fill="#fff"/><circle cx="-2" cy="-.8" r=".8" fill="#10243a"/><circle cx="2.4" cy="-.8" r=".8" fill="#10243a"/>' +
      '<path d="M-4 -7q4 -3 8 0" stroke="#fff" stroke-width=".4" fill="none" opacity=".5"/></g></g>';
  }

  /** Sứa: chuông + tua, phập phồng và trôi lên. */
  function sua(x, y, s, mau, op) {
    return '<g transform="translate(' + f1(x) + " " + f1(y) + ") scale(" + s + ')"><g class="jl-troi-doc"><g class="jl-nhip" style="animation-duration:2.6s"><path d="M-4 1a4 3.6 0 0 1 8 0z" fill="' + mau + '" opacity="' + (op || 0.75) + '"/></g>' +
      '<path d="M-2.6 1q-1 4 0 8M0 1q1 5 0 9M2.6 1q-1 4 0 7" stroke="' + mau + '" stroke-width=".5" fill="none" opacity=".7"/></g></g>';
  }

  /** Mực khổng lồ: một xúc tu khổng lồ cuộn ngang khung. */
  const xucTu = (W, y, mau) => '<g class="jl-lac" style="transform-origin:' + f1(W) + "px " + f1(y) + 'px;animation-duration:7s"><path d="M' + f1(W + 6) + " " + f1(y) + "C" + f1(W * 0.8) + " " + f1(y - 14) + " " + f1(W * 0.62) + " " + f1(y + 12) + " " + f1(W * 0.46) + " " + f1(y - 2) + "C" + f1(W * 0.4) + " " + f1(y - 8) + " " + f1(W * 0.36) + " " + f1(y - 6) + " " + f1(W * 0.34) + ' ' + f1(y - 12) + '" stroke="' + mau + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    Array.from({ length: 7 }, (_, i) => '<circle cx="' + f1(W * (0.76 - i * 0.06)) + '" cy="' + f1(y - 6 + (i % 2) * 7) + '" r=".9" fill="#a8b8d8" opacity=".5"/>').join("") + "</g>";

  /** Cá lồng đèn với mồi sáng. */
  function lonDen(x, y, s) {
    return '<g transform="translate(' + f1(x) + " " + f1(y) + ") scale(" + s + ')"><g class="jl-nhay"><ellipse rx="7" ry="5.4" fill="#0b1326"/><path d="M-6 0L-12 -5V5z" fill="#0b1326"/><path d="M3 -5Q6 -13 11 -12" stroke="#0e1a32" stroke-width=".7" fill="none"/>' +
      '<circle class="jl-nhip" cx="11" cy="-12" r="1.6" fill="#ffe27a"/><circle cx="11" cy="-12" r="4.2" fill="#ffe27a" opacity=".2"/><circle cx="3" cy="-1" r="1.1" fill="#ffe27a"/><path d="M2 3l1.2-1.2l1.2 1.2l1.2-1.2l1.2 1.2" stroke="#dfe8ff" stroke-width=".5" fill="none"/></g></g>';
  }

  /** San hô cành, quạt, não. */
  function sanHo(W, y, seed, tong, cao) {
    const r = gieo(seed), MAU = ["#ff6f91", "#ffb454", "#ff8a5c", "#e87bb0", "#b678e0", "#ffd166"];
    let s = "";
    for (let i = 0; i < tong; i++) {
      const x = W * (i + 0.2 + r() * 0.6) / tong, h = cao * (0.5 + r() * 0.7), m = MAU[(r() * MAU.length) | 0];
      if (i % 3 === 0) s += '<g class="jl-lac-nhe" style="animation-delay:-' + f1(r() * 4) + 's"><path d="M' + f1(x) + " " + y + "v-" + f1(h) + "M" + f1(x) + " " + f1(y - h * 0.5) + "l-" + f1(h * 0.34) + "-" + f1(h * 0.34) + "M" + f1(x) + " " + f1(y - h * 0.7) + "l" + f1(h * 0.3) + "-" + f1(h * 0.3) + '" stroke="' + m + '" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>';
      else if (i % 3 === 1) s += '<path d="M' + f1(x - h * 0.4) + " " + y + "q" + f1(h * 0.4) + "-" + f1(h * 1.5) + " " + f1(h * 0.8) + ' 0z" fill="' + m + '"/><path d="M' + f1(x - h * 0.2) + " " + (y - 1) + "q" + f1(h * 0.2) + "-" + f1(h * 0.6) + " " + f1(h * 0.4) + ' 0" stroke="#fff" stroke-width=".3" fill="none" opacity=".5"/>';
      else s += '<circle cx="' + f1(x) + '" cy="' + (y - 1.4) + '" r="' + f1(h * 0.34) + '" fill="' + m + '"/><circle cx="' + f1(x - 0.8) + '" cy="' + (y - 2) + '" r="' + f1(h * 0.14) + '" fill="#fff" opacity=".25"/>';
    }
    return s;
  }

  /** Rong biển dài đung đưa. */
  function tao(W, y, n, seed, mau, cao) {
    const r = gieo(seed);
    let s = "";
    for (let i = 0; i < n; i++) {
      const x = W * (i + 0.3 + r() * 0.5) / n, h = cao * (0.6 + r() * 0.6);
      s += '<g class="jl-lac" style="transform-origin:' + f1(x) + "px " + y + "px;animation-delay:-" + f1(r() * 4) + "s;animation-duration:" + f1(4 + r() * 3) + 's"><path d="M' + f1(x) + " " + y + "c-3-" + f1(h * 0.3) + " 3-" + f1(h * 0.5) + " 0-" + f1(h * 0.7) + "c-3-" + f1(h * 0.18) + " 2-" + f1(h * 0.3) + " 0-" + f1(h) + '" fill="none" stroke="' + mau + '" stroke-width="' + f1(1.2 + r() * 0.9) + '" stroke-linecap="round"/></g>';
    }
    return s;
  }

  const bot = (W, n, seed, op) => {
    const r = gieo(seed);
    let s = "";
    for (let i = 0; i < n; i++) s += '<circle class="jl-noi" style="animation-delay:-' + f1(r() * 8) + "s;animation-duration:" + f1(6 + r() * 5) + 's" cx="' + f1(r() * W) + '" cy="103" r="' + f1(0.3 + r() * 0.8) + '" fill="none" stroke="#fff" stroke-width=".25" opacity="' + (op || 0.7) + '"/>';
    return s;
  };

  const tiaNang = (W, n, op, x0) => {
    let s = "";
    for (let i = 0; i < n; i++) {
      const x = (x0 == null ? 0 : x0) + W * (i + 0.4) / n;
      s += '<g class="jl-lac" style="transform-origin:' + f1(x) + 'px 0;animation-delay:-' + (i * 1.3) + 's"><path d="M' + f1(x) + " 0l" + f1(5 + i) + " 0l-" + f1(11 + i * 1.4) + " 100h-" + f1(7 + i) + 'z" fill="url(#IDr)" opacity="' + op + '"/></g>';
    }
    return s;
  };

  /* =========================================================================== N3 · PHÚ SĨ (từ chân lên đỉnh) */

  const N3 = [
    // 1 · Chân núi: đêm xanh, Phú Sĩ khổng lồ phía xa, làng nhỏ, torii, đom đóm
    (W, id) => {
      const r = gieo(11);
      const nha = Array.from({ length: Math.max(6, Math.round(W / 11)) }, (_, i) => {
        const x = 4 + i * (W - 8) / Math.max(6, Math.round(W / 11)) + r() * 3, h = 3.4 + r() * 2.6;
        return '<g><path d="M' + f1(x) + " 92v-" + f1(h) + "l" + f1(2.6) + "-2.4l" + f1(2.6) + " 2.4v" + f1(h) + 'z" fill="#0a0f26"/><rect class="jl-nhip" style="animation-delay:-' + f1(r() * 3) + 's" x="' + f1(x + 1.9) + '" y="' + f1(92 - h + 1.4) + '" width="1.5" height="1.6" fill="#ffd166"/></g>';
      }).join("");
      const dom = Array.from({ length: 16 }, (_, i) => '<circle class="jl-tw" style="animation-delay:' + f1(r() * 2.4) + 's;animation-duration:' + f1(1.8 + r() * 2) + 's" cx="' + f1(r() * W) + '" cy="' + f1(66 + r() * 28) + '" r=".5" fill="#d8ff7a"/>').join("");
      return khung(id, W, "#060c2a", "#21346b",
        sao(W, 46, 3, 50, 0.9) + '<g class="jl-nhip" style="animation-duration:7s"><circle cx="' + f1(W * 0.16) + '" cy="13" r="3.4" fill="#fff6d0"/><circle cx="' + f1(W * 0.16 + 1.2) + '" cy="12.2" r="3" fill="#10204c"/></g>' +
        dayNui(W, 60, 9, 5, "#1a2850", 0.8) + fuji(id + "f", W * 0.6, 20, W > 90 ? 0.58 : 0.5, 0, 1) + suong(W, 70, 0.14, 24) + dayNui(W, 80, 4, 8, "#0d1634", 1) +
        nha + '<g fill="#d8433a" transform="translate(' + f1(W * 0.2) + ' 79)"><rect x="0" y="3" width="1" height="11"/><rect x="8" y="3" width="1" height="11"/><path d="M-1.4 2.4Q4.5 4 10.4 2.4V4.2Q4.5 5.8 -1.4 4.2z"/><rect x="1" y="6" width="7" height="1"/></g>' +
        '<g class="jl-nhip" style="animation-duration:3s"><circle cx="' + f1(W * 0.2 + 4.5) + '" cy="88" r="5" fill="#ffd25a" opacity=".2"/></g>' + dom +
        '<g class="jl-lac-nhe">' + rung(W, 100, Math.round(W / 6), 17, "#050a1c", 10, 20) + "</g>");
    },
    // 2 · Rừng tùng sương mù
    (W, id) => khung(id, W, "#0b2326", "#1c4a44",
      '<g opacity=".9"><circle cx="' + f1(W * 0.8) + '" cy="14" r="4" fill="#cfeee0" opacity=".25"/></g>' + fuji(id + "f", W * 0.78, 20, 0.34, 0.1, 0.35) +
      rung(W, 62, Math.round(W / 4), 21, "#17403f", 12, 22, 0.8) + suong(W, 52, 0.18, 30) + rung(W, 80, Math.round(W / 6), 23, "#0f302f", 18, 32, 0.95) + suong(W, 70, 0.16, 18) +
      tiaNang(W, 5, 0.1).replace(/IDr/g, id + "r") +
      '<g class="jl-lac-nhe"><rect x="-1" y="0" width="' + f1(W * 0.08) + '" height="100" fill="#0a1e1e"/><rect x="' + f1(W * 0.93) + '" y="0" width="' + f1(W * 0.09) + '" height="100" fill="#0a1e1e"/>' +
      rung(W, 104, Math.round(W / 8), 27, "#06161a", 26, 44) + "</g>" +
      '<g class="jl-nhap"><ellipse cx="' + f1(W * 0.34) + '" cy="68" rx="1.1" ry=".7" fill="#ffe27a"/><ellipse cx="' + f1(W * 0.34 + 3.6) + '" cy="68" rx="1.1" ry=".7" fill="#ffe27a"/><circle cx="' + f1(W * 0.34 + 1.8) + '" cy="68" r="5.4" fill="#ffe27a" opacity=".08"/></g>' +
      Array.from({ length: 10 }, (_, i) => '<path class="jl-roi" style="left:0;animation-delay:-' + i * 1.6 + 's;animation-duration:' + (8 + i % 4) + 's" d="M' + f1(W * (i + 0.5) / 10) + ' -3l1.6 .8" stroke="#8ccf9a" stroke-width=".4" opacity=".7"/>').join("")),
    // 3 · Suối trong vắt: thác nước, dòng suối, đá rêu, tre, chuồn chuồn
    (W, id) => {
      const r = gieo(31);
      const da = Array.from({ length: Math.round(W / 14) }, (_, i) => '<ellipse cx="' + f1(r() * W) + '" cy="' + f1(80 + r() * 16) + '" rx="' + f1(3 + r() * 4) + '" ry="' + f1(2 + r() * 2) + '" fill="' + (i % 2 ? "#6e8f6a" : "#7f9d84") + '"/>').join("");
      const tre = Array.from({ length: 6 }, (_, i) => '<g class="jl-lac" style="transform-origin:' + f1(W * (0.78 + i * 0.035)) + 'px 100px;animation-delay:-' + i * 0.7 + 's"><rect x="' + f1(W * (0.78 + i * 0.035)) + '" y="' + (28 + i * 3) + '" width="1.2" height="' + (74 - i * 3) + '" fill="#4f9b5a"/><path d="M' + f1(W * (0.78 + i * 0.035)) + ' ' + (40 + i * 4) + 'l5 -2M' + f1(W * (0.78 + i * 0.035)) + ' ' + (54 + i * 3) + 'l-5 -2" stroke="#6ec27a" stroke-width=".7"/></g>').join("");
      return khung(id, W, "#8fd3f0", "#4d9a8a",
        '<circle cx="' + f1(W * 0.84) + '" cy="14" r="6" fill="#fff6d0" opacity=".7"/>' + dayNui(W, 56, 12, 33, "#5f9c86", 0.55) + dayNui(W, 66, 8, 34, "#3f7d6a", 0.8) +
        '<g><path d="M' + f1(W * 0.1) + " 20h" + f1(W * 0.2) + 'v56h-' + f1(W * 0.2) + 'z" fill="#4a5f66"/><path d="M' + f1(W * 0.1) + " 20l" + f1(W * 0.02) + " 30l" + f1(W * 0.02) + ' 26" stroke="#2c3e44" stroke-width="2"/>' +
        '<rect x="' + f1(W * 0.15) + '" y="20" width="' + f1(W * 0.1) + '" height="56" fill="#eaf8ff" opacity=".85"/>' +
        [0, 1, 2, 3].map((i) => '<path class="jl-dong" d="M' + f1(W * (0.16 + i * 0.025)) + " 20v56" + '" stroke="#bfe8ff" stroke-width=".8" stroke-dasharray="4 5" style="animation-duration:' + (0.8 + i * 0.15) + 's"/>').join("") + "</g>" +
        '<ellipse class="jl-nhip" cx="' + f1(W * 0.2) + '" cy="78" rx="' + f1(W * 0.12) + '" ry="3" fill="#dff5ff" opacity=".6" style="animation-duration:2.6s"/>' +
        '<path d="M' + f1(W * 0.1) + ' 78C' + f1(W * 0.3) + " 84 " + f1(W * 0.6) + " 76 " + f1(W * 0.62) + " 88S" + f1(W * 0.4) + " 96 " + f1(W * 0.7) + ' 100L' + f1(W * 0.9) + ' 100L' + f1(W * 0.9) + ' 90C' + f1(W * 0.6) + " 80 " + f1(W * 0.3) + ' 70 ' + f1(W * 0.1) + ' 78z" fill="#7cd0e8" opacity=".9"/>' +
        '<path class="jl-dong" d="M' + f1(W * 0.14) + ' 82C' + f1(W * 0.34) + " 88 " + f1(W * 0.5) + " 84 " + f1(W * 0.56) + ' 92' + '" stroke="#fff" stroke-width=".6" stroke-dasharray="3 6" fill="none" opacity=".7"/>' + da + tre +
        Array.from({ length: 3 }, (_, i) => '<g class="jl-troi-doc" style="animation-delay:-' + i * 1.7 + 's"><g transform="translate(' + f1(W * (0.4 + i * 0.12)) + " " + (60 + i * 6) + ')"><path d="M0 0h4M2 -1.6v3.2" stroke="#3b6fb0" stroke-width=".4"/><path d="M0 -1.6q2 -1 4 0M0 1.6q2 1 4 0" stroke="#fff" stroke-width=".4" opacity=".7"/></g></g>').join("") +
        '<path class="jl-chim" style="animation-duration:22s" d="M0 20q2-2.5 4 0q2-2.5 4 0" fill="none" stroke="#1c2340" stroke-width=".6" stroke-linecap="round"/>' +
        '<g class="jl-lac-nhe">' + Array.from({ length: 6 }, (_, i) => '<path d="M' + f1(W * (0.02 + i * 0.07)) + ' 100q-2-8 -5-12M' + f1(W * (0.02 + i * 0.07)) + ' 100q1-9 4-14M' + f1(W * (0.02 + i * 0.07)) + ' 100q4-6 8-8" stroke="#3f9a52" stroke-width="1.1" fill="none" stroke-linecap="round"/>').join("") + "</g>");
    },
    // 4 · Vách đá rêu phong
    (W, id) => {
      const r = gieo(41);
      const vach = (x0, x1, mau) => '<path d="M' + f1(x0) + " -2L" + f1(x1) + " -2L" + f1(x1 - 4) + " 30L" + f1(x1 + 3) + " 58L" + f1(x1 - 2) + " 80L" + f1(x1 + 1) + " 102L" + f1(x0) + ' 102Z" fill="' + mau + '"/>';
      const reu = Array.from({ length: 9 }, () => '<ellipse cx="' + f1(r() < 0.5 ? r() * W * 0.3 : W * 0.7 + r() * W * 0.3) + '" cy="' + f1(8 + r() * 86) + '" rx="' + f1(2 + r() * 3) + '" ry="' + f1(1 + r() * 1.6) + '" fill="#6aa05a" opacity=".85"/>').join("");
      const day = [0.04, 0.1, 0.9, 0.95].map((f, i) => '<g class="jl-lac" style="transform-origin:' + f1(W * f) + 'px 0;animation-delay:-' + i * 1.1 + 's"><path d="M' + f1(W * f) + ' 0c-2 12 2 22 0 34c-2 12 2 20 0 ' + (30 + i * 4) + '" stroke="#4f8f4a" stroke-width=".9" fill="none"/></g>').join("");
      return khung(id, W, "#6b88a6", "#a9bfcc",
        may(W, 14, 4, 43, "#fff", 0.55, 10) + dayNui(W, 58, 16, 44, "#5c7488", 0.8) +
        '<g class="jl-troi" style="--k:10px;animation-duration:30s"><path d="M' + f1(W * 0.3) + ' 100v-30l8 -4l8 8l10 -6v32z" fill="#7a8a96" opacity=".55"/></g>' +
        vach(-2, W * 0.28, "#3a4a50") + vach(W + 2, W * 0.72, "#43555b") +
        reu + day +
        '<path d="M' + f1(W * 0.28) + ' 40h' + f1(W * 0.06) + 'v3h-' + f1(W * 0.06) + 'z" fill="#2c3a40"/><g transform="translate(' + f1(W * 0.3) + ' 40)"><g class="jl-nhay"><ellipse cx="0" cy="-3" rx="3.2" ry="1.7" fill="#e8e2d2"/><path d="M2.4 -4l1.6 -2.2" stroke="#e8e2d2" stroke-width="1.1" stroke-linecap="round"/><ellipse cx="4.6" cy="-6.6" rx="1.3" ry="1" fill="#e8e2d2"/><path d="M5 -7.4l.2 -1.6M5.8 -7.2l.8 -1.4" stroke="#3a3a3a" stroke-width=".4"/><path d="M-2 -2v2.4M-.8 -1.6v2M1 -1.6v2M2.2 -2v2.4" stroke="#cfc8b8" stroke-width=".7"/></g></g>' +
        '<path class="jl-dong" d="M' + f1(W * 0.72) + ' 10v60" stroke="#dff3ff" stroke-width=".9" stroke-dasharray="3 4" opacity=".7"/>' +
        '<path class="jl-chim" style="animation-duration:26s;animation-delay:-8s" d="M0 30q2-2.5 4 0q2-2.5 4 0" fill="none" stroke="#1c2340" stroke-width=".6"/>' +
        Array.from({ length: 5 }, (_, i) => '<circle class="jl-roi" style="left:0;animation-delay:-' + i * 2.1 + 's;animation-duration:7s" cx="' + f1(W * (0.35 + i * 0.07)) + '" cy="30" r=".5" fill="#7a8a96"/>').join("") + suong(W, 90, 0.35, 20));
    },
    // 5 · Trạm năm: quán trà + đèn lồng, khói, biển mây phía dưới, hoàng hôn
    (W, id) => khung(id, W, "#2e3270", "#f0a07a",
      sao(W, 14, 51, 24, 0.7) + '<g class="jl-nhip" style="animation-duration:6s"><circle cx="' + f1(W * 0.78) + '" cy="46" r="30" fill="url(#' + id + 'g)" opacity=".8"/></g><circle cx="' + f1(W * 0.78) + '" cy="46" r="5" fill="#fff0c0"/>' +
      dayNui(W, 64, 10, 53, "#6b4a58", 0.9) + '<path d="M-2 100L-2 70Q' + f1(W * 0.4) + " 60 " + f1(W + 2) + ' 40V102Z" fill="#7a4e4a"/><path d="M-2 100L-2 80Q' + f1(W * 0.4) + " 72 " + f1(W + 2) + ' 56V102Z" fill="#5c3a3e"/>' +
      '<g transform="translate(' + f1(W * 0.34) + ' 56)"><rect x="0" y="12" width="24" height="16" fill="#5a3a2a"/><path d="M-4 12L12 2L28 12z" fill="#3a2418"/><rect class="jl-nhip" x="3" y="16" width="5" height="6" fill="#ffd166"/><rect class="jl-nhip" x="16" y="16" width="5" height="6" fill="#ffd166" style="animation-delay:-1s"/><rect x="9" y="18" width="6" height="10" fill="#2a180e"/>' +
      '<rect x="-8" y="2" width="9" height="12" rx="1" fill="#fff"/><text x="-3.5" y="10.4" font-size="5" text-anchor="middle" fill="#c8453a" font-family="serif">五</text>' +
      '<g class="jl-nhip" style="animation-duration:2.4s"><circle cx="3" cy="14" r="4" fill="#ff7a5a" opacity=".3"/></g><circle cx="3" cy="14" r="1.6" fill="#e0453a"/><circle cx="21" cy="14" r="1.6" fill="#e0453a"/>' +
      '<g class="jl-khoi-lon"><circle cx="20" cy="-2" r="2.4" fill="#fff" opacity=".6"/><circle cx="22" cy="-6" r="3" fill="#fff" opacity=".4"/></g></g>' +
      '<path d="M-2 100L-2 90L' + f1(W * 0.5) + ' 82L' + f1(W + 2) + ' 70V102Z" fill="#6a4048"/>' + Array.from({ length: 6 }, (_, i) => '<rect x="' + f1(W * 0.3 + i * 4) + '" y="' + (84 - i * 1.2) + '" width="5" height="2" fill="#8a6068"/>').join("") +
      bienMay(W, 84, "#ffe4d2", 0.92, 5, 36) + bienMay(W, 91, "#ffd0c0", 0.95, 4, 48) +
      '<path class="jl-chim" style="animation-duration:20s" d="M0 24q2-2.5 4 0q2-2.5 4 0" fill="none" stroke="#2a2040" stroke-width=".6"/>'),
    // 6 · Đường đá núi lửa: đá đen nứt đỏ, tàn lửa bay, hơi nước, hai sinh vật lửa
    (W, id) => {
      const r = gieo(61);
      const nut = [[0.12, 40], [0.34, 52], [0.55, 44], [0.78, 58], [0.9, 38]].map((p, i) => '<path d="M' + f1(W * p[0]) + " " + p[1] + "l3 8l-2 6l4 9l-1 8" + '" stroke="#ff5a2a" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".3"/><path class="jl-nhip" style="animation-delay:-' + i * 0.7 + 's" d="M' + f1(W * p[0]) + " " + p[1] + "l3 8l-2 6l4 9l-1 8" + '" stroke="#ffb454" stroke-width=".7" fill="none" stroke-linecap="round"/>').join("");
      const tan = Array.from({ length: 22 }, () => '<circle class="jl-noi" style="animation-delay:-' + f1(r() * 8) + "s;animation-duration:" + f1(4 + r() * 4) + 's" cx="' + f1(r() * W) + '" cy="' + f1(70 + r() * 36) + '" r="' + f1(0.25 + r() * 0.35) + '" fill="#ff9a3a"/>').join("");
      const lua = (x, y, m) => '<g transform="translate(' + f1(x) + " " + y + ')"><g class="jl-nhay"><path d="M0 4C-3 4 -4 0 -2 -3C-1 -1 0 -2 0 -5C3 -2 4 1 3 3C2 5 1 4 0 4z" fill="' + m + '"/><circle cx="-.8" cy="1" r=".4" fill="#2a0a0a"/><circle cx="1" cy="1" r=".4" fill="#2a0a0a"/></g></g>';
      return khung(id, W, "#230d1c", "#8a3a3a",
        sao(W, 14, 62, 26, 0.5) + '<g class="jl-troi" style="--k:14px;animation-duration:38s"><ellipse cx="' + f1(W * 0.3) + '" cy="16" rx="' + f1(W * 0.3) + '" ry="5" fill="#3a1a2a" opacity=".8"/></g>' +
        '<g class="jl-troi" style="--k:-14px;animation-duration:30s"><ellipse cx="' + f1(W * 0.75) + '" cy="26" rx="' + f1(W * 0.3) + '" ry="4.4" fill="#4a2030" opacity=".7"/></g>' +
        dayNui(W, 50, 14, 63, "#2a1218", 0.9) +
        '<path d="M-2 102L-2 58L' + f1(W * 0.5) + ' 46L' + f1(W + 2) + ' 30V102Z" fill="#1b0f14"/><path d="M-2 102L-2 78L' + f1(W * 0.4) + ' 70L' + f1(W + 2) + ' 62V102Z" fill="#120a0e"/>' +
        Array.from({ length: Math.round(W / 8) }, (_, i) => '<path d="M' + f1(r() * W) + " " + f1(60 + r() * 38) + "l" + f1(2 + r() * 3) + " -" + f1(2 + r() * 2) + "l" + f1(2 + r() * 3) + ' 2z" fill="#2a1a22"/>').join("") + nut +
        [0.22, 0.6, 0.84].map((f, i) => '<g class="jl-khoi-lon" style="animation-delay:-' + i * 1.4 + 's"><circle cx="' + f1(W * f) + '" cy="60" r="2.4" fill="#fff" opacity=".5"/><circle cx="' + f1(W * f + 1) + '" cy="55" r="3.2" fill="#fff" opacity=".3"/></g>').join("") + tan + lua(W * 0.36, 84, "#ff7a3a") + lua(W * 0.46, 88, "#ffb454"));
    },
    // 7 · Trên biển mây: nắng sớm, cá voi mây, đỉnh núi nhô lên
    (W, id) => khung(id, W, "#2a2060", "#ffd2a0",
      sao(W, 22, 71, 28, 0.8) + '<g class="jl-nhip" style="animation-duration:6s"><circle cx="' + f1(W * 0.3) + '" cy="68" r="34" fill="url(#' + id + 'g)"/></g><circle cx="' + f1(W * 0.3) + '" cy="68" r="6.4" fill="#fff4cc"/>' +
      fuji(id + "f", W * 0.74, 38, 0.4, 0.75, 0.9) +
      may(W, 26, 3, 73, "#ffd6e8", 0.45, 12) + bienMay(W, 66, "#ffb7a8", 0.55, 5, 60) +
      '<g transform="translate(' + f1(W * 0.62) + ' 56)"><g class="jl-boi2" style="--x0:-' + f1(W * 0.7) + 'px;--x1:' + f1(W * 0.5) + 'px;animation-duration:70s"><g class="jl-nhay"><g fill="#fff" opacity=".95"><ellipse cx="0" cy="0" rx="14" ry="5"/><ellipse cx="-4" cy="-2" rx="8" ry="4"/><ellipse cx="6" cy="1" rx="8" ry="3.4"/><path d="M-12 0q-6 -6 -9 -3q2 3 4 3q-3 1 -4 4q4 1 9 -4z"/></g><circle cx="9" cy="-1" r=".7" fill="#4a3a6a"/><path d="M6 1.6q3 1.4 6 0" stroke="#e6b8c8" stroke-width=".5" fill="none"/></g></g></g>' +
      bienMay(W, 74, "#fff2ea", 0.95, 5, 38) + bienMay(W, 83, "#ffe6dc", 0.98, 4, 50) + bienMay(W, 92, "#fff", 1, 6, 62) +
      '<path class="jl-chim" style="animation-duration:19s" d="M0 40q2-2.5 4 0q2-2.5 4 0" fill="none" stroke="#3a2a5a" stroke-width=".6"/><path class="jl-chim" style="animation-duration:23s;animation-delay:-9s" d="M0 46q2-2.5 4 0q2-2.5 4 0" fill="none" stroke="#3a2a5a" stroke-width=".6"/>'),
    // 8 · Gió buốt: trời trong, cực quang, tuyết bay, nàng tuyết
    (W, id) => {
      const r = gieo(81);
      const gio = Array.from({ length: 14 }, (_, i) => '<path class="jl-gio" style="animation-delay:-' + f1(r() * 4) + "s;animation-duration:" + f1(1.6 + r() * 1.6) + 's" d="M0 ' + f1(8 + r() * 80) + "h" + f1(6 + r() * 12) + '" stroke="#fff" stroke-width=".35" opacity=".7"/>').join("");
      const tuyet = Array.from({ length: 26 }, (_, i) => '<circle class="jl-roi" style="left:0;animation-delay:-' + f1(r() * 8) + "s;animation-duration:" + f1(4 + r() * 3) + 's" cx="' + f1(r() * W) + '" cy="-3" r="' + f1(0.25 + r() * 0.45) + '" fill="#fff"/>').join("");
      return khung(id, W, "#9fd0f5", "#f8d8e4",
        '<g class="jl-nhip" style="animation-duration:6s"><path d="M0 22C' + f1(W * 0.2) + " 4 " + f1(W * 0.4) + " 34 " + f1(W * 0.6) + " 16S" + f1(W * 0.9) + " 12 " + f1(W + 4) + ' 26" stroke="#7dffcf" stroke-width="6" fill="none" opacity=".25" stroke-linecap="round"/><path d="M0 30C' + f1(W * 0.25) + " 14 " + f1(W * 0.45) + " 40 " + f1(W * 0.65) + " 24S" + f1(W * 0.95) + " 22 " + f1(W + 4) + ' 34" stroke="#ff9ae8" stroke-width="4" fill="none" opacity=".22" stroke-linecap="round"/></g>' +
        may(W, 36, 3, 83, "#fff", 0.6, 12) + dayNui(W, 64, 18, 84, "#c5dcf4", 0.9) + dayNui(W, 76, 12, 85, "#e8f2ff", 1) +
        '<path d="M-2 102L-2 80L' + f1(W * 0.3) + ' 70L' + f1(W * 0.62) + ' 60L' + f1(W + 2) + ' 44V102Z" fill="#dcecff"/><path d="M-2 102L-2 90L' + f1(W * 0.4) + ' 84L' + f1(W + 2) + ' 72V102Z" fill="#f4faff"/>' +
        Array.from({ length: 8 }, (_, i) => '<path d="M' + f1(W * (0.08 + i * 0.12)) + ' ' + (82 - (i % 3) * 4) + 'l1 6l1 -6M' + f1(W * (0.08 + i * 0.12) + 2.4) + ' ' + (82 - (i % 3) * 4) + 'l.7 4l.7 -4" fill="#bfe3ff" stroke="#bfe3ff" stroke-width=".3"/>').join("") +
        '<g transform="translate(' + f1(W * 0.66) + ' 56)"><g class="jl-nhay"><path d="M0 0c-2 0 -3 3 -3 6l-2 10h10l-2 -10c0 -3 -1 -6 -3 -6z" fill="#fff" opacity=".95"/><circle cx="0" cy="-2" r="2.4" fill="#ffe6ee"/><path d="M-2.6 -3q2.6 -3 5.2 0q0 -3 -2.6 -4q-2.6 1 -2.6 4z" fill="#1c2340"/></g>' +
        '<path class="jl-vay" d="M2 4q8 -2 14 2q-6 0 -8 4q-5 -2 -6 -6z" fill="#7ac8ff" opacity=".85"/></g>' + gio + tuyet);
    },
    // 9 · Sát đỉnh: trời tím cam, sườn tuyết, torii, đèn đá
    (W, id) => khung(id, W, "#20154a", "#ff9a6a",
      sao(W, 30, 91, 40, 0.8) + '<g class="jl-nhip" style="animation-duration:5s"><ellipse cx="' + f1(W * 0.62) + '" cy="82" rx="' + f1(W * 0.5) + '" ry="10" fill="#ff8a4a" opacity=".5"/></g>' +
      dayNui(W, 68, 12, 93, "#3a2a6a", 0.8) +
      '<path d="M-2 102L-2 62Q' + f1(W * 0.5) + " 44 " + f1(W + 2) + ' 30V102Z" fill="#f4f0ff"/><path d="M' + f1(W * 0.5) + ' 102L' + f1(W * 0.56) + ' 48Q' + f1(W * 0.8) + " 40 " + f1(W + 2) + ' 30V102Z" fill="#b9b0e0" opacity=".65"/>' +
      '<path d="M-2 102L-2 80Q' + f1(W * 0.5) + " 66 " + f1(W + 2) + ' 52V102Z" fill="#ffffff" opacity=".9"/>' +
      '<g transform="translate(' + f1(W * 0.5) + ' 40)"><g fill="#d8433a"><rect x="0" y="4" width="1.2" height="14"/><rect x="11" y="4" width="1.2" height="14"/><path d="M-1.8 3.2Q6 5 13.8 3.2V5.4Q6 7.2 -1.8 5.4z"/><rect x="1.4" y="8" width="9.4" height="1.2"/></g><g class="jl-nhip" style="animation-duration:2.6s"><circle cx="6" cy="12" r="8" fill="#ffd25a" opacity=".22"/></g></g>' +
      [0.2, 0.86].map((f, i) => '<g transform="translate(' + f1(W * f) + ' ' + (70 - i * 10) + ')"><rect x="-1" y="2" width="2" height="6" fill="#8a8aa0"/><rect x="-2.4" y="0" width="4.8" height="3" fill="#a0a0b8"/><rect class="jl-nhip" x="-1" y="1" width="2" height="1.6" fill="#ffd166" style="animation-delay:-' + i + 's"/></g>').join("") +
      Array.from({ length: 16 }, (_, i) => '<circle class="jl-tw" style="animation-delay:' + f1(i * 0.37) + 's" cx="' + f1(W * ((i * 37) % 100) / 100) + '" cy="' + f1(48 + ((i * 23) % 48)) + '" r=".3" fill="#fff"/>').join("")),
    // 10 · Đỉnh: bình minh rực rỡ
    (W, id) => khung(id, W, "#4f84dc", "#ffd27a",
      '<g class="jl-quay" style="animation-duration:50s;opacity:.16">' + Array.from({ length: 16 }, (_, i) => '<path d="M' + f1(W * 0.5) + " 62l-2.4 -90h4.8z\" fill=\"#fff3c0\" transform=\"rotate(" + i * 22.5 + " " + f1(W * 0.5) + ' 62)"/>').join("") + "</g>" +
      '<g class="jl-nhip" style="animation-duration:4s"><circle cx="' + f1(W * 0.5) + '" cy="62" r="50" fill="url(#' + id + 'g)"/></g><circle cx="' + f1(W * 0.5) + '" cy="62" r="11" fill="#fff8d6"/>' +
      may(W, 20, 3, 101, "#fff", 0.6, 12) + bienMay(W, 74, "#ffe9c4", 0.9, 5, 44) + bienMay(W, 82, "#fff4de", 1, 5, 58) +
      '<path d="M-2 102L-2 84Q' + f1(W * 0.2) + " 76 " + f1(W * 0.36) + " 82T" + f1(W * 0.5) + " 80T" + f1(W * 0.7) + " 82T" + f1(W + 2) + ' 78V102Z" fill="#6a5a8a"/><path d="M-2 102L-2 92Q' + f1(W * 0.3) + " 86 " + f1(W * 0.6) + " 90T" + f1(W + 2) + ' 88V102Z" fill="#3e2e5c"/>' +
      '<path d="M' + f1(W * 0.3) + ' 82v-12" stroke="#fff" stroke-width=".5"/><path class="jl-vay" d="M' + f1(W * 0.3) + ' 70l8 2.4l-8 2.4z" fill="#ff4a5a"/>' +
      '<g transform="translate(' + f1(W * 0.72) + ' 70)"><g fill="#d8433a"><rect x="0" y="4" width="1.2" height="12"/><rect x="10" y="4" width="1.2" height="12"/><path d="M-1.8 3.2Q5.6 5 13 3.2V5.2Q5.6 7 -1.8 5.2z"/></g></g>' +
      Array.from({ length: 12 }, (_, i) => '<ellipse class="jl-roi" style="left:0;animation-delay:-' + f1(i * 1.1) + 's;animation-duration:' + (7 + i % 4) + 's" cx="' + f1(W * (i + 0.5) / 12) + '" cy="-3" rx=".9" ry=".5" fill="' + (i % 2 ? "#ffc2d6" : "#fff2a0") + '"/>').join("") +
      Array.from({ length: 12 }, (_, i) => '<path class="jl-tw" style="animation-delay:' + f1(i * 0.31) + 's" d="M' + f1(W * ((i * 31) % 100) / 100) + " " + f1(10 + (i * 17) % 50) + 'h2M' + f1(W * ((i * 31) % 100) / 100 + 1) + " " + f1(9 + (i * 17) % 50) + 'v2" stroke="#fff" stroke-width=".3"/>').join("") +
      '<path class="jl-chim" style="animation-duration:18s" d="M0 30q2-2.5 4 0q2-2.5 4 0" fill="none" stroke="#3a2a5a" stroke-width=".6"/><path class="jl-chim" style="animation-duration:22s;animation-delay:-7s" d="M0 36q2-2.5 4 0q2-2.5 4 0" fill="none" stroke="#3a2a5a" stroke-width=".6"/>')
  ];

  /* =========================================================================== N2 · OKINAWA (từ mặt biển xuống đáy) */

  const N2 = [
    // 1 · 10m: rạn san hô nông, cá hề, rùa, sóng trên mặt
    (W, id) => khung(id, W, "#6fe3ef", "#2aa3c8",
      '<path class="jl-song" d="M-30 3q4-3 8 0' + "t8 0".repeat(Math.ceil((W + 60) / 8)) + 'V-4H-30z" fill="#eafcff" opacity=".6"/>' + tiaNang(W, 5, 0.5).replace(/IDr/g, id + "r") +
      dan(W, 6, 112, 24, 48, "#ffd84a", false, 1) + dan(W, 4, 113, 40, 60, "#c9f0ff", false, 0.8) +
      '<g transform="translate(' + f1(W * 0.22) + ' 66)"><g class="jl-boi2" style="--x0:' + f1(-W * 0.3) + "px;--x1:" + f1(W * 0.9) + 'px;animation-duration:50s"><ellipse cx="0" cy="0" rx="5.4" ry="3.6" fill="#5cb85c"/><path d="M-3 -1.4q3 -2 6 0M-3.4 1q3.4 -2 6.8 0" stroke="#3a8a3a" stroke-width=".4" fill="none"/><ellipse cx="6" cy="-.6" rx="2.2" ry="1.6" fill="#8fd48f"/><circle cx="6.8" cy="-1" r=".4" fill="#10243a"/><ellipse class="jl-chan" cx="-.6" cy="-3.6" rx="3.6" ry="1.2" fill="#8fd48f" transform="rotate(-20 -.6 -3.6)"/><ellipse class="jl-chan" cx="-.6" cy="3.6" rx="3.6" ry="1.2" fill="#8fd48f" transform="rotate(20 -.6 3.6)"/></g></g>' +
      '<g transform="translate(' + f1(W * 0.62) + ' 84)"><g class="jl-lac-nhe"><path d="M0 0c-2 -6 -4 -9 -6 -10M0 0c0 -7 0 -10 1 -12M0 0c2 -6 4 -9 7 -10" stroke="#d9367a" stroke-width="1.4" stroke-linecap="round" fill="none"/></g>' + ca(0, -8, 0.9, "#ff8a2a", 0, false, 2) + "</g>" +
      sanHo(W, 99, 114, Math.round(W / 9), 14) + '<path d="M-2 102V95Q' + f1(W * 0.3) + " 92 " + f1(W * 0.6) + " 96T" + f1(W + 2) + ' 94V102Z" fill="#f0e2b0"/>' + bot(W, 10, 115)),
    // 2 · 20m: rừng tảo bẹ, đuối manta, bầy cá bạc
    (W, id) => khung(id, W, "#3fc4d8", "#1a82ae",
      tiaNang(W, 4, 0.32).replace(/IDr/g, id + "r") + dan(W, 8, 121, 20, 70, "#d8eef8", false, 0.9) +
      manta(W * 0.1, 36, 0.8, "#2a4a6a", W, 70, 20) + tao(W, 101, Math.round(W / 8), 122, "#2f9d5a", 70) + tao(W, 101, Math.round(W / 10), 123, "#46b870", 54) +
      '<g transform="translate(' + f1(W * 0.5) + ' 94)"><circle r="2.6" fill="#6a2a8a"/><path d="M-3 0l-3 2M0 -2.6v-3M3 0l3 2M-2 -2l-2 -3M2 -2l2 -3" stroke="#6a2a8a" stroke-width=".4"/></g>' + bot(W, 12, 124)),
    // 3 · 30m: xác tàu đắm, lươn biển, cua, vòng cá
    (W, id) => khung(id, W, "#2aa0c2", "#14688f",
      tiaNang(W, 3, 0.2).replace(/IDr/g, id + "r") + dan(W, 7, 131, 18, 56, "#ffe38a", false, 0.9) +
      '<g transform="translate(' + f1(W * 0.56) + ' 78) rotate(-9)"><path d="M-34 0H36L28 16H-24z" fill="#1d4458"/><path d="M-34 0L-40 -8L-20 0z" fill="#1d4458"/><rect x="-6" y="-26" width="2.4" height="26" fill="#1d4458"/><path d="M-3.6 -24L16 -10H-3.6z" fill="#27566c" opacity=".85"/><rect x="8" y="-8" width="14" height="9" fill="#1d4458"/>' +
      [-20, -10, 0, 10, 20].map((x) => '<circle class="jl-nhip" cx="' + x + '" cy="6" r="2" fill="#bff6ff" opacity=".6"/>').join("") + '<path d="M30 -2c4 -4 10 -3 12 2" stroke="#1d4458" stroke-width="2" fill="none"/></g>' +
      '<g transform="translate(' + f1(W * 0.56 + 30) + ' 82)"><g class="jl-nhay"><path d="M0 0c4 -3 8 2 12 -1c3 -1 5 1 4 3c-2 2 -6 1 -9 2c-3 1 -6 -1 -7 -4z" fill="#3a5a2a"/><circle cx="14.4" cy="0" r=".4" fill="#fff"/></g></g>' +
      '<g transform="translate(' + f1(W * 0.18) + ' 94)"><g class="jl-nhay"><ellipse rx="3" ry="2" fill="#e0603a"/><path d="M-3 0l-3 -2M3 0l3 -2M-2 1.4l-2 2M2 1.4l2 2" stroke="#e0603a" stroke-width=".5"/><path d="M-3 -1l-3 -3M3 -1l3 -3" stroke="#e0603a" stroke-width="1"/></g></g>' +
      '<g transform="translate(' + f1(W * 0.3) + ' 98)" stroke="#2a4a5a" stroke-width="1" fill="none"><path d="M0 0v-12M-4 -8h8M-3 -12a3 3 0 0 1 6 0"/></g>' +
      tao(W, 101, Math.round(W / 12), 132, "#2a8a5a", 40) + sanHo(W, 99, 133, Math.round(W / 14), 8) + bot(W, 8, 134)),
    // 4 · 40m: hang đá ngầm, CÁ MẬP, cá đuối gai
    (W, id) => khung(id, W, "#2288b0", "#0f5078",
      tiaNang(W, 3, 0.16).replace(/IDr/g, id + "r") +
      '<path d="M-2 102V40Q' + f1(W * 0.1) + " 18 " + f1(W * 0.24) + ' 30Q' + f1(W * 0.3) + " 60 " + f1(W * 0.26) + ' 102Z" fill="#0f4466"/><path d="M' + f1(W * 0.76) + ' 102Q' + f1(W * 0.7) + " 56 " + f1(W * 0.78) + " 26Q" + f1(W * 0.92) + " 16 " + f1(W + 2) + ' 40V102Z" fill="#0e3f5c"/>' +
      '<path d="M' + f1(W * 0.3) + ' -2Q' + f1(W * 0.5) + " 22 " + f1(W * 0.72) + ' -2Z" fill="#0b3550"/>' +
      caMap(W * 0.2, 46, 1.4, "#6f8da3", W, 60, 18) + caMap(W * 0.2, 70, 0.8, "#5a7a92", W, 52, 40) + dan(W, 5, 141, 56, 86, "#ffd84a", false, 0.8) +
      '<g transform="translate(' + f1(W * 0.5) + ' 96)"><g class="jl-nhay"><ellipse rx="5" ry="1.2" fill="#8a7a5a"/><path d="M-5 0l-6 1" stroke="#8a7a5a" stroke-width=".4"/><circle cx="2" cy="-.6" r=".4" fill="#222"/></g></g>' +
      '<g class="jl-nhap"><ellipse cx="' + f1(W * 0.84) + '" cy="60" rx=".9" ry=".6" fill="#7dffcf"/><ellipse cx="' + f1(W * 0.84 + 2.4) + '" cy="60" rx=".9" ry=".6" fill="#7dffcf"/></g>' +
      sanHo(W, 99, 142, Math.round(W / 16), 6) + bot(W, 8, 143)),
    // 5 · 50m: vách đá dựng đứng, bạch tuộc Tako, CÁ MẬP VOI
    (W, id) => {
      const r = gieo(151);
      const vach = '<path d="M-2 -2H' + f1(W * 0.36) + "L" + f1(W * 0.3) + " 24L" + f1(W * 0.38) + " 50L" + f1(W * 0.32) + " 76L" + f1(W * 0.36) + ' 102H-2Z" fill="#0b2e52"/>';
      const ledge = Array.from({ length: 6 }, (_, i) => '<rect x="' + f1(W * 0.2) + '" y="' + (14 + i * 16) + '" width="' + f1(W * 0.16 - (i % 2) * 3) + '" height="1.6" fill="#123e68"/>').join("");
      return khung(id, W, "#1a70a0", "#0a3868",
        tiaNang(W, 3, 0.1).replace(/IDr/g, id + "r") + vach + ledge + bachTuoc(W * 0.3, 40, 1.5, "#d06a8a") +
        '<g transform="translate(' + f1(W * 0.3 + 5) + ' 34)" stroke="#ffd84a" stroke-width=".5">' + [-3, 0, 3].map((d, i) => '<path d="M' + d + " 0l2 -4" + '"/>').join("") + "</g>" +
        caMap(W * 0.5, 30, 2.1, "#54748c", W, 80, 30).replace(/(<path d="M-15 0C-9 -5[^>]*>)/, "$1" + [[-6, -2], [-2, -3], [2, -2.4], [6, -2.8], [-4, 0.4], [0, -0.6], [4, 0.2], [9, -1.4]].map((p) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r=".5" fill="#e8f1f6" opacity=".7"/>').join("")) +
        dan(W, 6, 152, 56, 90, "#c9f0ff", true, 0.8) + sua(W * 0.82, 34, 1.4, "#e9a0ff", 0.7) + bot(W, 10, 153));
    },
    // 6 · 60m: vùng nước tối, Bóng Quên xoáy, CÁ VOI LƯNG GÙ
    (W, id) => khung(id, W, "#12467a", "#050f2e",
      tiaNang(W, 2, 0.06, W * 0.2).replace(/IDr/g, id + "r") + caVoi(W * 0.1, 40, 1.4, "#243b5a", "#3a5578", W, 120, 50, 0.9) +
      [[0.06, 20, 1], [0.94, 80, -1], [0.12, 86, 1], [0.9, 18, -1]].map((p, i) => '<g class="jl-quay" style="animation-duration:' + (26 + i * 7) + 's;animation-direction:' + (p[2] > 0 ? "normal" : "reverse") + '"><path d="M' + f1(W * p[0]) + " " + p[1] + "m-12 0c0 -9 12 -12 18 -6c6 6 -2 14 -10 12c-8 -2 -6 -10 0 -9" + '" stroke="#05060f" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".6"/></g>').join("") +
      '<g class="jl-nhip" style="animation-duration:3.4s"><circle cx="' + f1(W * 0.5) + '" cy="58" r="12" fill="#bfefff" opacity=".07"/></g>' +
      dan(W, 4, 161, 30, 80, "#7dc4ff", true, 0.7) + sua(W * 0.7, 40, 1.2, "#8fb8ff", 0.5) + bot(W, 8, 162, 0.5) + sao(W, 18, 163, 100, 0.5).replace(/#fff/g, "#7dd8ff")),
    // 7 · 70m: đàn cá phát sáng, sứa, cá voi phát sáng
    (W, id) => khung(id, W, "#0b3468", "#030f2a",
      dan(W, 10, 171, 16, 86, "#7dffcf", true, 1) + dan(W, 8, 172, 16, 86, "#ff6ad5", true, 0.9) + dan(W, 5, 173, 24, 80, "#6ac8ff", true, 1.1) +
      [0.14, 0.34, 0.58, 0.8, 0.46].map((f, i) => sua(W * f, 24 + (i * 17) % 50, 1.2 + (i % 3) * 0.4, ["#e9a0ff", "#6bd0ff", "#ff9ae8", "#9ae8ff", "#c8a0ff"][i], 0.8)).join("") +
      caVoi(W * 0.2, 76, 0.7, "#0d2a4a", "#2a5a8a", W, 150, 30, 0.8).replace(/<circle cx="-4" cy="-4"[^>]*>/, "") +
      Array.from({ length: 30 }, (_, i) => '<circle class="jl-tw" style="animation-delay:' + f1(i * 0.3) + 's" cx="' + f1(W * ((i * 37) % 100) / 100) + '" cy="' + f1((i * 23) % 100) + '" r=".28" fill="' + (i % 2 ? "#7dffcf" : "#ff9ae8") + '"/>').join("") + bot(W, 6, 174, 0.4)),
    // 8 · 80m: rãnh sâu, xúc tu mực khổng lồ, cá lồng đèn, suối nóng
    (W, id) => khung(id, W, "#071f46", "#02081c",
      '<path d="M-2 -2H' + f1(W * 0.22) + "L" + f1(W * 0.16) + " 30L" + f1(W * 0.24) + " 62L" + f1(W * 0.18) + ' 102H-2Z" fill="#030c1e"/><path d="M' + f1(W * 0.82) + ' -2H' + f1(W + 2) + 'V102H' + f1(W * 0.8) + 'L' + f1(W * 0.86) + " 60L" + f1(W * 0.8) + ' 26Z" fill="#030c1e"/>' +
      xucTu(W, 48, "#3a2a5a") + lonDen(W * 0.42, 70, 1.2) + lonDen(W * 0.7, 30, 0.8) +
      [0.1, 0.9].map((f, i) => '<g class="jl-nhip" style="animation-delay:-' + i + 's"><circle cx="' + f1(W * f) + '" cy="96" r="4" fill="#ff7a5a" opacity=".3"/></g><circle cx="' + f1(W * f) + '" cy="96" r="1.2" fill="#ffb454"/>').join("") +
      Array.from({ length: 8 }, (_, i) => '<path class="jl-lac" style="transform-origin:' + f1(W * (0.04 + i * 0.012)) + 'px 100px" d="M' + f1(W * (0.04 + i * 0.012)) + ' 100v-8" stroke="#ff5a7a" stroke-width=".7"/>').join("") + sua(W * 0.56, 22, 1, "#7a6aff", 0.55) + bot(W, 14, 181, 0.4) + sao(W, 14, 182, 100, 0.4).replace(/#fff/g, "#ff9ae8")),
    // 9 · 90m: cửa hang ngọc, tinh thể phát sáng, mồi giả của Ankō
    (W, id) => khung(id, W, "#051a40", "#01061a",
      '<path d="M-2 102V30Q' + f1(W * 0.2) + " 4 " + f1(W * 0.5) + " 10Q" + f1(W * 0.8) + " 4 " + f1(W + 2) + ' 30V102H' + f1(W * 0.74) + "V62Q" + f1(W * 0.5) + " 36 " + f1(W * 0.26) + ' 62V102Z" fill="#030d22"/>' +
      '<g class="jl-nhip" style="animation-duration:3s"><ellipse cx="' + f1(W * 0.5) + '" cy="72" rx="' + f1(W * 0.2) + '" ry="22" fill="#bff6ff" opacity=".22"/></g><ellipse cx="' + f1(W * 0.5) + '" cy="80" rx="' + f1(W * 0.1) + '" ry="12" fill="#e8fcff" opacity=".35"/>' +
      Array.from({ length: Math.round(W / 6) }, (_, i) => '<path d="M' + f1(W * (i + 0.5) / Math.round(W / 6)) + ' 100l1.4 -' + (6 + (i * 7) % 12) + 'l1.4 ' + (6 + (i * 7) % 12) + 'z" fill="#7de8ff" opacity=".5"/>').join("") +
      Array.from({ length: 9 }, (_, i) => '<path d="M' + f1(W * (0.1 + i * 0.1)) + ' 12l1.2 ' + (8 + (i * 5) % 9) + 'l1.2 -' + (8 + (i * 5) % 9) + 'z" fill="#2a5a7a"/>').join("") +
      [0.2, 0.8, 0.3, 0.7].map((f, i) => '<g class="jl-nhip" style="animation-delay:-' + i * 0.6 + 's;animation-duration:1.4s"><circle cx="' + f1(W * f) + '" cy="' + (46 + i * 10) + '" r="1.1" fill="#ffe27a"/><circle cx="' + f1(W * f) + '" cy="' + (46 + i * 10) + '" r="3.2" fill="#ffe27a" opacity=".18"/></g>').join("") +
      '<g transform="translate(' + f1(W * 0.08) + ' 96)" stroke="#324a5a" stroke-width="1.2" fill="none"><path d="M0 0v-14M-5 -9h10M-4 -14a4 4 0 0 1 8 0"/></g>' + dan(W, 4, 191, 24, 90, "#7dffcf", true, 0.9) + bot(W, 10, 192, 0.5)),
    // 10 · Đáy biển: ngọc trai khổng lồ, tụ họp
    (W, id) => khung(id, W, "#04163a", "#01061a",
      '<g class="jl-quay" style="animation-duration:46s;opacity:.3">' + Array.from({ length: 14 }, (_, i) => '<path d="M' + f1(W * 0.5) + " 72l-2 -90h4z\" fill=\"#cdf6ff\" transform=\"rotate(" + i * (360 / 14) + " " + f1(W * 0.5) + ' 72)"/>').join("") + "</g>" +
      '<g class="jl-nhip" style="animation-duration:3s"><circle cx="' + f1(W * 0.5) + '" cy="72" r="38" fill="url(#' + id + 'g)" opacity=".7"/></g>' +
      '<path d="M' + f1(W * 0.5 - 24) + ' 88Q' + f1(W * 0.5 - 30) + ' 60 ' + f1(W * 0.5) + ' 58Q' + f1(W * 0.5 + 30) + " 60 " + f1(W * 0.5 + 24) + ' 88z" fill="#b66a8a"/><path d="M' + f1(W * 0.5 - 24) + ' 88Q' + f1(W * 0.5 - 28) + " 102 " + f1(W * 0.5) + " 102Q" + f1(W * 0.5 + 28) + " 102 " + f1(W * 0.5 + 24) + ' 88z" fill="#8a4a6e"/>' +
      '<path d="M' + f1(W * 0.5 - 22) + ' 86q22 -9 44 0" stroke="#ffd6e8" stroke-width=".7" fill="none" opacity=".7"/>' +
      '<circle cx="' + f1(W * 0.5) + '" cy="78" r="11" fill="#fff"/><circle cx="' + f1(W * 0.5 - 3) + '" cy="74.6" r="3.6" fill="#fff"/><circle cx="' + f1(W * 0.5 - 3) + '" cy="74.6" r="2.6" fill="#d9f6ff"/>' +
      '<g transform="translate(' + f1(W * 0.5 + 22) + ' 90)"><path d="M0 0c0 -6 3 -8 3 -12M3 -12l4 -2M3 -12l-3 -3" stroke="#e8cfa6" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="3" cy="-15" r="2" fill="#e8cfa6"/></g>' +
      caVoi(W * 0.05, 24, 0.7, "#1a3350", "#3a5578", W, 160, 20, 0.7) + caMap(W * 0.1, 46, 0.9, "#4a6a82", W, 76, 10) + manta(W * 0.2, 14, 0.8, "#233f5e", W, 90, 40) + dan(W, 6, 201, 20, 90, "#7dffcf", true, 0.9) +
      [[-34, -16], [30, -18], [38, -2], [-40, -2]].map((q, i) => '<path class="jl-tw" style="animation-delay:' + i * 0.5 + 's" d="M' + f1(W * 0.5 + q[0]) + " " + (80 + q[1]) + "v5M" + f1(W * 0.5 + q[0] - 2.5) + " " + (82.5 + q[1]) + 'h5" stroke="#fff" stroke-width=".4"/>').join("") + bot(W, 14, 202, 0.7))
  ];

  const ZONES = { n3: N3, n2: N2 };

  /**
   * Vẽ khung cảnh thứ `k` (0…9) của màn `monId` cho màn hình có tỉ lệ rộng/cao = `ti`.
   * @returns {string} chuỗi SVG ("" nếu màn chưa có cảnh)
   */
  function ve(monId, k, ti) {
    const z = ZONES[monId];
    if (!z) return "";
    const W = Math.max(40, Math.min(190, Math.round((ti || 1.6) * 100)));
    const f = z[Math.max(0, Math.min(z.length - 1, k))];
    return f(W, "jlG" + monId + k + "_" + W);
  }

  goc.JlptCanhGioi = { ve, SO_KHUNG: 10, ZONES };
})(typeof self !== "undefined" ? self : this);
