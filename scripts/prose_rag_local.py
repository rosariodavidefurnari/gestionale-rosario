#!/usr/bin/env python3
"""CLI wrapper for the local prose RAG package.

The prose_rag package is shared infrastructure that physically lives in the
SACRO GRAAL repo's scripts/ dir. We reuse it via sys.path instead of vendoring a
second copy, so both repos run one indexer implementation (no drift). All other
local RAG paths on this machine are hardcoded absolute paths too (rag-stack on
the external SSD), so this is consistent with the existing wiring.
"""

import sys

sys.path.insert(
    0, "/Users/rosariofurnari/Documents/SACRO GRAAL MONTAGGIO VIDEO/scripts"
)

from prose_rag.cli import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())
