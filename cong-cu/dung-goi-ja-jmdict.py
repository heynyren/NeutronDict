#!/usr/bin/env python3
"""
Sinh phần TIẾNG NHẬT của một gói thuật ngữ (IT / Y) bằng cách bắc cầu qua tiếng Anh.

  pip download jamdict-data --no-deps -d X && (giải nén, xz -d jamdict.db.xz)
  python3 -I cong-cu/dung-goi-ja-jmdict.py --db jamdict.db --nhom it \
      --en extension/goi/it-en-vi.json --ra it-ja-vi.tsv
  python3 cong-cu/dung-goi-tsv.py --ngu ja --id it --ten IT it-ja-vi.tsv extension/goi/it-ja-vi.json

Từ JMdict CHỈ lấy: chữ Nhật, cách đọc, và nghĩa tiếng Anh ĐẦU TIÊN của nghĩa mang nhãn ngành
(computing / medicine / anatomy…). KHÔNG lấy các nghĩa phụ, từ đồng/trái nghĩa hay tham chiếu của
JMdict — chúng dễ gây hiểu nhầm. Nghĩa tiếng Việt là của bảng Anh→Việt do người soạn; muốn một
từ Nhật có mặt thì nghĩa Anh đầu tiên của nó phải TRÙNG KHỚP NGUYÊN CHỮ với một mục Anh→Việt.
Từ Nhật mà nghĩa Anh không trùng thì bỏ qua (thà thiếu còn hơn gán nhầm).

JMdict/EDICT © EDRDG, giấy phép CC BY-SA 4.0 — xem NOTICE.md.
"""
import argparse, json, re, sqlite3, unicodedata

NHOM = {
    "it": ["computing"],
    "y": ["medicine", "anatomy", "physiology", "pharmacy", "biochemistry"],
}
BO = {"obsolete term", "slang", "archaism", "vulgar", "derogatory", "rare", "obscure term", "colloquialism", "dated term"}

def norm(g):
    g = re.sub(r"\s*\(.*?\)\s*", " ", g)
    return re.sub(r"\s+", " ", g.strip().lower().replace("-", " "))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True); ap.add_argument("--nhom", required=True, choices=list(NHOM))
    ap.add_argument("--en", nargs="+", required=True, help="gói Anh→Việt dạng JSON (có thể nhiều gói)")
    ap.add_argument("--ra", required=True)
    ap.add_argument("--loai", help="tệp liệt kê từ Nhật bị loại (đã rà tay thấy gán nhầm nghĩa)")
    a = ap.parse_args()
    ks = {}
    for p in a.en:
        for m in json.load(open(p, encoding="utf-8"))["m"]:
            for k in [m[0]] + m[4]: ks.setdefault(norm(k), m)
    loai = set()
    if a.loai:
        for d in open(a.loai, encoding="utf-8"):
            if not d.startswith("#"): loai.update(d.split())
    c = sqlite3.connect(a.db)
    seen, dong = set(), []
    for fld in NHOM[a.nhom]:
        for sid, idseq in c.execute("select s.ID,s.idseq from Sense s join field f on f.sid=s.ID where f.text=? order by s.ID", (fld,)).fetchall():
            if idseq in seen: continue
            if {r[0] for r in c.execute("select text from misc where sid=?", (sid,))} & BO: continue
            gl = [r[0] for r in c.execute("select text from SenseGloss where sid=? and lang='eng' order by rowid", (sid,))]
            if not gl: continue
            m = ks.get(norm(gl[0]))
            if not m: continue
            kanji = [unicodedata.normalize("NFKC", r[0]) for r in c.execute("select text from Kanji where idseq=? order by ID", (idseq,))]
            kana = [r[0] for r in c.execute("select text from Kana where idseq=? order by ID", (idseq,))]
            if not kana: continue
            tu = kanji[0] if kanji else kana[0]
            if tu in loai or kana[0] in loai: continue
            doc = " / ".join(dict.fromkeys(kana))
            khac = [x for x in dict.fromkeys(kanji[1:] + ([kana[0]] if kanji else [])) if x != tu]
            seen.add(idseq)
            dong.append("\t".join([tu, doc, "; ".join(m[2][:3]), "|".join(khac)]))
    open(a.ra, "w", encoding="utf-8").write(
        "# Sinh tự động bởi cong-cu/dung-goi-ja-jmdict.py (chữ Nhật + cách đọc từ JMdict, CC BY-SA 4.0; nghĩa Việt từ bảng Anh→Việt)\n" + "\n".join(dong) + "\n")
    print(a.nhom, len(dong), "mục")

main()
