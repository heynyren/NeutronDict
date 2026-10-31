/**
 * Chủ đề (theme) của từng màn trong chế độ "Ôn thi JLPT": tên, màu, nhân vật, lời thoại, đồ thu thập và
 * cảnh vẽ bằng SVG. Toàn bộ là DỮ LIỆU + vài hàm vẽ nhỏ — thêm màn mới (N1, N4, N5) chỉ cần thêm một mục vào
 * `MON` và một file dữ liệu; không phải sửa bộ máy chơi.
 *
 * Cảnh vẽ bằng SVG thuần (không ảnh) nên không tăng dung lượng app và không làm nặng máy.
 */
(function (goc) {
  "use strict";

  /** Pha trộn tuyến tính hai màu #rrggbb. t∈[0,1]. */
  function tron(a, b, t) {
    const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    const x = h(a), y = h(b);
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }

  /* ================================================================ N3 · Phú Sĩ */

  /** Điểm trên đường cong Bézier bậc ba; p = [x0,y0, x1,y1, x2,y2, x3,y3]. */
  function bez(p, s) {
    const u = 1 - s, a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s;
    return [a * p[0] + b * p[2] + c * p[4] + d * p[6], a * p[1] + b * p[3] + c * p[5] + d * p[7]];
  }
  const f1 = (n) => (Math.round(n * 10) / 10).toString();

  /** Khung nhìn: hẹp (điện thoại) hoặc rộng 5:1 (màn hình máy tính) — phần rộng thêm là cảnh kéo dài hai bên. */
  const KHUNG = "0 0 360 120", KHUNG_RONG = "-120 0 600 120";

  /** Dãy núi xa nhấp nhô, vẽ từ x0 tới x1; `gieo` làm mỗi lớp một hình khác nhau. */
  function dayNui(y0, bien, gieo, x0, x1) {
    let d = "M" + x0 + " 121L" + x0 + " " + f1(y0);
    for (let x = x0 + 22, i = 0; x <= x1; x += 22 + (i % 3) * 9, i++) {
      const h = Math.sin(i * 1.7 + gieo) * 0.5 + Math.sin(i * 0.63 + gieo * 2) * 0.5;
      d += "L" + x + " " + f1(y0 - h * bien + (i % 2) * 5);
    }
    return d + "L" + (x1 + 30) + " 121Z";
  }

  /** Hai nửa sườn trái của núi (sườn phải đối xứng qua x = 200). Sườn lõm: dốc dần về phía đỉnh, thoải dần về chân. */
  const SUON1 = [-40, 121, 20, 118, 92, 100, 150, 52];
  const SUON2 = [150, 52, 164, 40, 172, 30, 184, 25];
  const THAN = "M-40 121C20 118 92 100 150 52C164 40 172 30 184 25L191 23.2Q200 21.6 209 23.2L216 25C228 30 236 40 250 52C308 100 380 118 440 121Z";

  /** Đường mòn zích-zắc đi lên đỉnh, theo sườn trái. */
  function duongMon() {
    const d = [];
    for (let i = 0; i <= 9; i++) d.push(bez(SUON1, 0.6 + i * 0.044));
    for (let i = 1; i <= 7; i++) d.push(bez(SUON2, i / 7));
    return d.map((q, i) => [q[0] + (i % 2 ? 7 : 2) - (i === d.length - 1 ? 8 : 0), q[1] + 3]);
  }

  /** Cảnh một chương trên núi Phú Sĩ: bầu trời sáng dần từ đêm tới bình minh, mặt trời nhích lên đỉnh núi, người leo đi dần lên mòn. */
  function canhPhuSi(ci, tong, rong) {
    const t = tong > 1 ? ci / (tong - 1) : 0, id = "jlP" + ci;
    const troiTren = tron("#0a1535", "#4f7fd0", t), troiGiua = tron("#1c2c5e", "#e69ab0", t), troiDuoi = tron("#2c3b72", "#ffc890", t);
    const mx = 300 - t * 100, my = 112 - t * 90;            // mặt trời: từ thấp bên phải lên đúng đỉnh núi ("Phú Sĩ kim cương")
    const toi = t < 0.55;
    const sao = toi ? [-100, -60, -20, 18, 46, 74, 112, 138, 232, 262, 296, 322, 344, 168, 90, 390, 430, 470].map((x, i) =>
      '<circle class="jl-tw" style="animation-delay:' + ((i * 0.37) % 2.4).toFixed(2) + 's" cx="' + x + '" cy="' + (8 + (i * 17) % 46) + '" r="' + (0.8 + (i % 3) * 0.4) + '" fill="#fff" opacity="' + (0.95 - t).toFixed(2) + '"/>').join("") : "";
    // dãy núi xa: hai lớp, nhạt dần theo khoảng cách (phối cảnh khí quyển)
    const xa1 = '<path d="' + dayNui(78, 24, 1, -330, 700) + '" fill="' + tron("#34457a", "#b58ab0", t) + '" opacity=".55"/>';
    const xa2 = '<path d="' + dayNui(96, 14, 4, -330, 700) + '" fill="' + tron("#26356a", "#946a98", t) + '" opacity=".75"/>';
    // tuyết: mũ phủ từ đỉnh, mép dưới lởm chởm như những dải chảy theo khe núi
    const sn = 41 + t * 5;
    let mep = "";
    for (let i = 0, x = 292; x >= 108; i++, x -= 9) mep += "L" + x + " " + f1(sn + Math.abs(x - 200) * 0.1 + (i % 2 ? 8 + (i % 3) * 2 : (i * 5) % 4));
    const tuyet = "M108 0H292V" + f1(sn) + mep + "Z";
    const tuyetToi = "M200 0H292V" + f1(sn) + mep.replace(/L(\d+) /g, (m, x) => (+x < 200 ? "L200 " : m)) + "Z";
    const mon = duongMon();
    const nguoi = mon[Math.min(mon.length - 1, Math.round(t * (mon.length - 1)))];
    const monPath = "M" + mon.map((q) => f1(q[0]) + " " + f1(q[1])).join("L");
    // rừng thông ở chân núi (chỉ các chương đầu), đền torii bên trái
    const thong = t < 0.6 ? [-112, -96, -78, -60, -42, -24, 8, 22, 38, 56, 300, 318, 336, 352, 380, 396, 414, 432, 450, 466].map((x, i) => {
      const h = 22 + (i * 7) % 12, y = 121;
      return '<path d="M' + x + " " + y + "l0-" + (h * 0.3) + "l-7 0l7-" + (h * 0.35) + "l-5.5 0l6.5-" + (h * 0.35) + "l-4.5 0L" + x + " " + (y - h - 6) + "L" + (x + 4.5) + " " + (y - h * 0.7) + "l-4.5 0l6.5 " + (h * 0.35) + "l-5.5 0l7 " + (h * 0.35) + "l-7 0l0 " + (h * 0.3) + 'z" fill="' + tron("#0c2418", "#1a2a2a", t) + '"/>';
    }).join("") : "";
    const torii = t < 0.3 ? '<g class="jl-nhip" style="animation-duration:3.4s"><circle cx="108" cy="104" r="9" fill="#ffd25a" opacity=".22"/></g><g fill="#d8433a" transform="translate(98 90)"><rect x="0" y="6" width="2.6" height="25"/><rect x="18" y="6" width="2.6" height="25"/><path d="M-3 4.5Q10 8 23 4.5V8Q10 11 -3 8z"/><rect x="2" y="12" width="16" height="2.2"/></g>' : "";
    // biển mây ở các chương cao
    const bongMay = (y0, d) => { let q = "M-340 " + (y0 + 14); for (let x = -340, i = 0; x < 700; x += 30, i++) q += "q" + (d + (i % 3) * 2) + " -" + (12 + (i % 2) * 5) + " 30 0"; return q + "V130H-340z"; };
    const may = t > 0.55 ? '<g class="jl-troi" style="--k:26px;animation-duration:30s"><path d="' + bongMay(94, 6) + '" fill="#fff" opacity=".92"/></g>' +
      '<g class="jl-troi" style="--k:-22px;animation-duration:42s"><path d="' + bongMay(104, 4) + '" fill="#f4eaf4" opacity=".75"/></g>' : "";
    // sương mù lững lờ ngang sườn núi
    const suong = t < 0.6 ? '<g class="jl-troi" style="--k:34px;animation-duration:24s"><ellipse cx="90" cy="98" rx="70" ry="6" fill="#fff" opacity="' + (0.1 + t * 0.2).toFixed(2) + '"/><ellipse cx="290" cy="88" rx="64" ry="5" fill="#fff" opacity="' + (0.08 + t * 0.2).toFixed(2) + '"/></g>' : "";
    // tia nắng quay chậm quanh mặt trời, ánh lấp lánh trên tuyết, cờ trên đỉnh phấp phới
    const tia = '<g class="jl-quay" style="animation-duration:60s;opacity:' + (0.12 + t * 0.35).toFixed(2) + '">' +
      Array.from({ length: 12 }, (_, i) => '<path d="M' + f1(mx) + " " + f1(my) + "l-3 -70h6z\" fill=\"#fff1b8\" transform=\"rotate(" + i * 30 + " " + f1(mx) + " " + f1(my) + ')"/>').join("") + "</g>";
    const lapLanh = [[188, 31], [205, 29], [214, 37], [194, 40]].map((q, i) => '<path class="jl-tw" style="animation-delay:' + (i * 0.6) + 's" d="M' + q[0] + " " + (q[1] - 3) + "v6M" + (q[0] - 3) + " " + q[1] + 'h6" stroke="#fff" stroke-width="1"/>').join("");
    const manh = [[40, 30, 26], [250, 22, 30], [320, 44, 22]].map((c, i) => '<g class="jl-troi" style="--k:' + (i % 2 ? -30 : 30) + 'px;animation-duration:' + (36 + i * 9) + 's"><ellipse cx="' + c[0] + '" cy="' + c[1] + '" rx="' + c[2] + '" ry="' + (c[2] / 5).toFixed(1) + '" fill="#fff" opacity="' + (0.1 + t * 0.3).toFixed(2) + '"/></g>').join("");
    const chim = t > 0.25 ? [[0, 40], [1, 28], [2, 46]].map((c) => '<path class="jl-chim" style="animation-delay:-' + c[0] * 5 + 's;animation-duration:' + (17 + c[0] * 4) + 's" d="M0 ' + c[1] + 'q4-5 8 0q4-5 8 0" fill="none" stroke="#1c2340" stroke-width="1.4" stroke-linecap="round"/>').join("") : "";
    const canh = t < 0.4 ? [0, 1, 2, 3, 4, 5].map((i) => '<ellipse class="jl-roi" style="left:0;animation-delay:-' + (i * 1.7).toFixed(1) + 's;animation-duration:' + (9 + i) + 's" cx="' + (40 + i * 56) + '" cy="-4" rx="2.4" ry="1.4" fill="#ffc2d6"/>').join("") : "";
    return '<svg viewBox="' + (rong ? KHUNG_RONG : KHUNG) + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + troiTren + '"/><stop offset=".55" stop-color="' + troiGiua + '"/><stop offset="1" stop-color="' + troiDuoi + '"/></linearGradient>' +
      '<radialGradient id="' + id + 's"><stop offset="0" stop-color="#fff6cf"/><stop offset=".3" stop-color="#ffd985" stop-opacity=".85"/><stop offset="1" stop-color="#ff9a5a" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + tron("#5468a8", "#c0869e", t) + '"/><stop offset=".55" stop-color="' + tron("#2f3f78", "#7c5a8e", t) + '"/><stop offset="1" stop-color="' + tron("#1a2552", "#4a3a68", t) + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9e6ff"/></linearGradient>' +
      '<clipPath id="' + id + 'c"><path d="' + THAN + '"/></clipPath></defs>' +
      '<rect x="-400" width="1160" height="120" fill="url(#' + id + 'a)"/>' + sao +
      '<g class="jl-nhip" style="animation-duration:5s"><circle cx="' + f1(mx) + '" cy="' + f1(my) + '" r="' + (34 + t * 12).toFixed(0) + '" fill="url(#' + id + 's)" opacity="' + (0.4 + t * 0.6).toFixed(2) + '"/></g>' +
      '<circle cx="' + f1(mx) + '" cy="' + f1(my) + '" r="' + (8 + t * 3).toFixed(1) + '" fill="#fff2c0" opacity="' + (0.55 + t * 0.45).toFixed(2) + '"/>' + tia +
      manh + xa1 + xa2 + chim +
      '<path d="' + THAN + '" fill="url(#' + id + 'b)"/>' +
      '<g clip-path="url(#' + id + 'c)">' +
        '<path d="M200 0L196 30L206 70L200 121H440V0Z" fill="#0a1030" opacity=".3"/>' +                       // nửa tối của núi
        '<path d="M150 70C170 90 160 100 176 121M232 60C238 80 252 96 262 121M120 96C150 100 168 110 178 121" stroke="#0a1030" stroke-width="3" fill="none" opacity=".18"/>' +   // khe núi
        '<path d="' + tuyet + '" fill="url(#' + id + 'w)"/>' +
        '<path d="' + tuyetToi + '" fill="#9fb4e6" opacity=".55"/>' +
        '<path d="M-40 121C20 118 92 100 150 52" stroke="#fff" stroke-width="1" fill="none" opacity="' + (0.15 + t * 0.35).toFixed(2) + '"/>' +   // viền sáng sườn hướng mặt trời
      "</g>" +
      '<ellipse cx="200" cy="23.2" rx="9" ry="1.6" fill="#7f90c4" opacity=".7"/>' + lapLanh +
      '<g class="jl-khoi"><circle cx="200" cy="20" r="3" fill="#fff" opacity=".5"/><circle cx="203" cy="15" r="2.4" fill="#fff" opacity=".35"/></g>' +                          // miệng núi lửa
      suong +
      '<path class="jl-dash" d="' + monPath + '" fill="none" stroke="#ffe9a8" stroke-width="1.3" stroke-dasharray="2.4 2.6" stroke-linecap="round" opacity=".9"/>' +
      '<g class="jl-nhip" style="animation-duration:1.6s"><circle cx="' + f1(nguoi[0]) + '" cy="' + f1(nguoi[1]) + '" r="5.5" fill="#ffd25a" opacity=".5"/></g>' +
      '<g class="jl-nhay"><circle cx="' + f1(nguoi[0]) + '" cy="' + f1(nguoi[1]) + '" r="2.6" fill="#ff5a5a" stroke="#fff" stroke-width="1"/></g>' +
      (t > 0.97 ? '<path d="M200 23V9" stroke="#fff" stroke-width="1"/><path class="jl-vay" d="M200 9l12 3.4L200 16z" fill="#ff4a5a"/>' : "") +
      '<path d="M-340 121L-340 116Q-200 106 -100 114T80 112T150 116T290 112T440 114T700 112V121Z" fill="' + tron("#102a22", "#2a2e3e", t) + '"/>' +
      '<g class="jl-lac-nhe">' + thong + "</g>" + torii + may + canh + "</svg>";
  }

  /* ============================================================ N2 · Okinawa */

  /** Một con cá bơi ngang (đuôi quay về bên trái). */
  function ca(x, y, s, mau, d, sang) {
    return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')"><g class="jl-boi" style="animation-delay:-' + d + "s;animation-duration:" + (14 + d) + 's">' +
      (sang ? '<circle r="11" fill="' + mau + '" opacity=".25"/>' : "") +
      '<ellipse rx="8.5" ry="4.2" fill="' + mau + '"/><path d="M-7 0L-14 -4.6V4.6z" fill="' + mau + '"/><path d="M-1 -4L2 -8L4 -3.5z" fill="' + mau + '" opacity=".8"/><circle cx="4.6" cy="-1" r="1" fill="#10243a"/></g></g>';
  }

  /** Cảnh một tầng nước: càng xuống sâu càng tối, san hô sặc sỡ ở tầng nông, cá phát sáng ở tầng sâu, ngọc trai ở tầng cuối. */
  function canhOkinawa(ci, tong, rong) {
    const t = tong > 1 ? ci / (tong - 1) : 0, id = "jlO" + ci;
    const tren = tron("#4fd0e0", "#040d2c", t), duoi = tron("#1a86b0", "#01061c", t);
    const tia = t < 0.7 ? [30, 100, 170, 240, 310].map((x, i) =>
      '<g class="jl-lac" style="transform-origin:' + x + 'px 0;animation-delay:-' + i * 1.3 + 's"><path d="M' + x + ' 0l' + (16 + i * 2) + ' 0l-' + (34 + i * 4) + ' 120h-' + (22 + i * 2) + 'z" fill="url(#' + id + 'r)" opacity="' + (0.5 * (1 - t / 0.7)).toFixed(2) + '"/></g>').join("") : "";
    const mat = t < 0.3 ? '<path class="jl-song" d="M-340 4q15-6 30 0' + "t30 0".repeat(36) + 'V-4H-340z" fill="#e8fdff" opacity="' + (0.65 - t).toFixed(2) + '"/>' : "";
    const san = t < 0.6 ? [
      '<g stroke="#ff6f91" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".95"><path d="M28 121V98M28 106l-9-12M28 100l9-10M19 94l-3-7M37 90l3-8"/></g>',
      '<g stroke="#ffb454" stroke-width="3" fill="none" stroke-linecap="round"><path d="M64 121V104M64 110l-7-9M64 106l8-9"/></g>',
      '<path d="M248 121q0-26 20-26t20 26z" fill="#e87bb0"/><path d="M256 114q12-10 24 0M260 120q8-7 16 0" stroke="#c4568a" stroke-width="1.6" fill="none"/>',
      '<g stroke="#ff8a5c" stroke-width="3.4" fill="none" stroke-linecap="round"><path d="M318 121V96M318 106l10-13M318 100l-9-11M328 93l3-8M309 89l-3-7"/></g>',
      '<g fill="#b678e0" opacity=".9"><circle cx="294" cy="116" r="5"/><circle cx="302" cy="113" r="4"/><circle cx="288" cy="113" r="3.4"/></g>'
    ].join("") : "";
    const them = rong && t < 0.62 ? [-108, -84, -60, -34, 380, 406, 432, 458].map((x, i) => i % 3 === 0
      ? '<g class="jl-lac" style="transform-origin:' + x + 'px 121px;animation-delay:-' + i + 's"><path d="M' + x + ' 121c-9-16 9-28 0-44c-8-14 8-24 0-38" fill="none" stroke="' + tron("#3fb868", "#14524a", t) + '" stroke-width="3.4" stroke-linecap="round"/></g>'
      : '<g stroke="' + ["#ff6f91", "#ffb454", "#ff8a5c", "#e87bb0"][i % 4] + '" stroke-width="3.2" fill="none" stroke-linecap="round"><path d="M' + x + ' 121V' + (100 - (i * 5) % 12) + 'M' + x + ' 108l-8-10M' + x + ' 104l8-9"/></g>').join("") : "";
    const tao = t > 0.08 && t < 0.62 ? [[84, 0], [214, 1], [338, 2]].map((q) =>
      '<g class="jl-lac" style="transform-origin:' + q[0] + 'px 121px;animation-delay:-' + q[1] * 1.1 + 's"><path d="M' + q[0] + ' 121c-9-16 9-28 0-44c-8-14 8-24 0-38" fill="none" stroke="' + tron("#3fb868", "#14524a", t) + '" stroke-width="3.4" stroke-linecap="round"/><path d="M' + (q[0] + 8) + ' 121c-8-14 8-24 0-34" fill="none" stroke="' + tron("#58d27a", "#1a6a58", t) + '" stroke-width="2.6" stroke-linecap="round"/></g>').join("") : "";
    const tau = ci === 2 || ci === 3 ? '<g transform="translate(236 96) rotate(-12)" fill="' + tron("#20495c", "#0a1c30", t) + '"><path d="M-44 0H46L36 18H-32z"/><rect x="-4" y="-30" width="3.4" height="30"/><path d="M-1 -28L22 -12H-1z" opacity=".85"/><circle cx="-18" cy="7" r="2.6" fill="#7fd6e8" opacity=".6"/><circle cx="-6" cy="7" r="2.6" fill="#7fd6e8" opacity=".6"/><circle cx="6" cy="7" r="2.6" fill="#7fd6e8" opacity=".6"/></g>' : "";
    const hang = t > 0.35 && t < 0.72 ? '<path d="M-10 121V50Q14 40 24 70Q34 100 30 121zM370 121V44Q340 36 328 66Q318 100 326 121z" fill="' + tron("#0e3c60", "#04162e", t) + '" opacity=".9"/>' : "";
    const day = t > 0.6 ? '<path d="M-10 121V86Q10 76 30 92T76 96V121zM300 121V92Q320 80 346 90T380 84V121z" fill="#020a1c" opacity=".85"/>' : "";
    const cas = [ca(60, 40 + 7 * (ci % 3), 0.8, tron("#ffd166", "#5ce1e6", t), 0, t > 0.55), ca(200, 60 - 8 * (ci % 2), 1.05, tron("#ff9a56", "#ff6ad5", t), 6, t > 0.55), ca(290, 34 + 6 * (ci % 4), 0.7, tron("#ffe38a", "#7dffcf", t), 3, t > 0.55)];
    if (t > 0.5) cas.push(ca(120, 84, 0.6, "#7dffcf", 9, true), ca(250, 44, 0.75, "#ff6ad5", 12, true));
    if (rong) cas.push(ca(-60, 70, 0.8, tron("#ffe38a", "#7dffcf", t), 5, t > 0.55), ca(400, 56, 0.9, tron("#ff9a56", "#ff6ad5", t), 8, t > 0.55));
    const sua = t > 0.4 && t < 0.92 ? '<g class="jl-troi-doc"><g transform="translate(' + (110 + ci * 11) + ' 52)"><path d="M-9 4a9 8 0 0 1 18 0z" fill="' + tron("#e9a0ff", "#6bd0ff", t) + '" opacity=".75"/><path d="M-6 4q-2 10 0 18M0 4q2 12 0 20M6 4q-2 10 0 16" stroke="' + tron("#e9a0ff", "#6bd0ff", t) + '" stroke-width="1.2" fill="none" opacity=".7"/></g></g>' : "";
    const cauca = t > 0.72 && t < 0.95 ? '<g transform="translate(250 70)"><g class="jl-boi" style="animation-duration:22s"><ellipse rx="12" ry="9" fill="#050c1c"/><path d="M-11 0L-20 -8V8z" fill="#050c1c"/><path d="M6 -8Q10 -22 18 -20" stroke="#0a1730" stroke-width="1.2" fill="none"/><circle class="jl-nhip" cx="18" cy="-20" r="2.4" fill="#ffe27a"/><circle cx="6" cy="-2" r="2" fill="#ffe27a"/><path d="M8 4l3-2l3 2l3-2" stroke="#cfe" stroke-width=".8" fill="none"/></g></g>' : "";
    const bot = [40, 110, 170, 230, 300, 340].map((x, i) => '<circle class="jl-noi" style="animation-delay:-' + (i * 1.9).toFixed(1) + 's;animation-duration:' + (7 + (i % 3) * 2) + 's" cx="' + x + '" cy="122" r="' + (1.4 + (i % 3) * 0.8) + '" fill="none" stroke="#fff" stroke-width=".8" opacity=".7"/>').join("");
    const dom = t > 0.5 ? [30, 90, 150, 210, 270, 330, 60, 240].map((x, i) => '<circle class="jl-tw" style="animation-delay:' + ((i * 0.43) % 2.6).toFixed(2) + 's" cx="' + x + '" cy="' + (14 + (i * 23) % 90) + '" r="1" fill="' + (i % 2 ? "#7dffcf" : "#ff9ae8") + '"/>').join("") : "";
    const cat = '<path d="M-340 121V114Q-100 108 70 113T150 113T230 112T310 113T440 112T700 113V121z" fill="' + tron("#f0e2b0", "#1a2a4c", t) + '"/><g fill="' + tron("#ffb3c1", "#35507a", t) + '"><circle cx="92" cy="116" r="2"/><circle cx="176" cy="117" r="1.6"/><path d="M270 118q3-5 7 0z"/></g>';
    const rua = t > 0.05 && t < 0.72 ? '<g transform="translate(60 ' + (62 + (ci % 3) * 6) + ')"><g class="jl-boi" style="animation-duration:46s;animation-delay:-' + (ci * 7) + 's"><ellipse cx="0" cy="0" rx="11" ry="7.5" fill="' + tron("#5cb85c", "#2a6a58", t) + '"/><path d="M-7 -3q7 -5 14 0M-8 1q8 -4 16 0" stroke="' + tron("#3a8a3a", "#1a4a3a", t) + '" stroke-width="1.2" fill="none"/><ellipse cx="12" cy="-1" rx="4.5" ry="3.2" fill="' + tron("#8fd48f", "#3a8a70", t) + '"/><circle cx="14" cy="-2" r=".9" fill="#10243a"/><ellipse class="jl-chan" cx="-1" cy="-7" rx="7" ry="2.6" fill="' + tron("#8fd48f", "#3a8a70", t) + '" transform="rotate(-20 -1 -7)"/><ellipse class="jl-chan" cx="-1" cy="7" rx="7" ry="2.6" fill="' + tron("#8fd48f", "#3a8a70", t) + '" transform="rotate(20 -1 7)" style="animation-delay:-.4s"/></g></g>' : "";
    const sang = t < 0.6 ? [60, 130, 200, 270, 330].map((x, i) => '<ellipse class="jl-tw" style="animation-delay:' + (i * 0.5) + 's" cx="' + x + '" cy="' + (118 - (i % 2) * 2) + '" rx="' + (6 + (i % 3) * 2) + '" ry="1.3" fill="#fff" opacity=".5"/>').join("") : "";
    const ngoc = t > 0.85 ? '<g transform="translate(180 98)"><circle class="jl-nhip" r="' + (30 + (t - 0.85) * 60).toFixed(0) + '" fill="url(#' + id + 'p)" style="animation-duration:2.4s"/>' +
      '<path d="M-22 14Q-26 -6 0 -8Q26 -6 22 14z" fill="#b66a8a"/><path d="M-22 14Q-26 22 0 22Q26 22 22 14z" fill="#8a4a6e"/><path d="M-20 12q20 -8 40 0" stroke="#ffd6e8" stroke-width="1" fill="none" opacity=".7"/>' +
      '<circle cy="0" r="9" fill="#fff"/><circle cx="-3" cy="-3" r="3" fill="#fff" opacity=".9"/><circle cx="-3" cy="-3" r="2.2" fill="#d9f6ff"/>' +
      [[-18, -14], [16, -18], [24, -2], [-26, -2]].map((q, i) => '<path class="jl-tw" style="animation-delay:' + (i * 0.5) + 's" d="M' + q[0] + " " + (q[1] - 4) + "v8M" + (q[0] - 4) + " " + q[1] + 'h8" stroke="#fff" stroke-width="1.2"/>').join("") + "</g>" : "";
    return '<svg viewBox="' + (rong ? KHUNG_RONG : KHUNG) + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + tren + '"/><stop offset="1" stop-color="' + duoi + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="' + id + 'p"><stop offset="0" stop-color="#e8fbff" stop-opacity=".9"/><stop offset=".5" stop-color="#9fe6ff" stop-opacity=".35"/><stop offset="1" stop-color="#9fe6ff" stop-opacity="0"/></radialGradient></defs>' +
      '<rect x="-400" width="1160" height="120" fill="url(#' + id + ')"/>' + tia + mat + dom + day + hang + tau + cas.join("") + rua + sua + cauca + tao + '<g class="jl-lac-nhe">' + san + them + '</g>' + bot + cat + sang + ngoc + "</svg>";
  }

  /* ================================================================ nhân vật */

  /**
   * Nhân vật vẽ bằng SVG, tự cử động: nhún nhẹ, chớp mắt, vẫy đuôi, vẫy tay. Thêm lớp `noi` vào phần tử chứa thì
   * nhân vật mở/ngậm miệng như đang nói.
   */
  function veTaro() {
    return '<svg viewBox="0 0 100 100" class="jl-nv-svg" aria-hidden="true">' +
      '<g class="nv-duoi" style="transform-origin:76px 80px"><path d="M70 82C98 86 106 58 92 44C88 58 80 62 68 68Z" fill="#8a6a48"/><path d="M91 49l-8 4M95 58l-10 3M92 67l-10 1" stroke="#3a2a1e" stroke-width="3" stroke-linecap="round"/></g>' +
      '<g class="nv-nhun">' +
      '<ellipse cx="50" cy="74" rx="24" ry="22" fill="#b08a62"/><ellipse cx="50" cy="79" rx="14" ry="15" fill="#f1dcb8"/>' +
      '<path d="M29 62Q50 75 71 62L69 71Q50 81 31 71Z" fill="#e0457b"/>' +
      '<g class="nv-tay" style="transform-origin:72px 66px"><ellipse cx="78" cy="68" rx="6" ry="11" fill="#9c7752" transform="rotate(-25 78 68)"/></g>' +
      '<ellipse cx="25" cy="73" rx="6" ry="10" fill="#9c7752" transform="rotate(20 25 73)"/>' +
      '<ellipse cx="39" cy="95" rx="10" ry="5" fill="#6b4f35"/><ellipse cx="61" cy="95" rx="10" ry="5" fill="#6b4f35"/>' +
      '<circle cx="26" cy="22" r="9" fill="#8a6a48"/><circle cx="74" cy="22" r="9" fill="#8a6a48"/><circle cx="26" cy="23" r="4.5" fill="#3a2a1e"/><circle cx="74" cy="23" r="4.5" fill="#3a2a1e"/>' +
      '<ellipse cx="50" cy="42" rx="28" ry="23" fill="#c29a6e"/>' +
      '<ellipse cx="38" cy="42" rx="9.5" ry="8" fill="#3a2a1e" transform="rotate(-20 38 42)"/><ellipse cx="62" cy="42" rx="9.5" ry="8" fill="#3a2a1e" transform="rotate(20 62 42)"/>' +
      '<ellipse cx="50" cy="52" rx="13" ry="9" fill="#f1dcb8"/>' +
      '<g class="nv-mat"><circle cx="38" cy="41" r="3.8" fill="#fff"/><circle cx="62" cy="41" r="3.8" fill="#fff"/><circle cx="38.8" cy="41.4" r="2.1" fill="#1a1210"/><circle cx="62.8" cy="41.4" r="2.1" fill="#1a1210"/></g>' +
      '<ellipse cx="50" cy="48.5" rx="4" ry="2.8" fill="#1a1210"/>' +
      '<path class="nv-cuoi" d="M44 54q6 5 12 0" stroke="#3a2a1e" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<ellipse class="nv-mieng" cx="50" cy="56" rx="3.8" ry="3.2" fill="#6a2a2a"/>' +
      '<path d="M50 18l-6 -9q6 -4 12 0z" fill="#3fb868"/>' +
      '</g></svg>';
  }

  function veKai() {
    return '<svg viewBox="0 0 100 100" class="jl-nv-svg" aria-hidden="true">' +
      '<g class="nv-duoi" style="transform-origin:68px 84px"><path d="M64 86C92 92 100 70 90 54C86 70 78 74 62 78Z" fill="#7a5233"/></g>' +
      '<g class="nv-nhun">' +
      '<ellipse cx="50" cy="76" rx="22" ry="21" fill="#8b5e3c"/><ellipse cx="50" cy="80" rx="13" ry="14" fill="#e8cfa6"/>' +
      '<g class="nv-tay" style="transform-origin:72px 66px"><ellipse cx="76" cy="68" rx="6" ry="11" fill="#7a5233" transform="rotate(-25 76 68)"/></g>' +
      '<ellipse cx="26" cy="74" rx="6" ry="10" fill="#7a5233" transform="rotate(20 26 74)"/>' +
      '<ellipse cx="40" cy="95" rx="10" ry="5" fill="#6e4a2e"/><ellipse cx="60" cy="95" rx="10" ry="5" fill="#6e4a2e"/>' +
      '<circle cx="31" cy="26" r="7" fill="#7a5233"/><circle cx="69" cy="26" r="7" fill="#7a5233"/>' +
      '<ellipse cx="50" cy="44" rx="26" ry="22" fill="#9a6b45"/>' +
      '<ellipse cx="50" cy="54" rx="16" ry="11" fill="#ead3ac"/>' +
      '<path d="M23 34Q50 20 77 34" stroke="#1b6a8a" stroke-width="4" fill="none"/>' +
      '<ellipse cx="37" cy="37" rx="9.5" ry="7.5" fill="#8fe3f2" opacity=".9" stroke="#1b6a8a" stroke-width="2.4"/><ellipse cx="63" cy="37" rx="9.5" ry="7.5" fill="#8fe3f2" opacity=".9" stroke="#1b6a8a" stroke-width="2.4"/>' +
      '<g class="nv-mat"><circle cx="37" cy="37" r="3" fill="#10243a"/><circle cx="63" cy="37" r="3" fill="#10243a"/><circle cx="38" cy="36" r="1" fill="#fff"/><circle cx="64" cy="36" r="1" fill="#fff"/></g>' +
      '<ellipse cx="50" cy="49" rx="4.6" ry="3.2" fill="#2a1a12"/>' +
      '<path d="M35 53l-15-3M35 56l-15 3M65 53l15-3M65 56l15 3" stroke="#3a2a1e" stroke-width="1" stroke-linecap="round"/>' +
      '<path class="nv-cuoi" d="M44 56q6 5 12 0" stroke="#3a2a1e" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<ellipse class="nv-mieng" cx="50" cy="58" rx="3.8" ry="3.2" fill="#6a2a2a"/>' +
      '</g></svg>';
  }

  /* ============================================ cảnh "sắp có" (N1, N4, N5): xem trước, cũng chuyển động */

  function canhSapCo(id) {
    const tw = (xs, y0, cao, mau) => xs.map((x, i) => '<circle class="jl-tw" style="animation-delay:' + ((i * 0.41) % 2.4).toFixed(2) + 's" cx="' + x + '" cy="' + (y0 + (i * 13) % cao) + '" r="' + (0.8 + (i % 3) * 0.4) + '" fill="' + (mau || "#fff") + '"/>').join("");
    let nd;
    if (id === "n1") {         // tàu đêm + pháo hoa
      const no = [[70, 40, "#ff6f91"], [170, 28, "#ffd166"], [270, 44, "#5ce1e6"], [330, 22, "#c792ff"], [20, 24, "#7dffcf"]].map((b, i) =>
        '<g class="jl-no" style="animation-delay:' + (i * 0.9).toFixed(1) + 's;transform-origin:' + b[0] + 'px ' + b[1] + 'px">' +
        Array.from({ length: 14 }, (_, k) => '<path d="M' + b[0] + " " + b[1] + 'l0 -16" stroke="' + b[2] + '" stroke-width="1.6" stroke-linecap="round" transform="rotate(' + k * (360 / 14) + " " + b[0] + " " + b[1] + ')"/>').join("") + "</g>").join("");
      nd = '<defs><linearGradient id="jlN1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070a26"/><stop offset="1" stop-color="#2a1458"/></linearGradient></defs><rect x="-400" width="1160" height="120" fill="url(#jlN1)"/>' +
        tw([10, 50, 100, 140, 200, 230, 300, 350], 6, 60) + no +
        '<path d="M-340 121V104Q-100 96 90 102T250 100T440 103T700 100V121z" fill="#0a0a1c"/>' +
        '<g class="jl-boi" style="animation-duration:12s"><g fill="#18183a"><rect x="0" y="94" width="70" height="12" rx="3"/><rect x="72" y="94" width="30" height="12" rx="3"/></g><g fill="#ffd166"><rect x="6" y="97" width="7" height="5"/><rect x="18" y="97" width="7" height="5"/><rect x="30" y="97" width="7" height="5"/><rect x="42" y="97" width="7" height="5"/><rect x="54" y="97" width="7" height="5"/></g></g>';
    } else if (id === "n4") {  // làng suối nước nóng trong tuyết
      const tuyet = Array.from({ length: 16 }, (_, i) => '<circle class="jl-roi" style="left:0;animation-delay:-' + (i * 0.7).toFixed(1) + 's;animation-duration:' + (6 + (i % 4)) + 's" cx="' + (i * 24 - 20) + '" cy="-4" r="' + (1 + (i % 3) * 0.6) + '" fill="#fff"/>').join("");
      const hoi = [150, 168, 186, 204].map((x, i) => '<path class="jl-hoi-nuoc" style="animation-delay:-' + i * 0.9 + 's" d="M' + x + ' 96q-6 -10 0 -18t0 -16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>').join("");
      nd = '<defs><linearGradient id="jlN4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2b5e"/><stop offset="1" stop-color="#7a86c4"/></linearGradient></defs><rect x="-400" width="1160" height="120" fill="url(#jlN4)"/>' +
        tw([20, 60, 120, 240, 300, 340], 8, 40) +
        '<path d="M-340 90L-200 50L-120 76L-40 38L60 82L140 60L230 84L300 52L380 80L470 46L560 84L700 60V121H-340Z" fill="#c7d0f0" opacity=".7"/>' +
        '<path d="M-340 108Q-100 92 100 104T300 100T700 104V121H-340Z" fill="#eef2ff"/>' +
        '<ellipse cx="177" cy="106" rx="42" ry="9" fill="#5fb7d8"/>' + hoi +
        '<g transform="translate(40 76)"><path d="M0 28V12L20 0L40 12V28z" fill="#6b4a32"/><path d="M-4 13L20 -3L44 13" fill="none" stroke="#eef2ff" stroke-width="5"/><rect class="jl-nhip" x="12" y="15" width="7" height="8" fill="#ffd166"/><rect class="jl-nhip" x="24" y="15" width="7" height="8" fill="#ffd166" style="animation-delay:-1s"/></g>' +
        '<g transform="translate(300 74)"><path d="M0 30V14L22 0L44 14V30z" fill="#7a5238"/><path d="M-4 15L22 -3L48 15" fill="none" stroke="#eef2ff" stroke-width="5"/><rect class="jl-nhip" x="14" y="17" width="8" height="9" fill="#ffd166"/></g>' + tuyet;
    } else {                   // N5 · hoa anh đào Kyoto
      const canh = Array.from({ length: 14 }, (_, i) => '<ellipse class="jl-roi" style="left:0;animation-delay:-' + (i * 0.9).toFixed(1) + 's;animation-duration:' + (7 + (i % 5)) + 's" cx="' + (i * 26 - 30) + '" cy="-4" rx="2.6" ry="1.5" fill="#ffc2d6"/>').join("");
      const hoa = (x, y) => Array.from({ length: 9 }, (_, i) => '<circle class="jl-tw" style="animation-delay:' + (i * 0.3) + 's" cx="' + (x + Math.cos(i * 2.1) * (10 + i * 2)) + '" cy="' + (y + Math.sin(i * 1.7) * (8 + i)) + '" r="' + (3 + (i % 3)) + '" fill="#ffb3c9"/>').join("");
      nd = '<defs><linearGradient id="jlN5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9e6"/><stop offset="1" stop-color="#ffb7cf"/></linearGradient></defs><rect x="-400" width="1160" height="120" fill="url(#jlN5)"/>' +
        '<path d="M-340 96L-220 60L-120 84L-20 54L90 88L200 62L300 86L420 56L520 84L700 64V121H-340Z" fill="#e7a4c0" opacity=".55"/>' +
        '<g class="jl-nhip" style="animation-duration:6s"><circle cx="290" cy="30" r="14" fill="#fff6e8" opacity=".85"/></g>' +
        '<g transform="translate(200 60)"><path d="M0 50V20l20 -10l20 10V50z" fill="#c8453a"/><path d="M-8 22l28 -16l28 16z" fill="#7a3a2a"/><path d="M-2 8l22 -12l22 12z" fill="#7a3a2a"/></g>' +
        '<path d="M-340 108Q-100 98 100 106T300 104T700 106V121H-340Z" fill="#a8d18a"/>' +
        '<g class="jl-lac-nhe" style="animation-duration:5s"><path d="M40 121Q46 80 30 50M46 90Q70 70 90 66M36 70Q20 56 8 54" stroke="#6b4a3a" stroke-width="5" fill="none" stroke-linecap="round"/>' + hoa(30, 50) + hoa(88, 64) + hoa(10, 56) + "</g>" +
        '<g class="jl-lac-nhe" style="animation-duration:7s"><path d="M330 121Q326 86 340 56M334 92Q312 74 296 70" stroke="#6b4a3a" stroke-width="5" fill="none" stroke-linecap="round"/>' + hoa(338, 56) + hoa(298, 70) + "</g>" + canh;
    }
    return '<svg viewBox="' + KHUNG_RONG + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + nd + "</svg>";
  }

  /* ================================================================ dữ liệu màn */

  function canhKaiwa(ci, tong, rong) {
    const lanterns = [40,100,160,220,280,340].map((x,i) => '<g transform="translate('+x+' '+(24+i%2*10)+')"><path d="M0 -24V0" stroke="#91a8b5"/><rect x="-8" width="16" height="22" rx="6" fill="'+(i%2?'#f6cfb4':'#8bd4e6')+'"/><path d="M-5 7H5M-5 15H5" stroke="#365469"/></g>').join("");
    return '<svg viewBox="0 0 380 124" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><rect width="380" height="124" fill="#12354a"/><circle cx="310" cy="30" r="16" fill="#f3e4aa"/>'+[0,70,145,230,310].map((x,i)=>'<rect x="'+x+'" y="'+(65-i%2*20)+'" width="58" height="68" rx="4" fill="#20566c"/><rect x="'+(x+12)+'" y="76" width="30" height="18" rx="3" fill="#8bd4e6"/>').join("")+lanterns+'<path d="M0 112Q190 100 380 112V124H0Z" fill="#367d8a"/></svg>';
  }

  const MON = {
    kaiwa: {"id":"kaiwa","cap":"Kaiwa Nihongo","emoji":"🏮","khi":"canh","xemTruoc":4,"ten":"Kaiwa Nihongo","phu":"Khẩu ngữ Nhật và tiếng Osaka · khóa bổ trợ ngoài các cấp JLPT.","mau":["#176b80","#8bd4e6"],"nhanVat":{"ten":"Raku","emoji":"🐻‍❄️"},"chuong":[{"ten":"Nameraka · Biến âm","mau":["#163e52","#245b6d"]},{"ten":"Nameraka · Câu nói tự nhiên","mau":["#163e52","#245b6d"]},{"ten":"Nameraka · Giữ nhịp hội thoại","mau":["#163e52","#245b6d"]},{"ten":"Nameraka · Ý định và sắc thái","mau":["#163e52","#245b6d"]},{"ten":"Osaka · Lời nói hằng ngày","mau":["#163e52","#245b6d"]},{"ten":"Osaka · Giao tiếp và đáp lời","mau":["#163e52","#245b6d"]},{"ten":"Osaka · Gia đình và ẩm thực","mau":["#163e52","#245b6d"]},{"ten":"Osaka · Văn hóa trò chuyện","mau":["#163e52","#245b6d"]}],"trum":{"ten":"Kaiwa · Thử thách hội thoại","mau":["#163e52","#276f7c"]},"suuTam":["🗣️","💬","🎐","🤝","🏮","🍵","🍣","🍬"],"thoai":{"batDau":["Cùng Raku khám phá tiếng Nhật trong những cuộc trò chuyện hằng ngày!","Chọn bất kỳ chặng nào. Làm hết các chặng để mở bài cuối."],"chuong":{},"xongChuong":{},"thang":["Bạn đã hoàn thành hành trình Kaiwa Nihongo!"]},canh:canhKaiwa},
    n3: {
      id: "n3", cap: "N3", emoji: "🗻", khi: "canh", xemTruoc: 8, leoLen: true,
      ten: "Chinh phục núi Phú Sĩ",
      phu: "Leo 9 hợp mục, mỗi chương một trạm, để đón bình minh trên đỉnh Phú Sĩ.",
      mau: ["#e0457b", "#ff9f43"],
      nhanVat: { ten: "Taro", emoji: "🦝" },
      canh: canhPhuSi,
      chuong: [
        { ten: "1合目 · Chân núi", mau: ["#12304a", "#1e5a4a"] },
        { ten: "2合目 · Rừng tùng sương mù", mau: ["#16384f", "#25644f"] },
        { ten: "3合目 · Suối trong vắt", mau: ["#1a4057", "#2c7058"] },
        { ten: "4合目 · Vách đá rêu phong", mau: ["#22405e", "#4a6a5a"] },
        { ten: "5合目 · Trạm năm", mau: ["#2c466c", "#6a6a6a"] },
        { ten: "6合目 · Đường đá núi lửa", mau: ["#3b4a78", "#7a5f5a"] },
        { ten: "7合目 · Trên biển mây", mau: ["#4a5a8e", "#c08a7a"] },
        { ten: "8合目 · Gió buốt trời hửng", mau: ["#6a6aa0", "#e09a7a"] },
        { ten: "9合目 · Sát đỉnh", mau: ["#8a7ab0", "#ffb27a"] }
      ],
      trum: { ten: "Đỉnh Phú Sĩ", mau: ["#b08ab8", "#ffc98a"] },
      suuTam: ["🍙", "🌲", "💧", "🪨", "🧭", "🔥", "☁️", "🧣", "🌅"],
      thoai: {
        batDau: ["Chào bạn! Mình là Taro. Nghe nói ai lên được đỉnh Phú Sĩ lúc bình minh sẽ thi đỗ JLPT N3 đó!",
                 "Đường lên có 9 trạm. Bạn có thể chọn bất kỳ chặng nào; hoàn thành hết các chặng để mở bài kiểm tra cuối. Mình đi cùng bạn nhé!"],
        chuong: {
          1: "Trạm đầu tiên ở chân núi. Hít một hơi thật sâu — chữ Hán đầu tiên đang đợi bạn.",
          2: "Rừng tùng mù sương quá! Đừng lo, từng từ một thôi, đường sẽ hiện ra.",
          3: "Nước suối mát ghê. Nghỉ chân uống một ngụm rồi học tiếp nào.",
          4: "Vách đá trơn đấy, bám chắc vào ngữ pháp nhé!",
          5: "Trạm năm! Nhiều người bắt đầu leo từ đây, mà bạn đã đi được nửa chặng đường rồi.",
          6: "Đá núi lửa lổn nhổn… nhưng bạn đi vững lắm.",
          7: "Nhìn xuống kìa, mây ở dưới chân mình! Cố lên, còn hai trạm nữa.",
          8: "Gió lạnh buốt, nhưng trời bắt đầu hửng sáng. Gần tới rồi!",
          9: "Trạm cuối trước đỉnh. Chỉ còn một thử thách cuối cùng thôi."
        },
        xongChuong: {
          1: "Trạm một xong rồi! Taro tặng bạn chiếc onigiri nóng hổi 🍙",
          2: "Qua rừng tùng rồi! Nhặt được một cây thông nhỏ 🌲",
          3: "Giỏi quá! Một giọt nước suối trong veo 💧",
          4: "Vượt vách đá ngon lành! Lượm được viên đá lạ 🪨",
          5: "Tới trạm năm! Taro tặng bạn chiếc la bàn 🧭",
          6: "Qua đường đá núi lửa! Than hồng còn ấm 🔥",
          7: "Trên mây rồi! Một mảnh mây mềm ☁️",
          8: "Gió buốt cũng không cản được bạn! Chiếc khăn ấm 🧣",
          9: "Sát đỉnh rồi! Bình minh đang ló dạng 🌅"
        },
        thang: ["Bạn làm được rồi!! Mặt trời mọc trên đỉnh Phú Sĩ, đẹp quá! 🌅",
                "Bạn đã chinh phục N3. Taro tự hào về bạn lắm! Muốn thử sức hơn nữa thì biển xanh Okinawa của màn N2 luôn mở đó."]
      }
    },
    n2: {
      id: "n2", cap: "N2", emoji: "🌊", khi: "bot", xemTruoc: 2,
      ten: "Lặn biển Okinawa tìm ngọc trai",
      phu: "Lặn sâu 9 tầng nước, mỗi chương một tầng, để vớt viên ngọc trai khổng lồ dưới đáy biển.",
      mau: ["#1fa2c9", "#5ce1e6"],
      nhanVat: { ten: "Kai", emoji: "🦦" },
      canh: canhOkinawa,
      chuong: [
        { ten: "10m · Rạn san hô nông", mau: ["#46c6d6", "#2ba3c4"] },
        { ten: "20m · Rừng tảo bẹ", mau: ["#2db7c9", "#1e8fb0"] },
        { ten: "30m · Xác tàu đắm", mau: ["#2a9fc0", "#1a7aa0"] },
        { ten: "40m · Hang đá ngầm", mau: ["#2288b0", "#14608a"] },
        { ten: "50m · Vách đá sâu", mau: ["#1a6f9c", "#0f4a78"] },
        { ten: "60m · Vùng nước tối", mau: ["#135485", "#0a3560"] },
        { ten: "70m · Đàn cá phát sáng", mau: ["#0e3f72", "#06254e"] },
        { ten: "80m · Rãnh sâu", mau: ["#0a2e5c", "#041a3c"] },
        { ten: "90m · Cửa hang ngọc", mau: ["#06204a", "#030f2a"] }
      ],
      trum: { ten: "Đáy biển · Ngọc trai khổng lồ", mau: ["#04163a", "#02081e"] },
      suuTam: ["🐚", "🌿", "⚓", "🦀", "🔦", "🐠", "🐙", "🫧", "🪸"],
      thoai: {
        batDau: ["Ahoy! Mình là Kai, rái cá lặn của Okinawa. Dưới đáy biển có một viên ngọc trai khổng lồ, ai tìm được sẽ đỗ JLPT N2!",
                 "Bạn có thể chọn bất kỳ tầng nào. Hoàn thành hết các chặng để mở bài kiểm tra cuối. Sẵn sàng chưa?"],
        chuong: {
          1: "Nước ấm và trong vắt. Rạn san hô nông nhiều đồ lắm, nhặt cẩn thận nhé!",
          2: "Rừng tảo bẹ đung đưa… đừng để bị quấn vào chân nào.",
          3: "Con tàu đắm cũ kỹ! Có khi trong khoang còn kho báu từ vựng đấy.",
          4: "Vào hang rồi, đèn pin bật lên! Ngữ pháp là tấm bản đồ của chúng ta.",
          5: "Vách đá dựng đứng. Hơi thở chậm lại, đọc kỹ từng câu.",
          6: "Nước tối dần. May mà bạn học chắc rồi, mình không sợ.",
          7: "Nhìn kìa, đàn cá phát sáng dẫn đường cho bạn!",
          8: "Rãnh sâu thật! Áp lực tăng, nhưng bạn vẫn rất bình tĩnh.",
          9: "Cửa hang ngọc ngay phía trước. Chỉ còn thử thách cuối cùng!"
        },
        xongChuong: {
          1: "Qua tầng một! Kai tặng bạn chiếc vỏ sò đầu tiên 🐚",
          2: "Thoát khỏi rừng tảo! Nhặt được một nhành rong biển 🌿",
          3: "Khám phá con tàu đắm! Chiếc neo cũ ⚓",
          4: "Qua hang đá! Một con cua nhỏ chào bạn 🦀",
          5: "Vượt vách đá sâu! Chiếc đèn pin sáng hơn rồi 🔦",
          6: "Nước tối cũng không làm bạn chùn bước! Một chú cá sáng 🐠",
          7: "Đàn cá phát sáng! Một chú bạch tuộc vẫy tay chào 🐙",
          8: "Xuống rãnh sâu rồi! Một chùm bong bóng may mắn 🫧",
          9: "Ngay trước cửa hang ngọc! Một cành san hô quý 🪸 — và ánh sáng trắng lấp lánh ở đáy kia…"
        },
        thang: ["Viên ngọc trai khổng lồ sáng lên trong tay bạn! ✨",
                "Bạn đã vớt được ngọc trai của màn N2. Kai tự hào về bạn lắm!"]
      }
    }
  };

  /** Màn "sắp có": hiện trên bản đồ chọn màn nhưng chưa chơi được. */
  const SAP_CO = [
    { id: "n1", cap: "N1", emoji: "🎆", ten: "Tàu đêm đến ngày hội pháo hoa" },
    { id: "n4", cap: "N4", emoji: "♨️", ten: "Làng suối nước nóng trong tuyết" },
    { id: "n5", cap: "N5", emoji: "🌸", ten: "Con đường hoa anh đào Kyoto" }
  ];

  /** Hai màu nền của một chương (hoặc của trùm cuối khi `ci` = -1). */
  function mauChuong(mon, ci) {
    const th = MON[mon];
    return ci < 0 ? th.trum.mau : th.chuong[Math.min(ci, th.chuong.length - 1)].mau;
  }

  function canh(mon, ci, rong) {
    const th = MON[mon];
    const tong = th.chuong.length + 1;
    return th.canh(ci < 0 ? tong - 1 : ci, tong, !!rong);
  }

  /** SVG nhân vật của một màn (đã gắn sẵn hoạt ảnh). */
  function nhanVat(mon) {
    if (mon === "kaiwa") {
      const icon = goc.chrome?.runtime?.getURL ? goc.chrome.runtime.getURL("icons/icon128.png") : "brand-mark.png";
      return '<svg class="jl-nv-svg" viewBox="0 0 128 128" aria-label="Raku"><image href="' + icon + '" width="128" height="128"/></svg>';
    }
    return mon === "n2" ? veKai() : veTaro();
  }

  goc.JlptTheme = { MON, SAP_CO, mauChuong, canh, canhSapCo, nhanVat, tron };
})(typeof self !== "undefined" ? self : this);
