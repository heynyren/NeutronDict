# Ngữ cảnh web và phụ đề — 4.30.3

- Chụp vùng chọn và chữ xung quanh trước khi chờ tra từ hoặc chuyển focus.
- Dùng chung WebContext cho chuột phải, popup trên trang, popup thanh công cụ và phím tắt.
- Giữ toàn bộ nguồn khi chuyển qua popup, gồm câu, bản dịch, PDF và mốc YouTube.
- Đọc tới biên câu trong khối DOM, bỏ ruby/rt và nội dung ẩn phổ biến.
  Không cắt cố định 60 ký tự; biên khối đầy đủ được đánh dấu rõ.
- Lưu câu nguồn tối đa 8.000 ký tự. Giới hạn bài nghe thông thường 220 và
  bài ngữ pháp 180 vẫn được áp dụng riêng; không biến câu dài thành nửa câu.
- Khi mở sổ, khôi phục câu từ phần trước/sau còn đủ dữ liệu.
  Ghi qua khóa chung, giữ SRS, hạn ôn, đóng băng, bản dịch tự sửa và ghi chú.
  Gemini cũng đọc được nguồn cũ còn đủ chữ mà không đợi tác vụ nền.
- Không suy đoán phần đầu/đuôi đã bị cắt khỏi dữ liệu cũ. Mục chỉ còn URL và từ,
  không còn câu hay chữ xung quanh, cần lấy lại nguồn; lượt này không tự tải hàng loạt website.
- Bảng phụ đề NeutronDict giữ câu gốc và mốc của mẩu được chọn cả khi chuột phải
  hoặc dùng phím tắt. Câu không còn bị cắt ở ký tự 400.
- Phụ đề gốc hiển thị trên video YouTube: lưu chữ quanh vùng chọn đang có trong DOM
  và thời điểm phát. Nếu phụ đề chỉ hiện một mẩu câu, không thể tự suy ra chữ chưa hiện;
  bảng phụ đề NeutronDict có câu ghép đầy đủ là nguồn tốt hơn.

## Kiểm thử cloud

Dùng đoạn 可否 từ https://denken-ou.com/rironh22-16/ làm fixture cố định.
Kiểm DOM, ruby, câu dài, đầu mục không dấu chấm, chữ cách từ tiếng Anh,
lưu qua menu/popup/thanh công cụ, vùng chọn mất khi tra chậm, khôi phục từ cũ.
Kiểm riêng bảng phụ đề trong shadow DOM và caption gốc YouTube, gồm câu, dịch,
mã video, giây phát và câu hỏi Gemini. Các dịch vụ từ điển/dịch được giả lập để
kết quả không phụ thuộc mạng; DOM, mã extension, message và storage chạy thật.
