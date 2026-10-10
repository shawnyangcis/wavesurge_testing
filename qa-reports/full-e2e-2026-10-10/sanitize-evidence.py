from pathlib import Path
from io import BytesIO
import json,re,subprocess,zipfile

workspace=Path('/Users/shawn/coding/projects/wavesurge/wavesurge_testing')
root=workspace/'.gstack/qa-reports'
secrets=[]
for prefix in [[],['-p','creator-studio-review-e2e','-f','compose.yaml','-f','.gstack/qa-reports/full-e2e-2026-10-10/compose.override.yaml'],['-p','creator-studio-review-clean-2','-f','compose.yaml','-f','.gstack/qa-reports/full-e2e-2026-10-10/compose-clean.override.yaml']]:
    password=subprocess.check_output(['docker','compose',*prefix,'exec','-T','app','cat','/app/data/admin-bootstrap.txt'],cwd=workspace,text=True).strip()
    secrets.append(password)

def clean_tree(value):
    if isinstance(value,dict):
        result={k:clean_tree(v) for k,v in value.items()}
        name=str(result.get('name','')).lower()
        if name in {'cookie','set-cookie','authorization','studio','desktop_view','desktop_control'} and 'value' in result:
            result['value']='[REDACTED]'
        if 'password' in result and isinstance(result['password'],str): result['password']='[REDACTED]'
        return result
    if isinstance(value,list): return [clean_tree(v) for v in value]
    if isinstance(value,str):
        for secret in secrets: value=value.replace(secret,'[REDACTED]')
        return re.sub(r'\b(studio|desktop_view|desktop_control)=([^;\s"\\]+)',r'\1=[REDACTED]',value)
    return value

def clean_bytes(data):
    try: text=data.decode('utf-8')
    except UnicodeDecodeError: return data
    original=text
    for secret in secrets: text=text.replace(secret,'[REDACTED]')
    try:
        parsed=json.loads(text)
        cleaned=clean_tree(parsed)
        if cleaned!=parsed: text=json.dumps(cleaned,ensure_ascii=False,indent=2)+'\n'
    except (ValueError,TypeError): pass
    lines=[]
    for line in text.splitlines(keepends=True):
        try:
            parsed=json.loads(line)
            cleaned=clean_tree(parsed)
            lines.append((json.dumps(cleaned,ensure_ascii=False,separators=(',',':'))+'\n') if cleaned!=parsed else line)
        except (ValueError,TypeError): lines.append(line)
    text=''.join(lines)
    return text.encode('utf-8') if text!=original else data

changed=[]
for path in root.rglob('*'):
    if not path.is_file() or path.name=='sanitize-evidence.py': continue
    if path.suffix=='.zip':
        data=path.read_bytes()
        try:
            buffer=BytesIO(); any_changed=False
            with zipfile.ZipFile(BytesIO(data)) as archive,zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as output:
                for entry in archive.infolist():
                    raw=archive.read(entry.filename); cleaned=clean_bytes(raw);any_changed|=cleaned!=raw;output.writestr(entry,cleaned)
            if any_changed: path.write_bytes(buffer.getvalue());changed.append(str(path.relative_to(root)))
        except zipfile.BadZipFile: pass
    elif path.suffix in {'.json','.log','.md','.html','.txt','.trace','.network'}:
        raw=path.read_bytes();cleaned=clean_bytes(raw)
        if cleaned!=raw: path.write_bytes(cleaned);changed.append(str(path.relative_to(root)))

checks=[]
for path in root.rglob('*.zip'):
    with zipfile.ZipFile(path) as archive:
        for entry in archive.infolist():
            data=archive.read(entry.filename)
            if any(secret.encode() in data for secret in secrets): checks.append(str(path.relative_to(root)))
manifest={'passwordsAndAuthCookiesRedacted':True,'changedFiles':changed,'remainingKnownPasswordMatches':checks}
(root/'full-e2e-2026-10-10/evidence-redaction.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'changedFiles':len(changed),'remainingKnownPasswordMatches':len(checks)}))
