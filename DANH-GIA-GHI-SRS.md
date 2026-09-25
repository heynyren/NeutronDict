# Đánh giá ghi đè tiến độ SRS khi ghi đồng thời

Ngày: 2026-09-25. Phạm vi xác nhận: extension Chromium trên nhánh `codex/neutrondict-work`.

## Trạng thái sau bản sửa

**Đã sửa cơ chế ghi trong extension**, kiểm chứng bằng [14 ca hồi quy trên cloud](https://github.com/heynyren/NeutronDict/actions/runs/36123191616), tại commit [26a23fc](https://github.com/heynyren/NeutronDict/commit/26a23fcfcc09062f97af7ecc9ca91f5436055bb1).

- `extension/kho-ghi.js` dùng một khóa Web Locks có cùng tên trong tất cả trang sổ tay và service worker. Khóa bao trọn việc đọc dữ liệu mới nhất, sửa và lưu; không gọi lồng khóa, không giữ khóa khi gọi mạng. [Cơ chế Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
- Chấm SRS lưu lịch, thống kê nhịp và số đo trong cùng lượt ghi. Lưu lại từ giữ cả `srs` lẫn `duong`. Hoàn tác kiểm tra lượt chấm hiện tại để tránh hủy tiến độ mới ở cửa sổ khác.
- Các đường ghi notebook của trang sổ tay, vá cách đọc/liên kết/câu nghe, lưu từ, link Gemini, gộp cloud cũ và bước ghi cuối khi đồng bộ đều dùng khóa chung.
- Các ca từng mất lịch nay giữ đúng giá trị đã tính: cùng từ 16,50 → 16,50 ngày; khác từ 15,73 → 15,73 ngày. Hai trang chấm cùng từ/khác từ giữ cả hai mẫu nhịp.
- Kiểm thử thêm bia mộ khi xóa, lỗi ghi, lưu từ chờ tra cứu, đồng bộ chờ mạng, khóa bước ghi cuối của đồng bộ, link Gemini và đóng tab giữ khóa. Báo cáo: `REGRESSIONS_PASSED`, không có lỗi trang.
- Đã trả mẫu `nd-oncum.mjs` về trạng thái thiếu cách đọc như trước để kiểm tra SRS ngay cả khi tác vụ bổ sung nền chạy.

Bản sửa ngăn các lượt ghi tiếp theo làm mất cập nhật theo những đường đã kiểm tra; không tự khôi phục những lượt học đã bị ghi đè trước đây. Phạm vi kiểm chứng là extension Chromium; không phải bản vá APK Android hay thay đổi máy chủ cloud.

Toàn bộ [30 bài kiểm thử của dự án](https://github.com/heynyren/NeutronDict/actions/runs/36123191580) đã đạt ở cùng commit: 8 bài Node và 22 bài Chromium.

## Phát hiện trước khi sửa

**Đã xác nhận lỗi mất cập nhật, mức ưu tiên P1 (cao).** Trang sổ tay và tác vụ nền có thể ghi đè tiến độ SRS vừa lưu. Lỗi nằm ở việc phối hợp ghi dữ liệu; trong các ca tái hiện, SRS tính lịch mới đúng và lịch đã xuất hiện trong kho trước khi bị lượt ghi sau thay bằng bản cũ.

- Mã được kiểm tra: [dba3176](https://github.com/heynyren/NeutronDict/commit/dba3176170075dc2ad63b860d9a2b2f5c32c3a80).
- [Lượt chẩn đoán trên GitHub Actions](https://github.com/heynyren/NeutronDict/actions/runs/36122340475).
- Công cụ: `cong-cu/chan-doan-ghi-srs.mjs`. Báo cáo JSON nằm trong artifact `srs-write-report`.
- Workflow chẩn đoán thành công nghĩa là đã chạy xong thí nghiệm; báo cáo thực tế là `CONFIRMED_LOST_WRITE`, không phải kết luận ứng dụng không có lỗi.

## Phương pháp và giới hạn

Dùng extension thật trong Chromium trên cloud với sổ tay giả, gọi các hàm thật `gradeWord` và `ghiVaDoc`. Tạm giữ một lời gọi `chrome.storage.local.set` sau khi nó đã nhận dữ liệu, cho lượt ghi kia hoàn tất, rồi thả lượt bị giữ. Không thay nội dung payload hay kết quả tính SRS. Thí nghiệm chủ động tạo thứ tự xen kẽ hợp lệ, không đo tần suất gặp lỗi ngoài thực tế. Không đọc/sửa sổ tay thật của người dùng.

Hai ca đối chứng chạy lần lượt giữ đúng cả tiến độ lẫn cách đọc. Bốn ca xen kẽ xác nhận dữ liệu bị mất theo thứ tự ghi; không có lỗi JavaScript trên trang.

| Tình huống | Kết quả thực đo |
| --- | --- |
| Tác vụ nền xong trước rồi chấm SRS | 16,56 ngày được giữ đúng; cách đọc mới còn |
| Chấm SRS xong rồi tác vụ nền mới bắt đầu | 16,96 ngày được giữ đúng; cách đọc mới còn |
| Nền đọc bản cũ, chấm SRS xong, nền ghi muộn — cùng từ | 14,56 → 7 ngày; mất cả `duong` và `srs` mới |
| Nền sửa 写真, người học chấm 改善, nền ghi muộn | 16,85 → 7 ngày ở 改善 |
| Trang giữ bản cũ rồi ghi sau khi nền sửa cách đọc | Cách đọc 写真 quay từ しゃしん về しゃじん; lịch mới vẫn còn |
| Hai trang sổ tay chấm hai từ khác nhau, một trang ghi muộn | Tiến độ của trang kia quay từ 15,87 → 7 ngày |

Các khoảng ngày thay đổi nhẹ giữa các lần chạy vì thuật toán có yếu tố ngẫu nhiên. Bằng chứng quan trọng là giá trị đã lưu bị thay bằng đúng giá trị cũ sau lượt ghi khác.

## Nguyên nhân trong mã

1. `extension/notebook.js`: `suaSoTay` / `capNhat` xếp hàng trong từng trang. `capNhat` đọc toàn bộ notebook và ghi lại toàn bộ; `gradeWord` đi qua đường này.
2. `extension/background.js`: `vaSau` dùng hàng đợi `hangVa` riêng trong service worker. `ghiVaDoc`, `lienVaSau`, `cauNgheVaSau`, `rubyVaSau` đọc và ghi cả notebook qua hàng đợi này.
3. Hai hàng đợi không khóa lẫn nhau. Đọc lại sổ ngay trước khi sửa vẫn chừa khoảng trống giữa đọc và ghi.
4. Có đường ghi khác chưa đi qua cùng một đầu mối, như `geminiGhiLink`, lưu từ và đồng bộ. Cần rà soát toàn bộ đường ghi khi sửa; thí nghiệm hiện chỉ trực tiếp xác nhận `ghiVaDoc` và chấm ở các trang.

Chuỗi sự kiện đã tái hiện:

```text
Nền đọc notebook: lịch = 7 ngày
Trang chấm rồi lưu: lịch = 14,56 ngày
Nền bổ sung cách đọc vào bản đã đọc, ghi lại cả notebook
Kho hiện tại: cách đọc mới, lịch cũ = 7 ngày
```

Ngay cả hai từ khác nhau vẫn bị ảnh hưởng vì đơn vị ghi là toàn bộ sổ tay. Trong ca nền ghi muộn, thống kê nhịp bấm ở khóa khác vẫn còn trong khi lịch của từ bị trả về cũ: trạng thái học có thể không còn nhất quán giữa các phần dữ liệu.

## Ý nghĩa của 29/29 bài kiểm thử trước đó

Hai lượt CI trước đã có ca SRS đọc lại 7 ngày thay vì lịch mới. Bổ sung reading/ruby vào mẫu `nd-oncum.mjs` làm tác vụ vá furigana không còn chạy cho mẫu ấy, giúp bài kiểm thử lịch chạy ổn định. **Đây là thay đổi dữ liệu mẫu, không phải sửa lỗi ghi đồng thời.** Kết quả 29/29 không chứng minh trường hợp ghi đồng thời an toàn. Cần giữ một bài hồi quy riêng cho dữ liệu bị chồng ghi sau khi sửa.

Chưa đo được tần suất lỗi trên máy thật, chưa kết luận sổ của người dùng đã mất bao nhiêu lượt học. Chưa tái hiện trường hợp này trên APK Android; không áp dụng kết luận về service worker của extension sang Android.

## Hướng xử lý được đề xuất ở lượt đánh giá

Ưu tiên thống nhất mọi thao tác thay đổi notebook của extension về một đầu mối ghi trong background:

- Trang sổ tay, popup và các tác vụ gửi yêu cầu thay đổi cụ thể theo khóa/trường; không gửi cả bản notebook đã đọc từ trước.
- Đầu mối ghi xếp hàng chung cho chấm SRS, cách đọc, liên kết từ, thêm/sửa/xóa mục và gộp đồng bộ. Đọc dữ liệu mới nhất, áp dụng thao tác, rồi ghi trong cùng một lượt.
- Kết quả tính/lưu SRS được trả về sau khi lượt ghi hoàn tất. Bản vá cách đọc chỉ thay trường cách đọc; bản vá liên kết chỉ thay trường liên kết.
- Phần tra mạng chạy ngoài hàng đợi. Khi có kết quả mới thì đưa thao tác cập nhật vào hàng đợi.
- Chuyển các ca xen kẽ ở trên thành bài hồi quy: bắt buộc giữ được cả tiến độ và phần bổ sung. Thêm ca hai cửa sổ, xóa mục, đồng bộ đang chờ mạng và lỗi ghi.

Chỉ thêm thời gian chờ, chỉ tăng số lần chạy lại kiểm thử, hay chỉ sửa hàng đợi `vaSau` không giải quyết đủ vấn đề giữa các ngữ cảnh.

## Lịch sử

Báo cáo ban đầu chỉ xác nhận lỗi. Phần “Trạng thái sau bản sửa” ở đầu tài liệu ghi lại cơ chế đã triển khai và bằng chứng kiểm thử mới.
