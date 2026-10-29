import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL("../extension/pos-core.js",import.meta.url),"utf8"),ctx);
for(const [pos,detail,want] of [["名詞","一般","noun"],["名詞","代名詞","pronoun"],["名詞","形容動詞語幹","adjective"],["動詞","","verb"],["形容詞","","adjective"],["接続詞","","conjunction"],["助詞","","particle"],["助動詞","","particle"],["副詞","","adverb"]])
  assert.equal(ctx.NeutronPos.kind({pos,pos_detail_1:detail}),want);
const text="😀 猫は猫です。",tokens=[{surface_form:"😀",pos:"記号"},{surface_form:"猫",pos:"名詞"},{surface_form:"は",pos:"助詞"},{surface_form:"猫",pos:"名詞"},{surface_form:"です",pos:"助動詞"}];
const ranges=ctx.NeutronPos.ranges(text,tokens);
assert.equal(text.slice(ranges[1].start,ranges[1].end),"猫");
assert.equal(ranges[1].start,3);assert.equal(ranges[3].start,5);
const dir=new URL("../extension/vendor/kuromoji/",import.meta.url);
const metadata=JSON.parse(fs.readFileSync(new URL("INTEGRITY.json",dir)));
for(const [name,hash] of Object.entries(metadata.sha256))
 assert.equal(crypto.createHash("sha256").update(fs.readFileSync(new URL(name,dir))).digest("hex"),hash,name);
console.log("POS labels, repeated words and emoji UTF-16 offsets; all bundled analyzer/dictionary hashes verified");
