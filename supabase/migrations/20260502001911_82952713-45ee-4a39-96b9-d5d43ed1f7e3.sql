
-- ============================================================
-- Knowledge Vault: 3 new tables + integration columns
-- ============================================================

-- 1. Curated framework library (system-managed)
CREATE TABLE public.knowledge_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  source_title text NOT NULL,
  source_year integer,
  description text NOT NULL DEFAULT '',
  domain text NOT NULL,
  difficulty text NOT NULL DEFAULT 'foundational',
  core_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_its_for text NOT NULL DEFAULT '',
  how_to_apply jsonb NOT NULL DEFAULT '[]'::jsonb,
  when_it_fails text NOT NULL DEFAULT '',
  test_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_frameworks ENABLE ROW LEVEL SECURITY;

-- Curated library readable by any signed-in user; no insert/update/delete via API.
CREATE POLICY "kf_read_authenticated" ON public.knowledge_frameworks
  FOR SELECT TO authenticated USING (true);

-- 2. User progress per framework
CREATE TABLE public.user_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  framework_id uuid NOT NULL REFERENCES public.knowledge_frameworks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'locked',
  test_score integer,
  test_attempts integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, framework_id)
);

ALTER TABLE public.user_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uf_own_all" ON public.user_frameworks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER uf_set_updated_at
  BEFORE UPDATE ON public.user_frameworks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. User-created custom frameworks
CREATE TABLE public.user_custom_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  author text,
  source_title text,
  description text NOT NULL DEFAULT '',
  domain text NOT NULL DEFAULT 'decision-making',
  core_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  when_to_use text NOT NULL DEFAULT '',
  personal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_custom_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ucf_own_all" ON public.user_custom_frameworks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER ucf_set_updated_at
  BEFORE UPDATE ON public.user_custom_frameworks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Integration columns into existing modules
ALTER TABLE public.campaigns       ADD COLUMN IF NOT EXISTS frameworks_used text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.daily_reviews   ADD COLUMN IF NOT EXISTS framework_used_today text;
ALTER TABLE public.world_maps      ADD COLUMN IF NOT EXISTS frameworks_used text[] NOT NULL DEFAULT '{}';

-- ============================================================
-- Seed: 5 foundational frameworks with application-level tests
-- ============================================================

INSERT INTO public.knowledge_frameworks
  (slug, title, author, source_title, source_year, description, domain, difficulty, core_concepts, what_its_for, how_to_apply, when_it_fails, test_questions)
