#!/bin/bash
# Refresh the local Qdrant prose-RAG index for gestionale-rosario.
# Corpus scope: live project docs + governance prose (NO code, NO historical
# superpowers specs/plans). Fully local: Qdrant :6333 + Ollama bge-m3, zero API.
# Picked up automatically by the rag-stack git hook (prose refresh on doc commits).
set -euo pipefail

REPO="/Users/rosariofurnari/Documents/gestionale-rosario"
PCORP="$HOME/prose-rag-corpus"
DOCS="$PCORP/gestionale-docs"

validate_corpus() {
  local dir="$1"
  [ -d "$dir" ] || return 0
  if find "$dir" -type f \( -name '*.py' -o -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' -o -name '*.swift' -o -name '*.sh' -o -name '*.mjs' -o -name '*.json' -o -name '*.toml' -o -name '*.yaml' -o -name '*.yml' -o -name '*.lock' -o -name '*.sqlite' -o -name '*.db' -o -name '*.pkl' \) | grep -q .; then
    echo "ERROR: non-prose file found in $dir" >&2
    find "$dir" -type f \( -name '*.py' -o -name '*.js' -o -name '*.ts' -o -name '*.sh' -o -name '*.json' -o -name '*.yaml' \) >&2
    exit 1
  fi
}

# Build a flat, prose-only corpus dir by copying the selected markdown.
python3 - "$REPO" "$DOCS" <<'PY'
import glob
import os
import shutil
import sys

repo, out = sys.argv[1], sys.argv[2]
shutil.rmtree(out, ignore_errors=True)
os.makedirs(out)

def put(src, name):
    if os.path.exists(src):
        shutil.copy(src, os.path.join(out, name))

# Governance root prose
for file_name in ["AGENTS.md", "CLAUDE.md"]:
    put(os.path.join(repo, file_name), file_name)

# Live docs (top-level only — exclude docs/superpowers/ historical archives)
for path in sorted(glob.glob(os.path.join(repo, "docs", "*.md"))):
    shutil.copy(path, os.path.join(out, "docs__" + os.path.basename(path)))

# Auto-loaded operating rules
for path in sorted(glob.glob(os.path.join(repo, ".claude", "rules", "*.md"))):
    shutil.copy(path, os.path.join(out, "rules__" + os.path.basename(path)))

print("gestionale-docs corpus:",
      sum(1 for n in os.listdir(out) if n.endswith(".md")), "file .md")
PY

validate_corpus "$DOCS"

python3 "$REPO/scripts/prose_rag_local.py" index \
  --index gestionale-docs \
  --corpus-dir "$DOCS" \
  --rebuild

echo "VALIDATE:"
python3 "$REPO/scripts/prose_rag_local.py" status --index gestionale-docs
echo "qdrant 400s:"
docker logs qdrant --since 10m 2>&1 | grep -c ' 400 ' || true
