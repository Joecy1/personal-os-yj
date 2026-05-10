import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const IMPORT_ORDER = [
  "knowledge_frameworks",
  "profiles",
  "player_stats",
  "personal_map",
  "personal_map_paths",
  "campaigns",
  "quests",
  "quest_completions",
  "daily_reviews",
  "desire_cycles",
  "ecosystem_entries",
  "esm_entries",
  "feedback_items",
  "motivation_entries",
  "perma_entries",
  "philosophy_entries",
  "pomodoro_sessions",
  "prd_documents",
  "relation_people",
  "relation_interactions",
  "user_custom_frameworks",
  "user_frameworks",
  "world_maps",
  "world_map_comparisons",
];

const USER_ID_COLUMNS = new Set(["user_id", "created_by", "updated_by", "owner_id"]);

const UPSERT_OPTIONS = {
  knowledge_frameworks: { onConflict: "slug" },
};

const exportDir = process.env.SUPABASE_IMPORT_DIR ?? "old-supabase-export";
const url = process.env.NEW_SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const oldUserId = process.env.OLD_SUPABASE_USER_ID;
const newUserId = process.env.NEW_SUPABASE_USER_ID;
const batchSize = Number(process.env.SUPABASE_IMPORT_BATCH_SIZE ?? 500);

if (!url || !serviceRoleKey || !oldUserId || !newUserId) {
  console.error(`
Missing required environment variables.

Required:
  NEW_SUPABASE_URL
  NEW_SUPABASE_SERVICE_ROLE_KEY
  OLD_SUPABASE_USER_ID
  NEW_SUPABASE_USER_ID

Optional:
  SUPABASE_IMPORT_DIR=old-supabase-export
  SUPABASE_IMPORT_BATCH_SIZE=500
`);
  process.exit(1);
}

if (!/^[\x20-\x7e]+$/.test(serviceRoleKey)) {
  console.error("NEW_SUPABASE_SERVICE_ROLE_KEY contains non-ASCII characters. It probably captured formatted CLI table output instead of the raw service_role key.");
  process.exit(1);
}

if (!serviceRoleKey.startsWith("eyJ") && !serviceRoleKey.startsWith("sb_secret_")) {
  console.error("NEW_SUPABASE_SERVICE_ROLE_KEY does not look like a Supabase service-role/secret key.");
  process.exit(1);
}
if (oldUserId === newUserId) {
  console.warn("OLD_SUPABASE_USER_ID and NEW_SUPABASE_USER_ID are the same; no user_id remap will occur.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

function remapValue(value) {
  if (value === oldUserId) return newUserId;
  if (Array.isArray(value)) return value.map(remapValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, remapValue(entry)]));
  }
  return value;
}

function remapRow(row) {
  const next = {};

  for (const [key, value] of Object.entries(row)) {
    next[key] = USER_ID_COLUMNS.has(key) ? remapValue(value) : value;
  }

  if ("user_id" in next) next.user_id = newUserId;
  if ("id" in next && next.id === oldUserId) next.id = newUserId;

  return next;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function importTable(table) {
  const file = path.join(exportDir, `${table}.json`);
  let rows;

  try {
    rows = await readJson(file);
  } catch (error) {
    if (error.code === "ENOENT") return { status: "missing", rows: 0 };
    throw error;
  }

  const remappedRows = rows.map(remapRow);

  for (let index = 0; index < remappedRows.length; index += batchSize) {
    const batch = remappedRows.slice(index, index + batchSize);
    if (batch.length === 0) continue;

    const { error } = await supabase.from(table).upsert(batch, UPSERT_OPTIONS[table]);
    if (error) throw error;
  }

  return { status: "ok", rows: remappedRows.length };
}

const manifest = {
  importedAt: new Date().toISOString(),
  projectUrl: url,
  exportDir,
  oldUserId,
  newUserId,
  tables: {},
};

for (const table of IMPORT_ORDER) {
  try {
    const result = await importTable(table);
    manifest.tables[table] = result;
    console.log(`${result.status.toUpperCase()} ${table}: ${result.rows} rows`);
  } catch (error) {
    manifest.tables[table] = {
      status: "error",
      message: error.message,
    };
    console.error(`ERROR ${table}: ${error.message}`);
    process.exitCode = 1;
    break;
  }
}

await writeFile(
  path.join(exportDir, "import-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

if (process.exitCode) {
  console.error("Import stopped after the first failed table. See import-manifest.json for details.");
} else {
  console.log(`Done. Import manifest written to ${path.join(exportDir, "import-manifest.json")}`);
}
