## Scope

Continue the approved 4A → 4C → 4D sequence. 4A (Knowledge Vault) shipped last turn. This plan covers **4C** and **4D** in one turn.

---

## 4C — Daily ESM Emotion Diary

A lightweight Experience Sampling Method log: quick emotion check-ins (multiple per day) feeding patterns back into the Daily Session.

### Database
New migration:
- `esm_entries` table:
  - `id`, `user_id`, `captured_at` (timestamptz, default now())
  - `valence` smallint (-3..+3), `arousal` smallint (-3..+3)
  - `primary_emotion` text (joy / fear / anger / sadness / surprise / disgust / calm / curiosity)
  - `context` text (what you were doing — short)
  - `trigger` text (optional)
  - `note` text
  - `tags` text[] default `{}`
- RLS: own-row ALL policy (`auth.uid() = user_id`).

### UI
- **New route `src/routes/_app/diary.tsx`** — "Emotion diary"
  - Top: quick-capture card (valence slider, arousal slider, emotion pill grid, context input, optional note) → one-click "Log".
  - Today timeline (chronological list of today's entries).
  - 7-day strip: per-day average valence/arousal as tiny bars.
  - History list with filter by emotion / tag.
- **Daily Session integration (`src/routes/_app/index.tsx`)**:
  - Add a compact "Emotion pulse" widget showing today's count + last entry, with a "+ Log" button that opens the same capture form (inline, not a modal — match existing style).
- **Sidebar (`src/components/AppShell.tsx`)**: Add `Diary` entry under Daily group.

---

## 4D — Progress Screen + Campaign Templates + Manifesto

### D1. Progress screen
**New route `src/routes/_app/progress.tsx`** — read-only aggregation across modules:
- **Header KPIs**: streak (current/best), XP total, level, frameworks unlocked count.
- **Capitals radar** (text/bar fallback): all 7 capitals from `player_stats`.
- **Last 30 days**: quest completions per day (sparkline), daily review completion rate, ESM entries per day.
- **Desire cycles**: counts by status (active / fulfilled / abandoned), avg phase reached.
- **Frameworks**: unlocked vs locked, list of unlocked with date.
- **Campaigns**: active count, milestones completed.
- All data via existing tables — no new schema.
- Sidebar entry: "Progress" under a new `Reflect` group (or under Daily group).

### D2. Campaign templates
- **In `src/routes/_app/campaigns.tsx`**: add a "+ From template" button next to "+ New campaign".
- Templates defined in-code (no DB) as a static list — each has title, win_condition, default tags, suggested milestones (jsonb), and suggested framework slugs.
- Seed templates (5):
  1. Use of Technology — intentional consumption loop
  2. Career Development — skill ladder
  3. Health Baseline — sleep / movement / nutrition
  4. Knowledge Production — write / publish cadence
  5. Relational Capital — deepen 5 key ties
- Selecting a template opens a confirm dialog (existing pattern), inserts the campaign, attaches frameworks_used, and toasts.

### D3. Manifesto / Philosophy section
- **New route `src/routes/_app/manifesto.tsx`** — read-only canonical statement of the Personal OS philosophy: media diet, impact orientation, production-over-consumption coupling, knowledge-as-foundation. Static long-form content with section headings, blockquotes, and links to relevant modules (Desire, Knowledge, Campaigns).
- Sidebar entry: "Manifesto" near the bottom (alongside Philosophy if present).

---

## File Touch List

**Created**
- `supabase/migrations/<ts>_esm_entries.sql`
- `src/routes/_app/diary.tsx`
- `src/routes/_app/progress.tsx`
- `src/routes/_app/manifesto.tsx`
- `src/lib/campaign-templates.ts` (template definitions)

**Edited**
- `src/components/AppShell.tsx` (3 sidebar links)
- `src/routes/_app/index.tsx` (Emotion pulse widget)
- `src/routes/_app/campaigns.tsx` (+ From template button + dialog)
- `src/routeTree.gen.ts` (auto)

---

## Out of Scope (this turn)
- Charts library — use simple inline SVG / bars to stay light.
- ESM push reminders / scheduling — manual capture only.
- Editing/deleting ESM entries — log-only for v1 (delete can come next).

Ready to implement on approval.