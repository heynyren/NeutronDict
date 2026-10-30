# Gạch chân theo cụm phụ đề gốc và logo gấu trắng 2D (2026-10-30)

## Yêu cầu và nghiệm thu
- Android phải bám video khi tua, dừng, chờ tải và đổi tốc độ. Khi nguồn chỉ có mốc theo cụm thì gạch chân cả cụm gốc như extension; không thể hiện vị trí từng từ ước lượng như mốc chính xác.
- Giữ văn bản, màu loại từ, bấm tra từ, lưu câu và phát lại nguồn. Chỉ có một WebView/player YouTube.
- Logo chung: gấu trắng Bắc Cực 2D, đầu/viền tròn mượt không lông nhọn, mắt chấm nhìn thẳng, lè lưỡi hồng; không liếc mắt, lông mày/mí mắt, nhếch mép, đổ bóng hoặc gradient. PNG nền trong suốt; foreground Android nằm trong vùng an toàn.
- Thay logo ở extension, Android cơ bản và APK tích hợp; không giữ launcher mặc định của DualSub trong APK tích hợp.

## Kế hoạch trước triển khai
1. Giữ ranh giới cụm khi estimateWordTimings tách cụm thành từ; dùng hai mốc highlight chung cho các từ của cụm. Giữ start/end từng từ để các chức năng khác không đổi.
2. Chuyển tiếp mốc qua kho tạm và cache phụ đề. Phiên bản cache caption tăng, chỉ tải lại caption cũ; không đụng sổ tay/SRS.
3. Chọn span gạch chân theo nhóm mốc, giới hạn trong dòng hiện tại. Có mốc cả cue thì tô cả cue thay vì chạy cursor giả chính xác. Không đổi text hay phạm vi chọn từ.
4. Không để live caption DOM kéo sang dòng chưa bắt đầu; clock quay về mốc thực khi có bước nhảy hoặc bắt đầu pause/buffer.
5. Đóng gói logo AI đã sửa theo phản hồi người dùng, xuất các mật độ và adaptive foreground; kiểm tra cắt góc và alpha.
6. Kiểm thử Node/Chromium, unit Kotlin, Compose tối/sáng và APK trên GitHub Actions. Không dùng dữ liệu riêng.

## Giới hạn kiểm chứng
Các fixture không xác nhận được âm thanh YouTube trực tiếp trên điện thoại thật. Nếu bản phụ đề gốc sai thời gian so với tiếng nói, ứng dụng không suy ra lại âm thanh bằng ASR; biểu diễn theo cụm giúp tránh độ chính xác giả từ việc chia đều thời gian.
