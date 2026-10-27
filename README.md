# NeutronDict

Từ điển & dịch **Anh – Việt**: tra từ khi bôi đen trên web/PDF, phiên âm **IPA** kèm hướng dẫn đọc, phát âm, định nghĩa & ví dụ tiếng Anh, sổ tay, ôn tập **SRS**, đồng bộ **Google Drive**. Gồm **extension máy tính** và **app Android**.

> NeutronDict là “người anh em tiếng Anh” của [NJDict](../) (bản tiếng Nhật). Cùng cơ chế: sổ tay chung, đồng bộ Drive, học SRS — nhưng lõi tra cứu và phát âm dành cho tiếng Anh.

## Cấu trúc

| Thư mục | Phần | Phiên bản |
|---------|------|-----------|
| [`extension/`](extension/) | Extension Chrome/Edge — bôi đen tra từ trên web/PDF | v2.2 |
| [`android/`](android/) | App Android (Capacitor) — tra từ, sổ tay, học SRS, tiến độ, thông báo | v2.1.0 |
| [`brand/`](brand/) | Logo (nơ-ron – vũ trụ) và script xuất icon PNG | — |

## Tính năng chính

- **Tra từ tiếng Anh:** nghĩa tiếng Việt (Google Dịch) + **phiên âm IPA** + **phát âm** (file audio thật hoặc giọng máy) + **định nghĩa/ví dụ/từ đồng nghĩa** tiếng Anh (Free Dictionary API).
- **Hướng dẫn đọc IPA:** bảng ký hiệu IPA kèm từ ví dụ và gợi ý đọc tiếng Việt; trong tab **Chi tiết** còn chú giải ngay các ký hiệu có trong từ đang tra.
- **Dịch câu dài** mạnh như Google Dịch (Anh↔Việt), có nút lưu bản dịch.
- **Bôi đen là hiện popup ngay tại con trỏ** (web), hoặc `Ctrl+C` + phím tắt (PDF), hoặc chuột phải.
  Popup chạy đồng thời **tra từ, chi tiết và dịch cả câu**, xếp vào ba tab — không còn tự
  đoán bạn muốn tra từ hay dịch câu.
- **Sổ tay + sổ con phân loại**, **ôn tập SRS ba đường** (nhìn chữ · nghe câu · điền khuyết trong câu) — mỗi đường một lịch riêng, quên bài nào chỉ làm lại bài đó, và một
  **thang 100 điểm** chung cho biết từ ấy đã vững tới mức nào. Xuất **Anki/CSV**, sao lưu JSON.
- **Đồng bộ Google Drive** giữa máy tính và điện thoại (qua Apps Script của bạn).
- **Android:** nhắc học hằng ngày, nhận chữ từ menu bôi đen (PROCESS_TEXT) và bảng Chia sẻ (kèm link nguồn).
- **Theo dõi quá trình học & phần thưởng:** mục tiêu mỗi ngày, chuỗi ngày liên tiếp,
  lịch nhiệt 17 tuần, **24 huy hiệu** — cùng cơ chế với app Denken 3 Shuu, đồng bộ
  giữa máy tính và điện thoại. Xem `tien-do.js`.
