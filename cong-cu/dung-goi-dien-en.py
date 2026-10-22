#!/usr/bin/env python3
"""
Dựng gói thuật ngữ ĐIỆN Anh→Việt từ cong-cu/du-lieu-goi/dien-en-vi.tsv.

  python3 cong-cu/dung-goi-dien-en.py cong-cu/du-lieu-goi/dien-en-vi.tsv extension/goi/dien-en-vi.json

Dạng mục giống gói Nhật: [từ, "", [nghĩa…], cờ, [dạng khác…], 0].
cờ bit 1 = TỪ CHUNG: từ đơn mà ngoài ngành điện nghĩa khác hẳn (work, line, base…),
nên Google đứng trước, gói chỉ bổ sung phía sau.
"""
import json, sys

CHUNG = set("""work power line base source unit speed reference error load node gain field pole cell coil bus loop
branch phase charge energy core switch ground earth live dead plug panel terminal signal noise register counter
latch period tower wire lamp heater fuel coal fault failure testing inspection installation protection
sensitivity selectivity discrimination precision accuracy resolution maintenance cooling interference reserve
potential demand generation transmission distribution outlet socket crane elevator traction observer
protocol leading lagging reliability stability""".split())

def main():
    nguon, dich = sys.argv[1], sys.argv[2]
    gop, out = {}, []
    for dong in open(nguon, encoding="utf-8"):
        dong = dong.rstrip("\n")
        if not dong.strip() or dong.startswith("#"): continue
        c = dong.split("\t")
        if len(c) < 2: continue
        tu = c[0].strip()
        nghia = [x.strip() for x in c[1].split(";") if x.strip()]
        khac = [x.strip() for x in (c[2].split("|") if len(c) > 2 else []) if x.strip()]
        k = tu.lower()
        if k in gop:
            h = gop[k]
            for x in nghia:
                if x not in h[2]: h[2].append(x)
            for x in khac:
                if x not in h[4]: h[4].append(x)
            continue
        chung = 1 if (" " not in tu and "-" not in tu and k in CHUNG) else 0
        gop[k] = [tu, "", nghia, chung, khac, 0]
        out.append(gop[k])
    out.sort(key=lambda r: r[0].lower())
    json.dump({"ten": "Điện", "ngu": "en", "v": 1, "m": out}, open(dich, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    print(len(out), "mục")

main()
