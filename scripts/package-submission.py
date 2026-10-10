#!/usr/bin/env python3
"""Package source, documentation and public evidence; never package runtime secrets/state."""
from pathlib import Path
import argparse, json, re, zipfile

ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = {
    'README.md', '.gitignore', '.dockerignore', '.env.example', 'Dockerfile',
    'compose.yaml', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
    'tsconfig.json', 'vite.config.ts', 'vitest.config.ts', 'index.html',
    'playwright.config.ts', 'playwright.acceptance.config.ts',
    'SKILL.md', 'api.md', 'guide.md',
}
ROOT_DIRS = ('src', 'deploy', 'tests', 'scripts', 'docs', 'reports')
DENY_PARTS = {'private', 'node_modules', '.git', '.gstack', '.playwright-cli',
              '__pycache__', 'artifacts', 'browser-reports', 'browser-report',
              'acceptance-browser-report', 'source-before', 'source-after'}
DENY_NAMES = {'admin-bootstrap.txt', 'desktop-token', 'vnc-password', 'vnc.pass'}


def allowed(path):
    try:
        rel = path.resolve().relative_to(ROOT)
    except ValueError:
        return False
    return (not any(part in DENY_PARTS for part in rel.parts)
            and not any(part.startswith('test-results') for part in rel.parts)
            and path.name not in DENY_NAMES
            and (not path.name.startswith('.env') or path.name == '.env.example')
            and path.suffix not in {'.sqlite', '.db', '.pem', '.key', '.pyc', '.zip'}
            and not re.search(r'\.(?:sqlite|db)-(?:wal|shm)$', path.name)
            and path.name not in {'.DS_Store', 'Thumbs.db'})


def links(path):
    if path.suffix not in {'.md', '.html'}:
        return []
    text = path.read_text(encoding='utf8')
    urls = re.findall(r'!?\[[^\]\n]*\]\(([^)\n]+)\)', text)
    urls += re.findall(r'(?:href|src)=[\"\x27]([^\"\x27]+)', text)
    found = []
    for raw in urls:
        target = raw.strip().strip('<>')
        if target.startswith(('/', '#')) or re.match(r'^[a-zA-Z][\w+.-]*:', target):
            continue
        target = target.split('#', 1)[0].split('?', 1)[0]
        if target:
            found.append((path.parent / target).resolve())
    return found


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='output/submission/creator-studio-2026-10-11.zip')
    args = parser.parse_args()
    files = {(ROOT / name).resolve() for name in ROOT_FILES if (ROOT / name).is_file()}
    for directory in ROOT_DIRS:
        files.update(p.resolve() for p in (ROOT / directory).rglob('*') if p.is_file() and allowed(p))
    queue, inspected, omitted = list(files), set(), set()
    # Preserve directly linked public historical attachments without copying entire run directories.
    while queue:
        path = queue.pop()
        if path in inspected:
            continue
        inspected.add(path)
        for target in links(path):
            if target.is_file() and allowed(target) and target not in files:
                files.add(target)
                queue.append(target)
            elif not allowed(target):
                omitted.add(str(target.relative_to(ROOT)) if target.is_relative_to(ROOT) else 'outside-project')
    output = (ROOT / args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(files):
            archive.write(path, 'creator-studio/' + path.relative_to(ROOT).as_posix())
    manifest = {'archive':str(output.relative_to(ROOT)), 'files':len(files),
                'bytes':output.stat().st_size, 'omittedPrivateOrTraceReferences':sorted(omitted),
                'runtimeConfiguration':'Copy .env.example to .env and provide your own credentials.'}
    output.with_suffix('.manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == '__main__':
    main()
