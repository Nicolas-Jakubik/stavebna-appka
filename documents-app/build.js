const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const payload=fs.readFileSync(path.join(__dirname,'payload.br'));
const files=JSON.parse(zlib.brotliDecompressSync(payload).toString('utf8'));
const out=path.join(__dirname,'dist');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const [name,content] of Object.entries(files)){
  if(name.startsWith('api/')) continue;
  const target=path.join(out,name);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,content,'utf8');
}
console.log('Built STAVBY-DOMY documents app:',Object.keys(files).filter(x=>!x.startsWith('api/')).join(', '));
