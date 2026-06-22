#!/usr/bin/env python3
"""Generate the repository workflow registry and readable map."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
LAST_VERIFIED = "2026-06-22"
REGISTRY_PATH = Path("docs/workflows/WORKFLOW_REGISTRY.json")
MAP_PATH = Path("docs/workflows/WORKFLOW_MAP.md")
CLI_REGISTRY_PATH = Path("docs/cli/COMMAND_REGISTRY.json")
VARIABLE_REGISTRY_PATH = Path("docs/variables/VARIABLE_REGISTRY.json")


WORKFLOW_DEFINITIONS: list[dict[str, Any]] = [
    {
        "id": "governance-registry-refresh",
        "name": "Governance registry refresh",
        "intent": "Regenerate and verify the governance command, variable, and workflow maps.",
        "steps": [
            "Regenerate the CLI registry after package, Makefile, workflow, or hook command changes.",
            "Regenerate the variable registry after env, config, or command flag changes.",
            "Regenerate the workflow registry after adding or changing ordered operator workflows.",
            "Regenerate the artifact registry after artifact producer, consumer, or delete policy changes.",
            "Run the governance generator tests.",
        ],
        "commands": [
            "npm run governance:cli:write",
            "npm run governance:variables:write",
            "npm run governance:workflows:write",
            "npm run governance:artifacts:write",
            "npm run governance:test",
        ],
        "inputs": ["package.json", "Makefile", ".husky/pre-commit"],
        "outputs": [
            "docs/cli/COMMAND_REGISTRY.json",
            "docs/cli/COMMAND_MAP.md",
            "docs/variables/VARIABLE_REGISTRY.json",
            "docs/variables/VARIABLE_MAP.md",
            "docs/workflows/WORKFLOW_REGISTRY.json",
            "docs/workflows/WORKFLOW_MAP.md",
            "docs/artifacts/ARTIFACT_REGISTRY.json",
            "docs/artifacts/ARTIFACT_MAP.md",
        ],
        "validation": [
            "npm run governance:cli:check",
            "npm run governance:variables:check",
            "npm run governance:workflows:check",
            "npm run governance:artifacts:check",
            "npm run governance:test",
        ],
        "sensitivity": "internal",
        "allowed_to_read": ["tracked governance scripts", "generated registry files", "package/build metadata"],
        "allowed_to_index": True,
        "allowed_to_log": True,
        "gitignore_required": False,
        "history_scan_required": False,
        "rotation_required": False,
        "owner": "repo governance",
        "escalation": "Stop and inspect generated diffs if any check reports stale output.",
        "rollback": "Re-run the generators from a clean tree or restore the generated registry files before commit.",
        "operator_checkpoint": False,
        "source_evidence": ["docs/CANTIERE.md", "package.json"],
    },
    {
        "id": "pre-commit-continuity-guard",
        "name": "Pre-commit continuity guard",
        "intent": "Run the local commit guard that refreshes registry.json, formats staged files, and blocks continuity or docs drift.",
        "steps": [
            "Generate the shadcn registry and stage registry.json.",
            "Run lint-staged on staged files.",
            "Run continuity and documentation drift checks.",
            "Run governance registry checks and require generated governance outputs to be staged.",
            "Run learning integrity only when learning rules are staged.",
        ],
        "commands": [
            "npm run registry:gen",
            "git add registry.json",
            "npm exec lint-staged",
            "npm run continuity:check",
            "npm run docs:drift",
            "npm run governance:precommit",
            "node scripts/check-learning-integrity.mjs",
        ],
        "inputs": [".husky/pre-commit", "package.json"],
        "outputs": ["registry.json", "git index"],
        "validation": ["npm run continuity:check", "npm run docs:drift", "npm run governance:precommit"],
        "sensitivity": "internal",
        "allowed_to_read": ["staged tracked files", "docs/**", "AGENTS.md", "CLAUDE.md", ".claude/rules/*.md"],
        "allowed_to_index": True,
        "allowed_to_log": True,
        "gitignore_required": False,
        "history_scan_required": False,
        "rotation_required": False,
        "owner": "git hook",
        "escalation": "Fix the failing companion docs, generated registry, or learning rule before committing.",
        "rollback": "Unstage hook-generated files if the commit is intentionally aborted.",
        "operator_checkpoint": False,
        "source_evidence": [".husky/pre-commit"],
    },
    {
        "id": "documentation-lint-triage",
        "name": "Documentation lint triage",
        "intent": "Classify markdownlint findings into problem, review, and noise without turning existing style debt into a hard gate.",
        "steps": [
            "Run markdownlint across governance and documentation Markdown.",
            "Classify each finding by deterministic rule severity.",
            "Write a readable triage report.",
            "Check that the committed triage report matches the current docs.",
        ],
        "commands": [
            "npm run docs:markdownlint:triage:write",
            "npm run docs:markdownlint:triage:check",
            "npm run docs:drift",
        ],
        "inputs": ["package.json", ".markdownlint.json"],
        "outputs": ["docs/doc-quality/MARKDOWNLINT_TRIAGE.md"],
        "validation": ["npm run docs:markdownlint:triage:check", "npm run docs:drift"],
        "sensitivity": "internal",
        "allowed_to_read": ["tracked Markdown docs", "agent governance docs"],
        "allowed_to_index": True,
        "allowed_to_log": True,
        "gitignore_required": False,
        "history_scan_required": False,
        "rotation_required": False,
        "owner": "repo governance",
        "escalation": "Fix problem-severity findings before promoting markdownlint to a hard gate.",
        "rollback": "Regenerate the report or revert the docs that changed the triage counts.",
        "operator_checkpoint": False,
        "source_evidence": ["scripts/markdownlint_triage.py", "docs/doc-quality/MARKDOWNLINT_TRIAGE.md"],
    },
    {
        "id": "local-development-stack",
        "name": "Local development stack",
        "intent": "Start the local Supabase stack and Vite app with deterministic local admin bootstrap.",
        "steps": [
            "Install dependencies when needed.",
            "Start local Supabase and bootstrap the local admin.",
            "Start the Vite dev server.",
            "Stop Supabase when the session is complete.",
        ],
        "commands": ["make install", "make start", "make stop"],
        "inputs": [
            "LOCAL_SUPABASE_ADMIN_EMAIL",
            "LOCAL_SUPABASE_ADMIN_PASSWORD",
            "VITE_SUPABASE_URL",
            "VITE_SB_PUBLISHABLE_KEY",
        ],
        "outputs": ["node_modules/**", "local Supabase database", "Vite dev server"],
        "validation": ["npm run typecheck", "npm run lint"],
        "sensitivity": "internal",
        "allowed_to_read": ["tracked source", "local env defaults"],
        "allowed_to_index": True,
        "allowed_to_log": True,
        "gitignore_required": True,
        "history_scan_required": False,
        "rotation_required": False,
        "owner": "local operator",
        "escalation": "If Supabase fails to start, inspect local Supabase status and port conflicts before changing code.",
        "rollback": "Run make stop and remove only rebuildable local artifacts after operator approval.",
        "operator_checkpoint": False,
        "source_evidence": ["Makefile", "scripts/bootstrap-local-admin.mjs"],
    },
    {
        "id": "frontend-quality-gate",
        "name": "Frontend quality gate",
        "intent": "Run local deterministic quality checks for frontend and governance-safe changes.",
        "steps": [
            "Typecheck the project.",
            "Run ESLint.",
            "Run Prettier in check mode.",
            "Run unit tests.",
            "Run docs and continuity guards.",
        ],
        "commands": ["npm run typecheck", "npm run lint", "npm run prettier", "npm run test"],
        "inputs": ["NODE_ENV", "package.json"],
        "outputs": [],
        "validation": ["npm run continuity:check", "npm run docs:drift"],
        "sensitivity": "internal",
        "allowed_to_read": ["tracked source", "tracked docs"],
        "allowed_to_index": True,
        "allowed_to_log": True,
        "gitignore_required": False,
        "history_scan_required": False,
        "rotation_required": False,
        "owner": "developer",
        "escalation": "Fix the first failing deterministic check before broadening scope.",
        "rollback": "No rollback for read-only checks; revert only the change that introduced the failure.",
        "operator_checkpoint": False,
        "source_evidence": ["package.json", ".github/workflows/check.yml"],
    },
    {
        "id": "local-domain-database-reset",
        "name": "Local domain database reset",
        "intent": "Reset the local Supabase schema, load the production-domain seed, and bootstrap the local admin.",
        "steps": [
            "Confirm no unsaved local database work is needed.",
            "Reset the local Supabase database.",
            "Load supabase/seed_domain_data.sql.",
            "Bootstrap the local admin user.",
            "Run focused local checks before continuing feature work.",
        ],
        "commands": ["make supabase-reset-database"],
        "inputs": ["LOCAL_SUPABASE_ADMIN_EMAIL", "LOCAL_SUPABASE_ADMIN_PASSWORD"],
        "outputs": ["local Supabase database"],
        "validation": ["npm run test:e2e"],
        "sensitivity": "internal",
        "allowed_to_read": ["supabase/seed_domain_data.sql", "tracked migrations"],
        "allowed_to_index": False,
        "allowed_to_log": True,
        "gitignore_required": True,
        "history_scan_required": False,
        "rotation_required": False,
        "owner": "local operator",
        "escalation": "Do not run if local DB state contains unexported work; capture or discard it explicitly first.",
        "rollback": "Local reset is destructive; restore only from versioned seed or a known backup.",
        "operator_checkpoint": True,
        "source_evidence": ["Makefile", "supabase/seed_domain_data.sql"],
    },
    {
        "id": "local-e2e-smoke",
        "name": "Local E2E smoke",
        "intent": "Run Playwright smoke tests against the deterministic local Supabase stack.",
        "steps": [
            "Start the local stack.",
            "Run Playwright smoke tests.",
            "Stop local Supabase after the run.",
        ],
        "commands": ["make start", "npm run test:e2e", "make stop"],
        "inputs": [
            "LOCAL_SUPABASE_ADMIN_EMAIL",
            "LOCAL_SUPABASE_ADMIN_PASSWORD",
            "VITE_SUPABASE_URL",
            "VITE_SB_PUBLISHABLE_KEY",
        ],
        "outputs": ["test-results/**", "playwright-report/**"],
        "validation": ["npm run test:e2e"],
        "sensitivity": "internal",
        "allowed_to_read": ["tracked source", "local deterministic test data"],
        "allowed_to_index": True,
        "allowed_to_log": True,
        "gitignore_required": True,
        "history_scan_required": False,
        "rotation_required": False,
        "owner": "developer",
        "escalation": "Treat financial or auth smoke failures as system failures until source evidence proves otherwise.",
        "rollback": "Run make stop; remove only rebuildable Playwright outputs.",
        "operator_checkpoint": False,
        "source_evidence": ["Makefile", "playwright.config.ts", "tests/e2e/support/auth.ts"],
    },
    {
        "id": "production-financial-health",
        "name": "Production financial health",
        "intent": "Run read-only production financial and fiscal smoke checks with explicit env inputs.",
        "steps": [
            "Run the production financial invariant check.",
            "Run fiscal reminder parity smoke.",
            "Run cash-vs-competence smoke.",
            "Inspect exact failures before modifying financial code or data.",
        ],
        "commands": [
            "npm run health:financial",
            "npm run smoke:ef-reminder-parity",
            "npm run smoke:cash-vs-competence",
        ],
        "inputs": ["HEALTH_ENV_FILE", "SUPABASE_PROJECT_REF", "TODAY_ISO", "TS"],
        "outputs": ["console report only"],
        "validation": [
            "npm run health:financial",
            "npm run smoke:ef-reminder-parity",
            "npm run smoke:cash-vs-competence",
        ],
        "sensitivity": "secret",
        "allowed_to_read": ["tracked smoke scripts", "operator-provided env file"],
        "allowed_to_index": False,
        "allowed_to_log": False,
        "gitignore_required": True,
        "history_scan_required": True,
        "rotation_required": False,
        "owner": "financial operator",
        "escalation": "Stop on any mismatch and gather DB/query evidence before changing money or fiscal logic.",
        "rollback": "Read-only workflow; no rollback expected.",
        "operator_checkpoint": True,
        "source_evidence": [
            "scripts/check-prod-financial-health.mjs",
            "scripts/prod-smoke-ef-reminder-parity.ts",
            "scripts/prod-smoke-cash-vs-competence.ts",
        ],
    },
    {
        "id": "remote-supabase-deploy",
        "name": "Remote Supabase deploy",
        "intent": "Push remote Supabase migrations and deploy Edge Functions separately from Vercel frontend auto-deploy.",
        "steps": [
            "Confirm a reviewed migration/function diff exists.",
            "Push remote database migrations.",
            "Deploy Edge Functions.",
            "Run relevant remote smoke checks.",
        ],
        "commands": ["make remote-deploy-supabase"],
        "inputs": [
            "SUPABASE_ACCESS_TOKEN",
            "SUPABASE_DB_PASSWORD",
            "SUPABASE_PROJECT_ID",
            "SUPABASE_URL",
            "SB_PUBLISHABLE_KEY",
        ],
        "outputs": ["remote Supabase database", "remote Supabase Edge Functions"],
        "validation": ["npm run health:financial"],
        "sensitivity": "secret",
        "allowed_to_read": ["tracked migrations", "tracked Edge Functions", "Supabase secrets by operator action"],
        "allowed_to_index": False,
        "allowed_to_log": False,
        "gitignore_required": True,
        "history_scan_required": True,
        "rotation_required": True,
        "owner": "release operator",
        "escalation": "If db push or function deploy fails, stop and inspect Supabase CLI output before retrying.",
        "rollback": "Use migration-specific rollback/expand-contract plan; do not reset remote data.",
        "operator_checkpoint": True,
        "source_evidence": ["Makefile", ".github/workflows/deploy.yml", "AGENTS.md"],
    },
    {
        "id": "docs-registry-publish",
        "name": "Docs and shadcn registry publish",
        "intent": "Build and optionally publish generated docs and shadcn registry artifacts.",
        "steps": [
            "Install doc dependencies.",
            "Build the shadcn registry.",
            "Build docs.",
            "Publish only from the manual deploy workflow or explicit operator action.",
        ],
        "commands": ["make doc-install", "make registry-build", "make doc-build", "make registry-deploy", "make doc-deploy"],
        "inputs": ["GITHUB_TOKEN", "GITHUB_REPOSITORY"],
        "outputs": ["public/r/**", "doc/dist/**", "remote gh-pages branch"],
        "validation": ["make registry-build", "make doc-build"],
        "sensitivity": "secret",
        "allowed_to_read": ["tracked docs", "tracked registry source"],
        "allowed_to_index": False,
        "allowed_to_log": False,
        "gitignore_required": True,
        "history_scan_required": True,
        "rotation_required": True,
        "owner": "docs operator",
        "escalation": "Do not publish if generated docs or registry artifacts drift from source.",
        "rollback": "Rebuild from source or revert gh-pages publish commit if necessary.",
        "operator_checkpoint": True,
        "source_evidence": ["Makefile", ".github/workflows/deploy.yml"],
    },
]


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def registry_command_set(repo: Path) -> set[str]:
    registry_path = repo / CLI_REGISTRY_PATH
    if not registry_path.exists():
        return set()
    return {item["command"] for item in read_json(registry_path).get("commands", [])}


def registry_variable_set(repo: Path) -> set[str]:
    registry_path = repo / VARIABLE_REGISTRY_PATH
    if not registry_path.exists():
        return set()
    return {item["name"] for item in read_json(registry_path).get("variables", [])}


def validate_workflow(workflow: dict[str, Any], commands: set[str], variables: set[str]) -> list[str]:
    failures: list[str] = []
    for command in workflow["commands"] + workflow["validation"]:
        if command not in commands:
            failures.append(f"{workflow['id']}: missing CLI command `{command}`")
    for input_name in workflow["inputs"]:
        if input_name not in variables:
            failures.append(f"{workflow['id']}: missing variable/input `{input_name}`")
    if workflow["sensitivity"] == "secret":
        if workflow["allowed_to_index"]:
            failures.append(f"{workflow['id']}: secret workflow cannot be indexable")
        if workflow["allowed_to_log"]:
            failures.append(f"{workflow['id']}: secret workflow cannot allow logging")
        if not workflow["operator_checkpoint"]:
            failures.append(f"{workflow['id']}: secret workflow requires an operator checkpoint")
    return failures


def validate_registry(data: dict[str, Any], commands: set[str], variables: set[str]) -> list[str]:
    failures: list[str] = []
    ids: set[str] = set()
    for workflow in data["workflows"]:
        if workflow["id"] in ids:
            failures.append(f"duplicate workflow id `{workflow['id']}`")
        ids.add(workflow["id"])
        failures.extend(validate_workflow(workflow, commands, variables))
    return failures


def build_registry(repo: Path) -> dict[str, Any]:
    workflows = sorted(WORKFLOW_DEFINITIONS, key=lambda item: item["id"])
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_by": "scripts/workflow_inventory.py",
        "last_verified": LAST_VERIFIED,
        "sources": [
            CLI_REGISTRY_PATH.as_posix(),
            VARIABLE_REGISTRY_PATH.as_posix(),
            "scripts/workflow_inventory.py",
        ],
        "workflows": workflows,
    }


def json_text(data: dict[str, Any]) -> str:
    return json.dumps(data, indent=2, sort_keys=False) + "\n"


def md_text(data: dict[str, Any]) -> str:
    lines = [
        "# Workflow Map",
        "",
        "<!-- GENERATED by scripts/workflow_inventory.py; do not edit by hand. -->",
        "",
        f"Schema version: `{data['schema_version']}`",
        f"Last verified: `{data['last_verified']}`",
        "",
        "Regenerate:",
        "",
        "```bash",
        "npm run governance:workflows:write",
        "npm run governance:workflows:check",
        "```",
        "",
        "Validation rule: every workflow command must exist in the CLI registry",
        "and every workflow input must exist in the variable registry.",
        "",
    ]
    for workflow in data["workflows"]:
        lines.extend(
            [
                f"## {workflow['name']}",
                "",
                f"- id: `{workflow['id']}`",
                f"- intent: {workflow['intent']}",
                f"- sensitivity: `{workflow['sensitivity']}`",
                f"- owner: `{workflow['owner']}`",
                f"- operator_checkpoint: `{str(workflow['operator_checkpoint']).lower()}`",
                f"- allowed_to_read: `{', '.join(workflow['allowed_to_read'])}`",
                f"- allowed_to_index: `{str(workflow['allowed_to_index']).lower()}`",
                f"- allowed_to_log: `{str(workflow['allowed_to_log']).lower()}`",
                f"- gitignore_required: `{str(workflow['gitignore_required']).lower()}`",
                f"- history_scan_required: `{str(workflow['history_scan_required']).lower()}`",
                f"- rotation_required: `{str(workflow['rotation_required']).lower()}`",
                f"- commands: `{', '.join(workflow['commands'])}`",
                f"- inputs: `{', '.join(workflow['inputs'])}`",
                f"- outputs: `{', '.join(workflow['outputs']) if workflow['outputs'] else 'none'}`",
                f"- validation: `{', '.join(workflow['validation'])}`",
                f"- escalation: {workflow['escalation']}",
                f"- rollback: {workflow['rollback']}",
                f"- source_evidence: `{', '.join(workflow['source_evidence'])}`",
                "",
                "Steps:",
                "",
            ],
        )
        for index, step in enumerate(workflow["steps"], 1):
            lines.append(f"{index}. {step}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def write_outputs(repo: Path, data: dict[str, Any]) -> None:
    registry = repo / REGISTRY_PATH
    workflow_map = repo / MAP_PATH
    registry.parent.mkdir(parents=True, exist_ok=True)
    workflow_map.parent.mkdir(parents=True, exist_ok=True)
    registry.write_text(json_text(data), encoding="utf-8")
    workflow_map.write_text(md_text(data), encoding="utf-8")


def check_outputs(repo: Path, data: dict[str, Any]) -> int:
    failures = validate_registry(data, registry_command_set(repo), registry_variable_set(repo))
    if failures:
        print("Workflow inventory validation failed.", file=sys.stderr)
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
        print("Workflow inventory is stale. Regenerate with: npm run governance:workflows:write", file=sys.stderr)
        for rel_path in stale:
            print(f"- {rel_path}", file=sys.stderr)
        return 1
    print(f"OK: workflow inventory is current ({len(data['workflows'])} workflows)")
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
        failures = validate_registry(data, registry_command_set(repo), registry_variable_set(repo))
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
