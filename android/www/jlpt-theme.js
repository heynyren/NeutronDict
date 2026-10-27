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

  /** Cảnh một chương trên núi Phú Sĩ: bầu trời sáng dần theo độ cao, mặt trời nhô lên ở những chương cuối. */
  function canhPhuSi(ci, tong) {
    const t = tong > 1 ? ci / (tong - 1) : 0;
    const troiTren = tron("#0d1b3d", "#5b86c9", t), troiDuoi = tron("#1c2f5c", "#ffb27a", t);
    const mattroiY = 150 - t * 105;                         // thấp ở chân núi, cao dần lên
    const tuyet = 20 + t * 46;                              // mũ tuyết dày dần
    const cay = t < 0.45 ? '<g fill="#12301f" opacity="' + (0.9 - t) + '">' +
      [20, 52, 90, 128, 250, 290, 328].map((x, i) => '<path d="M' + x + ' 120l9-26 9 26z"/><path d="M' + (x + 1) + ' 104l8-22 8 22z"/>').join("") + "</g>" : "";
    const sao = t < 0.5 ? [30, 80, 140, 210, 270, 330].map((x, i) => '<circle cx="' + x + '" cy="' + (14 + (i * 13) % 40) + '" r="1.4" fill="#fff" opacity="' + (0.9 - t) + '"/>').join("") : "";
    return '<svg viewBox="0 0 360 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="jlP' + ci + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + troiTren + '"/><stop offset="1" stop-color="' + troiDuoi + '"/></linearGradient></defs>' +
      '<rect width="360" height="120" fill="url(#jlP' + ci + ')"/>' + sao +
      '<circle cx="250" cy="' + mattroiY.toFixed(1) + '" r="' + (14 + t * 6).toFixed(1) + '" fill="#ffe29a" opacity="' + (0.35 + t * 0.65).toFixed(2) + '"/>' +
      '<path d="M-10 120L120 ' + (60 - t * 18).toFixed(1) + 'L175 ' + (36 - t * 12).toFixed(1) + 'L240 ' + (62 - t * 14).toFixed(1) + 'L370 120z" fill="' + tron("#2a3a5e", "#7a5a7a", t) + '"/>' +
      '<path d="M175 ' + (36 - t * 12).toFixed(1) + 'L' + (175 - tuyet * 0.45).toFixed(1) + ' ' + (36 - t * 12 + tuyet * 0.55).toFixed(1) + 'L' + (175 + tuyet * 0.45).toFixed(1) + ' ' + (36 - t * 12 + tuyet * 0.55).toFixed(1) + 'z" fill="#f4f8ff" opacity="0.95"/>' +
      '<ellipse cx="70" cy="40" rx="34" ry="7" fill="#fff" opacity="' + (0.12 + t * 0.2).toFixed(2) + '"/>' +
      '<ellipse cx="300" cy="28" rx="40" ry="8" fill="#fff" opacity="' + (0.1 + t * 0.2).toFixed(2) + '"/>' + cay + "</svg>";
  }

  /* ============================================================ N2 · Okinawa */

  /** Cảnh một tầng nước: càng xuống sâu càng tối, ngọc trai sáng lên ở tầng cuối. */
  function canhOkinawa(ci, tong) {
    const t = tong > 1 ? ci / (tong - 1) : 0;
    const tren = tron("#46c6d6", "#06143a", t), duoi = tron("#1c8fb0", "#020a24", t);
    const tia = t < 0.6 ? [60, 150, 240, 310].map((x, i) => '<path d="M' + x + ' 0l' + (14 + i * 3) + ' 0l-' + (26 + i * 5) + ' 120h-' + (16 + i * 2) + 'z" fill="#fff" opacity="' + (0.1 * (1 - t)).toFixed(3) + '"/>').join("") : "";
    const san = t < 0.5 ? [30, 70, 255, 300, 335].map((x, i) =>
      '<path d="M' + x + ' 120c-2-18 6-28 ' + (i % 2 ? 10 : -10) + '-40c4 14 14 18 ' + (i % 2 ? -4 : 4) + ' 40z" fill="' + ["#ff6f91", "#ff9671", "#ffc75f", "#f9a1bc", "#ff8066"][i] + '" opacity="0.85"/>').join("") : "";
    const ca = [[60, 40 + 10 * (ci % 3)], [210, 62 - 8 * (ci % 2)], [300, 34 + 6 * (ci % 4)]].map((p, i) =>
      '<g transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + (i === 1 ? 1.1 : 0.8) + ')" fill="' + tron("#ffd166", "#5ce1e6", t) + '" opacity="0.8"><ellipse rx="9" ry="4.5"/><path d="M8 0l8-5v10z"/></g>').join("");
    const bot = [40, 120, 200, 280, 330].map((x, i) => '<circle cx="' + x + '" cy="' + (100 - ((ci * 17 + i * 23) % 80)) + '" r="' + (1.5 + (i % 3)) + '" fill="#fff" opacity="0.35"/>').join("");
    const ngoc = t > 0.85 ? '<circle cx="180" cy="98" r="' + (6 + (t - 0.85) * 40).toFixed(1) + '" fill="#fff" opacity="0.95"/><circle cx="180" cy="98" r="' + (14 + (t - 0.85) * 60).toFixed(1) + '" fill="#bfefff" opacity="0.25"/>' : "";
    return '<svg viewBox="0 0 360 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="jlO' + ci + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + tren + '"/><stop offset="1" stop-color="' + duoi + '"/></linearGradient></defs>' +
      '<rect width="360" height="120" fill="url(#jlO' + ci + ')"/>' + tia + ca + bot + san +
      '<path d="M0 118q30-8 60 0t60 0t60 0t60 0t60 0t60 0v2H0z" fill="' + tron("#e8d9a8", "#1a2a4a", t) + '"/>' + ngoc + "</svg>";
  }

  /* ================================================================ dữ liệu màn */

  const MON = {
    n3: {
      id: "n3", cap: "N3", emoji: "🗻",
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
                 "Đường lên có 9 trạm. Qua mỗi chặng phải đạt từ 60% trở lên thì mới được đi tiếp. Mình đi cùng bạn nhé!"],
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
                "Bạn đã chinh phục N3. Taro tự hào về bạn lắm. Biển xanh Okinawa đang đợi bạn ở màn N2!"]
      }
    },
    n2: {
      id: "n2", cap: "N2", emoji: "🌊",
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
                 "Mình sẽ lặn xuống từng tầng. Mỗi chặng phải đạt từ 60% mới được xuống tiếp. Sẵn sàng chưa?"],
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

  function canh(mon, ci) {
    const th = MON[mon];
    const tong = th.chuong.length + 1;
    return th.canh(ci < 0 ? tong - 1 : ci, tong);
  }

  goc.JlptTheme = { MON, SAP_CO, mauChuong, canh, tron };
})(typeof self !== "undefined" ? self : this);
