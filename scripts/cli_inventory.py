#!/usr/bin/env python3
"""Generate the repository CLI command registry and readable map."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
LAST_VERIFIED = "2026-06-22"
REGISTRY_PATH = Path("docs/cli/COMMAND_REGISTRY.json")
MAP_PATH = Path("docs/cli/COMMAND_MAP.md")

OFFICIAL_NPM_SCRIPTS = {
    "test",
    "dev",
    "build",
    "typecheck",
    "continuity:check",
    "docs:drift",
    "rag:policy:check",
    "governance:cli:check",
    "governance:cli:write",
    "governance:test",
    "governance:artifacts:check",
    "governance:artifacts:write",
    "governance:precommit",
    "governance:variables:check",
    "governance:variables:write",
    "governance:workflows:check",
    "governance:workflows:write",
    "security:check:fiscal-backups",
    "security:check:fiscal-backups:rest",
    "security:check:cascade-protection",
    "health:financial",
    "smoke:ef-reminder-parity",
    "smoke:cash-vs-competence",
    "local:admin:bootstrap",
    "preview",
    "lint",
    "prettier",
    "test:e2e",
    "test:e2e:headed",
    "registry:build",
    "registry:gen",
}

OFFICIAL_MAKE_TARGETS = {
    "install",
    "start-supabase",
    "start-supabase-functions",
    "supabase-migrate-database",
    "supabase-reset-database",
    "start-app",
    "start",
    "stop-supabase",
    "stop",
    "build",
    "test",
    "test-ci",
    "test-e2e",
    "lint",
    "typecheck",
    "registry-build",
    "registry-gen",
}

DANGEROUS_NAMES = {
    "doc-deploy",
    "prod-deploy",
    "publish",
    "registry-deploy",
    "remote-deploy-supabase",
    "supabase-deploy",
    "supabase-reset-database",
}

LEGACY_NAMES = {
    "supabase-deploy",
}

LIFECYCLE_NPM_SCRIPTS = {
    "postinstall",
    "prepare",
}


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def env_names(command: str) -> list[str]:
    names = sorted(set(re.findall(r"\b[A-Z][A-Z0-9_]{2,}\b", command)))
    return [
        name
        for name in names
        if name
        not in {
            "BEGIN",
            "END",
            "HTTP",
            "JSON",
            "OK",
        }
    ]


def category_for(name: str, command: str) -> str:
    value = f"{name} {command}".lower()
    if "test" in value or "vitest" in value or "playwright" in value:
        return "test"
    if "lint" in value or "prettier" in value or "typecheck" in value:
        return "quality"
    if "build" in value or "vite" in value or "shadcn" in value:
        return "build"
    if "supabase" in value or "fiscal" in value or "financial" in value:
        return "database"
    if "drift" in value or "continuity" in value or "rag" in value or "governance" in value:
        return "governance"
    if "deploy" in value or "publish" in value or "gh-pages" in value:
        return "deploy"
    if "doc" in value:
        return "docs"
    if "start" in value or "dev" in value or "serve" in value or "preview" in value:
        return "runtime"
    return "maintenance"


def destructive_level(name: str, command: str) -> str:
    value = f"{name} {command}".lower()
    if name in DANGEROUS_NAMES:
        return "remote_or_destructive"
    if value.startswith("git add "):
        return "worktree_write"
    if "db reset" in value or "drop " in value or "truncate " in value:
        return "local_destructive"
    if "db push" in value or "functions deploy" in value or "secrets set" in value:
        return "remote_write"
    if "deploy" in value or "publish" in value or "gh-pages" in value:
        return "remote_write"
    if "--write" in value or "--fix" in value or " --write " in value:
        return "worktree_write"
    if "prettier" in value and "--write" in value:
        return "worktree_write"
    return "none"


def status_for(source: str, name: str, command: str) -> str:
    if name in LEGACY_NAMES:
        return "legacy"
    level = destructive_level(name, command)
    if level in {"remote_or_destructive", "remote_write", "local_destructive"}:
        return "dangerous"
    if source == "package.json" and name in LIFECYCLE_NPM_SCRIPTS:
        return "candidate"
    if source == "package.json" and name in OFFICIAL_NPM_SCRIPTS:
        return "official"
    if source == "Makefile" and name in OFFICIAL_MAKE_TARGETS:
        return "official"
    if source.startswith(".github/workflows/"):
        return "candidate"
    if source.startswith(".husky/"):
        return "candidate"
    return "candidate"


def reads_for(command: str) -> list[str]:
    value = command.lower()
    reads: list[str] = []
    if "package" in value or "npm" in value:
        reads.extend(["package.json", "package-lock.json"])
    if "docs" in value or "doc-" in value:
        reads.append("docs/**")
    if "supabase" in value:
        reads.append("supabase/**")
    if "registry" in value:
        reads.append("registry.json")
    if "rag" in value:
        reads.extend([".contextignore", "scripts/check-rag-corpus-policy.mjs"])
    if "lint-staged" in value:
        reads.extend([".lintstagedrc", "package.json"])
    return sorted(set(reads))


def writes_for(command: str, level: str) -> list[str]:
    value = command.lower()
    writes: list[str] = []
    if "vite build" in value or "npm run build" in value:
        writes.append("dist/**")
    if "registry:gen" in value or "generate-registry" in value:
        writes.append("registry.json")
    if "registry:build" in value or "shadcn build" in value:
        writes.append("public/r/**")
    if value.startswith("git add "):
        writes.append("git index")
    if "prettier" in value and "--write" in value:
        writes.append("worktree")
    if "eslint" in value and "--fix" in value:
        writes.append("worktree")
    if "supabase db reset" in value:
        writes.append("local Supabase database")
    if "supabase db push" in value:
        writes.append("remote Supabase database")
    if "functions deploy" in value:
        writes.append("remote Supabase Edge Functions")
    if "gh-pages" in value:
        writes.append("remote gh-pages branch")
    if level == "worktree_write" and not writes:
        writes.append("worktree")
    return sorted(set(writes))


def record(
    *,
    source: str,
    name: str,
    command: str,
    entrypoint: str,
    evidence: str,
) -> dict[str, Any]:
    level = destructive_level(name, command)
    status = status_for(source, name, command)
    safe_to_run = level in {"none", "worktree_write"} and status != "dangerous"
    command_id = f"{entrypoint}:{name}" if entrypoint != "github workflow" else f"{source}:{name}"
    return {
        "id": slug(command_id),
        "command": command,
        "category": category_for(name, command),
        "entrypoint": entrypoint,
        "reads": reads_for(command),
        "writes": writes_for(command, level),
        "env": env_names(command),
        "safe_to_run": safe_to_run,
        "owner": "repo",
        "source": source,
        "status": status,
        "confidence": "high" if source in {"package.json", "Makefile"} else "medium",
        "source_evidence": evidence,
        "last_verified": LAST_VERIFIED,
        "destructive_level": level,
        "replacement": replacement_for(name),
        "avoid_reason": avoid_reason_for(status, level),
    }


def replacement_for(name: str) -> str | None:
    if name == "supabase-deploy":
        return "make remote-deploy-supabase"
    return None


def avoid_reason_for(status: str, level: str) -> str | None:
    if status == "legacy":
        return "Backward-compatible alias; prefer the replacement command."
    if status == "dangerous":
        return "Writes remote systems or resets local state; run only with an explicit operator checkpoint."
    if level == "worktree_write":
        return "Mutates the working tree; inspect the diff before commit."
    return None


def package_records(repo: Path) -> list[dict[str, Any]]:
    package_path = repo / "package.json"
    if not package_path.exists():
        return []
    scripts = read_json(package_path).get("scripts", {})
    return [
        record(
            source="package.json",
            name=name,
            command=f"npm run {name}",
            entrypoint="npm script",
            evidence=f"package.json:scripts.{name} = {script}",
        )
        for name, script in sorted(scripts.items())
    ]


def makefile_records(repo: Path) -> list[dict[str, Any]]:
    makefile = repo / "Makefile"
    if not makefile.exists():
        return []
    records: list[dict[str, Any]] = []
    target_re = re.compile(r"^([A-Za-z0-9_-]+)(?::[^#]*)?(?:##\s*(.*))?$")
    for line_number, line in enumerate(makefile.read_text(encoding="utf-8").splitlines(), 1):
        match = target_re.match(line)
        if not match:
            continue
        name = match.group(1)
        if name == "PHONY" or name.startswith("."):
            continue
        description = match.group(2) or ""
        records.append(
            record(
                source="Makefile",
                name=name,
                command=f"make {name}",
                entrypoint="make target",
                evidence=f"Makefile:{line_number} {description}".strip(),
            ),
        )
    return records


def workflow_run_commands(path: Path) -> list[tuple[int, str]]:
    commands: list[tuple[int, str]] = []
    lines = path.read_text(encoding="utf-8").splitlines()
    index = 0
    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped.startswith("run:"):
            index += 1
            continue
        line_number = index + 1
        value = stripped.removeprefix("run:").strip()
        if value and value not in {"|", ">"}:
            commands.append((line_number, value))
            index += 1
            continue
        base_indent = len(line) - len(line.lstrip())
        index += 1
        while index < len(lines):
            block_line = lines[index]
            block_indent = len(block_line) - len(block_line.lstrip())
            block_value = block_line.strip()
            if block_value and block_indent <= base_indent:
                break
            if block_value and not block_value.startswith("#"):
                commands.append((index + 1, block_value))
            index += 1
    return commands


def workflow_records(repo: Path) -> list[dict[str, Any]]:
    workflow_dir = repo / ".github" / "workflows"
    if not workflow_dir.exists():
        return []
    records: list[dict[str, Any]] = []
    for workflow in sorted(workflow_dir.glob("*.yml")):
        rel = workflow.relative_to(repo).as_posix()
        for line_number, command in workflow_run_commands(workflow):
            name = f"{workflow.stem}:{line_number}:{command}"
            records.append(
                record(
                    source=rel,
                    name=name,
                    command=command,
                    entrypoint="github workflow",
                    evidence=f"{rel}:{line_number}",
                ),
            )
    return records


def hook_records(repo: Path) -> list[dict[str, Any]]:
    hook_paths = [repo / ".husky" / "pre-commit"]
    records: list[dict[str, Any]] = []
    for hook_path in hook_paths:
        if not hook_path.exists():
            continue
        rel = hook_path.relative_to(repo).as_posix()
        for line_number, line in enumerate(hook_path.read_text(encoding="utf-8").splitlines(), 1):
            command = line.strip()
            if not command or command.startswith("#"):
                continue
            if not command.startswith(("npm ", "git add ", "node ")):
                continue
            name = f"{hook_path.name}:{line_number}:{command}"
            records.append(
                record(
                    source=rel,
                    name=name,
                    command=command,
                    entrypoint="git hook",
                    evidence=f"{rel}:{line_number}",
                ),
            )
    return records


def build_registry(repo: Path) -> dict[str, Any]:
    commands = package_records(repo) + makefile_records(repo) + workflow_records(repo) + hook_records(repo)
    commands = sorted(commands, key=lambda item: (item["status"], item["id"]))
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_by": "scripts/cli_inventory.py",
        "last_verified": LAST_VERIFIED,
        "sources": [
            "package.json",
            "Makefile",
            ".github/workflows/*.yml",
            ".husky/pre-commit",
        ],
        "commands": commands,
    }


def json_text(data: dict[str, Any]) -> str:
    return json.dumps(data, indent=2, sort_keys=False) + "\n"


def md_text(data: dict[str, Any]) -> str:
    lines = [
        "# Command Map",
        "",
        "<!-- GENERATED by scripts/cli_inventory.py; do not edit by hand. -->",
        "",
        f"Schema version: `{data['schema_version']}`",
        f"Last verified: `{data['last_verified']}`",
        "",
        "Regenerate:",
        "",
        "```bash",
        "npm run governance:cli:write",
        "npm run governance:cli:check",
        "```",
        "",
        "Officialization rule: package scripts and Makefile targets are official",
        "only when listed by the generator allowlists. CI shell commands are",
        "candidates until promoted through the repo governance docs.",
        "",
    ]
    for status in ["official", "candidate", "dangerous", "legacy", "unknown"]:
        items = [command for command in data["commands"] if command["status"] == status]
        if not items:
            continue
        lines.extend([f"## {status.title()} Commands", ""])
        for command in items:
            lines.extend(
                [
                    f"### {command['id']}",
                    "",
                    f"- command: `{command['command']}`",
                    f"- category: `{command['category']}`",
                    f"- entrypoint: `{command['entrypoint']}`",
                    f"- source: `{command['source']}`",
                    f"- evidence: `{command['source_evidence']}`",
                    f"- safe_to_run: `{str(command['safe_to_run']).lower()}`",
                    f"- destructive_level: `{command['destructive_level']}`",
                ],
            )
            if command["reads"]:
                lines.append(f"- reads: `{', '.join(command['reads'])}`")
            if command["writes"]:
                lines.append(f"- writes: `{', '.join(command['writes'])}`")
            if command["env"]:
                lines.append(f"- env: `{', '.join(command['env'])}`")
            if command["replacement"]:
                lines.append(f"- replacement: `{command['replacement']}`")
            if command["avoid_reason"]:
                lines.append(f"- avoid_reason: {command['avoid_reason']}")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def write_outputs(repo: Path, data: dict[str, Any]) -> None:
    registry = repo / REGISTRY_PATH
    command_map = repo / MAP_PATH
    registry.parent.mkdir(parents=True, exist_ok=True)
    command_map.parent.mkdir(parents=True, exist_ok=True)
    registry.write_text(json_text(data), encoding="utf-8")
    command_map.write_text(md_text(data), encoding="utf-8")


def check_outputs(repo: Path, data: dict[str, Any]) -> int:
    expected = {
        REGISTRY_PATH: json_text(data),
        MAP_PATH: md_text(data),
    }
    stale: list[str] = []
    for rel_path, content in expected.items():
        path = repo / rel_path
        if not path.exists() or path.read_text(encoding="utf-8") != content:
            stale.append(rel_path.as_posix())
    if stale:
        print("CLI inventory is stale. Regenerate with: npm run governance:cli:write", file=sys.stderr)
        for rel_path in stale:
            print(f"- {rel_path}", file=sys.stderr)
        return 1
    print(f"OK: CLI inventory is current ({len(data['commands'])} commands)")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".", help="repository root")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="write generated registry and map")
    mode.add_argument("--check", action="store_true", help="check generated registry and map")
    args = parser.parse_args(argv)

    repo = Path(args.repo).resolve()
    data = build_registry(repo)
    if args.write:
        write_outputs(repo, data)
        print(f"Wrote {REGISTRY_PATH} and {MAP_PATH}")
        return 0
    return check_outputs(repo, data)


if __name__ == "__main__":
    raise SystemExit(main())
