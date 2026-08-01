# NeutronDict

Từ điển & dịch **Anh – Việt**: tra từ khi bôi đen trên web/PDF, phiên âm **IPA** kèm hướng dẫn đọc, phát âm, định nghĩa & ví dụ tiếng Anh, sổ tay, ôn tập **SRS**, đồng bộ **Google Drive**. Gồm **extension máy tính** và **app Android**.

> NeutronDict là “người anh em tiếng Anh” của [NJDict](../) (bản tiếng Nhật). Cùng cơ chế: sổ tay chung, đồng bộ Drive, học SRS — nhưng lõi tra cứu và phát âm dành cho tiếng Anh.

## Cấu trúc

| Thư mục | Phần | Phiên bản |
|---------|------|-----------|
| [`extension/`](extension/) | Extension Chrome/Edge — bôi đen tra từ trên web/PDF | v1.0 |
| [`android/`](android/) | App Android (Capacitor) — tra từ, sổ tay, học SRS, thông báo | v1.0.0 |
| [`brand/`](brand/) | Logo (nơ-ron – vũ trụ) và script xuất icon PNG | — |

## Tính năng chính

- **Tra từ tiếng Anh:** nghĩa tiếng Việt (Google Dịch) + **phiên âm IPA** + **phát âm** (file audio thật hoặc giọng máy) + **định nghĩa/ví dụ/từ đồng nghĩa** tiếng Anh (Free Dictionary API).
- **Hướng dẫn đọc IPA:** bảng ký hiệu IPA kèm từ ví dụ và gợi ý đọc tiếng Việt; trong tab **Chi tiết** còn chú giải ngay các ký hiệu có trong từ đang tra.
- **Dịch câu dài** mạnh như Google Dịch (Anh↔Việt), có nút lưu bản dịch.
- **Bôi đen là hiện popup ngay tại con trỏ** (web), hoặc `Ctrl+C` + phím tắt (PDF), hoặc chuột phải.
- **Sổ tay + sổ con phân loại**, **ôn tập SRS** (1→3→7→14→30→60→120 ngày), xuất **Anki/CSV**, sao lưu JSON.
- **Đồng bộ Google Drive** giữa máy tính và điện thoại (qua Apps Script của bạn).
- **Android:** nhắc học hằng ngày, nhận chữ từ menu bôi đen (PROCESS_TEXT) và bảng Chia sẻ (kèm link nguồn).

## Nguồn dữ liệu

- **Nghĩa & dịch câu:** [Google Dịch](https://translate.google.com) (endpoint công khai `gtx`), dự phòng qua Apps Script (`LanguageApp`).
- **IPA, phát âm, định nghĩa, ví dụ, từ đồng nghĩa:** [Free Dictionary API](https://dictionaryapi.dev) (`api.dictionaryapi.dev`) — miễn phí, không cần API key.

NeutronDict là dự án cộng đồng, không liên kết chính thức với Google hay dictionaryapi.dev. Vui lòng tôn trọng điều khoản của các nguồn dữ liệu.

## Bắt đầu nhanh

- **Extension:** xem [extension/README.md](extension/README.md) — `chrome://extensions` → Developer mode → Load unpacked thư mục `extension/`.
- **Android:** xem [android/README.md](android/README.md) — `npm install` → `npx cap add android` → `npx cap sync android` → `node patch-android.js` → mở Android Studio build APK.
- **Logo:** xem [brand/README.md](brand/README.md).

## Giấy phép

[MIT](LICENSE).
