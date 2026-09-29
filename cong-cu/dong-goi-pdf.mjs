import { cpSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
const root=process.argv[2];
if(!root)throw Error("Pass the installed pdfjs-dist directory");
const dest="extension/vendor/pdfjs";mkdirSync(dest,{recursive:true});
for(const f of ["pdf.mjs","pdf.worker.mjs"])cpSync(path.join(root,"build",f),path.join(dest,f));
for(const f of ["cmaps","standard_fonts","wasm","LICENSE"]){
  const source=path.join(root,f);if(existsSync(source))cpSync(source,path.join(dest,f),{recursive:true});
}
