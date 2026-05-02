import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, SectionHeader, EmptyState } from "@/components/Module";
import { shortDate } from "@/lib/date";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/knowledge")({ component: KnowledgePage });

type Framework = {
  id: string;
  slug: string;
  title: string;
  author: string;
  source_title: string;
  source_year: number | null;
  description: string;
  domain: string;
  difficulty: string;
  core_concepts: string[];
  what_its_for: string;
  how_to_apply: string[];
  when_it_fails: string;
  test_questions: TestQ[];
};

type TestQ = { question: string; options: string[]; correct_index: number; explanation: string };

type UserFramework = {
  id: string;
  framework_id: string;
  status: "locked" | "reading" | "testing" | "unlocked";
  test_score: number | null;
  test_attempts: number;
  unlocked_at: string | null;
  notes: string | null;
};

type CustomFramework = {
  id: string;
  title: string;
  author: string | null;
  source_title: string | null;
  description: string;
  domain: string;
  core_concepts: string[];
  when_to_use: string;
  personal_notes: string | null;
  created_at: string;
};

const DOMAINS = ["all", "decision-making", "problem-solving", "communication", "systems-thinking", "self-knowledge"];

type View =
  | { kind: "library" }
  | { kind: "reading"; framework: Framework }
  | { kind: "test"; framework: Framework }
  | { kind: "synthesis"; framework: Framework; score: number }
  | { kind: "custom-new" };

function KnowledgePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState<View>({ kind: "library" });
  const [filter, setFilter] = useState<string>("all");

  const { data: frameworks } = useQuery({
    queryKey: ["knowledge_frameworks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("knowledge_frameworks").select("*").order("title");
      if (error) throw error;
      return (data ?? []) as unknown as Framework[];
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["user_frameworks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_frameworks").select("*");
      return (data ?? []) as unknown as UserFramework[];
    },
  });

  const { data: customs } = useQuery({
    queryKey: ["user_custom_frameworks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_custom_frameworks").select("*").order("created_at", { ascending: false });
      return (data ?? []) as unknown as CustomFramework[];
    },
  });

  const progressByFw = useMemo(() => {
    const m = new Map<string, UserFramework>();
    (progress ?? []).forEach((p) => m.set(p.framework_id, p));
    return m;
  }, [progress]);

  const upsertProgress = useMutation({
    mutationFn: async (patch: Partial<UserFramework> & { framework_id: string }) => {
      if (!user) throw new Error("not signed in");
      const existing = progressByFw.get(patch.framework_id);
      if (existing) {
        await supabase.from("user_frameworks").update(patch).eq("id", existing.id);
      } else {
        await supabase.from("user_frameworks").insert({ user_id: user.id, ...patch });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_frameworks"] });
      qc.invalidateQueries({ queryKey: ["sidebar-badges"] });
    },
  });

  if (view.kind === "reading") {
    return (
      <Module>
        <ReadingView
          framework={view.framework}
          onBack={() => setView({ kind: "library" })}
          onStartTest={async () => {
            await upsertProgress.mutateAsync({ framework_id: view.framework.id, status: "testing" });
            setView({ kind: "test", framework: view.framework });
          }}
        />
      </Module>
    );
  }
  if (view.kind === "test") {
    return (
      <Module>
        <TestView
          framework={view.framework}
          onBack={() => setView({ kind: "reading", framework: view.framework })}
          onPass={async (score) => {
            await upsertProgress.mutateAsync({
              framework_id: view.framework.id,
              status: "unlocked",
              test_score: score,
              test_attempts: (progressByFw.get(view.framework.id)?.test_attempts ?? 0) + 1,
              unlocked_at: new Date().toISOString(),
            });
            setView({ kind: "synthesis", framework: view.framework, score });
          }}
          onFail={async (score) => {
            await upsertProgress.mutateAsync({
              framework_id: view.framework.id,
              status: "testing",
              test_score: score,
              test_attempts: (progressByFw.get(view.framework.id)?.test_attempts ?? 0) + 1,
            });
          }}
        />
      </Module>
    );
  }
  if (view.kind === "synthesis") {
    return (
      <Module>
        <SynthesisView
          framework={view.framework}
          score={view.score}
          onSave={async (note) => {
            if (note.trim()) await upsertProgress.mutateAsync({ framework_id: view.framework.id, notes: note.trim() });
            setView({ kind: "library" });
            toast.success("Framework unlocked");
          }}
        />
      </Module>
    );
  }
  if (view.kind === "custom-new") {
    return (
      <Module>
        <CustomForm
          onCancel={() => setView({ kind: "library" })}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["user_custom_frameworks"] });
            setView({ kind: "library" });
          }}
        />
      </Module>
    );
  }

  // ---------- Library ----------
  const unlockedCount = (progress ?? []).filter((p) => p.status === "unlocked").length;
  const inProgress = (progress ?? []).filter((p) => p.status === "reading" || p.status === "testing").length;
  const customCount = (customs ?? []).length;

  const filtered = (frameworks ?? []).filter((f) => filter === "all" || f.domain === filter);

  return (
    <Module>
      <PageHeader
        title="Knowledge vault"
        subtitle="Mental models, decision frameworks, and tools — unlocked by understanding."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Frameworks unlocked", val: unlockedCount },
          { label: "In progress", val: inProgress },
          { label: "Custom frameworks", val: customCount },
        ].map((s) => (
          <div key={s.label} className="pos-card">
            <div className="card-label">{s.label}</div>
            <div className="font-serif" style={{ fontSize: 24 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {DOMAINS.map((d) => (
          <button
            key={d}
            className="opt-pill"
            style={filter === d ? { background: "var(--ink)", color: "var(--cream)", borderColor: "var(--ink)" } : {}}
            onClick={() => setFilter(d)}
          >
            {d === "all" ? "All" : d.replace(/-/g, " ")}
          </button>
        ))}
      </div>

      <SectionHeader title="Library" />
      {filtered.length === 0 ? (
        <EmptyState>No frameworks in this domain yet.</EmptyState>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
          {filtered.map((f) => {
            const p = progressByFw.get(f.id);
            const unlocked = p?.status === "unlocked";
            return (
              <div key={f.id} className="pos-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span className="tag tag-amber">{f.domain.replace(/-/g, " ")}</span>
                  {unlocked ? (
                    <span className="tag tag-green">✓ unlocked</span>
                  ) : (
                    <span className="tag tag-gray">{f.difficulty}</span>
                  )}
                </div>
                <div className="font-serif" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10 }}>
                  {f.author} · <em>{f.source_title}</em>{f.source_year ? ` (${f.source_year})` : ""}
                </div>
                {unlocked && p?.unlocked_at && (
                  <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Unlocked {shortDate(p.unlocked_at)}
                  </div>
                )}
                <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 12 }}>{f.description}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {f.core_concepts.slice(0, 4).map((c, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "3px 8px", background: "var(--cream-2)", color: "var(--ink-2)", borderRadius: 100 }}>
                      {c.length > 38 ? c.slice(0, 36) + "…" : c}
                    </span>
                  ))}
                </div>
                {unlocked && p?.notes && (
                  <div style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic", lineHeight: 1.5, marginBottom: 12, paddingLeft: 10, borderLeft: "2px solid var(--cream-3)" }}>
                    {p.notes}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  {unlocked ? (
                    <button className="pos-btn" onClick={() => setView({ kind: "reading", framework: f })}>Review →</button>
                  ) : p?.status === "testing" ? (
                    <button className="pos-btn primary" onClick={() => setView({ kind: "test", framework: f })}>Resume test →</button>
                  ) : p?.status === "reading" ? (
                    <button className="pos-btn primary" onClick={() => setView({ kind: "reading", framework: f })}>Continue reading →</button>
                  ) : (
                    <button
                      className="pos-btn primary"
                      onClick={async () => {
                        await upsertProgress.mutateAsync({ framework_id: f.id, status: "reading" });
                        setView({ kind: "reading", framework: f });
                      }}
                    >
                      Start reading →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SectionHeader title="Your custom frameworks" link={
        <button className="pos-btn" onClick={() => setView({ kind: "custom-new" })}>+ Add your own</button>
      } />
      {(customs ?? []).length === 0 ? (
        <EmptyState>No custom frameworks yet — add a model that has worked for you.</EmptyState>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {(customs ?? []).map((c) => (
            <div key={c.id} className="pos-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span className="tag tag-amber">{c.domain.replace(/-/g, " ")}</span>
                <span className="tag tag-gray">custom</span>
              </div>
              <div className="font-serif" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>{c.title}</div>
              {(c.author || c.source_title) && (
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10 }}>
                  {c.author ?? "—"}{c.source_title ? ` · ${c.source_title}` : ""}
                </div>
              )}
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 12 }}>{c.description}</div>
              {c.when_to_use && (
                <div style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic", lineHeight: 1.5, paddingLeft: 10, borderLeft: "2px solid var(--cream-3)" }}>
                  When to use: {c.when_to_use}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Module>
  );
}

// =================== Reading ===================

function ReadingView({ framework, onBack, onStartTest }: { framework: Framework; onBack: () => void; onStartTest: () => void }) {
  return (
    <div>
      <button className="pos-btn" onClick={onBack} style={{ marginBottom: 14 }}>← Library</button>
      <div className="font-serif" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>{framework.title}</div>
      <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>
        {framework.author} · {framework.source_title}{framework.source_year ? ` (${framework.source_year})` : ""}
      </div>

      <div className="pos-card" style={{ marginBottom: 18 }}>
        <div className="card-label">Core concepts</div>
        <div style={{ display: "grid", gap: 10 }}>
          {framework.core_concepts.map((c, i) => (
            <div key={i} style={{ background: "var(--cream-2)", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
              {c}
            </div>
          ))}
        </div>
      </div>

      <div className="pos-card" style={{ marginBottom: 18 }}>
        <div className="card-label">What this framework is for</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink)" }}>{framework.what_its_for}</div>
      </div>

      <div className="pos-card" style={{ marginBottom: 18 }}>
        <div className="card-label">How to apply it</div>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {framework.how_to_apply.map((s, i) => (
            <li key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink)", marginBottom: 4 }}>{s}</li>
          ))}
        </ol>
      </div>

      <div className="pos-card" style={{ marginBottom: 24, background: "var(--coral-bg)", borderColor: "rgba(184,74,46,0.2)" }}>
        <div className="card-label" style={{ color: "var(--coral)" }}>When it fails</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)" }}>{framework.when_it_fails}</div>
      </div>

      <button className="pos-btn primary" onClick={onStartTest}>I've read this — take the test →</button>
    </div>
  );
}

// =================== Test ===================

function TestView({
  framework,
  onBack,
  onPass,
  onFail,
}: {
  framework: Framework;
  onBack: () => void;
  onPass: (score: number) => void;
  onFail: (score: number) => void;
}) {
  const qs = framework.test_questions;
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState<{ score: number; answers: number[] } | null>(null);

  if (submitted) {
    const passed = submitted.score >= 80;
    if (passed) {
      return (
        <div>
          <div className="font-serif" style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{framework.title}</div>
          <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>Test result</div>
          <div className="pos-card" style={{ background: "var(--green-bg)", borderColor: "rgba(58,125,68,0.2)", marginBottom: 18 }}>
            <div className="font-serif" style={{ fontSize: 32, color: "var(--green)" }}>{submitted.score}/100</div>
            <div style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 6 }}>You understand it well enough to use it. Unlock and add it to your active toolkit.</div>
          </div>
          <button className="pos-btn primary" onClick={() => onPass(submitted.score)}>Unlock this framework →</button>
        </div>
      );
    }
    return (
      <div>
        <div className="font-serif" style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{framework.title}</div>
        <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>Test result</div>
        <div className="pos-card" style={{ background: "var(--coral-bg)", borderColor: "rgba(184,74,46,0.2)", marginBottom: 18 }}>
          <div className="font-serif" style={{ fontSize: 32, color: "var(--coral)" }}>{submitted.score}/100</div>
          <div style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 6 }}>Re-read and try again — the goal is understanding, not filtering.</div>
        </div>
        <div className="pos-card" style={{ marginBottom: 18 }}>
          <div className="card-label">Where you went wrong</div>
          {qs.map((q, i) => {
            const chosen = submitted.answers[i];
            if (chosen === q.correct_index) return null;
            return (
              <div key={i} style={{ padding: "12px 0", borderTop: i > 0 ? "1px solid var(--rule)" : undefined }}>
                <div style={{ fontSize: 13, color: "var(--ink)", marginBottom: 6 }}>Q{i + 1}. {q.question}</div>
                <div style={{ fontSize: 12, color: "var(--coral)", marginBottom: 4 }}>Your answer: {q.options[chosen]}</div>
                <div style={{ fontSize: 12, color: "var(--green)", marginBottom: 6 }}>Correct: {q.options[q.correct_index]}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic", lineHeight: 1.5 }}>{q.explanation}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="pos-btn primary" onClick={() => { setSubmitted(null); setAnswers([]); setIdx(0); setPicked(null); }}>Try again →</button>
          <button className="pos-btn" onClick={onBack}>Re-read first</button>
        </div>
      </div>
    );
  }

  const q = qs[idx];
  const isLast = idx === qs.length - 1;

  const confirm = () => {
    if (picked === null) return;
    const next = [...answers, picked];
    setAnswers(next);
    if (isLast) {
      const correct = next.filter((a, i) => a === qs[i].correct_index).length;
      const score = (correct / qs.length) * 100;
      setSubmitted({ score, answers: next });
      if (score >= 80) onPass(score); else onFail(score);
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  };

  return (
    <div>
      <button className="pos-btn" onClick={onBack} style={{ marginBottom: 14 }}>← Reading</button>
      <div className="font-serif" style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{framework.title}</div>
      <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>
        Question {idx + 1} of {qs.length}
      </div>
      <div className="pos-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink)", marginBottom: 18 }}>{q.question}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map((o, i) => (
            <button
              key={i}
              className="opt-pill"
              style={{
                textAlign: "left",
                padding: "12px 16px",
                fontSize: 13,
                ...(picked === i ? { background: "var(--ink)", color: "var(--cream)", borderColor: "var(--ink)" } : {}),
              }}
              onClick={() => setPicked(i)}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
      <button className="pos-btn primary" disabled={picked === null} onClick={confirm}>
        {isLast ? "Submit →" : "Next →"}
      </button>
    </div>
  );
}

// =================== Synthesis ===================

function SynthesisView({ framework, score, onSave }: { framework: Framework; score: number; onSave: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div>
      <div className="font-serif" style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{framework.title}</div>
      <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>
        Unlocked · {Math.round(score)}/100
      </div>
      <div className="pos-card" style={{ marginBottom: 18 }}>
        <div className="card-label">Synthesis (optional but it makes it stick)</div>
        <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 12 }}>
          In your own words, what is the one thing this framework changes about how you think?
        </div>
        <textarea className="pos-input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="One paragraph in your voice…" />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="pos-btn primary" onClick={() => onSave(note)}>Save & finish</button>
        <button className="pos-btn" onClick={() => onSave("")}>Skip</button>
      </div>
    </div>
  );
}

// =================== Custom framework form ===================

function CustomForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [domain, setDomain] = useState("decision-making");
  const [description, setDescription] = useState("");
  const [concepts, setConcepts] = useState<string[]>([""]);
  const [whenToUse, setWhenToUse] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");

  const save = async () => {
    if (!title.trim() || !user) return;
    const cleaned = concepts.map((c) => c.trim()).filter(Boolean);
    const { error } = await supabase.from("user_custom_frameworks").insert({
      user_id: user.id,
      title: title.trim(),
      author: author.trim() || null,
      source_title: sourceTitle.trim() || null,
      domain,
      description: description.trim(),
      core_concepts: cleaned,
      when_to_use: whenToUse.trim(),
      personal_notes: personalNotes.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Custom framework added");
    onSaved();
  };

  return (
    <div>
      <PageHeader title="New custom framework" subtitle="A model that has worked for you — yours or someone else's." actions={
        <button className="pos-btn" onClick={onCancel}>Cancel</button>
      } />
      <div className="pos-card">
        <label className="pos-label">Title *</label>
        <input className="pos-input" value={title} onChange={(e) => setTitle(e.target.value)} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <label className="pos-label">Author / source</label>
            <input className="pos-input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="My own synthesis" />
          </div>
          <div>
            <label className="pos-label">Source title</label>
            <input className="pos-input" value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)} />
          </div>
        </div>

        <label className="pos-label" style={{ marginTop: 12 }}>Domain</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DOMAINS.filter((d) => d !== "all").map((d) => (
            <button key={d} className="opt-pill" style={domain === d ? { background: "var(--ink)", color: "var(--cream)", borderColor: "var(--ink)" } : {}} onClick={() => setDomain(d)}>
              {d.replace(/-/g, " ")}
            </button>
          ))}
        </div>

        <label className="pos-label" style={{ marginTop: 12 }}>Description</label>
        <textarea className="pos-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="2–4 sentences: what is this framework?" />

        <label className="pos-label" style={{ marginTop: 12 }}>Core concepts (up to 8)</label>
        {concepts.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input className="pos-input" value={c} onChange={(e) => { const arr = [...concepts]; arr[i] = e.target.value; setConcepts(arr); }} placeholder={`Concept ${i + 1}`} />
            <button className="pos-btn" onClick={() => setConcepts(concepts.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        {concepts.length < 8 && (
          <button className="add-btn" onClick={() => setConcepts([...concepts, ""])}>+ Add concept</button>
        )}

        <label className="pos-label" style={{ marginTop: 12 }}>When to use</label>
        <textarea className="pos-input" rows={2} value={whenToUse} onChange={(e) => setWhenToUse(e.target.value)} placeholder="One paragraph: when does this apply?" />

        <label className="pos-label" style={{ marginTop: 12 }}>Personal notes</label>
        <textarea className="pos-input" rows={2} value={personalNotes} onChange={(e) => setPersonalNotes(e.target.value)} />

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button className="pos-btn primary" disabled={!title.trim()} onClick={save}>Save framework</button>
          <button className="pos-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
