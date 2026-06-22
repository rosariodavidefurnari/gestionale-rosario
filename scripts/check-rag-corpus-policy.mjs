import fs from "node:fs";

const policyPath = ".contextignore";

const requiredPatterns = [
  "docs/**",
  "doc/**",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "Gestionale_Rosario_Furnari_Specifica.md",
  ".claude/**",
  ".codex/**",
  ".agents/**",
  ".planning/**",
  "Fatture/**",
  "Chiavi Google Calendar/**",
];

if (!fs.existsSync(policyPath)) {
  console.error(
    `Missing ${policyPath}; code-RAG corpus exclusions are not versioned.`,
  );
  process.exit(1);
}

const policyLines = fs
  .readFileSync(policyPath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const missingPatterns = requiredPatterns.filter(
  (pattern) => !policyLines.includes(pattern),
);

if (missingPatterns.length > 0) {
  console.error("Code-RAG corpus policy is missing required exclusions:");
  for (const pattern of missingPatterns) {
    console.error(`- ${pattern}`);
  }
  process.exit(1);
}

console.log(
  "OK: code-RAG corpus policy contains required prose/governance exclusions",
);
