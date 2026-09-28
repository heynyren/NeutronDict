# SRS: phối hợp, lịch riêng và ngữ pháp

Triển khai trên nhánh `codex/neutrondict-work`, theo phương án được duyệt ngày 28/09/2026.

## Nghe và nhìn

- Giữ nguyên thuật toán `Srs.cham` và tốc độ phát nghe.
- Sau một lượt nhìn đúng, nới ngày hẹn tối đa ×1,5 khi giãn cách cơ sở của cả hai đường ≥7 ngày, hai lượt nghe đến hạn gần nhất đều đúng và diễn ra sau lần nhìn sai gần nhất, lịch nghe chưa quá hạn và đường nghe còn hoạt động.
- `ngay/net/lv` vẫn biểu thị lịch cơ sở. Hệ số nới chỉ tác động `due`, không nhân chồng hay cộng điểm nhìn từ kết quả nghe.
- Rải lịch nhìn ưu tiên tránh ngày hẹn nghe trong phạm vi rải tải hiện có.
- Chuỗi nghe đúng bắt đầu thu từ bản mới; không suy đoán lịch sử của dữ liệu cũ. Lịch có sẵn chỉ đổi khi chấm lượt tiếp theo.
- Hệ số là lựa chọn sản phẩm cần theo dõi bằng dữ liệu thực, không phải một mức tối ưu đã được chứng minh.

## Lịch từng đường

Nút **Lịch từng đường** có ở thẻ sổ tay và màn học.

- **Hẹn lại**: nhập 1–3650 ngày tính từ lúc lưu. Đây là hẹn riêng một lần, không thay đổi điểm/giãn cách cơ sở.
- **Đóng băng đường này**: dừng riêng Nhìn, Nghe, Đồng nghĩa hoặc Trái nghĩa, giữ lịch sử.
- **Mở lại đường này**: tiếp tục lịch trước đó; nếu đã quá hạn thì đến hạn ngay.
- **Dùng lịch tự động**: bỏ hẹn riêng, dùng lịch SRS đã lưu.
- Đóng băng Nhìn cũng cho phép mở các đường có dữ liệu dù mặt chữ chưa đạt ngưỡng mở tự động.
- Hẹn/đóng băng loại bỏ thẻ tương ứng còn nằm trong buổi đang mở. Lượt chấm từ cửa sổ cũ bị chặn khi đã đóng băng/hẹn lại.

Cài đặt lưu ở `lichRieng[duong]`, có `ts` riêng, được gộp độc lập với điểm và nội dung khi đồng bộ. Tra rồi lưu lại một từ đang có vẫn giữ cài đặt này. Xoá hẳn rồi lưu lại bắt đầu vòng ôn mới.

**Tắt mạng nghĩa** vẫn tắt bài đồng/trái nghĩa của chính từ đó tới khi bật lại. Từ ấy có thể xuất hiện trong bài của từ khác có liên kết; việc tắt không xoá các liên kết.

## Ngữ pháp

Kho riêng `nguPhapSrs`, khoá `ja:` + câu chuẩn hoá khoảng trắng; cùng câu từ nhiều mục dùng chung một lịch. Kho được đưa vào đồng bộ và sao lưu JSON của extension.

| Cấp | Ngày |
|---|---:|
| 1 | 3 |
| 2 | 7 |
| 3 | 14 |
| 4 | 30 |
| 5 | 60 |
| 6 | 120 |
| 7 | 240 |
| 8 | 365 |

- **Ôn ngữ pháp đến hạn và câu mới**: chấm SRS theo câu.
- **Luyện tất cả**: mọi câu hợp lệ, không đổi lịch; không có trần 10 câu.
- Đúng lần đầu tăng một cấp. Đã sửa sai giữ cấp và hẹn 3 ngày. Xem đáp án lùi một cấp (tối thiểu 1), hẹn 3 ngày.
- Lượt phục hồi đúng khôi phục lịch của cấp đó, không tăng cấp.
- Mỗi câu sai/xem đáp án được thêm tối đa một lượt củng cố cuối buổi; lượt củng cố không ghi thêm SRS.
- Kiểm tra theo câu gốc đã lưu. Thứ tự khác được ghi “chưa khớp câu gốc”, không kết luận mọi thứ tự khác đều sai ngữ pháp.
- Hiện câu gốc và bản dịch sau khi làm xong/xem đáp án.
- Lượt ghi phải khớp phiên bản câu và lịch lúc bắt đầu; hai cửa sổ/bấm lặp chỉ chấm một lần. Câu đã mất nguồn không được chấm bằng thẻ cũ.
- Đổi bản dịch giữ lịch; đổi câu tạo khoá mới. Câu không còn nguồn hợp lệ không xuất hiện trong hàng đợi.
- Điểm, số bài đến hạn và tiến độ của chế độ Học không cộng ngữ pháp.

## Kiểm thử

- `kiem-tra/srs-phoi-hop.mjs`: tính lịch, độc lập điểm, đóng băng/hẹn lại, gộp cài đặt, giữ nguyên kết quả chấm nghe, phục hồi sau lỗi nhìn và SRS ngữ pháp.
- `kiem-tra/srs-moi-giao-dien.mjs`: nút trong buổi học, dữ liệu thật của extension/Android trong trình duyệt, giữ lịch qua tải lại, luyện tự do, hơn 10 câu, ghi đồng thời, đồng bộ chậm.
- Mô phỏng 120 từ/180 ngày với mọi câu trả lời Nhớ dùng để so khối lượng lịch; đây không phải kết quả đo từ người học.
- Chạy cùng toàn bộ kiểm thử hiện có qua GitHub Actions. Kết quả chạy cuối được dẫn trong báo cáo giao việc.
