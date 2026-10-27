#!/usr/bin/env bash
# Dựng lại TẤT CẢ gói thuật ngữ trong extension/goi/ (rồi chép sang android/www/goi/).
#   bash cong-cu/dung-het-goi.sh [đường-dẫn-jamdict.db]
# Phần tiếng Nhật IT/Y cần jamdict.db (pip download jamdict-data --no-deps, giải nén, xz -d); bỏ qua thì chỉ
# dùng phần soạn tay (it-ja-them.tsv, y-ja-them.tsv).
set -euo pipefail
cd "$(dirname "$0")/.."
D=cong-cu/du-lieu-goi; O=extension/goi; T=$(mktemp -d)
python3 cong-cu/dung-goi-tsv.py --ngu en --id dien --ten "Điện" --chung $D/chung-dien.txt $D/dien-en-vi.tsv $O/dien-en-vi.json
cat $D/it-en-vi.*.tsv > $T/it-en.tsv
python3 cong-cu/dung-goi-tsv.py --ngu en --id it --ten "IT" --giu-anh --chung $D/chung-it.txt $T/it-en.tsv $O/it-en-vi.json
cat $D/y-en-vi.*.tsv > $T/y-en.tsv
python3 cong-cu/dung-goi-tsv.py --ngu en --id y --ten "Y" --chung $D/chung-y.txt $T/y-en.tsv $O/y-en-vi.json
for n in it y; do
  : > $T/$n-ja.tsv
  if [ "${1:-}" ]; then
    python3 -I cong-cu/dung-goi-ja-jmdict.py --db "$1" --nhom $n --en $O/$n-en-vi.json --loai $D/loai-$n-ja.txt --ra $T/$n-ja.auto.tsv
    cat $T/$n-ja.auto.tsv >> $T/$n-ja.tsv
  fi
  cat $D/$n-ja-them.tsv >> $T/$n-ja.tsv
  python3 cong-cu/dung-goi-tsv.py --ngu ja --id $n --ten "$( [ $n = it ] && echo IT || echo Y )" $T/$n-ja.tsv $O/$n-ja-vi.json
done
mkdir -p android/www/goi && cp $O/*.json android/www/goi/
rm -rf "$T"
