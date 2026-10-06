# NeutronDict

Từ điển & dịch **Anh – Việt**: tra từ khi bôi đen trên web/PDF, phiên âm **IPA** kèm hướng dẫn đọc, phát âm, định nghĩa & ví dụ tiếng Anh, sổ tay, ôn tập **SRS**, đồng bộ **Google Drive**. Gồm **extension máy tính** và **app Android**.

> NeutronDict là “người anh em tiếng Anh” của [NJDict](../) (bản tiếng Nhật). Cùng cơ chế: sổ tay chung, đồng bộ Drive, học SRS — nhưng lõi tra cứu và phát âm dành cho tiếng Anh.

## Cấu trúc

| Thư mục | Phần | Phiên bản |
|---------|------|-----------|
| [`extension/`](extension/) | Extension Chrome/Edge — bôi đen tra từ trên web/PDF | v2.2 |
| [`android/`](android/) | App Android (Capacitor) — tra từ, sổ tay, học SRS, tiến độ, thông báo | v2.1.0 |
| [`brand/`](brand/) | Logo (nơ-ron – vũ trụ) và script xuất icon PNG | — |

## Tính năng chính

- **Tra từ tiếng Anh:** nghĩa tiếng Việt (Google Dịch) + **phiên âm IPA** + **phát âm** (file audio thật hoặc giọng máy) + **định nghĩa/ví dụ/từ đồng nghĩa** tiếng Anh (Free Dictionary API).
- **Hướng dẫn đọc IPA:** bảng ký hiệu IPA kèm từ ví dụ và gợi ý đọc tiếng Việt; trong tab **Chi tiết** còn chú giải ngay các ký hiệu có trong từ đang tra.
- **Dịch câu dài** mạnh như Google Dịch (Anh↔Việt), có nút lưu bản dịch.
- **Bôi đen là hiện popup ngay tại con trỏ** (web), hoặc `Ctrl+C` + phím tắt (PDF), hoặc chuột phải.
  Popup chạy đồng thời **tra từ, chi tiết và dịch cả câu**, xếp vào ba tab — không còn tự
  đoán bạn muốn tra từ hay dịch câu.
- **Sổ tay + sổ con phân loại**, **ôn tập SRS bốn đường** (nhìn chữ · nghe câu · nhặt từ đồng nghĩa ·
  nhặt từ trái nghĩa) — mỗi đường một lịch riêng, quên bài nào chỉ làm lại bài đó, và một
  **thang 100 điểm** chung cho biết từ ấy đã vững tới mức nào. Xuất **Anki/CSV**, sao lưu JSON.
- **Đồng bộ Google Drive** giữa máy tính và điện thoại (qua Apps Script của bạn).
- **Android:** nhắc học hằng ngày, nhận chữ từ menu bôi đen (PROCESS_TEXT) và bảng Chia sẻ (kèm link nguồn).
- **Theo dõi quá trình học & phần thưởng:** mục tiêu mỗi ngày, chuỗi ngày liên tiếp,
  lịch nhiệt 17 tuần, **24 huy hiệu** — cùng cơ chế với app Denken 3 Shuu, đồng bộ
  giữa máy tính và điện thoại. Xem `tien-do.js`.
- **Ngữ cảnh ngay dưới nghĩa:** mỗi từ lưu từ trang web/PDF hiện kèm câu đã gặp nó (từ được tô đậm) và **bản dịch của câu**, nằm liền sau nghĩa — trong sổ tay lẫn mặt sau thẻ ôn. Mục cũ được tự bồi bản dịch dần mỗi lần mở sổ.
- **Sổ tay nhanh và xoá hàng loạt:** danh sách vẽ theo lô (sổ vài nghìn từ vẫn mở trong nửa giây), mỗi nút trên hàng chỉ cập nhật đúng hàng đó. Nút xoá từng từ được thay bằng **ô tích chọn**: tích một hoặc nhiều từ → thanh hành động hiện ra → "Xoá…" mở hộp xác nhận liệt kê các từ sắp xoá, có **Hoàn tác**. Chế độ học vẫn có nút xoá riêng ("Đã thuộc hẳn").
- **Từ cùng ngữ cảnh chỉ học một lần nghe/ngữ pháp:** bôi vài từ sát nhau trong cùng một câu thì cả nhóm dùng **một** thẻ nghe (một từ đại diện giữ đường nghe, ưu tiên từ đã có tiến độ) và **một** bài xếp mảnh ngữ pháp (câu dài nhất của nhóm); đường nhìn và mạng nghĩa của từng từ vẫn giữ riêng.
- **Mỗi từ một đường mỗi lần, đường kế tiếp chờ 12 tiếng:** từ có nhiều đường ôn (nhìn, nghe, đồng nghĩa, trái nghĩa) chỉ hiện MỘT đường mỗi lần; chấm xong thì các đường còn lại của từ đó ngủ 12 tiếng rồi mới tới lượt đường kế. Buổi học ngắn lại rõ rệt (30 từ đã mở đủ bốn đường: 120 thẻ → 30 thẻ trong một buổi) mà tổng số lượt ôn về lâu dài không đổi, chỉ được dàn ra. Bảng điểm hiện giờ đường kế tiếp sẽ hiện.
- **Đạt mức tối đa thì tự đóng băng:** khi mọi đường của một từ đã nới tới trần 365 ngày và bạn trả lời nhớ, từ đó được đóng băng luôn (có lời báo). Nút “Đang đóng băng” mở lại được; bấm Hoàn tác (←) ngay lượt đó cũng gỡ băng.
- **Học bằng bàn phím, có hiệu ứng kiểu Quizlet:** `Space` lật thẻ, rồi `F` = Quên (dấu X đỏ nhạt), `J` = Nhớ (dấu V xanh); `A` phát âm từ. Thẻ nghe: `A` để nghe lại câu, `Space` để hiện nghĩa như các thẻ khác. Bài đồng nghĩa/trái nghĩa: phím `1`–`9` chọn ô và chấm ngay (hiện V/X), `J` hoặc `Space` để sang thẻ tiếp.
- **Vuốt thẻ kiểu Quizlet:** sau khi hiện nghĩa, kéo thẻ sang phải (chuột trái hoặc ngón tay) = Nhớ, thẻ trôi đi kèm dấu V xanh; kéo sang trái = Quên, dấu X đỏ; thẻ kế tiếp hiện lên ngay. Chưa hiện nghĩa thì vuốt không chấm. Hai nút mũi tên dưới thẻ (‹ ›, hoặc phím ← →) lùi/tới các thẻ đã chấm trong buổi để xem lại; bấm Nhớ/Quên khác với lần trước trên thẻ xem lại là chấm lại (lượt cũ bị huỷ, không tính hai lần).
- **Ôn từng đường:** nút “Ôn từng đường” cho luyện liền một loại bài — chỉ bài nghe, chỉ bài đoán nghĩa, hoặc chỉ bài đúng–sai (đồng/trái nghĩa). Điểm và lịch ôn vẫn tính chung; chỉ lấy bài đã tới hạn và vẫn giữ luật 12 tiếng giữa các đường của một từ.
- **Ngữ pháp: làm đúng là đóng băng:** câu ghép đúng (kể cả sai rồi sửa lại) được đóng băng và không hiện lại, cả luyện tự do lẫn theo lịch; chỉ xem đáp án thì chưa đóng băng. Danh sách “Câu đã đóng băng” có nút Mở lại.
- **Sửa bản dịch & ghi chú:** mỗi mục trong sổ tay đều sửa lại được nghĩa cho đúng
  chuyên ngành, kèm một ô ghi chú riêng. Bản máy dịch ban đầu được giữ lại để khôi
  phục, và tra lại cùng một từ **không** làm mất công hiệu đính.
