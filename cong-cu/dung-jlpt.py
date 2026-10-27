#!/usr/bin/env python3
"""
Dựng dữ liệu cho chế độ "Ôn thi JLPT" từ database giáo trình (SQLite do chủ dự án cung cấp).

  python3 cong-cu/dung-jlpt.py --cap n3 --db japanese_n3.sqlite3 --jmdict jamdict.db --ra extension/jlpt/n3.json
  python3 cong-cu/dung-jlpt.py --cap n2 --db japanese_n2.sqlite3 --ra extension/jlpt/n2.json

Mỗi file là MỘT MÀN: các chương (CHƯƠNG n của giáo trình) → các bài (BÀI 1, 2, 3) → từ vựng, chữ Hán,
mẫu ngữ pháp, câu ví dụ. Bài được nhận ra theo thứ tự trang trong PDF: tiêu đề "CHỮ HÁN - BÀI n" /
"TỪ VỰNG - BÀI n" mở một bài mới; trang "LIST TỪ VỰNG / ĐỌC HIỂU / NGHE HIỂU" cuối chương là phần phụ, bỏ.

--jmdict (tuỳ chọn): đối chiếu với JMdict/KANJIDIC để LOẠI những mục trích sai từ PDF — cách đọc của từ không khớp
JMdict (複数=ふくそう…) và chữ Hán bị gán nhầm Hán Việt / âm On-Kun của chữ khác (rất hay gặp ở N2, nơi một
nhóm chữ Hán dùng chung một khối thông tin). Chỉ để KIỂM TRA: không chép dữ liệu JMdict vào kết quả.

Chỉ dùng dữ liệu có đáp án nằm sẵn trong giáo trình (nghĩa, cách đọc, Hán Việt, ví dụ có dịch). Câu hỏi
trắc nghiệm trong sách KHÔNG dùng vì database ghi rõ là chưa có đáp án đã kiểm chứng.
"""
import argparse, json, re, sqlite3, collections, sys, unicodedata

def gon(s):
    return re.sub(r"\s+", " ", (s or "").replace("❖", "; ").replace("\n", " ")).strip(" ;,")

def nghia_sach(s):
    s = gon(s)
    s = re.sub(r"\s*;\s*;\s*", "; ", s)
    # nhiều nghĩa dính nhau bằng '; ' và ', ' — giữ tối đa 3 nghĩa đầu cho gọn
    parts = [p.strip() for p in re.split(r";", s) if p.strip()]
    return "; ".join(parts[:3])

_NGUYEN_AM = "aàáảãạâấầẩẫậăắằẳẵặeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵ"
_DAU = set("àáảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ")
def viet_hop_le(s):
    """Nghĩa tiếng Việt có trông như tiếng Việt không? Bắt các chuỗi bị OCR trộn chữ ('lbấỏy', 'm đổ')."""
    toks = re.findall(r"[a-zà-ỹđ]+", (s or "").lower())
    if not toks: return False
    for t in toks:
        if len(t) > 8: return False
        if len(t) == 1 and t not in _NGUYEN_AM and t != "đ": return False
        if sum(1 for ch in t if ch in _DAU) > 1: return False
        if len(t) > 1 and not any(ch in _NGUYEN_AM or ch == "y" for ch in t): return False
        if re.search(r"(aa|ee|ii|oo|uu)", t): return False
    return True

HV_OK = re.compile(r"^[A-ZÀ-ỸĐ][A-ZÀ-ỸĐ /]{0,24}$")
def hv_sach(s):
    s = gon(s).strip("・ ")
    return s if s and HV_OK.match(s) else ""

def chia_bai(c, sid):
    """page -> số bài (1,2,3…); 0 = phần phụ (đọc hiểu / nghe hiểu / mục lục)."""
    mp, cur, tung_thay_ngu_phap = {}, 0, False
    for pg, tx, cat in c.execute("select page,text,category from source_units where source_id=? order by ordinal", (sid,)):
        if pg is None: continue
        dau = tx[:260]
        if cat == "other" and re.search(r"LIST TỪ VỰNG|ĐỌC HIỂU\s*-\s*CHUYÊN", dau):
            cur = 0
        elif cat == "other" and re.search(r"B[ÀA]I", dau) and re.search(r"TỪ VỰNG|CH[ỮU]\s*H[ÁA]N|HÁN", dau):
            cur = (cur or 0) + 1 if cur is not None else 1
            if cur > 9: cur = 9
            tung_thay_ngu_phap = False
        mp[pg] = cur
    return mp

