import { createClient } from "@supabase/supabase-js";

const url = process.env.NEW_SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPABASE_NEW_USER_EMAIL;
const password = process.env.SUPABASE_NEW_USER_PASSWORD;
const name = process.env.SUPABASE_NEW_USER_NAME;

if (!url || !serviceRoleKey || !email || !password) {
  console.error(`
Missing required environment variables.

Required:
  NEW_SUPABASE_URL
  NEW_SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_NEW_USER_EMAIL
  SUPABASE_NEW_USER_PASSWORD

Optional:
  SUPABASE_NEW_USER_NAME
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
const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find((user) => user.email?.toLowerCase() === targetEmail.toLowerCase());
    if (found) return found;
    if (users.length < perPage) return null;

    page += 1;
  }
}

const metadata = name ? { name } : undefined;

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: metadata,
});

if (error) {
  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(`User already exists: ${email}`);
    console.log(`NEW_SUPABASE_USER_ID=${existing.id}`);
    process.exit(0);
  }

  console.error(`Create user failed: ${error.message}`);
  process.exit(1);
}

console.log(`Created user: ${data.user.email}`);
console.log(`NEW_SUPABASE_USER_ID=${data.user.id}`);