- **Ngữ cảnh ngay dưới nghĩa:** mỗi từ lưu từ trang web/PDF hiện kèm câu đã gặp nó (từ được tô đậm) và **bản dịch của câu**, nằm liền sau nghĩa — trong sổ tay lẫn mặt sau thẻ ôn. Mục cũ được tự bồi bản dịch dần mỗi lần mở sổ.
- **Sổ tay nhanh và xoá hàng loạt:** danh sách vẽ theo lô (sổ vài nghìn từ vẫn mở trong nửa giây), mỗi nút trên hàng chỉ cập nhật đúng hàng đó. Nút xoá từng từ được thay bằng **ô tích chọn**: tích một hoặc nhiều từ → thanh hành động hiện ra → "Xoá…" mở hộp xác nhận liệt kê các từ sắp xoá, có **Hoàn tác**. Chế độ học vẫn có nút xoá riêng ("Đã thuộc hẳn").
- **Từ cùng ngữ cảnh chỉ học một lần nghe/ngữ pháp:** bôi vài từ sát nhau trong cùng một câu thì cả nhóm dùng **một** thẻ nghe (một từ đại diện giữ đường nghe, ưu tiên từ đã có tiến độ) và **một** bài xếp mảnh ngữ pháp (câu dài nhất của nhóm); đường nhìn và điền khuyết của từng từ vẫn giữ riêng.
- **Mỗi từ một đường mỗi lần, đường kế tiếp chờ 12 tiếng:** từ có nhiều đường ôn (nhìn, nghe, điền khuyết) chỉ hiện MỘT đường mỗi lần; chấm xong thì các đường còn lại của từ đó ngủ 12 tiếng rồi mới tới lượt đường kế. Buổi học ngắn lại rõ rệt (30 từ đã mở đủ ba đường: 90 thẻ → 30 thẻ trong một buổi) mà tổng số lượt ôn về lâu dài không đổi, chỉ được dàn ra. Bảng điểm hiện giờ đường kế tiếp sẽ hiện.
- **Đạt mức tối đa thì tự đóng băng:** khi mọi đường của một từ đã nới tới trần 365 ngày và bạn trả lời nhớ, từ đó được đóng băng luôn (có lời báo). Nút “Đang đóng băng” mở lại được; bấm Hoàn tác (←) ngay lượt đó cũng gỡ băng.
- **Học bằng bàn phím, có hiệu ứng kiểu Quizlet:** `Space` lật thẻ, rồi `F` = Quên (dấu X đỏ nhạt), `J` = Nhớ (dấu V xanh); `A` phát âm từ. Thẻ nghe: `A` để nghe lại câu, `Space` để hiện nghĩa như các thẻ khác. Bài điền khuyết: phím `1`–`9` chọn ô và chấm ngay (hiện V/X), `J` hoặc `Space` để sang thẻ tiếp.
- **Vuốt thẻ kiểu Quizlet:** sau khi hiện nghĩa, kéo thẻ sang phải (chuột trái hoặc ngón tay) = Nhớ, thẻ trôi đi kèm dấu V xanh; kéo sang trái = Quên, dấu X đỏ; thẻ kế tiếp hiện lên ngay. Chưa hiện nghĩa thì vuốt không chấm. Hai nút mũi tên dưới thẻ (‹ ›, hoặc phím ← →) lùi/tới các thẻ đã chấm trong buổi để xem lại; bấm Nhớ/Quên khác với lần trước trên thẻ xem lại là chấm lại (lượt cũ bị huỷ, không tính hai lần).
- **Bài điền khuyết thay bài đồng/trái nghĩa:** lời hỏi là BẢN DỊCH tiếng Việt của câu đã gặp từ, bên dưới là câu tiếng Nhật với chỗ của từ bị đục lỗ, rồi bốn ô: từ gốc (dạng từ điển) lẫn ba từ nhiễu hình thức giống nó lấy từ chính sổ tay của bạn. Chọn một ô là chấm luôn; đúng thì Nhớ, sai thì Quên. Đây là một đường SRS riêng (`dien`) với lịch và điểm riêng, gộp chung vào điểm của từ. Bộ từ đồng/trái nghĩa (WordNet, bảng hạt giống), nút tắt mạng nghĩa và ôn kèm cụm đã được gỡ; dữ liệu cũ (`lien`, `duong.dong/trai`) nằm yên trong sổ và không còn được dùng.
- **Cử chỉ đợt hai (chuột/chạm):** trong chế độ học, vuốt trái/phải và phím F/J chấm được NGAY, không cần bấm Space lật thẻ (riêng bài điền khuyết thì chấm bằng đáp án chọn). Bằng chuột: kéo thẻ LÊN = mở nguồn của từ, kéo XUỐNG = hỏi Gemini; nhấp đúp vào chỗ trống của thẻ (chạm đúp trên điện thoại) = mở phần sửa nghĩa. Các cử chỉ lên/xuống/nhấp đúp tắt trong bài điền khuyết vì sẽ lộ đáp án. Ở sổ tay: nhấp đúp vào hàng = sửa nghĩa, ấn giữ kéo sang phải = xoá nhanh (vẫn có Hoàn tác), kéo sang trái = mở link nguồn của từ. Vuốt dọc trên điện thoại vẫn là cuộn trang nên bản Android không có lệnh lên/xuống.
- **Ôn từng đường:** nút “Ôn từng đường” cho luyện liền một loại bài — chỉ bài nghe, chỉ bài đoán nghĩa, hoặc chỉ bài điền khuyết. Điểm và lịch ôn vẫn tính chung; chỉ lấy bài đã tới hạn và vẫn giữ luật 12 tiếng giữa các đường của một từ.
- **Ngữ pháp: làm đúng là đóng băng:** câu ghép đúng (kể cả sai rồi sửa lại) được đóng băng và không hiện lại, cả luyện tự do lẫn theo lịch; chỉ xem đáp án thì chưa đóng băng. Danh sách “Câu đã đóng băng” có nút Mở lại.
- **Sửa bản dịch & ghi chú:** mỗi mục trong sổ tay đều sửa lại được nghĩa cho đúng
  chuyên ngành, kèm một ô ghi chú riêng. Bản máy dịch ban đầu được giữ lại để khôi
  phục, và tra lại cùng một từ **không** làm mất công hiệu đính.
