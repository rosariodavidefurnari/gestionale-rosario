#!/usr/bin/env python3
"""Run governance checks with the extra staging guard required by pre-commit."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


CHECK_COMMANDS = [
    ["npm", "run", "governance:cli:check"],
    ["npm", "run", "governance:variables:check"],
    ["npm", "run", "governance:workflows:check"],
    ["npm", "run", "governance:artifacts:check"],
    ["npm", "run", "governance:test"],
]

GENERATED_OUTPUTS = [
    "docs/cli/COMMAND_REGISTRY.json",
    "docs/cli/COMMAND_MAP.md",
    "docs/variables/VARIABLE_REGISTRY.json",
    "docs/variables/VARIABLE_MAP.md",
    "docs/workflows/WORKFLOW_REGISTRY.json",
    "docs/workflows/WORKFLOW_MAP.md",
    "docs/artifacts/ARTIFACT_REGISTRY.json",
    "docs/artifacts/ARTIFACT_MAP.md",
]


def run_command(repo: Path, command: list[str]) -> int:
    result = subprocess.run(command, cwd=repo, check=False)
    return result.returncode


def git_output(repo: Path, args: list[str]) -> list[str]:
    result = subprocess.run(
        ["git", *args],
        cwd=repo,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def merge_path_lists(*groups: list[str]) -> list[str]:
    return sorted({path for group in groups for path in group})


def unstaged_generated_outputs(repo: Path) -> list[str]:
    modified = git_output(repo, ["diff", "--name-only", "--", *GENERATED_OUTPUTS])
    untracked = git_output(repo, ["ls-files", "--others", "--exclude-standard", "--", *GENERATED_OUTPUTS])
    return merge_path_lists(modified, untracked)


def check_staged_generated_outputs(repo: Path) -> int:
    unstaged = unstaged_generated_outputs(repo)
    if not unstaged:
        return 0

    print(
        "Governance generated outputs are current but not staged. Stage them before committing:",
        file=sys.stderr,
    )
    for path in unstaged:
        print(f"- {path}", file=sys.stderr)
    return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".", help="repository root")
    parser.add_argument("--check", action="store_true", help="run checks and verify generated outputs are staged")
    args = parser.parse_args(argv)

    if not args.check:
        parser.error("--check is required")

    repo = Path(args.repo).resolve()
    for command in CHECK_COMMANDS:
        code = run_command(repo, command)
        if code != 0:
            return code
    return check_staged_generated_outputs(repo)


if __name__ == "__main__":
    raise SystemExit(main())
