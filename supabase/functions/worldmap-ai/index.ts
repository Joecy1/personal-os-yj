// Worldmap AI extraction + comparison via Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-pro";

function extractionPrompt(rawText: string, topic: string) {
  return `You are a cartographer of thought. Read the person's freeform description of how they see "${topic}" and extract the structure of their mental model.

The person wrote:
"""
${rawText}
"""

Rules:
- Exactly one core node.
- 3 to 6 secondary/anchor/tension nodes. Do not over-extract.
- 1 to 3 peripheral nodes (concepts mentioned but not developed).
- A "tension" node is one where the person expresses doubt or unresolved conflict; also add it to the tensions array.
- Blank spaces are concepts conspicuously absent — what you would expect in a mental model of this topic but is not mentioned.
- Node labels must be 2 to 5 words. Descriptions are one sentence each.
- Connection types: "supports" (one belief reinforces another), "opposes" (in tension), "qualifies" (one limits the other), "undefined".
- Annotations are interpretive insights, not summaries.`;
}

const extractionTool = {
  type: "function",
  function: {
    name: "produce_map",
    description: "Produce structured mental-model map data.",
    parameters: {
      type: "object",
      properties: {
        core: {
          type: "object",
          properties: { label: { type: "string" }, description: { type: "string" } },
          required: ["label", "description"],
          additionalProperties: false,
        },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              type: { type: "string", enum: ["secondary", "anchor", "tension", "peripheral"] },
              description: { type: "string" },
            },
            required: ["id", "label", "type", "description"],
            additionalProperties: false,
          },
        },
        connections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              type: { type: "string", enum: ["supports", "opposes", "qualifies", "undefined"] },
              weight: { type: "number" },
            },
            required: ["from", "to", "type", "weight"],
            additionalProperties: false,
          },
        },
        tensions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              between: { type: "array", items: { type: "string" } },
              description: { type: "string" },
            },
            required: ["between", "description"],
            additionalProperties: false,
          },
        },
        blank_spaces: {
          type: "array",
          items: {
            type: "object",
            properties: { label: { type: "string" }, description: { type: "string" } },
            required: ["label", "description"],
            additionalProperties: false,
          },
        },
        annotations: {
          type: "object",
          properties: {
            core_insight: { type: "string" },
            tension_insight: { type: ["string", "null"] },
            blank_space_insight: { type: ["string", "null"] },
          },
          required: ["core_insight", "tension_insight", "blank_space_insight"],
          additionalProperties: false,
        },
      },
      required: ["core", "nodes", "connections", "tensions", "blank_spaces", "annotations"],
      additionalProperties: false,
    },
  },
};

function comparisonPrompt(myMap: any, partnerMap: any, myLabel: string, partnerLabel: string, topic: string) {
  return `You are comparing two people's mental models of the same topic: "${topic}".

${myLabel}'s map:
${JSON.stringify(myMap, null, 2)}

${partnerLabel}'s map:
${JSON.stringify(partnerMap, null, 2)}

Rules:
- shared_ground: 2-3 items, only genuine conceptual overlap, not superficial word similarity.
- divergences: 2-3 items, where both maps treat the same concept but differ meaningfully.
- only_in_mine / only_in_theirs: 1-2 each, the most revealing absences.
- conversation_starters: exactly 2, specific real questions tied to a divergence/absence. Not "How do you feel about X?" but anchored to a specific node or absence.`;
}

const comparisonTool = {
  type: "function",
  function: {
    name: "produce_comparison",
    description: "Produce comparison analysis between two mental maps.",
    parameters: {
      type: "object",
      properties: {
        shared_ground: {
          type: "array",
          items: {
            type: "object",
            properties: { observation: { type: "string" }, significance: { type: "string" } },
            required: ["observation", "significance"],
            additionalProperties: false,
          },
        },
        divergences: {
          type: "array",
          items: {
            type: "object",
            properties: { observation: { type: "string" }, significance: { type: "string" } },
            required: ["observation", "significance"],
            additionalProperties: false,
          },
        },
        only_in_mine: {
          type: "array",
          items: {
            type: "object",
            properties: { concept: { type: "string" }, interpretation: { type: "string" } },
            required: ["concept", "interpretation"],
            additionalProperties: false,
          },
        },
        only_in_theirs: {
          type: "array",
          items: {
            type: "object",
            properties: { concept: { type: "string" }, interpretation: { type: "string" } },
            required: ["concept", "interpretation"],
            additionalProperties: false,
          },
        },
        conversation_starters: { type: "array", items: { type: "string" } },
      },
      required: ["shared_ground", "divergences", "only_in_mine", "only_in_theirs", "conversation_starters"],
      additionalProperties: false,
    },
  },
};

async function callGateway(messages: any[], tool: any) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    return { error: { status: r.status, body: t } };
  }
  const data = await r.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return { error: { status: 500, body: "no tool call returned" } };
  try {
    return { data: JSON.parse(call.function.arguments) };
  } catch (e) {
    return { error: { status: 500, body: "invalid tool args: " + (e as Error).message } };
  }
}

const MAX_RAW_TEXT = 5000;
const MAX_TOPIC = 200;
const MAX_LABEL = 100;
const MAX_MAP_BYTES = 20000;

async function verifyAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !anonKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
  });
  if (!r.ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authError = await verifyAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const action = body.action;

    if (action === "extract") {
      const { rawText, topic } = body;
      if (!rawText || typeof rawText !== "string" || !topic || typeof topic !== "string") {
        return new Response(JSON.stringify({ error: "rawText and topic required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (rawText.length > MAX_RAW_TEXT || topic.length > MAX_TOPIC) {
        return new Response(JSON.stringify({ error: "Input too long" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const result = await callGateway(
        [{ role: "user", content: extractionPrompt(rawText, topic) }],
        extractionTool,
      );
      if ("error" in result) {
        const code = result.error.status === 429 ? 429 : result.error.status === 402 ? 402 : 500;
        return new Response(JSON.stringify({ error: result.error.body }), { status: code, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ map_data: result.data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "compare") {
      const { myMap, partnerMap, myLabel, partnerLabel, topic } = body;
      if (!myMap || typeof myMap !== "object" || !partnerMap || typeof partnerMap !== "object") {
        return new Response(JSON.stringify({ error: "myMap and partnerMap required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (typeof topic !== "string" || topic.length > MAX_TOPIC) {
        return new Response(JSON.stringify({ error: "Invalid topic" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (typeof myLabel !== "string" || myLabel.length > MAX_LABEL || typeof partnerLabel !== "string" || partnerLabel.length > MAX_LABEL) {
        return new Response(JSON.stringify({ error: "Invalid labels" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (JSON.stringify(myMap).length > MAX_MAP_BYTES || JSON.stringify(partnerMap).length > MAX_MAP_BYTES) {
        return new Response(JSON.stringify({ error: "Map payload too large" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const result = await callGateway(
        [{ role: "user", content: comparisonPrompt(myMap, partnerMap, myLabel, partnerLabel, topic) }],
        comparisonTool,
      );
      if ("error" in result) {
        const code = result.error.status === 429 ? 429 : result.error.status === 402 ? 402 : 500;
        return new Response(JSON.stringify({ error: result.error.body }), { status: code, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ comparison_data: result.data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("worldmap-ai error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
