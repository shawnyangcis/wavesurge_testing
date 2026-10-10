from pathlib import Path
import base64, io, json, re, subprocess, zipfile

root = Path('.gstack/qa-reports/retest-2026-10-10-r4')
secrets = []
for scope, compose in [('main', ['compose']), ('live', ['compose', '-p', 'creator-studio-retest-r4-live', '-f', 'compose.yaml', '-f', str(root/'live-compose.yaml')]), ('edge', ['compose', '-p', 'creator-studio-retest-r4-edge', '-f', 'compose.yaml', '-f', 'tests/fixtures/qa-compose.yaml'])]:
    code = "import{Store}from'./src/server/store.ts';import{readFileSync}from'node:fs';const s=new Store('/app/data/studio.sqlite');process.stdout.write(JSON.stringify({admin:readFileSync('/app/data/admin-bootstrap.txt','utf8').trim(),model:s.get('settings','model')?.apiKey,wave:process.env.WAVESURGE_TOKEN}));s.close();"
    values = json.loads(subprocess.check_output(['docker', *compose, 'exec', '-T', 'app', 'node', '--input-type=module', '-e', code], text=True))
    secrets.extend((scope, k, v.encode()) for k, v in values.items() if isinstance(v,str) and len(v)>=8 and v!='fixture-token')
image = subprocess.check_output(['docker','inspect','creator-studio-retest-r4-live-app-1','--format','{{.Image}}'],text=True).strip()
for project in ['creator-studio-retest-r4-20261010-second', 'creator-studio-retest-r4-20261010-second-persistence']:
    names = subprocess.check_output(['docker','volume','ls','--filter',f'label=com.docker.compose.project={project}','--format','{{.Name}}'],text=True).splitlines()
    volume = next(n for n in names if n.endswith('_studio-data'))
    value = subprocess.check_output(['docker','run','--rm','--network','none','--read-only','--entrypoint','node','-v',volume+':/qa:ro',image,'-e',"process.stdout.write(require('fs').readFileSync('/qa/admin-bootstrap.txt','utf8').trim())"])
    secrets.append((project, 'admin', value))
exposures, members, archives = [], 0, 0
def check(data, source):
    for scope, kind, value in secrets:
        if value in data: exposures.append({'file':source,'scope':scope,'kind':kind})
for path in root.rglob('*'):
    if not path.is_file(): continue
    data = path.read_bytes()
    if path.suffix in ['.json','.jsonl','.md','.mjs','.py','.txt','.log','.html','.csv','.yaml']: check(data,str(path.relative_to(root)))
    payloads = [(str(path.relative_to(root)), data)] if path.suffix=='.zip' else []
    if path.suffix=='.html':
        payloads += [(str(path.relative_to(root))+'::embedded-zip',base64.b64decode(m)) for m in re.findall(rb'data:application/zip;base64,([A-Za-z0-9+/=]+)',data)]
    for source, payload in payloads:
        archives += 1
        with zipfile.ZipFile(io.BytesIO(payload)) as z:
            for name in z.namelist(): members += 1; check(z.read(name),source+'::'+name)
output={'archiveFilesOrEmbeddedArchives':archives,'archiveMembersChecked':members,'credentialExposures':exposures,'scopeCount':5,'includesRetainedAcceptanceVolumeBootstrapSecrets':True}
(root/'artifact-archive-scan.json').write_text(json.dumps(output,ensure_ascii=False,indent=2));print(json.dumps(output,ensure_ascii=False))
if exposures: raise SystemExit(1)