def tai_jmdict(path):
    """(kana_cua_tu, doc_chu_han) từ JMdict/KANJIDIC để kiểm tra chéo."""
    j = sqlite3.connect(path)
    kana = collections.defaultdict(set)
    for t, k in j.execute("select k.text,n.text from Kanji k join Kana n on n.idseq=k.idseq"): kana[t].add(k)
    kd = {}
    for lit, rt, val in j.execute("select c.literal,r.r_type,r.value from character c join rm_group g on g.cid=c.ID join reading r on r.gid=g.ID where r.r_type in ('ja_on','ja_kun')"):
        kd.setdefault(lit, {"on": set(), "kun": set()})["on" if rt == "ja_on" else "kun"].add(val)
    return kana, kd

def doc_tu_hop_le(w, r, kana):
    w2, r2 = w.replace("〜", "").replace("～", ""), r.replace("〜", "").replace("～", "").replace(" ", "")
    if w2 in kana: return r2 in kana[w2]
    return True            # JMdict không có từ này: không đủ căn cứ để loại

def han_hop_le(h, kd):
    k = kd.get(h["c"])
    if not k: return True
    on = set(re.findall(r"[ァ-ヶー]+", h["on"]))
    kun = [x.replace("・", "") for x in re.findall(r"[ぁ-ん・ー]+", h["kun"])]
    kdkun = {x.replace(".", "").replace("-", "") for x in k["kun"]}
    stems = {x.split(".")[0].replace("-", "") for x in k["kun"]}
    if on and on & k["on"]: return True
    if any(x in kdkun or x in stems for x in kun): return True
    return not on and not kun      # không có thông tin đọc để đối chiếu

