# Nạp 日本語WordNet vào bài liên kết từ

Bài "nhặt tập đồng nghĩa / trái nghĩa" lấy dữ liệu theo ba tầng (xem
`extension/tu-lien.js`):

1. **Bộ dữ liệu bạn tự nạp** — `window.TuLienBo`. Trống sẵn.
2. **Bảng hạt giống** viết tay trong `tu-lien.js`: ~70 cặp trái nghĩa và ~12
   nhóm đồng nghĩa thông dụng. Đây là hạt giống, không phải từ điển.
3. **Vòng dịch ngược** qua Google: ra được đồng nghĩa, KHÔNG ra được trái nghĩa.

Muốn phủ rộng thì cắm 日本語WordNet vào tầng 1. Tôi không dựng sẵn tệp đó trong
kho vì máy chạy phiên làm việc bị chặn mạng ra ngoài GitHub — bạn chạy một lần
trên máy mình:

```bash
# 1. Tải 日本語WordNet (SQLite, giấy phép kiểu BSD — dùng và phát hành lại tự do)
curl -LO https://bond-lab.github.io/wnja/data/wnjpn.db.gz
gunzip wnjpn.db.gz

# 2. Dựng tệp dữ liệu, CHỈ cho những từ đang có trong sổ tay của bạn
node cong-cu/dung-tulien.mjs wnjpn.db so-tay.json > extension/tu-lien-bo.js
```

`so-tay.json` là tệp bạn xuất ra từ **Sổ tay → Xuất & sao lưu → Sao lưu .json**.

Cắt theo sổ tay chứ không lấy trọn bộ là cố ý: trọn 日本語WordNet nặng khoảng 90
MB, nhét vào extension thì vừa phình gói cài vừa chậm lúc nạp, mà 99% số từ
trong đó bạn không học. Vài trăm từ trong sổ tay của bạn thì tệp ra chỉ vài chục
KB.

Nạp xong, thêm một dòng vào `extension/notebook.html` (ngay trước `tu-lien.js`):

```html
<script src="tu-lien-bo.js"></script>
```

Nếu trích dẫn trong nghiên cứu, 日本語WordNet đề nghị dẫn nguồn — xem
<https://bond-lab.github.io/wnja/>.
