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


if __name__ == "__main__":
    unittest.main()
