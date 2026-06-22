#!/usr/bin/env python3
"""Generate the repository artifact registry and readable map."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
LAST_VERIFIED = "2026-06-22"
REGISTRY_PATH = Path("docs/artifacts/ARTIFACT_REGISTRY.json")
MAP_PATH = Path("docs/artifacts/ARTIFACT_MAP.md")
CLI_REGISTRY_PATH = Path("docs/cli/COMMAND_REGISTRY.json")
VARIABLE_REGISTRY_PATH = Path("docs/variables/VARIABLE_REGISTRY.json")
WORKFLOW_REGISTRY_PATH = Path("docs/workflows/WORKFLOW_REGISTRY.json")

KINDS = {"source", "derived", "cache", "external", "secret", "dangerous"}
DELETE_POLICIES = {"never_delete", "never_commit", "operator_review", "safe_rebuild"}


ARTIFACT_DEFINITIONS: list[dict[str, Any]] = [
    {
        "id": "source-frontend-app",
        "path_patterns": ["src/**", "app/src/**"],
        "kind": "source",
        "producers": [],
        "consumers": ["frontend-quality-gate", "local-development-stack", "local-e2e-smoke"],
        "source_variables": [
            "package.json",
            "VITE_SUPABASE_URL",
            "VITE_SB_PUBLISHABLE_KEY",
            "VITE_CLOUDINARY_CLOUD_NAME",
            "VITE_CLOUDINARY_API_KEY",
            "VITE_GOOGLE_WORKPLACE_DOMAIN",
            "VITE_DISABLE_EMAIL_PASSWORD_AUTHENTICATION",
        ],
        "delete_policy": "never_delete",
        "risk": "Product source and mutable UI framework source.",
        "validation": ["npm run typecheck", "npm run lint", "npm run test"],
        "allowed_to_read": True,
        "allowed_to_index": True,
        "allowed_to_log": True,
    },
    {
        "id": "source-supabase-functions",
        "path_patterns": ["supabase/functions/**", "!supabase/functions/.env", "!supabase/functions/node_modules/**"],
        "kind": "source",
        "producers": [],
        "consumers": ["remote-supabase-deploy", "production-financial-health"],
        "source_variables": [
            "SUPABASE_URL",
            "SB_SECRET_KEY",
            "SB_PUBLISHABLE_KEY",
            "SUPABASE_ANON_KEY",
            "CRON_SHARED_SECRET",
            "OPENAI_API_KEY",
            "GEMINI_API_KEY",
            "GOOGLE_API_KEY",
            "GOOGLE_MAPS_API_KEY",
            "SMTP_HOST",
            "SMTP_PORT",
            "SMTP_USER",
            "SMTP_PASS",
            "SMTP_FROM_NAME",
            "CALLMEBOT_PHONE",
            "CALLMEBOT_APIKEY",
            "GOOGLE_CALENDAR_CLIENT_EMAIL",
            "GOOGLE_CALENDAR_PRIVATE_KEY",
            "GOOGLE_CALENDAR_ID",
        ],
        "delete_policy": "never_delete",
        "risk": "Remote Edge Function behavior and provider integrations.",
        "validation": ["npm run governance:variables:check", "npm run health:financial"],
        "allowed_to_read": True,
        "allowed_to_index": True,
        "allowed_to_log": True,
    },
    {
        "id": "source-supabase-migrations",
        "path_patterns": ["supabase/migrations/**", "supabase/seed.sql", "supabase/seed_domain_data.sql"],
        "kind": "source",
        "producers": [],
        "consumers": ["remote-supabase-deploy", "local-domain-database-reset"],
        "source_variables": ["SUPABASE_PROJECT_ID", "SUPABASE_DB_PASSWORD"],
        "delete_policy": "never_delete",
        "risk": "Database schema, seed, fiscal, and financial domain state.",
        "validation": ["npm run health:financial"],
        "allowed_to_read": True,
        "allowed_to_index": True,
        "allowed_to_log": True,
    },
    {
        "id": "source-tests",
        "path_patterns": ["tests/**", "**/*.test.ts", "**/*.spec.tsx"],
        "kind": "source",
        "producers": [],
        "consumers": ["frontend-quality-gate", "local-e2e-smoke"],
        "source_variables": ["LOCAL_SUPABASE_ADMIN_EMAIL", "LOCAL_SUPABASE_ADMIN_PASSWORD"],
        "delete_policy": "never_delete",
        "risk": "Regression coverage and deterministic local data controllers.",
        "validation": ["npm run test", "npm run test:e2e"],
        "allowed_to_read": True,
        "allowed_to_index": True,
        "allowed_to_log": True,
    },
    {
        "id": "source-governance-generators",
        "path_patterns": ["scripts/*_inventory.py", "scripts/governance_inventory_test.py", "scripts/governance_pre_commit.py"],
        "kind": "source",
        "producers": [],
        "consumers": ["governance-registry-refresh", "pre-commit-continuity-guard"],
        "source_variables": ["package.json", "Makefile", ".husky/pre-commit"],
        "delete_policy": "never_delete",
        "risk": "Governance map generation and drift-check logic.",
        "validation": ["npm run governance:test"],
        "allowed_to_read": True,
        "allowed_to_index": True,
        "allowed_to_log": True,
    },
    {
        "id": "generated-governance-registries",
        "path_patterns": [
            "docs/cli/COMMAND_REGISTRY.json",
            "docs/cli/COMMAND_MAP.md",
            "docs/variables/VARIABLE_REGISTRY.json",
            "docs/variables/VARIABLE_MAP.md",
            "docs/workflows/WORKFLOW_REGISTRY.json",
            "docs/workflows/WORKFLOW_MAP.md",
            "docs/artifacts/ARTIFACT_REGISTRY.json",
            "docs/artifacts/ARTIFACT_MAP.md",
        ],
        "kind": "derived",
        "producers": [
            "npm run governance:cli:write",
            "npm run governance:variables:write",
            "npm run governance:workflows:write",
            "npm run governance:artifacts:write",
        ],
        "consumers": ["governance-registry-refresh", "pre-commit-continuity-guard"],
        "source_variables": ["package.json", "Makefile", ".husky/pre-commit"],
        "delete_policy": "safe_rebuild",
        "risk": "Generated governance truth; stale files mislead future agents.",
        "validation": [
            "npm run governance:cli:check",
            "npm run governance:variables:check",
            "npm run governance:workflows:check",
            "npm run governance:artifacts:check",
        ],
        "allowed_to_read": True,
        "allowed_to_index": False,
        "allowed_to_log": True,
    },
    {
        "id": "generated-shadcn-registry",
        "path_patterns": ["registry.json"],
        "kind": "derived",
        "producers": ["npm run registry:gen"],
        "consumers": ["pre-commit-continuity-guard", "docs-registry-publish"],
        "source_variables": ["package.json"],
        "delete_policy": "safe_rebuild",
        "risk": "Generated component registry must match source components.",
        "validation": ["npm run registry:gen"],
        "allowed_to_read": True,
        "allowed_to_index": True,
        "allowed_to_log": True,
    },
    {
        "id": "generated-frontend-build",
        "path_patterns": ["dist/**", "build/**"],
        "kind": "derived",
        "producers": ["npm run build"],
        "consumers": ["frontend-quality-gate"],
        "source_variables": ["VITE_SUPABASE_URL", "VITE_SB_PUBLISHABLE_KEY", "VITE_INBOUND_EMAIL"],
        "delete_policy": "safe_rebuild",
        "risk": "Production frontend bundle output.",
        "validation": ["npm run build"],
        "allowed_to_read": True,
        "allowed_to_index": False,
        "allowed_to_log": True,
    },
    {
        "id": "generated-docs-and-public-registry",
        "path_patterns": ["doc/dist/**", "public/r/**"],
        "kind": "derived",
        "producers": ["make doc-build", "make registry-build"],
        "consumers": ["docs-registry-publish"],
        "source_variables": ["GITHUB_TOKEN", "GITHUB_REPOSITORY"],
        "delete_policy": "safe_rebuild",
        "risk": "Publishable docs and public registry artifacts.",
        "validation": ["make doc-build", "make registry-build"],
        "allowed_to_read": True,
        "allowed_to_index": False,
        "allowed_to_log": True,
    },
    {
        "id": "cache-node-dependencies",
        "path_patterns": ["node_modules/**", "supabase/functions/node_modules/**"],
        "kind": "cache",
        "producers": ["make install", "npm ci"],
        "consumers": [
            "frontend-quality-gate",
            "local-development-stack",
            "local-e2e-smoke",
            "docs-registry-publish",
        ],
        "source_variables": ["package.json"],
        "delete_policy": "safe_rebuild",
        "risk": "Rebuildable dependency cache; never inspect as source truth.",
        "validation": ["npm run governance:cli:check"],
        "allowed_to_read": False,
        "allowed_to_index": False,
        "allowed_to_log": False,
    },
    {
        "id": "cache-test-and-browser-output",
        "path_patterns": ["test-results/**", "playwright-report/**", ".playwright-mcp/**", ".browser-sessions/**", "coverage/**"],
        "kind": "cache",
        "producers": ["npm run test:e2e"],
        "consumers": ["local-e2e-smoke"],
        "source_variables": ["LOCAL_SUPABASE_ADMIN_EMAIL", "LOCAL_SUPABASE_ADMIN_PASSWORD"],
        "delete_policy": "safe_rebuild",
        "risk": "Rebuildable test/browser output; useful only for immediate debugging.",
        "validation": ["npm run test:e2e"],
        "allowed_to_read": True,
        "allowed_to_index": False,
        "allowed_to_log": True,
    },
    {
        "id": "secret-env-files",
        "path_patterns": [".env", ".env.*", "supabase/functions/.env", "Chiavi Google Calendar/**"],
        "kind": "secret",
        "producers": [],
        "consumers": [
            "local-development-stack",
            "production-financial-health",
            "remote-supabase-deploy",
            "docs-registry-publish",
        ],
        "source_variables": [
            "SUPABASE_URL",
            "SUPABASE_PROJECT_REF",
            "HEALTH_ENV_FILE",
            "GITHUB_TOKEN",
            "SUPABASE_ACCESS_TOKEN",
            "SUPABASE_DB_PASSWORD",
            "SB_SECRET_KEY",
            "VITE_SUPABASE_URL",
            "VITE_SB_PUBLISHABLE_KEY",
        ],
        "delete_policy": "never_commit",
        "risk": "Local and remote credentials; values must never be logged, indexed, or committed.",
        "validation": ["npm run governance:variables:check"],
        "allowed_to_read": False,
        "allowed_to_index": False,
        "allowed_to_log": False,
    },
    {
        "id": "external-fiscal-source-files",
        "path_patterns": ["Fatture/**", "*.numbers", "*.pdf"],
        "kind": "external",
        "producers": [],
        "consumers": [],
        "source_variables": [],
        "delete_policy": "never_delete",
        "risk": "External fiscal/business source material; operator approval required before moving or deleting.",
        "validation": [],
        "allowed_to_read": False,
        "allowed_to_index": False,
        "allowed_to_log": False,
    },
    {
        "id": "dangerous-local-supabase-state",
        "path_patterns": ["local Supabase database", "supabase/.branches/**", "supabase/.temp/**"],
        "kind": "dangerous",
        "producers": ["make start-supabase", "make supabase-reset-database"],
        "consumers": ["local-development-stack", "local-domain-database-reset", "local-e2e-smoke"],
        "source_variables": ["LOCAL_SUPABASE_ADMIN_EMAIL", "LOCAL_SUPABASE_ADMIN_PASSWORD"],
        "delete_policy": "operator_review",
        "risk": "Local database/runtime state can hide unexported work; reset only with explicit intent.",
        "validation": ["npm run test:e2e"],
        "allowed_to_read": False,
        "allowed_to_index": False,
        "allowed_to_log": False,
    },
    {
        "id": "dangerous-remote-supabase-state",
        "path_patterns": ["remote Supabase database", "remote Supabase Edge Functions"],
        "kind": "dangerous",
        "producers": ["make remote-deploy-supabase"],
        "consumers": ["remote-supabase-deploy", "production-financial-health"],
        "source_variables": [
            "SUPABASE_ACCESS_TOKEN",
            "SUPABASE_DB_PASSWORD",
            "SUPABASE_PROJECT_ID",
            "SUPABASE_URL",
            "SB_PUBLISHABLE_KEY",
        ],
        "delete_policy": "never_delete",
        "risk": "Production database/functions; no reset or destructive repair without a dedicated plan.",
        "validation": ["npm run health:financial"],
        "allowed_to_read": False,
        "allowed_to_index": False,
        "allowed_to_log": False,
    },
]


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def command_set(repo: Path) -> set[str]:
    path = repo / CLI_REGISTRY_PATH
    if not path.exists():
        return set()
    return {item["command"] for item in read_json(path).get("commands", [])}


def variable_set(repo: Path) -> set[str]:
    path = repo / VARIABLE_REGISTRY_PATH
    if not path.exists():
        return set()
    return {item["name"] for item in read_json(path).get("variables", [])}


def workflow_id_set(repo: Path) -> set[str]:
    path = repo / WORKFLOW_REGISTRY_PATH
    if not path.exists():
        return set()
    return {item["id"] for item in read_json(path).get("workflows", [])}


def validate_artifact(
    artifact: dict[str, Any],
    commands: set[str],
    variables: set[str],
    workflows: set[str],
) -> list[str]:
    failures: list[str] = []
    if artifact["kind"] not in KINDS:
        failures.append(f"{artifact['id']}: invalid kind `{artifact['kind']}`")
    if artifact["delete_policy"] not in DELETE_POLICIES:
        failures.append(f"{artifact['id']}: invalid delete_policy `{artifact['delete_policy']}`")
    for producer in artifact["producers"] + artifact["validation"]:
        if producer not in commands:
            failures.append(f"{artifact['id']}: missing CLI producer/validation `{producer}`")
    for consumer in artifact["consumers"]:
        if consumer not in workflows:
            failures.append(f"{artifact['id']}: missing workflow consumer `{consumer}`")
    for variable in artifact["source_variables"]:
        if variable not in variables:
            failures.append(f"{artifact['id']}: missing source variable `{variable}`")
    if artifact["kind"] == "secret":
        if artifact["delete_policy"] != "never_commit":
            failures.append(f"{artifact['id']}: secret artifacts must use never_commit")
        for flag in ["allowed_to_read", "allowed_to_index", "allowed_to_log"]:
            if artifact[flag]:
                failures.append(f"{artifact['id']}: secret artifacts require {flag}=false")
    return failures


def validate_registry(data: dict[str, Any], commands: set[str], variables: set[str], workflows: set[str]) -> list[str]:
    failures: list[str] = []
    ids: set[str] = set()
    for artifact in data["artifacts"]:
        if artifact["id"] in ids:
            failures.append(f"duplicate artifact id `{artifact['id']}`")
        ids.add(artifact["id"])
        failures.extend(validate_artifact(artifact, commands, variables, workflows))
    return failures


def build_registry(repo: Path) -> dict[str, Any]:
    artifacts = sorted(ARTIFACT_DEFINITIONS, key=lambda item: item["id"])
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_by": "scripts/artifact_inventory.py",
        "last_verified": LAST_VERIFIED,
        "sources": [
            CLI_REGISTRY_PATH.as_posix(),
            VARIABLE_REGISTRY_PATH.as_posix(),
            WORKFLOW_REGISTRY_PATH.as_posix(),
            ".gitignore",
            "scripts/artifact_inventory.py",
        ],
        "artifacts": artifacts,
    }


def json_text(data: dict[str, Any]) -> str:
    return json.dumps(data, indent=2, sort_keys=False) + "\n"


def md_text(data: dict[str, Any]) -> str:
    lines = [
        "# Artifact Map",
        "",
        "<!-- GENERATED by scripts/artifact_inventory.py; do not edit by hand. -->",
        "",
        f"Schema version: `{data['schema_version']}`",
        f"Last verified: `{data['last_verified']}`",
        "",
        "Regenerate:",
        "",
        "```bash",
        "npm run governance:artifacts:write",
        "npm run governance:artifacts:check",
        "```",
        "",
        "Validation rule: producers and validation commands must exist in the CLI registry;",
        "consumers must exist in the workflow registry; source variables must exist in",
        "the variable registry. Secret artifacts must not be readable, indexable, or loggable.",
        "",
    ]
    for artifact in data["artifacts"]:
        lines.extend(
            [
                f"## {artifact['id']}",
                "",
                f"- kind: `{artifact['kind']}`",
                f"- path_patterns: `{', '.join(artifact['path_patterns'])}`",
                f"- delete_policy: `{artifact['delete_policy']}`",
                f"- producers: `{', '.join(artifact['producers']) if artifact['producers'] else 'none'}`",
                f"- consumers: `{', '.join(artifact['consumers']) if artifact['consumers'] else 'none'}`",
                f"- source_variables: `{', '.join(artifact['source_variables']) if artifact['source_variables'] else 'none'}`",
                f"- validation: `{', '.join(artifact['validation']) if artifact['validation'] else 'none'}`",
                f"- allowed_to_read: `{str(artifact['allowed_to_read']).lower()}`",
                f"- allowed_to_index: `{str(artifact['allowed_to_index']).lower()}`",
                f"- allowed_to_log: `{str(artifact['allowed_to_log']).lower()}`",
                f"- risk: {artifact['risk']}",
                "",
            ],
        )
    return "\n".join(lines).rstrip() + "\n"


def write_outputs(repo: Path, data: dict[str, Any]) -> None:
    registry = repo / REGISTRY_PATH
    artifact_map = repo / MAP_PATH
    registry.parent.mkdir(parents=True, exist_ok=True)
    artifact_map.parent.mkdir(parents=True, exist_ok=True)
    registry.write_text(json_text(data), encoding="utf-8")
    artifact_map.write_text(md_text(data), encoding="utf-8")


def check_outputs(repo: Path, data: dict[str, Any]) -> int:
    failures = validate_registry(data, command_set(repo), variable_set(repo), workflow_id_set(repo))
    if failures:
        print("Artifact inventory validation failed.", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

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
        print("Artifact inventory is stale. Regenerate with: npm run governance:artifacts:write", file=sys.stderr)
        for rel_path in stale:
            print(f"- {rel_path}", file=sys.stderr)
        return 1
    print(f"OK: artifact inventory is current ({len(data['artifacts'])} artifacts)")
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
        failures = validate_registry(data, command_set(repo), variable_set(repo), workflow_id_set(repo))
        if failures:
            for failure in failures:
                print(f"- {failure}", file=sys.stderr)
            return 1
        write_outputs(repo, data)
        print(f"Wrote {REGISTRY_PATH} and {MAP_PATH}")
        return 0
    return check_outputs(repo, data)


if __name__ == "__main__":
    raise SystemExit(main())
