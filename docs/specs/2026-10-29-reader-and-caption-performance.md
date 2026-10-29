# Tra báo nhanh, popup DualSub và đồng bộ phụ đề

## Yêu cầu đã duyệt
- Bôi đen bài báo vẫn phải bấm Tra NeutronDict; không tự bật cửa sổ khi chỉnh vùng chọn.
- Dùng lại chính PhraseActionBar (nghĩa nhanh, sao chép, loa, mở thẻ) rồi WordLearningDialog/CharacterPage của DualSub.
- Hiện popup ngay, lấy nghĩa từ sổ tay/bộ nhớ trước; không đợi dịch câu, IPA hoặc tải gói thuật ngữ để hiện nghĩa. Chi tiết và lưu vẫn giữ câu gốc, nguồn, bản dịch và dữ liệu SRS.
- Con trỏ dùng thời gian video và mốc từ khi có; sub DOM trễ/sớm không kéo lùi/đẩy sớm con trỏ đó. Live chỉ dự phòng khi thiếu mốc. Tua, dừng, buffer, đổi tốc độ và thay video phải tái neo đồng hồ.
- Phụ đề YouTube trên extension tô loại từ tiếng Nhật: danh/động/tính/trạng/đại/liên từ, trợ từ; bật tắt được và có chú giải. Dùng Kuromoji/IPADIC phân tích thật trên worker, không gửi lời thoại tới AI/máy chủ.

## Kế hoạch và giới hạn
1. Đóng gói Kuromoji.js 0.1.2 + dictionary, giấy phép và SHA-512 đã khóa; source ZIP và artifact đều dùng được, không tải mã thực thi từ CDN lúc chạy.
2. Tái sử dụng popup native; tách nghĩa nhanh khỏi làm giàu/dịch câu, hợp nhất truy vấn trùng, cache có giới hạn, không ghi dữ liệu khi chỉ tra.
3. Ưu tiên timestamps, sửa đồng hồ tái neo; kiểm thử các tình huống seek/rate/buffer/sub trễ.
4. Phân tích Nhật trong worker của offscreen chung với PDF; chỉ xử lý các dòng đang nhìn thấy, cache giới hạn, hủy cập nhật cũ; giữ nguyên text/timing/click/lưu/ngữ cảnh.
5. Kiểm thử Node, Chromium extension thực và Android unit/emulator trên GitHub Actions. Chụp popup theme tối/sáng và bảng phụ đề.

## Phát hành
Chủ dự án ngày 29/10/2026 yêu cầu đẩy main sau khi xong. Merge PR #27 sau các gate trên đúng HEAD đều thành công; không thay khóa ký APK. APK tích hợp vẫn là gói preview riêng; main phải có workflow tái tạo APK đó. Không khẳng định đã thử YouTube trực tiếp/điện thoại thật từ fixture offline.

## Tiêu chí kiểm chứng
- Popup đầu xuất hiện dù dịch câu bị treo; popup chi tiết không gọi lại từ vừa tra. Lỗi mạng có trạng thái, đóng/chuyển trang không nhận kết quả cũ.
- Nghĩa tự sửa được ưu tiên ngay cả khi cache đã có. Lưu vào sổ tay cũ không làm mất SRS hay hồi sinh mục đã xóa.
- Timestamps chuẩn thắng live caption chậm/sớm; các transcript không có mốc vẫn dùng live. Clock không trôi khi tua mất sự kiện hoặc buffer.
- Worker thật trả đúng nhãn cho câu Nhật, giữ nguyên ký tự kể cả emoji; nested span giữ lựa chọn, mốc nghe, lưu và không gây tải lại toàn bộ transcript.
- PDF vẫn trích câu khi dùng đồng thời với POS; timeout/crash worker không treo yêu cầu.

## Kết quả
Đã triển khai: popup dùng nguyên PhraseActionBar/WordLearningDialog; bộ tra chỉ đọc có dedupe/cache giới hạn; dịch câu sau khi lưu; worker Kuromoji đóng gói và chỉ phân tích dòng thấy được. PDF và POS chia quyền sở hữu offscreen, không đóng nền khi tác vụ khác đang dùng. Đồng hồ tái neo khi mất seek/buffer và bỏ bù sớm 75 ms.

Kiểm chứng trung gian trên 0541713: Node đạt, Android unit/APK đạt; Chromium/emulator còn chạy khi bổ sung hồi quy độ bù và vòng đời popup. Phiên bản cuối cần các gate cloud trên đúng HEAD trước khi hợp nhất main. UI có ảnh theme tối/sáng trong artifact báo cáo; không thay thế xác minh trên máy thật.

### Nhật ký kiểm thử
- 0541713: 977 unit đạt; Chromium phát hiện kiểm tra đóng PDF ngay và fixture đồng hồ video khác JS world. Đã giữ đóng PDF ngay khi không có POS dùng chung và dùng currentTime thật trong fixture.
- ea0e7d: 978 unit chạy, 1 kỳ vọng CaptionFormatTest vẫn cố ý nhảy qua từ đầu vì bù 75 ms cũ. Điều chỉnh kỳ vọng thành chính từ tại mốc bắt đầu, giữ toàn bộ assertion và kiểm thử cả câu/cụm ngắn; không bỏ kiểm thử. Các gate cuối chạy lại trên commit sửa.

- Chromium ea0e7d: worker thật, màu, mốc video, chọn nguồn, toggle và PDF dùng chung đã đạt. Bộ hồi quy sửa ví dụ phát hiện autofocus trễ cướp focus khi đã chọn ô khác. Đã chặn callback cũ và không đổi focus khi người dùng đã vào hộp sửa; thêm hồi quy giữ callback rồi chủ động chọn ô trước khi chạy lại, giữ mọi assertion lưu và bảo vệ ví dụ.
