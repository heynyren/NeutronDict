/**
 * Dựng `tu-lien-bo.js` từ 日本語WordNet, CHỈ cho những từ có trong sổ tay.
 *
 *   node cong-cu/dung-tulien.mjs wnjpn.db so-tay.json > extension/tu-lien-bo.js
 *
 * Vì sao cắt theo sổ tay: trọn bộ nặng ~90MB. Nhét vào extension thì phình gói
 * cài và chậm lúc nạp, mà phần lớn số từ trong đó người dùng không học. Vài
 * trăm từ thì tệp ra chỉ vài chục KB.
 *
 * Cần `sqlite3` trên máy (macOS và phần lớn bản Linux đã có sẵn).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [db, soTay] = process.argv.slice(2);
if (!db || !soTay) {
  console.error("Dùng: node cong-cu/dung-tulien.mjs wnjpn.db so-tay.json > extension/tu-lien-bo.js");
  process.exit(2);
}

/** Những từ tiếng Nhật đang có trong sổ tay. */
const nb = JSON.parse(readFileSync(soTay, "utf8"));
const kho = nb.notebook || nb;
const tu = new Set();
for (const k of Object.keys(kho)) {
  const e = kho[k];
  if (!e || e.del || !e.word) continue;
  if (String(k).indexOf("javi:") === 0 || String(e.dict || "").indexOf("ja") === 0) tu.add(e.word);
}
if (!tu.size) { console.error("Sổ tay không có từ tiếng Nhật nào."); process.exit(1); }

const hoi = (sql) => execFileSync("sqlite3", ["-separator", "\t", db, sql], { encoding: "utf8", maxBuffer: 1 << 28 });

// Từ -> các synset chứa nó
const dsTu = [...tu].map((t) => "'" + t.replace(/'/g, "''") + "'").join(",");
const bang = {};
for (const dong of hoi(`SELECT lemma, synset FROM word JOIN sense USING (wordid) WHERE lemma IN (${dsTu});`).split("\n")) {
  const [lemma, syn] = dong.split("\t");
  if (!lemma || !syn) continue;
  (bang[lemma] = bang[lemma] || { syn: new Set(), dong: new Set(), trai: new Set() }).syn.add(syn);
}

/** Các lemma tiếng Nhật của một synset. */
function lemmaCua(dsSyn) {
  const ra = {};
  if (!dsSyn.length) return ra;
  const l = dsSyn.map((s) => "'" + s + "'").join(",");
  for (const dong of hoi(`SELECT sense.synset, word.lemma FROM sense JOIN word USING (wordid)
      WHERE sense.synset IN (${l}) AND word.lang='jpn';`).split("\n")) {
    const [s, w] = dong.split("\t");
    if (!s || !w) continue;
    (ra[s] = ra[s] || []).push(w);
  }
  return ra;
}

const moiSyn = [...new Set(Object.values(bang).flatMap((x) => [...x.syn]))];
const theoSyn = lemmaCua(moiSyn);

// Trái nghĩa: quan hệ 'ant' nằm ở mức SYNSET trong wnjpn
const trai = {};
if (moiSyn.length) {
  const l = moiSyn.map((s) => "'" + s + "'").join(",");
  for (const dong of hoi(`SELECT synset1, synset2 FROM synlink WHERE link='ant' AND synset1 IN (${l});`).split("\n")) {
    const [a, b] = dong.split("\t");
    if (a && b) (trai[a] = trai[a] || []).push(b);
  }
}
const theoSynTrai = lemmaCua([...new Set(Object.values(trai).flat())]);

const ra = {};
for (const t of Object.keys(bang)) {
  const d = new Set(), tr = new Set();
  for (const s of bang[t].syn) {
    for (const w of theoSyn[s] || []) if (w !== t) d.add(w);
    for (const s2 of trai[s] || []) for (const w of theoSynTrai[s2] || []) tr.add(w);
  }
  const dong = [...d].slice(0, 8), nghich = [...tr].slice(0, 8);
  if (dong.length || nghich.length) ra[t] = { dong, trai: nghich };
}

process.stderr.write("Dựng được " + Object.keys(ra).length + "/" + tu.size + " từ.\n");
process.stdout.write(
  "/* Sinh bằng cong-cu/dung-tulien.mjs từ 日本語WordNet. Đừng sửa tay. */\n" +
  "(function (g) { g.TuLienBo = " + JSON.stringify(ra) + "; })" +
  "(typeof self !== \"undefined\" ? self : this);\n");
