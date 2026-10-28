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
  Khi người dùng bôi đen và dừng kéo, menu lựa chọn native kích hoạt tra từ tự động;
  nút Tra NeutronDict vẫn có thể gọi lại. Chỉ đọc lựa chọn và ngữ cảnh khi có thao tác đó.
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
6. Đọc báo: mở bài, bôi đen từ rồi thả tay; popup tra từ gốc của DualSub tự mở
   sau khi lựa chọn ổn định. Xem nghĩa và bấm lưu. Có thể gọi lại bằng “Tra NeutronDict”
   trong menu chọn chữ hoặc nút “Tra từ” khi lựa chọn còn tồn tại. Từ Nhật/Anh vào đúng
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
- Link lượt kiểm thử và APK đã xác minh của mỗi phiên bản nằm trong PR #27.
  Artifact giữ 7 ngày; lấy bản mới từ lượt chạy xanh của Integrated Android preview.
- Chưa xác minh trên điện thoại thật, tài khoản YouTube thật, khóa AI thật hoặc
  mọi nhà xuất bản. Trang báo cần đăng nhập/paywall phụ thuộc nhà xuất bản.
  Đây là bản thử trên nhánh riêng; chưa hợp nhất main.


## Học, JLPT và cài đặt
- Mọi màn JLPT thường đều mở để tự chọn. Bài cuối chỉ mở khi tất cả màn trước
  đã có kết quả hoàn thành; điểm 60% không còn là điều kiện mở khóa. Điểm và sao vẫn được hiển thị.
- Thẻ chọn “không thuộc” hoặc trả lời sai được ghi vào sổ tay qua hàng đợi hiện có,
  kèm ví dụ trong bộ JLPT. Những đường có đủ dữ liệu được đưa vào Học; giữ cấp SRS
  và hiệu đính đã có. Lần đánh dấu yếu chủ động mở lại lịch đóng băng của các đường
  từ vựng để ôn; không hồi sinh từ người dùng đã xóa.
- Ngữ pháp nằm trong Học → Ôn từng đường → Ghép câu ngữ pháp và trong buổi học chung.
  Mỗi câu chỉ xuất hiện một lần dù chứa nhiều từ đã lưu. Ghép đúng một lần đóng băng
  riêng câu đó; không đổi cấp nghe/nhìn/điền khuyết của từ. Xem đáp án không tính là thuộc.
- Android có tab Cài đặt riêng: giao diện, đồng bộ, giọng đọc và các thiết lập đã có.
  Sổ tay không còn phải cuộn xuống cuối để tìm cài đặt. Tab Ngữ pháp riêng đã gỡ.

## Giọng đọc: Azure tùy chọn và TTS trên máy
1. Mở Cài đặt → Giọng đọc, chọn giọng Nhật/Anh đã cài và nghe thử.
2. Mặc định dùng TTS của thiết bị. Có thể cài thêm dữ liệu giọng đọc từ cùng khu vực.
3. Nếu có Azure Speech, điền region và khóa tài khoản **F0**, rồi bật Azure. Không có
   khóa được đóng gói sẵn, app không tạo tài khoản và không tự nâng cấp gói Azure.
4. Giọng Azure Nhật: Nanami Neural; Anh: Jenny Neural. Âm thanh có cache riêng tối đa
   khoảng 32 MB. Khóa được mã hóa bằng Android Keystore, không gửi vào Apps Script.
5. Azure hết hạn mức, sai khóa, lỗi mạng hoặc phát âm thanh thất bại lúc bắt đầu thì
   app chuyển sang TTS trên máy. Giọng ngoại tuyến cần được cài sẵn; chất lượng tùy
   engine và thiết bị. App không thể đảm bảo mọi giọng hệ thống đều không dùng mạng.
6. App có thêm giới hạn thận trọng 450.000 ký tự/tháng trên thiết bị, bao gồm cả yêu
   cầu timeout chưa rõ kết quả. Azure mới là nơi kiểm soát tổng hạn mức tài khoản:
   bộ đếm thiết bị không bao gồm ứng dụng hoặc thiết bị khác và không thay thế gói F0.
7. Kiểm thử tự động xác minh đường fallback bằng provider giả lập; chưa thử giọng
   Azure thực tế với khóa tài khoản của người dùng.

## Nghe câu YouTube gốc trong Học
- Bài nghe có mốc toàn câu khớp nội dung sẽ tự mở đoạn đó trong player DualSub hiện có,
  phát giọng gốc rồi tự trở lại đúng thẻ đang học. Nút Nghe phát lại cùng đoạn; không tự chấm
  điểm hoặc chuyển thẻ. Đây là luồng phát trực tuyến trong app, chưa phải file âm thanh ngoại tuyến.
