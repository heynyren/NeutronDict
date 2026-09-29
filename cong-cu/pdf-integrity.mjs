import {readFileSync,writeFileSync,readdirSync} from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
const root="extension/vendor/pdfjs",files={};
function walk(dir){
  for(const e of readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory())walk(p);
    else if(e.name!=="BUNDLE.json")files[path.relative(root,p)]=createHash("sha256").update(readFileSync(p)).digest("hex");
  }
}
walk(root);
const lock=JSON.parse(readFileSync(process.argv[2],"utf8"));
const dep=lock.packages["node_modules/pdfjs-dist"];
if(dep.version!=="6.3.289")throw Error("Unexpected PDF.js version");
writeFileSync(path.join(root,"BUNDLE.json"),JSON.stringify({version:dep.version,source:dep.resolved,integrity:dep.integrity,files},null,2)+"\n");
