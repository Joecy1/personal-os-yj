// Motivation extractor: takes raw user text, returns catalyst / desire / emotion / actions / reality_check.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEXT = 4000;

function prompt(rawText: string) {
  return `You are an inner-process analyst. The user wrote a stream of thought about something they want, fear, or are wrestling with.

Their text:
"""
${rawText}
"""

Extract the structure of the motivation loop. Return ONLY valid JSON with no markdown code blocks:
{
  "catalyst": "the external trigger or situation that sparked this (1 short sentence)",
  "desire": "what they actually want underneath (1 short sentence, name the deeper want)",
  "emotion": "dominant felt emotion: desire, fear, greed, anger, longing, motivation, restlessness, hope, anxiety, envy, awe, or calm",
  "reality_check": "a single honest sentence about what reality is actually offering vs the desire",
  "actions": ["action 1 (6-10 words, verb first)", "action 2", "action 3", "action 4"]
}

Be sharp and unflinching. Do not hedge. Do not moralize. Return ONLY the JSON object.`;
}

async function verifyAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !anonKey) return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: anonKey } });
  if (!r.ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authError = await verifyAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const rawText = body?.rawText;
    if (typeof rawText !== "string" || rawText.trim().length < 4) {
      return new Response(JSON.stringify({ error: "rawText required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (rawText.length > MAX_TEXT) {
      return new Response(JSON.stringify({ error: "Input too long" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const key = Deno.env.get("DEEPSEEK_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "DEEPSEEK_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt(rawText) }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      const code = r.status === 429 ? 429 : r.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: t }), { status: code, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "no response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract JSON from response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "invalid response format" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return new Response(JSON.stringify({ error: "invalid json: " + (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ extraction: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
