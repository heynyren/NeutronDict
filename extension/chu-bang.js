/**
 * Bảng dịch giao diện. Khoá là chính chuỗi tiếng Việt — xem chu.js.
 *
 * Thiếu một dòng thì chỗ đó hiện tiếng Việt, không vỡ gì. Nên thà bỏ trống còn
 * hơn điền một bản dịch đoán bừa.
 */
(function (goc) {
  "use strict";

  const en = {
    /* --- khung chung --- */
    "Sổ tay NeutronDict": "NeutronDict Notebook",
    "Anh – Việt · sóng học tập": "English – Vietnamese · study rhythm",
    "Nhật – Việt · sóng học tập": "Japanese – Vietnamese · study rhythm",
    "Anh – Việt": "English – Vietnamese",
    "Nhật – Việt": "Japanese – Vietnamese",
    "Sổ tay": "Notebook",
    "Tiến độ": "Progress",
    "Học ngay": "Study now",
    "Sổ con": "Decks",
    "Đổi tên": "Rename",
    "Xoá sổ": "Delete deck",
    "Sổ mới": "New deck",
    "Tất cả": "All",
    "Chưa phân loại": "Unsorted",
    "Thích": "Liked",
    "Không thích": "Disliked",
    "Hán tự": "Kanji",

    /* --- xuất, sao lưu, đồng bộ --- */
    "Xuất & sao lưu": "Export & backup",
    "Anki (TSV)": "Anki (TSV)",
    "CSV": "CSV",
    "Sao lưu .json": "Backup .json",
    "Nạp .json": "Restore .json",
    "Xoá hết mục đang hiện": "Delete everything shown",
    "Đồng bộ Google Drive": "Google Drive sync",
    "Lưu cấu hình": "Save settings",
    "Đồng bộ ngay": "Sync now",
    "URL Web App Apps Script (…/exec)": "Apps Script Web App URL (…/exec)",
    "Mã bí mật (token bạn tự đặt)": "Secret (a token you choose)",

    /* --- cài đặt tra nhanh --- */
    "Cài đặt tra nhanh": "Quick lookup settings",
    "Bôi đen là hiện popup ngay tại con trỏ (chỉ trên trang web, không áp dụng cho PDF)":
      "Show a popup at the cursor as soon as you select text (web pages only, not PDFs)",
    "Chỉ hiện khi giữ phím Ctrl lúc bôi đen (tránh popup nhảy ra khi chỉ muốn chép)":
      "Only show it while Ctrl is held (so the popup stays away when you just want to copy)",
    "Hiện tab": "Show the",
    "trong popup (dịch cả câu bằng Google Dịch)": "tab in the popup (whole-sentence translation via Google Translate)",
    "Bỏ qua tra từ điển khi bôi đen dài hơn": "Skip the dictionary when the selection is longer than",
    "ký tự": "characters",
    "Lưu cài đặt": "Save settings",
    "Xoá bộ nhớ đệm": "Clear cache",
    "Hướng dẫn đọc IPA": "IPA reading guide",
    "Hướng dẫn IPA": "IPA guide",
    "Ngôn ngữ giao diện": "Interface language",
    "Chỉ đổi chữ trên màn hình. Ngôn ngữ tra từ đổi ở nút Anh – Việt / Nhật – Việt phía trên.":
      "This changes the on-screen wording only. The dictionary language is the English – Vietnamese / Japanese – Vietnamese button above.",

    /* --- học --- */
    "Tiến độ học tập": "Study progress",
    "Đóng": "Close",
    "Đã thuộc hẳn — xoá": "Mastered — remove",
    "Mở nguồn": "Open source",
    "Sửa bản dịch": "Edit translation",
    "Ghi chú": "Note",
    "Hiện nghĩa": "Show meaning",
    "Quên": "Forgot",
    "Nhớ": "Got it",
    "Đã xoá": "Deleted",
    "Hoàn tác": "Undo",
    "Xong buổi học!": "Session done!",
    "Về sổ tay": "Back to notebook",

    /* --- bảng sửa --- */
    "Ghi chú cho mục này": "Note for this entry",
    "Chỉnh lại cho đúng cách nói của chuyên ngành bạn.": "Adjust it to the wording your field actually uses.",
    "Nội dung gốc": "Original",
    "Bản dịch / nghĩa": "Translation / meaning",
    "— mỗi dòng một nghĩa": "— one meaning per line",
    "Ghi chú riêng": "Your note",
    "— ngữ cảnh, thuật ngữ, cách dùng…": "— context, terminology, usage…",
    "Ảnh đính kèm": "Attached images",
    "— chụp màn hình, hình vẽ, trang sách…": "— screenshots, diagrams, book pages…",
    "＋ Thêm ảnh": "＋ Add image",
    "hoặc dán thẳng ảnh vào ô ghi chú": "or paste an image straight into the note box",
    "Ảnh nằm trong máy này, không đẩy lên Drive — đồng bộ chỉ mang chữ đi.":
      "Images stay on this machine and are not uploaded to Drive — sync carries text only.",
    "Huỷ": "Cancel",
    "Lưu": "Save",
    "Khôi phục bản dịch gốc": "Restore the original translation",
    "Gỡ ảnh này": "Remove this image",
    "Chỉ nhận ảnh.": "Images only.",

    /* --- tra từ --- */
    "NeutronDict": "NeutronDict",
    "Tra": "Look up",
    "Từ vựng": "Word",
    "Chi tiết": "Details",
    "Dịch": "Translate",
    "Đang lấy từ đang chọn…": "Reading your selection…",
    "Sổ tay & tiến độ": "Notebook & progress",
    "Sổ tay &amp; tiến độ": "Notebook & progress",
    "Nhập / dán từ cần tra…": "Type or paste a word…",
    "Chuyển giữa Nhật–Việt và Anh–Việt": "Switch between Japanese–Vietnamese and English–Vietnamese",
    "Hướng tra": "Direction",
    "Tự động": "Auto",
    "Anh→Việt": "EN→VI",
    "Việt→Anh": "VI→EN",
    "Nhật→Việt": "JA→VI",
    "Việt→Nhật": "VI→JA",
    "Phát âm": "Pronounce",
    "Lọc theo từ, nghĩa hoặc ghi chú…": "Filter by word, meaning or note…",
    "Nhập nghĩa cho sát chuyên ngành…": "Write a meaning that fits your field…",
    "Ví dụ: trong ngành điện, “breaker” dịch là “máy cắt”, không phải “cầu dao”.":
      "For example: in power engineering “breaker” is a circuit breaker, not a knife switch.",

    /* --- màn Sổ tay: chuỗi do JS dựng ra --- */
    "Tên sổ con mới (ví dụ: Bài 5 - Kanji):":
      "Name for the new deck (e.g. Lesson 5 – Kanji):",
    "Đổi tên sổ:":
      "Rename deck:",
    "Không lưu được ảnh.":
      "Could not save the image.",
    "Ghi lại ngữ cảnh, thuật ngữ tương đương, cách dùng — thứ mà từ điển không nói.":
      "Write down the context, the equivalent term, how it is used — what the dictionary leaves out.",
    "Chỉnh lại cho đúng cách nói của chuyên ngành bạn. Mỗi dòng là một nghĩa.":
      "Adjust it to the wording your field actually uses. One meaning per line.",
    "Bản máy dịch ban đầu: {ban}":
      "Machine translation was: {ban}",
    "Đã lưu bản dịch của bạn":
      "Your translation is saved",
    "Đã lưu ghi chú":
      "Note saved",
    "Bỏ khỏi {ten}":
      "Remove from {ten}",
    "Ghi chú của bạn":
      "Your note",
    "Đang hiện {n} mục":
      "Showing {n} entries",
    "{n} mục đến hạn":
      "{n} due",
    "Không có mục nào ở đây.":
      "Nothing here yet.",
    "Chưa có mục nào. Tra một từ rồi bấm “Lưu”.":
      "No entries yet. Look a word up and press “Save”.",
    "Cách đọc suy ra từ phiên âm, có thể chưa chuẩn":
      "Reading inferred from the romanisation — it may be off",
    "đã sửa":
      "edited",
    "đến hạn":
      "due",
    "Hán Việt: {am}":
      "Sino-Vietnamese: {am}",
    "Nghe lại: {ten}":
      "Play again: {ten}",
    "Lưu từ: {nguon}":
      "Saved from: {nguon}",
    "Sửa bản dịch cho đúng chuyên ngành":
      "Fix the translation to match your field",
    "Sửa ghi chú":
      "Edit note",
    "Thêm ghi chú":
      "Add a note",
    "Nghe lại đúng chỗ này trong video ({t})":
      "Replay this exact spot in the video ({t})",
    "Mở lại trang nguồn và tô sáng vị trí đã lưu":
      "Reopen the source page and highlight the saved spot",
    "Xoá khỏi sổ tay":
      "Remove from the notebook",
    "Đã xoá “{tu}”":
      "Deleted “{tu}”",
    "Chuyển vào sổ":
      "Move to deck",
    "Không có mục nào đến hạn trong mục này. Quay lại sau nhé!":
      "Nothing is due here. Come back later!",
    "Còn {n} mục · đã xong {xong}":
      "{n} left · {xong} done",
    "Nghe lại {t}":
      "Replay {t}",
    "Đã thuộc {n} mục":
      "{n} learned",
    "học lại {n} lượt":
      "{n} repeats",
    "đã xoá {n} mục":
      "{n} deleted",
    "Hôm nay đạt mục tiêu rồi — chuỗi {n} ngày.":
      "Today's goal is done — a {n}-day streak.",
    "Còn {n} lượt nữa là đạt mục tiêu hôm nay.":
      "{n} more to hit today's goal.",
    "Từ":
      "Word",
    "Phiên âm (IPA)":
      "Pronunciation (IPA)",
    "Nghĩa":
      "Meaning",
    "Đã sửa":
      "Edited",
    "Sổ":
      "Deck",
    "Ngày lưu":
      "Saved on",
    "Đã nạp file và trộn vào sổ tay.":
      "File loaded and merged into the notebook.",
    "Đã nạp file sao lưu":
      "Backup loaded",
    "File không hợp lệ.":
      "That file is not valid.",
    "File không hợp lệ":
      "Invalid file",
    "toàn bộ sổ tay":
      "the whole notebook",
    "đang chọn":
      "the current view",
    "Xoá {n} mục trong {noi}? Việc xoá cũng đồng bộ sang máy khác.":
      "Delete {n} entries in {noi}? The deletion syncs to your other devices too.",
    "Đang cấu hình cloud tiếng {ngu}":
      "Configuring the {ngu} cloud",
    "Đã lưu cấu hình đồng bộ cho tiếng {ngu}.":
      "Sync settings saved for {ngu}.",
    "Đã xoá cấu hình tiếng {ngu}.":
      "Sync settings for {ngu} cleared.",
    "Đang đồng bộ…":
      "Syncing…",
    "Lỗi: {loi}":
      "Error: {loi}",
    "Đã đồng bộ · {n} mục · {gio}":
      "Synced · {n} entries · {gio}",
    "Không đồng bộ được: {loi}":
      "Sync failed: {loi}",
    "lỗi không rõ":
      "unknown error",
    "Đã lưu. Tải lại trang web đang mở để áp dụng ngay.":
      "Saved. Reload any open page to apply it right away.",
    "Đã xoá bộ nhớ đệm tra từ.":
      "Lookup cache cleared.",
    "{ngu} · sóng học tập":
      "{ngu} · study rhythm",
    "Sổ tay Nhật – Việt":
      "Japanese – Vietnamese notebook",
    "Sổ tay Anh – Việt":
      "English – Vietnamese notebook",

    /* --- tên thứ tiếng, dùng trong câu "cloud tiếng …" --- */
    "Anh": "English",
    "Nhật": "Japanese",

    /* --- riêng app Android --- */
    " Chuỗi {n} ngày đang chờ bạn.":
      " A {n}-day streak is waiting for you.",
    "(Đang chạy chế độ trình duyệt — bản APK gọi mạng kiểu native.)":
      "(Running in browser mode — the APK build makes native network calls.)",
    "Chi tiết: {loi}. ":
      "Details: {loi}. ",
    "Chưa có mục nào. Sang tab Tra từ và bấm Lưu.":
      "No entries yet. Go to the Look up tab and press Save.",
    "Chưa có nội dung":
      "Nothing here yet",
    "Chưa cấu hình URL đồng bộ cho tiếng {ngu}":
      "No sync URL set for {ngu}",
    "Chưa cấu hình đồng bộ Google Drive":
      "Google Drive sync is not set up",
    "Chưa dịch được sang tiếng Anh (kiểm tra mạng).":
      "Could not translate into English (check your connection).",
    "Chưa lấy được nghĩa tiếng Việt (kiểm tra mạng).":
      "Could not fetch the Vietnamese meaning (check your connection).",
    "Chưa tra được (kiểm tra mạng).":
      "Lookup failed (check your connection).",
    "Cách đọc các ký hiệu":
      "How to read the symbols",
    "Có {n} mục đến hạn":
      "{n} due",
    "Dấu nhấn & độ dài":
      "Stress & length",
    "Dữ liệu không đọc được":
      "The data could not be read",
    "Hôm nay có {n} mục đến hạn.":
      "{n} entries are due today.",
    "Hôm nay đã đạt mục tiêu {dich} lượt. Chuỗi {n} ngày.":
      "Today's goal of {dich} is done. A {n}-day streak.",
    "Hôm nay đạt mục tiêu — chuỗi {n} ngày.":
      "Today's goal is done — a {n}-day streak.",
    "Không còn mục nào đến hạn":
      "Nothing is due",
    "Không có mục nào đến hạn. Quay lại sau nhé!":
      "Nothing is due. Come back later!",
    "Không dịch được lúc này (và chưa cấu hình đồng bộ để dùng máy chủ dự phòng).":
      "Cannot translate right now (and there is no sync set up to fall back on).",
    "Không lấy được nghĩa.":
      "Could not fetch a meaning.",
    "Không tìm thấy từ này":
      "Word not found",
    "Không đọc được bộ nhớ tạm. Hãy dán tay vào ô tra.":
      "Could not read the clipboard. Paste into the box by hand.",
    "Lỗi khi lưu":
      "Save failed",
    "Lỗi máy chủ":
      "Server error",
    "Máy chủ trả về dữ liệu không đọc được":
      "The server returned data that could not be read",
    "Mở lại trang nguồn":
      "Reopen the source page",
    "Nghe ví dụ":
      "Play the example",
    "Nguyên âm":
      "Vowels",
    "Nguyên âm đôi":
      "Diphthongs",
    "Phụ âm":
      "Consonants",
    "Thêm link nguồn":
      "Add a source link",
    "Trình duyệt không gửi kèm link. Giữ lâu nút link trong Sổ tay để dán tay.":
      "The browser did not pass a link along. Long-press the link button in the Notebook to paste one by hand.",
    "Tên sổ con mới:":
      "Name for the new deck:",
    "Xem tab Dịch, hoặc gõ riêng từ cần tra.":
      "Try the Translate tab, or type just the word.",
    "Xoá “{tu}”?":
      "Delete “{tu}”?",
    "cụm từ":
      "phrase",
    "danh từ":
      "noun",
    "danh từ riêng":
      "proper noun",
    "giới từ":
      "preposition",
    "gtx rỗng":
      "empty gtx response",
    "hậu tố":
      "suffix",
    "liên từ":
      "conjunction",
    "mạo từ":
      "article",
    "số từ":
      "numeral",
    "thán từ":
      "interjection",
    "tiền tố":
      "prefix",
    "tiểu từ":
      "particle",
    "trạng từ":
      "adverb",
    "trợ động từ":
      "auxiliary verb",
    "tính từ":
      "adjective",
    "từ hạn định":
      "determiner",
    "viết tắt":
      "abbreviation",
    "đại từ":
      "pronoun",
    "động từ":
      "verb",
    "Ôn thêm {n} lượt nữa là đạt mục tiêu hôm nay.":
      "{n} more reviews to hit today's goal.",
    "Đang tra {huong} — chạm để đổi":
      "Looking up {huong} — tap to switch",
    "Đoạn này dài quá để tra như một từ.":
      "That is too long to look up as a single word.",
    "Đã bật nhắc lúc {gio} hằng ngày.":
      "Reminder set for {gio} every day.",
    "Đã chuyển sang {huong}":
      "Switched to {huong}",
    "Đã làm mới":
      "Refreshed",
    "Đã lưu cấu hình.":
      "Settings saved.",
    "Đã lưu — bấm Sửa nếu bản dịch chưa đúng chuyên ngành":
      "Saved — press Edit if the translation does not fit your field",
    "Đã tắt nhắc nhở.":
      "Reminders turned off.",
    "Đã xoá khỏi sổ tay":
      "Removed from the notebook",
    "Đã đồng bộ · {n} mục":
      "Synced · {n} entries",
    "Đến giờ ôn từ vựng":
      "Time to review your words",
    "Chỉ đổi chữ trên màn hình. Ngôn ngữ tra từ đổi ở nút EN→V / 日→V phía trên.":
      "This changes the on-screen wording only. The dictionary language is the EN→V / 日→V button above.",
    "Dán & tra":
      "Paste & look up",
    "Nhập một từ để tra, hoặc bấm “Dán & tra”.":
      "Type a word to look up, or press “Paste & look up”.",
    "Đổi tên sổ":
      "Rename deck",
    "Nhắc học hằng ngày":
      "Daily study reminder",
    "Giờ nhắc mỗi ngày":
      "Reminder time",
    "Bật nhắc nhở":
      "Turn reminders on",
    "Tắt":
      "Off",
    "Đã thuộc hẳn — xoá mục này":
      "Mastered — remove this entry",
    "Sẵn sàng ôn bài":
      "Ready to review",
    "Bấm nút bên dưới để ôn các mục đến hạn hôm nay.":
      "Press the button below to review what is due today.",
    "Bắt đầu học":
      "Start studying",
    "Tra từ":
      "Look up",
    "Học":
      "Study",
    "Nhập từ cần tra…":
      "Type a word…",
    "Mã bí mật (token)":
      "Secret (token)",

    /* --- thẻ tra trong trang & bảng lời thoại YouTube --- */
    "Không có chi tiết cho đoạn này.":
      "No details for this passage.",
    "Không dịch được":
      "Could not translate",
    "Không tra được":
      "Lookup failed",
    "Không tìm thấy từ này trong từ điển.":
      "That word is not in the dictionary.",
    "NeutronDict: không tìm thấy vị trí của mục này trên trang (nội dung có thể đã thay đổi).":
      "NeutronDict: could not find this entry on the page (the content may have changed).",
    "Sửa":
      "Edit",
    "Đang lưu…":
      "Saving…",
    "Đang lấy chi tiết…":
      "Fetching details…",
    "Đang đọc Hán tự…":
      "Reading the kanji…",
    "Đoạn này dài quá để tra như một từ — xem tab Dịch, hoặc bôi đen riêng từ cần tra.":
      "That is too long to look up as one word — try the Translate tab, or select just the word.",
    "Đã lưu":
      "Saved",
    " (tự động)":
      " (auto)",
    "Bám":
      "Follow",
    "Bản phụ đề này rỗng.":
      "This caption track is empty.",
    "Bấm để nghe lại từ {t}":
      "Click to replay from {t}",
    "Bấm “…” dưới video → “Hiện bản chép lời” — hiện ra là chỗ này tự lấy, không cần bấm gì thêm.":
      "Click “…” under the video → “Show transcript” — once it appears this panel picks it up on its own.",
    "Chọn bản phụ đề":
      "Choose a caption track",
    "Cỡ chữ {px}px — bấm để đổi":
      "Text size {px}px — click to change",
    "Cỡ chữ — bấm để đổi":
      "Text size — click to change",
    "Hiện kèm bản dịch tiếng Việt":
      "Show the Vietnamese translation alongside",
    "Không lấy được phụ đề.":
      "Could not fetch the captions.",
    "Không tải được lời thoại.":
      "Could not load the transcript.",
    "Không tải được trang video (HTTP {ma})":
      "Could not load the video page (HTTP {ma})",
    "Không đọc được dữ liệu trình phát":
      "Could not read the player data",
    "Lưu câu này vào sổ tay":
      "Save this sentence to the notebook",
    "Mở ra":
      "Expand",
    "NeutronDict · Lời thoại":
      "NeutronDict · Transcript",
    "Nạp lại bảng":
      "Reload the panel",
    "Nạp lại bảng (lần {n}/2 — lần nữa sẽ tải lại cả trang)":
      "Reload the panel ({n}/2 — once more reloads the whole page)",
    "Song ngữ":
      "Bilingual",
    "Thu gọn":
      "Collapse",
    "Thấy bảng bản chép lời của YouTube nhưng không đọc được dòng nào — có vẻ họ vừa đổi cách dựng bảng. Bấm Thử lại; còn không thì báo lại để sửa. (khung: {kh} · thẻ quen: {the})":
      "YouTube's transcript panel is there but no line could be read — they seem to have changed how it is built. Press Retry; if that fails, report it so it can be fixed. (frames: {kh} · known tags: {the})",
    "Thử lại":
      "Retry",
    "Tìm trong lời thoại":
      "Search the transcript",
    "Tìm…":
      "Search…",
    "Tự cuộn theo dòng đang nói":
      "Scroll along with the line being spoken",
    "Video này không có phụ đề nào.":
      "This video has no captions.",
    "Video này không có phụ đề — không có gì để đọc.":
      "This video has no captions — there is nothing to read.",
    "Về dòng đang nói":
      "Back to the current line",
    "YouTube không cho tải phụ đề, mà cũng chưa mở được bảng bản chép lời của họ. ":
      "YouTube will not serve the captions, and their transcript panel is not open either. ",
    "YouTube đang chặn đường tải phụ đề, phải đọc lại từ bảng của họ — đổi bản ở đây thì hãy đổi trong bảng đó":
      "YouTube is blocking the caption download, so this reads from their panel instead — change the track there, not here",
    "Đang lưu vào sổ tiếng {ngu} — bấm để đổi":
      "Saving into the {ngu} notebook — click to switch",
    "Đang tìm phụ đề…":
      "Looking for captions…",
    "Đang tải lời thoại…":
      "Loading the transcript…",
    "Đóng bảng":
      "Close the panel",

    /* --- popup tra nhanh --- */
    "Anh–Việt":
      "EN–VI",
    "Nhật–Việt":
      "JA–VI",
    "Đang tra {huong} — bấm để đổi":
      "Looking up {huong} — click to switch",
    "Bôi đen một từ rồi mở lại, hoặc gõ vào ô trên.":
      "Select a word and reopen this, or type one in the box above.",
    "Chưa có nghĩa cho chữ này — bấm Sửa để tự viết vào.":
      "No meaning for this character yet — press Edit to write your own.",
    "Cách đọc các ký hiệu:":
      "How to read the symbols:",
    "Còn {n} lượt nữa là đạt mục tiêu hôm nay":
      "{n} more to hit today's goal",
    "Ghi chú · ":
      "Note · ",
    "Hôm nay đã đạt mục tiêu":
      "Today's goal is done",
    "Không có chi tiết cho từ này.":
      "No details for this word.",
    "Không dịch được.":
      "Could not translate.",
    "Không tìm thấy nghĩa. Kiểm tra chính tả hoặc mạng rồi thử lại.":
      "No meaning found. Check the spelling or your connection and try again.",
    "Nghe câu tiếng Anh":
      "Play the English sentence",
    "Nghe lại câu gốc":
      "Play the original sentence",
    "Bản gốc":
      "Original",
    "Bỏ bản sửa của bạn, lấy lại đúng chữ YouTube chép":
      "Discard your edit and restore YouTube's own wording",
    "Có {n} mục đến hạn trong “{ten}”":
      "{n} items due in “{ten}”",
    "Dừng ghi":
      "Stop recording",
    "Dừng phát":
      "Stop playback",
    "Luyện nói":
      "Speaking practice",
    "Đoạn bạn muốn tập nói":
      "The passage you want to practise",
    "Dán hoặc gõ một đoạn về chủ đề bạn muốn…":
      "Paste or type a passage on any topic…",
    "Dịch và thêm":
      "Translate and add",
    "Hãy viết hoặc dán một đoạn đã.":
      "Write or paste a passage first.",
    "Chưa dịch được — kiểm tra mạng rồi thử lại.":
      "Could not translate — check your connection and try again.",
    "Chưa có đoạn nào. Viết một đoạn ở trên rồi bấm “Dịch và thêm”.":
      "No passages yet. Write one above and tap “Translate and add”.",
    "Nghe giọng máy đọc ({ngu})":
      "Hear it read aloud ({ngu})",
    "Tiếng Việt":
      "Vietnamese",
    "Tiếng Nhật":
      "Japanese",
    "Tiếng Anh":
      "English",
    "Xoá đoạn":
      "Delete passage",
    "Xoá đoạn này và cả bản thu của nó?":
      "Delete this passage and its recordings?",
    "{n} đoạn":
      "{n} passages",
    "Chưa dịch được sang tiếng Nhật (kiểm tra mạng).":
      "Could not translate to Japanese (check your connection).",
    "Ghi giọng mình để đọc theo":
      "Record yourself for shadowing",
    "Ghi lại — đè lên bản cũ":
      "Record again — replaces the old take",
    "Không ghi được: ":
      "Couldn't record: ",
    "Không mở được micro. Hãy cho phép quyền micro rồi thử lại.":
      "Couldn't open the microphone. Allow microphone access and try again.",
    "Không phát được bản thu.":
      "Couldn't play the recording.",
    "Nghe lại giọng mình":
      "Play your recording",
    "Sửa lại lời thoại":
      "Edit this line",
    "Thấy bảng bản chép lời của YouTube nhưng không đọc được dòng nào — có vẻ họ vừa đổi cách dựng bảng. ":
      "Found YouTube's transcript panel but couldn't read a single line — they seem to have changed how it is built. ",
    "Xoá bản thu này":
      "Delete this recording",
    "YouTube chưa được cấp quyền micro. Bấm vào ổ khoá trên thanh địa chỉ để bật.":
      "YouTube does not have microphone permission. Use the padlock in the address bar to allow it.",
    "Ôn ngay {n} mục đến hạn trong “{ten}”":
      "Review the {n} items due in “{ten}”",
    "Đã ghi xong — bấm Nghe để nghe lại.":
      "Recorded — tap Play to listen back.",
    "“{ten}” không còn mục nào đến hạn":
      "Nothing due in “{ten}”",
    "Nghe câu tiếng Nhật":
      "Play the Japanese sentence",
    "Nghĩa đúng với ngữ cảnh / chuyên ngành của bạn…":
      "A meaning that fits your context or field…",
    "Nghĩa — mỗi dòng một nghĩa":
      "Meanings — one per line",
    "Ngữ cảnh, cách dùng, chỗ hay nhầm…":
      "Context, usage, the bits people get wrong…",
    "Nhập hoặc dán đoạn cần dịch.":
      "Type or paste the text to translate.",
    "Sửa nghĩa & ghi chú":
      "Edit meaning & note",
    "Xem đầy đủ":
      "See all",
    "bản của bạn":
      "your version",
    "{da}/{dich} hôm nay":
      "{da}/{dich} today",
    "{n} ngày · {da}/{dich}":
      "{n} days · {da}/{dich}",
    "Đang dịch…":
      "Translating…",
    "Đoạn này dài quá để tra như một từ — xem tab Dịch, hoặc gõ riêng từ cần tra.":
      "That is too long to look up as a single word — try the Translate tab, or type just the word.",
    "Đoạn này không có chữ Hán nào.":
      "There are no kanji in this text.",

/* --- sửa lời thoại --- */
    "Câu này chép sai? Bấm để sửa lại":
      "Transcript wrong here? Tap to fix it",
    "Câu này bạn đã sửa — bấm để sửa tiếp hoặc lấy lại bản gốc":
      "You edited this line — tap to edit again or restore the original",
    "Lưu câu đã sửa":
      "Save the fix",
    "Lấy lại bản gốc":
      "Restore the original",
    "Enter để lưu · Esc để huỷ":
      "Enter to save · Esc to cancel",

        /* --- bản chia sẻ --- */
    "Xuất để chia sẻ":
      "Export to share",
    "Nạp bản chia sẻ":
      "Load a shared file",
    "Xuất CẢ SỔ (cả hai thứ tiếng), mang đủ link và phút video, mở bằng Excel được. Nạp vào thì chỉ THÊM từ mới, không đè lên bản dịch bạn đã tự sửa.":
      "Exports the WHOLE notebook (both languages) with links and video timestamps, and opens in Excel. Loading one only ADDS new words — it never overwrites a meaning you edited yourself.",
    "Chưa có mục nào để xuất":
      "Nothing to export yet",
    "Đã xuất {n} mục — gửi file này cho ai cũng nạp được":
      "Exported {n} entries — send this file to anyone and they can load it",
    "File không đọc được hoặc không có dòng nào":
      "The file could not be read, or has no rows",
    "File thiếu cột “Từ vựng”":
      "The file has no “Từ vựng” column",
    "Đã nạp: thêm {them} từ mới, bổ sung {bs} từ đã có, bỏ qua {bq} từ trùng.":
      "Loaded: {them} new words added, {bs} existing words filled in, {bq} duplicates skipped.",

    /* --- nguồn / đường link --- */
    "Nguồn của mục này": "Source of this entry",
    "Dán địa chỉ trang hoặc video bạn đã gặp từ này, để sau còn tìm lại được ngữ cảnh.":
      "Paste the address of the page or video where you met this word, so you can find the context again later.",
    "Đang trỏ tới phút {t} của video. Sửa link sẽ mất mốc phút này.":
      "Points at {t} in the video. Changing the link drops that timestamp.",
    "Đã lưu từ đoạn: “{doan}”": "Saved from: “{doan}”",
    "Nguồn": "Source",
    "— trang hoặc video đã gặp từ này": "— the page or video you met it in",
    "https://… (để trống = bỏ link)": "https://… (leave empty to remove the link)",

        "Phím tắt tra nhanh: {phim}. Trang web thường thì Ctrl+Shift+Z chạy sẵn; lệnh này để tra ngay cả trong PDF.":
      "Quick-lookup shortcut: {phim}. On ordinary web pages Ctrl+Shift+Z already works; this command is for looking up inside a PDF too.",
    "Trên trang web thường, Ctrl+Shift+Z đã chạy sẵn. Nhưng để tra trong PDF thì cần lệnh gốc, mà Chrome không tự gán lại cho bản đã cài. Bấm nút dưới rồi đặt Ctrl+Shift+Z cho “Mở popup”, hoặc gỡ ra cài lại extension.":
      "On ordinary web pages Ctrl+Shift+Z already works. But looking up inside a PDF needs the native command, and Chrome does not re-assign it for an already-installed extension. Use the button below and set Ctrl+Shift+Z for “Open popup”, or remove and re-add the extension.",
    /* --- phím tắt & sóng ôn tập --- */
    "Đổi phím tắt":
      "Change the shortcut",
    "Phím tắt tra nhanh: {phim}":
      "Quick-lookup shortcut: {phim}",
    "Phím tắt tra nhanh đang KHÔNG có. Thường là do phím đã bị Chrome giữ riêng (Ctrl+Shift+N, Ctrl+Shift+T, Ctrl+Shift+W) hoặc bị extension khác giành mất — Chrome không báo gì cả. Bấm nút dưới để đặt lại.":
      "The quick-lookup shortcut is NOT set. Usually the key is one Chrome keeps for itself (Ctrl+Shift+N, Ctrl+Shift+T, Ctrl+Shift+W) or another extension took it — Chrome says nothing either way. Use the button below to set it again.",
    "Tắt popup thì vẫn dùng được phím tắt và chuột phải như cũ.":
      "With the popup off, the keyboard shortcut and the right-click menu still work as before.",
    "Chưa học":
      "Not studied",
    "Về lại đầu":
      "Back to start",
    "Cấp {n}":
      "Level {n}",
    "mai":
      "tomorrow",
    "còn {n} ngày":
      "in {n} days",
    "còn ~{n} tháng":
      "in ~{n} months",
    "Nhớ thì lên một cấp và lần ôn sau xa hơn; quên thì về lại đầu.":
      "Remember it and it moves up a level with a longer gap; forget it and it drops back to the start.",

    /* --- về tác giả --- */
    "Ra đời bởi": "Made by",
    "NeutronDict · Về tác giả": "NeutronDict · About the author",
    "Một món quà nhỏ gửi tặng cộng đồng học tập": "A small gift to the learning community",
    "Cảm ơn ♥": "Thank you ♥",
    "“Cho đi là còn mãi.”": "“What you give away is what stays.”"
  };

  const ja = {
    /* --- khung chung --- */
    "Sổ tay NeutronDict": "NeutronDict 単語帳",
    "Anh – Việt · sóng học tập": "英語 – ベトナム語 · 学習のリズム",
    "Nhật – Việt · sóng học tập": "日本語 – ベトナム語 · 学習のリズム",
    "Anh – Việt": "英語 – ベトナム語",
    "Nhật – Việt": "日本語 – ベトナム語",
    "Sổ tay": "単語帳",
    "Tiến độ": "学習状況",
    "Học ngay": "学習する",
    "Sổ con": "デッキ",
    "Đổi tên": "名前を変更",
    "Xoá sổ": "デッキを削除",
    "Sổ mới": "新しいデッキ",
    "Tất cả": "すべて",
    "Chưa phân loại": "未分類",
    "Thích": "お気に入り",
    "Không thích": "苦手",
    "Hán tự": "漢字",

    /* --- xuất, sao lưu, đồng bộ --- */
    "Xuất & sao lưu": "書き出し・バックアップ",
    "Anki (TSV)": "Anki (TSV)",
    "CSV": "CSV",
    "Sao lưu .json": ".json でバックアップ",
    "Nạp .json": ".json から復元",
    "Xoá hết mục đang hiện": "表示中の項目をすべて削除",
    "Đồng bộ Google Drive": "Google ドライブ同期",
    "Lưu cấu hình": "設定を保存",
    "Đồng bộ ngay": "今すぐ同期",
    "URL Web App Apps Script (…/exec)": "Apps Script ウェブアプリの URL (…/exec)",
    "Mã bí mật (token bạn tự đặt)": "シークレット（自分で決めるトークン）",

    /* --- cài đặt tra nhanh --- */
    "Cài đặt tra nhanh": "クイック検索の設定",
    "Bôi đen là hiện popup ngay tại con trỏ (chỉ trên trang web, không áp dụng cho PDF)":
      "テキストを選択したらカーソル位置にポップアップを出す（ウェブページのみ、PDF は対象外）",
    "Chỉ hiện khi giữ phím Ctrl lúc bôi đen (tránh popup nhảy ra khi chỉ muốn chép)":
      "Ctrl を押しながら選択したときだけ出す（コピーしたいだけのときに邪魔にならない）",
    "Hiện tab": "ポップアップに",
    "trong popup (dịch cả câu bằng Google Dịch)": "タブを表示（Google 翻訳で文全体を訳す）",
    "Bỏ qua tra từ điển khi bôi đen dài hơn": "選択範囲がこれより長いときは辞書を引かない",
    "ký tự": "文字",
    "Lưu cài đặt": "設定を保存",
    "Xoá bộ nhớ đệm": "キャッシュを消去",
    "Hướng dẫn đọc IPA": "IPA の読み方ガイド",
    "Hướng dẫn IPA": "IPA ガイド",
    "Ngôn ngữ giao diện": "表示言語",
    "Chỉ đổi chữ trên màn hình. Ngôn ngữ tra từ đổi ở nút Anh – Việt / Nhật – Việt phía trên.":
      "変わるのは画面の文字だけです。辞書の言語は上の「英語 – ベトナム語 / 日本語 – ベトナム語」ボタンで切り替えます。",

    /* --- học --- */
    "Tiến độ học tập": "学習の進み具合",
    "Đóng": "閉じる",
    "Đã thuộc hẳn — xoá": "覚えた — 削除",
    "Mở nguồn": "出典を開く",
    "Sửa bản dịch": "訳を編集",
    "Ghi chú": "メモ",
    "Hiện nghĩa": "意味を見る",
    "Quên": "忘れた",
    "Nhớ": "覚えた",
    "Đã xoá": "削除しました",
    "Hoàn tác": "元に戻す",
    "Xong buổi học!": "今回の学習は終わりです！",
    "Về sổ tay": "単語帳に戻る",

    /* --- bảng sửa --- */
    "Ghi chú cho mục này": "この項目のメモ",
    "Chỉnh lại cho đúng cách nói của chuyên ngành bạn.": "自分の分野で実際に使う言い方に直してください。",
    "Nội dung gốc": "原文",
    "Bản dịch / nghĩa": "訳・意味",
    "— mỗi dòng một nghĩa": "— 1 行に 1 つの意味",
    "Ghi chú riêng": "自分のメモ",
    "— ngữ cảnh, thuật ngữ, cách dùng…": "— 文脈、専門用語、使い方…",
    "Ảnh đính kèm": "添付画像",
    "— chụp màn hình, hình vẽ, trang sách…": "— スクリーンショット、図、本のページ…",
    "＋ Thêm ảnh": "＋ 画像を追加",
    "hoặc dán thẳng ảnh vào ô ghi chú": "またはメモ欄に画像を直接貼り付け",
    "Ảnh nằm trong máy này, không đẩy lên Drive — đồng bộ chỉ mang chữ đi.":
      "画像はこの端末に残り、ドライブには送りません。同期が運ぶのは文字だけです。",
    "Huỷ": "キャンセル",
    "Lưu": "保存",
    "Khôi phục bản dịch gốc": "元の訳に戻す",
    "Gỡ ảnh này": "この画像を外す",
    "Chỉ nhận ảnh.": "画像のみです。",

    /* --- tra từ --- */
    "NeutronDict": "NeutronDict",
    "Tra": "検索",
    "Từ vựng": "単語",
    "Chi tiết": "詳細",
    "Dịch": "翻訳",
    "Đang lấy từ đang chọn…": "選択中の文字を読み取っています…",
    "Sổ tay & tiến độ": "単語帳と学習状況",
    "Sổ tay &amp; tiến độ": "単語帳と学習状況",
    "Nhập / dán từ cần tra…": "調べたい語を入力または貼り付け…",
    "Chuyển giữa Nhật–Việt và Anh–Việt": "日本語–ベトナム語と英語–ベトナム語を切り替え",
    "Hướng tra": "方向",
    "Tự động": "自動",
    "Anh→Việt": "英→越",
    "Việt→Anh": "越→英",
    "Nhật→Việt": "日→越",
    "Việt→Nhật": "越→日",
    "Phát âm": "発音",
    "Lọc theo từ, nghĩa hoặc ghi chú…": "語・意味・メモで絞り込み…",
    "Nhập nghĩa cho sát chuyên ngành…": "分野に合った意味を書く…",
    "Ví dụ: trong ngành điện, “breaker” dịch là “máy cắt”, không phải “cầu dao”.":
      "例：電気分野では breaker は「遮断器」であって「断路器」ではありません。",

    /* --- màn Sổ tay: chuỗi do JS dựng ra --- */
    "Tên sổ con mới (ví dụ: Bài 5 - Kanji):":
      "新しいデッキの名前（例：第5課 – 漢字）:",
    "Đổi tên sổ:":
      "デッキの名前を変更:",
    "Không lưu được ảnh.":
      "画像を保存できませんでした。",
    "Ghi lại ngữ cảnh, thuật ngữ tương đương, cách dùng — thứ mà từ điển không nói.":
      "文脈、対応する専門用語、使い方——辞書が教えてくれないことを書き留めておきましょう。",
    "Chỉnh lại cho đúng cách nói của chuyên ngành bạn. Mỗi dòng là một nghĩa.":
      "自分の分野で実際に使う言い方に直してください。1 行に 1 つの意味を書きます。",
    "Bản máy dịch ban đầu: {ban}":
      "機械翻訳の元の訳：{ban}",
    "Đã lưu bản dịch của bạn":
      "訳を保存しました",
    "Đã lưu ghi chú":
      "メモを保存しました",
    "Bỏ khỏi {ten}":
      "{ten} から外す",
    "Ghi chú của bạn":
      "自分のメモ",
    "Đang hiện {n} mục":
      "{n} 件を表示中",
    "{n} mục đến hạn":
      "{n} 件が復習時期",
    "Không có mục nào ở đây.":
      "ここには何もありません。",
    "Chưa có mục nào. Tra một từ rồi bấm “Lưu”.":
      "まだ何もありません。語を調べて「保存」を押してください。",
    "Cách đọc suy ra từ phiên âm, có thể chưa chuẩn":
      "ローマ字から推測した読みです。正しくない場合があります",
    "đã sửa":
      "編集済み",
    "đến hạn":
      "復習時期",
    "Hán Việt: {am}":
      "漢越音：{am}",
    "Nghe lại: {ten}":
      "もう一度聞く：{ten}",
    "Lưu từ: {nguon}":
      "保存元：{nguon}",
    "Sửa bản dịch cho đúng chuyên ngành":
      "自分の分野に合うよう訳を直す",
    "Sửa ghi chú":
      "メモを編集",
    "Thêm ghi chú":
      "メモを追加",
    "Nghe lại đúng chỗ này trong video ({t})":
      "動画のこの箇所をもう一度再生（{t}）",
    "Mở lại trang nguồn và tô sáng vị trí đã lưu":
      "元のページを開き、保存した箇所を強調表示",
    "Xoá khỏi sổ tay":
      "単語帳から削除",
    "Đã xoá “{tu}”":
      "「{tu}」を削除しました",
    "Chuyển vào sổ":
      "デッキへ移動",
    "Không có mục nào đến hạn trong mục này. Quay lại sau nhé!":
      "ここに復習時期の項目はありません。またあとで！",
    "Còn {n} mục · đã xong {xong}":
      "残り {n} 件 · 完了 {xong} 件",
    "Nghe lại {t}":
      "{t} を再生",
    "Đã thuộc {n} mục":
      "{n} 件を覚えた",
    "học lại {n} lượt":
      "{n} 回やり直し",
    "đã xoá {n} mục":
      "{n} 件を削除",
    "Hôm nay đạt mục tiêu rồi — chuỗi {n} ngày.":
      "今日の目標を達成しました——{n} 日連続です。",
    "Còn {n} lượt nữa là đạt mục tiêu hôm nay.":
      "今日の目標まであと {n} 回です。",
    "Từ":
      "語",
    "Phiên âm (IPA)":
      "発音（IPA）",
    "Nghĩa":
      "意味",
    "Đã sửa":
      "編集済み",
    "Sổ":
      "デッキ",
    "Ngày lưu":
      "保存日",
    "Đã nạp file và trộn vào sổ tay.":
      "ファイルを読み込み、単語帳に統合しました。",
    "Đã nạp file sao lưu":
      "バックアップを読み込みました",
    "File không hợp lệ.":
      "このファイルは正しくありません。",
    "File không hợp lệ":
      "不正なファイル",
    "toàn bộ sổ tay":
      "単語帳全体",
    "đang chọn":
      "表示中の範囲",
    "Xoá {n} mục trong {noi}? Việc xoá cũng đồng bộ sang máy khác.":
      "{noi}の {n} 件を削除しますか？削除は他の端末にも同期されます。",
    "Đang cấu hình cloud tiếng {ngu}":
      "{ngu}のクラウドを設定中",
    "Đã lưu cấu hình đồng bộ cho tiếng {ngu}.":
      "{ngu}の同期設定を保存しました。",
    "Đã xoá cấu hình tiếng {ngu}.":
      "{ngu}の同期設定を消去しました。",
    "Đang đồng bộ…":
      "同期中…",
    "Lỗi: {loi}":
      "エラー：{loi}",
    "Đã đồng bộ · {n} mục · {gio}":
      "同期しました · {n} 件 · {gio}",
    "Không đồng bộ được: {loi}":
      "同期できませんでした：{loi}",
    "lỗi không rõ":
      "原因不明のエラー",
    "Đã lưu. Tải lại trang web đang mở để áp dụng ngay.":
      "保存しました。開いているページを再読み込みするとすぐ反映されます。",
    "Đã xoá bộ nhớ đệm tra từ.":
      "検索キャッシュを消去しました。",
    "{ngu} · sóng học tập":
      "{ngu} · 学習のリズム",
    "Sổ tay Nhật – Việt":
      "日本語 – ベトナム語 単語帳",
    "Sổ tay Anh – Việt":
      "英語 – ベトナム語 単語帳",

    /* --- tên thứ tiếng, dùng trong câu "cloud tiếng …" --- */
    "Anh": "英語",
    "Nhật": "日本語",

    /* --- riêng app Android --- */
    " Chuỗi {n} ngày đang chờ bạn.":
      " {n} 日連続の記録が待っています。",
    "(Đang chạy chế độ trình duyệt — bản APK gọi mạng kiểu native.)":
      "（ブラウザモードで動作中——APK 版はネイティブで通信します。）",
    "Chi tiết: {loi}. ":
      "詳細：{loi}。",
    "Chưa có mục nào. Sang tab Tra từ và bấm Lưu.":
      "まだ何もありません。「検索」タブで「保存」を押してください。",
    "Chưa có nội dung":
      "まだ何もありません",
    "Chưa cấu hình URL đồng bộ cho tiếng {ngu}":
      "{ngu}の同期 URL が未設定です",
    "Chưa cấu hình đồng bộ Google Drive":
      "Google ドライブ同期が未設定です",
    "Chưa dịch được sang tiếng Anh (kiểm tra mạng).":
      "英語に翻訳できませんでした（通信を確認してください）。",
    "Chưa lấy được nghĩa tiếng Việt (kiểm tra mạng).":
      "ベトナム語の意味を取得できませんでした（通信を確認してください）。",
    "Chưa tra được (kiểm tra mạng).":
      "検索できませんでした（通信を確認してください）。",
    "Cách đọc các ký hiệu":
      "記号の読み方",
    "Có {n} mục đến hạn":
      "{n} 件が復習時期",
    "Dấu nhấn & độ dài":
      "強勢と長さ",
    "Dữ liệu không đọc được":
      "データを読み取れません",
    "Hôm nay có {n} mục đến hạn.":
      "今日は {n} 件が復習時期です。",
    "Hôm nay đã đạt mục tiêu {dich} lượt. Chuỗi {n} ngày.":
      "今日の目標 {dich} 回を達成しました。{n} 日連続です。",
    "Hôm nay đạt mục tiêu — chuỗi {n} ngày.":
      "今日の目標を達成——{n} 日連続です。",
    "Không còn mục nào đến hạn":
      "復習時期の項目はありません",
    "Không có mục nào đến hạn. Quay lại sau nhé!":
      "復習時期の項目はありません。またあとで！",
    "Không dịch được lúc này (và chưa cấu hình đồng bộ để dùng máy chủ dự phòng).":
      "今は翻訳できません（予備のサーバーを使う同期設定もありません）。",
    "Không lấy được nghĩa.":
      "意味を取得できませんでした。",
    "Không tìm thấy từ này":
      "この語は見つかりません",
    "Không đọc được bộ nhớ tạm. Hãy dán tay vào ô tra.":
      "クリップボードを読めません。検索欄に手で貼り付けてください。",
    "Lỗi khi lưu":
      "保存に失敗しました",
    "Lỗi máy chủ":
      "サーバーエラー",
    "Máy chủ trả về dữ liệu không đọc được":
      "サーバーが読み取れないデータを返しました",
    "Mở lại trang nguồn":
      "元のページを開き直す",
    "Nghe ví dụ":
      "例文を再生",
    "Nguyên âm":
      "母音",
    "Nguyên âm đôi":
      "二重母音",
    "Phụ âm":
      "子音",
    "Thêm link nguồn":
      "出典リンクを追加",
    "Trình duyệt không gửi kèm link. Giữ lâu nút link trong Sổ tay để dán tay.":
      "ブラウザがリンクを渡しませんでした。単語帳のリンクボタンを長押しして手で貼り付けてください。",
    "Tên sổ con mới:":
      "新しいデッキの名前：",
    "Xem tab Dịch, hoặc gõ riêng từ cần tra.":
      "「翻訳」タブを見るか、語だけを入力してください。",
    "Xoá “{tu}”?":
      "「{tu}」を削除しますか？",
    "cụm từ":
      "句",
    "danh từ":
      "名詞",
    "danh từ riêng":
      "固有名詞",
    "giới từ":
      "前置詞",
    "gtx rỗng":
      "gtx の応答が空です",
    "hậu tố":
      "接尾辞",
    "liên từ":
      "接続詞",
    "mạo từ":
      "冠詞",
    "số từ":
      "数詞",
    "thán từ":
      "間投詞",
    "tiền tố":
      "接頭辞",
    "tiểu từ":
      "助詞",
    "trạng từ":
      "副詞",
    "trợ động từ":
      "助動詞",
    "tính từ":
      "形容詞",
    "từ hạn định":
      "限定詞",
    "viết tắt":
      "略語",
    "đại từ":
      "代名詞",
    "động từ":
      "動詞",
    "Ôn thêm {n} lượt nữa là đạt mục tiêu hôm nay.":
      "今日の目標まであと {n} 回です。",
    "Đang tra {huong} — chạm để đổi":
      "{huong} で検索中——タップで切り替え",
    "Đoạn này dài quá để tra như một từ.":
      "1 語として調べるには長すぎます。",
    "Đã bật nhắc lúc {gio} hằng ngày.":
      "毎日 {gio} に通知します。",
    "Đã chuyển sang {huong}":
      "{huong} に切り替えました",
    "Đã làm mới":
      "更新しました",
    "Đã lưu cấu hình.":
      "設定を保存しました。",
    "Đã lưu — bấm Sửa nếu bản dịch chưa đúng chuyên ngành":
      "保存しました——分野に合わなければ「編集」を押してください",
    "Đã tắt nhắc nhở.":
      "リマインダーをオフにしました。",
    "Đã xoá khỏi sổ tay":
      "単語帳から削除しました",
    "Đã đồng bộ · {n} mục":
      "同期しました · {n} 件",
    "Đến giờ ôn từ vựng":
      "単語を復習する時間です",
    "Chỉ đổi chữ trên màn hình. Ngôn ngữ tra từ đổi ở nút EN→V / 日→V phía trên.":
      "変わるのは画面の文字だけです。辞書の言語は上の EN→V / 日→V ボタンで切り替えます。",
    "Dán & tra":
      "貼り付けて検索",
    "Nhập một từ để tra, hoặc bấm “Dán & tra”.":
      "調べたい語を入力するか、「貼り付けて検索」を押してください。",
    "Đổi tên sổ":
      "デッキの名前を変更",
    "Nhắc học hằng ngày":
      "毎日の学習リマインダー",
    "Giờ nhắc mỗi ngày":
      "通知する時刻",
    "Bật nhắc nhở":
      "リマインダーを有効にする",
    "Tắt":
      "オフ",
    "Đã thuộc hẳn — xoá mục này":
      "覚えた——この項目を削除",
    "Sẵn sàng ôn bài":
      "復習の準備ができました",
    "Bấm nút bên dưới để ôn các mục đến hạn hôm nay.":
      "下のボタンを押すと、今日ぶんの復習が始まります。",
    "Bắt đầu học":
      "学習を始める",
    "Tra từ":
      "検索",
    "Học":
      "学習",
    "Nhập từ cần tra…":
      "調べたい語を入力…",
    "Mã bí mật (token)":
      "シークレット（トークン）",

    /* --- thẻ tra trong trang & bảng lời thoại YouTube --- */
    "Không có chi tiết cho đoạn này.":
      "この文章の詳細はありません。",
    "Không dịch được":
      "翻訳できません",
    "Không tra được":
      "検索できません",
    "Không tìm thấy từ này trong từ điển.":
      "この語は辞書にありません。",
    "NeutronDict: không tìm thấy vị trí của mục này trên trang (nội dung có thể đã thay đổi).":
      "NeutronDict：この項目の位置がページ上で見つかりません（内容が変わった可能性があります）。",
    "Sửa":
      "編集",
    "Đang lưu…":
      "保存中…",
    "Đang lấy chi tiết…":
      "詳細を取得中…",
    "Đang đọc Hán tự…":
      "漢字を読み取り中…",
    "Đoạn này dài quá để tra như một từ — xem tab Dịch, hoặc bôi đen riêng từ cần tra.":
      "1 語として調べるには長すぎます——「翻訳」タブを見るか、語だけを選択してください。",
    "Đã lưu":
      "保存しました",
    " (tự động)":
      "（自動）",
    "Bám":
      "追従",
    "Bản phụ đề này rỗng.":
      "この字幕トラックは空です。",
    "Bấm để nghe lại từ {t}":
      "{t} から再生",
    "Bấm “…” dưới video → “Hiện bản chép lời” — hiện ra là chỗ này tự lấy, không cần bấm gì thêm.":
      "動画の下の「…」→「文字起こしを表示」を押してください。表示されればこのパネルが自動で読み取ります。",
    "Chọn bản phụ đề":
      "字幕トラックを選択",
    "Cỡ chữ {px}px — bấm để đổi":
      "文字サイズ {px}px——クリックで変更",
    "Cỡ chữ — bấm để đổi":
      "文字サイズ——クリックで変更",
    "Hiện kèm bản dịch tiếng Việt":
      "ベトナム語訳を併記",
    "Không lấy được phụ đề.":
      "字幕を取得できませんでした。",
    "Không tải được lời thoại.":
      "文字起こしを読み込めませんでした。",
    "Không tải được trang video (HTTP {ma})":
      "動画ページを読み込めませんでした（HTTP {ma}）",
    "Không đọc được dữ liệu trình phát":
      "プレーヤーのデータを読み取れません",
    "Lưu câu này vào sổ tay":
      "この文を単語帳に保存",
    "Mở ra":
      "展開",
    "NeutronDict · Lời thoại":
      "NeutronDict · 文字起こし",
    "Nạp lại bảng":
      "パネルを再読み込み",
    "Nạp lại bảng (lần {n}/2 — lần nữa sẽ tải lại cả trang)":
      "パネルを再読み込み（{n}/2——もう一度でページ全体を再読み込み）",
    "Song ngữ":
      "二言語",
    "Thu gọn":
      "折りたたむ",
    "Thấy bảng bản chép lời của YouTube nhưng không đọc được dòng nào — có vẻ họ vừa đổi cách dựng bảng. Bấm Thử lại; còn không thì báo lại để sửa. (khung: {kh} · thẻ quen: {the})":
      "YouTube の文字起こしパネルはありますが、1 行も読み取れませんでした——構造が変わったようです。「再試行」を押し、それでも駄目なら報告してください。（フレーム：{kh} · 既知のタグ：{the}）",
    "Thử lại":
      "再試行",
    "Tìm trong lời thoại":
      "文字起こしを検索",
    "Tìm…":
      "検索…",
    "Tự cuộn theo dòng đang nói":
      "話している行に合わせて自動スクロール",
    "Video này không có phụ đề nào.":
      "この動画に字幕はありません。",
    "Video này không có phụ đề — không có gì để đọc.":
      "この動画に字幕はありません——読むものがありません。",
    "Về dòng đang nói":
      "話している行に戻る",
    "YouTube không cho tải phụ đề, mà cũng chưa mở được bảng bản chép lời của họ. ":
      "YouTube が字幕の取得を許さず、文字起こしパネルも開いていません。",
    "YouTube đang chặn đường tải phụ đề, phải đọc lại từ bảng của họ — đổi bản ở đây thì hãy đổi trong bảng đó":
      "YouTube が字幕の取得を遮断しているため、先方のパネルから読み取っています——トラックの変更はそちらで行ってください",
    "Đang lưu vào sổ tiếng {ngu} — bấm để đổi":
      "{ngu}の単語帳に保存中——クリックで切り替え",
    "Đang tìm phụ đề…":
      "字幕を探しています…",
    "Đang tải lời thoại…":
      "文字起こしを読み込み中…",
    "Đóng bảng":
      "パネルを閉じる",

    /* --- popup tra nhanh --- */
    "Anh–Việt":
      "英–越",
    "Nhật–Việt":
      "日–越",
    "Đang tra {huong} — bấm để đổi":
      "{huong} で検索中——クリックで切り替え",
    "Bôi đen một từ rồi mở lại, hoặc gõ vào ô trên.":
      "語を選択してから開き直すか、上の欄に入力してください。",
    "Chưa có nghĩa cho chữ này — bấm Sửa để tự viết vào.":
      "この字の意味はまだありません——「編集」で自分で書けます。",
    "Cách đọc các ký hiệu:":
      "記号の読み方：",
    "Còn {n} lượt nữa là đạt mục tiêu hôm nay":
      "今日の目標まであと {n} 回",
    "Ghi chú · ":
      "メモ · ",
    "Hôm nay đã đạt mục tiêu":
      "今日の目標は達成済み",
    "Không có chi tiết cho từ này.":
      "この語の詳細はありません。",
    "Không dịch được.":
      "翻訳できませんでした。",
    "Không tìm thấy nghĩa. Kiểm tra chính tả hoặc mạng rồi thử lại.":
      "意味が見つかりません。つづりか通信を確認して、もう一度お試しください。",
    "Nghe câu tiếng Anh":
      "英語の文を再生",
    "Nghe lại câu gốc":
      "元の文を再生",
    "Bản gốc":
      "元の文",
    "Bỏ bản sửa của bạn, lấy lại đúng chữ YouTube chép":
      "自分の修正を取り消し、YouTube の原文に戻す",
    "Có {n} mục đến hạn trong “{ten}”":
      "「{ten}」に期限の項目が {n} 件",
    "Dừng ghi":
      "録音を停止",
    "Dừng phát":
      "再生を停止",
    "Luyện nói":
      "スピーキング練習",
    "Đoạn bạn muốn tập nói":
      "練習したい文章",
    "Dán hoặc gõ một đoạn về chủ đề bạn muốn…":
      "好きなテーマの文章を貼り付けるか入力…",
    "Dịch và thêm":
      "翻訳して追加",
    "Hãy viết hoặc dán một đoạn đã.":
      "まず文章を書くか貼り付けてください。",
    "Chưa dịch được — kiểm tra mạng rồi thử lại.":
      "翻訳できませんでした。通信を確認してもう一度お試しください。",
    "Chưa có đoạn nào. Viết một đoạn ở trên rồi bấm “Dịch và thêm”.":
      "まだ文章がありません。上に書いて「翻訳して追加」を押してください。",
    "Nghe giọng máy đọc ({ngu})":
      "読み上げを聞く（{ngu}）",
    "Tiếng Việt":
      "ベトナム語",
    "Tiếng Nhật":
      "日本語",
    "Tiếng Anh":
      "英語",
    "Xoá đoạn":
      "文章を削除",
    "Xoá đoạn này và cả bản thu của nó?":
      "この文章と録音を削除しますか？",
    "{n} đoạn":
      "{n} 件",
    "Chưa dịch được sang tiếng Nhật (kiểm tra mạng).":
      "日本語に翻訳できませんでした（通信を確認してください）。",
    "Ghi giọng mình để đọc theo":
      "シャドーイング用に自分の声を録音",
    "Ghi lại — đè lên bản cũ":
      "録り直す — 前の録音を上書き",
    "Không ghi được: ":
      "録音できません: ",
    "Không mở được micro. Hãy cho phép quyền micro rồi thử lại.":
      "マイクを開けません。マイクの使用を許可してからもう一度お試しください。",
    "Không phát được bản thu.":
      "録音を再生できません。",
    "Nghe lại giọng mình":
      "自分の録音を再生",
    "Sửa lại lời thoại":
      "この字幕を修正",
    "Thấy bảng bản chép lời của YouTube nhưng không đọc được dòng nào — có vẻ họ vừa đổi cách dựng bảng. ":
      "YouTube の文字起こしパネルは見つかりましたが、行を読み取れません。作りが変わったようです。",
    "Xoá bản thu này":
      "この録音を削除",
    "YouTube chưa được cấp quyền micro. Bấm vào ổ khoá trên thanh địa chỉ để bật.":
      "YouTube にマイクの許可がありません。アドレスバーの鍵アイコンから許可してください。",
    "Ôn ngay {n} mục đến hạn trong “{ten}”":
      "「{ten}」の期限 {n} 件をすぐ復習",
    "Đã ghi xong — bấm Nghe để nghe lại.":
      "録音しました。再生ボタンで聞き返せます。",
    "“{ten}” không còn mục nào đến hạn":
      "「{ten}」に期限の項目はありません",
    "Nghe câu tiếng Nhật":
      "日本語の文を再生",
    "Nghĩa đúng với ngữ cảnh / chuyên ngành của bạn…":
      "自分の文脈や分野に合う意味…",
    "Nghĩa — mỗi dòng một nghĩa":
      "意味——1 行に 1 つ",
    "Ngữ cảnh, cách dùng, chỗ hay nhầm…":
      "文脈、使い方、間違えやすい点…",
    "Nhập hoặc dán đoạn cần dịch.":
      "翻訳したい文章を入力または貼り付けてください。",
    "Sửa nghĩa & ghi chú":
      "意味とメモを編集",
    "Xem đầy đủ":
      "すべて見る",
    "bản của bạn":
      "自分の訳",
    "{da}/{dich} hôm nay":
      "今日 {da}/{dich}",
    "{n} ngày · {da}/{dich}":
      "{n} 日連続 · {da}/{dich}",
    "Đang dịch…":
      "翻訳中…",
    "Đoạn này dài quá để tra như một từ — xem tab Dịch, hoặc gõ riêng từ cần tra.":
      "1 語として調べるには長すぎます——「翻訳」タブを見るか、語だけを入力してください。",
    "Đoạn này không có chữ Hán nào.":
      "この文章に漢字はありません。",

/* --- sửa lời thoại --- */
    "Câu này chép sai? Bấm để sửa lại":
      "書き起こしが違いますか？押して直せます",
    "Câu này bạn đã sửa — bấm để sửa tiếp hoặc lấy lại bản gốc":
      "この行は編集済みです——押すと再編集、または元に戻せます",
    "Lưu câu đã sửa":
      "修正を保存",
    "Lấy lại bản gốc":
      "元に戻す",
    "Enter để lưu · Esc để huỷ":
      "Enter で保存 · Esc で取消",

        /* --- bản chia sẻ --- */
    "Xuất để chia sẻ":
      "共有用に書き出す",
    "Nạp bản chia sẻ":
      "共有ファイルを読み込む",
    "Xuất CẢ SỔ (cả hai thứ tiếng), mang đủ link và phút video, mở bằng Excel được. Nạp vào thì chỉ THÊM từ mới, không đè lên bản dịch bạn đã tự sửa.":
      "単語帳ぜんぶ（両言語）を書き出します。リンクと動画の時間も入り、Excel で開けます。読み込んでも新しい語を追加するだけで、自分で直した訳が上書きされることはありません。",
    "Chưa có mục nào để xuất":
      "書き出すものがまだありません",
    "Đã xuất {n} mục — gửi file này cho ai cũng nạp được":
      "{n} 件を書き出しました——このファイルを送れば誰でも読み込めます",
    "File không đọc được hoặc không có dòng nào":
      "ファイルを読み込めないか、行がありません",
    "File thiếu cột “Từ vựng”":
      "「Từ vựng」の列がありません",
    "Đã nạp: thêm {them} từ mới, bổ sung {bs} từ đã có, bỏ qua {bq} từ trùng.":
      "読み込み完了：新規 {them} 語、既存に補足 {bs} 語、重複のためスキップ {bq} 語。",

    /* --- nguồn / đường link --- */
    "Nguồn của mục này": "この項目の出典",
    "Dán địa chỉ trang hoặc video bạn đã gặp từ này, để sau còn tìm lại được ngữ cảnh.":
      "この語に出会ったページや動画のアドレスを貼っておくと、あとで文脈をたどれます。",
    "Đang trỏ tới phút {t} của video. Sửa link sẽ mất mốc phút này.":
      "動画の {t} を指しています。リンクを変えるとこの時間は消えます。",
    "Đã lưu từ đoạn: “{doan}”": "保存元の文：「{doan}」",
    "Nguồn": "出典",
    "— trang hoặc video đã gặp từ này": "— 出会ったページまたは動画",
    "https://… (để trống = bỏ link)": "https://…（空にするとリンクを削除）",

        "Phím tắt tra nhanh: {phim}. Trang web thường thì Ctrl+Shift+Z chạy sẵn; lệnh này để tra ngay cả trong PDF.":
      "クイック検索のショートカット：{phim}。通常のウェブページでは Ctrl+Shift+Z がそのまま動きます。このコマンドは PDF 内でも引けるようにするためのものです。",
    "Trên trang web thường, Ctrl+Shift+Z đã chạy sẵn. Nhưng để tra trong PDF thì cần lệnh gốc, mà Chrome không tự gán lại cho bản đã cài. Bấm nút dưới rồi đặt Ctrl+Shift+Z cho “Mở popup”, hoặc gỡ ra cài lại extension.":
      "通常のウェブページでは Ctrl+Shift+Z はすでに動きます。ただし PDF 内で引くにはネイティブコマンドが必要で、Chrome はインストール済みの拡張機能に再割り当てしません。下のボタンから「ポップアップを開く」に Ctrl+Shift+Z を設定するか、拡張機能を入れ直してください。",
    /* --- phím tắt & sóng ôn tập --- */
    "Đổi phím tắt":
      "ショートカットを変更",
    "Phím tắt tra nhanh: {phim}":
      "クイック検索のショートカット：{phim}",
    "Phím tắt tra nhanh đang KHÔNG có. Thường là do phím đã bị Chrome giữ riêng (Ctrl+Shift+N, Ctrl+Shift+T, Ctrl+Shift+W) hoặc bị extension khác giành mất — Chrome không báo gì cả. Bấm nút dưới để đặt lại.":
      "クイック検索のショートカットが設定されていません。Chrome が予約しているキー（Ctrl+Shift+N、Ctrl+Shift+T、Ctrl+Shift+W）か、他の拡張機能に取られている場合がほとんどです——どちらも Chrome は何も知らせません。下のボタンから設定し直してください。",
    "Tắt popup thì vẫn dùng được phím tắt và chuột phải như cũ.":
      "ポップアップを切っても、ショートカットと右クリックメニューはこれまでどおり使えます。",
    "Chưa học":
      "未学習",
    "Về lại đầu":
      "最初に戻る",
    "Cấp {n}":
      "レベル {n}",
    "mai":
      "明日",
    "còn {n} ngày":
      "あと {n} 日",
    "còn ~{n} tháng":
      "あと約 {n} か月",
    "Nhớ thì lên một cấp và lần ôn sau xa hơn; quên thì về lại đầu.":
      "覚えていれば 1 段上がって次の復習が先に延び、忘れていれば最初に戻ります。",

    /* --- về tác giả --- */
    "Ra đời bởi": "制作",
    "NeutronDict · Về tác giả": "NeutronDict · 作者について",
    "Một món quà nhỏ gửi tặng cộng đồng học tập": "学ぶ人たちへのささやかな贈り物",
    "Cảm ơn ♥": "ありがとう ♥",
    "“Cho đi là còn mãi.”": "「与えたものだけが残る。」"
  };

  goc.CHU_BANG = { en: en, ja: ja };
  if (typeof module !== "undefined" && module.exports) module.exports = goc.CHU_BANG;
})(typeof self !== "undefined" ? self : this);
