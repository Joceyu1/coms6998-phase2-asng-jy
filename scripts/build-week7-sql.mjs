import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const files = [
  "supabase/migrations/202610280001_week7.sql",
  "supabase/migrations/202610280002_admin_images.sql",
];

function transactionBody(file) {
  const lines = readFileSync(resolve(root, file), "utf8").trimEnd().split("\n");
  const begin = lines.findIndex((line) => /^begin;$/i.test(line.trim()));
  const commit = lines.findLastIndex((line) => /^commit;$/i.test(line.trim()));
  if (begin < 0 || commit !== lines.length - 1 || commit <= begin) {
    throw new Error(`Expected one outer transaction in ${file}`);
  }
  // Only remove the two outer transaction statements. PL/pgSQL BEGIN/END,
  // guards, settings, grants, and schema notifications remain untouched.
  return lines.filter((_, index) => index !== begin && index !== commit).join("\n");
}

const header = `-- WEEK 7 SETUP: copy and run this COMPLETE file as the trusted database owner.
-- Target only the original project qrgjqpdvvbwmjpthpmlo.
-- Requires the existing SIDE B schema and reviewed Week 6 admin migration.
-- Review before execution. Never paste credentials into this file.
-- No historical requests/responses or provider attribution are invented.
-- Both stages share ONE transaction: a guard failure rolls back both stages.
-- Generated from the two migrations by: node scripts/build-week7-sql.mjs
`;
const content = `${header}\nbegin;\n\n${files.map((file) => `-- Source: ${file}\n${transactionBody(file)}`).join("\n\n")}\n\ncommit;\n`;
const target = resolve(root, "supabase/week7-setup.sql");

if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== content) {
    console.error("Week 7 setup SQL is stale. Run node scripts/build-week7-sql.mjs.");
    process.exitCode = 1;
  } else {
    console.log("Week 7 setup SQL matches both reviewed migrations.");
  }
} else {
  writeFileSync(target, content);
  console.log("Generated supabase/week7-setup.sql as one atomic transaction.");
}
