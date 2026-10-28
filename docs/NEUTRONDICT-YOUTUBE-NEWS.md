# NeutronDict: YouTube và đọc báo trong cùng APK
Ngày: 2026-10-28. Nhánh: codex/neutrondict-youtube-news.

## Phạm vi đã được yêu cầu
Tích hợp đầy đủ giao diện và các công cụ học của Dual Sub Replay cùng NeutronDict,
thêm trình đọc tin đa ngôn ngữ, lưu từ và nguyên câu vào sổ tay hiện có.
Đọc tin hỗ trợ nguồn RSS/Atom tiếng Nhật, Anh và ngôn ngữ khác; tra từ/SRS
NeutronDict tiếp tục hỗ trợ Nhật–Việt và Anh–Việt. Không gán ngôn ngữ khác vào hai kho này.

## Kiến trúc
- Dùng nguyên nguồn Dual Sub Replay tại commit 25d2a83eeb7c95fc204ac656256b7d3cca5616ae
  trong build cloud; script tích hợp có các phép vá kiểm tra chính xác để phát hiện drift.
- Một APK, launcher NeutronDict (Capacitor); activity YouTube native giữ Compose,
  phụ đề, phát lại, dịch, từ điển, luyện tập, AI và các thiết lập của upstream.
- Reader activity riêng không có cầu nối Capacitor/JavaScript có quyền vào dữ liệu.
  Chỉ thao tác người dùng trên menu native mới đọc lựa chọn và ngữ cảnh.
- Hộp nhận từ durable, ghi riêng từng giao dịch; NeutronDict xác nhận sau khi
  ghi thành công qua hàng đợi capNhat. Không ghi trực tiếp notebook từ native/worker.
- Giữ nguyên tiến độ SRS, đóng băng, nghĩa/câu người dùng sửa. Nhập lại cùng
  giao dịch không sinh bản sao; nguồn mới không tự thay câu đang luyện.
- Tin RSS/Atom lưu cache có giới hạn, dùng mạng nền với WorkManager; chỉ một
  lần refresh chạy cùng lúc. HTTPS, giới hạn dung lượng/thời gian, XML không DTD.
- Bản thử có applicationId riêng để cài song song; không tự nhập hay sửa dữ liệu
  ứng dụng đang dùng. Người dùng có thể đồng bộ qua cấu hình Apps Script hiện có.
- Updater của DualSub không cài APK upstream vào NeutronDict. Giữ thông báo bản
  thử và đường về repo NeutronDict. Giấy phép và ghi công upstream giữ trong APK.
- Sửa chính sách origin trong đăng nhập và ngăn AI chụp trang đăng nhập.

## Tiêu chí nghiệm thu
1. APK mở NeutronDict; mở được toàn bộ màn hình YouTube và quay lại.
2. Từ lưu trong YouTube giữ câu gốc, dịch, video ID, start/end; Nhật/Anh vào
   đúng kho. Tiếng khác giữ ở thư viện DualSub, không sai kho NeutronDict.
3. Reader hỗ trợ RSS và Atom, nguồn theo ngôn ngữ, đọc bài, bookmark, cập nhật
   thủ công/nền, lưu lựa chọn cùng một câu từ vị trí bôi đen.
4. Đóng/mở lại hoặc process chết không làm mất giao dịch đã báo lưu; import
   không reset tiến độ, hồi sinh mục đã xóa hay đè hiệu đính.
5. Nguồn video mở lại trong module YouTube theo thời điểm; bài báo dùng ngữ
   cảnh và vị trí lựa chọn để tìm lại đoạn nguồn.
6. Kiểm thử node/browser hiện có và kiểm thử hồi quy mới chạy trên cloud.
   Build và kiểm thử Android tích hợp; kết quả gắn đúng commit.
7. Ghi rõ điều chưa xác minh trên thiết bị thật, YouTube trực tiếp và các nguồn
   báo có paywall/đăng nhập. Không suy diễn build xanh thành kiểm thử thực tế.

## Trình tự
1. Đặc tả và pipeline build bản thử riêng.
2. Cầu nối media, giữ toàn bộ DualSub, bổ sung reader.
3. Kiểm thử import/SRS, XML/context/security, build và Android smoke test.
4. Công bố link PR và artifact thử nghiệm; giữ main nguyên trạng.

## Kết quả
Đang triển khai. Chưa có kết quả build hay kiểm thử thiết bị.
