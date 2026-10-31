# Kaiwa Nihongo

Khóa bổ trợ trong mục Ôn thi JLPT, dùng chung trên extension và Android. N1/N4/N5 vẫn là các màn sắp có.

## Phạm vi bản đầu

- 109 mục: 40 từ vựng, 69 cấu trúc/ngữ dụng.
- 23 bài Nameraka: chọn 61 mục tiêu học từ sách người dùng cung cấp.
- 16 chủ đề Osaka: chọn 48 mục từ bản Nhật–Việt người dùng cung cấp.
- 8 chương. Đây là tập mục tiêu được tuyển chọn, không phải toàn văn hai nguồn.
- Chọn chặng bất kỳ; hoàn thành mọi chặng, kể cả trùm chương, mới mở bài cuối. Điểm dưới 60% vẫn tính hoàn thành.
- Thẻ không nhớ hoặc câu sai được đưa vào sổ tay/chế độ học hiện có.
- Tiến độ dùng kho `jlpt.mon.kaiwa` và phép hợp đồng bộ hiện có; không thay tiến độ N2/N3.

## Dữ liệu và biên tập

`extension/jlpt/kaiwa.json` và `android/www/jlpt/kaiwa.json` giống nhau. Mỗi mục có ID ổn định, câu Nhật trích nguồn, bản dịch biên tập, ghi chú cách dùng, nguồn và câu hỏi ngữ cảnh với ba lựa chọn sai được biên tập riêng. Không lấy ngẫu nhiên các từ đồng nghĩa làm đáp án nhiễu.

`docs/data/kaiwa-source-audit.json` chứa SHA-256 hai tệp đầu vào, tham chiếu trang/bài hoặc mã OSK và trích đoạn để kiểm tra. Không kèm bản PDF, phông chữ hoặc toàn văn sách.

Bản Osaka có 145 đoạn, trong đó 82 đoạn đánh dấu uncertain và 63 đoạn inferred, chưa được đối chiếu âm thanh gốc. Bản này chỉ lấy từ nhóm inferred, không dùng phần có dấu “要確認” để chấm điểm. UI ghi rõ tình trạng nguồn. Không tạo mốc âm thanh, không khẳng định TTS là phát âm phương ngữ gốc.

Các lỗi nguồn đã nhận diện (ví dụ mô tả nguyên âm bị lược trong bài 1), khái quát giới tính/vùng miền và thống kê truyền hình không được chuyển thành quy tắc ngôn ngữ. Bản dịch tiếng Việt và lời giải của khóa là phần biên tập; câu Nhật giữ nguyên theo trích đoạn.

## Mở rộng

Thêm mục vào bài thích hợp, giữ nguyên các ID đã phát hành. Mỗi mục cần câu nguồn có thể đối chiếu và 4 lựa chọn phân biệt trong ngữ cảnh. Không tái sử dụng ID cho một khái niệm khác. Chạy kiểm thử logic, UI extension/Android và cloud Android trước khi phát hành.

## Kiểm tra

- `kiem-tra/kaiwa-logic.mjs`: phủ mọi mục/chặng, đáp án, nguồn, khóa bài cuối, hợp tiến độ, chuyển sang học, logo YouTube và tính đồng nhất hai nền tảng.
- `kiem-tra/kaiwa-giao-dien.mjs`: đi vào chặng Osaka tự chọn, lật thẻ, làm sai, kiểm tra sổ tay, hoàn thành và tải lại tiến độ; ảnh desktop/mobile.
- Kiểm thử Android native kiểm tra media clock thật, mẫu cũ, tua, quảng cáo, khoảng lặng, dòng phụ đề và ranh giới cụm nguồn.
