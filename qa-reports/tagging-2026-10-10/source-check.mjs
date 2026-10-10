import{readFileSync,writeFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';
const source=JSON.parse(readFileSync('.gstack/qa-reports/full-e2e-2026-10-10/source-match.json','utf8'));
const files=source.files.map(f=>({...f,containerPath:f.path==='deploy/desktop-entrypoint.sh'?'/app/desktop-entrypoint.sh':'/app/'+f.path,previous:f.local,local:createHash('sha256').update(readFileSync(f.path)).digest('hex')}));
for(const service of new Set(files.map(f=>f.service))){
 const group=files.filter(f=>f.service===service);
 const output=execFileSync('docker',['compose','exec','-T',service,'sha256sum',...group.map(f=>f.containerPath)],{encoding:'utf8'});
 const hashes=new Map(output.trim().split('\n').map(line=>{const [hash,...path]=line.trim().split(/\s+/);return[path.join(' '),hash];}));
 for(const f of group){f.container=hashes.get(f.containerPath);f.same=f.local===f.container;f.sameAsEarlier=f.local===f.previous;}
}
const output={observedAt:new Date().toISOString(),files,different:files.filter(f=>!f.same||!f.sameAsEarlier)};
writeFileSync('.gstack/qa-reports/tagging-2026-10-10/source-check.json',JSON.stringify(output,null,2));console.log(JSON.stringify({files:files.length,different:output.different}));
