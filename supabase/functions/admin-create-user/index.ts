import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "juror" | "viewer";

function badRequest(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return badRequest("Unauthorized", 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente "como o usuário" para ler claims/roles via RLS
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return badRequest("Unauthorized", 401);
    const callerId = claims.claims.sub;

    // Verifica role admin via RPC (security definer)
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr) return badRequest(roleErr.message, 500);
    if (!isAdmin) return badRequest("Forbidden: apenas admins", 403);

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("JSON inválido");

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const displayName = String(body.displayName ?? "").trim();
    const role = String(body.role ?? "") as AppRole;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("Email inválido");
    if (password.length < 8) return badRequest("Senha precisa de no mínimo 8 caracteres");
    if (displayName.length < 2 || displayName.length > 60) return badRequest("Nome inválido");
    if (!["admin", "juror", "viewer"].includes(role)) return badRequest("Papel inválido");

    // Cliente admin
    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Cria usuário já confirmado
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (createErr || !created?.user) {
      return badRequest(createErr?.message ?? "Falha ao criar usuário", 400);
    }
    const newUserId = created.user.id;

    // Aprova o pedido criado pelo trigger handle_new_user (se for o caso)
    await admin
      .from("access_requests")
      .update({
        status: "approved",
        granted_role: role,
        reviewed_by: callerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("user_id", newUserId);

    // Atribui role (viewer = sem role)
    if (role !== "viewer") {
      const { error: roleInsErr } = await admin
        .from("user_roles")
        .insert({ user_id: newUserId, role });
      if (roleInsErr && !roleInsErr.message.includes("duplicate")) {
        return badRequest(`Usuário criado, mas falha ao atribuir papel: ${roleInsErr.message}`, 500);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: newUserId, email, role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    return badRequest((e as Error).message ?? "Erro inesperado", 500);
  }
});
