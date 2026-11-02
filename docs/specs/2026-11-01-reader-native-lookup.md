# Nghĩa nhanh khi đọc báo trên Android

## Triệu chứng và phạm vi
Người dùng xác nhận ngày 01/11/2026: popup mở ngay, nghĩa hiện chậm; YouTube không chậm tương tự.
Thiết kế ban đầu giữ thao tác bôi đen rồi bấm Tra RaKuLanG và popup hai bước.

**Cập nhật theo yêu cầu ngày 02/11/2026:** riêng Android, bôi đen rồi thả tay sẽ tự mở popup đầu sau khi vùng chọn ổn định; bỏ bước bấm Tra RaKuLanG. Popup đầu của cả đọc báo và YouTube có nút Lưu vào sổ tay dưới nghĩa. Popup chi tiết vẫn mở được. Không thay đổi thao tác của extension. Cơ chế tra native và đường lưu sổ tay dưới đây tiếp tục được dùng.

## Phát hiện từ mã
- NewsReaderActivity gửi lookup qua MediaPlugin.request sang WebView Capacitor của màn sổ tay đang ở nền.
- JavaScript đọc/parse toàn bộ notebook trước mỗi cache hit và gọi dịch qua bridge thêm lần nữa.
- Thuật ngữ có sẵn chỉ được ghép sau khi mạng trả về hoặc thất bại.
- YouTube gọi GoogleWebTranslator / OnDeviceTranslator trực tiếp, có cache đĩa và nhớ địa chỉ Google tốt.
Các điểm này được xác nhận trong mã; chưa coi là số đo trên điện thoại người dùng.

## Thực hiện và tiêu chí
1. Tra nghĩa native độc lập với WebView sổ tay; dùng cùng bộ dịch, cache đĩa, địa chỉ tốt và lựa chọn engine của YouTube.
2. Đọc sổ tay hiện có dưới dạng chỉ đọc trên luồng IO, giữ chỉ mục nghĩa khi nội dung chưa đổi. Nghĩa người dùng sửa ưu tiên trước cache; xóa/sửa/đổi ngôn ngữ phải thấy ngay. Không tạo người ghi sổ tay thứ hai.
3. Nạp gói thuật ngữ một lần, ngoài luồng UI. Thuật ngữ chắc chắn trả ngay; từ chung/gói sau giữ nghĩa phổ thông trước, dùng gói làm fallback khi mạng lỗi.
4. Mạng có hạn chờ, hủy được khi đóng/chọn từ mới; dùng mô hình trên máy đã cài làm fallback, không âm thầm tải mô hình lớn khi chọn từ.
5. Giữ nguồn, câu, bản dịch và các đường SRS khi lưu; không ghi sổ tay chỉ vì tra.
6. Kiểm thử pure Kotlin (ưu tiên/cancellation/cache/ngôn ngữ/thuật ngữ), Android thật trong emulator (đọc preferences của Capacitor, chọn trên bài offline, không phụ thuộc phản hồi JS màn nền); Node/Chromium hồi quy.
7. Ghi thời gian fixture offline và số lần backend được gọi; không suy ra độ trễ mạng hoặc điện thoại thật từ emulator.

## Phát hành
Nhánh riêng từ main. Kiểm thử cloud và APK tích hợp trước khi gộp theo ủy quyền hiện có của chủ dự án. Không thay package/signing/schema đồng bộ.

## Trạng thái
Kết quả cloud cho đúng commit và ảnh kiểm tra được ghi tại [PR #32](https://github.com/heynyren/NeutronDict/pull/32). Chỉ gộp sau khi các kiểm tra đạt; số đo giả lập không đại diện cho mạng hay điện thoại của người dùng.

## Sửa mất vùng chọn khi mở popup (02/11/2026)
- Không kết thúc ActionMode khi nhận được từ: thao tác đó xóa vùng bôi đen và hai tay nắm của WebView.
- Chỉ ẩn thanh công cụ hệ thống trong lúc popup tra từ đang mở; giữ vùng chọn native để kéo rộng/thu hẹp. Đổi vùng chọn sẽ hủy kết quả cũ và tra cụm mới sau khi ổn định.
- Chỉ kết thúc vùng chọn khi người dùng đóng, mở thẻ chi tiết hoặc rời trang. Kết quả tra trùng vùng chọn không được khởi động lại yêu cầu đang chạy.
- Kiểm thử bằng nhấn giữ và kéo tay nắm native trên WebView Android thật trong emulator; không dùng range JavaScript hoặc ActionMode giả để thay thế ca thao tác này. Chụp cả lúc chọn một từ và sau khi kéo thành cụm từ.
