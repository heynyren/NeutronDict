import assert from "node:assert/strict";
import fs from "node:fs";
import zlib from "node:zlib";
function png(path) {
 const b=fs.readFileSync(path);assert.equal(b.subarray(1,4).toString(),"PNG");
 const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert.equal(b[24],8);assert.equal(b[25],6);
 let pos=8;const pieces=[];
 while(pos<b.length){const n=b.readUInt32BE(pos),type=b.subarray(pos+4,pos+8).toString();if(type==="IDAT")pieces.push(b.subarray(pos+8,pos+8+n));pos+=n+12;}
 const raw=zlib.inflateSync(Buffer.concat(pieces)),stride=w*4;let off=0,previous=Buffer.alloc(stride);const alpha=[];
 for(let y=0;y<h;y++){const f=raw[off++],row=Buffer.from(raw.subarray(off,off+stride));off+=stride;
  for(let i=0;i<stride;i++){const a=i>=4?row[i-4]:0,c=i>=4?previous[i-4]:0,u=previous[i];let d=0;if(f===1)d=a;else if(f===2)d=u;else if(f===3)d=(a+u)>>1;else if(f===4){const p=a+u-c,pa=Math.abs(p-a),pb=Math.abs(p-u),pc=Math.abs(p-c);d=pa<=pb&&pa<=pc?a:pb<=pc?u:c;}row[i]=(row[i]+d)&255;}
  for(let x=0;x<w;x++)if(row[x*4+3])alpha.push([x,y,row[x*4+3]]);
  previous=row;
 }
 return {w,h,alpha};
}
for(const n of [16,48,128]){const p=png("extension/icons/icon"+n+".png");assert.equal(p.w,n);assert.equal(p.h,n);assert.ok(p.alpha.length>n*n/4);assert.ok(p.alpha.length<n*n);}
assert.deepEqual(fs.readFileSync("extension/icons/icon128.png"),fs.readFileSync("android/www/brand-mark.png"));
const foreground=png("android/assets/icon-foreground.png");
assert.equal(foreground.w,512);
assert.ok(foreground.alpha.every(([x,y])=>x>=90&&x<=422&&y>=90&&y<=422),"bear must fit adaptive mask safe zone");
assert.ok(foreground.alpha.length>10000);
const source=png("brand/polar-bear-source.png");assert.ok(source.alpha.length<source.w*source.h*.85);
assert.ok(source.alpha.every(([x,y])=>x>0&&y>0&&x<source.w-1&&y<source.h-1));
assert.ok(fs.readFileSync("android/integration/prepare.py","utf8").includes('branded_app.set(A+"icon", "@mipmap/neutron_launcher")'));
console.log("Polar bear: icon dimensions, alpha, shared mark and adaptive safe area verified.");
