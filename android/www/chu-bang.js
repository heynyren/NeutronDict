/**
 * Bảng dịch giao diện. Khoá là chính chuỗi tiếng Việt — xem chu.js.
 *
 * Thiếu một dòng thì chỗ đó hiện tiếng Việt, không vỡ gì. Nên thà bỏ trống còn
 * hơn điền một bản dịch đoán bừa.
 */
(function (goc) {
  "use strict";

  const en = {

    /* --- luyện ngữ pháp --- */
    "Câu gốc": "Original sentence",
    "Bản dịch tiếng Việt": "Vietnamese translation",
    "Đang dịch câu gốc…": "Translating the original sentence…",
    "Chưa dịch được câu này.": "Could not translate this sentence.",
    "Đây là đáp án.": "Here is the answer.",
    "Luyện ngữ pháp": "Grammar practice",
    "Ngữ pháp": "Grammar",
    "Ghép các mảnh bị xáo trộn thành câu tiếng Nhật gốc chứa từ bạn đã lưu. Mỗi câu có tối đa 4 mảnh; kết quả không ảnh hưởng SRS.": "Arrange the shuffled pieces into the original Japanese sentence containing a word you saved. Each sentence has at most four pieces; results do not affect SRS.",
    "Bắt đầu luyện": "Start practice",
    "Luyện lại": "Practice again",
    "Câu của bạn": "Your sentence",
    "Các mảnh bị xáo trộn": "Shuffled pieces",
    "Xem câu gốc": "Show original sentence",
    "Đã ghép đúng {dung}/{tong} câu.": "Correctly assembled {dung}/{tong} sentences.",
    "Chạm từng mảnh để ghép câu gốc.": "Tap the pieces to rebuild the original sentence.",
    "Câu {i}/{n} · {m} mảnh": "Sentence {i}/{n} · {m} pieces",
    "Từ đã lưu: {tu}": "Saved word: {tu}",
    "Nghĩa: {nghia}": "Meaning: {nghia}",
    "Ghép lại câu đã lưu": "Rebuild the saved sentence",
    "Bỏ mảnh khỏi câu": "Remove piece from sentence",
    "Đưa mảnh vào câu": "Add piece to sentence",
    "Chạm các mảnh bên dưới theo đúng thứ tự": "Tap the pieces below in the correct order",
    "Chưa đúng. Chạm mảnh trong câu để đổi chỗ rồi thử lại.": "Not quite. Tap a piece in your sentence to move it, then try again.",
    "Đúng rồi!": "Correct!",
    "Câu gốc: {cau}": "Original sentence: {cau}",
    "Chuyển sang Nhật – Việt để luyện ngữ pháp.": "Switch to Japanese–Vietnamese to practice grammar.",
    "Có {n} câu từ sổ tay để luyện.": "{n} sentences from your notebook are ready to practice.",
    "Chưa có câu tiếng Nhật đủ ngữ cảnh. Hãy lưu từ trong một câu trọn vẹn hoặc lưu câu từ video.": "No complete Japanese sentences are available yet. Save a word with its full sentence or save a sentence from a video.",
    "Không đọc được sổ tay. Hãy thử mở lại mục này.": "Could not read the notebook. Please reopen this section.",

    /* --- đóng băng từ, và tắt bài mạng nghĩa --- */
    "Đóng băng": "Freeze",
    "Đang đóng băng": "Frozen",
    "Tắt mạng nghĩa": "Turn off word links",
    "Mạng nghĩa đã tắt": "Word links off",
    "Từ này đang đóng băng": "This word is frozen",
    "Đóng băng — rút từ này khỏi chế độ học, điểm giữ nguyên":
      "Freeze — take this word out of study; its score stays as it is",
    "Đang đóng băng — bấm để đưa lại vào vòng ôn, từ sẽ tới hạn ngay":
      "Frozen — tap to bring it back into review; it will be due right away",
    "Tắt bài đồng/trái nghĩa cho từ này — danh sách liên kết vẫn giữ nguyên":
      "Turn off the synonym/antonym exercises for this word — its links stay as they are",
    "Bài đồng/trái nghĩa đang tắt — bấm để bật lại":
      "Synonym/antonym exercises are off — tap to turn them back on",
    "Bài đồng/trái nghĩa đang tắt cho từ này — các từ vẫn dùng cho từ khác.":
      "Synonym/antonym exercises are off for this word — the links still serve the other words.",
    "Mạng nghĩa: bạn đã tắt cho từ này.": "Word links: you turned these off for this word.",
    "Mạng nghĩa: bạn đã tắt cho từ này — nhãn ở trên không tính phần đó.":
      "Word links: you turned these off for this word — the label above leaves them out.",
    "Gỡ băng tất cả ({n})": "Unfreeze all ({n})",
    "Bật lại mạng nghĩa ({n})": "Turn word links back on ({n})",
    "Đã gỡ băng {n} từ — chúng tới hạn ngay từ buổi học tới":
      "Unfroze {n} words — they are due from the next session on",
    "Đã đóng băng lại {n} từ": "Froze {n} words again",
    "Đã tắt bài đồng/trái nghĩa cho {n} từ":
      "Turned off synonym/antonym exercises for {n} words",
    "Đã bật lại bài đồng/trái nghĩa cho {n} từ":
      "Turned synonym/antonym exercises back on for {n} words",

    /* --- bỏ một từ khỏi liên kết --- */
    "Bỏ “{tu}” khỏi liên kết — sẽ không ra trong bài kiểm tra nữa":
      "Remove “{tu}” from the links — it will stop appearing in exercises",
    "Đã bỏ “{tu}” khỏi liên kết":
      "Removed “{tu}” from the links",
    "Đã nhận lại “{tu}”":
      "“{tu}” is back",
    "Bỏ “{tu}” khỏi liên kết của “{goc}”":
      "Remove “{tu}” from the links of “{goc}”",
    "Nhận lại “{tu}” vào liên kết":
      "Put “{tu}” back into the links",

    /* --- link đoạn chat Gemini --- */
    "Mở": "Open",
    "Không đọc được bộ nhớ tạm": "Could not read the clipboard",
    "Bộ nhớ tạm không phải link đoạn chat Gemini": "The clipboard is not a Gemini chat link",
    "Đã lưu link đoạn chat vào ghi chú": "Chat link saved to the note",

    /* --- màn kết quả bài liên kết --- */
    "+ Lưu": "+ Save",
    "Đã có": "Saved",
    "Không lưu được từ này": "Could not save this word",
    "Tiếp": "Next",
    "Đáp án": "Answers",
    "Mấy từ này CÙNG NGHĨA với từ nào?":
      "These words are SYNONYMS of which word?",
    "Mấy từ này TRÁI NGHĨA với từ nào?":
      "These words are ANTONYMS of which word?",
    "Từ khác trong sổ":
      "Other words from your notebook",
    "Cùng nghĩa với nó":
      "Its synonyms",
    "Trái nghĩa với nó":
      "Its antonyms",
    "Tìm ra rồi · {t} giây":
      "Found it · {t}s",
    "Chưa ra · {t} giây":
      "Not this time · {t}s",
    "Nhặt nhầm": "Picked by mistake",
    "Trái nghĩa của từ này": "Antonyms of this word",
    "Cùng nghĩa của từ này": "Synonyms of this word",
    "Thiếu từ": "No word given",
    "Đã chép câu hỏi — sang Gemini bấm {phim} rồi Enter.":
      "Question copied — over in Gemini, press {phim} then Enter.",
    "Đã chép câu hỏi — sang Gemini, chạm giữ vào ô chat rồi chọn Dán.":
      "Question copied — over in Gemini, long-press the chat box and choose Paste.",
    "Không chép được câu hỏi vào bộ nhớ tạm — bấm lại một lần nữa.":
      "Could not copy the question to the clipboard — tap the button once more.",

    /* --- hỏi Gemini (xem hoi-gemini.js) --- */
    "chữ Hán": "kanji",
    "câu": "sentence",
    "từ": "word",
    "Tôi đang học từ vựng ({huong}) bằng app RaKuLanG.":
      "I'm learning vocabulary ({huong}) with the RaKuLanG app.",
    "Tôi đang học từ vựng bằng app RaKuLanG.": "I'm learning vocabulary with the RaKuLanG app.",
    "Tôi muốn hiểu cho đúng {loai} dưới đây, TRONG ĐÚNG NGỮ CẢNH tôi đã gặp nó.":
      "I want to understand the {loai} below correctly, IN THE EXACT CONTEXT where I met it.",
    "{Loai} cần hỏi: {tu}": "{Loai} in question: {tu}",
    "Cách đọc: {doc}": "Reading: {doc}",
    "(app suy ra từ phiên âm, có thể chưa chuẩn)":
      "(inferred by the app from the romanisation; may not be exact)",
    "Âm Hán Việt: {am}": "Sino-Vietnamese reading: {am}",
    "Câu tôi bôi đen lúc lưu:": "The sentence I highlighted when I saved it:",
    "Câu ví dụ app đã lưu để luyện nghe:": "The example sentence the app saved for listening practice:",
    "(bản dịch đang có: {dich})": "(translation on file: {dich})",
    "--- NGỮ CẢNH TÔI ĐÃ GẶP ---": "--- THE CONTEXT I MET IT IN ---",
    "Nghĩa đang có trong sổ: {nghia}": "Meaning currently in my notebook: {nghia}",
    "(nghĩa trên do CHÍNH TÔI sửa lại; bản máy dịch ban đầu là: {goc})":
      "(I edited that meaning MYSELF; the original machine translation was: {goc})",
    "(nghĩa trên do CHÍNH TÔI sửa lại, không phải bản máy dịch)":
      "(I edited that meaning MYSELF; it is not the machine translation)",
    "Ghi chú tôi tự viết: {gc}": "My own note: {gc}",
    "Đồng nghĩa tôi đã lưu: {ds}": "Synonyms I saved: {ds}",
    "Trái nghĩa tôi đã lưu: {ds}": "Antonyms I saved: {ds}",
    "Chữ Hán: {meta}": "Kanji: {meta}",
    "Định nghĩa tiếng Anh app đã lưu: {ds}": "English definitions the app saved: {ds}",
    "Nằm trong sổ con: {so}": "Filed in deck: {so}",
    "Mức thuộc hiện tại của tôi: {d}/100 — {ten}": "How well I know it right now: {d}/100 — {ten}",
    "YouTube · phút {t}{kenh} — {ten} ({url})": "YouTube · at {t}{kenh} — {ten} ({url})",
    "(không có tên)": "(untitled)",
    "Tôi lưu nó từ: {nguon}": "I saved it from: {nguon}",
    "--- TÔI ĐÃ LƯU SẴN NHỮNG THỨ NÀY ---": "--- WHAT I ALREADY HAVE ON FILE ---",
    "--- HÃY TRẢ LỜI BẰNG TIẾNG VIỆT ---": "--- PLEASE ANSWER IN ENGLISH ---",
    "1. Trong ĐÚNG câu ngữ cảnh ở trên, {loai} này nghĩa là gì? Dịch cả câu, và nói rõ nó đóng vai trò gì trong câu.":
      "1. In THAT EXACT sentence above, what does this {loai} mean? Translate the whole sentence and say what role it plays in it.",
    "2. Nghĩa tôi đang lưu có khớp với ngữ cảnh đó không? Lệch chỗ nào thì nói thẳng.":
      "2. Does the meaning I have on file fit that context? If it is off, say so plainly.",
    "(Tôi CHƯA lưu được câu ngữ cảnh nào cho {loai} này — đừng đoán là tôi đã gặp nó ở đâu.)":
      "(I have NOT saved any context sentence for this {loai} — do not guess where I met it.)",
    "1. {Loai} này nghĩa là gì, và nó hay xuất hiện trong kiểu ngữ cảnh nào? Cho một câu điển hình có dịch.":
      "1. What does this {Loai} mean, and what kind of context does it usually appear in? Give one typical sentence with a translation.",
    "2. Nghĩa tôi đang lưu có sát không? Lệch chỗ nào thì nói thẳng.":
      "2. Is the meaning I have on file close enough? If it is off, say so plainly.",
    "3. Sắc thái và mức trang trọng: lúc nào dùng được, lúc nào KHÔNG nên dùng.":
      "3. Nuance and register: when it works, and when it should NOT be used.",
    "4. Phân biệt với những từ tôi đã lưu ở trên — mỗi từ một câu ngắn, chỉ ra chỗ khác nhau thật sự.":
      "4. Tell it apart from the words I saved above — one short line each, naming the real difference.",
    "4. Những {loai} nào gần nghĩa mà hay bị dùng nhầm chỗ? Phân biệt giúp tôi.":
      "4. Which near-synonym {loai}s get misused in its place? Tell them apart for me.",
    "5. Hai ví dụ khác cùng sắc thái, có dịch.": "5. Two more examples with the same nuance, translated.",
    "6. Một mẹo ngắn để tôi nhớ được lâu.": "6. One short trick to help me remember it.",
    "Trả lời gọn. Đừng chép lại những gì tôi vừa đưa.":
      "Keep it tight. Do not repeat back what I just gave you.",
    "Hỏi Gemini": "Ask Gemini",
    "Hỏi Gemini về từ này — link đoạn chat sẽ lưu vào mục trong sổ tay": "Ask Gemini about this word — the chat link is saved to its notebook entry",
    "Hỏi Gemini về từ này (lưu vào sổ trước thì link đoạn chat mới được giữ lại)": "Ask Gemini about this word (save it first to keep the chat link)",
    "Hỏi Gemini về từ này kèm ngữ cảnh đã lưu": "Ask Gemini about this word, with the context you saved",

    /* --- khung chung --- */
    "Sổ tay RaKuLanG": "RaKuLanG Notebook",
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
    "Bôi đen đoạn dài thì dịch cả đoạn bằng Google Dịch": "Translate a long selection as a whole with Google Translate",
    "Dùng gói thuật ngữ chuyên ngành (IT) trước Google Dịch": "Use the specialist glossary (IT) before Google Translate",
    "Dùng gói thuật ngữ chuyên ngành (Y) trước Google Dịch": "Use the specialist glossary (Medical) before Google Translate",
    "Dùng gói thuật ngữ chuyên ngành (Điện) trước Google Dịch": "Use the specialist glossary (Electrical) before Google Translate",
    "Đoạn này dài quá để tra như một từ — hãy bôi đen riêng từ cần tra.": "This passage is too long to look up as a word — select the single word you need.",
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
    "Sửa mục này": "Edit this entry",
    "Sửa nghĩa, câu ví dụ, ghi chú, ảnh và nguồn — tất cả ở một chỗ.": "Edit the meaning, example sentence, note, images and source — all in one place.",
    "Câu ví dụ": "Example sentence",
    "— câu chứa từ này ở nơi bạn gặp": "— the sentence where you met this word",
    "Để trống = không dùng ví dụ nào": "Leave empty = no example",
    "Bản dịch của câu ví dụ": "Translation of the example",
    "Nghĩa tiếng Việt của cả câu": "Vietnamese meaning of the whole sentence",
    "Câu này có vẻ còn lẫn tiếng Việt mà app không tự lọc được — sửa lại cho đúng nhé.": "This sentence still seems to contain Vietnamese the app could not filter out — please fix it.",
    "Đây là câu bạn đã tự sửa; app sẽ không ghi đè lên nó.": "You edited this sentence yourself; the app will not overwrite it.",
    "Sửa nghĩa, câu ví dụ, ghi chú": "Edit meaning, example, note",
    "Ví dụ có vẻ lẫn tiếng Việt — bấm để sửa": "The example seems to contain Vietnamese — tap to fix",
    "Đã lưu thay đổi": "Changes saved",
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
    "RaKuLanG": "RaKuLanG",
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
    "Dùng MỘT kho chung cho mọi ngôn ngữ (khuyên dùng — thêm tiếng mới sau này khỏi dựng thêm cloud)": "Use ONE shared store for every language (recommended — adding a language later needs no new cloud)",
    "URL Web App dùng chung (…/exec)": "Shared Web App URL (…/exec)",
    "Mã bí mật dùng chung": "Shared secret",
    "Gộp dữ liệu từ hai cloud cũ về kho chung": "Merge the two old clouds into the shared store",
    "Đang dùng kho chung — ô này tạm nghỉ": "Shared store is on — this field is paused",
    "Hãy điền URL kho chung trước đã.": "Fill in the shared store URL first.",
    "Đang gộp…": "Merging…",
    "Xong — kho chung giờ có {n} mục.": "Done — the shared store now holds {n} items.",
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
    "Google đang tạm chặn dịch vì quá nhiều lượt, mà máy chủ dự phòng cũng chưa trả về được. Hãy thử lại sau ít phút.":
      "Google is temporarily throttling translation (too many requests) and the fallback server didn't return anything. Try again in a few minutes.",
    "Google đang tạm chặn dịch vì quá nhiều lượt. Thử lại sau ít phút, hoặc cấu hình đồng bộ để dùng máy chủ dự phòng.":
      "Google is temporarily throttling translation (too many requests). Try again in a few minutes, or set up sync to use a fallback server.",
    "Vùng (region), vd: southeastasia — bỏ trống nếu key Global": "Region, e.g. southeastasia — leave empty for a Global key",
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
    "RaKuLanG: không tìm thấy vị trí của mục này trên trang (nội dung có thể đã thay đổi).":
      "RaKuLanG: could not find this entry on the page (the content may have changed).",
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
    "RaKuLanG · Lời thoại":
      "RaKuLanG · Transcript",
    "Hiện phụ đề & dịch": "Show transcript & translate",
    "Để tiết kiệm, bảng chỉ lấy phụ đề và gọi dịch khi bạn bấm.":
      "To save quota, the panel only fetches the transcript and translates when you tap.",
    "Chế độ học: lật thẻ xong thì chạy nhịp đọc — từng cụm trong câu lần lượt to lên và đổi màu, lặp lại":
      "Study mode: after flipping a card, run the reading rhythm — each chunk of the sentence grows and changes colour in turn, on a loop",
    "Nhịp đọc & nhắc tập trung": "Reading rhythm & focus reminder",
    "Nhắc tập trung bằng loa, kể từ lúc mở app": "Spoken focus reminder, counted from when the app opens",
    "Đã lưu.": "Saved.",
    "Chấm bài xong thì có tiếng cổ vũ — 「すごいね」 khi nhớ, 「がんばって」 khi quên, kèm một tiếng chuông ngắn":
      "A cheer after each grade — 「すごいね」 for remembered, 「がんばって」 for forgotten, plus a short chime",
    "Nhạc ga tàu tuyến Yamanote trong lúc học — vang lên thưa thớt, không theo chu kỳ nào":
      "Yamanote-line station jingles while you study — they come up sparsely, on no fixed cycle",
    "Nghe thử một đoạn": "Play one now",
    "Đang phát: nhạc ga {ten}": "Now playing: {ten} station jingle",
    "Bấm nút thì có tiếng tách nhẹ, như các app Android":
      "A soft click when you tap a button, the way Android apps do",
    "Nghe câu": "Play the sentence",
    "Tốc độ ×{t} — nhanh dần theo cấp": "Speed ×{t} — faster as the level rises",
    "Xong": "Done",
    "Phím tắt": "Shortcuts",
    "lật thẻ · rồi mở nguồn": "flip the card · then open the source",
    "thẻ trước (huỷ lượt chấm)": "previous card (undo that grade)",
    "để dành, xem sau": "set aside for later",
    "xoá mục": "delete the item",
    "Ẩn": "Hide",
    "Không còn thẻ nào để quay lại": "No card left to go back to",
    "Đã lấy lại thẻ trước và huỷ lượt chấm": "Previous card restored, that grade undone",
    "Mở nguồn trong chế độ học thì chia đôi màn hình: sổ tay bên trái, trang gốc bên phải": "In study mode, open the source side by side: notebook on the left, source page on the right",
    "Chỉ còn mỗi thẻ này thôi": "This is the only card left",
    "Thu nhỏ khung video YouTube để bảng lời thoại rộng ra (xem để học thì mắt ở lời thoại, không ở hình)":
      "Shrink the YouTube player so the transcript panel gets wider (when you watch to learn, your eyes are on the words, not the picture)",
    "px — bề ngang tối đa của khung video":
      "px — maximum width of the player",
    "Tốc độ nhịp đọc": "Reading rhythm speed",
    "mili-giây mỗi cụm (nhỏ hơn là chạy nhanh hơn)": "milliseconds per chunk (smaller is faster)",
    "Nhắc tập trung bằng loa, kể từ lúc mở sổ tay": "Spoken focus reminder, counted from when the notebook opens",
    "phút một lần — 0 là tắt": "minutes apart — 0 turns it off",
    "Tới hẹn máy đọc to 「集中します」 khi đang học tiếng Nhật, \"Concentrate please\" khi đang học tiếng Anh.":
      "At each interval the device says 「集中します」 while you study Japanese, \"Concentrate please\" while you study English.",
    "Ẩn cho video này": "Hide for this video",
    "Tự bật bảng lời thoại khi mở video YouTube (tắt để tiết kiệm: video mới chỉ hiện nút, bấm mới lấy phụ đề và dịch)":
      "Auto-open the transcript panel when a YouTube video loads (off saves quota: a new video only shows a button; tap it to fetch the transcript and translate)",
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
    "Không lưu được bản thu — có lẽ máy đã hết chỗ.":
      "Could not save the recording — the device may be out of space.",
    "Luyện nói":
      "Speaking practice",
    "Tên bài nói":
      "Title",
    "Ví dụ: Giới thiệu bản thân, Báo cáo sự cố…":
      "e.g. Introducing myself, Reporting a fault…",
    "(chưa đặt tên)":
      "(untitled)",
    "Đổi tên bài nói":
      "Rename this passage",
    "Sửa đoạn này — bản kia sẽ tự dịch lại theo":
      "Edit this side — the other one is re-translated to match",
    "Đã lưu, nhưng chưa dịch lại được bản kia — kiểm tra mạng.":
      "Saved, but the other side could not be re-translated — check your connection.",
    "Nghe lại — bản thu này thu TRƯỚC lần sửa, chữ đã khác":
      "Play back — this take predates your edit, so the text has changed",
    "Nói":
      "Speak",
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
    "Máy chặn micro. Hãy vào phần Quyền của ứng dụng và bật Micro. Nếu đã bật rồi mà vẫn hỏng thì bản cài này thiếu khai quyền — cần cài lại bản mới.":
      "The device blocked the microphone. Open the app's Permissions and turn Microphone on. If it is already on and this still fails, this build is missing a permission declaration — reinstall the newer build.",
    "Không thấy micro nào trên máy.":
      "No microphone found on this device.",
    "Không mở được ảnh này.":
      "Couldn't open this image.",
    "Chạm vào ảnh để phóng to · chạm ra ngoài để đóng":
      "Tap the image to zoom · tap outside to close",
    "Micro đang bị ứng dụng khác giữ. Hãy tắt app gọi hoặc ghi âm khác rồi thử lại.":
      "Another app is holding the microphone. Close any call or recording app and try again.",
    "Trang này không được phép dùng micro.":
      "This page is not allowed to use the microphone.",
    "Micro của máy không đáp ứng được yêu cầu thu.":
      "This device's microphone can't meet the recording requirements.",
    "Không mở được micro.":
      "Couldn't open the microphone.",
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
    "Cùng nghĩa":
      "Synonyms",
    "Trái nghĩa":
      "Antonyms",
    "Có trong sổ tay — bấm để xem":
      "In your notebook — tap to view",
    "Chưa có trong sổ — bấm để tra":
      "Not saved yet — tap to look up",
    "mai":
      "tomorrow",
    "còn {n} ngày":
      "in {n} days",
    "còn ~{n} tháng":
      "in ~{n} months",

    /* --- thang 100 điểm --- */
    "Nhìn chữ → nghĩa": "Sight → meaning",
    "Nghe câu → nghĩa": "Listening → meaning",
    "Nhặt từ đồng nghĩa": "Pick the synonyms",
    "Nhặt từ trái nghĩa": "Pick the antonyms",
    "Mới gặp": "Just met",
    "Thuộc mặt chữ": "Knows it by sight",
    "Nghe ra": "Hears it",
    "Gọi ra được lúc cần": "Recalls it when needed",
    "mắt": "sight",
    "tai": "hearing",
    "mạng nghĩa": "meaning network",
    "chưa có câu nguồn": "no source sentence yet",
    "chưa tìm được từ đồng nghĩa": "no synonyms found yet",
    "chưa tìm được từ trái nghĩa": "no antonyms found yet",
    "chưa có dữ liệu": "no data yet",
    "chưa mở": "not unlocked yet",
    "Bấm để ôn các bài còn lại.": "Click to review the remaining exercises.",
    "Chưa đo được: {ds}": "Not measured: {ds}",
    "Chưa đo được: {ds} — nhãn ở trên chỉ nói tới phần đã đo.":
      "Not measured: {ds} — the label above only covers what was measured.",
    "Ôn bài còn lại": "Review the rest",
    "Ôn {n} bài còn lại": "Review the {n} remaining",
    "Chưa bài nào tới hạn": "Nothing due yet",
    "Điểm {d} trên 100, mức {b}. Bấm để ôn các bài còn lại.":
      "Score {d} out of 100, level {b}. Click to review the remaining exercises.",
    "{t} giờ được {d}/100 · {b}": "{t} is now {d}/100 · {b}",
    "Đã ôn {n} bài": "Reviewed {n} exercises",
    "Xong rồi!": "All done!",
    "Cùng cụm:": "Same cluster:",
    "cùng cụm với {t}": "same cluster as {t}",
    "Ôn kèm cùng nhau; điểm thì mỗi từ giữ riêng.":
      "Reviewed together; each word keeps its own score.",
    "Chế độ học: một từ tới hạn thì ôn kèm luôn những từ đồng nghĩa / trái nghĩa của nó đã lưu trong sổ, xếp liền nhau — để luyện phân biệt giữa mấy từ gần nhau":
      "Study mode: when a word comes due, also review the synonyms / antonyms of it you have saved, one right after another — to practise telling close words apart",
    "Nhớ thì lên một cấp và lần ôn sau xa hơn; quên thì về lại đầu.":
      "Remember it and it moves up a level with a longer gap; forget it and it drops back to the start.",

    /* --- về tác giả --- */
    "Ra đời bởi": "Made by",
    "RaKuLanG · Về tác giả": "RaKuLanG · About the author",
    "Một món quà nhỏ gửi tặng cộng đồng học tập": "A small gift to the learning community",
    "Cảm ơn ♥": "Thank you ♥",
    "“Cho đi là còn mãi.”": "“What you give away is what stays.”"
  };

  const ja = {

    /* --- luyện ngữ pháp --- */
    "Câu gốc": "元の文",
    "Bản dịch tiếng Việt": "ベトナム語訳",
    "Đang dịch câu gốc…": "元の文を翻訳中…",
    "Chưa dịch được câu này.": "この文を翻訳できませんでした。",
    "Đây là đáp án.": "正解はこちらです。",
    "Luyện ngữ pháp": "文法練習",
    "Ngữ pháp": "文法",
    "Ghép các mảnh bị xáo trộn thành câu tiếng Nhật gốc chứa từ bạn đã lưu. Mỗi câu có tối đa 4 mảnh; kết quả không ảnh hưởng SRS.": "順番を入れ替えた語句を並べ、保存した単語を含む元の日本語文を作りましょう。1文は最大4つの部分に分かれます。結果はSRSに影響しません。",
    "Bắt đầu luyện": "練習を始める",
    "Luyện lại": "もう一度練習",
    "Câu của bạn": "組み立てた文",
    "Các mảnh bị xáo trộn": "並べ替える部分",
    "Xem câu gốc": "元の文を見る",
    "Đã ghép đúng {dung}/{tong} câu.": "{tong}文中{dung}文を正しく並べました。",
    "Chạm từng mảnh để ghép câu gốc.": "部分をタップして元の文を作りましょう。",
    "Câu {i}/{n} · {m} mảnh": "{i}/{n}問 · {m}部分",
    "Từ đã lưu: {tu}": "保存した単語: {tu}",
    "Nghĩa: {nghia}": "意味: {nghia}",
    "Ghép lại câu đã lưu": "保存した文を並べ替える",
    "Bỏ mảnh khỏi câu": "文からこの部分を外す",
    "Đưa mảnh vào câu": "この部分を文に入れる",
    "Chạm các mảnh bên dưới theo đúng thứ tự": "下の部分を正しい順番でタップしてください",
    "Chưa đúng. Chạm mảnh trong câu để đổi chỗ rồi thử lại.": "まだ違います。文中の部分をタップして戻し、もう一度試してください。",
    "Đúng rồi!": "正解！",
    "Câu gốc: {cau}": "元の文: {cau}",
    "Chuyển sang Nhật – Việt để luyện ngữ pháp.": "文法練習には日越辞書に切り替えてください。",
    "Có {n} câu từ sổ tay để luyện.": "ノートに練習できる文が{n}文あります。",
    "Chưa có câu tiếng Nhật đủ ngữ cảnh. Hãy lưu từ trong một câu trọn vẹn hoặc lưu câu từ video.": "練習できる日本語の文がまだありません。文の中の単語か、動画の文を保存してください。",
    "Không đọc được sổ tay. Hãy thử mở lại mục này.": "ノートを読み込めませんでした。この画面を開き直してください。",

    /* --- đóng băng từ, và tắt bài mạng nghĩa --- */
    "Đóng băng": "凍結",
    "Đang đóng băng": "凍結中",
    "Tắt mạng nghĩa": "類義問題をオフ",
    "Mạng nghĩa đã tắt": "類義問題はオフ",
    "Từ này đang đóng băng": "この語は凍結中です",
    "Đóng băng — rút từ này khỏi chế độ học, điểm giữ nguyên":
      "凍結 — この語を学習から外します。スコアはそのままです",
    "Đang đóng băng — bấm để đưa lại vào vòng ôn, từ sẽ tới hạn ngay":
      "凍結中 — タップで復習に戻します。すぐに出題されます",
    "Tắt bài đồng/trái nghĩa cho từ này — danh sách liên kết vẫn giữ nguyên":
      "この語の類義語・対義語問題をオフにします — リンクはそのままです",
    "Bài đồng/trái nghĩa đang tắt — bấm để bật lại":
      "類義語・対義語問題はオフです — タップでオンに戻します",
    "Bài đồng/trái nghĩa đang tắt cho từ này — các từ vẫn dùng cho từ khác.":
      "この語の類義語・対義語問題はオフです — リンクは他の語では使われます。",
    "Mạng nghĩa: bạn đã tắt cho từ này.": "類義ネットワーク：この語ではオフにしています。",
    "Mạng nghĩa: bạn đã tắt cho từ này — nhãn ở trên không tính phần đó.":
      "類義ネットワーク：この語ではオフです — 上の表示には含まれません。",
    "Gỡ băng tất cả ({n})": "すべて解除（{n}）",
    "Bật lại mạng nghĩa ({n})": "類義問題をオンに戻す（{n}）",
    "Đã gỡ băng {n} từ — chúng tới hạn ngay từ buổi học tới":
      "{n} 語の凍結を解除しました — 次の学習から出題されます",
    "Đã đóng băng lại {n} từ": "{n} 語を凍結し直しました",
    "Đã tắt bài đồng/trái nghĩa cho {n} từ":
      "{n} 語の類義語・対義語問題をオフにしました",
    "Đã bật lại bài đồng/trái nghĩa cho {n} từ":
      "{n} 語の類義語・対義語問題をオンに戻しました",

    /* --- bỏ một từ khỏi liên kết --- */
    "Bỏ “{tu}” khỏi liên kết — sẽ không ra trong bài kiểm tra nữa":
      "「{tu}」をリンクから外す — 以降の問題に出なくなります",
    "Đã bỏ “{tu}” khỏi liên kết":
      "「{tu}」をリンクから外しました",
    "Đã nhận lại “{tu}”":
      "「{tu}」を戻しました",
    "Bỏ “{tu}” khỏi liên kết của “{goc}”":
      "「{tu}」を「{goc}」のリンクから外す",
    "Nhận lại “{tu}” vào liên kết":
      "「{tu}」をリンクに戻す",

    /* --- link đoạn chat Gemini --- */
    "Mở": "開く",
    "Không đọc được bộ nhớ tạm": "クリップボードを読み取れませんでした",
    "Bộ nhớ tạm không phải link đoạn chat Gemini": "クリップボードの内容は Gemini のチャットリンクではありません",
    "Đã lưu link đoạn chat vào ghi chú": "チャットのリンクをメモに保存しました",

    /* --- màn kết quả bài liên kết --- */
    "+ Lưu": "＋保存",
    "Đã có": "保存済み",
    "Không lưu được từ này": "この語を保存できませんでした",
    "Tiếp": "次へ",
    "Đáp án": "正解",
    "Mấy từ này CÙNG NGHĨA với từ nào?":
      "これらはどの語の類義語ですか？",
    "Mấy từ này TRÁI NGHĨA với từ nào?":
      "これらはどの語の対義語ですか？",
    "Từ khác trong sổ":
      "単語帳の他の語",
    "Cùng nghĩa với nó":
      "その類義語",
    "Trái nghĩa với nó":
      "その対義語",
    "Tìm ra rồi · {t} giây":
      "正解 · {t}秒",
    "Chưa ra · {t} giây":
      "不正解 · {t}秒",
    "Nhặt nhầm": "誤って選んだ語",
    "Trái nghĩa của từ này": "この語の対義語",
    "Cùng nghĩa của từ này": "この語の類義語",
    "Thiếu từ": "語が指定されていません",
    "Đã chép câu hỏi — sang Gemini bấm {phim} rồi Enter.":
      "質問をコピーしました — Gemini で {phim} を押して Enter。",
    "Đã chép câu hỏi — sang Gemini, chạm giữ vào ô chat rồi chọn Dán.":
      "質問をコピーしました — Gemini の入力欄を長押しして「貼り付け」を選んでください。",
    "Không chép được câu hỏi vào bộ nhớ tạm — bấm lại một lần nữa.":
      "質問をクリップボードにコピーできませんでした — もう一度押してください。",

    /* --- hỏi Gemini (xem hoi-gemini.js) --- */
    "chữ Hán": "漢字",
    "câu": "文",
    "từ": "単語",
    "Tôi đang học từ vựng ({huong}) bằng app RaKuLanG.": "RaKuLanG で単語（{huong}）を勉強しています。",
    "Tôi đang học từ vựng bằng app RaKuLanG.": "RaKuLanG で単語を勉強しています。",
    "Tôi muốn hiểu cho đúng {loai} dưới đây, TRONG ĐÚNG NGỮ CẢNH tôi đã gặp nó.":
      "下の{loai}を、私が実際に出会った文脈のままで正しく理解したいです。",
    "{Loai} cần hỏi: {tu}": "対象の{Loai}: {tu}",
    "Cách đọc: {doc}": "読み: {doc}",
    "(app suy ra từ phiên âm, có thể chưa chuẩn)": "（アプリがローマ字から推定した読み。正確でない可能性あり）",
    "Âm Hán Việt: {am}": "漢越音: {am}",
    "Câu tôi bôi đen lúc lưu:": "保存したときに選択した文:",
    "Câu ví dụ app đã lưu để luyện nghe:": "リスニング練習用にアプリが保存した例文:",
    "(bản dịch đang có: {dich})": "（保存されている訳: {dich}）",
    "--- NGỮ CẢNH TÔI ĐÃ GẶP ---": "--- 私が出会った文脈 ---",
    "Nghĩa đang có trong sổ: {nghia}": "手帳にある意味: {nghia}",
    "(nghĩa trên do CHÍNH TÔI sửa lại; bản máy dịch ban đầu là: {goc})": "（上の意味は私自身が直したものです。元の機械翻訳は: {goc}）",
    "(nghĩa trên do CHÍNH TÔI sửa lại, không phải bản máy dịch)": "（上の意味は私自身が直したもので、機械翻訳ではありません）",
    "Ghi chú tôi tự viết: {gc}": "自分で書いたメモ: {gc}",
    "Đồng nghĩa tôi đã lưu: {ds}": "保存した類義語: {ds}",
    "Trái nghĩa tôi đã lưu: {ds}": "保存した対義語: {ds}",
    "Chữ Hán: {meta}": "漢字: {meta}",
    "Định nghĩa tiếng Anh app đã lưu: {ds}": "アプリが保存した英語の定義: {ds}",
    "Nằm trong sổ con: {so}": "所属デッキ: {so}",
    "Mức thuộc hiện tại của tôi: {d}/100 — {ten}": "現在の習得度: {d}/100 — {ten}",
    "YouTube · phút {t}{kenh} — {ten} ({url})": "YouTube · {t}{kenh} — {ten}（{url}）",
    "(không có tên)": "（タイトルなし）",
    "Tôi lưu nó từ: {nguon}": "保存元: {nguon}",
    "--- TÔI ĐÃ LƯU SẴN NHỮNG THỨ NÀY ---": "--- すでに保存してある情報 ---",
    "--- HÃY TRẢ LỜI BẰNG TIẾNG VIỆT ---": "--- 日本語で答えてください ---",
    "1. Trong ĐÚNG câu ngữ cảnh ở trên, {loai} này nghĩa là gì? Dịch cả câu, và nói rõ nó đóng vai trò gì trong câu.":
      "1. 上のその文の中で、この{loai}はどういう意味ですか。文全体を訳し、文中での役割も説明してください。",
    "2. Nghĩa tôi đang lưu có khớp với ngữ cảnh đó không? Lệch chỗ nào thì nói thẳng.":
      "2. 手帳にある意味はその文脈に合っていますか。ずれているならはっきり指摘してください。",
    "(Tôi CHƯA lưu được câu ngữ cảnh nào cho {loai} này — đừng đoán là tôi đã gặp nó ở đâu.)":
      "（この{loai}には文脈の文を保存できていません。どこで出会ったかを推測しないでください。）",
    "1. {Loai} này nghĩa là gì, và nó hay xuất hiện trong kiểu ngữ cảnh nào? Cho một câu điển hình có dịch.":
      "1. この{Loai}はどういう意味で、どんな文脈でよく使われますか。訳つきの典型的な例文を一つください。",
    "2. Nghĩa tôi đang lưu có sát không? Lệch chỗ nào thì nói thẳng.":
      "2. 手帳にある意味は妥当ですか。ずれているならはっきり指摘してください。",
    "3. Sắc thái và mức trang trọng: lúc nào dùng được, lúc nào KHÔNG nên dùng.":
      "3. ニュアンスと丁寧さ: どんなときに使えて、どんなときに使うべきでないか。",
    "4. Phân biệt với những từ tôi đã lưu ở trên — mỗi từ một câu ngắn, chỉ ra chỗ khác nhau thật sự.":
      "4. 上に保存した語との違い — 一語につき一行で、実際の違いを挙げてください。",
    "4. Những {loai} nào gần nghĩa mà hay bị dùng nhầm chỗ? Phân biệt giúp tôi.":
      "4. 意味が近くて取り違えやすい{loai}はどれですか。使い分けを教えてください。",
    "5. Hai ví dụ khác cùng sắc thái, có dịch.": "5. 同じニュアンスの例文を訳つきで二つ。",
    "6. Một mẹo ngắn để tôi nhớ được lâu.": "6. 長く覚えておくための短いコツを一つ。",
    "Trả lời gọn. Đừng chép lại những gì tôi vừa đưa.": "簡潔に。今渡した情報をそのまま繰り返さないでください。",
    "Hỏi Gemini": "Gemini に聞く",
    "Hỏi Gemini về từ này — link đoạn chat sẽ lưu vào mục trong sổ tay": "この語について Gemini に聞く — チャットのリンクはノートの項目に保存されます",
    "Hỏi Gemini về từ này (lưu vào sổ trước thì link đoạn chat mới được giữ lại)": "この語について Gemini に聞く(先に保存するとチャットのリンクが残ります)",
    "Hỏi Gemini về từ này kèm ngữ cảnh đã lưu": "保存した文脈つきで、この語について Gemini に聞く",

    /* --- khung chung --- */
    "Sổ tay RaKuLanG": "RaKuLanG 単語帳",
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
    "Bôi đen đoạn dài thì dịch cả đoạn bằng Google Dịch": "長い範囲を選択したら Google 翻訳で全体を訳す",
    "Dùng gói thuật ngữ chuyên ngành (IT) trước Google Dịch": "Google 翻訳より先に専門用語集(IT)を使う",
    "Dùng gói thuật ngữ chuyên ngành (Y) trước Google Dịch": "Google 翻訳より先に専門用語集(医療)を使う",
    "Dùng gói thuật ngữ chuyên ngành (Điện) trước Google Dịch": "Google 翻訳より先に専門用語集(電気)を使う",
    "Đoạn này dài quá để tra như một từ — hãy bôi đen riêng từ cần tra.": "長すぎて1語として検索できません。調べたい語だけを選択してください。",
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
    "Sửa mục này": "この項目を編集",
    "Sửa nghĩa, câu ví dụ, ghi chú, ảnh và nguồn — tất cả ở một chỗ.": "意味・例文・メモ・画像・出典をまとめて編集できます。",
    "Câu ví dụ": "例文",
    "— câu chứa từ này ở nơi bạn gặp": "— この語に出会った文",
    "Để trống = không dùng ví dụ nào": "空欄 = 例文を使わない",
    "Bản dịch của câu ví dụ": "例文の訳",
    "Nghĩa tiếng Việt của cả câu": "文全体のベトナム語訳",
    "Câu này có vẻ còn lẫn tiếng Việt mà app không tự lọc được — sửa lại cho đúng nhé.": "この文にはベトナム語が混ざっているようですが、自動で除けませんでした。修正してください。",
    "Đây là câu bạn đã tự sửa; app sẽ không ghi đè lên nó.": "ご自身で修正した文です。アプリは上書きしません。",
    "Sửa nghĩa, câu ví dụ, ghi chú": "意味・例文・メモを編集",
    "Ví dụ có vẻ lẫn tiếng Việt — bấm để sửa": "例文にベトナム語が混ざっているようです — タップして修正",
    "Đã lưu thay đổi": "変更を保存しました",
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
    "RaKuLanG": "RaKuLanG",
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
    "Dùng MỘT kho chung cho mọi ngôn ngữ (khuyên dùng — thêm tiếng mới sau này khỏi dựng thêm cloud)": "すべての言語で共通のストアを1つ使う（推奨 — 後で言語を追加してもクラウドを増やさずに済みます）",
    "URL Web App dùng chung (…/exec)": "共通の Web App URL（…/exec）",
    "Mã bí mật dùng chung": "共通の秘密キー",
    "Gộp dữ liệu từ hai cloud cũ về kho chung": "既存の2つのクラウドを共通ストアに統合",
    "Đang dùng kho chung — ô này tạm nghỉ": "共通ストアを使用中 — この欄は休止します",
    "Hãy điền URL kho chung trước đã.": "先に共通ストアの URL を入力してください。",
    "Đang gộp…": "統合中…",
    "Xong — kho chung giờ có {n} mục.": "完了 — 共通ストアに {n} 件あります。",
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
    "Google đang tạm chặn dịch vì quá nhiều lượt, mà máy chủ dự phòng cũng chưa trả về được. Hãy thử lại sau ít phút.":
      "Google が翻訳を一時的に制限しています（回数が多すぎます）。予備サーバーも応答しませんでした。数分後にもう一度お試しください。",
    "Google đang tạm chặn dịch vì quá nhiều lượt. Thử lại sau ít phút, hoặc cấu hình đồng bộ để dùng máy chủ dự phòng.":
      "Google が翻訳を一時的に制限しています（回数が多すぎます）。数分後に再試行するか、同期を設定して予備サーバーをご利用ください。",
    "Vùng (region), vd: southeastasia — bỏ trống nếu key Global": "リージョン（例: southeastasia）— Global キーなら空欄",
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
    "RaKuLanG: không tìm thấy vị trí của mục này trên trang (nội dung có thể đã thay đổi).":
      "RaKuLanG：この項目の位置がページ上で見つかりません（内容が変わった可能性があります）。",
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
    "RaKuLanG · Lời thoại":
      "RaKuLanG · 文字起こし",
    "Hiện phụ đề & dịch": "文字起こしを表示して翻訳",
    "Để tiết kiệm, bảng chỉ lấy phụ đề và gọi dịch khi bạn bấm.":
      "節約のため、タップしたときだけ字幕を取得して翻訳します。",
    "Chế độ học: lật thẻ xong thì chạy nhịp đọc — từng cụm trong câu lần lượt to lên và đổi màu, lặp lại":
      "学習モード：カードをめくったら読みのリズムを再生——文の各まとまりが順に大きくなり色が変わり、繰り返します",
    "Nhịp đọc & nhắc tập trung": "読みのリズムと集中リマインド",
    "Nhắc tập trung bằng loa, kể từ lúc mở app": "音声での集中リマインド（アプリを開いた時点から）",
    "Đã lưu.": "保存しました。",
    "Chấm bài xong thì có tiếng cổ vũ — 「すごいね」 khi nhớ, 「がんばって」 khi quên, kèm một tiếng chuông ngắn":
      "採点のあとに応援の声——覚えていたら「すごいね」、忘れていたら「がんばって」、短いチャイム付き",
    "Nhạc ga tàu tuyến Yamanote trong lúc học — vang lên thưa thớt, không theo chu kỳ nào":
      "学習中に山手線の発車メロディ——一定の周期ではなく、たまに鳴ります",
    "Nghe thử một đoạn": "1曲だけ試聴",
    "Đang phát: nhạc ga {ten}": "再生中：{ten}駅の発車メロディ",
    "Bấm nút thì có tiếng tách nhẹ, như các app Android":
      "ボタンを押すと軽いクリック音——Android アプリと同じ感じ",
    "Nghe câu": "文を聞く",
    "Tốc độ ×{t} — nhanh dần theo cấp": "速度 ×{t}——レベルが上がるほど速く",
    "Xong": "完了",
    "Phím tắt": "ショートカット",
    "lật thẻ · rồi mở nguồn": "カードをめくる・次に出典を開く",
    "thẻ trước (huỷ lượt chấm)": "前のカード（採点を取り消す）",
    "để dành, xem sau": "後回しにする",
    "xoá mục": "項目を削除",
    "Ẩn": "隠す",
    "Không còn thẻ nào để quay lại": "戻れるカードがありません",
    "Đã lấy lại thẻ trước và huỷ lượt chấm": "前のカードに戻り、採点を取り消しました",
    "Mở nguồn trong chế độ học thì chia đôi màn hình: sổ tay bên trái, trang gốc bên phải": "学習中は出典を左右に並べて開く：左にノート、右に元のページ",
    "Chỉ còn mỗi thẻ này thôi": "残っているのはこのカードだけです",
    "Thu nhỏ khung video YouTube để bảng lời thoại rộng ra (xem để học thì mắt ở lời thoại, không ở hình)":
      "字幕パネルを広くするため YouTube のプレーヤーを縮小（学習目的なら目は映像より字幕にある）",
    "px — bề ngang tối đa của khung video":
      "px——プレーヤーの最大幅",
    "Tốc độ nhịp đọc": "読みのリズムの速さ",
    "mili-giây mỗi cụm (nhỏ hơn là chạy nhanh hơn)": "1まとまりあたりのミリ秒（小さいほど速い）",
    "Nhắc tập trung bằng loa, kể từ lúc mở sổ tay": "音声での集中リマインド（ノートを開いた時点から）",
    "phút một lần — 0 là tắt": "分おき——0で停止",
    "Tới hẹn máy đọc to 「集中します」 khi đang học tiếng Nhật, \"Concentrate please\" khi đang học tiếng Anh.":
      "時間になると、日本語学習中は「集中します」、英語学習中は \"Concentrate please\" と読み上げます。",
    "Ẩn cho video này": "この動画では隠す",
    "Tự bật bảng lời thoại khi mở video YouTube (tắt để tiết kiệm: video mới chỉ hiện nút, bấm mới lấy phụ đề và dịch)":
      "YouTube 動画を開いたら文字起こしパネルを自動表示（オフで節約：新しい動画ではボタンのみ、タップで字幕取得と翻訳）",
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
    "Không lưu được bản thu — có lẽ máy đã hết chỗ.":
      "録音を保存できませんでした。空き容量が足りない可能性があります。",
    "Luyện nói":
      "スピーキング練習",
    "Tên bài nói":
      "タイトル",
    "Ví dụ: Giới thiệu bản thân, Báo cáo sự cố…":
      "例：自己紹介、故障の報告…",
    "(chưa đặt tên)":
      "（無題）",
    "Đổi tên bài nói":
      "タイトルを変更",
    "Sửa đoạn này — bản kia sẽ tự dịch lại theo":
      "こちらを編集 — 反対側は自動で訳し直します",
    "Đã lưu, nhưng chưa dịch lại được bản kia — kiểm tra mạng.":
      "保存しましたが、反対側を訳し直せませんでした。通信を確認してください。",
    "Nghe lại — bản thu này thu TRƯỚC lần sửa, chữ đã khác":
      "再生 — この録音は編集より前のもので、文章が変わっています",
    "Nói":
      "話す",
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
    "Máy chặn micro. Hãy vào phần Quyền của ứng dụng và bật Micro. Nếu đã bật rồi mà vẫn hỏng thì bản cài này thiếu khai quyền — cần cài lại bản mới.":
      "端末がマイクを拒否しました。アプリの「権限」からマイクをオンにしてください。すでにオンなのに直らない場合、このビルドは権限の宣言が抜けています — 新しいビルドを入れ直してください。",
    "Không thấy micro nào trên máy.":
      "この端末にマイクが見つかりません。",
    "Không mở được ảnh này.":
      "この画像を開けません。",
    "Chạm vào ảnh để phóng to · chạm ra ngoài để đóng":
      "画像をタップで拡大 · 外側をタップで閉じる",
    "Micro đang bị ứng dụng khác giữ. Hãy tắt app gọi hoặc ghi âm khác rồi thử lại.":
      "ほかのアプリがマイクを使用中です。通話や録音のアプリを終了してからお試しください。",
    "Trang này không được phép dùng micro.":
      "このページはマイクの使用を許可されていません。",
    "Micro của máy không đáp ứng được yêu cầu thu.":
      "この端末のマイクは録音の条件を満たせません。",
    "Không mở được micro.":
      "マイクを開けません。",
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
    "Cùng nghĩa":
      "類義語",
    "Trái nghĩa":
      "対義語",
    "Có trong sổ tay — bấm để xem":
      "単語帳にあります — タップで表示",
    "Chưa có trong sổ — bấm để tra":
      "未保存 — タップで検索",
    "mai":
      "明日",
    "còn {n} ngày":
      "あと {n} 日",
    "còn ~{n} tháng":
      "あと約 {n} か月",

    /* --- thang 100 điểm --- */
    "Nhìn chữ → nghĩa": "文字 → 意味",
    "Nghe câu → nghĩa": "音声 → 意味",
    "Nhặt từ đồng nghĩa": "類義語を選ぶ",
    "Nhặt từ trái nghĩa": "対義語を選ぶ",
    "Mới gặp": "出会ったばかり",
    "Thuộc mặt chữ": "字面で分かる",
    "Nghe ra": "聞き取れる",
    "Gọi ra được lúc cần": "必要なときに出てくる",
    "mắt": "目",
    "tai": "耳",
    "mạng nghĩa": "意味のつながり",
    "chưa có câu nguồn": "元の文がまだありません",
    "chưa tìm được từ đồng nghĩa": "類義語がまだ見つかりません",
    "chưa tìm được từ trái nghĩa": "対義語がまだ見つかりません",
    "chưa có dữ liệu": "データがまだありません",
    "chưa mở": "まだ開いていません",
    "Bấm để ôn các bài còn lại.": "残りの問題を復習するにはクリック。",
    "Chưa đo được: {ds}": "未測定：{ds}",
    "Chưa đo được: {ds} — nhãn ở trên chỉ nói tới phần đã đo.":
      "未測定：{ds} — 上のラベルは測定できた分だけを指します。",
    "Ôn bài còn lại": "残りを復習",
    "Ôn {n} bài còn lại": "残り {n} 問を復習",
    "Chưa bài nào tới hạn": "今は期限の問題がありません",
    "Điểm {d} trên 100, mức {b}. Bấm để ôn các bài còn lại.":
      "100点中 {d} 点、レベル {b}。残りの問題を復習するにはクリック。",
    "{t} giờ được {d}/100 · {b}": "{t} は今 {d}/100 · {b}",
    "Đã ôn {n} bài": "{n} 問を復習しました",
    "Xong rồi!": "終わりました！",
    "Cùng cụm:": "同じグループ：",
    "cùng cụm với {t}": "{t} と同じグループ",
    "Ôn kèm cùng nhau; điểm thì mỗi từ giữ riêng.":
      "一緒に復習しますが、点数は語ごとに別です。",
    "Chế độ học: một từ tới hạn thì ôn kèm luôn những từ đồng nghĩa / trái nghĩa của nó đã lưu trong sổ, xếp liền nhau — để luyện phân biệt giữa mấy từ gần nhau":
      "学習モード：ある語が期限になったら、保存してある類義語・対義語も続けて出します——近い語を区別する練習のため",
    "Nhớ thì lên một cấp và lần ôn sau xa hơn; quên thì về lại đầu.":
      "覚えていれば 1 段上がって次の復習が先に延び、忘れていれば最初に戻ります。",

    /* --- về tác giả --- */
    "Ra đời bởi": "制作",
    "RaKuLanG · Về tác giả": "RaKuLanG · 作者について",
    "Một món quà nhỏ gửi tặng cộng đồng học tập": "学ぶ人たちへのささやかな贈り物",
    "Cảm ơn ♥": "ありがとう ♥",
    "“Cho đi là còn mãi.”": "「与えたものだけが残る。」"
  };

  en["Chưa đủ lựa chọn rõ ràng. Hãy tự nhớ từ rồi xem đáp án; lượt này không tính điểm."] = "Not enough unambiguous choices. Recall the word, then reveal the answer; this round is not scored.";
  ja["Chưa đủ lựa chọn rõ ràng. Hãy tự nhớ từ rồi xem đáp án; lượt này không tính điểm."] = "明確な選択肢が足りません。単語を思い出してから答えを確認してください。今回は採点しません。";
  en["Đã xem đáp án · Không tính điểm SRS"] = "Answer revealed · No SRS score";
  ja["Đã xem đáp án · Không tính điểm SRS"] = "解答を確認しました · SRSの採点なし";
  en["Xem đáp án"] = "Show answer";
  ja["Xem đáp án"] = "答えを見る";

  en["Câu gốc tôi đã lưu:"] = "Original sentence I saved:";
  ja["Câu gốc tôi đã lưu:"] = "保存した元の文：";
  en["Đạt mức tối đa — từ này đã được đóng băng. Mở lại ở nút “Đang đóng băng”."] = "Maximum level reached — this word is now frozen. Unfreeze it with the “Frozen” button.";
  ja["Đạt mức tối đa — từ này đã được đóng băng. Mở lại ở nút “Đang đóng băng”."] = "最高レベルに到達 — この語は凍結されました。「凍結中」ボタンで解除できます。";
  en["phát âm"] = "pronounce";
  ja["phát âm"] = "発音";
  en["chọn đáp án"] = "choose an answer";
  ja["chọn đáp án"] = "答えを選ぶ";
  en["như Space"] = "same as Space";
  ja["như Space"] = "Space と同じ";
  en["phát âm / nghe lại"] = "pronounce / replay";
  ja["phát âm / nghe lại"] = "発音／もう一度聞く";
  en["Ôn từng đường"] = "Practise one type";
  ja["Ôn từng đường"] = "種類別に復習";
  en["Chỉ bài nghe"] = "Listening only";
  ja["Chỉ bài nghe"] = "リスニングのみ";
  en["Nghe một câu rồi nhận ra từ"] = "Hear a sentence and recognise the word";
  ja["Nghe một câu rồi nhận ra từ"] = "文を聞いて単語を見分ける";
  en["Chỉ bài đoán nghĩa"] = "Meaning guess only";
  ja["Chỉ bài đoán nghĩa"] = "意味当てのみ";
  en["Nhìn từ rồi nhớ nghĩa của nó"] = "See the word and recall its meaning";
  ja["Nhìn từ rồi nhớ nghĩa của nó"] = "単語を見て意味を思い出す";
  en["Chỉ bài đúng – sai"] = "True / false only";
  ja["Chỉ bài đúng – sai"] = "正誤問題のみ";
  en["Chọn đúng từ đồng nghĩa / trái nghĩa"] = "Pick the right synonym / antonym";
  ja["Chọn đúng từ đồng nghĩa / trái nghĩa"] = "正しい類義語・対義語を選ぶ";
  en["Chưa có bài nào đến hạn"] = "Nothing due yet";
  ja["Chưa có bài nào đến hạn"] = "期限の来た問題はありません";
  en["Luyện liền một loại bài, không bị xen loại khác. Điểm và lịch ôn vẫn tính chung như học thường."] = "Practise one type of exercise in a row, with no other types mixed in. Scores and review schedule count just like normal study.";
  ja["Luyện liền một loại bài, không bị xen loại khác. Điểm và lịch ôn vẫn tính chung như học thường."] = "1種類の問題だけを続けて練習します。スコアと復習スケジュールは通常の学習と同じ扱いです。";
  en["Chưa có bài nào đến hạn ở loại này."] = "Nothing due for this type yet.";
  ja["Chưa có bài nào đến hạn ở loại này."] = "この種類で期限の来た問題はありません。";
  en["{b} câu đã đóng băng"] = "{b} frozen";
  ja["{b} câu đã đóng băng"] = "凍結済み{b}文";
  en["Câu đã đóng băng ({n})"] = "Frozen sentences ({n})";
  ja["Câu đã đóng băng ({n})"] = "凍結した文（{n}）";
  en["Mở lại"] = "Unfreeze";
  ja["Mở lại"] = "解除";
  en["Chưa mở lại được câu này. Hãy thử lại."] = "Could not unfreeze this sentence. Please try again.";
  ja["Chưa mở lại được câu này. Hãy thử lại."] = "この文を解除できませんでした。もう一度お試しください。";
  en["Mọi câu đã đóng băng. Mở lại ở danh sách bên dưới nếu muốn luyện lại."] = "All sentences are frozen. Unfreeze some in the list below to practise them again.";
  ja["Mọi câu đã đóng băng. Mở lại ở danh sách bên dưới nếu muốn luyện lại."] = "すべての文が凍結されています。もう一度練習するには下のリストで解除してください。";
  en["Đã đóng băng câu này — sẽ không hiện lại. Mở lại ở danh sách câu đóng băng."] = "This sentence is now frozen and won't appear again. Unfreeze it from the frozen list.";
  ja["Đã đóng băng câu này — sẽ không hiện lại. Mở lại ở danh sách câu đóng băng."] = "この文を凍結しました。再表示されません。凍結リストから解除できます。";
  en["Ghép đúng câu thì câu được đóng băng và không hiện lại; bạn mở lại được ở danh sách bên dưới."] = "Put a sentence together correctly and it is frozen and won't come back; you can unfreeze it from the list below.";
  ja["Ghép đúng câu thì câu được đóng băng và không hiện lại; bạn mở lại được ở danh sách bên dưới."] = "正しく並べた文は凍結され、再表示されません。下のリストから解除できます。";

  en["Hãy hiện nghĩa trước rồi mới vuốt để chấm (Space)"] = "Reveal the meaning first, then swipe to grade (Space)";
  ja["Hãy hiện nghĩa trước rồi mới vuốt để chấm (Space)"] = "先に意味を表示してから、スワイプして採点してください（Space）";
  en["Hãy hiện nghĩa trước rồi mới vuốt để chấm"] = "Reveal the meaning first, then swipe to grade";
  ja["Hãy hiện nghĩa trước rồi mới vuốt để chấm"] = "先に意味を表示してから、スワイプして採点してください";
  en["Giữ nguyên kết quả đã chấm"] = "Grade left unchanged";
  ja["Giữ nguyên kết quả đã chấm"] = "採点はそのままです";
  en["Xem lại · đã chấm: Nhớ"] = "Reviewing · graded: Remembered";
  ja["Xem lại · đã chấm: Nhớ"] = "見直し・採点：覚えた";
  en["Xem lại · đã chấm: Quên"] = "Reviewing · graded: Forgot";
  ja["Xem lại · đã chấm: Quên"] = "見直し・採点：忘れた";
  en["bài chọn đáp án, chỉ để xem"] = "answer-choice exercise, view only";
  ja["bài chọn đáp án, chỉ để xem"] = "選択問題のため閲覧のみ";
  en["Thẻ trước (←)"] = "Previous card (←)";
  ja["Thẻ trước (←)"] = "前のカード（←）";
  en["Thẻ trước"] = "Previous card";
  ja["Thẻ trước"] = "前のカード";
  en["Thẻ sau (→)"] = "Next card (→)";
  ja["Thẻ sau (→)"] = "次のカード（→）";
  en["Thẻ sau"] = "Next card";
  ja["Thẻ sau"] = "次のカード";

  en["Đúng rồi · {t} giây"] = "Correct · {t}s";
  ja["Đúng rồi · {t} giây"] = "正解 · {t}秒";
  en["Chưa đúng · {t} giây"] = "Not quite · {t}s";
  ja["Chưa đúng · {t} giây"] = "不正解 · {t}秒";
  en["Chỉ bài điền khuyết"] = "Fill-in-the-blank only";
  ja["Chỉ bài điền khuyết"] = "穴埋めのみ";
  en["Chọn từ đúng cho chỗ trống trong câu"] = "Pick the right word for the blank in the sentence";
  ja["Chọn từ đúng cho chỗ trống trong câu"] = "文の空欄に入る正しい語を選ぶ";
  en["Điền khuyết trong câu"] = "Fill in the blank";
  ja["Điền khuyết trong câu"] = "文の穴埋め";
  en["dùng trong câu"] = "use in a sentence";
  ja["dùng trong câu"] = "文中での運用";
  en["Dùng được trong câu"] = "Can use it in a sentence";
  ja["Dùng được trong câu"] = "文中で使える";
  en["chưa có câu nguồn đã dịch"] = "no translated source sentence yet";
  ja["chưa có câu nguồn đã dịch"] = "翻訳済みの出典文がまだありません";

  en["Chưa lật thẻ vẫn chấm được. Kéo thẻ:"] = "You can grade without flipping. Drag the card:";
  ja["Chưa lật thẻ vẫn chấm được. Kéo thẻ:"] = "めくらなくても採点できます。カードをドラッグ：";
  en["mở nguồn"] = "open source";
  ja["mở nguồn"] = "出典を開く";
  en["Nhấp đúp chỗ trống của thẻ: sửa nghĩa"] = "Double-click an empty spot on the card: edit meaning";
  ja["Nhấp đúp chỗ trống của thẻ: sửa nghĩa"] = "カードの空白をダブルクリック：意味を編集";
  en["Mở link"] = "Open link";
  ja["Mở link"] = "リンクを開く";
  en["Xoá"] = "Delete";
  ja["Xoá"] = "削除";
  en["Từ này chưa có nguồn để mở"] = "This word has no source to open";
  ja["Từ này chưa có nguồn để mở"] = "この単語には開ける出典がありません";
  en["Từ này chưa có link nguồn"] = "This word has no source link";
  ja["Từ này chưa có link nguồn"] = "この単語には出典リンクがありません";

  en["Bài điền khuyết: hãy chọn một trong các ô (phím 1–4)"] = "Fill-in-the-blank: pick one of the options (keys 1–4)";
  ja["Bài điền khuyết: hãy chọn một trong các ô (phím 1–4)"] = "穴埋め問題：選択肢から1つ選んでください（キー1〜4）";

  Object.assign(en, {
  "Loại từ": "Parts of speech",
  "Màu loại từ tiếng Nhật · Kuromoji/IPADIC": "Japanese part-of-speech colors · Kuromoji/IPADIC",
  "Chưa nạp được bộ phân tích. Tắt/bật Loại từ để thử lại.": "Could not load the analyzer. Turn Parts of speech off and on to retry.",
  "Lưu câu này rồi hỏi Gemini về nó": "Save this sentence and ask Gemini about it",
  "Gemini": "Gemini",
  "Hỏi Gemini về câu này — link đoạn chat sẽ lưu vào mục trong sổ tay": "Ask Gemini about this sentence — the chat link will be saved with the notebook entry",
  "Hỏi Gemini về câu này (lưu vào sổ trước thì link đoạn chat mới được giữ lại)": "Ask Gemini about this sentence (save it to your notebook first to keep the chat link)",
  "Quá hạn chờ": "Request timed out",
  "đang đóng băng": "frozen",
  "hiện lúc {gio}": "available at {gio}",
  "đến hạn — đợi tới lượt": "due — waiting in the queue",
  "{d}/100 · {b}": "{d}/100 · {b}",
  "Từ này đã xoá khỏi sổ tay nên không tự thêm lại. Bạn vẫn tiếp tục bài JLPT.": "This word was deleted from your notebook and will not be added again automatically. You can continue the JLPT exercise.",
  "Hiện thêm {n} mục": "Show {n} more entries",
  "Chọn từ này": "Select this word",
  "Đã chọn {n}": "{n} selected",
  "Bỏ chọn tất cả": "Deselect all",
  "Chọn tất cả ({n})": "Select all ({n})",
  "Không xoá được — đã nạp lại sổ tay.": "Could not delete — the notebook has been reloaded.",
  "Đã xoá {n} từ": "Deleted {n} words",
  "Đã khôi phục": "Restored",
  "Dịch câu": "Translate sentence",
  "Không cập nhật được hàng đợi. Hãy mở lại buổi học.": "Could not update the queue. Reopen the study session.",
  "Dòng mờ là chưa đủ mẫu (dưới {c} lượt). Đủ mẫu rồi thì bậc nào nhớ dưới 80% là đang quá dài với bạn, trên 95% là đang ôn thừa.": "Faded rows have too few samples (under {c} reviews). With enough samples, recall below 80% suggests the interval is too long; above 95% suggests unnecessary reviews.",
  "Tắt nhạc nền": "Turn background music off",
  "Bật nhạc nền": "Turn background music on",
  "Ôn thi JLPT": "JLPT practice",
  "Mỗi cấp là một màn chơi, mở sẵn song song — chọn cấp hợp với trình độ của bạn. Chọn bất kỳ chặng nào. Hoàn thành tất cả chặng để mở bài kiểm tra cuối.": "Each level is available from the start. Pick a level and any stage you like. Complete every stage to unlock the final test.",
  "chặng": "stages",
  "Chưa chơi": "Not started",
  "Bấm để vào": "Tap to enter",
  "Sắp có": "Coming soon",
  "Sẽ mở ngay khi có dữ liệu giáo trình của cấp này.": "Available when learning material for this level is added.",
  "Chế độ thử: mở khoá tất cả màn và chặng (để xem thử)": "Preview mode: unlock all levels and stages",
  "Ngọc": "Gems",
  "Chuỗi ngày học liên tiếp": "Consecutive study days",
  "Đang mở màn…": "Opening level…",
  "Không nạp được dữ liệu màn này.": "Could not load this level.",
  "Quay lại": "Back",
  "Nhật ký câu chuyện": "Story journal",
  "Chưa nhặt được": "Not collected",
  "khoá": "locked",
  "Tiếp theo": "Next",
  "Chưa có đoạn nào. Bấm vào một chặng để nghe nhân vật kể tiếp!": "No story yet. Open a stage to continue the story!",
  "Trùm cuối": "Final challenge",
  "Trùm chương": "Chapter challenge",
  "Chữ Hán": "Kanji",
  "Bài": "Lesson",
  "Đề tổng hợp toàn màn, 30 câu. Mở sau khi hoàn thành mọi chặng.": "A 30-question test covering the entire level. Unlocks after every stage is complete.",
  "Đề tổng hợp của cả chương, 20 câu. Bạn có thể làm bất cứ lúc nào.": "A 20-question chapter test. You can take it at any time.",
  "từ vựng": "vocabulary items",
  "mẫu ngữ pháp": "grammar patterns",
  "câu hỏi": "questions",
  "làm hết câu hỏi để hoàn thành": "answer every question to complete",
  "Điểm cao nhất": "Best score",
  "Nghe lại câu chuyện": "Replay the story",
  "Bài kiểm tra cuối đang khoá: hãy hoàn thành tất cả chặng trước.": "The final test is locked. Complete every stage first.",
  "Làm bài ngay": "Start the quiz",
  "Đi thôi!": "Let's go!",
  "Thoát lượt này? Tiến độ của lượt đang chơi sẽ không được lưu.": "Leave this round? Progress in the current round will not be saved.",
  "Ở lại": "Stay",
  "Thoát": "Leave",
  "Chưa lưu được thẻ sang Học. Hãy thử lại.": "Could not send the card to Study. Please try again.",
  "Học nhanh": "Quick study",
  "Hán Việt": "Sino-Vietnamese reading",
  "Chạm để lật thẻ": "Tap to flip the card",
  "Trước": "Previous",
  "Học lại": "Review again",
  "Nhớ rồi": "I know it",
  "Bắt đầu thử thách": "Start the challenge",
  "Vuốt thẻ sang phải = đã nhớ · sang trái = học lại · chạm để lật": "Swipe right: known · left: review again · tap: flip",
  "Bỏ qua phần học": "Skip study",
  "Chặng này chưa dựng được câu hỏi.": "Questions are not available for this stage yet.",
  "Ôn lại câu sai": "Review mistakes",
  "Chưa lưu được thẻ sang Học. Bấm lại đáp án để thử lưu.": "Could not send the card to Study. Tap your answer again to retry.",
  "Chưa đúng": "Not quite",
  "Báo câu sai": "Report a problem",
  "Đã ghi nhận. Câu này sẽ không xuất hiện lại.": "Reported. This question will not appear again.",
  "Tiếp tục": "Continue",
  "Hoàn thành màn!": "Level complete!",
  "Vượt chặng!": "Stage complete!",
  "Chưa hoàn thành": "Not complete",
  "câu đúng": "correct answers",
  "Hãy làm hết lượt để hoàn thành.": "Answer all questions to complete the round.",
  "Kỷ lục mới!": "New best!",
  "Các câu sai": "Mistakes",
  "Chơi lại": "Try again",
  "Lịch từng đường": "Schedule by skill",
  "Hẹn lại tính từ hôm nay. Đóng băng giữ nguyên điểm và lịch; mở lại tiếp tục theo lịch đó.": "Rescheduling counts from today. Freezing preserves the score and schedule; unfreezing resumes that schedule.",
  "Toàn bộ từ đang đóng băng": "All skills for this word are frozen",
  "Chưa có dữ liệu cho bài này": "No data for this exercise yet",
  "Hẹn ôn: ": "Review on: ",
  "Đến hạn": "Due",
  "Số ngày": "Number of days",
  "Mục đã bị xoá.": "This entry was deleted.",
  "Đã lưu lịch riêng.": "Skill schedule saved.",
  "Chưa lưu được. Hãy thử lại.": "Could not save. Please try again.",
  "{m} câu mới · {d} câu đến hạn · {t} câu tổng cộng": "{m} new · {d} due · {t} sentences in total",
  "Luyện tất cả": "Practice all",
  "Không đọc được lịch. Hãy thử lại.": "Could not load the schedule. Please try again.",
  "Đã hết câu đến hạn. Bạn vẫn có thể luyện tất cả.": "No sentences are due. You can still practice all of them.",
  "Ôn theo lịch ngữ pháp": "Scheduled grammar review",
  "Luyện tự do · không thay đổi lịch": "Free practice · schedule unchanged",
  "Lịch đã thay đổi hoặc câu không còn trong sổ. Lượt này không tăng cấp.": "The schedule changed or this sentence is no longer in your notebook. This round will not raise its level.",
  "Cấp ngữ pháp {lv} · ôn lại sau {n} ngày": "Grammar level {lv} · review in {n} days",
  "Chưa lưu được lịch. Bấm Câu tiếp để thử lưu lại.": "Could not save the schedule. Tap Next sentence to retry.",
  "Chưa khớp câu gốc. Chạm mảnh trong câu để đổi chỗ rồi thử lại.": "The order does not match the original sentence. Tap pieces to rearrange them and try again.",
  "Củng cố · không tăng cấp": "Reinforcement · level unchanged",
  "Đang lưu màu…": "Saving color…",
  "Đã lưu màu giao diện.": "Theme color saved.",
  "Chưa lưu được màu. Hãy chọn lại.": "Could not save the color. Please select it again.",
  "Màu giao diện": "Theme color",
  "Chọn màu pastel yêu thích. Áp dụng ngay và tự lưu trên máy này.": "Pick your favorite pastel. Changes apply immediately and are saved on this device.",
  "Xanh dương": "Blue",
  "Bạc hà": "Mint",
  "Hồng": "Pink",
  "Đào": "Peach",
  "Lavender": "Lavender",
  "Vàng kem": "Butter yellow",
  "RaKuLanG · Sổ tay và đọc báo": "RaKuLanG · Notebook and news",
  "‹ RaKuLanG": "‹ RaKuLanG",
  "Tra RaKuLanG": "Look up with RaKuLanG",
  "Đang mở bài…": "Opening article…",
  "Bản đã lưu trên máy": "Saved on this device",
  "Chưa mở được bài. Kiểm tra mạng hoặc bấm tải lại.": "Could not open the article. Check your connection or tap Reload.",
  "Trang đã đóng để giải phóng bộ nhớ. Hãy mở lại bài.": "The page was closed to free memory. Reopen the article.",
  "Tải lại": "Reload",
  "Dễ đọc": "Reader view",
  "Lưu bài": "Save article",
  "Đã lưu vào sổ tay NeutronDict": "Saved to your RaKuLanG notebook",
  "Bôi đen từ rồi bấm Tra NeutronDict.": "Select a word, then tap Look up with RaKuLanG.",
  "Chưa tra được từ.": "Could not look up this word.",
  "Chưa lấy được nội dung bài.": "Could not extract the article text.",
  "Không lưu được bài.": "Could not save the article.",
  "Đã lưu bài để đọc ngoại tuyến": "Article saved for offline reading",
  "Mở lại NeutronDict rồi thử tra lại.": "Reopen RaKuLanG and try the lookup again.",
  "Tra từ chưa phản hồi. Kiểm tra mạng và thử lại.": "The lookup did not respond. Check your connection and try again.",
  "Không lưu được cấu hình giọng đọc.": "Could not save voice settings.",
  "Đường dẫn YouTube không hợp lệ.": "Invalid YouTube URL.",
  "Chỉ mở địa chỉ HTTPS.": "Only HTTPS addresses can be opened.",
  "Nguồn tin phải là địa chỉ Internet công khai.": "News feeds must use a public Internet address.",
  "Đường dẫn nguồn không hợp lệ.": "Invalid feed URL.",
  "Tối đa 12 nguồn tin.": "You can add up to 12 news feeds.",
  "Chu kỳ không hợp lệ.": "Invalid update interval.",
  "Nguồn RSS phải dùng HTTPS.": "RSS feeds must use HTTPS.",
  "Mã ngôn ngữ không hợp lệ.": "Invalid language code.",
  "Không lưu được nguồn.": "Could not save the feed.",
  "Chưa tải được nguồn.": "Could not load the feed.",
  "Không lưu được tin.": "Could not save the news.",
  "Nguồn vượt giới hạn 4 MB.": "The feed exceeds the 4 MB limit.",
  "XML không an toàn hoặc quá lớn.": "The XML is unsafe or too large.",
  "XML chứa DTD.": "XML contains a DTD.",
  "Bài báo không hợp lệ.": "Invalid article.",
  "Đã có 200 bài đánh dấu. Hãy bỏ bớt bài cũ.": "You have 200 bookmarks. Remove some old ones first.",
  "Mã vùng Azure không hợp lệ.": "Invalid Azure region code.",
  "Khóa Azure không hợp lệ.": "Invalid Azure key.",
  "Đang dùng giọng trên máy.": "Using the device voice.",
  "Azure tạm hết lượt hoặc chưa khả dụng · dùng giọng trên máy.": "Azure is temporarily unavailable or out of quota · using the device voice.",
  "Đã chạm giới hạn Azure của app tháng này · dùng giọng trên máy.": "This app's monthly Azure limit has been reached · using the device voice.",
  "Chưa có khóa Azure hợp lệ · dùng giọng trên máy.": "No valid Azure key · using the device voice.",
  "Vùng Azure không hợp lệ.": "Invalid Azure region.",
  "Azure chưa khả dụng · dùng giọng trên máy.": "Azure is unavailable · using the device voice.",
  "Audio không hợp lệ.": "Invalid audio.",
  "Azure lỗi hoặc mất mạng · dùng giọng trên máy.": "Azure failed or the connection was lost · using the device voice.",
  "Vào thi": "Take the test",
  "Bắt đầu": "Start",
  "Chính xác!": "Correct!",
  "Tuyệt vời!": "Excellent!",
  "Quá đỉnh!": "Amazing!",
  "Giỏi lắm!": "Great job!",
  "Chuẩn rồi!": "That's right!",
  "Tra \"%s\" bằng RaKuLanG": "Look up \"%s\" with RaKuLanG",
  "Lưu \"%s\" vào RaKuLanG (kèm nguồn)": "Save \"%s\" to RaKuLanG (with source)",
  "Từ này đã được xóa. Khôi phục trong sổ tay trước khi lưu lại.": "This word was deleted. Restore it in your notebook before saving it again.",
  "Đã nhận {n} mục từ YouTube": "Received {n} entries from YouTube",
  "Thao tác không hợp lệ.": "Invalid operation.",
  "Đang cập nhật tin…": "Updating news…",
  "Đang mở danh sách…": "Opening list…",
  "Cập nhật {time}": "Updated {time}",
  "Chưa có tin — bấm Cập nhật": "No news yet — tap Update",
  "Đã lưu đọc offline": "Saved for offline reading",
  "★ Đã đánh dấu": "★ Bookmarked",
  "☆ Đọc sau": "☆ Read later",
  "Chưa có bài phù hợp. Thêm nguồn hoặc cập nhật tin.": "No matching articles. Add a feed or update the news.",
  "Xóa": "Remove",
  "Màn hình {screen}": "Screen: {screen}",
  "Xem tất cả tin": "Show all news",
  "★ Bài đã lưu": "★ Saved articles",
  "Dùng địa chỉ HTTPS của nguồn RSS/Atom.": "Use the HTTPS address of an RSS/Atom feed.",
  "TTS không khả dụng": "Text-to-speech is unavailable",
  "Tự động · giọng trên máy": "Automatic · device voice",
  " · cần mạng": " · requires Internet",
  "Hãy cài giọng đọc cho ngôn ngữ này.": "Install a voice for this language.",
  "Đã lưu khóa · bỏ trống để giữ nguyên": "Key saved · leave blank to keep it",
  "Khóa Azure Speech F0": "Azure Speech F0 key",
  "Đã lưu. Azure lỗi hoặc hết lượt sẽ dùng TTS trên máy.": "Saved. If Azure fails or reaches its quota, the device voice will be used.",
  "Đã xóa khóa Azure.": "Azure key removed.",
  "Dữ liệu từ không hợp lệ.": "Invalid word data.",
  "Sổ tay hiện hỗ trợ tiếng Nhật và tiếng Anh; bạn vẫn đọc và dịch được ngôn ngữ này.": "The notebook currently supports Japanese and English. You can still read and translate this language.",
  "Chưa có từ để lưu.": "No word to save.",
  "Bài báo": "Article",
  "Hãy chọn một từ hoặc cụm ngắn.": "Select a word or a short phrase.",
  "Chưa lấy được nghĩa. Kiểm tra mạng và thử lại.": "Could not get the meaning. Check your connection and try again.",
  "Không tìm thấy thẻ JLPT.": "JLPT card not found.",
  "Thẻ JLPT thiếu từ.": "The JLPT card has no word.",
  "Ghép câu ngữ pháp": "Grammar sentence ordering",
  "Đúng một lần là đóng băng câu": "One correct answer freezes the sentence",
  "Hẹn lại": "Reschedule",
  "Mở lại đường này": "Unfreeze this skill",
  "Đóng băng đường này": "Freeze this skill",
  "Dùng lịch tự động": "Use automatic scheduling",
  "TTS · chưa có mốc âm thanh gốc khớp toàn câu": "TTS · no original-audio timestamps for the full sentence",
  "YouTube gốc · {rate}×": "Original YouTube audio · {rate}×",
  "{rate}× · đang mở đoạn câu…": "{rate}× · opening the sentence clip…",
  "Đã nghe YouTube gốc · {rate}×": "Played original YouTube audio · {rate}×",
  "Đã dừng đoạn YouTube · bấm Nghe để phát lại": "YouTube clip stopped · tap Listen to replay",
  "TTS · mở YouTube một lần để hoàn tất thiết lập nghe giọng gốc": "TTS · open YouTube once to finish original-audio setup",
  "Chưa phát được YouTube gốc · đang dùng TTS {rate}×": "Could not play original YouTube audio · using TTS at {rate}×",
  "NGỮ PHÁP · GHÉP CÂU": "GRAMMAR · SENTENCE ORDERING",
  "Ghép tối đa 4 mảnh thành câu gốc. Đúng một lần là đóng băng riêng câu này.": "Arrange up to 4 pieces into the original sentence. One correct answer freezes this sentence.",
  "Từ đã lưu: {word}": "Saved word: {word}",
  "Kiểm tra": "Check",
  "Chạm các mảnh theo thứ tự": "Tap the pieces in order",
  "Chưa đúng. Hãy đổi thứ tự các mảnh rồi thử lại.": "Not quite. Rearrange the pieces and try again.",
  "Câu đã thay đổi. Hãy mở lại buổi học.": "The sentence changed. Reopen the study session.",
  "Xem đáp án chưa tính là thuộc.": "Viewing the answer does not mark it as learned.",
  "Đúng rồi — câu này đã đóng băng.": "Correct — this sentence is now frozen.",
  "Chưa lấy được bản dịch.": "Could not get the translation.",
  "Chưa lưu được: {error} Bấm Kiểm tra để thử lại.": "Could not save: {error} Tap Check to retry.",
  "Kết quả ngữ pháp không hợp lệ.": "Invalid grammar result.",
  "Nghe rồi chọn nghĩa đúng": "Listen and choose the correct meaning",
  "Chọn nghĩa đúng": "Choose the correct meaning",
  "Chọn từ có nghĩa này": "Choose the word with this meaning",
  "Chọn cách đọc đúng": "Choose the correct reading",
  "Điền từ vào chỗ trống": "Fill in the missing word",
  "Âm Hán Việt của chữ này": "Sino-Vietnamese reading of this kanji",
  "Âm On của chữ này": "On-reading of this kanji",
  "Chọn chữ Hán có âm Hán Việt này": "Choose the kanji with this Sino-Vietnamese reading",
  "Mẫu ngữ pháp này có nghĩa": "This grammar pattern means",
  "Điền mẫu ngữ pháp vào chỗ trống": "Fill in the missing grammar pattern",
  "Không còn mục để chỉnh lịch.": "The entry is no longer available for rescheduling.",
  "Nhập số ngày từ 1 đến 3650.": "Enter a number of days from 1 to 3650.",
  "Thao tác lịch không hợp lệ.": "Invalid scheduling operation.",
  "Không đọc được bản thu": "Could not read the recording",
  "Máy này không ghi âm được": "This device cannot record audio",
  "Bản thu rỗng": "The recording is empty",
  "Trình duyệt chưa hỗ trợ khóa ghi dùng chung. Hãy cập nhật Chrome/Edge.": "Your browser does not support shared write locks. Update Chrome or Edge.",
  "Danh từ": "Noun",
  "Động từ": "Verb",
  "Tính từ": "Adjective",
  "Trạng từ": "Adverb",
  "Đại từ": "Pronoun",
  "Liên từ": "Conjunction",
  "Trợ từ / trợ động từ": "Particle / auxiliary",
  "Khác": "Other",
  "Hiện phụ đề": "Show subtitles",
  "Bấm Thử lại; còn không thì báo lại để sửa. (khung: {kh} · thẻ quen: {the})": "Tap Retry. If it still fails, report it. (frames: {kh} · known cards: {the})",
  "Cài đặt": "Settings",
  "Đồng bộ, âm thanh và tuỳ chỉnh ứng dụng.": "Sync, audio, and app preferences.",
  "Dán & tra": "Paste & look up",
  "Nhập một từ để tra, hoặc bấm “Dán & tra”.": "Enter a word or tap “Paste & look up”.",
  "Giọng đọc và bài nghe": "Voices and listening",
  "Giọng Nhật dự phòng": "Backup Japanese voice",
  "Nghe thử tiếng Nhật": "Preview Japanese voice",
  "Giọng Anh dự phòng": "Backup English voice",
  "Nghe thử tiếng Anh": "Preview English voice",
  "Cài thêm giọng trên máy": "Install device voices",
  "Azure Neural · tuỳ chọn": "Azure Neural · optional",
  "Dùng tài nguyên Speech gói F0 miễn phí. Âm thanh được lưu lại; hết lượt hoặc lỗi sẽ chuyển sang giọng trên máy. App không đổi gói Azure. Giới hạn đếm trong app là 450.000 ký tự/tháng trên máy này, không thay thế hạn mức tài khoản Azure.": "Use a free F0 Speech resource. Audio is cached; on errors or quota limits, the app uses the device voice. The app does not change your Azure plan. The app's counter allows 450,000 characters per month on this device; it does not replace your Azure account's quota.",
  "Dùng Azure cho bài nghe Nhật / Anh": "Use Azure for Japanese / English listening",
  "Vùng tài nguyên": "Resource region",
  "Khóa Speech": "Speech key",
  "Lưu Azure": "Save Azure settings",
  "Xóa khóa": "Remove key",
  "▤ Đọc báo": "▤ News",
  "✦ Trợ lý AI": "✦ AI assistant",
  "RAKULANG · KHÁM PHÁ": "RAKULANG · EXPLORE",
  "Thế giới qua từng câu chữ": "The world, one sentence at a time",
  "Đọc điều bạn thích. Bôi đen từ, bấm Tra RaKuLanG để xem nghĩa và lưu cả câu vào sổ tay.": "Read what you enjoy. Select a word, tap Look up with RaKuLanG, and save the whole sentence to your notebook.",
  "Mọi ngôn ngữ": "All languages",
  "Cập nhật": "Update",
  "Nguồn tin và cập nhật": "Feeds and updates",
  "Cập nhật nền": "Background updates",
  "15 phút": "15 minutes",
  "30 phút": "30 minutes",
  "1 giờ": "1 hour",
  "2 giờ": "2 hours",
  "Android có thể trì hoãn cập nhật để tiết kiệm pin. Mỗi nguồn cung cấp số lượng bài khác nhau.": "Android may delay updates to save battery. The number of articles depends on each feed.",
  "Tiếng Anh · English": "English",
  "Tiếng Nhật · 日本語": "Japanese · 日本語",
  "Tiếng Pháp": "French",
  "Tiếng Đức": "German",
  "Tiếng Hàn": "Korean",
  "Tiếng Trung": "Chinese",
  "Français": "Français",
  "Thêm nguồn": "Add feed",
  "Xem thêm": "Show more",
  "Lọc tiêu đề, nguồn báo…": "Filter by title or source…",
  "https://… nguồn RSS/Atom": "https://… RSS/Atom feed",
  "Tên nguồn": "Feed name",
  "Ghép các mảnh bị xáo trộn thành câu tiếng Nhật gốc chứa từ bạn đã lưu. Mỗi câu có tối đa 4 mảnh. Ngữ pháp nằm trong chế độ Học; làm đúng một lần sẽ đóng băng riêng câu này.": "Reorder up to 4 pieces to rebuild the original Japanese sentence containing your saved word. Grammar is part of Study; one correct answer freezes that sentence.",
  "Ôn ngữ pháp đến hạn và câu mới": "Review due and new grammar sentences",
  "Câu tiếp": "Next sentence",
  "Xuất & sao lưu": "Export & backup",
  "Xuất CẢ SỔ (cả hai thứ tiếng), mang đủ link và phút video, mở bằng Excel được. Nạp vào thì chỉ THÊM từ mới, không đè lên bản dịch bạn đã tự sửa.": "Export the entire notebook in both languages, including links and video timestamps, in an Excel-compatible format. Import only adds new words and preserves your edited translations.",
  "Cho trợ lý AI khác (ChatGPT, Gemini…) đọc được lời thoại: đặt thêm một bản chữ khuất mắt vào trang YouTube": "Let other AI assistants (ChatGPT, Gemini…) read the transcript by adding a hidden text copy to the YouTube page",
  "Bôi đen phát nào popup cũng chạy cả tra từ lẫn dịch câu và xếp vào các tab — chỉ đoạn dài hơn số trên mới bỏ qua phần từ điển, vì tra nguyên đoạn như một từ thì chắc chắn rỗng. Tắt popup thì vẫn dùng được phím tắt và chuột phải như cũ.": "Selecting text opens word lookup and sentence translation in separate popup tabs. Only selections longer than the limit skip dictionary lookup. Keyboard shortcuts and the context menu still work when the popup is off.",
  "Mỗi lượt ôn ghi lại: app đã bắt bạn chờ bao nhiêu ngày ở bậc nào, và tới lúc gặp lại bạn có nhớ không. Đây là thứ duy nhất nói được thang giãn cách có hợp với bạn hay không — mọi con số trong thang là mặc định của app, không phải đo từ bạn.": "Each review records the level, days waited, and whether you remembered. Use this history to judge whether the intervals fit you; the initial intervals are defaults, not measurements of your memory.",
  "Bỏ chọn": "Deselect",
  "đóng": "close",
  "Xin chào, mình là": "Hello, I'm",
  "(P.C.N) — cựu sinh viên ngành": "(P.C.N), a former student of",
  "Tự động hoá, Đại học Bách Khoa Hà Nội": "Automation at Hanoi University of Science and Technology",
  ", quê": ", from",
  ", một người mê": ", passionate about",
  "nghiên cứu công nghệ": "technology research",
  "Mình làm dự án này như một món quà hiến tặng cộng đồng học tập — một công cụ nhỏ mà mạnh mẽ, đồng hành cùng bạn trên hành trình chinh phục tiếng Nhật & tiếng Anh. Nếu nó giúp ích cho việc học của bạn, thì mình đã hạnh phúc rồi.": "I made this project as a gift to the learning community: a small, capable tool for your Japanese and English journey. I'm happy if it helps you learn.",
  "Mình làm dự án này như một món quà hiến tặng cộng đồng học tập — một công cụ nhỏ mà mạnh mẽ, đồng hành cùng bạn trên hành trình chinh phục tiếng Nhật & tiếng Anh.": "I made this project as a gift to the learning community: a small, capable tool for your Japanese and English journey.",
  "Hướng dẫn đọc IPA — RaKuLanG": "IPA pronunciation guide — RaKuLanG",
  "🔤 Hướng dẫn đọc IPA tiếng Anh": "🔤 English IPA pronunciation guide",
  "Bảng ký hiệu phiên âm quốc tế (IPA) kèm từ ví dụ và gợi ý đọc gần đúng bằng tiếng Việt. Bấm 🔊 để nghe ví dụ.": "International Phonetic Alphabet (IPA) with examples and pronunciation tips. Tap 🔊 to hear each example.",
  "Mẹo:": "Tip:",
  "gợi ý tiếng Việt chỉ là “gần đúng” để dễ hình dung — âm tiếng Anh không trùng khớp hoàn toàn với âm tiếng Việt. Dấu": "Pronunciation tips are approximate. Listen to the examples to learn the actual sound. The mark",
  "đứng trước âm tiết được": "precedes the syllable with",
  "nhấn mạnh": "primary stress",
  "(đọc to & cao hơn), ví dụ": "(spoken more strongly), for example",
  "danh từ /ˈrɛkɔːd/ khác động từ /rɪˈkɔːd/.": "the noun /ˈrɛkɔːd/ differs from the verb /rɪˈkɔːd/.",
  "Nguyên âm (Vowels)": "Vowels",
  "Nguyên âm đôi (Diphthongs)": "Diphthongs",
  "Phụ âm (Consonants)": "Consonants",
  "Nghe ví dụ": "Listen to example",
  "{n} nét": "{n} strokes",
  "Bộ: {radical}": "Radical: {radical}",
  "Hạt giống": "Seedling",
  "Ôn lượt đầu tiên trong app": "Complete your first review",
  "Đúng hẹn": "Right on time",
  "Đạt mục tiêu ngày lần đầu tiên": "Reach your daily goal for the first time",
  "Ba ngày liền": "Three days running",
  "Giữ chuỗi 3 ngày liên tiếp": "Maintain a 3-day streak",
  "Trọn một tuần": "A full week",
  "Giữ chuỗi 7 ngày liên tiếp": "Maintain a 7-day streak",
  "Một tháng bền bỉ": "A steady month",
  "Giữ chuỗi 30 ngày liên tiếp": "Maintain a 30-day streak",
  "Trăm ngày": "One hundred days",
  "Giữ chuỗi 100 ngày liên tiếp": "Maintain a 100-day streak",
  "100 lượt ôn": "100 reviews",
  "Ôn 100 lượt trong app": "Complete 100 reviews",
  "500 lượt ôn": "500 reviews",
  "Ôn 500 lượt trong app": "Complete 500 reviews",
  "2000 lượt ôn": "2,000 reviews",
  "Ôn 2000 lượt trong app": "Complete 2,000 reviews",
  "Sổ tay 100 mục": "100 notebook entries",
  "Lưu 100 mục vào sổ tay": "Save 100 notebook entries",
  "Sổ tay 500 mục": "500 notebook entries",
  "Lưu 500 mục vào sổ tay": "Save 500 notebook entries",
  "Nhớ lâu": "Long-term memory",
  "100 mục đạt chu kỳ ôn từ 14 ngày": "Reach a review interval of at least 14 days for 100 entries",
  "Vốn liếng dày": "Deep knowledge",
  "500 mục đạt chu kỳ ôn từ 14 ngày": "Reach a review interval of at least 14 days for 500 entries",
  "Người hiệu đính": "Proofreader",
  "Sửa lại 20 bản dịch cho sát nghĩa": "Improve 20 translations",
  "Thợ cả chuyên ngành": "Subject expert",
  "Sửa lại 100 bản dịch": "Improve 100 translations",
  "Người chú giải": "Annotator",
  "Viết ghi chú cho 20 mục": "Add notes to 20 entries",
  "Ngăn nắp": "Well organized",
  "Có 5 sổ con đang dùng": "Use 5 active subnotebooks",
  "Có gu": "Good taste",
  "Gắn tim cho 50 mục": "Favorite 50 entries",
  "Bùng nổ": "On a roll",
  "Ôn 50 lượt trong cùng một ngày": "Complete 50 reviews in one day",
  "Ba mươi ngày có mặt": "Thirty active days",
  "Có học trong 30 ngày khác nhau": "Study on 30 different days",
  "Dậy sớm": "Early bird",
  "Ôn bài trước 6 giờ sáng": "Review before 6 a.m.",
  "Cú đêm": "Night owl",
  "Ôn bài sau 11 giờ đêm": "Review after 11 p.m.",
  "Bàn học sạch": "A clear desk",
  "Ôn hết mục đến hạn, khi sổ đã có ít nhất 20 mục trong chu kỳ": "Clear all due reviews with at least 20 scheduled entries",
  "Vượt chỉ tiêu": "Beyond the goal",
  "Ôn gấp đôi mục tiêu ngày trong một ngày": "Review twice your daily goal in one day",
  "{n} lượt": "{n} reviews",
  "Xong mục tiêu hôm nay": "Today's goal complete",
  "Còn {n} lượt nữa là đạt": "{n} reviews left to reach your goal",
  "Ôn thêm bao nhiêu cũng được, chuỗi ngày đã tính rồi.": "Extra reviews are welcome; today's streak is already secured.",
  "Mỗi lượt ôn trong tab Học đều được tính vào đây.": "Every review in Study counts here.",
  "{n} nhớ": "{n} remembered",
  "{n} ôn lại": "{n} to review again",
  "{n} mục mới": "{n} new entries",
  "Chuỗi ngày": "Study streak",
  "Dài nhất": "Longest",
  "Tổng lượt ôn": "Total reviews",
  "Ngày có mặt": "Active days",
  "Chuỗi {days} ngày đang treo — ôn đủ {goal} lượt hôm nay là giữ được.": "Your {days}-day streak is at risk — complete {goal} reviews today to keep it.",
  "17 tuần gần đây": "Last 17 weeks",
  "Ít": "Less",
  "Nhiều": "More",
  "ngày đạt mục tiêu": "daily goal reached",
  "Huy hiệu {n}/{total}": "Badges {n}/{total}",
  "Mục tiêu mỗi ngày": "Daily goal",
  "Ôn đủ số lượt này là ngày đó được tính vào chuỗi. Đặt vừa sức thôi — chuỗi dài quan trọng hơn con số to.": "Complete this many reviews to count the day toward your streak. Choose a manageable goal; consistency matters more than a large number.",
  "Lưu mục tiêu": "Save goal",
  "Mở khoá {n} huy hiệu!": "Unlocked {n} badges!",
  "Mở khoá huy hiệu!": "Badge unlocked!",
  "Tuyệt vời, học tiếp thôi!": "Great, let's keep learning!",
  "YouTube gốc · {rate}× · đang mở đoạn câu…": "Original YouTube audio · {rate}× · opening clip…",
  "‘i’ kéo dài — như ‘i’ trong ‘si’": "A long, close front vowel, as in see.",
  "‘i’ ngắn, gọn — giữa ‘i’ và ‘ê’": "A short, relaxed front vowel, as in sit.",
  "‘e’ — như ‘e’ trong ‘em’": "A short front vowel, as in bed.",
  "‘a’ bẹt, miệng rộng — giữa ‘a’ và ‘e’": "An open front vowel, as in cat; open your mouth wide.",
  "‘â’ — như ‘â’ trong ‘cấp’": "A short central vowel, as in cup.",
  "‘a’ kéo dài, tròn miệng": "A long open vowel, as in British car.",
  "‘o’ ngắn (giọng Anh-Anh)": "A short rounded back vowel in British hot.",
  "‘o’ kéo dài, tròn môi — gần ‘aw’": "A long rounded back vowel, as in British law.",
  "‘u’ ngắn, gọn": "A short, relaxed rounded vowel, as in put.",
  "‘u’ kéo dài — như ‘u’ trong ‘thu’": "A long rounded back vowel, as in food.",
  "‘ơ’ kéo dài, cong lưỡi nhẹ": "A long central vowel, as in non-rhotic British bird.",
  "‘ơ’ rất nhẹ, không nhấn (schwa)": "Schwa: a short, weak, unstressed central vowel.",
  "‘ây’ — như ‘ây’ trong ‘mây’": "Glide from /e/ toward /ɪ/, as in day.",
  "‘ai’ — như ‘ai’ trong ‘mai’": "Glide from an open vowel toward /ɪ/, as in my.",
  "‘oi’ — như ‘oi’ trong ‘coi’": "Glide from /ɔ/ toward /ɪ/, as in boy.",
  "‘ao’ — như ‘ao’ trong ‘cao’": "Glide from an open vowel toward /ʊ/, as in now.",
  "‘âu’ (Anh-Anh) / ‘ou’": "The British go vowel: glide from /ə/ toward /ʊ/.",
  "‘ou’ (Anh-Mỹ) — như ‘gâu’": "The American go vowel: glide from /o/ toward /ʊ/.",
  "‘i-ơ’ trượt nhanh": "Glide from /ɪ/ toward /ə/, as in some British pronunciations of here.",
  "‘e-ơ’ trượt nhanh": "Glide from /e/ toward /ə/, as in some British pronunciations of hair.",
  "‘u-ơ’ trượt nhanh": "Glide from /ʊ/ toward /ə/, as in some British pronunciations of tour.",
  "‘p’ bật hơi": "Close both lips, then release; often aspirated at a stressed syllable's start.",
  "‘b’": "Like /p/, but with vocal-fold vibration.",
  "‘t’ bật hơi": "Touch the ridge behind the upper teeth, then release with air.",
  "‘đ’": "Like /t/, but voiced.",
  "‘c/k’ bật hơi": "Raise the back of the tongue, then release with air.",
  "‘g’ (gờ)": "Like /k/, but voiced.",
  "‘ch’": "An unvoiced affricate, as in chair.",
  "‘g/j’ — như ‘j’, hơi ‘gi’": "The voiced counterpart of /tʃ/, as in joy.",
  "‘ph/f’": "Let air pass between the upper teeth and lower lip.",
  "‘v’ (răng chạm môi)": "Like /f/, but voiced.",
  "‘th’ vô thanh — đặt lưỡi giữa hai hàm răng": "Unvoiced th: place the tongue lightly between the teeth.",
  "‘đ’ hữu thanh — lưỡi giữa răng, rung": "Voiced th: use the /θ/ position with vocal-fold vibration.",
  "‘x/s’": "An unvoiced hissing sound.",
  "‘z’ — s rung, như ‘dz’": "Like /s/, but voiced.",
  "‘s’ nặng — như ‘sh’": "Unvoiced sh, as in she.",
  "‘gi’ rung — như ‘zh’": "Voiced zh, as in vision.",
  "‘h’": "A breathy sound from the open throat.",
  "‘m’": "Close both lips and let the voice pass through the nose.",
  "‘n’": "Touch the ridge behind the upper teeth; let the voice pass through the nose.",
  "‘ng’ cuối — như ‘ng’ trong ‘sang’": "The final sound of sing; raise the back of the tongue.",
  "‘l’": "Touch the ridge behind the upper teeth with the tongue tip.",
  "‘r’ cong lưỡi, không rung": "An English r: do not tap or trill the tongue.",
  "‘y’ — như ‘i’ trong ‘yêu’": "A y-like glide, as in yes.",
  "‘u/w’ — như ‘qu’ nhẹ": "Round the lips, then glide into the following vowel.",
  "dấu NHẤN CHÍNH — âm tiết ngay sau được đọc mạnh, cao hơn": "Primary stress: emphasize the following syllable.",
  "dấu nhấn phụ — nhấn nhẹ hơn nhấn chính": "Secondary stress: a weaker emphasis than primary stress.",
  "kéo dài nguyên âm liền trước": "Lengthen the preceding vowel.",
  "Chinh phục núi Phú Sĩ": "Climb Mount Fuji",
  "Leo 9 hợp mục, mỗi chương một trạm, để đón bình minh trên đỉnh Phú Sĩ.": "Climb nine stations, one chapter at each stop, to greet the sunrise on Mount Fuji.",
  "1合目 · Chân núi": "1st station · Foothills",
  "2合目 · Rừng tùng sương mù": "2nd station · Misty pine forest",
  "3合目 · Suối trong vắt": "3rd station · Clear stream",
  "4合目 · Vách đá rêu phong": "4th station · Mossy cliffs",
  "5合目 · Trạm năm": "5th station · Midway stop",
  "6合目 · Đường đá núi lửa": "6th station · Volcanic trail",
  "7合目 · Trên biển mây": "7th station · Above the clouds",
  "8合目 · Gió buốt trời hửng": "8th station · Cold winds at dawn",
  "9合目 · Sát đỉnh": "9th station · Near the summit",
  "Đỉnh Phú Sĩ": "Mount Fuji summit",
  "Lặn biển Okinawa tìm ngọc trai": "Dive for Okinawa's pearl",
  "Lặn sâu 9 tầng nước, mỗi chương một tầng, để vớt viên ngọc trai khổng lồ dưới đáy biển.": "Dive through nine depths, one chapter at each level, to find the giant pearl on the seabed.",
  "10m · Rạn san hô nông": "10 m · Shallow coral reef",
  "20m · Rừng tảo bẹ": "20 m · Kelp forest",
  "30m · Xác tàu đắm": "30 m · Shipwreck",
  "40m · Hang đá ngầm": "40 m · Underwater cave",
  "50m · Vách đá sâu": "50 m · Deep cliffs",
  "60m · Vùng nước tối": "60 m · Dark waters",
  "70m · Đàn cá phát sáng": "70 m · Glowing fish",
  "80m · Rãnh sâu": "80 m · Deep trench",
  "90m · Cửa hang ngọc": "90 m · Pearl cave entrance",
  "Đáy biển · Ngọc trai khổng lồ": "Seabed · The giant pearl",
  "Tàu đêm đến ngày hội pháo hoa": "Night train to the fireworks festival",
  "Làng suối nước nóng trong tuyết": "A snowy hot-spring village",
  "Con đường hoa anh đào Kyoto": "Kyoto's cherry-blossom path",
  "chữ Hán": "kanji",
  "Đã lưu từ và câu ngữ cảnh cho Gemini, bài nghe và luyện ngữ pháp.": "Word and context sentence saved for Gemini, listening, and grammar practice.",
  "Đã lưu từ, chưa đọc được câu: cần bật Cho phép truy cập URL của tệp cho RaKuLanG trong chrome://extensions.": "Word saved, but context is missing: enable “Allow access to file URLs” for RaKuLanG in chrome://extensions.",
  "Đã lưu từ, chưa đọc được câu: bộ đọc PDF của extension bị thiếu hoặc hỏng. Hãy cập nhật đầy đủ thư mục extension rồi bấm Tải lại.": "Word saved, but the PDF reader is missing or damaged. Update the complete extension folder and click Reload.",
  "Đã lưu từ, chưa tìm được câu chứa từ trong lớp chữ của PDF.": "Word saved, but no matching sentence was found in the PDF text layer.",
  "Đã lưu từ, chưa đọc được ngữ cảnh từ nguồn này.": "Word saved, but context could not be read from this source."
});
  Object.assign(ja, {
  "Loại từ": "品詞",
  "Màu loại từ tiếng Nhật · Kuromoji/IPADIC": "日本語の品詞色分け · Kuromoji/IPADIC",
  "Chưa nạp được bộ phân tích. Tắt/bật Loại từ để thử lại.": "解析器を読み込めませんでした。「品詞」をオフにしてから再度オンにしてください。",
  "Lưu câu này rồi hỏi Gemini về nó": "この文を保存してGeminiに質問",
  "Gemini": "Gemini",
  "Hỏi Gemini về câu này — link đoạn chat sẽ lưu vào mục trong sổ tay": "この文をGeminiに質問 — チャットのリンクを単語帳の項目に保存します",
  "Hỏi Gemini về câu này (lưu vào sổ trước thì link đoạn chat mới được giữ lại)": "この文をGeminiに質問（チャットのリンクを残すには、先に単語帳に保存してください）",
  "Quá hạn chờ": "応答がタイムアウトしました",
  "đang đóng băng": "凍結中",
  "hiện lúc {gio}": "{gio}に表示",
  "đến hạn — đợi tới lượt": "復習期限 — 順番待ち",
  "{d}/100 · {b}": "{d}/100 · {b}",
  "Từ này đã xoá khỏi sổ tay nên không tự thêm lại. Bạn vẫn tiếp tục bài JLPT.": "この単語は単語帳から削除済みのため、自動では追加しません。JLPTの練習は続けられます。",
  "Hiện thêm {n} mục": "さらに{n}件を表示",
  "Chọn từ này": "この単語を選択",
  "Đã chọn {n}": "{n}件を選択中",
  "Bỏ chọn tất cả": "すべて選択解除",
  "Chọn tất cả ({n})": "すべて選択（{n}件）",
  "Không xoá được — đã nạp lại sổ tay.": "削除できませんでした。単語帳を再読み込みしました。",
  "Đã xoá {n} từ": "{n}語を削除しました",
  "Đã khôi phục": "復元しました",
  "Dịch câu": "文を翻訳",
  "Không cập nhật được hàng đợi. Hãy mở lại buổi học.": "学習キューを更新できませんでした。学習を開き直してください。",
  "Dòng mờ là chưa đủ mẫu (dưới {c} lượt). Đủ mẫu rồi thì bậc nào nhớ dưới 80% là đang quá dài với bạn, trên 95% là đang ôn thừa.": "薄い行はサンプル不足（{c}回未満）です。十分な回数がある場合、正答率80%未満なら間隔が長すぎ、95%超なら復習が多すぎる目安です。",
  "Tắt nhạc nền": "BGMをオフ",
  "Bật nhạc nền": "BGMをオン",
  "Ôn thi JLPT": "JLPT対策",
  "Mỗi cấp là một màn chơi, mở sẵn song song — chọn cấp hợp với trình độ của bạn. Chọn bất kỳ chặng nào. Hoàn thành tất cả chặng để mở bài kiểm tra cuối.": "各レベルは最初から選べます。好きなレベルとステージから学びましょう。全ステージを完了すると最終テストが開きます。",
  "chặng": "ステージ",
  "Chưa chơi": "未開始",
  "Bấm để vào": "タップして開始",
  "Sắp có": "準備中",
  "Sẽ mở ngay khi có dữ liệu giáo trình của cấp này.": "このレベルの教材データが追加されると利用できます。",
  "Chế độ thử: mở khoá tất cả màn và chặng (để xem thử)": "プレビューモード：全レベルと全ステージを開放",
  "Ngọc": "宝石",
  "Chuỗi ngày học liên tiếp": "連続学習日数",
  "Đang mở màn…": "レベルを開いています…",
  "Không nạp được dữ liệu màn này.": "このレベルのデータを読み込めませんでした。",
  "Quay lại": "戻る",
  "Nhật ký câu chuyện": "物語の記録",
  "Chưa nhặt được": "未獲得",
  "khoá": "ロック中",
  "Tiếp theo": "次へ",
  "Chưa có đoạn nào. Bấm vào một chặng để nghe nhân vật kể tiếp!": "まだ記録がありません。ステージを開いて物語を進めましょう！",
  "Trùm cuối": "最終チャレンジ",
  "Trùm chương": "章末チャレンジ",
  "Chữ Hán": "漢字",
  "Bài": "課",
  "Đề tổng hợp toàn màn, 30 câu. Mở sau khi hoàn thành mọi chặng.": "全レベルの内容を含む30問のテストです。全ステージ完了後に開きます。",
  "Đề tổng hợp của cả chương, 20 câu. Bạn có thể làm bất cứ lúc nào.": "章全体を含む20問のテストです。いつでも挑戦できます。",
  "từ vựng": "語彙",
  "mẫu ngữ pháp": "文型",
  "câu hỏi": "問",
  "làm hết câu hỏi để hoàn thành": "全問に答えると完了",
  "Điểm cao nhất": "最高得点",
  "Nghe lại câu chuyện": "物語をもう一度",
  "Bài kiểm tra cuối đang khoá: hãy hoàn thành tất cả chặng trước.": "最終テストはロック中です。先に全ステージを完了してください。",
  "Làm bài ngay": "すぐに問題へ",
  "Đi thôi!": "出発！",
  "Thoát lượt này? Tiến độ của lượt đang chơi sẽ không được lưu.": "このラウンドを終了しますか？現在のラウンドの進捗は保存されません。",
  "Ở lại": "続ける",
  "Thoát": "終了",
  "Chưa lưu được thẻ sang Học. Hãy thử lại.": "カードを学習に追加できませんでした。もう一度お試しください。",
  "Học nhanh": "クイック学習",
  "Hán Việt": "漢越音",
  "Chạm để lật thẻ": "タップしてカードを裏返す",
  "Trước": "前へ",
  "Học lại": "もう一度学ぶ",
  "Nhớ rồi": "覚えた",
  "Bắt đầu thử thách": "チャレンジを開始",
  "Vuốt thẻ sang phải = đã nhớ · sang trái = học lại · chạm để lật": "右にスワイプ：覚えた · 左：もう一度 · タップ：裏返す",
  "Bỏ qua phần học": "学習をスキップ",
  "Chặng này chưa dựng được câu hỏi.": "このステージの問題を作成できませんでした。",
  "Ôn lại câu sai": "間違えた問題を復習",
  "Chưa lưu được thẻ sang Học. Bấm lại đáp án để thử lưu.": "カードを学習に追加できませんでした。答えをもう一度タップすると再試行します。",
  "Chưa đúng": "不正解",
  "Báo câu sai": "問題を報告",
  "Đã ghi nhận. Câu này sẽ không xuất hiện lại.": "報告しました。この問題は再表示しません。",
  "Tiếp tục": "続ける",
  "Hoàn thành màn!": "レベル完了！",
  "Vượt chặng!": "ステージ完了！",
  "Chưa hoàn thành": "未完了",
  "câu đúng": "問正解",
  "Hãy làm hết lượt để hoàn thành.": "全問に答えるとラウンドが完了します。",
  "Kỷ lục mới!": "新記録！",
  "Các câu sai": "間違えた問題",
  "Chơi lại": "もう一度挑戦",
  "Lịch từng đường": "スキル別の復習予定",
  "Hẹn lại tính từ hôm nay. Đóng băng giữ nguyên điểm và lịch; mở lại tiếp tục theo lịch đó.": "再設定の日数は今日から数えます。凍結中も得点と予定を保持し、解除後はその予定で再開します。",
  "Toàn bộ từ đang đóng băng": "この単語の全スキルは凍結中です",
  "Chưa có dữ liệu cho bài này": "この練習のデータはまだありません",
  "Hẹn ôn: ": "復習予定：",
  "Đến hạn": "復習期限",
  "Số ngày": "日数",
  "Mục đã bị xoá.": "この項目は削除されました。",
  "Đã lưu lịch riêng.": "スキル別の予定を保存しました。",
  "Chưa lưu được. Hãy thử lại.": "保存できませんでした。もう一度お試しください。",
  "{m} câu mới · {d} câu đến hạn · {t} câu tổng cộng": "新規{m}文 · 復習{d}文 · 全{t}文",
  "Luyện tất cả": "すべて練習",
  "Không đọc được lịch. Hãy thử lại.": "予定を読み込めませんでした。もう一度お試しください。",
  "Đã hết câu đến hạn. Bạn vẫn có thể luyện tất cả.": "期限の来た文はありません。すべての文を自由に練習できます。",
  "Ôn theo lịch ngữ pháp": "文法の予定に沿って復習",
  "Luyện tự do · không thay đổi lịch": "自由練習 · 復習予定は変更しません",
  "Lịch đã thay đổi hoặc câu không còn trong sổ. Lượt này không tăng cấp.": "予定が変更されたか、文が単語帳にありません。今回はレベルを上げません。",
  "Cấp ngữ pháp {lv} · ôn lại sau {n} ngày": "文法レベル{lv} · {n}日後に復習",
  "Chưa lưu được lịch. Bấm Câu tiếp để thử lưu lại.": "予定を保存できませんでした。「次の文」で再試行してください。",
  "Chưa khớp câu gốc. Chạm mảnh trong câu để đổi chỗ rồi thử lại.": "元の文と一致しません。文のパーツをタップして並べ替え、もう一度お試しください。",
  "Củng cố · không tăng cấp": "定着練習 · レベル変更なし",
  "Đang lưu màu…": "色を保存しています…",
  "Đã lưu màu giao diện.": "テーマカラーを保存しました。",
  "Chưa lưu được màu. Hãy chọn lại.": "色を保存できませんでした。もう一度選んでください。",
  "Màu giao diện": "テーマカラー",
  "Chọn màu pastel yêu thích. Áp dụng ngay và tự lưu trên máy này.": "好きなパステルカラーを選べます。すぐに反映し、この端末に自動保存します。",
  "Xanh dương": "ブルー",
  "Bạc hà": "ミント",
  "Hồng": "ピンク",
  "Đào": "ピーチ",
  "Lavender": "ラベンダー",
  "Vàng kem": "クリームイエロー",
  "RaKuLanG · Sổ tay và đọc báo": "RaKuLanG · 単語帳とニュース",
  "‹ RaKuLanG": "‹ RaKuLanG",
  "Tra RaKuLanG": "RaKuLanGで検索",
  "Đang mở bài…": "記事を開いています…",
  "Bản đã lưu trên máy": "この端末に保存した記事",
  "Chưa mở được bài. Kiểm tra mạng hoặc bấm tải lại.": "記事を開けませんでした。接続を確認するか、再読み込みしてください。",
  "Trang đã đóng để giải phóng bộ nhớ. Hãy mở lại bài.": "メモリ確保のためページを閉じました。記事を開き直してください。",
  "Tải lại": "再読み込み",
  "Dễ đọc": "読みやすく表示",
  "Lưu bài": "記事を保存",
  "Đã lưu vào sổ tay NeutronDict": "RaKuLanGの単語帳に保存しました",
  "Bôi đen từ rồi bấm Tra NeutronDict.": "単語を選択して「RaKuLanGで検索」をタップしてください。",
  "Chưa tra được từ.": "単語を検索できませんでした。",
  "Chưa lấy được nội dung bài.": "記事の本文を取得できませんでした。",
  "Không lưu được bài.": "記事を保存できませんでした。",
  "Đã lưu bài để đọc ngoại tuyến": "オフライン閲覧用に記事を保存しました",
  "Mở lại NeutronDict rồi thử tra lại.": "RaKuLanGを開き直して、もう一度検索してください。",
  "Tra từ chưa phản hồi. Kiểm tra mạng và thử lại.": "検索の応答がありません。接続を確認して、もう一度お試しください。",
  "Không lưu được cấu hình giọng đọc.": "音声設定を保存できませんでした。",
  "Đường dẫn YouTube không hợp lệ.": "YouTubeのURLが無効です。",
  "Chỉ mở địa chỉ HTTPS.": "HTTPSのアドレスのみ開けます。",
  "Nguồn tin phải là địa chỉ Internet công khai.": "ニュース配信元には公開インターネットアドレスを使用してください。",
  "Đường dẫn nguồn không hợp lệ.": "配信元のURLが無効です。",
  "Tối đa 12 nguồn tin.": "配信元は12件まで追加できます。",
  "Chu kỳ không hợp lệ.": "更新間隔が無効です。",
  "Nguồn RSS phải dùng HTTPS.": "RSSの配信元にはHTTPSを使用してください。",
  "Mã ngôn ngữ không hợp lệ.": "言語コードが無効です。",
  "Không lưu được nguồn.": "配信元を保存できませんでした。",
  "Chưa tải được nguồn.": "配信元を読み込めませんでした。",
  "Không lưu được tin.": "ニュースを保存できませんでした。",
  "Nguồn vượt giới hạn 4 MB.": "配信データが上限の4 MBを超えています。",
  "XML không an toàn hoặc quá lớn.": "XMLが安全でないか、サイズが大きすぎます。",
  "XML chứa DTD.": "XMLにDTDが含まれています。",
  "Bài báo không hợp lệ.": "記事が無効です。",
  "Đã có 200 bài đánh dấu. Hãy bỏ bớt bài cũ.": "保存済みの記事が200件あります。古い記事をいくつか削除してください。",
  "Mã vùng Azure không hợp lệ.": "Azureのリージョンコードが無効です。",
  "Khóa Azure không hợp lệ.": "Azureのキーが無効です。",
  "Đang dùng giọng trên máy.": "端末の音声を使用しています。",
  "Azure tạm hết lượt hoặc chưa khả dụng · dùng giọng trên máy.": "Azureが利用できないか上限に達しています · 端末の音声を使用します。",
  "Đã chạm giới hạn Azure của app tháng này · dùng giọng trên máy.": "アプリ内のAzure月間上限に達しました · 端末の音声を使用します。",
  "Chưa có khóa Azure hợp lệ · dùng giọng trên máy.": "有効なAzureキーがありません · 端末の音声を使用します。",
  "Vùng Azure không hợp lệ.": "Azureのリージョンが無効です。",
  "Azure chưa khả dụng · dùng giọng trên máy.": "Azureを利用できません · 端末の音声を使用します。",
  "Audio không hợp lệ.": "音声データが無効です。",
  "Azure lỗi hoặc mất mạng · dùng giọng trên máy.": "Azureのエラーまたは接続切れです · 端末の音声を使用します。",
  "Vào thi": "テストに挑戦",
  "Bắt đầu": "開始",
  "Chính xác!": "正解！",
  "Tuyệt vời!": "すばらしい！",
  "Quá đỉnh!": "最高！",
  "Giỏi lắm!": "よくできました！",
  "Chuẩn rồi!": "その通り！",
  "Tra \"%s\" bằng RaKuLanG": "RaKuLanGで「%s」を検索",
  "Lưu \"%s\" vào RaKuLanG (kèm nguồn)": "「%s」をRaKuLanGに保存（出典付き）",
  "Từ này đã được xóa. Khôi phục trong sổ tay trước khi lưu lại.": "この単語は削除済みです。再保存するには、先に単語帳で復元してください。",
  "Đã nhận {n} mục từ YouTube": "YouTubeから{n}件を受け取りました",
  "Thao tác không hợp lệ.": "無効な操作です。",
  "Đang cập nhật tin…": "ニュースを更新しています…",
  "Đang mở danh sách…": "一覧を開いています…",
  "Cập nhật {time}": "更新：{time}",
  "Chưa có tin — bấm Cập nhật": "ニュースはまだありません。「更新」をタップしてください",
  "Đã lưu đọc offline": "オフライン閲覧用に保存済み",
  "★ Đã đánh dấu": "★ 保存済み",
  "☆ Đọc sau": "☆ あとで読む",
  "Chưa có bài phù hợp. Thêm nguồn hoặc cập nhật tin.": "該当する記事がありません。配信元を追加するか、ニュースを更新してください。",
  "Xóa": "削除",
  "Màn hình {screen}": "画面：{screen}",
  "Xem tất cả tin": "すべてのニュース",
  "★ Bài đã lưu": "★ 保存した記事",
  "Dùng địa chỉ HTTPS của nguồn RSS/Atom.": "RSS/Atom配信元のHTTPSアドレスを入力してください。",
  "TTS không khả dụng": "音声読み上げを利用できません",
  "Tự động · giọng trên máy": "自動 · 端末の音声",
  " · cần mạng": " · インターネット接続が必要",
  "Hãy cài giọng đọc cho ngôn ngữ này.": "この言語の音声をインストールしてください。",
  "Đã lưu khóa · bỏ trống để giữ nguyên": "キー保存済み · 変更しない場合は空欄",
  "Khóa Azure Speech F0": "Azure Speech F0のキー",
  "Đã lưu. Azure lỗi hoặc hết lượt sẽ dùng TTS trên máy.": "保存しました。Azureのエラーや上限到達時は端末の音声を使用します。",
  "Đã xóa khóa Azure.": "Azureのキーを削除しました。",
  "Dữ liệu từ không hợp lệ.": "単語データが無効です。",
  "Sổ tay hiện hỗ trợ tiếng Nhật và tiếng Anh; bạn vẫn đọc và dịch được ngôn ngữ này.": "単語帳は現在、日本語と英語に対応しています。この言語の記事の閲覧や翻訳はできます。",
  "Chưa có từ để lưu.": "保存する単語がありません。",
  "Bài báo": "記事",
  "Hãy chọn một từ hoặc cụm ngắn.": "単語または短いフレーズを選択してください。",
  "Chưa lấy được nghĩa. Kiểm tra mạng và thử lại.": "意味を取得できませんでした。接続を確認して再試行してください。",
  "Không tìm thấy thẻ JLPT.": "JLPTカードが見つかりません。",
  "Thẻ JLPT thiếu từ.": "JLPTカードに単語がありません。",
  "Ghép câu ngữ pháp": "文法の並べ替え",
  "Đúng một lần là đóng băng câu": "一度正解すると文を凍結",
  "Hẹn lại": "予定を変更",
  "Mở lại đường này": "このスキルの凍結を解除",
  "Đóng băng đường này": "このスキルを凍結",
  "Dùng lịch tự động": "自動スケジュールを使用",
  "TTS · chưa có mốc âm thanh gốc khớp toàn câu": "TTS · 文全体に対応する元音声の時刻がありません",
  "YouTube gốc · {rate}×": "YouTubeの元音声 · {rate}倍",
  "{rate}× · đang mở đoạn câu…": "{rate}倍 · 文の区間を開いています…",
  "Đã nghe YouTube gốc · {rate}×": "YouTubeの元音声を再生済み · {rate}倍",
  "Đã dừng đoạn YouTube · bấm Nghe để phát lại": "YouTubeの区間を停止しました · 「聞く」で再生",
  "TTS · mở YouTube một lần để hoàn tất thiết lập nghe giọng gốc": "TTS · 元音声の設定を完了するため、一度YouTubeを開いてください",
  "Chưa phát được YouTube gốc · đang dùng TTS {rate}×": "YouTubeの元音声を再生できませんでした · TTSを{rate}倍で使用",
  "NGỮ PHÁP · GHÉP CÂU": "文法 · 並べ替え",
  "Ghép tối đa 4 mảnh thành câu gốc. Đúng một lần là đóng băng riêng câu này.": "最大4つのパーツを並べて元の文を作ります。一度正解すると、この文を凍結します。",
  "Từ đã lưu: {word}": "保存した単語：{word}",
  "Kiểm tra": "答え合わせ",
  "Chạm các mảnh theo thứ tự": "順番にパーツをタップ",
  "Chưa đúng. Hãy đổi thứ tự các mảnh rồi thử lại.": "不正解です。パーツを並べ替えて、もう一度お試しください。",
  "Câu đã thay đổi. Hãy mở lại buổi học.": "文が変更されました。学習を開き直してください。",
  "Xem đáp án chưa tính là thuộc.": "答えを見るだけでは、覚えたことにはなりません。",
  "Đúng rồi — câu này đã đóng băng.": "正解です。この文を凍結しました。",
  "Chưa lấy được bản dịch.": "訳を取得できませんでした。",
  "Chưa lưu được: {error} Bấm Kiểm tra để thử lại.": "保存できませんでした：{error} 「答え合わせ」で再試行してください。",
  "Kết quả ngữ pháp không hợp lệ.": "文法の結果が無効です。",
  "Nghe rồi chọn nghĩa đúng": "聞いて正しい意味を選んでください",
  "Chọn nghĩa đúng": "正しい意味を選んでください",
  "Chọn từ có nghĩa này": "この意味の単語を選んでください",
  "Chọn cách đọc đúng": "正しい読み方を選んでください",
  "Điền từ vào chỗ trống": "空欄に入る単語を選んでください",
  "Âm Hán Việt của chữ này": "この漢字の漢越音",
  "Âm On của chữ này": "この漢字の音読み",
  "Chọn chữ Hán có âm Hán Việt này": "この漢越音の漢字を選んでください",
  "Mẫu ngữ pháp này có nghĩa": "この文型の意味",
  "Điền mẫu ngữ pháp vào chỗ trống": "空欄に入る文型を選んでください",
  "Không còn mục để chỉnh lịch.": "予定を変更する項目がありません。",
  "Nhập số ngày từ 1 đến 3650.": "1〜3650の日数を入力してください。",
  "Thao tác lịch không hợp lệ.": "予定の操作が無効です。",
  "Không đọc được bản thu": "録音を読み込めませんでした",
  "Máy này không ghi âm được": "この端末では録音できません",
  "Bản thu rỗng": "録音データが空です",
  "Trình duyệt chưa hỗ trợ khóa ghi dùng chung. Hãy cập nhật Chrome/Edge.": "このブラウザは共有書き込みロックに対応していません。ChromeまたはEdgeを更新してください。",
  "Danh từ": "名詞",
  "Động từ": "動詞",
  "Tính từ": "形容詞",
  "Trạng từ": "副詞",
  "Đại từ": "代名詞",
  "Liên từ": "接続詞",
  "Trợ từ / trợ động từ": "助詞・助動詞",
  "Khác": "その他",
  "Hiện phụ đề": "字幕を表示",
  "Bấm Thử lại; còn không thì báo lại để sửa. (khung: {kh} · thẻ quen: {the})": "「再試行」をタップしてください。解決しない場合は報告してください。（フレーム：{kh} · 既知カード：{the}）",
  "Cài đặt": "設定",
  "Đồng bộ, âm thanh và tuỳ chỉnh ứng dụng.": "同期、音声、アプリの設定。",
  "Dán & tra": "貼り付けて検索",
  "Nhập một từ để tra, hoặc bấm “Dán & tra”.": "単語を入力するか、「貼り付けて検索」をタップしてください。",
  "Giọng đọc và bài nghe": "音声とリスニング",
  "Giọng Nhật dự phòng": "日本語の予備音声",
  "Nghe thử tiếng Nhật": "日本語の音声を試す",
  "Giọng Anh dự phòng": "英語の予備音声",
  "Nghe thử tiếng Anh": "英語の音声を試す",
  "Cài thêm giọng trên máy": "端末の音声を追加",
  "Azure Neural · tuỳ chọn": "Azure Neural · 任意",
  "Dùng tài nguyên Speech gói F0 miễn phí. Âm thanh được lưu lại; hết lượt hoặc lỗi sẽ chuyển sang giọng trên máy. App không đổi gói Azure. Giới hạn đếm trong app là 450.000 ký tự/tháng trên máy này, không thay thế hạn mức tài khoản Azure.": "無料のF0 Speechリソースを使用します。音声はキャッシュされ、エラーや上限到達時は端末の音声に切り替わります。アプリはAzureのプランを変更しません。端末内の上限は月45万文字で、Azureアカウントの実際の上限とは別です。",
  "Dùng Azure cho bài nghe Nhật / Anh": "日本語・英語のリスニングにAzureを使用",
  "Vùng tài nguyên": "リソースのリージョン",
  "Khóa Speech": "Speechのキー",
  "Lưu Azure": "Azure設定を保存",
  "Xóa khóa": "キーを削除",
  "▤ Đọc báo": "▤ ニュース",
  "✦ Trợ lý AI": "✦ AIアシスタント",
  "RAKULANG · KHÁM PHÁ": "RAKULANG · 見つける",
  "Thế giới qua từng câu chữ": "一文から世界を知る",
  "Đọc điều bạn thích. Bôi đen từ, bấm Tra RaKuLanG để xem nghĩa và lưu cả câu vào sổ tay.": "好きな記事を読みましょう。単語を選択して「RaKuLanGで検索」をタップすると、意味を調べて文ごと単語帳に保存できます。",
  "Mọi ngôn ngữ": "すべての言語",
  "Cập nhật": "更新",
  "Nguồn tin và cập nhật": "配信元と更新",
  "Cập nhật nền": "バックグラウンド更新",
  "15 phút": "15分",
  "30 phút": "30分",
  "1 giờ": "1時間",
  "2 giờ": "2時間",
  "Android có thể trì hoãn cập nhật để tiết kiệm pin. Mỗi nguồn cung cấp số lượng bài khác nhau.": "省電力のため、Androidが更新を遅らせる場合があります。記事の件数は配信元によって異なります。",
  "Tiếng Anh · English": "英語 · English",
  "Tiếng Nhật · 日本語": "日本語",
  "Tiếng Pháp": "フランス語",
  "Tiếng Đức": "ドイツ語",
  "Tiếng Hàn": "韓国語",
  "Tiếng Trung": "中国語",
  "Français": "フランス語",
  "Thêm nguồn": "配信元を追加",
  "Xem thêm": "もっと見る",
  "Lọc tiêu đề, nguồn báo…": "見出し・配信元で絞り込む…",
  "https://… nguồn RSS/Atom": "https://… RSS/Atom配信元",
  "Tên nguồn": "配信元の名前",
  "Ghép các mảnh bị xáo trộn thành câu tiếng Nhật gốc chứa từ bạn đã lưu. Mỗi câu có tối đa 4 mảnh. Ngữ pháp nằm trong chế độ Học; làm đúng một lần sẽ đóng băng riêng câu này.": "保存した単語を含む元の日本語文を、最大4つのパーツで並べ替えます。文法は学習モードに含まれ、一度正解するとその文を凍結します。",
  "Ôn ngữ pháp đến hạn và câu mới": "期限の文と新しい文を練習",
  "Câu tiếp": "次の文",
  "Xuất & sao lưu": "エクスポート・バックアップ",
  "Xuất CẢ SỔ (cả hai thứ tiếng), mang đủ link và phút video, mở bằng Excel được. Nạp vào thì chỉ THÊM từ mới, không đè lên bản dịch bạn đã tự sửa.": "両言語の単語帳全体を、リンクと動画時刻付きでExcel対応形式に書き出します。取り込み時は新しい単語のみ追加し、編集済みの訳は上書きしません。",
  "Cho trợ lý AI khác (ChatGPT, Gemini…) đọc được lời thoại: đặt thêm một bản chữ khuất mắt vào trang YouTube": "他のAI（ChatGPT、Geminiなど）が字幕を読めるよう、YouTubeページに非表示のテキストを追加",
  "Bôi đen phát nào popup cũng chạy cả tra từ lẫn dịch câu và xếp vào các tab — chỉ đoạn dài hơn số trên mới bỏ qua phần từ điển, vì tra nguyên đoạn như một từ thì chắc chắn rỗng. Tắt popup thì vẫn dùng được phím tắt và chuột phải như cũ.": "文字を選択すると、ポップアップの各タブで単語検索と文の翻訳を行います。上限より長い選択では辞書検索を省略します。ポップアップをオフにしても、ショートカットと右クリックは使えます。",
  "Mỗi lượt ôn ghi lại: app đã bắt bạn chờ bao nhiêu ngày ở bậc nào, và tới lúc gặp lại bạn có nhớ không. Đây là thứ duy nhất nói được thang giãn cách có hợp với bạn hay không — mọi con số trong thang là mặc định của app, không phải đo từ bạn.": "復習ごとにレベル、待った日数、覚えていたかを記録します。この履歴から間隔が自分に合うか確認できます。初期間隔は既定値であり、個人の記憶から測定した値ではありません。",
  "Bỏ chọn": "選択解除",
  "đóng": "閉じる",
  "Xin chào, mình là": "こんにちは、私は",
  "(P.C.N) — cựu sinh viên ngành": "（P.C.N）です。専攻は",
  "Tự động hoá, Đại học Bách Khoa Hà Nội": "ハノイ工科大学のオートメーション",
  ", quê": "、出身は",
  ", một người mê": "。好きなことは",
  "nghiên cứu công nghệ": "技術の探究",
  "Mình làm dự án này như một món quà hiến tặng cộng đồng học tập — một công cụ nhỏ mà mạnh mẽ, đồng hành cùng bạn trên hành trình chinh phục tiếng Nhật & tiếng Anh. Nếu nó giúp ích cho việc học của bạn, thì mình đã hạnh phúc rồi.": "このプロジェクトは学習コミュニティへの贈り物です。日本語と英語の学習を支える、小さくても役立つ道具を目指しました。皆さんの学習に役立てばうれしいです。",
  "Mình làm dự án này như một món quà hiến tặng cộng đồng học tập — một công cụ nhỏ mà mạnh mẽ, đồng hành cùng bạn trên hành trình chinh phục tiếng Nhật & tiếng Anh.": "このプロジェクトは学習コミュニティへの贈り物です。日本語と英語の学習を支える、小さくても役立つ道具を目指しました。",
  "Hướng dẫn đọc IPA — RaKuLanG": "IPA発音ガイド — RaKuLanG",
  "🔤 Hướng dẫn đọc IPA tiếng Anh": "🔤 英語のIPA発音ガイド",
  "Bảng ký hiệu phiên âm quốc tế (IPA) kèm từ ví dụ và gợi ý đọc gần đúng bằng tiếng Việt. Bấm 🔊 để nghe ví dụ.": "国際音声記号（IPA）を、例語と発音のヒントで学べます。🔊で例語を聞けます。",
  "Mẹo:": "ヒント：",
  "gợi ý tiếng Việt chỉ là “gần đúng” để dễ hình dung — âm tiếng Anh không trùng khớp hoàn toàn với âm tiếng Việt. Dấu": "発音の説明はあくまで目安です。例語の音声で実際の音を確認してください。記号",
  "đứng trước âm tiết được": "は、次の音節に置く",
  "nhấn mạnh": "強勢",
  "(đọc to & cao hơn), ví dụ": "を示します。たとえば",
  "danh từ /ˈrɛkɔːd/ khác động từ /rɪˈkɔːd/.": "名詞の /ˈrɛkɔːd/ と動詞の /rɪˈkɔːd/ は異なります。",
  "Nguyên âm (Vowels)": "母音",
  "Nguyên âm đôi (Diphthongs)": "二重母音",
  "Phụ âm (Consonants)": "子音",
  "Nghe ví dụ": "例語を聞く",
  "{n} nét": "{n}画",
  "Bộ: {radical}": "部首：{radical}",
  "Hạt giống": "芽生え",
  "Ôn lượt đầu tiên trong app": "初めての復習を完了",
  "Đúng hẹn": "予定どおり",
  "Đạt mục tiêu ngày lần đầu tiên": "初めて一日の目標を達成",
  "Ba ngày liền": "3日連続",
  "Giữ chuỗi 3 ngày liên tiếp": "3日間の連続学習",
  "Trọn một tuần": "一週間達成",
  "Giữ chuỗi 7 ngày liên tiếp": "7日間の連続学習",
  "Một tháng bền bỉ": "一か月の積み重ね",
  "Giữ chuỗi 30 ngày liên tiếp": "30日間の連続学習",
  "Trăm ngày": "百日達成",
  "Giữ chuỗi 100 ngày liên tiếp": "100日間の連続学習",
  "100 lượt ôn": "復習100回",
  "Ôn 100 lượt trong app": "復習を100回完了",
  "500 lượt ôn": "復習500回",
  "Ôn 500 lượt trong app": "復習を500回完了",
  "2000 lượt ôn": "復習2000回",
  "Ôn 2000 lượt trong app": "復習を2000回完了",
  "Sổ tay 100 mục": "単語帳100件",
  "Lưu 100 mục vào sổ tay": "単語帳に100件保存",
  "Sổ tay 500 mục": "単語帳500件",
  "Lưu 500 mục vào sổ tay": "単語帳に500件保存",
  "Nhớ lâu": "長く覚える",
  "100 mục đạt chu kỳ ôn từ 14 ngày": "100件で14日以上の復習間隔に到達",
  "Vốn liếng dày": "豊かな知識",
  "500 mục đạt chu kỳ ôn từ 14 ngày": "500件で14日以上の復習間隔に到達",
  "Người hiệu đính": "校正者",
  "Sửa lại 20 bản dịch cho sát nghĩa": "訳を20件改善",
  "Thợ cả chuyên ngành": "専門の達人",
  "Sửa lại 100 bản dịch": "訳を100件改善",
  "Người chú giải": "注釈家",
  "Viết ghi chú cho 20 mục": "20件にメモを追加",
  "Ngăn nắp": "整理上手",
  "Có 5 sổ con đang dùng": "5冊のサブノートを使用",
  "Có gu": "お気に入り上手",
  "Gắn tim cho 50 mục": "50件をお気に入りに追加",
  "Bùng nổ": "勢いに乗って",
  "Ôn 50 lượt trong cùng một ngày": "一日で50回復習",
  "Ba mươi ngày có mặt": "学習日30日",
  "Có học trong 30 ngày khác nhau": "30日以上学習",
  "Dậy sớm": "早起き",
  "Ôn bài trước 6 giờ sáng": "朝6時より前に復習",
  "Cú đêm": "夜型",
  "Ôn bài sau 11 giờ đêm": "夜11時以降に復習",
  "Bàn học sạch": "復習すっきり",
  "Ôn hết mục đến hạn, khi sổ đã có ít nhất 20 mục trong chu kỳ": "予定のある項目が20件以上のときに、期限の来た項目をすべて復習",
  "Vượt chỉ tiêu": "目標を超えて",
  "Ôn gấp đôi mục tiêu ngày trong một ngày": "一日で目標の2倍を復習",
  "{n} lượt": "{n}回",
  "Xong mục tiêu hôm nay": "今日の目標を達成",
  "Còn {n} lượt nữa là đạt": "目標まであと{n}回",
  "Ôn thêm bao nhiêu cũng được, chuỗi ngày đã tính rồi.": "さらに復習しても構いません。今日の連続記録は確保しました。",
  "Mỗi lượt ôn trong tab Học đều được tính vào đây.": "学習タブでの復習はすべて集計されます。",
  "{n} nhớ": "覚えた：{n}",
  "{n} ôn lại": "再学習：{n}",
  "{n} mục mới": "新規：{n}件",
  "Chuỗi ngày": "連続日数",
  "Dài nhất": "最長",
  "Tổng lượt ôn": "総復習回数",
  "Ngày có mặt": "学習日数",
  "Chuỗi {days} ngày đang treo — ôn đủ {goal} lượt hôm nay là giữ được.": "{days}日間の連続記録が途切れそうです。今日{goal}回復習すると継続できます。",
  "17 tuần gần đây": "直近17週間",
  "Ít": "少",
  "Nhiều": "多",
  "ngày đạt mục tiêu": "目標達成日",
  "Huy hiệu {n}/{total}": "バッジ {n}/{total}",
  "Mục tiêu mỗi ngày": "一日の目標",
  "Ôn đủ số lượt này là ngày đó được tính vào chuỗi. Đặt vừa sức thôi — chuỗi dài quan trọng hơn con số to.": "この回数を復習すると連続学習の一日として数えます。無理のない目標にしましょう。大きな数字より続けることが大切です。",
  "Lưu mục tiêu": "目標を保存",
  "Mở khoá {n} huy hiệu!": "バッジを{n}個獲得！",
  "Mở khoá huy hiệu!": "バッジ獲得！",
  "Tuyệt vời, học tiếp thôi!": "いいですね、学習を続けましょう！",
  "YouTube gốc · {rate}× · đang mở đoạn câu…": "YouTubeの元音声 · {rate}倍 · 区間を開いています…",
  "‘i’ kéo dài — như ‘i’ trong ‘si’": "seeの母音。舌を高く前に置き、唇を横にして長く発音。",
  "‘i’ ngắn, gọn — giữa ‘i’ và ‘ê’": "sitの母音。/iː/より口を少し開き、短く緩めて発音。",
  "‘e’ — như ‘e’ trong ‘em’": "bedの母音。舌を前に置き、口を適度に開く。",
  "‘a’ bẹt, miệng rộng — giữa ‘a’ và ‘e’": "catの母音。「ア」と「エ」の中間を意識して、口を大きく開く。",
  "‘â’ — như ‘â’ trong ‘cấp’": "cupの母音。口を軽く開き、舌を中央に置いて短く発音。",
  "‘a’ kéo dài, tròn miệng": "イギリス英語のcarの母音。口を大きく開き、奥で長く発音。",
  "‘o’ ngắn (giọng Anh-Anh)": "イギリス英語のhotの母音。唇を丸め、奥で短く発音。",
  "‘o’ kéo dài, tròn môi — gần ‘aw’": "イギリス英語のlawの母音。唇を丸めて長く発音。",
  "‘u’ ngắn, gọn": "putの母音。唇を軽く丸めて、短く緩めて発音。",
  "‘u’ kéo dài — như ‘u’ trong ‘thu’": "foodの母音。舌を高く奥に置き、唇を丸めて長く発音。",
  "‘ơ’ kéo dài, cong lưỡi nhẹ": "rを発音しないイギリス英語のbirdの母音。舌を中央に置いて長く発音。",
  "‘ơ’ rất nhẹ, không nhấn (schwa)": "シュワー。強勢のない音節で、力を抜いて短く曖昧に発音。",
  "‘ây’ — như ‘ây’ trong ‘mây’": "dayの母音。/e/から/ɪ/へ滑らかに移る。",
  "‘ai’ — như ‘ai’ trong ‘mai’": "myの母音。口を大きく開いた音から/ɪ/へ移る。",
  "‘oi’ — như ‘oi’ trong ‘coi’": "boyの母音。/ɔ/から/ɪ/へ移る。",
  "‘ao’ — như ‘ao’ trong ‘cao’": "nowの母音。口を大きく開いた音から/ʊ/へ移る。",
  "‘âu’ (Anh-Anh) / ‘ou’": "イギリス英語のgoの母音。/ə/から/ʊ/へ移る。",
  "‘ou’ (Anh-Mỹ) — như ‘gâu’": "アメリカ英語のgoの母音。/o/から/ʊ/へ移る。",
  "‘i-ơ’ trượt nhanh": "イギリス英語のhereなどで、/ɪ/から/ə/へ移る。",
  "‘e-ơ’ trượt nhanh": "イギリス英語のhairなどで、/e/から/ə/へ移る。",
  "‘u-ơ’ trượt nhanh": "イギリス英語のtourなどで、/ʊ/から/ə/へ移る。",
  "‘p’ bật hơi": "両唇を閉じて息を破裂させる。強勢音節の頭では息が強い。",
  "‘b’": "/p/と同じ口の形で、声帯を震わせる。",
  "‘t’ bật hơi": "舌先を上の歯の後ろの歯茎につけ、息を放す。",
  "‘đ’": "/t/と同じ位置で、声帯を震わせる。",
  "‘c/k’ bật hơi": "舌の奥を持ち上げて息を止め、放す。",
  "‘g’ (gờ)": "/k/と同じ位置で、声帯を震わせる。",
  "‘ch’": "chairの子音。舌で息を止めてから、摩擦させながら放す。",
  "‘g/j’ — như ‘j’, hơi ‘gi’": "joyの子音。/tʃ/と同じ口の形で声帯を震わせる。",
  "‘ph/f’": "上の歯を下唇に軽く当て、息を通す。",
  "‘v’ (răng chạm môi)": "/f/と同じ口の形で、声帯を震わせる。",
  "‘th’ vô thanh — đặt lưỡi giữa hai hàm răng": "無声音のth。舌先を上下の歯に軽く触れさせ、息を通す。",
  "‘đ’ hữu thanh — lưỡi giữa răng, rung": "有声音のth。/θ/と同じ位置で、声帯を震わせる。",
  "‘x/s’": "歯の近くに舌を置いて、声を出さずに息を摩擦させる。",
  "‘z’ — s rung, như ‘dz’": "/s/と同じ位置で、声帯を震わせる。",
  "‘s’ nặng — như ‘sh’": "sheの子音。唇を少し前に出し、声を出さずに息を通す。",
  "‘gi’ rung — như ‘zh’": "visionの中央の子音。/ʃ/と同じ位置で声帯を震わせる。",
  "‘h’": "喉を開いたまま息を出す。",
  "‘m’": "両唇を閉じ、鼻に声を通す。",
  "‘n’": "舌先を歯茎につけ、鼻に声を通す。",
  "‘ng’ cuối — như ‘ng’ trong ‘sang’": "singの最後の音。舌の奥を上げ、鼻に声を通す。",
  "‘l’": "舌先を上の歯の後ろにつけ、両脇から声を通す。",
  "‘r’ cong lưỡi, không rung": "英語のr。舌先を歯茎に当てず、震わせない。",
  "‘y’ — như ‘i’ trong ‘yêu’": "yesの最初の音。舌を高く前に置き、次の母音へ移る。",
  "‘u/w’ — như ‘qu’ nhẹ": "唇を丸めてから、次の母音へ滑らかに移る。",
  "dấu NHẤN CHÍNH — âm tiết ngay sau được đọc mạnh, cao hơn": "第一強勢。直後の音節を強く発音する。",
  "dấu nhấn phụ — nhấn nhẹ hơn nhấn chính": "第二強勢。第一強勢より弱くアクセントを置く。",
  "kéo dài nguyên âm liền trước": "直前の母音を長く発音する。",
  "Chinh phục núi Phú Sĩ": "富士山に挑戦",
  "Leo 9 hợp mục, mỗi chương một trạm, để đón bình minh trên đỉnh Phú Sĩ.": "各章の九つの登山駅を巡り、富士山頂で日の出を迎えましょう。",
  "1合目 · Chân núi": "一合目 · ふもと",
  "2合目 · Rừng tùng sương mù": "二合目 · 霧の松林",
  "3合目 · Suối trong vắt": "三合目 · 清流",
  "4合目 · Vách đá rêu phong": "四合目 · 苔むした岩壁",
  "5合目 · Trạm năm": "五合目 · 中継地点",
  "6合目 · Đường đá núi lửa": "六合目 · 火山岩の道",
  "7合目 · Trên biển mây": "七合目 · 雲海の上",
  "8合目 · Gió buốt trời hửng": "八合目 · 夜明けの冷たい風",
  "9合目 · Sát đỉnh": "九合目 · 頂上目前",
  "Đỉnh Phú Sĩ": "富士山頂",
  "Lặn biển Okinawa tìm ngọc trai": "沖縄の真珠を探す",
  "Lặn sâu 9 tầng nước, mỗi chương một tầng, để vớt viên ngọc trai khổng lồ dưới đáy biển.": "各章の九つの深さを潜り、海底の巨大真珠を探しましょう。",
  "10m · Rạn san hô nông": "10m · 浅瀬のサンゴ礁",
  "20m · Rừng tảo bẹ": "20m · 海藻の森",
  "30m · Xác tàu đắm": "30m · 沈没船",
  "40m · Hang đá ngầm": "40m · 海中の洞窟",
  "50m · Vách đá sâu": "50m · 深海の岩壁",
  "60m · Vùng nước tối": "60m · 暗い海",
  "70m · Đàn cá phát sáng": "70m · 光る魚たち",
  "80m · Rãnh sâu": "80m · 深い海溝",
  "90m · Cửa hang ngọc": "90m · 真珠の洞窟の入口",
  "Đáy biển · Ngọc trai khổng lồ": "海底 · 巨大真珠",
  "Tàu đêm đến ngày hội pháo hoa": "花火大会へ向かう夜行列車",
  "Làng suối nước nóng trong tuyết": "雪の温泉村",
  "Con đường hoa anh đào Kyoto": "京都の桜並木",
  "chữ Hán": "漢字",
  "Đã lưu từ và câu ngữ cảnh cho Gemini, bài nghe và luyện ngữ pháp.": "Gemini、リスニング、文法練習用に単語と文脈文を保存しました。",
  "Đã lưu từ, chưa đọc được câu: cần bật Cho phép truy cập URL của tệp cho RaKuLanG trong chrome://extensions.": "単語は保存しましたが、文脈がありません。chrome://extensionsでRaKuLanGの「ファイルのURLへのアクセスを許可する」をオンにしてください。",
  "Đã lưu từ, chưa đọc được câu: bộ đọc PDF của extension bị thiếu hoặc hỏng. Hãy cập nhật đầy đủ thư mục extension rồi bấm Tải lại.": "単語は保存しましたが、PDFリーダーが不足または破損しています。拡張機能のフォルダ全体を更新し、「再読み込み」をクリックしてください。",
  "Đã lưu từ, chưa tìm được câu chứa từ trong lớp chữ của PDF.": "単語は保存しましたが、PDFのテキスト層で該当する文が見つかりませんでした。",
  "Đã lưu từ, chưa đọc được ngữ cảnh từ nguồn này.": "単語は保存しましたが、この出典から文脈を取得できませんでした。"
});
  Object.assign(en,{"Xoá sổ \"{name}\"? Các mục trong sổ sẽ chuyển về \"Chưa phân loại\", không bị mất.":"Delete notebook \"{name}\"? Its entries will move to \"Uncategorized\"; none will be lost.","Xoá sổ \"{name}\"? Mục trong sổ sẽ về \"Chưa phân loại\".":"Delete notebook \"{name}\"? Its entries will move to \"Uncategorized\".","{n} câu":"{n} sentences"});
  Object.assign(ja,{"Xoá sổ \"{name}\"? Các mục trong sổ sẽ chuyển về \"Chưa phân loại\", không bị mất.":"ノート「{name}」を削除しますか？項目は「未分類」に移動し、失われません。","Xoá sổ \"{name}\"? Mục trong sổ sẽ về \"Chưa phân loại\".":"ノート「{name}」を削除しますか？項目は「未分類」に移動します。","{n} câu":"{n}文"});
  Object.assign(en,{"Nguồn":"Source","trang":"page","Chọn cách hiểu phù hợp với ngữ cảnh":"Choose the meaning that fits this context","Bản dịch biên tập cho bài học":"Translation adapted for this lesson","Bản dựng từ phụ đề, chưa đối chiếu âm thanh":"Reconstructed transcript; audio not verified","Hoàn thành mọi chặng để mở bài cuối.":"Complete every stage to unlock the final challenge.","Có thể luyện bất cứ lúc nào.":"You can practice this at any time.","Khẩu ngữ Nhật và tiếng Osaka · khóa bổ trợ ngoài các cấp JLPT.":"Spoken Japanese and Osaka dialect · a supplementary course outside JLPT levels.","Kaiwa · Thử thách hội thoại":"Kaiwa · Conversation challenge","Cùng Raku khám phá tiếng Nhật trong những cuộc trò chuyện hằng ngày!":"Explore everyday Japanese conversations with Raku!","Chọn bất kỳ chặng nào. Làm hết các chặng để mở bài cuối.":"Choose any stage. Complete them all to unlock the final challenge.","Bạn đã hoàn thành hành trình Kaiwa Nihongo!":"You have completed Kaiwa Nihongo!","Nameraka · Biến âm":"Nameraka · Sound changes","Nameraka · Câu nói tự nhiên":"Nameraka · Natural expressions","Nameraka · Giữ nhịp hội thoại":"Nameraka · Conversation flow","Nameraka · Ý định và sắc thái":"Nameraka · Intent and nuance","Osaka · Lời nói hằng ngày":"Osaka · Everyday expressions","Osaka · Giao tiếp và đáp lời":"Osaka · Replies and interaction","Osaka · Gia đình và ẩm thực":"Osaka · Family and food","Osaka · Văn hóa trò chuyện":"Osaka · Conversation culture"});
  Object.assign(ja,{"Nguồn":"出典","trang":"ページ","Chọn cách hiểu phù hợp với ngữ cảnh":"文脈に合う意味を選んでください","Bản dịch biên tập cho bài học":"学習用の訳","Bản dựng từ phụ đề, chưa đối chiếu âm thanh":"字幕から再構成・音声未照合","Hoàn thành mọi chặng để mở bài cuối.":"全ステージを終えると最終問題が開きます。","Có thể luyện bất cứ lúc nào.":"いつでも練習できます。","Khẩu ngữ Nhật và tiếng Osaka · khóa bổ trợ ngoài các cấp JLPT.":"日本語の話し言葉と大阪弁 · JLPT級別とは別の補習コース","Kaiwa · Thử thách hội thoại":"会話・最終チャレンジ","Cùng Raku khám phá tiếng Nhật trong những cuộc trò chuyện hằng ngày!":"Rakuと日常の日本語会話を学びましょう！","Chọn bất kỳ chặng nào. Làm hết các chặng để mở bài cuối.":"好きなステージから学べます。すべて終えると最終問題が開きます。","Bạn đã hoàn thành hành trình Kaiwa Nihongo!":"Kaiwa Nihongoを修了しました！","Nameraka · Biến âm":"Nameraka · 音の変化","Nameraka · Câu nói tự nhiên":"Nameraka · 自然な表現","Nameraka · Giữ nhịp hội thoại":"Nameraka · 会話の流れ","Nameraka · Ý định và sắc thái":"Nameraka · 意図とニュアンス","Osaka · Lời nói hằng ngày":"Osaka · 日常表現","Osaka · Giao tiếp và đáp lời":"Osaka · やりとりと返し","Osaka · Gia đình và ẩm thực":"Osaka · 家族と食文化","Osaka · Văn hóa trò chuyện":"Osaka · 会話の文化"});
  goc.CHU_BANG = { en: en, ja: ja };
  if (typeof module !== "undefined" && module.exports) module.exports = goc.CHU_BANG;
})(typeof self !== "undefined" ? self : this);
