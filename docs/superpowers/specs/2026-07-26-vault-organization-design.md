# Vault Organization Design

**Date:** 2026-07-26  
**Goal:** Build a concept-based Obsidian Vault that serves as a cognitive navigation layer for the Utilization codebase — letting Claude locate the right file instantly without searching.

---

## Problem

The Utilization project has ~50 source files spread across `app/`, `components/`, `lib/`. Without a map, every session requires broad file searches before any meaningful work begins. The Vault replaces those searches with a structured knowledge graph.

## Approach: Concept-based notes (Approach B)

One note per domain concept (not per file). Claude thinks in concepts ("where is utilization calculated?"), not filenames. Each note collects all files, types, and relationships for one concept.

---

## Vault Structure

```
Vault/
├── Index.md                        ← entry point; wikilinks to all concepts
└── concepts/
    ├── Utilization-Engine.md
    ├── Cockpit.md
    ├── Pipeline.md
    ├── Projects.md
    ├── Clients.md
    ├── Retainers.md
    ├── Data-Model.md
    └── UI-Components.md
```

---

## Note Format (uniform across all concept notes)

```yaml
---
tags: [domain]
related: [[Concept-A]], [[Concept-B]]
---

## What it does
One paragraph. The "why" — what problem this concept solves in the product.

## Key files
- `path/to/file.ts` — one-line role description

## Key types / exports
- `TypeName` — what it represents
- `functionName(args)` — what it computes/returns

## Dependencies & consumers
What this concept depends on, and what depends on it.
```

---

## Concepts and their content

### Index.md
Master entry point. Product summary (1 paragraph), wikilinks to all 8 concept notes, and a quick file-count overview per concept.

### Utilization-Engine
The core calculation engine. Pure functions, no side-effects.

**Files:**
- `lib/calculations/utilization.ts` — `calcWeeklyUtilization`, date helpers (`parseDate`, `getWeekStart`, `getWeeksInRange`)
- `lib/calculations/recommendations.ts` — `calcRecommendation` (rule-based, 7 tags)
- `lib/calculations/types.ts` — `WeekBreakdown`, `UtilizationInput`, `RecommendationResult`, `RecommendationTag`
- `lib/pipeline-stages.ts` — stage probability constants

**Key types:** `WeekBreakdown`, `UtilizationInput`, `RecommendationResult`, `RecommendationTag`

**Key formulas:**
- capacity: `capacity_exceptions.available_hours OR users.default_weekly_hours`
- committed: `Σ project_allocated_hours + Σ retainer.monthly_hours / 4.33`
- pipeline: `Σ (deal.estimated_hours / deal_weeks * stage_probability)`
- utilization: `(committed + pipeline) / capacity`

### Cockpit
The main dashboard page. Assembles engine output into UI.

**Files:**
- `app/(app)/cockpit/page.tsx` — Server Component, calls `fetchUtilization`, passes to children
- `lib/calculations/fetcher.ts` — `fetchUtilization()` (DB → engine → result)
- `lib/calculations/cockpit-helpers.ts` — `groupWeeksByMonth`, `getHeroMonth`, `addMonths`, color helpers
- `components/cockpit/hero-metric.tsx` — displays the single % hero number
- `components/cockpit/forecast-columns.tsx` — Client Component, monthly bars with hover week breakdown
- `components/cockpit/recommendation-block.tsx` — colored tag + text
- `components/cockpit/forecast-blur-gate.tsx` — free-tier blur overlay + CTA

**Key types:** `MonthSummary`, `HeroMonth`, `UtilizationFetchResult`

**Free-tier gate:** `users.plan === 'free'` → blur over 3-month forecast + recommendation

### Pipeline
Deals in progress, weighted by stage probability into utilization.

**Files:**
- `app/(app)/pipeline/page.tsx` — deal list/kanban
- `app/(app)/pipeline/new/page.tsx`
- `app/(app)/pipeline/[id]/page.tsx`
- `app/(app)/pipeline/[id]/edit/page.tsx`
- `app/(app)/pipeline/actions.ts` — Server Actions: create, update stage, close (won/lost)
- `components/pipeline/deal-form.tsx`
- `components/pipeline/deals-table.tsx`
- `components/pipeline/stage-history-timeline.tsx`

