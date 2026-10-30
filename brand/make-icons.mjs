// Package the AI-authored bitmap without redesigning the mascot.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url);
const entry=process.env.PW_PKG||require.resolve("playwright",{paths:(process.env.NODE_PATH||"").split(":").filter(Boolean)});
const pw=await import(entry);
const browser=await pw.chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{channel:"chromium"});
const targets=[
 ["extension/icons/icon16.png",16,.94,false],["extension/icons/icon48.png",48,.94,false],
 ["extension/icons/icon128.png",128,.94,false],["brand/logo-512.png",512,.9,false],
 ["android/www/brand-mark.png",128,.94,false],["android/assets/icon.png",512,.9,true],
 ["android/assets/icon-foreground.png",512,.62,false],["android/assets/icon-background.png",512,0,true]
];
try{
 const page=await browser.newPage();
 const source=readFileSync(resolve(root,"brand/polar-bear-source.png")).toString("base64");
 await page.setContent("<canvas id='c'></canvas>");
 await page.evaluate(async s=>{const im=new Image();im.src="data:image/png;base64,"+s;await im.decode();window.source=im;const c=document.getElementById("c");c.width=im.width;c.height=im.height;const x=c.getContext("2d");x.drawImage(im,0,0);const data=x.getImageData(0,0,im.width,im.height).data;let x0=im.width,y0=im.height,x1=0,y1=0;for(let y=0;y<im.height;y++)for(let x0i=0;x0i<im.width;x0i++)if(data[(y*im.width+x0i)*4+3]){x0=Math.min(x0,x0i);y0=Math.min(y0,y);x1=Math.max(x1,x0i);y1=Math.max(y1,y);}window.bounds=[x0,y0,x1-x0+1,y1-y0+1];},source);
 for(const [file,size,ratio,white] of targets){
   const b64=await page.evaluate(({size,ratio,white})=>{const c=document.getElementById("c");c.width=size;c.height=size;const x=c.getContext("2d");if(white){x.fillStyle="#ffffff";x.fillRect(0,0,size,size);}if(ratio){const [sx,sy,sw,sh]=window.bounds;const scale=Math.min(size*ratio/sw,size*ratio/sh);const w=Math.round(sw*scale),h=Math.round(sh*scale);x.imageSmoothingQuality="high";x.drawImage(window.source,sx,sy,sw,sh,Math.floor((size-w)/2),Math.floor((size-h)/2),w,h);}return c.toDataURL("image/png").split(",")[1];},{size,ratio,white});
   const out=resolve(root,file);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,Buffer.from(b64,"base64"));console.log(file);
 }
}finally{await browser.close();}
