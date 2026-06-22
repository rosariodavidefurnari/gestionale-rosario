#!/usr/bin/env python3
"""Unit checks for repo governance inventory generators."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parent))

import variable_inventory  # noqa: E402
import workflow_inventory  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()
