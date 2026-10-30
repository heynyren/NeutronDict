# RaKuLanG và màu pastel (2026-10-30)

## Quyết định đã duyệt
- Đổi tên hiển thị Android và extension thành RaKuLanG. Logo gấu trắng tròn 2D, mắt chấm, lè lưỡi đã chọn vẫn là biểu tượng.
- Màu xanh từ ảnh người dùng: #8BD4E6. Thêm lựa chọn màu trong Cài đặt: xanh dương, bạc hà, hồng, đào, lavender, vàng kem; mặc định xanh.
- Chọn là xem ngay và tự lưu. Nút/nền dùng pastel, chữ đủ đậm trên giao diện sáng; giao diện tối giữ mặt tối và điểm nhấn pastel.
- Màu của trạng thái đúng/sai và phân loại từ vẫn có ý nghĩa riêng. Màu cảnh JLPT không phải màu thương hiệu.
- Giữ applicationId, khóa lưu, giao thức đồng bộ, URL kho GitHub để bản cài đặt tiếp tục cập nhật và đọc dữ liệu cũ.

## Kế hoạch trước triển khai
1. Một bảng preset dùng chung cho trang extension, popup, thẻ tra nổi và web UI Android; thuộc tính màu riêng, không ghi lại toàn bộ settings/sổ tay.
2. Nút chọn dễ chạm, nhãn màu, hỗ trợ bàn phím/screen reader; lưu theo thứ tự khi chọn nhanh, báo lỗi nếu lưu thất bại.
3. Cầu nối tin cậy NeutronMedia lưu lựa chọn vào theme preference native để YouTube, popup đọc báo và web UI cùng màu. Chỉ nhận danh sách preset. Android cơ bản dùng Preferences như trước.
4. Tên mới ở launcher, menu tra/lưu/chia sẻ, header, thông báo, prompt AI và bản dịch UI. Không đổi định danh nội bộ.
5. Kiểm chứng lựa chọn/persistence ở Chromium; chụp sáng/tối màn desktop/mobile và popup; kiểm tra tỷ lệ tương phản chữ chính/nút/link; kiểm chứng primary native thực tế và launcher trong device suite hiện có.
6. Chạy Node, Chromium, unit Android, device suite trên cloud rồi gộp main theo chỉ dẫn đã có.

## Giới hạn
Không tự đồng bộ sở thích màu giữa thiết bị. Người dùng có thể chọn màu riêng ở mỗi máy; dữ liệu từ/SRS/JLPT vẫn theo cơ chế đồng bộ hiện có.

## Bổ sung UI đã được người dùng yêu cầu
- Giữ vị trí chức năng, tinh gọn đường viền, khoảng đệm, độ bo và bóng theo phong cách Material của màn YouTube.
- Tên ứng dụng chính RaKuLanG; khu vực YouTube mang tên Rakubidio.
- Bỏ nhãn DualSub, dòng phiên bản/kiểm tra cập nhật và liên kết xem mã nguồn GitHub trong drawer YouTube. Giấy phép thư viện vẫn truy cập được; không thay đổi tính năng học hoặc playback.
