# Kiến trúc NeutronDict

Tài liệu này ghi lại cấu trúc hiện tại để các thay đổi sau có điểm xuất phát chung. Mã nguồn và bài kiểm thử là nguồn xác nhận cuối cùng; cập nhật tài liệu khi luồng dữ liệu thay đổi.

## Thành phần

| Thư mục | Vai trò |
| --- | --- |
| `extension/` | Extension Chrome/Edge Manifest V3. `background.js` là service worker tra cứu, lưu mục và đồng bộ; `content.js` xử lý tương tác trên trang; `popup.js` và `notebook.js` dựng giao diện. `manifest.json` khai báo quyền, content scripts và lệnh tắt. |
| `android/` | App Capacitor. `www/index.html` nạp các mô-đun và `www/app.js` chứa luồng app, dữ liệu và đồng bộ. `native/MainActivity.java` và `patch-android.js` thêm tích hợp Android. |
| `mcp/` | MCP server Node qua stdio, cho phép trợ lý đọc/sửa sổ tay qua Apps Script hoặc tệp JSON. |
| `kiem-tra/` | Các bài kiểm thử Node và Playwright; `DOC-TRUOC.md` hướng dẫn chạy. |
| `cong-cu/` | Công cụ xử lý dữ liệu. |
| `.github/workflows/` | Workflow build APK và kiểm thử. |

## Luồng tra cứu và lưu

1. Trong extension, popup/content script gửi thông điệp như `LOOKUP`, `SAVE_WORD`, `TRANSLATE` đến service worker trong `background.js`. Service worker gọi nguồn từ điển/dịch, ghi `chrome.storage.local` và hẹn đồng bộ.
2. Android nạp các mô-đun trong `www/index.html`, rồi `app.js` gọi nguồn tra cứu và quản lý màn hình. `Store` dùng Capacitor Preferences khi có plugin, hoặc `localStorage` khi chạy thử trên trình duyệt.
3. Hai bề mặt cùng dùng nhiều mô-đun JS. Các bản trong `extension/` và `android/www/` được chép riêng; khi sửa một mô-đun dùng chung phải kiểm tra cả hai bản. `chu-bang.js` hiện không giống hệt giữa hai bề mặt.

## Luồng học từ video YouTube

1. `extension/phu-de-trang.js` đọc dữ liệu trình phát trong thế giới của trang YouTube. `extension/phu-de.js` lấy danh sách phụ đề của video hiện tại, thử tải JSON3 từ trang, từ content script, rồi đọc bảng bản chép lời của YouTube khi hai cách đầu không được. Tính năng dùng phụ đề sẵn có của YouTube; mã hiện tại không tự nhận dạng tiếng nói từ video không có phụ đề.
2. `extension/cat-cau.js` ghép các cue rời thành câu, dùng khoảng lặng tương đối, dấu hiệu hình thái tiếng Nhật và điểm ranh giới. Kết quả giữ mốc thời gian của từng mẩu để tô sáng và tua chính xác.
3. Bảng lời thoại bám theo thời gian phát, tô sáng câu và mẩu đang nói. Người học bấm câu để tua lại, bôi đen để tra, xem bản dịch tiếng Việt, hoặc sửa lời thoại nhận dạng sai. Bản sửa được lưu theo video và mốc giây trong `phuDeSua`, rồi dùng cho bản dịch và mục lưu.
4. Nút lưu tạo mục câu kèm bản dịch và `src.yt` chứa mã video, mốc giây và thông tin đoạn. Sổ tay giữ nguồn video để quay lại đúng đoạn. Ngay tại bảng lời thoại, người học có thể ghi âm giọng mình, nghe lại và đọc theo. Mục lưu trực tiếp từ bảng này hiện chưa tự tạo `cauNghe` cho đường ôn nghe; xem rủi ro bên dưới.
5. Bản chép lời và bản dịch được lưu cục bộ để xem lại. Cần kiểm thử riêng các đường lấy phụ đề và trường hợp YouTube đổi cấu trúc trang; 25 bài hiện có chưa chứng minh được tích hợp này hoạt động trên mọi video thực tế.

