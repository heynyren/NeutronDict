# -*- coding: utf-8 -*-
"""Bộ đồng nghĩa / trái nghĩa tiếng Nhật, XẾP HẠNG theo số synset ủng hộ.

Một từ tiếng Nhật ứng với nhiều synset (nhiều nghĩa) của WordNet. Gom hết ứng
viên của mọi synset rồi cắt lấy 6 cái đầu thì thứ tự là ngẫu nhiên: 始まる mất
終わる mà lại giữ 立休らう. Đếm xem mỗi ứng viên được BAO NHIÊU synset ủng hộ rồi
xếp theo đó thì nghĩa trung tâm nổi lên trước.
"""
import sqlite3, json, re, sys, os, collections

POS_TEP = {"n": "data.noun", "v": "data.verb", "a": "data.adj", "r": "data.adv"}
c = sqlite3.connect("wnjpn.db")

jp = collections.defaultdict(list)
for syn, lemma in c.execute(
        "SELECT sense.synset, word.lemma FROM sense JOIN word USING (wordid) WHERE word.lang='jpn'"):
    jp[syn].append(lemma)

ant = collections.defaultdict(set)
for pos, tep in POS_TEP.items():
    for dong in open("wordnet/" + tep, encoding="utf-8", errors="replace"):
        if dong.startswith("  "): continue
        phan = dong.split("|")[0].split()
        try:
            off, ss_type = phan[0], phan[2]
            i = 4 + int(phan[3], 16) * 2
            p_cnt = int(phan[i]); i += 1
            for _ in range(p_cnt):
                sym, o2, p2 = phan[i], phan[i+1], phan[i+2]; i += 4
                if sym == "!":
                    a = off + "-" + ("a" if ss_type == "s" else ss_type)
                    b = o2 + "-" + ("a" if p2 == "s" else p2)
                    ant[a].add(b); ant[b].add(a)
        except (IndexError, ValueError): continue

def sach(t):
    return bool(t) and len(t) <= 14 and not re.search(r"[.。！？!?、,;:…\n]", t)

tu_syn = collections.defaultdict(set)
for syn, ds in jp.items():
    for t in ds: tu_syn[t].add(syn)

# Một từ nằm trong càng NHIỀU synset thì càng chung chung; dùng để phá hoà.
pho_bien = {t: len(s) for t, s in tu_syn.items()}

TOI_DA = 6
ra = {}
for t, dsSyn in tu_syn.items():
    if not sach(t): continue
    dD, dT = collections.Counter(), collections.Counter()
    for s in dsSyn:
        for w in jp.get(s, ()):
            if w != t and sach(w): dD[w] += 1
        for s2 in ant.get(s, ()):
            for w in jp.get(s2, ()):
                if w != t and sach(w): dT[w] += 1
    xep = lambda d: [w for w, _ in sorted(d.items(), key=lambda kv: (-kv[1], -pho_bien.get(kv[0], 0), len(kv[0])))][:TOI_DA]
    dong, trai = xep(dD), xep(dT)
    if len(dong) >= 2 or len(trai) >= 1:
        o = {}
        if dong: o["dong"] = dong
        if trai: o["trai"] = trai
        ra[t] = o

# Cắt thành 32 mảnh theo mã của chữ đầu (~116 KB mỗi mảnh). Xem chú thích
# napBo() trong tu-lien.js về việc vì sao không nạp cả cục.
SO_MANH = 32
manh = collections.defaultdict(list)
for t, v in ra.items():
    manh[ord(t[0]) % SO_MANH].append(
        t + "\t" + ",".join(v.get("dong", [])) + "\t" + ",".join(v.get("trai", [])))
tong = 0
for thumuc in ("extension/tu-lien", "android/www/tu-lien"):
    os.makedirs(thumuc, exist_ok=True)
    for i in range(SO_MANH):
        d = "\n".join(manh.get(i, []))
        open(os.path.join(thumuc, "%d.txt" % i), "w", encoding="utf-8").write(d)
        if thumuc.startswith("extension"): tong += len(d.encode())
txt = "x" * tong
print("từ:", len(ra), "· có trái nghĩa:", sum(1 for v in ra.values() if "trai" in v),
      "·", round(tong/1048576, 2), "MB ·", SO_MANH, "mảnh", file=sys.stderr)
for t in ["改善", "大きい", "始まる", "難しい", "勉強", "多い", "上がる", "安全"]:
    if t in ra:
        print(" ", t, "→ đồng:", "/".join(ra[t].get("dong", [])[:4]),
              "· trái:", "/".join(ra[t].get("trai", [])[:4]), file=sys.stderr)
