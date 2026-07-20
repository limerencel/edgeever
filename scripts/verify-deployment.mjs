import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export const REQUIRED_TABLES = [
  "users",
  "sessions",
  "workspaces",
  "workspace_members",
  "notebooks",
  "memos",
  "mobile_sync_changes",
];

export const buildSchemaVerificationSql = () =>
  `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${REQUIRED_TABLES.map((name) => `'${name}'`).join(", ")}) ORDER BY name`;

export const parseD1Rows = (output) => {
  const parsed = JSON.parse(output);
  const results = Array.isArray(parsed) ? parsed : [parsed];
  return results.flatMap((result) => result?.results ?? []);
};

export const parseSecretNames = (output) => {
  const parsed = JSON.parse(output);
  const secrets = Array.isArray(parsed) ? parsed : parsed?.secrets ?? parsed?.result ?? [];
  return new Set(secrets.map((secret) => secret?.name).filter(Boolean));
};

const runWrangler = (args) => {
  const result = spawnSync(
    process.execPath,
    [resolve("scripts/run-wrangler.mjs"), ...args],
    { encoding: "utf8", env: process.env },
  );

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`Wrangler verification command exited with status ${result.status ?? 1}.`);
  }

  return result.stdout;
};

const main = () => {
  const schemaOutput = runWrangler([
    "d1",
    "execute",
    "DB",
    "--remote",
    "--command",
    buildSchemaVerificationSql(),
    "--json",
  ]);
  const tableNames = new Set(parseD1Rows(schemaOutput).map((row) => row.name));
  const missingTables = REQUIRED_TABLES.filter((table) => !tableNames.has(table));
  if (missingTables.length > 0) {
    throw new Error(
      `Remote D1 migrations are incomplete; missing tables: ${missingTables.join(", ")}. Run bun run db:migrate:remote and retry deployment.`,
    );
  }
  console.log(`[ok] remote D1 schema: ${REQUIRED_TABLES.length} required tables`);

  const secretNames = parseSecretNames(runWrangler(["secret", "list", "--format", "json"]));
  if (!secretNames.has("EDGE_EVER_AUTH_PASSWORD") && !secretNames.has("EDGE_EVER_AUTH_PASSWORD_HASH")) {
    throw new Error("The deployed Worker has no EdgeEver authentication Secret.");
  }
  console.log("[ok] Worker authentication Secret is deployed");
};

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(`[fail] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
