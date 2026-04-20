import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub;

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr) return json({ error: roleErr.message }, 500);
    if (!isAdmin) return json({ error: "Forbidden: apenas admins" }, 403);

    const body = await req.json().catch(() => null);
    const targetId = String(body?.user_id ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(targetId)) return json({ error: "user_id inválido" }, 400);

    if (targetId === callerId) return json({ error: "Você não pode excluir a si mesmo" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Limpa dados auxiliares (FKs sem ON DELETE CASCADE definidos no schema público)
    await admin.from("user_roles").delete().eq("user_id", targetId);
    await admin.from("access_requests").delete().eq("user_id", targetId);
    await admin.from("profiles").delete().eq("id", targetId);

    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Erro inesperado" }, 500);
  }
});