## Luyện ngữ pháp tiếng Nhật

- Chế độ `Luyện ngữ pháp` có màn riêng trong sổ tay extension và tab riêng trên Android; chỉ hiện khi đang dùng Nhật–Việt. Mỗi buổi lấy tối đa 10 câu từ những mục đã lưu, không đọc/ghi điểm, lịch hay huy hiệu SRS.
- `ngu-phap.js` ưu tiên câu `cauNghe.cau`, rồi câu đầy đủ `src.cau` từ transcript, rồi mục lưu nguyên câu, cuối cùng thử cắt câu từ `src.prefix`/`src.suffix` bằng `CauNghe.tuNguon`. Câu phải chứa đúng từ đã lưu, đủ dài và có chữ Nhật. `Intl.Segmenter("ja")` tạo 2–4 mảnh ở ranh giới từ; app xáo trộn và người học chạm từng mảnh để xếp lại.
- Ghép đúng hoặc chọn xem đáp án đều hiện câu gốc và bản dịch tiếng Việt. Ưu tiên bản dịch câu đã lưu; nếu chưa có thì gọi đường dịch Nhật→Việt hiện hành. Lỗi dịch được báo trên màn, không ghi một bản dịch đoán vào sổ.
- `phu-de.js` nay lưu thêm `src.cau` và bản dịch câu (nếu đã có) khi lưu từ lời thoại. Với mục video cũ, chế độ có thể khôi phục câu từ `ytKho` cục bộ nếu cache còn và khớp video, thời gian, từ. Mục cũ không có câu và cache đã hết thì chưa có đủ dữ liệu để tạo bài.
- `kiem-tra/ngu-phap.mjs` kiểm tra chọn câu, cắt/xáo mảnh, cache và cú pháp hai bề mặt; `kiem-tra/ngu-phap-giao-dien.mjs` dùng Chromium xác nhận màn extension/Android hiện đáp án và bản dịch sau khi ghép đúng hoặc xem đáp án.

## Dữ liệu cần bảo toàn

- `notebook` là tập mục theo khóa có tiền tố: `javi:` và `kanji:` cho tiếng Nhật, `envi:` cho tiếng Anh. `ngu.js` quyết định cách lọc ngôn ngữ. Mục đã xóa dùng bia mộ `del` để lần đồng bộ sau không hồi sinh.
- Một mục có `ts` cho thay đổi nội dung. SRS có mốc riêng `srs.ts`; mỗi đường trong `duong` cũng có mốc chấm riêng. `Muc.tron` gộp nội dung và tiến độ theo các mốc khác nhau. Không thay phép gộp bằng cách lấy toàn bộ mục mới nhất.
- Các đường SRS là `nhin`, `nghe`, `dong`, `trai`. `srs.js` tính lịch, điểm và hồ sơ học. Một số trường cũ vẫn tồn tại để tương thích dữ liệu và phiên bản cũ.
- Gói đồng bộ có thể chứa `notebook`, `decks`, `hoc`, `luyenNoi`, `soDoSrs`, `phuDeSua`. Apps Script lưu nguyên gói `data` được gửi lên. Vì vậy mọi lối ghi phải giữ những trường nó không sửa.
- Ảnh đính kèm nằm cục bộ trong IndexedDB; khi đồng bộ, app bỏ mô tả ảnh trước khi gửi và giữ ảnh cục bộ khi gộp dữ liệu tải về.
- Cấu hình cũ có cloud riêng cho từng ngôn ngữ. Cấu hình kho chung đưa cả hai ngôn ngữ vào một Apps Script; các lối cũ vẫn cần hoạt động.

## Các mô-đun trung tâm