def sach_vi(s):
    s = re.sub(r"[\u200b-\u200f\ufeff]", "", s or "")
    s = gon(s)
    s = re.sub(r"^[。.\s]+", "", s)
    s = re.sub(r"^[\)\]）\s]+", "", s)                 # ")" lạc ở đầu do OCR
    if s.count("(") != s.count(")"): s = s.replace("(", "").replace(")", "")
    return s.strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cap", required=True); ap.add_argument("--db", required=True); ap.add_argument("--ra", required=True); ap.add_argument("--jmdict")
    a = ap.parse_args()
    c = sqlite3.connect(a.db)
    kana, kd = tai_jmdict(a.jmdict) if a.jmdict else (None, None)
    bo = collections.Counter()
    nguon = [(sid, n) for sid, n in c.execute("select id,file_name from sources")
             if re.match(r"CH[ƯU]ƠNG\s*\d", unicodedata.normalize("NFC", n))]
    def so(n): return int(re.search(r"(\d+)", unicodedata.normalize("NFC", n)).group(1))
    nguon.sort(key=lambda x: so(x[1]))
    # luôn đánh số bài trong chương từ 1: dùng bộ đếm thay vì số trên tiêu đề (tiêu đề N3 bị vỡ chữ)
    chuong = []
    tong = collections.Counter()
    for sid, ten in nguon:
        num = so(ten)
        trang = {u: p for u, p in c.execute("select id,page from source_units where source_id=?", (sid,))}
        mp = chia_bai_dem(c, sid)
        baimax = max(mp.values()) if mp else 0
        bai = [dict(so=i, tu=[], han=[], pp=[], vd=[]) for i in range(1, baimax + 1)]
        def vao(unit):
            return mp.get(trang.get(unit), 0)
        # ---- từ vựng ----
        seen = set()
        for vid, bieu, doc, ng, hv, unit in c.execute(
            "select v.id,v.expression,v.reading_kana,s.meaning_vi,s.sino_vietnamese,s.unit_id "
            "from vocabulary_senses s join vocabulary v on v.id=s.vocabulary_id where s.source_id=? order by (select ordinal from source_units where id=s.unit_id)", (sid,)):
            b = vao(unit)
            if not b: continue
            nghia = nghia_sach(ng); doc = gon(doc)
            if not bieu or not doc or not nghia or len(nghia) > 90: continue
            if not viet_hop_le(nghia): bo["nghĩa bị trộn chữ"] += 1; continue
            if kana is not None and not doc_tu_hop_le(gon(bieu), doc, kana): bo["từ sai cách đọc"] += 1; continue
            k = (b, bieu, doc)
            if k in seen: continue
            seen.add(k)
            bai[b - 1]["tu"].append(dict(id=vid, w=gon(bieu), r=doc, m=nghia, hv=hv_sach(hv)))
        # ---- chữ Hán ----
        seen = set()
        for kid, ch, hv, kun, on, nho, unit in c.execute(
            "select kanji_id,character,sino_vietnamese,kun_readings_text,on_readings_text,mnemonic_vi,unit_id from kanji_entries where source_id=? order by (select ordinal from source_units where id=unit_id)", (sid,)):
            b = vao(unit)
            if not b or (b, ch) in seen: continue
            seen.add((b, ch))
            hh = dict(c=ch, hv="", kun=gon((kun or "").replace("、", " ")), on=gon((on or "").replace("、", " ")))
            if kd is not None and not han_hop_le(hh, kd): bo["chữ Hán gán nhầm"] += 1; continue
            bai[b - 1]["han"].append(dict(id=kid, c=ch, hv=hv_sach(hv),
                kun=gon((kun or "").replace("、", " ")).replace(" ・", "・"), on=gon((on or "").replace("、", " ")), nho=gon(nho)[:140]))
        # ---- ngữ pháp ----
        gmap = {}
        for gid, pat, mean, form, expl, unit in c.execute(
            "select g.id,g.pattern,s.meaning_vi,s.formation,s.explanation,s.unit_id from grammar_senses s join grammar g on g.id=s.grammar_id where s.source_id=? order by (select ordinal from source_units where id=s.unit_id)", (sid,)):
            b = vao(unit)
            if not b or not gon(mean): continue
            if gid in gmap: continue
            gmap[gid] = (b, len(bai[b - 1]["pp"]))
            bai[b - 1]["pp"].append(dict(id=gid, p=gon(pat), m=gon(mean), cn=gon(form)[:80], gt=gon(expl)[:200]))
        # ---- ví dụ ----
        voc_lookup = {}
        for b in bai:
            for t in b["tu"]: voc_lookup.setdefault(t["id"], t)
        seen = set()
        for eid, jp, vi, gid, vid, unit in c.execute(
            "select e.id,e.japanese,e.translation_vi,o.grammar_id,o.vocabulary_id,o.unit_id from example_occurrences o join examples e on e.id=o.example_id where o.source_id=? order by (select ordinal from source_units where id=o.unit_id)", (sid,)):
            b = vao(unit)
            if not b: continue
            vi = sach_vi(vi)
            if vi and not viet_hop_le(vi): vi = ""
            if not jp or len(jp) > 90: continue
            if vid and not (gid and gid in gmap) and not vi: continue    # ví dụ từ vựng mà không có dịch: bỏ
            key = (b, eid, gid, vid)
            if key in seen: continue
            seen.add(key)
            d = dict(j=gon(jp), v=vi)
            if gid and gid in gmap: d["g"] = gid
            if vid: d["t"] = vid
            bai[b - 1]["vd"].append(d)
        chuong.append(dict(so=num, ten=ten, bai=[b for b in bai if b["tu"] or b["han"] or b["pp"]]))
    if bo: print("đã loại:", dict(bo))
    out = dict(cap=a.cap.upper(), v=1, chuong=chuong)
    json.dump(out, open(a.ra, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    tt = sum(len(b["tu"]) for ch in chuong for b in ch["bai"])
    print(a.cap, "chương", len(chuong), "bài", sum(len(ch["bai"]) for ch in chuong), "từ", tt,
          "hán", sum(len(b["han"]) for ch in chuong for b in ch["bai"]), "pháp", sum(len(b["pp"]) for ch in chuong for b in ch["bai"]),
          "ví dụ", sum(len(b["vd"]) for ch in chuong for b in ch["bai"]))

def chia_bai_dem(c, sid):
    """page -> số bài trong chương (1..); 0 = phần phụ cuối chương."""
    mp, cur, phu = {}, 0, False
    for pg, tx, cat in c.execute("select page,text,category from source_units where source_id=? order by ordinal", (sid,)):
        if pg is None: continue
        dau = tx[:300]
        if cat == "other" and re.search(r"LIST TỪ VỰNG|ĐỌC HIỂU\s*-\s*CHUYÊN", dau):
            phu = True
        elif cat == "other" and re.search(r"B[ÀA]I", dau) and re.search(r"TỪ VỰNG|CH[ỮU]\s*H[ÁA]N|HÁN", dau) and not phu:
            cur += 1
        mp[pg] = 0 if phu else cur
    return mp

main()
