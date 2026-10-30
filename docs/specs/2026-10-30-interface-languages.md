# Ngôn ngữ giao diện toàn app (2026-10-30)

## Yêu cầu bổ sung
Người dùng muốn mọi chức năng đổi đủ chữ giao diện khi chọn English hoặc 日本語. Rà cả extension, web UI Android và phần native YouTube/đọc báo.

## Kế hoạch và tiêu chí trước triển khai
- Rà các chuỗi T/T2 thiếu bản dịch, nhãn HTML chưa đánh dấu, chuỗi UI viết trực tiếp ở module mới.
- Bổ sung EN/JA cho nút, hướng dẫn, trạng thái, lỗi, nhãn trợ năng, JLPT (chỉ dẫn, nút, nhật ký và tên màn), ngữ pháp, lịch SRS, tiến độ, đọc báo, giọng đọc, preset màu, trang IPA và menu chuột phải.
- Dùng một lựa chọn ngôn ngữ cho host Android và locale native; sử dụng cơ chế AppLanguageSettings có sẵn, bọc context cho Android trước 13. Lưu trước khi Android tạo lại activity; không đưa locale vào bản ghi từ hay tiến độ.
- Giữ nguyên câu Nhật/Anh nguồn, nghĩa Việt trong thẻ học, nội dung báo/video, truyện học JLPT theo giáo trình, từ người dùng lưu, tên riêng và dữ liệu bài kiểm tra. Đây là ngữ liệu, không phải chữ điều khiển giao diện.
- Đổi ngôn ngữ phải vẽ lại thành phần UI động và tiếp tục áp dụng cho thành phần tạo về sau; không dịch bằng cách sửa toàn bộ text DOM của trang báo/YouTube.
- Kiểm tra chuỗi/placeholder không mất tham số; Chromium đổi VI→EN→JA→VI, mở các màn thực tế và tìm chữ UI còn sót; native kiểm chứng locale/context và các popup theo bộ device hiện có.
- Chạy hồi quy trên cloud của đúng commit cuối. Chưa kiểm chứng trên điện thoại thật phải được báo rõ.
