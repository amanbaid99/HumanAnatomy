// Use a real HTTP server: intercepted browser responses can skip HTTP decoding.
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,sep,extname} from 'node:path';
import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const packed=readFileSync(new URL('../assets/anatomy/atlas.bin.gz',import.meta.url));
const wrapped=gzipSync(packed);
let mode='http';
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/transport-check.html'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Loader transport check</title>');return;}
 if(path==='/assets/anatomy/atlas.bin.gz'){
  const body=mode==='http'?packed:wrapped;
  res.writeHead(200,{'content-type':'application/octet-stream','content-encoding':'gzip','content-length':body.length,'cache-control':'no-store'});res.end(body);return;
 }
 const file=join(root,path.slice(1));
 if(!file.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return;}
 try{const body=readFileSync(file);res.writeHead(200,{'content-type':extname(file)==='.js'?'text/javascript':'application/json','cache-control':'no-store'});res.end(body);}
 catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch();const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${server.address().port}/transport-check.html`);
 for(const variant of ['http','wrapped']){
  mode=variant;
  const result=await page.evaluate(async()=>{
   const{loadAtlas}=await import('/src/anatomy/atlas.js');const atlas=await loadAtlas();
   return{muscles:atlas.muscles.size,bones:atlas.skeleton.children.length,head:atlas.head.children.length};
  });
  assert.ok(result.muscles>150&&result.bones>100&&result.head>20);
  console.log(`  PASS  ${variant==='http'?'HTTP-decompressed binary':'HTTP-wrapped gzip asset'} loads correctly`);
 }
 console.log('\n2 hosting transport checks passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