- **Sửa nghĩa ngay trong popup:** thấy máy dịch sai ngữ cảnh thì chữa tại chỗ, không
  phải mở Sổ tay tìm lại — sửa được cả nghĩa của từ lẫn bản dịch câu, sửa là lưu
  luôn, ô ghi chú nằm ngay cạnh. Bản Android mở thẳng bảng sửa từ thẻ kết quả.
- **Xoá rồi vẫn giữ bản dịch của bạn:** xoá một mục vì đã thuộc thì nó biến khỏi sổ
  tay và khỏi sóng ôn tập thật, nhưng nghĩa bạn đã hiệu đính và ghi chú thì ở lại —
  vài tháng sau tra lại vẫn ra bản bạn từng chốt (`extension/muc.js`).
- **Giao diện:** hệ thiết kế riêng (`ui.css`), sáng/tối tự động theo máy, icon
  [Phosphor](https://phosphoricons.com) thay cho emoji; trên Android có vuốt ngang
  đổi tab, nút Quay lại lùi từng bước và kéo xuống để làm mới (`cham-vuot.js`).

## Nguồn dữ liệu

- **Nghĩa & dịch câu (cả Anh và Nhật):** [Google Dịch](https://translate.google.com) (endpoint công khai `gtx`), dự phòng qua Apps Script (`LanguageApp`). Tiếng Nhật **không còn dùng Mazii**: nghĩa, các nghĩa theo loại từ và phiên âm La-tinh (nguồn dựng furigana) lấy chung trong **một** lượt gọi Google.
- **Gói thuật ngữ chuyên ngành (Điện, IT, Y), tra TRƯỚC Google:** mỗi ngành một cặp gói trong `extension/goi/` — `dien-ja-vi` (~7.100 mục từ 4 giáo trình, do chủ dự án cung cấp), `dien-en-vi` (~820), `it-en-vi` (~1.450), `it-ja-vi` (~900), `y-en-vi` (~1.040), `y-ja-vi` (~750). Phần Anh và phần soạn tay do Claude viết từ kiến thức phổ thông, chưa có chuyên gia duyệt. Cân bằng với Google: từ/cụm chuyên ngành thì nghĩa của gói đứng trước, nghĩa Google nối sau; từ chung (あう, work, line, class…) thì Google đứng trước; bôi đen/dịch cả đoạn dài thì không đụng vào bản dịch của Google. Từ khớp ở nhiều ngành (bus = thanh cái / bus máy tính) thì nghĩa các ngành được gộp. Thuật ngữ mà dân ngành vẫn để nguyên tiếng Anh (IT) thì chính từ Anh đứng đầu. Kết quả hiện như nghĩa bình thường, không dán nhãn. Bật/tắt từng ngành ở Cài đặt (extension). Dựng lại: `bash cong-cu/dung-het-goi.sh [jamdict.db]` (nguồn TSV ở `cong-cu/du-lieu-goi/`; xem [NOTICE.md](NOTICE.md) về JMdict). Phần tiếng Nhật IT/Y tự động chỉ lấy chữ + cách đọc từ JMdict rồi bắc cầu qua nghĩa Anh ĐẦU TIÊN trùng nguyên chữ với bảng Anh→Việt; các mục bắc cầu gán nhầm đã rà tay và đưa vào `loai-*-ja.txt`. Thêm ngành khác = thêm cặp tệp `goi/*.json` cùng khuôn rồi khai báo trong `GOI_TEP`.
- **Popup / thẻ bôi đen không còn tab Dịch riêng:** một ô cho cả từ và câu (đoạn dài thì dịch cả đoạn bằng Google). Cạnh từ có nút ✨ Hỏi Gemini.
- **Ôn thi JLPT (chế độ riêng, chỉ có ở tiếng Nhật):** mỗi cấp là một MÀN chơi có chủ đề, nhân vật và lời thoại riêng — N3 *Chinh phục núi Phú Sĩ* (9 chương = 9 hợp mục, đỉnh núi là trùm cuối), N2 *Lặn biển Okinawa tìm ngọc trai* (9 chương = 9 tầng nước, đáy biển là trùm cuối); N1/N4/N5 để chỗ "sắp có". Trong màn: bản đồ cuộn dọc kiểu Duolingo, các chặng theo từng BÀI của giáo trình (chữ Hán → từ vựng → ngữ pháp, ~20 mục/chặng), cuối mỗi chương có trùm chương, cuối màn có trùm cuối. Mỗi chặng: học nhanh bằng thẻ → thử thách ~8–16 câu (nghĩa, cách đọc, nghe, điền chỗ trống, Hán Việt, âm On, mẫu ngữ pháp…) → kết quả %, 1–3 sao, ngọc. **Luật 60%:** chặng ≥ 60% mở chặng kế; trùm chương ≥ 60% mở chương sau; trùm cuối ≥ 60% hoàn thành màn. **Các màn mở SONG SONG** (không khoá nhau): chọn N3 hay N2 tuỳ trình độ; màn nào có dữ liệu giáo trình là vào được ngay. Câu sai được ôn lại một lần (không tính điểm); có nút "Báo câu sai" (câu đó không hiện lại) và "Chế độ thử" mở khoá tất cả. Dữ liệu (`extension/jlpt/n3.json`, `n2.json`, ~1MB/màn, nạp lười) dựng từ database giáo trình bằng `cong-cu/dung-jlpt.py`; đáp án luôn lấy thẳng từ giáo trình, câu hỏi trắc nghiệm có sẵn trong sách KHÔNG dùng vì chưa có đáp án kiểm chứng. Script còn đối chiếu JMdict/KANJIDIC để loại mục trích sai từ PDF (cách đọc sai, chữ Hán bị gán nhầm Hán Việt — ở N2 loại 263/493 chữ). Thêm cấp mới = thêm một mục chủ đề vào `jlpt-theme.js` và một file dữ liệu. **Đồ hoạ:** nhân vật (Taro 🦝 / Kai 🦦, vẽ SVG, tự chớp mắt, vẫy đuôi, mở miệng khi nói) nói chuyện NGAY TRONG cảnh vẽ — banner chương nở ra, bong bóng hiện chữ dần, không có hộp thoại nổi; N1/N4/N5 "sắp có" cũng có cảnh xem trước chuyển động (pháo hoa + tàu đêm, tuyết rơi + hơi suối, hoa anh đào); chặng đã xong/khoá đứng yên còn lại mọi thứ đều có nhịp, phần ngoài màn hình tự ngừng vẽ (`content-visibility`). Cảnh vẽ SVG động (Phú Sĩ có đỉnh tuyết, bình minh "kim cương", đường mòn + người leo, biển mây, anh đào rơi; Okinawa có tia nắng, san hô, tảo, tàu đắm, sứa, cá phát sáng, ngọc trai), hạt trôi, nút chặng nảy vào/trùm quay hào quang, thẻ học **vuốt kiểu Quizlet** (phải = nhớ, trái = học lại) và lật 3D, chữ lời thoại hiện dần, đáp án loé/rung, ngọc bay, combo 🔥, vòng % chạy + sao nảy + pháo giấy. **Máy tính:** extension dùng cả bề ngang (thẻ chọn màn dạng lưới, bản đồ rắn ngang, ẩn thanh bên khi vào màn); điện thoại giữ bố cục dọc. **Nhạc nền** tự sinh bằng WebAudio (không file âm thanh): N3 thang âm miyako-bushi + gió núi, N2 thang âm Ryukyu + sóng biển; nút bật/tắt ở cuối màn hình, lựa chọn được lưu. Chữ Hán nhiều cách đọc On/Kun được ngăn bằng dấu " / ". Tôn trọng "giảm chuyển động" của hệ điều hành.
- **Một nút sửa cho mọi thứ:** hàng sổ tay và thẻ học chỉ còn một nút ✎ mở hộp "Sửa mục này": nghĩa, **câu ví dụ** và **bản dịch của ví dụ**, ghi chú, ảnh, nguồn — lưu một lần. Bấm thẳng vào khối ví dụ dưới nghĩa cũng mở hộp ở đúng ô đó. Bản ví dụ bạn tự sửa được đánh dấu (`cauNghe.sua`) nên nền không bao giờ ghi đè hay lọc lại; xoá trắng ví dụ thì nền cũng không moi lại.
- **Lọc tiếng Việt lẫn trong ví dụ:** tài liệu song ngữ hay làm câu ví dụ dính cả nửa tiếng Việt. `CauNghe.lamSach` nhận ra bằng chữ chỉ tiếng Việt mới có (ă ơ ư đ và nguyên âm mang dấu thanh), cắt lấy đoạn chứa từ; lúc hiển thị và khi nền bồi dữ liệu. Lọc không chắc thì không đoán: giữ nguyên câu và hiện dòng "Ví dụ có vẻ lẫn tiếng Việt — bấm để sửa" cạnh nó.
- **Tốc độ tra:** hai cổng Google chạy *đua* (cổng treo thì cổng kia đi song song sau ~1 giây), Apps Script vào cuộc ngay khi Google chặn; tra từ và dịch cùng một từ dùng chung một lượt gọi; kết quả giữ trong RAM nên tra lại gần như tức thì.
- **IPA, phát âm, định nghĩa, ví dụ, từ đồng nghĩa:** [Free Dictionary API](https://dictionaryapi.dev) (`api.dictionaryapi.dev`) — miễn phí, không cần API key.

NeutronDict là dự án cộng đồng, không liên kết chính thức với Google hay dictionaryapi.dev. Vui lòng tôn trọng điều khoản của các nguồn dữ liệu.

## Hướng dẫn cài đặt và đồng bộ

[Tải hướng dẫn Word chi tiết](docs/Huong-dan-cai-dat-va-dong-bo-NeutronDict.docx?raw=true) — cài extension, cài APK Android, tạo Google Apps Script và kết nối một kho chung. Tài liệu có các hyperlink để mở Apps Script, lấy mã đồng bộ và tải APK.

## Bắt đầu nhanh

- **Extension:** xem [extension/README.md](extension/README.md) — `chrome://extensions` → Developer mode → Load unpacked thư mục `extension/`.
- **Android:** xem [android/README.md](android/README.md) — `npm install` → `npx cap add android` → `npx cap sync android` → `node patch-android.js` → mở Android Studio build APK.
- **Logo:** xem [brand/README.md](brand/README.md).

## Bộ icon

Giao diện dùng [Phosphor Icons](https://phosphoricons.com) v2.1.1 (giấy phép MIT,
© 2023 Phosphor Icons). Các đường vẽ SVG cần dùng được trích sẵn vào `icons.js`
của từng phần — extension Chrome không nạp được tài nguyên từ mạng, còn app
Android thì phải chạy được khi mất mạng.

## Giấy phép

[MIT](LICENSE).
