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

## Kết quả triển khai
- Nguồn Android/extension có thêm metadata toàn câu, độc lập với mốc mảnh để mở nguồn.
- Luồng phát giữ player YouTube duy nhất, tạm ẩn phụ đề học, tự pause/khôi phục trước khi trả về thẻ.
- Hủy có xác nhận dừng; token và epoch ngăn kết quả cũ phát lại hoặc kéo app lên trước sau Home.
- Giữ các màn thiết lập ban đầu của DualSub; thiếu thiết lập hoặc mốc câu chuyển sang TTS.
- Sửa icon gear-six, khôi phục container thẻ sau ngữ pháp và Back trong buổi học.
- Giữ SRS, không tính thời gian chờ/phát video thành phản hồi chậm.

## Kiểm chứng
- Node và Playwright ở commit `6001199` đã qua; gồm hồi quy ngữ pháp → thẻ từ, bánh răng và nghe giữ nguyên thẻ.
- Node và Android unit/build ở commit `bb467c9` đã qua; thêm hủy lúc đang dừng, giới hạn thời gian, thiết lập ban đầu và loại thời gian chờ khỏi SRS.
- Bản sửa epoch cho Home trong lúc cleanup tiếp tục chạy cùng các bộ trên. Kết quả cuối, báo cáo Android và APK của đúng mã được cập nhật tại [PR #27](https://github.com/heynyren/NeutronDict/pull/27).
- Kiểm thử offline không chứng minh video YouTube trực tiếp hoặc điện thoại thật đã hoạt động. Mốc sai sẵn trong phụ đề nguồn vẫn cần đối chiếu với lời nói thực tế; chữ in trong hình video vẫn có thể hiện.

## Bổ sung: quay lại nguồn web
Người dùng xác nhận bản cũ tô sáng cả câu; yêu cầu làm nổi bật từ đã lưu. Trình đọc tiếp tục mở bài trong app, dùng câu/prefix/suffix để chọn đúng lần xuất hiện nhưng chỉ đánh dấu từ. Dùng text-node ranges để giữ inline HTML và ruby; thử lại tối đa 8 giây khi nội dung tải muộn/dựng lại. Không tạo lựa chọn văn bản nên không tự mở popup tra từ. Kiểm thử gồm Playwright trên DOM thật và luồng native đọc bài → chọn từ → lưu notebook.

## Bổ sung: tra từ thủ công khi đọc báo
Theo yêu cầu mới, bôi đen chỉ chọn chữ; không có timer hoặc sự kiện thả tay tự mở popup. Người dùng chỉnh vùng chọn rồi bấm Tra NeutronDict ở menu chọn chữ hoặc thanh đầu trình đọc. Kiểm thử native chờ sau chọn, xác nhận 0 yêu cầu tra; bấm menu thật, xác nhận 1 yêu cầu và lưu vào notebook. YouTube giữ tương tác tra từ hiện có.