- `ngu.js`: định tuyến ngôn ngữ, tiền tố khóa, cấu hình cloud và tương thích dữ liệu cũ.
- `muc.js`: bia mộ, khôi phục phần người dùng tự sửa, gộp hai bản của một mục.
- `srs.js`: lịch ôn bốn đường, điểm, thống kê và gộp số đo.
- `tien-do.js`: tiến độ học và huy hiệu.
- `extension/phu-de.js`, `extension/phu-de-trang.js`, `extension/cat-cau.js`: lấy phụ đề YouTube, ghép cue thành câu, đồng bộ lời thoại với video và lưu câu có nguồn.
- `tu-lien.js`, `cau-nghe.js`, `kana.js`, `han-tu.js`: dữ liệu và bài học ngôn ngữ.
- `extension/background.js` và `android/www/app.js`: hai bộ điều phối tra cứu, lưu và đồng bộ.

## Kiểm thử và phát hành

- `kiem-tra/` hiện có 25 bài: 6 bài Node thuần, 19 bài Playwright chạy Chromium với extension thật.
- `test-neutrondict.yml` chạy toàn bộ 25 bài khi đẩy commit lên nhánh `codex/neutrondict-work`. Lần chạy đầu tiên đạt cả 25 bài. Workflow đang tạo đường dẫn Playwright tương thích với các import cố định trong bài kiểm thử; đó là bước hỗ trợ CI, chưa phải giải pháp di động lâu dài.
- `build-android.yml` build APK khi phần `android/` thay đổi trên `main`, hoặc khi chạy thủ công. Workflow này còn phát hành `latest-debug`; không được để một bản build thử trên nhánh làm việc ghi đè bản phát hành này.
- Thay đổi native cần chạy `npx cap sync android`, `node patch-android.js` và build Gradle; kiểm thử Playwright của extension không xác nhận phần native Android.

## Rủi ro cần xử lý trước khi mở rộng

1. **Ghi từ MCP lên cloud:** `mcp/neutrondict-mcp.mjs` gọi Apps Script `save` với `data: { notebook: nb }`. Apps Script ghi đè cả gói, nên một lượt sửa qua MCP có thể làm mất `decks`, `hoc`, `luyenNoi`, `soDoSrs`, `phuDeSua` trên cloud. Cần thêm bài kiểm thử giữ nguyên các trường rồi sửa lối ghi.
2. **Kiểm thử tương thích SRS:** `kiem-tra/srs-diem.mjs` so bản đang chạy với `git show HEAD:extension/srs.js`. Trong CI trên commit đã tạo, hai bản này có thể chính là cùng một file; phép so không bảo vệ khỏi thay đổi tương thích. Cần một baseline có chủ đích.
3. **Mô-đun chép đôi:** mới có bài thử byte-for-byte rõ ràng cho `srs.js`; những file dùng chung khác vẫn có thể lệch giữa extension và Android.
4. **Tài liệu phiên bản:** README gốc còn mô tả phiên bản cũ so với `extension/manifest.json` và `android/package.json`.
5. **Nối transcript với đường ôn nghe:** `phu-de.js` lưu `src.sel` là chữ/câu được chọn, không kèm `prefix`/`suffix`; `CauNghe.tuNguon` cần một câu đầy đủ chứa từ hoặc văn cảnh hai bên. Với mục lưu trực tiếp từ bảng lời thoại, `word` thường bằng `src.sel`, nên không sinh `cauNghe`. Cần kiểm thử ca này và truyền câu gốc đầy đủ khi lưu từ transcript.

## Quy tắc làm việc trên nhánh

Mọi thay đổi trước mắt thực hiện trên `codex/neutrondict-work`. Với thay đổi dữ liệu hoặc đồng bộ, kiểm tra dữ liệu cũ, bia mộ, nhiều thiết bị và cả hai ngôn ngữ. Chạy workflow kiểm thử của nhánh và xem log thật; nếu thay đổi Android, kiểm tra thêm build APK trên nhánh bằng workflow không phát hành.
