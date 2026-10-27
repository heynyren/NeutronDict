# Ghi nhận nguồn dữ liệu

## JMdict / EDICT (EDRDG)

Các gói thuật ngữ tiếng Nhật `extension/goi/it-ja-vi.json` và `extension/goi/y-ja-vi.json` (và bản chép trong
`android/www/goi/`) dùng **chữ viết và cách đọc tiếng Nhật** lấy từ bộ từ điển JMdict / EDICT, một phần dữ liệu của
[Electronic Dictionary Research and Development Group](https://www.edrdg.org/), theo giấy phép
[Creative Commons Attribution-ShareAlike 4.0](https://www.edrdg.org/edrdg/licence.html).

- Chỉ lấy chữ Nhật, cách đọc và nhãn lĩnh vực (computing / medicine / anatomy…). Nghĩa tiếng Việt do người soạn viết;
  các nghĩa phụ, từ đồng nghĩa / trái nghĩa và tham chiếu của JMdict **không** được dùng.
- Theo điều kiện ShareAlike, hai tệp dữ liệu nói trên được phát hành lại theo cùng giấy phép CC BY-SA 4.0.
- Cách dựng: `cong-cu/dung-goi-ja-jmdict.py`.

## Các phần còn lại

Gói thuật ngữ Điện (Nhật→Việt) do chủ dự án cung cấp. Gói Điện (Anh→Việt), IT và Y (Anh→Việt, phần Nhật soạn tay) do Claude
soạn từ kiến thức kỹ thuật phổ thông; sai chỗ nào thì sửa trong `cong-cu/du-lieu-goi/*.tsv` rồi chạy
`bash cong-cu/dung-het-goi.sh`.

## Dữ liệu giáo trình cho chế độ Ôn thi JLPT

`extension/jlpt/n3.json`, `extension/jlpt/n2.json` (và bản chép trong `android/www/jlpt/`) được dựng từ các database giáo
trình do chủ dự án cung cấp (bộ giáo trình Gungun/Dũng Mori N3 và N2). Nội dung gốc của giáo trình thuộc quyền của chủ
sở hữu tương ứng — kiểm tra quyền sử dụng trước khi phát hành rộng rãi. JMdict/KANJIDIC chỉ được dùng để KIỂM TRA chéo
(loại mục trích sai), không chép dữ liệu của chúng vào hai tệp trên.
