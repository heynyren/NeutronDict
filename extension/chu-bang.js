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
