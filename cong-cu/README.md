# Bộ từ liên tiếng Nhật (đồng nghĩa / trái nghĩa)

Bộ dữ liệu **đã có sẵn trong kho** — `extension/tu-lien/` và
`android/www/tu-lien/`. Bạn không phải làm gì cả. Thư mục này chỉ để dựng lại
khi có bản 日本語WordNet mới.

## Trong đó có gì

56.527 từ tiếng Nhật, trong đó 10.245 từ có trái nghĩa. Tổng 3,6 MB, cắt thành
32 mảnh ~116 KB. App chỉ nạp **đúng một mảnh** chứa từ đang tra, và chỉ một
lần — xem `napBo()` trong `extension/tu-lien.js`.

Nghĩa là bài liên kết **chạy được khi không có mạng**, và không tốn lượt gọi
Apps Script nào.

## Dựng từ đâu

Hai nguồn, vì mỗi nguồn thiếu một nửa:

* **日本語WordNet 1.1** (`wnjpn.db`) cho **đồng nghĩa** — các từ tiếng Nhật cùng
  nằm trong một synset.
* **Princeton WordNet 3.0** (`data.noun/verb/adj/adv`) cho **trái nghĩa**. Cần
  tới nó vì trong `wnjpn.db`, bảng `synlink` **không có một dòng `ants` nào** —
  quan hệ trái nghĩa của WordNet nằm ở mức TỪ chứ không ở mức synset, và bản
  SQLite tiếng Nhật không kèm phần đó. Con trỏ `!` trong tệp Princeton nối
  synset A ↔ synset B, rồi ánh xạ ngược về lemma tiếng Nhật qua chính mã synset
  (wnjpn dùng mã offset của Princeton 3.0).

## Xếp hạng

Một từ tiếng Nhật ứng với nhiều synset. Gom hết ứng viên rồi cắt lấy 6 cái đầu
thì thứ tự là ngẫu nhiên — 始まる mất 終わる mà lại giữ 立休らう. Nên **đếm xem
mỗi ứng viên được bao nhiêu synset ủng hộ** rồi xếp theo đó, nghĩa trung tâm mới
nổi lên trước. So sánh:

```
trước:  改善 → 進展/進歩/前進/プログレス   · trái: 衰微/減衰/衰勢/凋残
sau:    改善 → 改良/向上/進歩/改める      · trái: 低下/後退/下落/減退
```

## Còn bảng hạt giống viết tay thì sao

`tu-lien.js` vẫn giữ ~70 cặp trái nghĩa viết tay, và chúng đứng **TRƯỚC** bộ
WordNet. Vì WordNet gộp mọi nghĩa của một từ: 大きい kéo theo cả 低い và 短い
(từ nghĩa "cao/dài") bên cạnh 小さい. Mấy chục cặp viết tay là cặp ai cũng nghĩ
tới đầu tiên; để chúng lên trước thì đề bài hỏi đúng cái người học mong đợi,
phần WordNet chỉ bồi thêm.

## Dựng lại

```bash
curl -LO https://github.com/bond-lab/wnja/releases/download/v1.1/wnjpn.db.gz
gunzip wnjpn.db.gz
curl -LO https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip
unzip wordnet.zip
python3 cong-cu/dung-tulien.py        # ghi thẳng vào cả hai thư mục tu-lien/
```

## Giấy phép

日本語WordNet phát hành theo giấy phép kiểu BSD (dùng, sửa, phát hành lại tự
do), Princeton WordNet cũng vậy. Nếu trích dẫn trong nghiên cứu thì xem
<https://bond-lab.github.io/wnja/> và <https://wordnet.princeton.edu/>.
