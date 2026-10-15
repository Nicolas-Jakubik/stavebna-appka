const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const parts=['payload.00.br','payload.01.br','payload.02.br','payload.03.br'];
const payload=Buffer.concat(parts.map(name=>fs.readFileSync(path.join(__dirname,name))));
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
