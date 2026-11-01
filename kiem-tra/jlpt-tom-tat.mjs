import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const read = p => readFileSync(p, "utf8");
assert.equal(read("extension/jlpt-cau-hoi.js"), read("android/www/jlpt-cau-hoi.js"));
assert.equal(read("extension/jlpt-giao-dien.js"), read("android/www/jlpt-giao-dien.js"));
let stages = 0;
for (const root of ["extension", "android/www"]) {
  const scope = {}; vm.createContext(scope);
  vm.runInContext(read(root + "/jlpt-cau-hoi.js"), scope);
  const CH = scope.JlptCauHoi;
  for (const name of ["n5", "n4", "n3", "n2", "kaiwa"]) {
    const course = JSON.parse(read(root + "/jlpt/" + name + ".json"));
    const all = CH.chiaChang(course);
    const before = JSON.stringify(course);
    // Preview must not consume randomness or create a quiz.
    vm.runInContext("Math.random = () => { throw Error('preview consumed randomness'); }", scope);
    for (const stage of all) {
      const s = CH.tomTatChang(course, stage);
      assert.ok(s.items.length, root + " " + name + " " + stage.id);
      assert.equal(JSON.stringify(s), JSON.stringify(CH.tomTatChang(course, stage)));
      if (!s.tongHop) {
        assert.equal(s.items.length, stage.items.length);
        stage.items.forEach((item, i) => {
          const row = s.items[i];
          assert.equal(row.id, item.id);
          assert.equal(row.loai, stage.loai);
          assert.equal(row.chu, stage.loai === "han" ? item.c : stage.loai === "tu" ? item.w : CH.tenPhap(item.p));
          const source = String(stage.loai === "han" ? item.hv || "" : item.m || "").replace(/\s+/g, " ").trim();
          assert.ok(source.startsWith(row.nghia.replace(/…$/, "")), "meaning comes from source");
          assert.ok(row.nghia.length <= 72);
        });
      } else {
        assert.ok(s.items.length <= 6);
        for (const type of ["han", "tu", "pp"]) {
          const pool = stage.loai === "boss" ? course._idx[type] :
            course._idx[{han:"chuongHan",tu:"chuongTu",pp:"chuongPp"}[type]][stage.ci];
          const rows = s.items.filter(x => x.loai === type);
          assert.equal(rows.length, Math.min(2, pool.length));
          assert.ok(rows.every(r => pool.some(x => x.id === r.id)), "chapter scope");
        }
      }
      stages++;
    }
    assert.equal(JSON.stringify(course), before, "preview does not change course/progress");
  }
  const malicious = {chuong:[{so:1,bai:[{so:1,tu:[{id:"literal",w:"<img src=x onerror=alert(1)>",m:"a".repeat(120)}],han:[],pp:[],vd:[]}]}]};
  const s = CH.tomTatChang(malicious, CH.chiaChang(malicious)[0]);
  assert.equal(s.items[0].chu, "<img src=x onerror=alert(1)>");
  assert.equal(s.items[0].nghia.length, 72);
  const translations = {}; vm.createContext(translations);
  vm.runInContext(read(root + "/chu-bang.js"), translations);
  for (const lang of ["en", "ja"]) for (const label of ["Nội dung sẽ học","Một số nội dung ôn tập","Xem thêm {n} mục"]) {
    assert.ok(translations.CHU_BANG[lang][label]);
  }
}
console.log("PASS JLPT stage previews: " + stages + " real stages across both platforms; exact items, brief source meanings, chapter scope, deterministic/no writes, translated labels.");
