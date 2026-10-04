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
Đã đo trên trình xem PDF thật của Chrome: **cuộn không đổi URL**, và **đổi riêng `#page=N` của
một tab đang mở thì trình xem không nhảy** (URL đổi mà trang vẫn đứng yên). Chỉ nạp lại
tab với `#page=N` mới đáp đúng trang. Các open-parameter `zoom=…,left,top` / `view=FitH,top`
bị trình xem bỏ qua, nên chỉ định vị được tới **trang**, không tới dòng.

- **Chọn trang lúc lưu.** Từ xuất hiện nhiều lần thì "câu đầu tiên theo thứ tự tài liệu" thường
  không phải câu bạn vừa bôi. Extension không biết trang đang xem (Chrome không cho), nên dùng hai
  dấu vết: trang của lần lưu **gần nhất** từ cùng tài liệu (trong 6 giờ — người ta đọc tuần tự)
  và mốc `#page=` trong URL lúc mở. Có gợi ý thì quét từ trang đó ra hai phía (trang sau trước
  trang trước) và lấy câu đầu tiên tìm được; không có thì giữ nguyên cách cũ (câu đầu tiên).
- **Tab nguồn còn sống:** chuyển về đúng tab đó, đổi `#page=N` (giữ `zoom`) rồi **nạp lại tab** để
  trình xem về đúng trang đã lưu. Cái giá: mất vị trí cuộn hiện tại của tab đó. Trước đây chỉ
  chuyển tab, nên người dùng rơi vào chỗ vừa cuộn tới chứ không phải chỗ đã bôi.
- **Tab đã đóng / khởi động lại:** mở URL với `#page=N`. Trang của **câu đã trích** đè lên mốc
  `#page=` cũ trong URL (mốc ấy chỉ là nơi mở tài liệu lúc đầu). Mục không có câu trích mới dùng
  mốc URL, rồi tới liên kết tìm chữ cũ.
- Mã tab thật chỉ nằm trong storage.session; mã đồng bộ sang máy khác không mở nhầm tab.
- Giới hạn còn lại: nếu từ lặp lại nhiều lần và không có gợi ý nào (lần lưu đầu tiên của một
  tài liệu mở từ trang 1), câu/trang vẫn là lần xuất hiện đầu tiên. Lần lưu sau trong cùng phiên
  sẽ bám theo trang đó.

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
