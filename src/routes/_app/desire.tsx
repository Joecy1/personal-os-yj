import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader } from "@/components/Module";
import { toast } from "sonner";
import { FrameworkSelect } from "@/components/FrameworkPicker";

export const Route = createFileRoute("/_app/desire")({ component: DesirePage });

const PHASES = ["01 · Capture", "02 · Decompose", "03 · Map", "04 · Couple", "05 · Expand", "06 · Feedback", "07 · Meta"];

function DesirePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [phase, setPhase] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>({});

  const { data: cycles } = useQuery({
    queryKey: ["desire-cycles", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("desire_cycles").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    if (!cycles) return;
    if (cycles.length === 0) {
      // create a fresh draft
      supabase.from("desire_cycles").insert({ user_id: user!.id }).select().single().then(({ data }) => {
        if (data) { setActiveId(data.id); setDraft(data); qc.invalidateQueries({ queryKey: ["desire-cycles"] }); }
      });
    } else if (!activeId) {
      const active = cycles.find((c) => c.status === "active") ?? cycles[0];
      setActiveId(active.id); setDraft(active); setPhase(active.current_phase ?? 1);
    }
  }, [cycles, activeId, user, qc]);

  const update = useMutation({
    mutationFn: async (patch: any) => {
      if (!activeId) return;
      await supabase.from("desire_cycles").update({ ...patch, current_phase: phase }).eq("id", activeId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["desire-cycles"] }),
  });

  const setField = (k: string, v: any) => setDraft({ ...draft, [k]: v });
  const blur = () => update.mutate(draft);

  const newCycle = () => {
    supabase.from("desire_cycles").insert({ user_id: user!.id }).select().single().then(({ data }) => {
      if (data) { setActiveId(data.id); setDraft(data); setPhase(1); qc.invalidateQueries({ queryKey: ["desire-cycles"] }); toast.success("New cycle"); }
    });
  };

  return (
    <Module>
      <PageHeader title="Desire engine" subtitle="Capture · Decompose · Map · Couple · Expand · Feedback · Meta" actions={<button className="pos-btn" onClick={newCycle}>+ New cycle</button>} />

      {/* Ambition + Idol prelude — frames the desire before phases */}
      <div style={{ background: "var(--purple-bg)", border: "1px solid rgba(90,68,168,0.2)", borderRadius: 10, padding: "18px 22px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--purple)" }}>Ambition & Anchor</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)" }}>The bigger frame this desire serves</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="pos-label">Ambition size</label>
            <Pills options={["Small", "Medium", "Large", "Life-defining"]} value={draft.ambition_size} onChange={(v) => { setField("ambition_size", v); setTimeout(blur, 0); }} />
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                id="is-self-idol"
                checked={!!draft.is_self_idol}
                onChange={(e) => { const v = e.target.checked; setDraft({ ...draft, is_self_idol: v, idol_name: v ? "My future self" : (draft.idol_name === "My future self" ? "" : draft.idol_name) }); setTimeout(blur, 0); }}
              />
              <label htmlFor="is-self-idol" style={{ fontSize: 12, color: "var(--ink-2)" }}>Anchor to my future self (no external idol)</label>
            </div>
          </div>
          <div>
            <label className="pos-label">Idol — who do you emulate?</label>
            <input
              className="pos-input"
              value={draft.idol_name ?? ""}
              onChange={(e) => setField("idol_name", e.target.value)}
              onBlur={blur}
              placeholder={draft.is_self_idol ? "My future self" : "A real person worth emulating"}
              disabled={!!draft.is_self_idol}
            />
            <label className="pos-label" style={{ marginTop: 12 }}>Why this anchor?</label>
            <textarea
              className="pos-input"
              rows={2}
              value={draft.idol_why ?? ""}
              onChange={(e) => setField("idol_why", e.target.value)}
              onBlur={blur}
              placeholder="What about them reminds you of who you want to become?"
            />
            <label className="pos-label" style={{ marginTop: 12 }}>Traits to absorb</label>
            <input
              className="pos-input"
              value={draft.idol_traits ?? ""}
              onChange={(e) => setField("idol_traits", e.target.value)}
              onBlur={blur}
              placeholder="e.g. patience, range, taste, calm under load"
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {PHASES.map((p, i) => (
          <button key={p} onClick={() => setPhase(i + 1)} className="opt-pill" style={phase === i + 1 ? { background: "var(--ink)", color: "var(--cream)", borderColor: "var(--ink)" } : {}}>{p}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {phase === 1 && <>
            <Field label="The desire"><textarea className="pos-input" rows={3} value={draft.desire ?? ""} onChange={(e) => setField("desire", e.target.value)} onBlur={blur} /></Field>
            <Field label="Trigger"><input className="pos-input" value={draft.trigger ?? ""} onChange={(e) => setField("trigger", e.target.value)} onBlur={blur} /></Field>
            <Field label="Type"><Pills options={["Sensory", "Status", "Intellectual", "Relational"]} value={draft.desire_type} onChange={(v) => { setField("desire_type", v); setTimeout(blur, 0); }} /></Field>
            <Field label={`Intensity (${draft.intensity ?? 5})`}><input type="range" min={1} max={10} value={draft.intensity ?? 5} onChange={(e) => setField("intensity", Number(e.target.value))} onMouseUp={blur} style={{ width: "100%" }} /></Field>
            <Field label="Time horizon"><Pills options={["Immediate", "Short-term", "Long-term"]} value={draft.time_horizon} onChange={(v) => { setField("time_horizon", v); setTimeout(blur, 0); }} /></Field>
          </>}
          {phase === 2 && <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {["money", "time", "skill", "network", "access"].map((k) => (
                <Field key={k} label={k}><textarea className="pos-input" rows={2} value={draft[`resource_${k}`] ?? ""} onChange={(e) => setField(`resource_${k}`, e.target.value)} onBlur={blur} /></Field>
              ))}
            </div>
            <Field label="What's lacking"><textarea className="pos-input" rows={2} value={draft.lacking ?? ""} onChange={(e) => setField("lacking", e.target.value)} onBlur={blur} /></Field>
            <Field label="Constraint type"><Pills options={["Money", "Time", "Skill", "Network", "Access"]} value={draft.constraint_type} onChange={(v) => { setField("constraint_type", v); setTimeout(blur, 0); }} /></Field>
            <div>
              <label className="pos-label">Which framework might help you decompose this clearly?</label>
              <FrameworkSelect
                value={draft.decompose_framework ?? null}
                onChange={(slug) => { setField("decompose_framework", slug ?? ""); setTimeout(blur, 0); }}
                domainFilter="problem-solving"
                placeholder="— pick a problem-solving framework —"
              />
            </div>
          </>}
          {phase === 3 && <>
            <Field label="Production output"><textarea className="pos-input" rows={2} value={draft.production_output ?? ""} onChange={(e) => setField("production_output", e.target.value)} onBlur={blur} /></Field>
            <Field label="Buyer"><input className="pos-input" value={draft.buyer ?? ""} onChange={(e) => setField("buyer", e.target.value)} onBlur={blur} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {["loop_input", "loop_process", "loop_output", "loop_value"].map((k) => (
                <Field key={k} label={k.replace("loop_", "")}><input className="pos-input" value={draft[k] ?? ""} onChange={(e) => setField(k, e.target.value)} onBlur={blur} /></Field>
              ))}
            </div>
          </>}
          {phase === 4 && <>
            <Field label="Consume what"><input className="pos-input" value={draft.consume_what ?? ""} onChange={(e) => setField("consume_what", e.target.value)} onBlur={blur} /></Field>
            <Field label="Produce what (first)"><input className="pos-input" value={draft.produce_what ?? ""} onChange={(e) => setField("produce_what", e.target.value)} onBlur={blur} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Quota"><textarea className="pos-input" rows={2} value={draft.quota ?? ""} onChange={(e) => setField("quota", e.target.value)} onBlur={blur} /></Field>
              <Field label="Reward"><textarea className="pos-input" rows={2} value={draft.reward ?? ""} onChange={(e) => setField("reward", e.target.value)} onBlur={blur} /></Field>
            </div>
            <Field label="Enforcement"><input className="pos-input" value={draft.enforcement ?? ""} onChange={(e) => setField("enforcement", e.target.value)} onBlur={blur} /></Field>
          </>}
          {phase === 5 && <>
            <Field label="Expansion notes"><textarea className="pos-input" rows={3} value={draft.expansion_notes ?? ""} onChange={(e) => setField("expansion_notes", e.target.value)} onBlur={blur} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {["solo", "shared", "leveraged"].map((k) => (
                <Field key={k} label={k}><textarea className="pos-input" rows={2} value={draft[`scope_${k}`] ?? ""} onChange={(e) => setField(`scope_${k}`, e.target.value)} onBlur={blur} /></Field>
              ))}
            </div>
            <Field label="Model change"><Pills options={["Replicate", "Productize", "Systematize", "Delegate"]} value={draft.model_change} onChange={(v) => { setField("model_change", v); setTimeout(blur, 0); }} /></Field>
          </>}
          {phase === 6 && <>
            <Field label="Satisfaction"><Pills options={["Yes", "Partially", "No"]} value={draft.feedback_satisfaction} onChange={(v) => { setField("feedback_satisfaction", v); setTimeout(blur, 0); }} /></Field>
            <Field label="Notes"><textarea className="pos-input" rows={3} value={draft.feedback_notes ?? ""} onChange={(e) => setField("feedback_notes", e.target.value)} onBlur={blur} /></Field>
            <Field label="New desires triggered"><textarea className="pos-input" rows={2} value={draft.new_desires_triggered ?? ""} onChange={(e) => setField("new_desires_triggered", e.target.value)} onBlur={blur} /></Field>
            <Field label="Worth it?"><Pills options={["Yes", "No", "Unsure"]} value={draft.worth_it} onChange={(v) => { setField("worth_it", v); setTimeout(blur, 0); }} /></Field>
            <Field label="Adjustment direction"><Pills options={["More", "Less", "Different", "Stop"]} value={draft.adjustment_direction} onChange={(v) => { setField("adjustment_direction", v); setTimeout(blur, 0); }} /></Field>
          </>}
          {phase === 7 && <>
            <div className="pos-card">
              <div className="card-label">Cycle summary</div>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                <div><strong>Desire:</strong> {draft.desire || "—"}</div>
                <div><strong>Loop:</strong> {[draft.loop_input, draft.loop_process, draft.loop_output, draft.loop_value].filter(Boolean).join(" → ") || "—"}</div>
                <div><strong>Coupling:</strong> {draft.consume_what ? `Consume "${draft.consume_what}" only after "${draft.produce_what}"` : "—"}</div>
              </div>
            </div>
            <Field label="Diagnosis"><Pills options={["Pure consumer", "Pure producer", "Balanced engine"]} value={draft.diagnosis} onChange={(v) => { setField("diagnosis", v); setTimeout(blur, 0); }} /></Field>
            <Field label="Target note"><textarea className="pos-input" rows={3} value={draft.target_note ?? ""} onChange={(e) => setField("target_note", e.target.value)} onBlur={blur} /></Field>
            <button className="pos-btn" onClick={() => { navigator.clipboard.writeText(JSON.stringify(draft, null, 2)); toast.success("Copied"); }}>Copy summary</button>
          </>}
        </div>

        <div>
          <div className="pos-card" style={{ marginBottom: 16 }}>
            <div className="card-label">Active coupling rule</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, fontStyle: "italic" }}>
              "I may consume <strong style={{ color: "var(--ink)", fontStyle: "normal" }}>{draft.consume_what || "—"}</strong> only after <strong style={{ color: "var(--amber)", fontStyle: "normal" }}>{draft.produce_what || "—"}</strong>."
            </div>
          </div>
          <div className="pos-card" style={{ marginBottom: 16 }}>
            <div className="card-label">Production loop</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)" }}>
              {[draft.loop_input, draft.loop_process, draft.loop_output].map((s, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: "var(--cream-2)", padding: "4px 10px", borderRadius: 4 }}>{s || "—"}</span>
                  <span style={{ color: "var(--ink-4)" }}>→</span>
                </span>
              ))}
              <span style={{ background: "var(--amber-bg)", padding: "4px 10px", borderRadius: 4, color: "var(--amber)" }}>{draft.loop_value || "value"}</span>
            </div>
          </div>

          <div className="section-title" style={{ marginBottom: 12 }}>History</div>
          {(cycles ?? []).map((c) => (
            <div key={c.id} onClick={() => { setActiveId(c.id); setDraft(c); setPhase(c.current_phase ?? 1); }} style={{ padding: 12, background: "#fff", border: "1px solid var(--rule)", borderRadius: 6, marginBottom: 6, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--ink)" }}>{c.desire?.slice(0, 60) || "Untitled"}</span>
              <span className={`tag tag-${c.status === "fulfilled" ? "green" : c.status === "abandoned" ? "gray" : "amber"}`}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </Module>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="pos-label">{label}</label>{children}</div>;
}

function Pills({ options, value, onChange }: { options: string[]; value: any; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button key={o} className="opt-pill" style={value === o ? { background: "var(--cream-2)", borderColor: "var(--ink-4)", color: "var(--ink)" } : {}} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}
