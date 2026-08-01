# NeutronDict — Extension Chrome/Edge

Bôi đen một từ **tiếng Anh** trên trang web hoặc PDF để tra ngay: **nghĩa tiếng Việt**, **phiên âm IPA** (kèm hướng dẫn đọc), **phát âm**, **định nghĩa & ví dụ tiếng Anh**, sổ tay và ôn tập — không phải rời trang.

## Tính năng

- **Trên web:** bôi đen từ → popup hiện **ngay tại con trỏ** với nghĩa tiếng Việt, IPA, phát âm và định nghĩa Anh; bấm ra ngoài là tắt. Bật/tắt trong Sổ tay → ⚙ Cài đặt.
- **Trên PDF:** bôi đen → `Ctrl + C` → phím tắt (`Ctrl+Shift+E`) → popup tự dán và hiện nghĩa.
- **Chuột phải** → *Tra "…" bằng NeutronDict* — mở cửa sổ popup nhỏ, không nhảy tab.
- Đổi hướng **Anh → Việt / Việt → Anh** ngay trong popup.
- **Tab Chi tiết:** phiên âm IPA + **chú giải cách đọc từng ký hiệu IPA có trong từ**, các định nghĩa/ví dụ/từ đồng nghĩa tiếng Anh theo từng loại từ.
- **Hướng dẫn đọc IPA:** trang tra cứu đầy đủ (nguyên âm / nguyên âm đôi / phụ âm / dấu nhấn) kèm ví dụ và nút nghe — mở từ popup (🔤 Hướng dẫn IPA) hoặc Sổ tay.
- **Phát âm:** ưu tiên **file audio thật** của từ điển; nếu không có thì dùng giọng máy (`en-US`).
- **Dịch câu:** bôi đen đoạn dài → popup tự chuyển sang **Dịch** (Google Dịch); bấm ＋ Lưu để cất bản dịch.
- **Sổ tay + sổ con:** ＋ Lưu để cất từ; mở 📒 Sổ tay để lọc, phân loại theo bài, **xuất Anki (TSV)/CSV**, sao lưu JSON.
- **Ôn tập SRS:** nút 🎓 Học ôn các từ đến hạn theo chu kỳ 1→3→7→14→30→60→120 ngày; phím Space (hiện nghĩa), 1 (Quên), 2 (Nhớ), 0 (xoá đã thuộc).
- **Truy nguồn + tô sáng:** từ/câu lưu từ một trang web sẽ nhớ địa chỉ; bấm 🔗 Nguồn để mở lại đúng trang và tô sáng vị trí đã lưu.
- **Bộ nhớ đệm:** 1.000 từ, 30 ngày — tra lại tức thì, dùng được cả khi mất mạng.
- **Đồng bộ Google Drive** (tuỳ chọn) qua Apps Script của bạn — xem `sync-google-apps-script.gs`.

## Cài đặt (từ mã nguồn)

1. Tải/giải nén mã nguồn.
2. Mở `chrome://extensions` (Chrome) hoặc `edge://extensions` (Edge).
3. Bật **Developer mode**.
4. Bấm **Load unpacked** và chọn thư mục `extension/` (chứa `manifest.json`).
5. (Tuỳ chọn) `chrome://extensions/shortcuts` để đổi phím tắt.

Với PDF mở từ máy (`file:///…`): mở **Details** của tiện ích và bật **Allow access to file URLs**.

## Nguồn dữ liệu

- Nghĩa tiếng Việt & dịch câu: **Google Dịch** (endpoint `gtx`).
- IPA, phát âm, định nghĩa, ví dụ, đồng nghĩa: **[Free Dictionary API](https://dictionaryapi.dev)**.

Dự án cộng đồng, không liên kết chính thức với các nguồn dữ liệu trên.

## Giấy phép

[MIT](LICENSE).
