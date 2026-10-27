#!/usr/bin/env python3
"""
Dựng một gói thuật ngữ cho app từ tệp TSV (soạn tay hoặc xuất từ nguồn khác).

  python3 cong-cu/dung-goi-tsv.py --ngu en --id dien --ten "Điện" in.tsv extension/goi/dien-en-vi.json
  python3 cong-cu/dung-goi-tsv.py --ngu ja --id it --ten "IT" --sau it-ja-vi.tsv out.json

Định dạng dòng (bỏ qua dòng trống và dòng bắt đầu bằng #):
  en:  từ Anh <TAB> nghĩa (cách nhau bằng ;) <TAB> dạng khác (cách nhau bằng |, tuỳ chọn)
  ja:  từ Nhật <TAB> cách đọc <TAB> nghĩa (cách nhau bằng ;) <TAB> dạng khác (tuỳ chọn)

--sau        gói chưa có người duyệt / ngành mà nghĩa sai có hại: LUÔN đứng sau Google.
--giu-anh    nghĩa nào trùng đúng với từ gốc (thuật ngữ dân trong ngành vẫn để nguyên tiếng Anh) được
             đưa lên ĐẦU danh sách nghĩa.
--chung F    tệp liệt kê các từ đơn tiếng Anh đa nghĩa ngoài đời thường (Google đứng trước).
Từ Nhật toàn hiragana hoặc chỉ một chữ tự động là từ chung.
Mục trùng từ được gộp. Kết quả: {id, ten, ngu, sau, m:[[từ, đọc, [nghĩa], cờ, [dạng khác], 0]…]}
"""
import argparse, json, re, sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ngu", required=True, choices=["en", "ja"])
    ap.add_argument("--id", required=True)
    ap.add_argument("--ten", required=True)
    ap.add_argument("--sau", action="store_true")
    ap.add_argument("--chung")
    ap.add_argument("--giu-anh", action="store_true", dest="giu_anh")
    ap.add_argument("nguon"); ap.add_argument("dich")
    a = ap.parse_args()
    chung = set()
    if a.chung:
        for d in open(a.chung, encoding="utf-8"):
            if not d.startswith("#"): chung.update(d.lower().split())
    gop, out, loi, bo = {}, [], 0, 0
    for so, d in enumerate(open(a.nguon, encoding="utf-8"), 1):
        d = d.rstrip("\n")
        if not d.strip() or d.startswith("#"): continue
        c = d.split("\t")
        if a.ngu == "en":
            if len(c) < 2: loi += 1; print("dòng", so, "thiếu cột:", d[:60], file=sys.stderr); continue
            tu, doc, nghia, khac = c[0].strip(), "", c[1], (c[2] if len(c) > 2 else "")
        else:
            if len(c) < 3: loi += 1; print("dòng", so, "thiếu cột:", d[:60], file=sys.stderr); continue
            tu, doc, nghia, khac = c[0].strip(), c[1].strip(), c[2], (c[3] if len(c) > 3 else "")
        nghia = [x.strip() for x in nghia.split(";") if x.strip()]
        khac = [x.strip() for x in khac.split("|") if x.strip()]
        if not tu or not nghia: loi += 1; continue
        # Mục chỉ lặp lại đúng chữ gốc (Go → Go, React → React) không thêm thông tin gì, lại làm
        # nhiễu khi từ đó cũng là từ thường ("go" = đi): bỏ.
        if a.ngu == "en" and all(x.lower() == tu.lower() for x in nghia): bo += 1; continue
        k = tu.lower() if a.ngu == "en" else tu
        if k in gop:
            h = gop[k]
            for x in nghia:
                if x not in h[2]: h[2].append(x)
            for x in khac:
                if x not in h[4]: h[4].append(x)
            if doc and doc not in h[1].split(" / "): h[1] = (h[1] + " / " + doc) if h[1] else doc
            continue
        if a.ngu == "en":
            ch = 1 if (" " not in tu and "-" not in tu and k in chung) else 0
        else:
            ch = 1 if (re.fullmatch(r"[ぁ-んー]+", tu) or len(tu) == 1) else 0
        gop[k] = [tu, doc, nghia, ch, khac, 0]
        out.append(gop[k])
    if a.giu_anh:
        for r in out:
            r[2].sort(key=lambda x: 0 if x.lower() == r[0].lower() else 1)   # sort ổn định: giữ thứ tự còn lại
    out.sort(key=lambda r: r[0].lower())
    json.dump({"id": a.id, "ten": a.ten, "ngu": a.ngu, "sau": bool(a.sau), "v": 1, "m": out},
              open(a.dich, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(a.id, a.ngu, len(out), "mục", ("; %d dòng lỗi" % loi) if loi else "", ("; bỏ %d mục chỉ lặp lại chữ gốc" % bo) if bo else "")

main()
