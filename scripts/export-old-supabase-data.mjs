import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_TABLES = [
  "profiles",
  "player_stats",
  "campaigns",
  "quests",
  "quest_completions",
  "daily_reviews",
  "desire_cycles",
  "ecosystem_entries",
  "esm_entries",
  "feedback_items",
  "knowledge_frameworks",
  "motivation_entries",
  "perma_entries",
  "personal_map",
  "personal_map_paths",
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

const url = process.env.OLD_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key =
  process.env.OLD_SUPABASE_ANON_KEY ??
  process.env.OLD_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SUPABASE_EXPORT_EMAIL;
const password = process.env.SUPABASE_EXPORT_PASSWORD;
const outDir = process.env.SUPABASE_EXPORT_DIR ?? "old-supabase-export";
const pageSize = Number(process.env.SUPABASE_EXPORT_PAGE_SIZE ?? 1000);
const tables = (process.env.SUPABASE_EXPORT_TABLES?.split(",").map((t) => t.trim()).filter(Boolean)) ?? DEFAULT_TABLES;

if (!url || !key || !email || !password) {
  console.error(`
Missing required environment variables.

Required:
  OLD_SUPABASE_URL or VITE_SUPABASE_URL or SUPABASE_URL
  OLD_SUPABASE_ANON_KEY or OLD_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_PUBLISHABLE_KEY
  SUPABASE_EXPORT_EMAIL
  SUPABASE_EXPORT_PASSWORD

Optional:
  SUPABASE_EXPORT_DIR
  SUPABASE_EXPORT_TABLES=table1,table2
  SUPABASE_EXPORT_PAGE_SIZE=1000
`);
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

await mkdir(outDir, { recursive: true });

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (authError) {
  console.error(`Login failed: ${authError.message}`);
  process.exit(1);
}

const manifest = {
  exportedAt: new Date().toISOString(),
  projectUrl: url,
  userId: authData.user?.id ?? null,
  tables: {},
};

console.log(`Signed in as ${authData.user?.email ?? email}`);
console.log(`Exporting ${tables.length} tables into ${path.resolve(outDir)}`);

for (const table of tables) {
  const rows = [];
  let from = 0;

  try {
    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(from, to);

      if (error) throw error;

      rows.push(...(data ?? []));

      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    const file = path.join(outDir, `${table}.json`);
    await writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, "utf8");

    manifest.tables[table] = {
      status: "ok",
      rows: rows.length,
      file,
    };

    console.log(`OK ${table}: ${rows.length} rows`);
  } catch (error) {
    manifest.tables[table] = {
      status: "error",
      message: error.message,
    };

    console.warn(`SKIP ${table}: ${error.message}`);
  }
}

await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Done. Manifest written to ${path.join(outDir, "manifest.json")}`);