- **Sửa nghĩa ngay trong popup:** thấy máy dịch sai ngữ cảnh thì chữa tại chỗ, không
  phải mở Sổ tay tìm lại — sửa được cả nghĩa của từ lẫn bản dịch câu, sửa là lưu
  luôn, ô ghi chú nằm ngay cạnh. Bản Android mở thẳng bảng sửa từ thẻ kết quả.
- **Xoá rồi vẫn giữ bản dịch của bạn:** xoá một mục vì đã thuộc thì nó biến khỏi sổ
  tay và khỏi sóng ôn tập thật, nhưng nghĩa bạn đã hiệu đính và ghi chú thì ở lại —
  vài tháng sau tra lại vẫn ra bản bạn từng chốt (`extension/muc.js`).
- **Giao diện:** hệ thiết kế riêng (`ui.css`), sáng/tối tự động theo máy, icon
  [Phosphor](https://phosphoricons.com) thay cho emoji; trên Android có vuốt ngang
  đổi tab, nút Quay lại lùi từng bước và kéo xuống để làm mới (`cham-vuot.js`).

## Nguồn dữ liệu

- **Nghĩa & dịch câu (cả Anh và Nhật):** [Google Dịch](https://translate.google.com) (endpoint công khai `gtx`), dự phòng qua Apps Script (`LanguageApp`). Tiếng Nhật **không còn dùng Mazii**: nghĩa, các nghĩa theo loại từ và phiên âm La-tinh (nguồn dựng furigana) lấy chung trong **một** lượt gọi Google.
- **Tốc độ tra:** hai cổng Google chạy *đua* (cổng treo thì cổng kia đi song song sau ~1 giây), Apps Script vào cuộc ngay khi Google chặn; tra từ và dịch cùng một từ dùng chung một lượt gọi; kết quả giữ trong RAM nên tra lại gần như tức thì.
- **IPA, phát âm, định nghĩa, ví dụ, từ đồng nghĩa:** [Free Dictionary API](https://dictionaryapi.dev) (`api.dictionaryapi.dev`) — miễn phí, không cần API key.

NeutronDict là dự án cộng đồng, không liên kết chính thức với Google hay dictionaryapi.dev. Vui lòng tôn trọng điều khoản của các nguồn dữ liệu.

## Hướng dẫn cài đặt và đồng bộ

[Tải hướng dẫn Word chi tiết](docs/Huong-dan-cai-dat-va-dong-bo-NeutronDict.docx?raw=true) — cài extension, cài APK Android, tạo Google Apps Script và kết nối một kho chung. Tài liệu có các hyperlink để mở Apps Script, lấy mã đồng bộ và tải APK.

## Bắt đầu nhanh

- **Extension:** xem [extension/README.md](extension/README.md) — `chrome://extensions` → Developer mode → Load unpacked thư mục `extension/`.
- **Android:** xem [android/README.md](android/README.md) — `npm install` → `npx cap add android` → `npx cap sync android` → `node patch-android.js` → mở Android Studio build APK.
- **Logo:** xem [brand/README.md](brand/README.md).

## Bộ icon

Giao diện dùng [Phosphor Icons](https://phosphoricons.com) v2.1.1 (giấy phép MIT,
© 2023 Phosphor Icons). Các đường vẽ SVG cần dùng được trích sẵn vào `icons.js`
của từng phần — extension Chrome không nạp được tài nguyên từ mạng, còn app
Android thì phải chạy được khi mất mạng.

## Giấy phép

[MIT](LICENSE).
