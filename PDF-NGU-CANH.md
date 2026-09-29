# Tự lấy ngữ cảnh PDF — 4.30.1

## Thao tác
Mở PDF trong Chrome như bình thường → bôi đen từ → chuột phải →
**Lưu "…" vào NeutronDict (kèm nguồn)**.
Extension tự đọc lớp chữ của PDF ở nền, tìm câu chứa từ và lưu cùng nguồn.
Không mở tab, không có màn chọn PDF/câu và không có ô nhập ngữ cảnh.

PDF trên máy cần bật **Cho phép truy cập URL của tệp** cho NeutronDict tại
chrome://extensions (Chrome áp dụng quyền này cho mọi extension đọc file://).
PDF web dùng quyền activeTab khi bấm menu; nguồn chặn tải lại/đòi quyền khác
có thể không đọc được. Bật quyền tệp chỉ một lần, không phải thao tác khi lưu từ.

## Cách trích câu
- PDF.js đọc chữ và vị trí; bỏ furigana nhỏ nằm trên chữ chính.
- Tách cột, bản dịch Việt, từ đầu mục và ví dụ; bỏ dấu ô chọn/nhãn từ loại.
- Ghép dòng xuống hàng do bố cục. Dòng gạch đầu dòng là đoạn mới.
- Lùi/tiến từ vị trí từ đến dấu . 。 ． ! ！ ? ？ … hoặc ranh giới dòng đầu mục.
  Dấu chấm trong số thập phân/viết tắt không cắt câu.
- Quét theo thứ tự trang và đoạn, lấy câu hợp lệ đầu tiên chứa từ theo lựa chọn
  của người dùng. Nhiều câu chứa cùng từ không gây cảnh báo hay yêu cầu chọn câu.
- PDF ảnh không có lớp chữ chưa được OCR. Không tạo câu giả thay cho câu nguồn.

Câu gốc được lưu trước khi dịch; Gemini, bài nghe và ngữ pháp dùng cùng câu.
Bản dịch đến muộn chỉ cập nhật đúng phiên bản câu. Lưu lại từ giữ SRS, ghi chú,
nghĩa đã hiệu đính và trạng thái đóng băng.
Huy hiệu ✓句 xác nhận đã lưu câu; ? và thông báo trong popup cho biết lý do thiếu câu.

## Cài/cập nhật
GitHub Actions → Test NeutronDict → lần chạy xanh trên main →
artifact NeutronDict-extension-4.30.1.
Chép bản mới vào đúng thư mục extension đang cài rồi Reload ở chrome://extensions
để giữ ID và sổ tay. ZIP mã nguồn chưa có PDF.js; dùng gói CI đã đóng gói.

## Kiểm thử
Kiểm tra PDF có furigana, từ nằm ở cả đầu mục và câu ví dụ, bản dịch xen kẽ,
dấu câu/đầu dòng, nhiều câu chứa cùng từ và quy tắc lấy câu đầu tiên. Kiểm trình duyệt đi qua chính hàm
xử lý menu chuột phải, tài liệu offscreen và storage thật; xác nhận không mở
tab, câu đi vào Gemini/nghe/ngữ pháp, SRS giữ nguyên khi bổ sung câu.
Không đưa toàn bộ PDF riêng của người dùng lên repository.
