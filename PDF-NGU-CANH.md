# Tự lấy ngữ cảnh PDF — 4.30.2

## Thao tác
Mở PDF trong Chrome → bôi đen từ → chuột phải →
**Lưu "…" vào NeutronDict (kèm nguồn)**.
Extension tự đọc lớp chữ ở nền, tìm câu chứa từ và lưu cùng nguồn.
Không mở tab, không có màn chọn PDF/câu và không có ô nhập ngữ cảnh.

PDF trên máy cần bật **Cho phép truy cập URL của tệp** cho NeutronDict tại
chrome://extensions. Đây là quyền một lần của Chrome, không phải thao tác mỗi lần lưu.
PDF web dùng quyền activeTab khi bấm menu; nguồn chặn tải lại có thể không đọc được.

## Cách trích câu
- PDF.js đọc chữ và vị trí; bỏ furigana nhỏ nằm trên chữ chính.
- Tách cột, bản dịch Việt, từ đầu mục và ví dụ; bỏ dấu ô chọn/nhãn từ loại.
- Ghép dòng xuống hàng do bố cục. Dòng gạch đầu dòng là đoạn mới.
- Lùi/tiến đến dấu . 。 ． ! ！ ? ？ … hoặc ranh giới dòng đầu mục.
  Dấu chấm trong số thập phân/viết tắt không cắt câu.
- Lấy câu hợp lệ đầu tiên chứa từ theo thứ tự trang và đoạn, theo lựa chọn của người dùng.
  Không cảnh báo khi có nhiều câu.
- PDF ảnh chưa có OCR; không tạo câu giả.

Câu gốc lưu trước khi dịch; Gemini, bài nghe và ngữ pháp dùng cùng câu.
Bản dịch đến muộn chỉ cập nhật đúng phiên bản câu. Lưu lại giữ SRS, ghi chú,
nghĩa hiệu đính và trạng thái đóng băng. Huy hiệu ✓句 xác nhận có câu;
? và thông báo popup cho biết lý do thiếu câu.

## Quay lại nguồn PDF
- Lưu riêng URL nguồn (giữ fragment trang/zoom nếu có) và mã tab trong phiên Chrome.
  `src.page` là trang của câu trích, KHÔNG phải tọa độ vùng bôi đen.
- Khi tab nguồn vẫn còn: chuyển về chính tab đó, không tải lại, không chạy tìm
  từ từ đầu file và không tạo cửa sổ/tab trùng. Giữ vị trí HIỆN TẠI của tab.
- Khi tab đã đóng, chuyển sang tài liệu khác, bị discard, hoặc sau khi Chrome/extension
  khởi động lại: mở URL kèm mốc đã lưu. Nếu không có mốc, dùng trang câu ngữ cảnh;
  mục cũ thiếu cả hai vẫn dùng liên kết tìm chữ cũ.
- Mã tab thật chỉ nằm trong storage.session; mã đồng bộ sang máy khác không mở nhầm tab.
- Giới hạn: API contextMenus chỉ có selectionText và URL, không có trang/tọa độ vùng
  chọn của PDF tích hợp. Nếu bạn đã cuộn khỏi vị trí cũ và URL không chứa mốc chính xác,
  extension chưa khôi phục được vùng bôi đen ban đầu. Không gọi câu đầu tiên là vị trí gốc.

## Cài/cập nhật
Tải **Code → Download ZIP** trên main, giải nén, chép nội dung extension vào đúng
thư mục extension đang cài rồi **Tải lại** ở chrome://extensions để giữ ID/sổ tay.
Từ 4.30.2, mã nguồn có sẵn PDF.js 6.3.289, worker, CMaps, font và WASM;
không cần npm/build. Cũng có artifact NeutronDict-extension-4.30.2 trên Actions.
4.30.1 thiếu thư viện khi cài từ ZIP mã nguồn; đây là lỗi đóng gói.

## Kiểm thử
CI kiểm SHA256 toàn bộ thư viện trong checkout trước khi chạy trình duyệt.
Không cài PDF.js để che lỗi thiếu file trong gói nguồn.
PDF thật trong bài test có furigana, đầu mục, bản dịch, nhiều câu/trang cùng từ.
Kiểm handler menu, offscreen/storage thật, không mở tab khi lưu, câu đi vào
Gemini/nghe/ngữ pháp, giữ SRS, và quay lại tab cũ/mốc URL khi đóng tab.
Không đưa PDF riêng của người dùng lên repository.

Tài liệu Chrome: [contextMenus](https://developer.chrome.com/docs/extensions/reference/api/contextMenus),
[storage.session](https://developer.chrome.com/docs/extensions/reference/api/storage).
