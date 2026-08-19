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
