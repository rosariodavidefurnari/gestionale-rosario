#!/usr/bin/env python3
"""
drift_test.py — L3 deterministic doc↔code drift check (generic, no deps).

Parses a Markdown/ADR knowledge base for the CONCRETE things it cites and asserts
each still holds in the codebase. The deterministic workhorse of the
doc-code-validation gate: structural facts (paths, symbols, counts) belong here,
NOT in the fuzzy LLM/RAG tier.

Checks:
  1. markdown-link paths  [text](relative/path)   -> must exist (resolved vs the doc's dir, then repo root).
                                                      ON by default; low false-positive.
  2. backtick path-likes  `scripts/foo.py`        -> must exist OR be a suffix of a tracked file
                                                      (handles `photofilm/x.py` shorthand for scripts/photofilm/x.py).
                                                      OPT-IN via --code-paths (heuristic; can flag generated-output paths).
  3. manifest assertions  --manifest .drift.json  -> explicit file/symbol/count/absent claims. PRECISE, no heuristics.
                                                      USE THIS for exact structural facts (e.g. "77 tests", a symbol).

Exit 0 = all hold; 1 = drift (and which); 2 = nothing to check. Headless / CI / pre-commit drivable.

Examples:
  drift_test.py --repo . --docs 'docs/**/*.md' --docs 'CLAUDE.md'         # links only (safe default)
  drift_test.py --repo . --docs 'CLAUDE.md' --code-paths                  # + backtick path sweep
  drift_test.py --repo . --manifest .drift.json                          # precise claims
Manifest (JSON list), each item one assertion:
  [{"type":"file","path":"scripts/pipeline/build.py"},
   {"type":"symbol","path":"scripts/pipeline/build.py","pattern":"def main"},
   {"type":"grep_count","glob":"scripts/photofilm/tests/**/*.py","pattern":"def test_","equals":111},
   {"type":"absent","path":"scripts/old_dead.py"}]
"""
import argparse, glob, json, os, re, subprocess, sys

LINK = re.compile(r'\[[^\]]*\]\(([^)\s]+)\)')
BACKTICK = re.compile(r'`([^`\n]+)`')
PATHLIKE = re.compile(r'^[\w.@-]+(?:/[\w.@-]+)+\.[A-Za-z0-9]+$')   # a/b.ext (slash + extension)
SKIP = ('http://', 'https://', 'mailto:', '#', 'tel:', '/workspace/', '~')

def _clean(t): return t.split('#', 1)[0].split('?', 1)[0].strip()

def _exists(repo, base, target):
    for root in (base, repo):
        if os.path.exists(os.path.normpath(os.path.join(root, target))):
            return True
    return False

def _tracked(repo):
    try:
        out = subprocess.run(['git', '-C', repo, 'ls-files'], capture_output=True, text=True, timeout=30)
        return set(out.stdout.splitlines()) if out.returncode == 0 else None
    except Exception:
        return None

def check_links(repo, doc_files):
    fails = []
    for doc in doc_files:
        base, text = os.path.dirname(doc), open(doc, encoding='utf-8', errors='replace').read()
        for m in LINK.finditer(text):
            t = m.group(1)
            if t.startswith(SKIP):
                continue
            t = _clean(t)
            if t and not _exists(repo, base, t):
                fails.append((doc, f'broken link path: {m.group(1)}'))
    return fails

def check_code_paths(repo, doc_files, tracked):
    fails = []
    for doc in doc_files:
        base, text = os.path.dirname(doc), open(doc, encoding='utf-8', errors='replace').read()
        for m in BACKTICK.finditer(text):
            tok = m.group(1)
            if tok.startswith(SKIP) or not PATHLIKE.match(tok):
                continue
            if _exists(repo, base, tok):
                continue
            # suffix-match a tracked file (handles shorthand citations missing a dir prefix)
            if tracked is not None and any(f == tok or f.endswith('/' + tok) for f in tracked):
                continue
            fails.append((doc, f'cited path missing: {tok}'))
    return fails

def check_manifest(repo, manifest):
    fails = []
    for a in json.load(open(manifest, encoding='utf-8')):
        t = a.get('type')
        if t == 'file':
            if not os.path.exists(os.path.join(repo, a['path'])):
                fails.append((manifest, f'file missing: {a["path"]}'))
        elif t == 'absent':
            if os.path.exists(os.path.join(repo, a['path'])):
                fails.append((manifest, f'should be absent but exists: {a["path"]}'))
        elif t == 'symbol':
            p = os.path.join(repo, a['path'])
            ok = os.path.exists(p) and re.search(a['pattern'], open(p, encoding='utf-8', errors='replace').read())
            if not ok:
                fails.append((manifest, f'symbol /{a["pattern"]}/ not found in {a["path"]}'))
        elif t == 'grep_count':
            n = 0
            for f in glob.glob(os.path.join(repo, a['glob']), recursive=True):
                if os.path.isfile(f):
                    n += len(re.findall(a['pattern'], open(f, encoding='utf-8', errors='replace').read()))
            if n != a['equals']:
                fails.append((manifest, f'count /{a["pattern"]}/ in {a["glob"]} = {n}, expected {a["equals"]}'))
        else:
            fails.append((manifest, f'unknown assertion type: {t}'))
    return fails

def main(argv=None):
    ap = argparse.ArgumentParser(description='Deterministic doc↔code drift check (L3).')
    ap.add_argument('--repo', default='.', help='repo root (default: cwd)')
    ap.add_argument('--docs', action='append', default=[], help='doc glob (repeatable), e.g. "docs/**/*.md"')
    ap.add_argument('--manifest', help='JSON file of explicit assertions (precise)')
    ap.add_argument('--code-paths', action='store_true', help='also sweep backtick `a/b.ext` path-likes (heuristic; suffix-matches tracked files)')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args(argv)
    repo = os.path.abspath(a.repo)

    doc_files = sorted({f for g in a.docs for f in glob.glob(os.path.join(repo, g), recursive=True) if os.path.isfile(f)})
    fails = []
    if doc_files:
        fails += check_links(repo, doc_files)
        if a.code_paths:
            fails += check_code_paths(repo, doc_files, _tracked(repo))
    if a.manifest:
        fails += check_manifest(repo, a.manifest if os.path.isabs(a.manifest) else os.path.join(repo, a.manifest))
    if not doc_files and not a.manifest:
        print('nothing to check: pass --docs and/or --manifest', file=sys.stderr); return 2

    if fails:
        print(f'DRIFT: {len(fails)} issue(s)')
        for where, msg in fails:
            print(f'  {os.path.relpath(where, repo)}: {msg}')
        return 1
    if not a.quiet:
        print(f'OK: {len(doc_files)} doc(s) + manifest citations all hold')
    return 0

if __name__ == '__main__':
    sys.exit(main())
