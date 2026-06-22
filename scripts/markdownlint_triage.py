#!/usr/bin/env python3
"""Generate a triage report for markdownlint findings."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path


LAST_VERIFIED = "2026-06-22"
REPORT_PATH = Path("docs/doc-quality/MARKDOWNLINT_TRIAGE.md")
DEFAULT_GLOBS = [
    "docs/**/*.md",
    "#docs/doc-quality/MARKDOWNLINT_TRIAGE.md",
    "AGENTS.md",
    "CLAUDE.md",
    ".claude/rules/*.md",
]
SEVERITY_ORDER = ["problem", "review", "noise", "unknown"]
FINDING_RE = re.compile(
    r"^(?P<path>.+?):(?P<line>\d+)(?::(?P<column>\d+))? error "
    r"(?P<rule>MD\d+)/(?P<name>\S+) (?P<message>.*)$",
)


RULES: dict[str, dict[str, str]] = {
    "MD001": {
        "severity": "review",
        "meaning": "heading levels skip; can make the outline less navigable",
    },
    "MD004": {
        "severity": "noise",
        "meaning": "unordered list marker style; stylistic under current repo conventions",
    },
    "MD009": {
        "severity": "noise",
        "meaning": "trailing spaces; cleanup-only unless inside meaningful Markdown",
    },
    "MD013": {
        "severity": "noise",
        "meaning": "line length; common in generated reports, tables, logs, and specs",
    },
    "MD018": {
        "severity": "problem",
        "meaning": "heading marker lacks following space; can break heading parsing",
    },
    "MD022": {
        "severity": "review",
        "meaning": "heading spacing; readability and parser hygiene",
    },
    "MD024": {
        "severity": "problem",
        "meaning": "duplicate headings; can create ambiguous anchors",
    },
    "MD026": {
        "severity": "noise",
        "meaning": "heading trailing punctuation; stylistic",
    },
    "MD028": {
        "severity": "noise",
        "meaning": "blank line inside blockquote; stylistic unless rendering is broken",
    },
    "MD029": {
        "severity": "review",
        "meaning": "ordered list numbering; readability and diff hygiene",
    },
    "MD031": {
        "severity": "review",
        "meaning": "fence spacing; can affect Markdown readability and extraction",
    },
    "MD032": {
        "severity": "review",
        "meaning": "list spacing; can affect parser/readability, usually not code drift",
    },
    "MD034": {
        "severity": "review",
        "meaning": "bare URL; should be an explicit link for link checking",
    },
    "MD036": {
        "severity": "noise",
        "meaning": "emphasis used as heading; stylistic in historical notes",
    },
    "MD038": {
        "severity": "noise",
        "meaning": "spaces inside code span; cosmetic unless token is ambiguous",
    },
    "MD040": {
        "severity": "problem",
        "meaning": "fenced code block lacks language; blocks executable-doc tooling",
    },
    "MD041": {
        "severity": "noise",
        "meaning": "first line is not H1; acceptable for imported or agent-context files",
    },
    "MD051": {
        "severity": "problem",
        "meaning": "link fragment should resolve; direct navigation risk",
    },
    "MD060": {
        "severity": "review",
        "meaning": "table pipe style; readability issue, usually not semantic drift",
    },
}


@dataclass(frozen=True)
class Finding:
    path: str
    line: int
    column: int | None
    rule: str
    name: str
    message: str

    @property
    def severity(self) -> str:
        return RULES.get(self.rule, {}).get("severity", "unknown")


def run_markdownlint(repo: Path, globs: list[str]) -> str:
    executable = shutil.which("markdownlint-cli2")
    if executable is None:
        raise RuntimeError("markdownlint-cli2 is not installed")
    result = subprocess.run(
        [executable, *globs],
        cwd=repo,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    return result.stdout


def parse_findings(text: str) -> list[Finding]:
    findings: list[Finding] = []
    for line in text.splitlines():
        match = FINDING_RE.match(line)
        if not match:
            continue
        column = match.group("column")
        findings.append(
            Finding(
                path=match.group("path"),
                line=int(match.group("line")),
                column=int(column) if column else None,
                rule=match.group("rule"),
                name=match.group("name"),
                message=match.group("message"),
            ),
        )
    return findings


def severity_counts(findings: list[Finding]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for finding in findings:
        counts[finding.severity] += 1
    return counts


def rule_counts(findings: list[Finding]) -> Counter[str]:
    return Counter(finding.rule for finding in findings)


def file_counts_by_severity(findings: list[Finding], severity: str) -> Counter[str]:
    return Counter(finding.path for finding in findings if finding.severity == severity)


def dominant_rules(findings: list[Finding], path: str, severity: str) -> str:
    counts = Counter(
        finding.rule for finding in findings if finding.path == path and finding.severity == severity
    )
    return ", ".join(f"{rule}={count}" for rule, count in counts.most_common(4))


def table_row(values: list[str | int]) -> str:
    return "| " + " | ".join(str(value) for value in values) + " |"


def top_files_section(findings: list[Finding], severity: str, limit: int = 12) -> list[str]:
    counts = file_counts_by_severity(findings, severity)
    lines = [
        f"## Top {severity.title()} Files",
        "",
        table_row(["Findings", "File", "Dominant rules"]),
        table_row(["---:", "---", "---"]),
    ]
    for path, count in counts.most_common(limit):
        lines.append(table_row([count, f"`{path}`", dominant_rules(findings, path, severity)]))
    if not counts:
        lines.append(table_row([0, "`none`", "none"]))
    lines.append("")
    return lines


def examples_section(findings: list[Finding], severity: str, limit: int = 16) -> list[str]:
    selected = [finding for finding in findings if finding.severity == severity][:limit]
    lines = [
        f"## {severity.title()} Examples",
        "",
        table_row(["File", "Line", "Rule", "Message"]),
        table_row(["---", "---:", "---", "---"]),
    ]
    for finding in selected:
        lines.append(
            table_row(
                [
                    f"`{finding.path}`",
                    finding.line,
                    finding.rule,
                    finding.message.replace("|", "\\|"),
                ],
            ),
        )
    if not selected:
        lines.append(table_row(["`none`", 0, "none", "none"]))
    lines.append("")
    return lines


def md_text(findings: list[Finding], globs: list[str]) -> str:
    severities = severity_counts(findings)
    rules = rule_counts(findings)
    total = len(findings)
    files = len({finding.path for finding in findings})
    lines = [
        "# Markdownlint Triage",
        "",
        "<!-- GENERATED by scripts/markdownlint_triage.py; do not edit by hand. -->",
        "",
        f"Last verified: `{LAST_VERIFIED}`",
        "",
        "Scope:",
        "",
        "```bash",
        "markdownlint-cli2 " + " ".join(f"'{glob}'" for glob in globs),
        "```",
        "",
        "Purpose: classify markdownlint findings so the repo can distinguish",
        "actionable documentation problems from formatting noise.",
        "",
        "Severity contract:",
        "",
        "- `problem`: likely to affect anchors, executable-doc tooling, or direct",
        "  navigation; fix before promoting markdownlint to a hard gate",
        "- `review`: readability or parser-hygiene debt; batch with doc cleanup",
        "- `noise`: style-only under current repo conventions; do not churn historical",
        "  docs only to satisfy this",
        "- `unknown`: new markdownlint rule not classified yet; review and classify",
        "",
        "## Summary",
        "",
        table_row(["Metric", "Value"]),
        table_row(["---", "---:"]),
        table_row(["total findings", total]),
        table_row(["files with findings", files]),
    ]
    for severity in SEVERITY_ORDER:
        lines.append(table_row([severity, severities.get(severity, 0)]))
    lines.extend(
        [
            "",
            "## Rule Summary",
            "",
            table_row(["Rule", "Severity", "Findings", "Meaning"]),
            table_row(["---", "---", "---:", "---"]),
        ],
    )
    for rule, count in rules.most_common():
        meta = RULES.get(rule, {})
        lines.append(
            table_row(
                [
                    rule,
                    meta.get("severity", "unknown"),
                    count,
                    meta.get("meaning", "unclassified markdownlint rule").replace("|", "\\|"),
                ],
            ),
        )
    lines.append("")
    for severity in SEVERITY_ORDER:
        lines.extend(top_files_section(findings, severity))
    lines.extend(examples_section(findings, "problem"))
    lines.extend(examples_section(findings, "review"))
    lines.extend(
        [
            "## Operational Reading",
            "",
            "- Do not treat the total count as product risk.",
            "- Start from `problem`, then decide whether `review` deserves a cleanup",
            "  milestone.",
            "- Keep `noise` out of normal feature work unless a touched file is already",
            "  being rewritten.",
            "- Structural doc/code assertions remain owned by `npm run docs:drift` and",
            "  `npm run governance:precommit`.",
            "",
        ],
    )
    return "\n".join(lines)


def build_report(repo: Path, globs: list[str]) -> str:
    output = run_markdownlint(repo, globs)
    findings = parse_findings(output)
    return md_text(findings, globs)


def write_report(repo: Path, content: str) -> None:
    path = repo / REPORT_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def check_report(repo: Path, content: str) -> int:
    path = repo / REPORT_PATH
    if not path.exists() or path.read_text(encoding="utf-8") != content:
        print(
            "Markdownlint triage report is stale. Regenerate with: npm run docs:markdownlint:triage:write",
            file=sys.stderr,
        )
        print(f"- {REPORT_PATH}", file=sys.stderr)
        return 1
    print(f"OK: markdownlint triage report is current ({REPORT_PATH})")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".", help="repository root")
    parser.add_argument("--glob", action="append", dest="globs", help="markdownlint glob; repeatable")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="write the generated triage report")
    mode.add_argument("--check", action="store_true", help="check the generated triage report")
    args = parser.parse_args(argv)

    repo = Path(args.repo).resolve()
    globs = args.globs or DEFAULT_GLOBS
    try:
        content = build_report(repo, globs)
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 2
    if args.write:
        write_report(repo, content)
        print(f"Wrote {REPORT_PATH}")
        return 0
    return check_report(repo, content)


if __name__ == "__main__":
    raise SystemExit(main())
