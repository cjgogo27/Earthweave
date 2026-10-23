import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import "./sites-env.mjs";

const config = JSON.parse(readFileSync("wrangler.json", "utf8"));
const database = config.d1_databases?.find((binding) => binding.binding === "DB");
if (!database || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(database.database_id)
  || database.database_id === "00000000-0000-4000-8000-000000000000") {
  throw new Error("Create your Cloudflare D1 database and set its database_id in wrangler.json before deploying. See docs/deployment.md.");
}

function run(script, args) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url)), ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("./run-framework.mjs", ["build"]);
run("../node_modules/wrangler/bin/wrangler.js", ["d1", "migrations", "apply", "DB", "--remote", "--config", "wrangler.json"]);
run("../node_modules/wrangler/bin/wrangler.js", ["deploy", "--config", "dist/server/wrangler.json"]);
