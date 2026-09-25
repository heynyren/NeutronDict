# Đánh giá ghi đè tiến độ SRS khi ghi đồng thời

Ngày: 2026-09-25. Phạm vi xác nhận: extension Chromium trên nhánh `codex/neutrondict-work`.

## Kết luận

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

## Cách khắc phục đề xuất

Ưu tiên thống nhất mọi thao tác thay đổi notebook của extension về một đầu mối ghi trong background:

- Trang sổ tay, popup và các tác vụ gửi yêu cầu thay đổi cụ thể theo khóa/trường; không gửi cả bản notebook đã đọc từ trước.
- Đầu mối ghi xếp hàng chung cho chấm SRS, cách đọc, liên kết từ, thêm/sửa/xóa mục và gộp đồng bộ. Đọc dữ liệu mới nhất, áp dụng thao tác, rồi ghi trong cùng một lượt.
- Kết quả tính/lưu SRS được trả về sau khi lượt ghi hoàn tất. Bản vá cách đọc chỉ thay trường cách đọc; bản vá liên kết chỉ thay trường liên kết.
- Phần tra mạng chạy ngoài hàng đợi. Khi có kết quả mới thì đưa thao tác cập nhật vào hàng đợi.
- Chuyển các ca xen kẽ ở trên thành bài hồi quy: bắt buộc giữ được cả tiến độ và phần bổ sung. Thêm ca hai cửa sổ, xóa mục, đồng bộ đang chờ mạng và lỗi ghi.

Chỉ thêm thời gian chờ, chỉ tăng số lần chạy lại kiểm thử, hay chỉ sửa hàng đợi `vaSau` không giải quyết đủ vấn đề giữa các ngữ cảnh.

## Trạng thái

Lượt này bổ sung chẩn đoán và đánh giá. **Chưa thay đổi cơ chế ghi của ứng dụng.**