- Cài mới: mở YouTube một lần để hoàn tất chọn ngôn ngữ/hướng dẫn/mục tiêu theo luồng gốc;
  trước đó bài học dùng TTS và không tự bỏ qua thiết lập của DualSub.
- Thời gian chờ và phát video không bị tính thành trả lời chậm trong SRS.
- Tốc độ theo cấp nghe: **1× → 1,1× → 1,2× → 1,3× → 1,4× → 1,5×**, giữ cao độ.
  Phụ đề học của DualSub tạm ẩn khi nghe; chữ đã được in sẵn trong hình video vẫn có thể hiện.
- Back dừng đoạn và trở về thẻ; Home/ngắt app dừng yêu cầu, không tự kéo app lên trước.
  Hết đoạn sẽ pause và trả lại tốc độ/âm lượng cũ của player. Không tạo player YouTube thứ hai.
- Thiếu mốc toàn câu, câu đã sửa khác nguồn, video không phát được hoặc chờ quá lâu sẽ dùng
  Azure/TTS trên máy. Các mục Android có mốc chính xác vẫn dùng được. Extension mới lưu thêm
  mốc toàn câu; mục desktop cũ chỉ có mốc mảnh cần cache phụ đề khớp hoặc lưu lại nguồn để có
  mốc đầy đủ. Không tự đoán thời lượng từ số chữ.
- Bản này cũng sửa bánh răng tab Cài đặt và hiện lại thẻ thường sau ngữ pháp; Back trong
  ngữ pháp kết thúc buổi học đúng cách.

## Mốc câu YouTube và giới hạn của nghe ngoại tuyến
- Nguồn YouTube lưu từ extension trên máy tính cũng mở bằng module DualSub trong
  Android, theo video ID và mốc nguồn. Thao tác mở nguồn chủ động yêu cầu có tiếng;
  sau đó người dùng vẫn có thể tắt tiếng theo ý mình.
- Khi một câu dài chia thành nhiều dòng phụ đề, bản tích hợp lưu cả nội dung câu và
  thời gian bao trọn các dòng đó, kể cả sau khi phụ đề được phân trang từ đĩa.
- Bộ chọn phụ đề có giới hạn theo đồng hồ video để một cụm từ lặp lại không kéo
  phụ đề tới câu còn ở xa phía sau; mẫu phụ đề từ tương lai sau khi tua lùi bị loại.
  Giới hạn này không sửa được timestamp sai sẵn hoặc nội dung sai của phụ đề nguồn.
- Muốn xác nhận lỗi thực tế cần video, mốc thời gian và thao tác tua/đổi tốc độ để
  đối chiếu với lời nói. Kiểm thử mô phỏng chưa chứng minh mọi video đều đồng bộ.
- Người dùng muốn thêm nghe ngoại tuyến, giữ cao độ giọng và dùng chung thang
  Srs.tocDoNghe: **1,0× → 1,1× → 1,2× → 1,3× → 1,4× → 1,5×** theo cấp đường nghe.
  Không thêm mức khởi đầu 0,8×; giới hạn trên là 1,5× như TTS hiện tại.
  **Chưa triển khai tải/cắt âm thanh YouTube thành file.** API YouTube chính thức
  hạn chế lưu/tách âm thanh; chức năng offline cần một nguồn âm thanh được phép lưu
  hoặc tệp người dùng cung cấp. Khi có nguồn, cần căn câu theo âm thanh, kiểm tra
  đầu/cuối và phát với tốc độ thay đổi, cao độ 1.0; không thể chỉ tin dòng sub đang hiện.
- Âm thanh Azure trong cache là giọng tổng hợp; không phải âm thanh gốc từ YouTube.

Tài liệu kỹ thuật: [YouTube API policies](https://developers.google.com/youtube/terms/developer-policies),
[Android PlaybackParams](https://developer.android.com/reference/android/media/PlaybackParams),
[Azure Speech quotas](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits).

## Quay lại nguồn bài báo
Nút Mở nguồn dùng trình đọc trong app. Từ đã lưu được tô vàng riêng, câu và phần chữ hai bên dùng để tìm đúng chỗ; không tô cả câu. Hỗ trợ chữ chia qua span/ruby và nội dung tải muộn, giữ popup tra từ khi bạn tự bôi đen. Nếu bài đã thay đổi, vị trí khôi phục phụ thuộc phần nội dung còn lại; không chỉnh văn bản gốc của bài.
