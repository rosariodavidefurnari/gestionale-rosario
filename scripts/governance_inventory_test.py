#!/usr/bin/env python3
"""Unit checks for repo governance inventory generators."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from io import StringIO
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parent))

import variable_inventory  # noqa: E402
import workflow_inventory  # noqa: E402
import artifact_inventory  # noqa: E402
import governance_pre_commit  # noqa: E402


class VariableInventoryTest(unittest.TestCase):
    def build_repo(self) -> tuple[tempfile.TemporaryDirectory[str], Path]:
        temp_dir = tempfile.TemporaryDirectory()
        repo = Path(temp_dir.name)
        (repo / "src").mkdir()
        (repo / "scripts").mkdir()
        (repo / "supabase/functions").mkdir(parents=True)
        return temp_dir, repo

    def write_package(self, repo: Path, scripts: dict[str, str]) -> None:
        (repo / "package.json").write_text(
            json.dumps({"scripts": scripts}),
            encoding="utf-8",
        )

    def variable_names(self, repo: Path) -> set[str]:
        data = variable_inventory.build_registry(repo)
        return {item["name"] for item in data["variables"]}

    def test_excludes_real_env_files_but_reads_env_example(self) -> None:
        temp_dir, repo = self.build_repo()
        with temp_dir:
            self.write_package(repo, {})
            (repo / ".env.local").write_text(
                "SHOULD_NOT_APPEAR=secret\n",
                encoding="utf-8",
            )
            (repo / "supabase/functions/.env.example").write_text(
                "OPENAI_API_KEY=\nSMTP_PORT=587\n",
                encoding="utf-8",
            )
            (repo / "src/app.ts").write_text(
                "const url = import.meta.env.VITE_SUPABASE_URL;\n",
                encoding="utf-8",
            )

            names = self.variable_names(repo)

        self.assertIn("OPENAI_API_KEY", names)
        self.assertIn("SMTP_PORT", names)
        self.assertIn("VITE_SUPABASE_URL", names)
        self.assertNotIn("SHOULD_NOT_APPEAR", names)

    def test_detects_split_import_meta_env_access(self) -> None:
        temp_dir, repo = self.build_repo()
        with temp_dir:
            self.write_package(repo, {})
            (repo / "src/CRM.tsx").write_text(
                "const disabled = import.meta.env\n"
                "  .VITE_DISABLE_EMAIL_PASSWORD_AUTHENTICATION === 'true';\n",
                encoding="utf-8",
            )

            names = self.variable_names(repo)

        self.assertIn("VITE_DISABLE_EMAIL_PASSWORD_AUTHENTICATION", names)

    def test_extracts_cli_flags_from_package_scripts(self) -> None:
        temp_dir, repo = self.build_repo()
        with temp_dir:
            self.write_package(
                repo,
                {
                    "docs:drift": "python3 scripts/doc.py --repo . --docs 'docs/**/*.md'",
                },
            )

            names = self.variable_names(repo)

        self.assertIn("--repo", names)
        self.assertIn("--docs", names)

    def test_detects_braced_shell_env_in_workflows(self) -> None:
        temp_dir, repo = self.build_repo()
        with temp_dir:
            self.write_package(repo, {})
            workflow_dir = repo / ".github/workflows"
            workflow_dir.mkdir(parents=True)
            (workflow_dir / "deploy.yml").write_text(
                "jobs:\n"
                "  deploy:\n"
                "    steps:\n"
                "      - run: echo ${GITHUB_REPOSITORY}\n",
                encoding="utf-8",
            )

            names = self.variable_names(repo)

        self.assertIn("GITHUB_REPOSITORY", names)


class WorkflowInventoryTest(unittest.TestCase):
    def workflow(self, *, commands: list[str], inputs: list[str]) -> dict[str, object]:
        return {
            "id": "test-workflow",
            "commands": commands,
            "validation": [],
            "inputs": inputs,
            "sensitivity": "internal",
            "allowed_to_index": True,
            "allowed_to_log": True,
            "operator_checkpoint": False,
        }

    def test_rejects_missing_cli_command_reference(self) -> None:
        failures = workflow_inventory.validate_workflow(
            self.workflow(commands=["npm run missing"], inputs=[]),
            commands={"npm run test"},
            variables=set(),
        )

        self.assertEqual(
            failures,
            ["test-workflow: missing CLI command `npm run missing`"],
        )

    def test_rejects_missing_variable_reference(self) -> None:
        failures = workflow_inventory.validate_workflow(
            self.workflow(commands=["npm run test"], inputs=["MISSING_ENV"]),
            commands={"npm run test"},
            variables={"NODE_ENV"},
        )

        self.assertEqual(
            failures,
            ["test-workflow: missing variable/input `MISSING_ENV`"],
        )


class ArtifactInventoryTest(unittest.TestCase):
    def artifact(
        self,
        *,
        producers: list[str] | None = None,
        consumers: list[str] | None = None,
        source_variables: list[str] | None = None,
        validation: list[str] | None = None,
        kind: str = "derived",
        delete_policy: str = "safe_rebuild",
        allowed_to_read: bool = True,
        allowed_to_index: bool = False,
        allowed_to_log: bool = True,
    ) -> dict[str, object]:
        return {
            "id": "test-artifact",
            "path_patterns": ["generated/**"],
            "kind": kind,
            "producers": producers or [],
            "consumers": consumers or [],
            "source_variables": source_variables or [],
            "delete_policy": delete_policy,
            "risk": "Test artifact.",
            "validation": validation or [],
            "allowed_to_read": allowed_to_read,
            "allowed_to_index": allowed_to_index,
            "allowed_to_log": allowed_to_log,
        }

    def test_rejects_missing_cli_producer_or_validation(self) -> None:
        failures = artifact_inventory.validate_artifact(
            self.artifact(
                producers=["npm run missing:write"],
                validation=["npm run missing:check"],
            ),
            commands={"npm run test"},
            variables=set(),
            workflows=set(),
        )

        self.assertEqual(
            failures,
            [
                "test-artifact: missing CLI producer/validation `npm run missing:write`",
                "test-artifact: missing CLI producer/validation `npm run missing:check`",
            ],
        )

    def test_rejects_missing_workflow_consumer(self) -> None:
        failures = artifact_inventory.validate_artifact(
            self.artifact(consumers=["missing-workflow"]),
            commands=set(),
            variables=set(),
            workflows={"known-workflow"},
        )

        self.assertEqual(
            failures,
            ["test-artifact: missing workflow consumer `missing-workflow`"],
        )

    def test_rejects_missing_source_variable(self) -> None:
        failures = artifact_inventory.validate_artifact(
            self.artifact(source_variables=["MISSING_ENV"]),
            commands=set(),
            variables={"KNOWN_ENV"},
            workflows=set(),
        )

        self.assertEqual(
            failures,
            ["test-artifact: missing source variable `MISSING_ENV`"],
        )

    def test_secret_artifacts_are_never_read_indexed_or_logged(self) -> None:
        failures = artifact_inventory.validate_artifact(
            self.artifact(
                kind="secret",
                delete_policy="operator_review",
                allowed_to_read=True,
                allowed_to_index=True,
                allowed_to_log=True,
            ),
            commands=set(),
            variables=set(),
            workflows=set(),
        )

        self.assertEqual(
            failures,
            [
                "test-artifact: secret artifacts must use never_commit",
                "test-artifact: secret artifacts require allowed_to_read=false",
                "test-artifact: secret artifacts require allowed_to_index=false",
                "test-artifact: secret artifacts require allowed_to_log=false",
            ],
        )


class GovernancePreCommitTest(unittest.TestCase):
    def test_merge_path_lists_deduplicates_and_sorts(self) -> None:
        paths = governance_pre_commit.merge_path_lists(
            ["docs/workflows/WORKFLOW_MAP.md", "docs/cli/COMMAND_MAP.md"],
            ["docs/cli/COMMAND_MAP.md", "docs/artifacts/ARTIFACT_MAP.md"],
        )

        self.assertEqual(
            paths,
            [
                "docs/artifacts/ARTIFACT_MAP.md",
                "docs/cli/COMMAND_MAP.md",
                "docs/workflows/WORKFLOW_MAP.md",
            ],
        )

    def test_precommit_fails_when_generated_outputs_are_not_staged(self) -> None:
        stderr = StringIO()
        with (
            patch.object(
                governance_pre_commit,
                "unstaged_generated_outputs",
                return_value=["docs/artifacts/ARTIFACT_MAP.md"],
            ),
            patch("sys.stderr", stderr),
        ):
            code = governance_pre_commit.check_staged_generated_outputs(Path("."))

        self.assertEqual(code, 1)
        self.assertIn("docs/artifacts/ARTIFACT_MAP.md", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
