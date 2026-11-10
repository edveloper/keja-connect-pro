// Deletes the caller's RentKonnect account for good: their properties, units,
// tenants, charges, payments, expenses and settings, then their login. Google
// Play requires this to be available inside the app.
//
// Every table already cascades from auth.users, but expenses point at
// expense_categories with ON DELETE RESTRICT, and a live database may have
// drifted from the migrations. So the rows go explicitly, children first, and
// the login goes last. Every step can be repeated: anything that fails stops
// the run, and a retry finds what is left because the login is still there.
//
// Deploy:  Supabase dashboard -> Edge Functions -> delete-account

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const RETRY = "Some of it may already be gone. Please try again.";

// The word the landlord types. Phone keyboards add capitals and spaces.
const CONFIRM_WORD = "delete";
const normalise = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();

const isMissingUser = (message?: string) => /not found|does not exist/i.test(message ?? "");

// Order matters. Payments take their allocations with them, tenants take their
// charges, and expenses have to go before the categories they point at.
const OWNED_TABLES = [
  "payments",
  "reminder_queue",
  "tenant_risk_snapshots",
  "expenses",
  "tenants",
  "units",
  "properties",
  "expense_categories",
  "landlord_settings",
  "report_narratives",
  "ops_events",
  "user_migrations",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceRoleKey || !supabaseUrl) return json(500, { error: "Server is not configured" });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Identify the caller. Everything below follows from this login, never
  //    from anything in the request body.
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Missing authorization header" });

  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller?.user) return json(401, { error: "Invalid or expired session" });
  const userId = caller.user.id;

  let body: { confirm?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const password = String(body.password ?? "");
  if (normalise(String(body.confirm ?? "")) !== CONFIRM_WORD || !password) {
    return json(400, { error: "Please type DELETE and your password first." });
  }

  // 2. The password, because somebody holding an unlocked phone could type a
  //    word. Checked on a client of its own: signing in on the admin client
  //    would swap its service role for this user's session.
  const passwordCheck = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: passwordError } = await passwordCheck.auth.signInWithPassword({
    email: caller.user.email ?? "",
    password,
  });
  if (passwordError) {
    const wrong = passwordError.code === "invalid_credentials" || /invalid login/i.test(passwordError.message ?? "");
    return json(wrong ? 403 : 500, {
      error: wrong
        ? "That password is not right. Nothing was changed."
        : "Could not check your password. Nothing was changed.",
    });
  }

  // 3. The records. Only rows carrying this user_id are touched, so the
  //    preset expense categories everyone shares stay where they are.
  for (const table of OWNED_TABLES) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    // A table this database never had is not a failure. Anything else is.
    if (error && error.code !== "42P01" && !/does not exist/i.test(error.message ?? "")) {
      console.error(`delete-account: ${table}`, error.message);
      return json(500, { error: `Could not delete your records. ${RETRY}` });
    }
  }

  // 4. The login, last. Anything a future table holds still cascades from it.
  const { error: loginError } = await admin.auth.admin.deleteUser(userId);
  if (loginError && !isMissingUser(loginError.message)) {
    console.error("delete-account: login", loginError.message);
    return json(500, { error: `Could not remove your login. ${RETRY}` });
  }

  return json(200, { deleted: true });
});
