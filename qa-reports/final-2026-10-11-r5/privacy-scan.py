from pathlib import Path
import base64,io,json,re,subprocess,zipfile,sys
ROOT=Path.cwd();raw=ROOT/'.gstack/qa-reports/final-2026-10-11-r5';secrets=[]
for name,comp in [('main',['compose']),('live',['compose','-p','creator-studio-final-r5-live','-f','compose.yaml','-f',str(raw/'live-compose.yaml')]),('edge',['compose','-p','creator-studio-final-r5-edge','-f','compose.yaml','-f',str(raw/'edge-compose.yaml')])]:
 code="import{Store}from'./src/server/store.ts';import{readFileSync}from'node:fs';const s=new Store('/app/data/studio.sqlite');process.stdout.write(JSON.stringify({admin:readFileSync('/app/data/admin-bootstrap.txt','utf8').trim(),model:s.get('settings','model')?.apiKey,wave:process.env.WAVESURGE_TOKEN}));s.close();"
 values=json.loads(subprocess.check_output(['docker',*comp,'exec','-T','app','node','--input-type=module','-e',code],text=True))
 secrets.extend((name,k,v.encode())for k,v in values.items()if isinstance(v,str)and len(v)>=8 and v!='fixture-token')
secrets.append(('historical-r4','admin',(raw/'private/admin-bootstrap.txt').read_bytes().strip()))
# Historical public attachments may belong to previous project deployments.
code="import{Store}from'./src/server/store.ts';import{readFileSync}from'node:fs';const s=new Store('/app/data/studio.sqlite');process.stdout.write(JSON.stringify({admin:readFileSync('/app/data/admin-bootstrap.txt','utf8').trim(),model:s.get('settings','model')?.apiKey,wave:process.env.WAVESURGE_TOKEN}));s.close();"
names=subprocess.check_output(['docker','ps','--filter','label=com.docker.compose.project.working_dir='+str(ROOT),'--format','{{.Names}}'],text=True).splitlines()
for name in names:
 if not name.endswith('-app-1')or name in ['creator-studio-final-r5-live-app-1','creator-studio-final-r5-edge-app-1','wavesurge_testing-app-1']:continue
 values=json.loads(subprocess.check_output(['docker','exec',name,'node','--input-type=module','-e',code],text=True))
 secrets.extend((name,k,v.encode())for k,v in values.items()if isinstance(v,str)and len(v)>=8 and v!='fixture-token')
exposures=[];redactions=[];members=0;files=0
TEXT={'.md','.json','.jsonl','.html','.mjs','.ts','.tsx','.py','.txt','.csv','.yaml','.yml','.log','.cjs','.svg','.mmd'}
def inspect(data,label):
 for scope,kind,value in secrets:
  if value in data:exposures.append({'file':label,'scope':scope,'kind':kind})
def clean_archive(payload,label):
 global members
 target=io.BytesIO()
 with zipfile.ZipFile(io.BytesIO(payload))as archive,zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED)as clean:
  for item in archive.infolist():
   data=archive.read(item.filename);members+=1
   for scope,kind,value in secrets:
    count=data.count(value)
    if count:redactions.append({'file':label,'member':item.filename,'kind':kind,'occurrences':count});data=data.replace(value,b'[REDACTED_CREDENTIAL]')
   if item.filename.endswith('.json'):json.loads(data)
   inspect(data,label+'::'+item.filename);clean.writestr(item,data)
 return target.getvalue()
# Sanitize embedded trace JSON in this round's report, retaining all test steps/results.
for p in raw.rglob('*'):
 if not p.is_file()or 'private' in p.parts or p.suffix not in TEXT:continue
 data=p.read_bytes();files+=1
 if p.suffix=='.html':
  for encoded in re.findall(rb'data:application/zip;base64,([A-Za-z0-9+/=]+)',data):
   sanitized=clean_archive(base64.b64decode(encoded),str(p.relative_to(ROOT))+'::embedded')
   data=data.replace(encoded,base64.b64encode(sanitized))
  p.write_bytes(data)
 inspect(data,str(p.relative_to(ROOT)))
for directory in ['docs','reports','src','tests','scripts','deploy']:
 for p in (ROOT/directory).rglob('*'):
  if p.is_file()and p.suffix in TEXT and not any(s in p.parts for s in ['private','node_modules','__pycache__']):files+=1;inspect(p.read_bytes(),str(p.relative_to(ROOT)))
for p in [ROOT/'README.md',ROOT/'.env.example',ROOT/'.gitignore']:inspect(p.read_bytes(),p.name)
if len(sys.argv)>1:
 p=Path(sys.argv[1]);payload=p.read_bytes()
 with zipfile.ZipFile(io.BytesIO(payload))as archive:
  for item in archive.infolist():
   members+=1;inspect(archive.read(item.filename),p.name+'::'+item.filename)
result={'passed':not exposures,'plaintextFilesChecked':files,'archiveMembersChecked':members,'credentialExposures':exposures,'embeddedReportRedactions':redactions,'credentialSources':'project deployments only; actual values never printed or saved'}
(raw/'privacy-scan.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
if exposures:raise SystemExit(1)
