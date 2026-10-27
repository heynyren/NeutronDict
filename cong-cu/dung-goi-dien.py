#!/usr/bin/env python3
"""
Dựng gói thuật ngữ ĐIỆN Nhật→Việt gọn cho app từ bộ dữ liệu gốc.

  python3 cong-cu/dung-goi-dien.py <thư mục chứa dictionary_app.json> extension/goi/dien-ja-vi.json

Chỉ giữ thứ app cần để tra: chữ viết, các dạng viết khác, cách đọc, nghĩa, môn.
Không mang theo trích đoạn sách hay dòng nguồn (nặng và không cần để tra).

Mỗi mục: [từ, "cách đọc 1 / cách đọc 2", [nghĩa…], cờ, [dạng viết khác…]]
  cờ bit 1 = TỪ CHUNG (toàn hiragana hoặc một chữ): không được lấn át Google.
  cờ bit 2 = đã được biên tập lại (editorially_reviewed).
  Môn (riron=1,kikai=2,denryoku=4,houki=8) nằm ở phần tử thứ 6.
"""
import json, re, sys, unicodedata

MON = {"riron": 1, "kikai": 2, "denryoku": 4, "houki": 8}

def tach_nghia(s):
    """Tách 'a; b (c; d); e' theo dấu ; nằm NGOÀI ngoặc."""
    out, cur, sau = [], "", 0
    for ch in s:
        if ch in "(（": sau += 1
        elif ch in ")）": sau = max(0, sau - 1)
        if ch == ";" and sau == 0:
            if cur.strip(): out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur.strip(): out.append(cur.strip())
    return out

def sach_ngoac(w):
    """'地絡継電器(GR)' -> ('地絡継電器', 'GR'); '(遅れ)' -> ('遅れ', '')."""
    w = unicodedata.normalize("NFKC", w).strip()
    m = re.fullmatch(r"\((.+)\)", w)
    if m: return m.group(1).strip(), ""
    m = re.fullmatch(r"(.+?)\(([A-Za-z0-9 .\-]+)\)", w)
    if m: return m.group(1).strip(), m.group(2).strip()
    return w, ""

def main():
    nguon = sys.argv[1].rstrip("/") + "/dictionary_app.json"
    dich = sys.argv[2]
    d = json.load(open(nguon, encoding="utf-8"))["entries"]
    out, bo, gop = [], 0, {}
    for e in d:
        tu, viet_tat = sach_ngoac(e["japanese"])
        if not tu: bo += 1; continue
        sen = [s for s in e["senses"] if s.get("preferred")] or e["senses"]
        nghia = []
        for s in sen:
            for x in tach_nghia(s["vietnamese"]):
                m2 = re.fullmatch(r"\((.+)\)", x)       # '(trễ)' -> 'trễ'
                if m2 and "(" not in m2.group(1): x = m2.group(1).strip()
                if x not in nghia: nghia.append(x)
        if not nghia: bo += 1; continue
        if viet_tat and not any(viet_tat in x for x in nghia): nghia[0] += " (" + viet_tat + ")"
        docs = []
        for r in e.get("readings", []):
            for p in r.split(" / "):
                p = p.strip()
                # cách đọc hỏng kiểu 'きごうたるみきごう' (dính chữ lạ) thì bỏ — đã thấy 1 ca
                if "きごう" in p and "きごう" not in tu: continue   # 'きごう…きごう' = rác của bộ tách dấu ngoặc
                if p and p not in docs and len(p) <= len(tu) * 4 + 4: docs.append(p)
        khac = []
        for f in e.get("forms", []):
            f2, _ = sach_ngoac(f)
            if f2 and f2 != tu and f2 not in khac: khac.append(f2)
        chung = 1 if (re.fullmatch(r"[ぁ-んー]+", tu) or len(tu) == 1) else 0
        sua = 2 if any(s.get("review_status", "").startswith("editorial") for s in e["senses"]) \
              or "editorially_reviewed" in json.dumps(e.get("status", "")) else 0
        mon = 0
        for b in e.get("source_books", []): mon |= MON.get(b, 0)
        h = gop.get(tu)
        if h:   # cùng chữ viết sau khi bỏ ngoặc -> gộp, không để hai mục tranh nhau
            for x in nghia:
                if not any(x.lower() == y.lower() for y in h[2]): h[2].append(x)
            for x in docs:
                if x and x not in h[1].split(" / "): h[1] = (h[1] + " / " + x) if h[1] else x
            for x in khac:
                if x not in h[4]: h[4].append(x)
            h[3] |= sua; h[5] |= mon
            continue
        gop[tu] = [tu, " / ".join(docs), nghia, chung | sua, khac, mon]
        out.append(gop[tu])
    out.sort(key=lambda r: r[0])
    json.dump({"id": "dien", "ten": "Điện", "ngu": "ja", "sau": False, "v": 1, "m": out}, open(dich, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    print(len(out), "mục; bỏ", bo)

main()
