# Nghe câu YouTube gốc trong chế độ Học

## Phạm vi đã duyệt
Người dùng yêu cầu thử nghe đoạn video gốc ngay trong luồng học, sửa bánh răng Cài đặt và màn hình trống sau bài ngữ pháp. Triển khai trên `codex/neutrondict-youtube-news`, không merge main hoặc phát hành production.

## Hành vi và tiêu chí nghiệm thu
- Bài nghe có nguồn YouTube khớp đúng câu và có mốc bắt đầu/kết thúc hợp lệ sẽ phát trực tuyến đúng đoạn đó bằng player DualSub hiện có; hết câu tự trở về đúng thẻ trong buổi học.
- Không tải/tách âm thanh; không tạo thêm player/WebView YouTube. Giữ UI và đăng nhập hiện có.
- Tốc độ dùng `Srs.tocDoNghe` từ 1× đến 1,5×, giữ cao độ.
- Thiếu mốc câu, câu đã sửa khác nguồn, video không tải được hoặc timeout thì dùng Azure/TTS thiết bị. Không đoán thời lượng rồi phát sang câu khác.
- Hủy/Back/đổi thẻ/nghỉ buổi học dừng yêu cầu cũ; không phát TTS muộn lên thẻ mới. Home/ngắt ứng dụng không tự kéo người dùng về app.
- Không ghi điểm, reset SRS, tự chuyển thẻ hoặc làm mất hàng đợi chỉ vì phát video.
- Cài đặt có bánh răng khi đang chọn và không chọn. Ngữ pháp → nhìn/nghe/điền khuyết hiển thị lại thẻ bình thường; Back trong ngữ pháp thoát đúng buổi học.

## Cách thực hiện
1. Sửa trạng thái hiển thị và tên icon Android, kiểm thử luồng chuyển thật bằng Playwright.
2. Chuẩn hóa nguồn câu và giới hạn thời gian; điều phối phát/hủy trong JS với token chống kết quả cũ.
3. Mở chế độ đoạn câu trên player DualSub duy nhất, pause ở cuối, khôi phục tốc độ cũ và trả kết quả về notebook còn sống.
4. Kiểm thử dữ liệu, fallback/cancellation, native range driver và lifecycle; build APK và kiểm thử Android giả lập trên GitHub Actions.

## Kiểm chứng
Đang thực hiện. Kiểm thử offline không chứng minh video YouTube trực tiếp hoặc điện thoại thật đã hoạt động. Các mốc sai sẵn trong phụ đề nguồn vẫn cần đối chiếu với lời nói thực tế.
