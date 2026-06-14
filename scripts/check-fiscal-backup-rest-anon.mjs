#!/usr/bin/env node

import process from "node:process";

import { parseDotEnvFile } from "./local-admin-config.mjs";

const EXPECTED_PROJECT_REF = "qvdmzhyzpyaveniirsmo";
const TARGET_TABLES = [
  "fiscal_declarations_backup_20260414",
  "fiscal_obligations_backup_20260414",
  "fiscal_f24_submissions_backup_20260414",
  "fiscal_f24_payment_lines_backup_20260414",
];

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function loadEnv() {
  const envPath = getArgValue("--env") ?? ".env.production";
  return {
    ...parseDotEnvFile(envPath),
    ...process.env,
  };
}

function getRequiredConfig() {
  const env = loadEnv();
  const supabaseUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const publishableKey =
    env.SUPABASE_ANON_KEY ??
    env.VITE_SUPABASE_ANON_KEY ??
    env.SUPABASE_PUBLISHABLE_KEY ??
    env.VITE_SB_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Missing Supabase URL or publishable/anon key. Expected VITE_SUPABASE_URL and VITE_SB_PUBLISHABLE_KEY.",
    );
  }

  if (
    !hasFlag("--allow-any-url") &&
    !supabaseUrl.includes(EXPECTED_PROJECT_REF)
  ) {
    throw new Error(
      `Refusing REST exposure check for unexpected Supabase URL: ${supabaseUrl}`,
    );
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    publishableKey,
  };
}

async function checkTable({ supabaseUrl, publishableKey }, tableName) {
  const url = new URL(`${supabaseUrl}/rest/v1/${tableName}`);
  url.searchParams.set("select", "*");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    method: "HEAD",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      Prefer: "count=exact",
      Range: "0-0",
      "Range-Unit": "items",
    },
  });

  return {
    tableName,
    status: response.status,
    contentRange: response.headers.get("content-range"),
    exposed: response.ok,
  };
}

async function main() {
  const config = getRequiredConfig();
  const results = [];

  for (const tableName of TARGET_TABLES) {
    results.push(await checkTable(config, tableName));
  }

  const exposed = results.filter((result) => result.exposed);

  for (const result of results) {
    console.log(
      `${result.tableName}: status=${result.status} content-range=${result.contentRange ?? "none"}`,
    );
  }

  if (exposed.length > 0) {
    throw new Error(
      `Fiscal backup REST anon check failed: ${exposed.length} table(s) still return 2xx responses`,
    );
  }

  console.log("Fiscal backup REST anon check passed");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
