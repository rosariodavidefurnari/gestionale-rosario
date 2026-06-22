#!/usr/bin/env python3
"""Generate the repository variable registry and readable map."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
LAST_VERIFIED = "2026-06-22"
REGISTRY_PATH = Path("docs/variables/VARIABLE_REGISTRY.json")
MAP_PATH = Path("docs/variables/VARIABLE_MAP.md")
CLI_REGISTRY_PATH = Path("docs/cli/COMMAND_REGISTRY.json")

SAFE_EXACT_PATHS = {
    ".github/workflows/check.yml",
    ".github/workflows/deploy.yml",
    ".github/workflows/keep-alive.yml",
    ".husky/pre-commit",
    "Makefile",
    "package.json",
    "playwright.config.ts",
    "supabase/config.toml",
    "supabase/functions/.env.example",
    "vite.config.ts",
}

EXCLUDED_EXACT_PATHS = {
    "scripts/governance_inventory_test.py",
}

SAFE_PREFIXES = (
    ".github/workflows/",
    "app/src/",
    "scripts/",
    "src/",
    "supabase/functions/",
    "supabase/migrations/",
    "tests/",
)

SAFE_SUFFIXES = {
    ".cjs",
    ".js",
    ".json",
    ".mjs",
    ".py",
    ".sh",
    ".sql",
    ".toml",
    ".ts",
    ".tsx",
    ".yaml",
    ".yml",
}

EXCLUDED_PREFIXES = (
    ".git/",
    "dist/",
    "docs/",
    "node_modules/",
    "public/",
)

CONFIG_PATHS = {
    ".contextignore": "code-RAG corpus policy",
    ".github/workflows/check.yml": "CI check workflow",
    ".github/workflows/deploy.yml": "manual deploy workflow",
    ".github/workflows/keep-alive.yml": "Supabase keep-alive workflow",
    ".husky/pre-commit": "pre-commit guard order",
    ".prettierignore": "formatter exclusion policy",
    "Makefile": "operator command aliases",
    "package.json": "npm scripts and package toolchain",
    "playwright.config.ts": "E2E runner configuration",
    "supabase/config.toml": "local Supabase configuration",
    "supabase/functions/.env.example": "Edge Functions local secret template",
    "vite.config.ts": "Vite build/runtime configuration",
}

REQUIRED_ENV_NAMES = {
    "CRON_SHARED_SECRET",
    "SB_PUBLISHABLE_KEY",
    "SB_SECRET_KEY",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "SUPABASE_PROJECT_ID",
    "SUPABASE_URL",
    "VITE_SB_PUBLISHABLE_KEY",
    "VITE_SUPABASE_URL",
}

SENSITIVE_TOKENS = (
    "APIKEY",
    "API_KEY",
    "AUTHORIZED_IPS",
    "KEY",
    "PASSWORD",
    "PRIVATE",
    "SECRET",
    "TOKEN",
)


@dataclass(frozen=True)
class VariableRef:
    name: str
    source_file: str
    line: int
    kind: str
    default: str | None = None

    @property
    def evidence(self) -> str:
        return f"{self.source_file}:{self.line}"


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def tracked_files(repo: Path) -> list[str]:
    try:
        output = subprocess.check_output(
            ["git", "ls-files"],
            cwd=repo,
            text=True,
            stderr=subprocess.DEVNULL,
        )
        return sorted(line for line in output.splitlines() if line)
    except (OSError, subprocess.CalledProcessError):
        return sorted(
            path.relative_to(repo).as_posix()
            for path in repo.rglob("*")
            if path.is_file()
        )


def is_secret_path(rel_path: str) -> bool:
    name = Path(rel_path).name
    if name == ".env.example":
        return False
    if name.startswith(".env") or name.endswith(".env"):
        return True
    if rel_path.endswith(".local"):
        return True
    return False


def is_safe_source(rel_path: str) -> bool:
    if rel_path in EXCLUDED_EXACT_PATHS:
        return False
    if is_secret_path(rel_path):
        return False
    if rel_path in SAFE_EXACT_PATHS:
        return True
    if rel_path.startswith(EXCLUDED_PREFIXES):
        return False
    if not rel_path.startswith(SAFE_PREFIXES):
        return False
    return Path(rel_path).suffix in SAFE_SUFFIXES


def normalize_default(value: str | None, *, sensitive: bool = False) -> str | None:
    if value is None:
        return None
    value = value.strip().strip("\"'")
    if not value:
        return None
    if re.search(r"\$\{\{\s*secrets\.", value):
        return "<github secret>"
    if re.search(r"\$\{\{\s*vars\.", value):
        return "<github variable>"
    if re.search(r"\$\{\{\s*env\.", value):
        return "<github env>"
    if sensitive and not value.startswith("http://") and not value.startswith("https://"):
        return "<configured secret>"
    return value


def is_sensitive(name: str) -> bool:
    return any(token in name for token in SENSITIVE_TOKENS)


def infer_default_from_line(name: str, line: str) -> str | None:
    escaped = re.escape(name)
    patterns = [
        rf"{escaped}\s*[:=]\s*(.+)$",
        rf"{escaped}[^\n]+(?:\?\?|\|\|)\s*[\"']([^\"']+)[\"']",
    ]
    for pattern in patterns:
        match = re.search(pattern, line)
        if match:
            return normalize_default(match.group(1), sensitive=is_sensitive(name))
    return None


def discover_env_refs(repo: Path) -> list[VariableRef]:
    refs: list[VariableRef] = []
    regexes = [
        ("process_env", re.compile(r"process\.env\.([A-Z][A-Z0-9_]*)")),
        ("process_env", re.compile(r"process\.env\[['\"]([A-Z][A-Z0-9_]*)['\"]\]")),
        ("vite_env", re.compile(r"import\.meta\.env\.([A-Z][A-Z0-9_]*)")),
        ("deno_env", re.compile(r"Deno\.env\.get\(['\"]([A-Z][A-Z0-9_]*)['\"]\)")),
        ("github_secret", re.compile(r"\$\{\{\s*secrets\.([A-Z][A-Z0-9_]*)\s*}}")),
        ("github_var", re.compile(r"\$\{\{\s*vars\.([A-Z][A-Z0-9_]*)\s*}}")),
        ("github_env", re.compile(r"\$\{\{\s*env\.([A-Z][A-Z0-9_]*)\s*}}")),
    ]
    workflow_env_re = re.compile(r"^\s*([A-Z][A-Z0-9_]{2,})\s*:\s*(.+)$")
    shell_env_re = re.compile(r"(?<![A-Za-z0-9_])\$(?:\{([A-Z][A-Z0-9_]{2,})\}|([A-Z][A-Z0-9_]{2,})\b)")
    dotenv_re = re.compile(r"^([A-Z][A-Z0-9_]*)=(.*)$")

    for rel_path in tracked_files(repo):
        if not is_safe_source(rel_path):
            continue
        path = repo / rel_path
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except UnicodeDecodeError:
            continue
        previous_line_was_import_meta_env = False
        for line_number, line in enumerate(lines, 1):
            if rel_path.endswith(".env.example"):
                match = dotenv_re.match(line.strip())
                if match:
                    name = match.group(1)
                    refs.append(
                        VariableRef(
                            name=name,
                            source_file=rel_path,
                            line=line_number,
                            kind="env_example",
                            default=normalize_default(
                                match.group(2),
                                sensitive=is_sensitive(name),
                            ),
                        ),
                    )
                continue

            for kind, regex in regexes:
                for match in regex.finditer(line):
                    name = match.group(1)
                    refs.append(
                        VariableRef(
                            name=name,
                            source_file=rel_path,
                            line=line_number,
                            kind=kind,
                            default=infer_default_from_line(name, line),
                        ),
                    )

            split_import_meta_match = (
                re.search(r"\.([A-Z][A-Z0-9_]*)", line)
                if previous_line_was_import_meta_env
                else None
            )
            if split_import_meta_match:
                name = split_import_meta_match.group(1)
                refs.append(
                    VariableRef(
                        name=name,
                        source_file=rel_path,
                        line=line_number,
                        kind="vite_env",
                        default=infer_default_from_line(name, line),
                    ),
                )
            previous_line_was_import_meta_env = bool(re.search(r"import\.meta\.env\s*$", line))

            if rel_path.startswith(".github/workflows/"):
                workflow_match = workflow_env_re.match(line)
                if workflow_match:
                    name = workflow_match.group(1)
                    refs.append(
                        VariableRef(
                            name=name,
                            source_file=rel_path,
                            line=line_number,
                            kind="github_env_definition",
                            default=normalize_default(
                                workflow_match.group(2),
                                sensitive=is_sensitive(name),
                            ),
                        ),
                    )
                for match in shell_env_re.finditer(line):
                    name = match.group(1) or match.group(2)
                    refs.append(
                        VariableRef(
                            name=name,
                            source_file=rel_path,
                            line=line_number,
                            kind="shell_env",
                            default=infer_default_from_line(name, line),
                        ),
                    )
    return refs


def scope_for_env(name: str, refs: list[VariableRef]) -> str:
    files = {ref.source_file for ref in refs}
    if len({scope_from_file(name, ref.source_file) for ref in refs}) > 1:
        return "shared"
    return scope_from_file(name, next(iter(files)))


def scope_from_file(name: str, rel_path: str) -> str:
    if name.startswith("VITE_"):
        return "frontend_build"
    if rel_path.startswith("supabase/functions/"):
        return "edge_function"
    if rel_path.startswith(".github/workflows/"):
        return "ci"
    if rel_path.startswith("tests/"):
        return "test"
    if rel_path.startswith("scripts/"):
        return "operator_script"
    if rel_path.startswith("src/") or rel_path == "vite.config.ts":
        return "frontend_build"
    return "repo"


def risk_for_env(name: str, refs: list[VariableRef]) -> str:
    if is_sensitive(name):
        return "secret or credential; never log real values"
    if name.startswith("VITE_SUPABASE") or name.startswith("SUPABASE") or name.startswith("SB_"):
        return "Supabase auth/database routing"
    if name in {"OPENAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"}:
        return "AI provider access"
    if name.startswith("GOOGLE_"):
        return "Google provider integration"
    if name.startswith("SMTP_") or name.startswith("POSTMARK_") or name.startswith("CALLMEBOT_"):
        return "notification delivery"
    if name in {"NODE_ENV", "CI", "BUILD_SOURCEMAP", "BUNDLE_ANALYZE"}:
        return "build/runtime mode"
    if name in {"HEALTH_ENV_FILE", "SUPABASE_PROJECT_REF", "TODAY_ISO", "TS"}:
        return "operator smoke target"
    return "behavioral input"


def owner_for_env(name: str, refs: list[VariableRef]) -> str:
    files = {ref.source_file for ref in refs}
    if any(path.startswith(".github/workflows/deploy.yml") for path in files):
        return "github workflow deploy"
    if any(path.startswith(".github/workflows/check.yml") for path in files):
        return "github workflow check"
    if any(path.startswith(".github/workflows/keep-alive.yml") for path in files):
        return "github workflow keep-alive"
    if any(path.endswith("prod-smoke-ef-reminder-parity.ts") for path in files):
        return "npm run smoke:ef-reminder-parity"
    if any(path.endswith("prod-smoke-cash-vs-competence.ts") for path in files):
        return "npm run smoke:cash-vs-competence"
    if any(path.endswith("check-prod-financial-health.mjs") for path in files):
        return "npm run health:financial"
    if any(path.endswith("check-fiscal-backup-rest-anon.mjs") for path in files):
        return "npm run security:check:fiscal-backups:rest"
    if any(path.startswith("tests/") for path in files):
        return "npm run test:e2e"
    if any(path.startswith("supabase/functions/") for path in files):
        return "make remote-deploy-supabase"
    if any(path == "vite.config.ts" or path.startswith("src/") for path in files):
        return "npm run dev / npm run build"
    return "unknown"


def env_record(name: str, refs: list[VariableRef]) -> dict[str, Any]:
    refs = sorted(refs, key=lambda item: (item.source_file, item.line, item.kind))
    defaults = [ref.default for ref in refs if ref.default is not None]
    evidence = []
    for ref in refs:
        if ref.evidence not in evidence:
            evidence.append(ref.evidence)
    sensitive = is_sensitive(name) or any(ref.kind == "github_secret" for ref in refs)
    return {
        "id": f"env-{slug(name)}",
        "name": name,
        "scope": scope_for_env(name, refs),
        "type": "env",
        "default": defaults[0] if defaults else None,
        "required": name in REQUIRED_ENV_NAMES,
        "owner_command": owner_for_env(name, refs),
        "source_file": refs[0].source_file,
        "risk": risk_for_env(name, refs),
        "status": "verified",
        "source_evidence": evidence[:12],
        "sensitive": sensitive,
    }


def config_key_risk(name: str) -> tuple[str, bool]:
    if name == "businessProfile":
        return ("personal/business identity including IBAN and tax identity", True)
    if name == "fiscalConfig":
        return ("financial/fiscal semantics", False)
    if name == "aiConfig":
        return ("AI model/provider behavior", False)
    if name in {"googleWorkplaceDomain", "disableEmailPasswordAuthentication"}:
        return ("authentication behavior", False)
    if name == "operationalConfig":
        return ("operational defaults", False)
    return ("UI/runtime configuration", False)


def discover_config_keys(repo: Path) -> list[dict[str, Any]]:
    context_path = repo / "src/components/atomic-crm/root/ConfigurationContext.tsx"
    default_path = repo / "src/components/atomic-crm/root/defaultConfiguration.ts"
    if not context_path.exists():
        return []
    context_lines = context_path.read_text(encoding="utf-8").splitlines()
    default_lines = (
        default_path.read_text(encoding="utf-8").splitlines()
        if default_path.exists()
        else []
    )
    records: list[dict[str, Any]] = []
    in_interface = False
    for line_number, line in enumerate(context_lines, 1):
        if line.startswith("export interface ConfigurationContextValue"):
            in_interface = True
            continue
        if in_interface and line.strip() == "}":
            break
        if not in_interface:
            continue
        match = re.match(r"\s*([A-Za-z0-9_]+)(\?)?:\s*([^;]+);", line)
        if not match:
            continue
        name = match.group(1)
        optional = bool(match.group(2))
        value_type = match.group(3).strip()
        default_evidence = None
        for default_line_number, default_line in enumerate(default_lines, 1):
            if re.search(rf"\b{name}\s*:", default_line):
                default_evidence = f"src/components/atomic-crm/root/defaultConfiguration.ts:{default_line_number}"
                break
        risk, sensitive = config_key_risk(name)
        evidence = [f"src/components/atomic-crm/root/ConfigurationContext.tsx:{line_number}"]
        if default_evidence:
            evidence.append(default_evidence)
        records.append(
            {
                "id": f"config-{slug(name)}",
                "name": name,
                "scope": "app_configuration",
                "type": "config_key",
                "default": f"defaultConfiguration.{name}" if default_evidence else None,
                "required": not optional,
                "owner_command": "runtime settings table / ConfigurationContext",
                "source_file": "src/components/atomic-crm/root/ConfigurationContext.tsx",
                "risk": risk,
                "status": "verified",
                "source_evidence": evidence,
                "sensitive": sensitive,
                "value_type": value_type,
            },
        )
    return records


def package_script_flag_refs(repo: Path) -> dict[str, list[dict[str, str]]]:
    package_path = repo / "package.json"
    if not package_path.exists():
        return {}
    scripts = read_json(package_path).get("scripts", {})
    refs: dict[str, list[dict[str, str]]] = {}
    for name, command in sorted(scripts.items()):
        for flag in sorted(set(re.findall(r"(?<![A-Za-z0-9_-])--[A-Za-z][A-Za-z0-9:-]*", command))):
            refs.setdefault(flag, []).append(
                {
                    "command": f"npm run {name}",
                    "id": f"package.json:scripts.{name}",
                    "source": "package.json",
                },
            )
    return refs


def makefile_flag_refs(repo: Path) -> dict[str, list[dict[str, str]]]:
    makefile = repo / "Makefile"
    if not makefile.exists():
        return {}
    refs: dict[str, list[dict[str, str]]] = {}
    current_target: str | None = None
    for line_number, line in enumerate(makefile.read_text(encoding="utf-8").splitlines(), 1):
        target = re.match(r"^([A-Za-z0-9_-]+):", line)
        if target:
            current_target = target.group(1)
            continue
        if current_target is None or not line.startswith(("\t", " ")):
            continue
        for flag in sorted(set(re.findall(r"(?<![A-Za-z0-9_-])--[A-Za-z][A-Za-z0-9:-]*", line))):
            refs.setdefault(flag, []).append(
                {
                    "command": f"make {current_target}",
                    "id": f"Makefile:{line_number}",
                    "source": "Makefile",
                },
            )
    return refs


def cli_flag_records(repo: Path) -> list[dict[str, Any]]:
    registry_path = repo / CLI_REGISTRY_PATH
    flag_refs: dict[str, list[dict[str, str]]] = {}
    for source_refs in [package_script_flag_refs(repo), makefile_flag_refs(repo)]:
        for flag, refs in source_refs.items():
            flag_refs.setdefault(flag, []).extend(refs)
    if registry_path.exists():
        commands = read_json(registry_path).get("commands", [])
        for command in commands:
            for flag in sorted(set(re.findall(r"(?<![A-Za-z0-9_-])--[A-Za-z][A-Za-z0-9:-]*", command["command"]))):
                flag_refs.setdefault(flag, []).append(
                    {
                        "command": command["command"],
                        "id": command["id"],
                        "source": command["source"],
                    },
                )
    records = []
    for flag, refs in sorted(flag_refs.items()):
        records.append(
            {
                "id": f"flag-{slug(flag)}",
                "name": flag,
                "scope": "cli",
                "type": "cli_flag",
                "default": None,
                "required": False,
                "owner_command": refs[0]["command"],
                "owner_commands": [ref["command"] for ref in refs[:8]],
                "source_file": CLI_REGISTRY_PATH.as_posix(),
                "risk": "command behavior modifier",
                "status": "verified",
                "source_evidence": [f"{CLI_REGISTRY_PATH.as_posix()}:{ref['id']}" for ref in refs[:8]],
                "sensitive": False,
            },
        )
    return records


def config_path_records(repo: Path) -> list[dict[str, Any]]:
    records = []
    for rel_path, purpose in sorted(CONFIG_PATHS.items()):
        path = repo / rel_path
        if not path.exists():
            continue
        records.append(
            {
                "id": f"path-{slug(rel_path)}",
                "name": rel_path,
                "scope": "repo_configuration",
                "type": "config_path",
                "default": None,
                "required": rel_path in {"package.json", "Makefile", "vite.config.ts"},
                "owner_command": "repo governance",
                "source_file": rel_path,
                "risk": purpose,
                "status": "verified",
                "source_evidence": [rel_path],
                "sensitive": rel_path.endswith(".env.example"),
            },
        )
    return records


def build_registry(repo: Path) -> dict[str, Any]:
    refs_by_name: dict[str, list[VariableRef]] = {}
    for ref in discover_env_refs(repo):
        refs_by_name.setdefault(ref.name, []).append(ref)
    variables = [env_record(name, refs) for name, refs in sorted(refs_by_name.items())]
    variables.extend(discover_config_keys(repo))
    variables.extend(cli_flag_records(repo))
    variables.extend(config_path_records(repo))
    variables = sorted(variables, key=lambda item: (item["type"], item["scope"], item["name"]))
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_by": "scripts/variable_inventory.py",
        "last_verified": LAST_VERIFIED,
        "sources": [
            "tracked safe code/config files",
            CLI_REGISTRY_PATH.as_posix(),
            "src/components/atomic-crm/root/ConfigurationContext.tsx",
        ],
        "variables": variables,
    }


def json_text(data: dict[str, Any]) -> str:
    return json.dumps(data, indent=2, sort_keys=False) + "\n"


def md_text(data: dict[str, Any]) -> str:
    lines = [
        "# Variable Map",
        "",
        "<!-- GENERATED by scripts/variable_inventory.py; do not edit by hand. -->",
        "",
        f"Schema version: `{data['schema_version']}`",
        f"Last verified: `{data['last_verified']}`",
        "",
        "Regenerate:",
        "",
        "```bash",
        "npm run governance:variables:write",
        "npm run governance:variables:check",
        "```",
        "",
        "Source policy: only tracked, safe source/config files are scanned.",
        "Real `.env*` files are excluded; `supabase/functions/.env.example` is",
        "used only as a template source.",
        "",
    ]
    for variable_type in ["env", "config_key", "cli_flag", "config_path"]:
        items = [item for item in data["variables"] if item["type"] == variable_type]
        if not items:
            continue
        lines.extend([f"## {variable_type.replace('_', ' ').title()}s", ""])
        for item in items:
            lines.extend(
                [
                    f"### {item['id']}",
                    "",
                    f"- name: `{item['name']}`",
                    f"- scope: `{item['scope']}`",
                    f"- required: `{str(item['required']).lower()}`",
                    f"- sensitive: `{str(item['sensitive']).lower()}`",
                    f"- status: `{item['status']}`",
                    f"- owner_command: `{item['owner_command']}`",
                    f"- source_file: `{item['source_file']}`",
                    f"- risk: {item['risk']}",
                ],
            )
            if item.get("default") is not None:
                lines.append(f"- default: `{item['default']}`")
            if item.get("value_type"):
                lines.append(f"- value_type: `{item['value_type']}`")
            evidence = item.get("source_evidence", [])
            if evidence:
                lines.append(f"- evidence: `{', '.join(evidence[:6])}`")
            owner_commands = item.get("owner_commands", [])
            if owner_commands:
                lines.append(f"- owner_commands: `{', '.join(owner_commands[:4])}`")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def write_outputs(repo: Path, data: dict[str, Any]) -> None:
    registry = repo / REGISTRY_PATH
    variable_map = repo / MAP_PATH
    registry.parent.mkdir(parents=True, exist_ok=True)
    variable_map.parent.mkdir(parents=True, exist_ok=True)
    registry.write_text(json_text(data), encoding="utf-8")
    variable_map.write_text(md_text(data), encoding="utf-8")


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
        print("Variable inventory is stale. Regenerate with: npm run governance:variables:write", file=sys.stderr)
        for rel_path in stale:
            print(f"- {rel_path}", file=sys.stderr)
        return 1
    print(f"OK: variable inventory is current ({len(data['variables'])} variables)")
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