**Key types:** `PipelineDeal`, `PipelineStageHistory`, `PipelineStage`, `DealStatus`

**Stages & probabilities:** inquiry 10% → proposal 30% → negotiation 55% → verbal_close 80% → contract 100%

**Free-tier limit:** max 3 active deals

### Projects
Committed work (one-time projects) — the largest contributor to committed hours.

**Files:**
- `app/(app)/projects/page.tsx`
- `app/(app)/projects/new/page.tsx`
- `app/(app)/projects/[id]/edit/page.tsx`
- `app/(app)/projects/actions.ts`
- `components/projects/project-form.tsx`
- `components/projects/projects-table.tsx`

**Key types:** `Project`, `ProjectWeeklyAllocation`, `ProjectStatus`, `PricingType`

**Hours allocation:** `project_weekly_allocations` per week; if missing → `estimated_hours / total_project_weeks`

### Clients
Simple entity linking projects, retainers, and pipeline deals.

**Files:**
- `app/(app)/clients/page.tsx`
- `app/(app)/clients/new/page.tsx`
- `app/(app)/clients/[id]/edit/page.tsx`
- `app/(app)/clients/actions.ts`
- `components/clients/client-form.tsx`
- `components/clients/clients-table.tsx`

**Key types:** `Client`

**Relationship:** `Client` 1→N `Project`, `Retainer`, `PipelineDeal`

### Retainers
Recurring monthly commitments — converted to weekly hours for the engine.

**Files:**
- `app/(app)/retainers/page.tsx`
- `app/(app)/retainers/new/page.tsx`
- `app/(app)/retainers/[id]/edit/page.tsx`
- `app/(app)/retainers/actions.ts`
- `components/retainers/retainer-form.tsx`
- `components/retainers/retainers-table.tsx`

**Key types:** `Retainer`, `RetainerStatus`, `RetainerPricingType`

**Formula:** `monthly_hours / 4.33` = weekly contribution to committed hours

### Data-Model
Database schema and Supabase wiring — the source of truth for all data.

**Files:**
- `lib/types.ts` — all TypeScript types mirroring the DB schema
- `lib/supabase/server.ts` — server-side Supabase client (service role)
- `supabase/` — migrations (if any)

**Tables:** `users`, `clients`, `projects`, `project_weekly_allocations`, `retainers`, `capacity_exceptions`, `pipeline_deals`, `pipeline_stage_history`

**Auth:** Supabase Auth (Google OAuth + email/password). RLS on all tables via `user_id`.

**Plan field:** `users.plan` ∈ `{free, pro}` — drives all free-tier gates in the app

### UI-Components
Shared UI primitives used across all features.

**Files:**
- `components/ui/confirm-dialog.tsx`
- `components/ui/form-field.tsx`
- `components/ui/nav-link.tsx`
- `components/ui/pricing-fields.tsx`
- `app/globals.css` — Tailwind 4 theme via `@theme` blocks
- `app/(app)/layout.tsx` — auth guard, nav, RTL wrapper

**Styling:** Tailwind CSS 4, RTL (`dir="rtl"` on `<html>`), `start`/`end` classes instead of `left`/`right`

---

## Wikilink Graph (key connections)

```
Index
  ├── Utilization-Engine ←── Cockpit (consumes engine output)
  │       ↑                   ↑
  │    Data-Model ────────────┤
  │       ↑              Pipeline
  │   Projects ──────────────┘
  │   Retainers ─────────────┘
  │   Clients ◄── Projects, Retainers, Pipeline
  └── UI-Components (used by all features)
```

---

## Implementation Notes

- Notes live under `Vault/concepts/` — separate from the Next.js source
- The Vault directory is untracked by git (appears as `??` in `git status`)
- Notes use Obsidian Flavored Markdown: YAML frontmatter, `[[wikilinks]]`, `## headings`
- No embedded code — always reference the actual source file by path
- Keep notes stable: add a note when a new concept is introduced, update when a file's role changes
