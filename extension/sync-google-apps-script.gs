/**
 * ĐỒNG BỘ SỔ TAY "NeutronDict" QUA GOOGLE DRIVE
 * ---------------------------------------------
 * Cách dùng:
 * 1. Vào https://script.google.com  ->  New project.
 * 2. Dán toàn bộ file này vào, thay TOKEN bên dưới bằng một chuỗi bí mật bạn tự nghĩ ra
 *    (ví dụ: "neutron-nhien-2026-x7k"). ĐỪNG dùng mật khẩu Google của bạn ở đây.
 * 3. Deploy -> New deployment -> chọn loại "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Bấm Deploy, cấp quyền cho script khi Google hỏi.
 * 4. Copy "Web app URL" (kết thúc bằng /exec).
 * 5. Mở trang Sổ tay của extension -> mục "Đồng bộ Google Drive" -> dán URL + TOKEN -> Lưu cấu hình.
 *
 * LƯU Ý: file này còn lo cả chức năng DỊCH CÂU (dùng Google Dịch qua LanguageApp) làm dự phòng
 * khi gọi thẳng Google Dịch không được. Nếu đã deploy bản cũ, dán đè code mới rồi Deploy
 * -> Manage deployments -> sửa deployment hiện có -> "New version" -> Deploy. URL giữ nguyên.
 *
 * Dữ liệu được lưu vào một file JSON trong Google Drive của bạn (mặc định tên dưới đây).
 */

var TOKEN = "DAT_MOT_MA_BI_MAT_O_DAY";          // <-- ĐỔI chuỗi này
var FILE_NAME = "neutrondict-notebook.json";     // tên file lưu trên Drive (có thể giữ nguyên)

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (req.token !== TOKEN) return _json({ ok: false, error: "unauthorized" });

    if (req.action === "save") {
      _save(JSON.stringify(req.data || {}));
      return _json({ ok: true });
    }
    if (req.action === "load") {
      var txt = _load();
      return _json({ ok: true, data: txt ? JSON.parse(txt) : {} });
    }
    if (req.action === "translate") {
      var text = String(req.text || "");
      if (!text) return _json({ ok: false, error: "Không có nội dung cần dịch" });
      if (text.length > 5000) text = text.substring(0, 5000);
      var from = req.from || "en";
      var to = req.to || "vi";
      var out = LanguageApp.translate(text, from, to);
      return _json({ ok: true, text: out });
    }
    return _json({ ok: false, error: "unknown action" });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _getFile() {
  var it = DriveApp.getFilesByName(FILE_NAME);
  return it.hasNext() ? it.next() : null;
}

function _save(text) {
  var f = _getFile();
  if (f) f.setContent(text);
  else DriveApp.createFile(FILE_NAME, text, MimeType.PLAIN_TEXT);
}

function _load() {
  var f = _getFile();
  return f ? f.getBlob().getDataAsString() : null;
}
