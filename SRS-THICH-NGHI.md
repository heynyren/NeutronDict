# Học nhẹ hơn với RaKuLanG 4.47

## Hành vi

- Mặc định 10 phút/ngày, có thể chọn 3–60 phút hoặc giảm riêng hôm nay. Nếu số bài sẵn có ít, hoàn thành số bài đó cũng hoàn thành ngày.
- Mỗi chặng khoảng 3 phút, không quá 20 bài khởi đầu; mỗi từ xuất hiện một đường trong chặng, ưu tiên đường đã học có nguy cơ quên cao.
- Tối đa hai lượt chấm cho một từ–đường trong ngày khi học theo kế hoạch. Bài còn lại giữ nguyên trong sổ; nút Học thêm mở chặng 3 phút tự nguyện.
- Bài mới tối đa 5 đường/ngày theo quỹ thời gian. Nếu bài cũ vượt quỹ thì tạm ngừng đưa bài mới vào; việc lưu từ không bị giới hạn.
- Sau đủ ít nhất 3 ngày có dữ liệu, nếu thường xuyên chỉ hoàn thành 25–70% chỉ tiêu trong những ngày có đủ bài thì giảm 15%. Hoàn thành thoải mái và nhớ lại tốt thì tăng tối đa 5%, cách ít nhất 7 ngày. Không lấy một ngày bỏ học làm bằng chứng quá tải.
- Ngữ pháp vẫn đúng một lần là đóng băng câu; các đường đóng băng và hẹn thủ công vẫn được tôn trọng.

## Mô hình ghi nhớ và triển khai

Dùng ts-fsrs 5.2.3 (mô hình FSRS-6, MIT) đã đóng gói trong app; độ lưu giữ mục tiêu 90%. Không gọi AI hay dịch vụ ngoài cho việc xếp hàng.

**Mặc định là chế độ quan sát:** ghi xác suất nhớ trước mỗi đáp án, duy trì trạng thái riêng từng đường và dùng ước lượng để xếp bài, nhưng giữ cách tính hạn ôn cũ. Người dùng có thể bật “Lịch ôn mới (thử nghiệm)” trong kế hoạch để bắt đầu áp dụng FSRS sau mỗi lượt trả lời. Không chuyển hàng loạt hạn ôn đã lưu.

Các trọng số là trọng số mặc định của thư viện, chưa tối ưu từ lịch sử cá nhân. Thẻ cũ được khởi tạo bằng khoảng ôn và mốc học có sẵn; không tạo lịch sử giả. Nếu thẻ cũ thiếu mốc thời gian thì lượt chuyển đầu giữ khoảng ôn theo cơ chế cũ.

## Dữ liệu và đồng bộ

Nhật ký reviewLog nằm trên mục từ, mã lượt ngẫu nhiên, có dấu hoàn tác; gộp theo mã giữ các lượt từ hai thiết bị. Hoàn tác có mốc trạng thái mới để dữ liệu cũ không phục hồi lượt đã hủy. Kế hoạch theo ngôn ngữ nằm trong hoc[ngôn ngữ].study, đi qua đồng bộ Apps Script hiện có, không cần thay endpoint.

Hai lượt cùng một đường thực hiện ngoại tuyến cùng lúc đều được giữ trong nhật ký; trạng thái lịch ôn của đường vẫn dùng bản có mốc mới nhất, chưa tái chạy toàn bộ lịch sử xung đột. Xóa mục từ vẫn xóa trạng thái SRS, đồng thời giữ nhật ký để công sức đã học không biến mất khỏi chỉ tiêu.

Thời gian kế hoạch đo thời gian foreground trên thẻ, bỏ thời gian nền và dừng khi mở trợ giúp/nguồn; đây là xấp xỉ công sức học, không phải phép đo chính xác thời gian nhớ lại.

## Nhắc học Android

Không cần chọn giờ. App chọn theo thói quen học gần đây, có độ dao động nhỏ, tối đa 3 lời nhắc/ngày cách nhau ít nhất 3 giờ; không gửi ngoài khoảng 09:00–21:30. Hoàn thành ngày hoặc hết bài đến hạn thì ngừng nhắc. Sau hơn 3 ngày không học giảm còn một lần/ngày, sau hơn 7 ngày dừng.

Có nút tắt trong Cài đặt và vẫn cần quyền thông báo của Android. Lịch được chuẩn bị trước 7 ngày, cập nhật khi mở app, học hoặc đồng bộ. Hoàn thành trên máy tính chỉ hủy thông báo điện thoại sau khi dữ liệu đồng bộ tới điện thoại. Android có thể trì hoãn thông báo theo chế độ tiết kiệm pin.

## Kiểm chứng

- kiem-tra/adaptive-srs.mjs: xếp nguy cơ quên, giữ hạn cũ, lịch thử nghiệm, đóng băng/hẹn riêng, giới hạn lặp, mục tiêu ngắn, tăng/giảm chỉ tiêu, gộp nhật ký và hoàn tác.
- kiem-tra/adaptive-srs-giao-dien.mjs: nút học thật trên hai giao diện, hoàn tác và xung đột, ba ngôn ngữ, lưu cài đặt, lịch nhắc qua cầu nối native giả lập, ảnh giao diện.
- Chạy cùng toàn bộ bộ kiểm thử Node, Chromium và Android tích hợp trên GitHub Actions. Kiểm thử cầu nối không thay cho xác nhận thông báo khi tắt màn hình trên điện thoại thật.
