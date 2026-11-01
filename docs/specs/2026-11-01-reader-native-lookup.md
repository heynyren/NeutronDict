# Nghĩa nhanh khi đọc báo trên Android

## Triệu chứng và phạm vi
Người dùng xác nhận ngày 01/11/2026: popup mở ngay, nghĩa hiện chậm; YouTube không chậm tương tự.
Giữ thao tác bôi đen rồi bấm Tra RaKuLanG và popup hai bước hiện có.

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
