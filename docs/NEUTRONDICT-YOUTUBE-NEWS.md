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

## Giao diện và AI
- Giữ các màn hình, theme, hiệu ứng và cửa sổ của DualSub Replay từ bản nguồn đã ghim.
- Cửa sổ tra từ trong bài báo dùng lại WordLearningDialog của DualSub: nghĩa, cách đọc,
  phát âm, sửa nghĩa, chữ Hán và hỏi AI. Đọc báo không có nút lưu đoạn video.
- Bảng AI gốc được mở từ nút AI trên NeutronDict và trong trình đọc báo.
  Dùng chung thiết lập, khóa mã hóa và lịch sử với module YouTube.
- Ngoài màn hình YouTube, AI nhận văn bản đang đọc và có thể đề nghị lưu từ vào
  sổ tay. Công cụ thay đổi phát video chỉ hoạt động trong màn hình YouTube;
  chưa cấp công cụ sửa lịch SRS hay điều khiển bài JLPT cho AI.
- Chức năng chụp màn hình tự động của AI chỉ được phép trên nội dung YouTube.
  Ngoài YouTube dùng văn bản được trích hoặc ảnh/tệp người dùng đính kèm.

## Dùng bản thử
1. Mở Actions → Integrated Android preview → lượt chạy xanh của nhánh này.
2. Trong Artifacts tải NeutronDict-integrated-preview, giải nén.
3. Cài file NeutronDict-integrated-preview.apk vừa giải nén. Gói tải chỉ chứa APK cài đặt;
4. Ứng dụng có tên NeutronDict Preview, package com.neutrondict.app.preview.
   Nó có vùng dữ liệu riêng với app cũ. Kết nối cùng Apps Script theo từng ngôn ngữ
   để kéo sổ tay hiện có. Không cần gỡ app chính.
5. Thanh trên NeutronDict có YouTube, Đọc báo, AI. Trong YouTube, dùng menu ngăn
   kéo “NeutronDict · Sổ tay và đọc báo” để quay về.
6. Đọc báo: mở bài, bôi đen từ, chọn “Tra NeutronDict”, xem nghĩa và bấm lưu.
   Có thể dùng nút “Tra từ” khi lựa chọn còn tồn tại. Từ Nhật/Anh vào đúng
   sổ tay cùng câu và nguồn; ngôn ngữ khác đọc/dịch được nhưng chưa có kho SRS.
7. Nguồn tin mặc định: Google News Nhật và Anh. Có thể thêm RSS/Atom HTTPS,
   chọn cập nhật thủ công hoặc chu kỳ nền 15/30/60/120 phút. Android có thể
   hoãn tác vụ nền theo pin/mạng. “Lưu bài” lưu phần văn bản để đọc ngoại tuyến.
8. Trong bảng AI dùng thiết lập gốc của DualSub để kết nối nhà cung cấp. Không
   có khóa API được đóng gói sẵn. Gọi AI thật có thể tính phí theo tài khoản đã cấu hình.

## Kiểm chứng và giới hạn
- Pipeline build toàn bộ nguồn DualSub cùng Capacitor; chạy bộ unit test gốc,
  parser RSS/Atom, giữ ngữ cảnh/mốc video và kiểm thử mới.
- Pipeline Android chạy trên emulator: mở launcher, hộp nhận bền vững, save qua
  cầu nối thật vào notebook và giữ SRS/hiệu đính; mở AI; kiểm thử gốc cửa sổ tra từ
  và theme/đính kèm của bảng AI.
- Pipeline NeutronDict chạy Node và Playwright, gồm chọn đúng lần xuất hiện,
  câu Nhật/Anh, ruby/furigana, danh sách và bảo vệ vùng nhập riêng tư.
- Lượt build 40659461290 đã tạo APK. Các commit tiếp theo phải qua lại pipeline;
  trạng thái và báo cáo gắn commit nằm trong PR #27 và Actions.
- Chưa xác minh trên điện thoại thật, tài khoản YouTube thật, khóa AI thật hoặc
  mọi nhà xuất bản. Trang báo cần đăng nhập/paywall phụ thuộc nhà xuất bản.
  Đây là bản thử trên nhánh riêng; chưa hợp nhất main.

