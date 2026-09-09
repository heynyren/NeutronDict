/**
 * Cầu nối sang THẾ GIỚI CỦA TRANG YouTube (world: MAIN).
 * ======================================================
 *
 * Content script chạy trong thế giới cách ly: thấy DOM nhưng KHÔNG thấy biến và
 * hàm của trang. Mà hai thứ cần nhất lại nằm bên đó:
 *
 *  1. `movie_player.getPlayerResponse()` — dữ liệu của ĐÚNG video đang phát.
 *     Đọc được nó thì khỏi phải tải lại cả trang xem (~1 MB) chỉ để lấy danh
 *     sách phụ đề, và cũng không bao giờ nhầm sang video trước.
 *
 *  2. Một lượt fetch phát ra từ chính trang. YouTube đang siết dần đường
 *     `timedtext`: gọi thiếu bối cảnh thì máy chủ trả về 200 kèm thân RỖNG —
 *     không phải lỗi mạng, nên rất dễ tưởng là code hỏng. Gọi từ trong trang
 *     mang đúng referrer và đúng ngữ cảnh của trình phát nên còn cửa.
 *
 * File này cố ý chỉ biết làm hai việc đó và không đụng gì tới trang. Nó trả về
 * dữ liệu thuần JSON, không trả về object của YouTube — đưa nguyên object sang
 * postMessage vừa không sao chép được, vừa là mở một cánh cửa không cần thiết.
 */
(() => {
  "use strict";

  window.addEventListener("message", async (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.__njd !== "hoi") return;
    const tra = (kq) => window.postMessage({ __njd: "tra", id: d.id, kq: kq }, "*");
    try {
      if (d.viec === "player") {
        const p = document.getElementById("movie_player");
        const pr = (p && p.getPlayerResponse) ? p.getPlayerResponse() : null;
        if (!pr) { tra({ ok: false }); return; }
        // Chỉ lấy đúng hai nhánh cần dùng, và cho đi qua JSON một vòng để chắc
        // chắn thứ gửi sang là dữ liệu thuần.
        tra({ ok: true, pr: JSON.parse(JSON.stringify({ videoDetails: pr.videoDetails, captions: pr.captions })) });
        return;
      }
      if (d.viec === "cosize") {
        /*
         * Đổi cỡ bằng API của chính trình phát.
         *
         * Đè CSS lên trình phát thì nó vẫn tính bố cục theo cỡ CŨ: thẻ video
         * mang kích thước pixel do nó tự ghi, lớp điều khiển và phụ đề cũng
         * canh theo cỡ đó. `setSize` bảo nó tính lại từ đầu, nên mọi thứ khớp.
         *
         * Tên hàm không có trong tài liệu công khai, nên hỏi trước khi gọi và
         * báo về là có gọi được không — bên kia còn biết mà dựa vào CSS.
         */
        const p = document.getElementById("movie_player");
        const w = Math.round(d.w || 0), h = Math.round(d.h || 0);
        if (!p || !(w > 0 && h > 0)) { tra({ ok: false }); return; }
        let xong = false;
        for (const ten of ["setSize", "setInternalSize"]) {
          if (typeof p[ten] === "function") {
            try { p[ten](w, h); xong = true; } catch (err) { /* thử tên sau */ }
          }
        }
        tra({ ok: xong });
        return;
      }
      if (d.viec === "fetch") {
        const r = await fetch(d.url, { credentials: "include" });
        tra({ ok: r.ok, text: await r.text() });
        return;
      }
    } catch (err) {
      tra({ ok: false, loi: String((err && err.message) || err) });
    }
  });
})();
