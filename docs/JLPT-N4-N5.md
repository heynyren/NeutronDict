# Màn N4 và N5

Hai màn có trên extension và Android; N1 vẫn là màn sắp có.

| Màn | Từ vựng | Chữ Hán | Mục ngữ pháp | Chương / bài |
|---|---:|---:|---:|---:|
| N5 · Kyoto | 355 | 115 | 86 | 5 / 25 |
| N4 · Làng tuyết | 510 | 397 | 104 | 5 / 25 |

N5 có 79 chặng; N4 có 120 chặng (kể cả thử thách chương và bài cuối).

## Cách học
Chọn bất kỳ chặng thường hoặc thử thách chương nào. Hoàn thành tất cả chặng trước đó
để mở bài cuối; không cần đạt 60%. Thẻ chưa thuộc và đáp án sai chuyển vào sổ tay hiện tại
để ôn ở chế độ học. Tiến độ nằm trong jlpt.mon.n5 / jlpt.mon.n4, đồng bộ bằng cơ chế hiện có.
Dữ liệu từng màn chỉ tải khi mở màn. Âm thanh nghe dùng TTS hiện có.

## Kiểm tra hai gói người dùng cung cấp
SQLite của cả hai gói: integrity_check = ok, không lỗi khóa ngoại; mọi checksum trong
checksums.json khớp. N4 có 581 mục từ thô, N5 có 432; cả hai vẫn gắn needs_review.
Các lỗi thực tế: 音 bị ghép nghĩa “ngày xưa”; 億 bị ghi “triệu”; いってきます bị dịch
thành lời chào khi về nhà; các mảnh OCR như ト/す bị coi là từ. Phần câu ví dụ còn ghép
nhầm bản dịch giữa hai dòng hội thoại. Vì vậy không nhập trực tiếp tất cả bản ghi.

- Từ vựng được biên tập nghĩa Việt và cách đọc; gộp 8 mục N4 và 15 mục N5 cùng cách đọc/nghĩa.
- Không đưa 63 mục từ N4 và 62 mục N5 không đủ căn cứ vào màn chơi.
- Ngữ pháp được chuẩn hóa tiêu đề, nghĩa; 190 câu ví dụ và bản dịch được viết cho bài học,
  có nhãn riêng, không nhận là trích nguyên văn giáo trình.
- Chữ Hán lấy từ bản chụp KANJIDIC2 trong database, chỉ lấy chữ xuất hiện trong từ giữ lại.
  397 chữ N4 không có nghĩa là danh sách 397 chữ N4 chính thức.
- Không dùng 221/202 trang bài tập chưa có khóa đáp án; không dùng 819/591 ứng viên OCR
  chưa xác nhận. Không nhập các bản dịch ví dụ thô chưa kiểm chứng.
- Nhãn N4/N5 theo giáo trình nguồn, không tuyên bố là danh mục JLPT chính thức hoặc
  bộ nội dung đã được giáo viên duyệt toàn bộ.
- Các tài liệu chưa nhập được liệt kê trong manifest gốc vẫn nằm ngoài phạm vi.

Các mục được chia thành 25 bài nhỏ trong app. Từ bổ sung được phân bố lại để học;
không khẳng định số bài của app luôn trùng bài của bản gốc. Nguồn và trang gốc được giữ riêng.

## Tái tạo và truy nguyên
Chạy trên cloud: node cong-cu/dung-jlpt-n45.mjs.
Nguồn tối giản, giữ ID/page/tiêu đề và dữ liệu trước biên tập:
docs/data/n45-source-selection.json.
Lớp biên tập: docs/data/n45-editorial.json.
Báo cáo đầy đủ từng ID bị gộp hoặc loại: docs/data/n45-import-audit.json.
Giấy phép từ điển: docs/data/N45-DICTIONARY-LICENSE.md.
Không đóng gói PDF, SQLite thô, file tạm hay audio liên kết ngoài vào app.

## Câu hỏi
Mỗi thẻ có bộ lựa chọn cố định được dựng từ dữ liệu biên tập. Câu từ vựng hỏi nghĩa, cách đọc hoặc nghe;
câu chữ Hán loại các đáp án có cùng âm Hán Việt; câu ngữ pháp có ngữ cảnh xác định.
Không lấy ngẫu nhiên các từ đồng nghĩa trong toàn bộ database để làm nhiễu.
ID thẻ và báo lỗi có tiền tố n4:/n5: để không ảnh hưởng chéo hai màn.
