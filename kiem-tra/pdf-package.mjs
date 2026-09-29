// Test the delivered source tree as-is; never install missing libraries before this gate.
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
const root="extension/vendor/pdfjs";
const bundle=JSON.parse(readFileSync(path.join(root,"BUNDLE.json"),"utf8"));
assert.equal(bundle.version,"6.3.289");
for(const required of ["pdf.mjs","pdf.worker.mjs","LICENSE","cmaps/78-H.bcmap","standard_fonts/LiberationSans-Regular.ttf","wasm/openjpeg.wasm"])
  assert.ok(bundle.files[required],"required bundled asset: "+required);
const actual=[];
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,entry.name);
  if(entry.isDirectory())walk(p);else if(entry.name!=="BUNDLE.json")actual.push(path.relative(root,p));
}}
walk(root);
assert.deepEqual(actual.sort(),Object.keys(bundle.files).sort());
for(const [file,expected] of Object.entries(bundle.files)){
  const data=readFileSync(path.join(root,file));
  assert.equal(createHash("sha256").update(data).digest("hex"),expected,file+" intact");
}
for(const file of ["pdf.mjs","pdf.worker.mjs"])
  assert.ok(readFileSync(path.join(root,file),"utf8").includes(bundle.version),file+" pinned version");
console.log("Source package: "+actual.length+" PDF.js assets present and SHA256 verified; no build required");