VALUES
(
  'paul-elder-critical-thinking',
  'Critical Thinking Framework',
  'Richard Paul & Linda Elder',
  'The Miniature Guide to Critical Thinking Concepts and Tools',
  2006,
  'A structured method for examining any argument, claim, or decision by pulling apart its underlying elements and testing them against intellectual standards. Surfaces hidden assumptions and unexamined points of view.',
  'decision-making',
  'foundational',
  '["Elements of Thought (purpose, question, information, interpretation, concepts, assumptions, implications, point of view)","Intellectual Standards (clarity, accuracy, precision, relevance, depth, breadth, logic, significance, fairness)","Intellectual Virtues (humility, courage, empathy, integrity, perseverance)"]'::jsonb,
  'Examining any argument, claim, or decision by pulling apart its underlying structure. Identifying assumptions you have not questioned. Ensuring your reasoning meets standards you can defend.',
  '["Identify the purpose — what is this reasoning trying to achieve?","State the question at issue as precisely as possible","Identify the information being used — is it accurate, sufficient?","Surface the assumptions underlying the argument","Examine the concepts being used — are they well-defined?","Consider the implications — if this reasoning is correct, what follows?","Identify the point of view — whose perspective is driving this?"]'::jsonb,
  'When applied mechanically without genuine curiosity. The framework produces checklists; the intellectual virtues produce wisdom. You need both.',
  '[
    {"question":"A colleague presents an argument that feels compelling. According to the Paul-Elder framework, what is the first thing you should examine before accepting it?","options":["Whether the conclusion matches your intuition","The purpose driving the reasoning and the question at issue","Who is making the argument and their credentials","Whether others in the room agree with it"],"correct_index":1,"explanation":"Purpose and question at issue come first — without them you cannot judge whether the rest of the reasoning is even on target."},
    {"question":"You are reviewing a project proposal. The numbers look good but something feels off. Which Element of Thought is most likely under-examined?","options":["Information","Assumptions","Conclusions","Point of view"],"correct_index":1,"explanation":"Numbers without surfaced assumptions are decoration. The assumption layer is the most common hiding place for unexamined reasoning."},
    {"question":"A team agrees unanimously on a course of action after a five-minute discussion. Which Intellectual Standard most needs scrutiny?","options":["Clarity","Depth","Relevance","Precision"],"correct_index":1,"explanation":"Fast unanimity often means shallow analysis. Depth asks: have we engaged the complexities, or just the surface?"},
    {"question":"You catch yourself dismissing a viewpoint because the person stating it annoys you. Which Intellectual Virtue is most relevant?","options":["Intellectual courage","Intellectual humility","Intellectual empathy","Intellectual perseverance"],"correct_index":2,"explanation":"Empathy is the discipline of reconstructing a viewpoint accurately before judging it — separating the message from the messenger."},
    {"question":"A founder argues their startup will succeed because three other companies in the space did. According to Paul-Elder, the strongest critique would target which Element?","options":["Information — are the comparison cases accurate?","Implications — what follows if true?","Concepts — what counts as success?","Point of view — whose framing is this?"],"correct_index":0,"explanation":"The argument hinges on the comparison cases being genuinely analogous. If the information (the cases themselves) is cherry-picked or non-comparable, the whole inference collapses."}
  ]'::jsonb
),
(
  'first-principles-thinking',
  'First Principles Thinking',
  'Aristotle; modern: Elon Musk / Descartes',
  'Metaphysics; Discourse on Method',
  null,
  'Breaking a problem down to its most basic, undeniable components and rebuilding a solution from there — rather than reasoning by analogy from how things have been done before.',
  'problem-solving',
  'foundational',
  '["Analogy vs. first principles","Foundational truths","Reconstruction from base up","Assumption stripping"]'::jsonb,
  'Breaking a problem down to its most basic, undeniable components and rebuilding a solution from there — rather than reasoning by analogy from how things have been done before.',
  '["Identify the problem or belief you want to examine","Ask: what do I know for certain is true about this?","Strip away every assumption, convention, and that-is-how-it-is-done","List only what remains — the foundational facts","Reconstruct a solution or belief from those facts upward"]'::jsonb,
  'Expensive in time and cognitive load. Unsuitable for time-sensitive decisions or domains where accumulated convention encodes hard-won wisdom. Not every wheel needs reinventing.',
  '[
    {"question":"You are told a product category cannot be priced under $X because no competitor has gone lower. A first-principles response would start by asking:","options":["Which competitor is closest to that price?","What does it actually cost to produce and deliver this?","How much margin do competitors typically take?","What is the customers willingness to pay?"],"correct_index":1,"explanation":"First principles starts from physical/economic ground truth — the real input cost — not from competitor pricing, which is itself an assumption."},
    {"question":"A team insists onboarding must take 6 weeks because it always has. Which step are they skipping?","options":["Defining success criteria","Stripping assumptions and asking what is actually required","Surveying the team","Comparing with industry benchmarks"],"correct_index":1,"explanation":"The 6-week duration is convention. First principles asks: what does the new person actually need to know on day one to do real work?"},
    {"question":"When is reasoning by analogy preferable to first principles?","options":["When the decision is irreversible","When stakes are extremely high","When time is limited and the analogy is genuinely close","When you have unlimited cognitive bandwidth"],"correct_index":2,"explanation":"Analogy is a legitimate shortcut when speed matters and the prior case is genuinely comparable. First principles is expensive — use it where the answer matters more than the time."},
    {"question":"You are designing a new role. Which question is most first-principles?","options":["What do similar companies title this role?","What outcomes must this role produce, regardless of title?","What is the standard salary band?","Which candidates are available?"],"correct_index":1,"explanation":"Outcomes are closer to ground truth than titles. Titles are inherited convention; outcomes are the actual job."},
    {"question":"The biggest failure mode of first-principles thinking in practice is:","options":["It produces wrong answers","It dismisses accumulated convention that encodes real wisdom","It is hard to explain to others","It cannot scale to big problems"],"correct_index":1,"explanation":"Convention often exists because someone already paid the tuition. First principles done arrogantly re-pays that tuition unnecessarily."}
  ]'::jsonb
),
(
  'eisenhower-matrix',
  'The Eisenhower Matrix',
  'Dwight D. Eisenhower; popularised by Stephen Covey',
  'The 7 Habits of Highly Effective People',
  1989,
  'A 2x2 sorting tool for tasks across two axes — urgent vs. important — to protect time for the high-leverage work that does not feel pressing but produces long-term results.',
  'decision-making',
  'foundational',
  '["Urgent vs. important","Four quadrants (Q1 Do / Q2 Schedule / Q3 Delegate / Q4 Eliminate)","Proactive vs. reactive time allocation"]'::jsonb,
  'Deciding where to direct attention across competing tasks. Distinguishing what feels pressing from what actually matters. Protecting time for high-importance, low-urgency work that drives long-term results.',
  '["List all current tasks and commitments","For each: is it urgent (time-sensitive)? Is it important (contributes to core goals)?","Place in the appropriate quadrant: Q1 Do now / Q2 Schedule / Q3 Delegate / Q4 Eliminate","Protect Q2 time aggressively — this is where leverage lives","Review weekly — tasks migrate between quadrants as circumstances change"]'::jsonb,
  'The matrix assumes you know what is truly important. If your goals are unclear, everything looks urgent. Clarify goals first.',
  '[
    {"question":"A task is on fire (urgent) but does not contribute to your core goals (not important). Which quadrant?","options":["Q1 — Do now","Q2 — Schedule","Q3 — Delegate","Q4 — Eliminate"],"correct_index":2,"explanation":"Urgent-but-not-important is the classic delegation zone. If you cannot delegate, batch it and minimise time spent."},
    {"question":"Which quadrant is most predictive of long-term success — and most often skipped?","options":["Q1","Q2","Q3","Q4"],"correct_index":1,"explanation":"Q2 (important, not urgent) is where strategy, learning, health, and relationships live. It never screams, so it loses to Q1 and Q3 unless protected."},
    {"question":"Your week is dominated by Q1 fires. Most likely root cause:","options":["You are working on the wrong things","Insufficient Q2 investment in prevention","You delegate too much","Your goals are too ambitious"],"correct_index":1,"explanation":"Chronic Q1 is usually the bill for skipped Q2. Prevention, planning, and systems would have stopped most fires before they started."},
    {"question":"A task is neither urgent nor important. The framework prescribes:","options":["Schedule it for later","Delegate it","Eliminate it","Do it for variety"],"correct_index":2,"explanation":"Q4 is elimination, not parking. Scheduling Q4 work just means it expires later instead of now."},
    {"question":"The matrix breaks down when:","options":["You have too many tasks","Your goals themselves are unclear","You work in a team","The tasks change daily"],"correct_index":1,"explanation":"Important is defined relative to goals. Without goal clarity, the importance axis collapses and everything defaults to urgent."}
  ]'::jsonb
),
(
  'inversion',
  'Inversion',
  'Charlie Munger; roots in Stoicism and Carl Jacobi',
  'Poor Charlies Almanack',
  2005,
  'Instead of asking how do I achieve X, ask what would guarantee I fail at X — then avoid those things. Often easier to identify failure conditions than success conditions, and the negative space is more reliable.',
  'problem-solving',
  'foundational',
  '["Thinking backwards","Avoiding failure vs. achieving success","Pre-mortem","Via negativa"]'::jsonb,
  'Instead of asking how do I achieve X, ask what would guarantee I fail at X. Then avoid those things. Often easier to identify failure conditions than success conditions, and the negative space is more reliable.',
  '["State your goal clearly","Invert it: what would make this definitely fail?","List every failure condition you can think of","Ask: am I currently doing any of these?","Design your approach to systematically avoid the failure conditions","What remains is a more robust path forward"]'::jsonb,
  'Can produce excessive caution if over-applied. Some goals require bold action that cannot be de-risked by inversion alone. Use alongside, not instead of, positive goal-setting.',
  '[
    {"question":"You want to build a great team. The most useful inversion question is:","options":["What do great teams have in common?","What would guarantee this team falls apart within a year?","Who are the best people I know?","What is the industry benchmark for team performance?"],"correct_index":1,"explanation":"Inversion targets failure modes you can actively avoid — far more concrete than abstract success traits."},
    {"question":"You are about to launch a product. A pre-mortem (a form of inversion) asks the team to:","options":["Predict the launch metrics","Imagine the launch failed and explain why","List competitors","Estimate ROI"],"correct_index":1,"explanation":"Pre-mortem operationalises inversion: assume failure, then trace it back. This surfaces risks that optimistic forward planning hides."},
    {"question":"Inversion is most powerful when:","options":["The success path is well understood","Failure modes are easier to enumerate than success conditions","The decision is reversible","You have strong analogies"],"correct_index":1,"explanation":"Inversion shines when the negative space is clearer than the positive — common in complex, uncertain, or novel domains."},
    {"question":"The main risk of over-applying inversion is:","options":["Slow decision-making","Excessive caution that prevents bold but necessary action","Team disengagement","Loss of positive vision"],"correct_index":1,"explanation":"Pure failure-avoidance produces conservative outcomes. Some goals require bets that cannot be de-risked away."},
    {"question":"Via negativa most directly recommends:","options":["Adding the most leveraged action","Removing what is hurting you before adding what might help","Maximising upside","Optimising for symmetry"],"correct_index":1,"explanation":"Via negativa is the discipline of subtraction — eliminating known harms tends to be more reliable than adding speculative goods."}
  ]'::jsonb
),
(
  'map-not-territory',
  'The Map Is Not the Territory',
  'Alfred Korzybski',
  'Science and Sanity',
  1933,
  'Every mental model, framework, belief, and plan is a simplified representation of reality — not reality itself. The most dangerous errors come from treating the map as the territory: mistaking your model for the thing it describes.',
  'systems-thinking',
  'foundational',
  '["Model vs. reality","Abstraction layers","Updating beliefs with new information","Epistemic humility"]'::jsonb,
  'Remembering that every mental model, framework, belief, and plan is a simplified representation of reality — not reality itself. The most dangerous errors come from treating the map as the territory.',
  '["When making a decision, identify the model or belief you are using","Ask: what is this model leaving out?","Ask: what would have to be true in reality for this model to be wrong?","Seek disconfirming information — not to destroy the model but to improve it","Update your map when reality contradicts it. The map serves you; you do not serve the map."]'::jsonb,
  'Can produce paralysis if taken to mean no model is reliable. Models are necessary. The point is to hold them lightly, not to abandon them.',
  '[
    {"question":"A financial model projects 30% growth. The CEO presents it as the plan. The most Korzybski-faithful objection is:","options":["The growth rate is too high","The model is a simplification — what assumptions could break and invalidate it?","Models are unreliable","We need a second opinion"],"correct_index":1,"explanation":"The objection is not the number — it is the conflation of the model with reality. Every model has invalidating conditions; naming them is the discipline."},
    {"question":"You believe a colleague is unreliable based on three past incidents. Map-territory thinking would prompt you to:","options":["Trust the pattern","Ask what your three-incident map is leaving out about them as a person","Confront them","Get a second opinion"],"correct_index":1,"explanation":"Three data points is a thin map of a whole person. The discipline is to notice the gap between your model and the territory of who they actually are."},
    {"question":"The biggest danger of internalising map-not-territory is:","options":["Becoming arrogant","Treating it as license to abandon all models","Becoming slow","Losing creativity"],"correct_index":1,"explanation":"The point is not no models — it is held-loosely models. Treating the principle as no model is reliable produces paralysis."},
    {"question":"Which behaviour best embodies the principle in practice?","options":["Never committing to a plan","Actively seeking information that would invalidate your current view","Using many models in parallel","Avoiding strong opinions"],"correct_index":1,"explanation":"Seeking disconfirmation is the operational test. If you only seek confirmation, you are defending the map; if you seek disconfirmation, you are improving it."},
    {"question":"In a strategy meeting, someone says the market wants X with full conviction. The map-territory follow-up is:","options":["What data shows that?","What would have to be true for that to be wrong, and have we looked?","Who else thinks that?","How long will that be true?"],"correct_index":1,"explanation":"Asking what would invalidate the claim is a stronger test than asking for supporting data — supporting data is easy to find for almost any claim."}
  ]'::jsonb
);
