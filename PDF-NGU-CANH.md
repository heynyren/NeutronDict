# PDF và ngữ cảnh — 4.30.0

## Cài bản dùng thử
Trên nhánh codex/neutrondict-work, mở GitHub Actions → Test NeutronDict →
lần chạy xanh mới nhất → artifact NeutronDict-extension-4.30.0.
Nếu đã cài extension: giải nén và chép bản mới vào đúng thư mục extension đang
dùng, rồi bấm Reload ở chrome://extensions để giữ ID và sổ tay hiện tại.
Nếu cài lần đầu: bật Developer mode, Load unpacked thư mục có manifest.json.
ZIP mã nguồn GitHub chưa có PDF.js; dùng gói CI đã đóng gói.

## Đọc và lưu
Bấm **Đọc PDF** trong popup hoặc menu chuột phải **Đọc PDF và lưu câu bằng NeutronDict**.
Trình đọc nằm trong Chrome, dùng PDF.js thay cho trình xem PDF mặc định.
- Tệp trên máy: chọn PDF. Tệp được đọc trong trình duyệt, không tải cả PDF lên máy chủ.
- Link web: nhập link, bấm Mở PDF và cho phép đọc đúng website đó.
  Link đòi đăng nhập, blob hoặc link dùng một lần có thể cần chọn bản đã tải xuống.
- Bôi đen từ trong phần chữ bên cạnh trang PDF, xem/sửa câu gốc rồi bấm Lưu từ và câu.
  Lưu theo đúng vị trí chọn, không đoán câu đầu tiên khi từ xuất hiện nhiều lần.
- PDF dạng ảnh, nhiều cột hoặc bố cục khó: đối chiếu trang gốc, sửa câu nếu cần.
  Chưa có OCR. Không báo thành công nếu chưa có câu chứa từ.
- Menu lưu từ trình xem mặc định mở trình đọc này để chọn đúng câu;
  PDF không có đuôi .pdf có thể cần menu Đọc PDF hoặc nút trong popup.

Câu gốc được lưu cùng từ trước khi dịch, dùng cho Gemini, bài nghe và ngữ pháp.
Lịch mở đường nghe/SRS vẫn áp dụng bình thường. Bổ sung câu cho từ cũ giữ lịch học,
ghi chú, nghĩa đã sửa và các cờ đóng băng. Từ cũ chỉ có tên/link PDF cần mở
lại tài liệu rồi lưu đúng câu; không tự đoán ngữ cảnh.
Dịch/tra từ vẫn dùng dịch vụ mạng như trước; việc đọc tệp không gửi cả PDF đi.

## Dữ liệu
src.cau là câu nguồn, cauNghe.cau giữ cùng câu để tương thích SRS hiện tại.
Nguồn PDF có tên, URL, trang, fingerprint và vị trí trong đoạn nếu lấy tự động.
Bản dịch được bổ sung sau; lỗi dịch không làm mất câu. Kết quả dịch cũ phải
khớp câu và phiên bản câu trước khi ghi; mọi lượt cập nhật dùng khóa ghi chung.

## Đóng gói và kiểm thử
CI tải pdfjs-dist@6.3.289 với scripts bị tắt; các module, worker, CMaps,
fonts, WASM và LICENSE nằm trong gói extension. Không thực thi JS từ CDN.
Node: câu gốc, xuống dòng, ruby, bản dịch xen kẽ, từ lặp lại.
Chromium: mở PDF text thật làm fixture, lưu từ UI → sổ tay → Gemini/nghe/ngữ pháp,
lỗi dịch, lưu lại từ, dịch trả muộn và SRS.
Chưa có PDF riêng của người dùng để đối chiếu bố cục tài liệu thực tế.
