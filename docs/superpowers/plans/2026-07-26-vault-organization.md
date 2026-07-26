# Vault Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a concept-based Obsidian Vault under `Vault/` that serves as a cognitive navigation layer for the Utilization codebase — 1 Index note + 8 concept notes with accurate wikilinks, file paths, and type summaries.

**Architecture:** Each note covers one domain concept, listing all relevant source files, key exported types/functions, and `[[wikilinks]]` to related concepts. The Index.md is the single entry point. No code is duplicated — notes reference source files by path only.

**Tech Stack:** Obsidian Flavored Markdown, YAML frontmatter, `[[wikilinks]]`

## Global Constraints

- All notes live under `Vault/concepts/` (except `Vault/Index.md`)
- YAML frontmatter on every concept note: `tags` + `related`
- Wikilinks use exact note names without path prefix: `[[Utilization-Engine]]`
- File paths reference the project root (e.g. `lib/types.ts`, not absolute paths)
- No code copied from source — paths and type signatures only
- Hebrew content is fine; mix Hebrew/English as it appears in the source

---

### Task 1: Vault scaffold + Index.md

**Files:**
- Create: `Vault/concepts/` (directory)
- Create: `Vault/Index.md`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p Vault/concepts
```

- [ ] **Step 2: Create `Vault/Index.md`**

```markdown
---
tags: [index, navigation]
---

# Utilization — מפת הפרויקט

כלי SaaS לפרילאנסרים בודדים שמספק תחזית ניצול ועסקאות קדימה. ממזג שלוש שכבות: קיבולת זמינה, עבודה מחויבת, ועסקאות בתהליך — ומייצר מסך cockpit אחד עם המלצת פעולה.

**Stack:** Next.js 16 · TypeScript · Supabase (PostgreSQL + Auth) · Tailwind CSS 4 · RTL עברית

## מפת מושגים

| מושג | תיאור |
|------|--------|
| [[Utilization-Engine]] | מנוע החישוב הטהור — `calcWeeklyUtilization`, `calcRecommendation` |
| [[Cockpit]] | מסך ראשי — hero metric, עמודות תחזית, המלצה |
| [[Pipeline]] | עסקאות בתהליך, משוקללות לפי הסתברות שלב |
| [[Projects]] | פרויקטים מחויבים (one-time) |
| [[Retainers]] | התקשרויות חוזרות חודשיות |
| [[Clients]] | ישות לקוח — מקשרת Projects, Retainers, Pipeline |
| [[Data-Model]] | Schema, Supabase, TypeScript types |
| [[UI-Components]] | קומפוננטות UI משותפות, Tailwind, layout |

## גודל הפרויקט

- ~50 קבצי קוד ב-`app/`, `components/`, `lib/`
- 8 טבלאות Supabase עם RLS per `user_id`
- Free tier: עד 3 עסקאות pipeline, תחזית מטושטשת · Pro: ₪39/חודש
```

- [ ] **Step 3: Verify file exists**

```bash
ls Vault/Index.md Vault/concepts/
```

Expected: `Vault/Index.md` listed, `Vault/concepts/` directory present.

- [ ] **Step 4: Commit**

```bash
git add Vault/Index.md
git commit -m "feat(vault): add Index.md entry point"
```

---

### Task 2: Data-Model.md

**Files:**
- Create: `Vault/concepts/Data-Model.md`

**Interfaces:**
- Produces: foundation note; all other concept notes link to `[[Data-Model]]`

- [ ] **Step 1: Create `Vault/concepts/Data-Model.md`**

```markdown
---
tags: [data, schema, supabase, types]
related: [[Projects]], [[Retainers]], [[Pipeline]], [[Clients]], [[Utilization-Engine]]
---

# Data Model

## What it does
מגדיר את schema של כל הטבלאות ב-Supabase ואת ה-TypeScript types התואמים. RLS מוגדר לכל טבלה דרך `user_id` — כל משתמש רואה רק את הנתונים שלו.

## Key files
- `lib/types.ts` — כל ה-TypeScript types המשקפים את ה-DB schema
- `lib/supabase/server.ts` — server-side Supabase client (service role key) + `getDevUserId()`
- `lib/pipeline-stages.ts` — קבועי הסתברויות שלב

## Key types / exports

**`lib/types.ts`**
- `Client` — `{ id, user_id, name, created_at }`
- `PricingType` — `'hourly' | 'fixed'`
- `ProjectStatus` — `'active' | 'completed' | 'cancelled'`
- `Project` — `{ id, user_id, client_id, source_deal_id, name, pricing_type, estimated_hours, actual_hours, hourly_rate, fixed_price, start_date, end_date, is_end_date_estimated, status, clients? }`
- `RetainerStatus` — `'active' | 'ended'`
- `RetainerPricingType` — `'hourly' | 'fixed_monthly'`
- `Retainer` — `{ id, user_id, client_id, name, monthly_hours, pricing_type, hourly_rate, monthly_fixed_price, start_date, end_date, status, clients? }`
- `PipelineStage` — `'inquiry' | 'proposal' | 'negotiation' | 'verbal_close' | 'contract'`
- `DealStatus` — `'active' | 'won' | 'lost'`
- `PipelineDeal` — `{ id, user_id, client_id, name, pricing_type, estimated_hours, hourly_rate, fixed_price, expected_start_date, expected_end_date, current_stage, probability_override, status, closed_at, clients? }`
- `PipelineStageHistory` — `{ id, deal_id, from_stage, to_stage, changed_at }`
- `ProjectWeeklyAllocation` — `{ id, project_id, week_start, allocated_hours }`
- `CapacityException` — `{ id, user_id, week_start, available_hours, reason }`

**`lib/supabase/server.ts`**
- `createServerClient()` — returns Supabase client using `SUPABASE_SERVICE_ROLE_KEY`
- `getDevUserId()` — reads `DEV_USER_ID` env var (dev-only shortcut, no auth)

**`lib/pipeline-stages.ts`**
- `PIPELINE_STAGES: Record<PipelineStage, { label: string; probability: number }>` — inquiry:0.10, proposal:0.30, negotiation:0.55, verbal_close:0.80, contract:1.00

## DB Tables

| טבלה | עמודות מרכזיות |
|------|----------------|
| `users` | `id, email, default_weekly_hours, plan: 'free'\|'pro', plan_expires_at` |
| `clients` | `id, user_id, name` |
| `projects` | `id, user_id, client_id, estimated_hours, start_date, end_date, status` |
| `project_weekly_allocations` | `project_id, week_start, allocated_hours` |
| `retainers` | `id, user_id, client_id, monthly_hours, start_date, end_date, status` |
| `capacity_exceptions` | `user_id, week_start, available_hours, reason` |
| `pipeline_deals` | `id, user_id, client_id, estimated_hours, expected_start_date, expected_end_date, current_stage, probability_override, status` |
| `pipeline_stage_history` | `deal_id, from_stage, to_stage, changed_at` |

## Dependencies & consumers
- כל מושג אחר תלוי ב-Data-Model לsource of truth של types
- [[Utilization-Engine]] — צורך `Project`, `Retainer`, `PipelineDeal`, `ProjectWeeklyAllocation`, `CapacityException`
- [[Cockpit]] — קורא `users.plan` לgate ה-free-tier
- [[Pipeline]] — כותב ל-`pipeline_deals` ו-`pipeline_stage_history`
```

- [ ] **Step 2: Verify**

```bash
ls Vault/concepts/Data-Model.md
```

- [ ] **Step 3: Commit**

```bash
git add Vault/concepts/Data-Model.md
git commit -m "feat(vault): add Data-Model concept note"
```

---

### Task 3: Utilization-Engine.md

**Files:**
- Create: `Vault/concepts/Utilization-Engine.md`

**Interfaces:**
- Consumes: `[[Data-Model]]` (types)
- Produces: core calculation note; consumed by `[[Cockpit]]`, `[[Fetcher]]`

- [ ] **Step 1: Create `Vault/concepts/Utilization-Engine.md`**

```markdown
---
tags: [calculations, engine, pure-functions]
related: [[Data-Model]], [[Cockpit]], [[Pipeline]], [[Projects]], [[Retainers]]
---

# Utilization Engine

## What it does
מנוע החישוב הטהור של האפליקציה. מקבל נתוני DB גולמיים ומייצר `WeekBreakdown[]` לכל שבוע בטווח, ומהם `RecommendationResult` אחד. אין side-effects, אין קריאות DB — פונקציות טהורות בלבד.

## Key files
- `lib/calculations/types.ts` — types של המנוע
- `lib/calculations/utilization.ts` — חישוב שבועי
- `lib/calculations/recommendations.ts` — לוגיקת המלצות rule-based
- `lib/calculations/fetcher.ts` — שכבת ה-DB המחברת את המנוע לSupabase
- `lib/pipeline-stages.ts` — הסתברויות ברירת מחדל לשלבים (ראה [[Data-Model]])

## Key types / exports

**`lib/calculations/types.ts`**
- `WeekBreakdown` — `{ weekStart: string, committedHours, pipelineHours, capacity, utilization }`
- `UtilizationInput` — `{ defaultWeeklyHours, startDate, endDate, projects, allocations, retainers, deals, capacityExceptions }`
- `RecommendationTag` — `'overload' | 'optimal' | 'warning' | 'urgent_gap' | 'mid_gap' | 'far_gap' | 'sustained_high'`
- `RecommendationResult` — `{ tag, color, text, affectedMonthIndex: number|null, affectedMonthUtilization: number|null }`

**`lib/calculations/utilization.ts`**
- `calcWeeklyUtilization(input: UtilizationInput): WeekBreakdown[]` — entry point ראשי
- `parseDate(dateStr: string): Date` — YYYY-MM-DD → Date (UTC)
- `toDateStr(date: Date): string` — Date → YYYY-MM-DD
- `getWeekStart(date: Date): Date` — מחזיר את יום שני של השבוע
- `getWeeksInRange(start, end): Date[]` — רשימת ימי שני בטווח

**`lib/calculations/recommendations.ts`**
- `calcRecommendation(weeks: WeekBreakdown[]): RecommendationResult` — בודק חודשים לפי סדר עדיפות: overload → urgent_gap → mid_gap → far_gap → warning → sustained_high → optimal

**`lib/calculations/fetcher.ts`**
- `fetchUtilization(userId, startDate, endDate): Promise<UtilizationFetchResult>`
- `UtilizationFetchResult` — `{ weeks: WeekBreakdown[], recommendation: RecommendationResult, plan: 'free'|'pro' }`

## לוגיקת חישוב

```
capacity(week)   = capacity_exceptions.available_hours OR users.default_weekly_hours
committed(week)  = Σ project_weekly_allocations OR (estimated_hours / total_weeks)
                 + Σ retainer.monthly_hours / 4.33
pipeline(week)   = Σ (deal.estimated_hours / deal_weeks) * stage_probability
utilization      = (committed + pipeline) / capacity
```

## לוגיקת המלצות (priority order)

| Tag | תנאי | צבע |
|-----|------|-----|
| `overload` | utilization > 110% בכל חודש (עדיפות עליונה) | red |
| `urgent_gap` | utilization < 50%, חודש 1 | dark_red |
| `mid_gap` | utilization < 50%, חודש 2 | orange |
| `far_gap` | utilization < 50%, חודש 3+ | yellow |
| `warning` | 50%–80%, חודש ראשון שנמצא | yellow |
| `sustained_high` | > 90% ב-2+ חודשים | blue |
| `optimal` | כל השאר | green |

## Dependencies & consumers
- תלוי ב: [[Data-Model]] (types), `lib/pipeline-stages.ts`
- צורך אותו: [[Cockpit]] דרך `fetchUtilization`
- בדיקות: `lib/calculations/__tests__/utilization.test.ts`, `recommendations.test.ts`, `cockpit-helpers.test.ts`
```

- [ ] **Step 2: Verify**

```bash
ls Vault/concepts/Utilization-Engine.md
```

- [ ] **Step 3: Commit**

```bash
git add Vault/concepts/Utilization-Engine.md
git commit -m "feat(vault): add Utilization-Engine concept note"
```

---

### Task 4: Cockpit.md

**Files:**
- Create: `Vault/concepts/Cockpit.md`

**Interfaces:**
- Consumes: `[[Utilization-Engine]]` (output types), `[[Data-Model]]` (plan field)

- [ ] **Step 1: Create `Vault/concepts/Cockpit.md`**

```markdown
---
tags: [ui, page, cockpit, dashboard]
related: [[Utilization-Engine]], [[Data-Model]], [[UI-Components]], [[Pipeline]], [[Projects]], [[Retainers]]
---

# Cockpit

## What it does
המסך הראשי של האפליקציה. Server Component שמשיג את נתוני הניצול ל-3 חודשים קדימה ומציג: hero metric (% ניצול של החודש הבעייתי ביותר), עמודות תחזית חודשיות עם breakdown שבועי, ובלוק המלצה. משתמשי free רואים blur על העמודות וההמלצה עם CTA לשדרוג.

## Key files
- `app/(app)/cockpit/page.tsx` — Server Component; קורא `fetchUtilization`, מחלק לcomponents
- `lib/calculations/fetcher.ts` — `fetchUtilization()`: DB → engine → `{ weeks, recommendation, plan }`
- `lib/calculations/cockpit-helpers.ts` — utilities לעיבוד output המנוע ל-UI
- `components/cockpit/hero-metric.tsx` — מציג את ה-% הגדול + תווית חודש
- `components/cockpit/forecast-columns.tsx` — Client Component; עמודות חודשיות + hover week breakdown
- `components/cockpit/recommendation-block.tsx` — תג צבעוני + טקסט המלצה
- `components/cockpit/forecast-blur-gate.tsx` — עוטף את עמודות+המלצה; blur לfree + CTA

## Key types / exports

**`lib/calculations/cockpit-helpers.ts`**
- `MonthSummary` — `{ yearMonth, monthLabel, monthIndex, utilization, weeks: WeekBreakdown[] }`
- `HeroMonth` — `{ monthIndex, monthLabel, utilization }`
- `groupWeeksByMonth(weeks): MonthSummary[]` — ממיין weeks לחודשים, capacity-weighted utilization
- `getHeroMonth(weeks, recommendation): HeroMonth` — מחזיר את החודש שה-recommendation מצביע עליו (fallback: חודש 1)
- `getStartOfCurrentWeek(today?): Date` — יום שני הנוכחי (UTC)
- `addMonths(date, n): Date` — מוסיף n חודשים (UTC)
- `utilizationColorClass(u): string` — Tailwind text color class לפי %
- `utilizationBarColorClass(u): string` — Tailwind bg color class לפי %

**`lib/calculations/fetcher.ts`**
- `UtilizationFetchResult` — `{ weeks: WeekBreakdown[], recommendation: RecommendationResult, plan: 'free'|'pro' }`
- `fetchUtilization(userId, startDate, endDate): Promise<UtilizationFetchResult>`

## Data flow

```
CockpitPage (Server)
  → fetchUtilization(userId, startDate, endDate)        // fetcher.ts
      → Supabase: users, projects, retainers, deals,
                  capacity_exceptions, allocations
      → calcWeeklyUtilization(input)                    // utilization.ts
      → calcRecommendation(weeks)                       // recommendations.ts
      → return { weeks, recommendation, plan }
  → getHeroMonth(weeks, recommendation)                 // cockpit-helpers.ts
  → groupWeeksByMonth(weeks)                            // cockpit-helpers.ts
  → <HeroMetric heroMonth={...} />
  → <ForecastBlurGate plan={plan}>
      <ForecastColumns months={...} />
      <RecommendationBlock recommendation={...} />
    </ForecastBlurGate>
```

## Free-tier gate
`users.plan === 'free'` → `ForecastBlurGate` מציג blur CSS על הילדים + CTA "שדרג לפרו לראות את התחזית המלאה"

## Dependencies & consumers
- תלוי ב: [[Utilization-Engine]], [[Data-Model]], [[UI-Components]]
- מייצג נתונים מ: [[Projects]], [[Retainers]], [[Pipeline]]
```

- [ ] **Step 2: Verify**

```bash
ls Vault/concepts/Cockpit.md
```

- [ ] **Step 3: Commit**

```bash
git add Vault/concepts/Cockpit.md
git commit -m "feat(vault): add Cockpit concept note"
```

---

### Task 5: Pipeline.md

**Files:**
- Create: `Vault/concepts/Pipeline.md`

- [ ] **Step 1: Create `Vault/concepts/Pipeline.md`**

```markdown
---
tags: [pipeline, deals, crud, kanban]
related: [[Data-Model]], [[Utilization-Engine]], [[Clients]], [[Projects]], [[Cockpit]]
---

# Pipeline

## What it does
ניהול עסקאות בתהליך — deals שטרם נחתמו אבל משוקללים לפי הסתברות שלב לתוך חישוב הניצול. עסקה שנסגרת בהצלחה (won) עוברת לפרויקטים מחויבים. כל מעבר שלב נשמר ב-`pipeline_stage_history`.

## Key files
- `app/(app)/pipeline/page.tsx` — רשימת עסקאות
- `app/(app)/pipeline/new/page.tsx` — טופס עסקה חדשה
- `app/(app)/pipeline/[id]/page.tsx` — עמוד עסקה בודדת
- `app/(app)/pipeline/[id]/edit/page.tsx` — עריכת עסקה
- `app/(app)/pipeline/actions.ts` — Server Actions: create, update stage, close (won/lost)
- `components/pipeline/deal-form.tsx` — טופס עסקה (שדות + validation)
- `components/pipeline/deals-table.tsx` — טבלת עסקאות עם סטטוס + שלב
- `components/pipeline/stage-history-timeline.tsx` — ציר זמן מעברי שלבים

## Key types / exports

**מ-`lib/types.ts`** (ראה [[Data-Model]])
- `PipelineDeal` — הישות המרכזית
- `PipelineStageHistory` — לוג מעברי שלב
- `PipelineStage` — `'inquiry' | 'proposal' | 'negotiation' | 'verbal_close' | 'contract'`
- `DealStatus` — `'active' | 'won' | 'lost'`

**`lib/pipeline-stages.ts`**
- `PIPELINE_STAGES` — הסתברויות לכל שלב (ראה [[Utilization-Engine]])

## שלבים והסתברויות

| שלב | `current_stage` | הסתברות ברירת מחדל |
|-----|-----------------|---------------------|
| פנייה ראשונית | `inquiry` | 10% |
| הצעה נשלחה | `proposal` | 30% |
| משא ומתן | `negotiation` | 55% |
| סגר בעל פה | `verbal_close` | 80% |
| חוזה / יומן | `contract` | 100% |

ניתן לעקוף ידנית דרך `probability_override` לכל עסקה.

## זרימות מרכזיות

**סגירת עסקה (won):**
`status = 'won'` → נתוני העסקה מועברים לפרויקט חדש ב-[[Projects]] (`source_deal_id` מקשר)

**Free-tier gate:**
עד 3 עסקאות `active` במקביל. עסקה 4+ → modal שדרוג

## Dependencies & consumers
- תלוי ב: [[Data-Model]], [[Clients]]
- משפיע על: [[Utilization-Engine]] (deals → `pipelineHours`)
- [[Cockpit]] מציג נתוני Pipeline דרך המנוע
```

- [ ] **Step 2: Verify**

```bash
ls Vault/concepts/Pipeline.md
```

- [ ] **Step 3: Commit**

```bash
git add Vault/concepts/Pipeline.md
git commit -m "feat(vault): add Pipeline concept note"
```

---

### Task 6: Projects.md

**Files:**
- Create: `Vault/concepts/Projects.md`

- [ ] **Step 1: Create `Vault/concepts/Projects.md`**

```markdown
---
tags: [projects, committed-work, crud]
related: [[Data-Model]], [[Clients]], [[Utilization-Engine]], [[Pipeline]], [[Cockpit]]
---

# Projects

## What it does
ניהול פרויקטים מחויבים — עבודה חד-פעמית שנחתמה. פרויקטים תורמים לשעות `committed` בחישוב הניצול. ניתן לפרוס שעות לשבועות ידנית דרך `project_weekly_allocations`, אחרת המערכת מחלקת שווה בשווה.

## Key files
- `app/(app)/projects/page.tsx` — רשימת פרויקטים
- `app/(app)/projects/new/page.tsx` — טופס פרויקט חדש
- `app/(app)/projects/[id]/edit/page.tsx` — עריכת פרויקט
- `app/(app)/projects/actions.ts` — Server Actions: create, update, delete
- `components/projects/project-form.tsx` — טופס פרויקט (pricing fields, תאריכים)
- `components/projects/projects-table.tsx` — טבלת פרויקטים עם סטטוס + לקוח

## Key types / exports

**מ-`lib/types.ts`** (ראה [[Data-Model]])
- `Project` — הישות המרכזית; שים לב ל-`source_deal_id` — פרויקטים שנפתחו מ-[[Pipeline]] deal
- `ProjectWeeklyAllocation` — `{ project_id, week_start, allocated_hours }`
- `ProjectStatus` — `'active' | 'completed' | 'cancelled'`
- `PricingType` — `'hourly' | 'fixed'`

## לוגיקת שעות בשבוע

```
אם קיים project_weekly_allocations לשבוע:
  → השתמש ב-allocated_hours

אחרת:
  → estimated_hours / (end_date - start_date בשבועות)
```

`end_date` הוא **חובה** לכל פרויקט (ניתן לסמן כהערכה דרך `is_end_date_estimated`).

## Dependencies & consumers
- תלוי ב: [[Data-Model]], [[Clients]]
- משפיע על: [[Utilization-Engine]] — `committedHours` לכל שבוע
- פרויקטים יכולים להיווצר מ-[[Pipeline]] deal שנסגר (won)
```

- [ ] **Step 2: Verify**

```bash
ls Vault/concepts/Projects.md
```

- [ ] **Step 3: Commit**

```bash
git add Vault/concepts/Projects.md
git commit -m "feat(vault): add Projects concept note"
```

---

### Task 7: Retainers.md

**Files:**
- Create: `Vault/concepts/Retainers.md`

- [ ] **Step 1: Create `Vault/concepts/Retainers.md`**

```markdown
---
tags: [retainers, committed-work, recurring, crud]
related: [[Data-Model]], [[Clients]], [[Utilization-Engine]], [[Cockpit]]
---

# Retainers

## What it does
ניהול התקשרויות חוזרות חודשיות — לקוחות רטיינר שמשלמים סכום קבוע או לפי שעה בכל חודש. כל רטיינר פעיל תורם שעות קבועות לשבוע לחישוב ה-`committed` hours. הנוסחה: `monthly_hours / 4.33`.

## Key files
- `app/(app)/retainers/page.tsx` — רשימת רטיינרים
- `app/(app)/retainers/new/page.tsx` — טופס רטיינר חדש
- `app/(app)/retainers/[id]/edit/page.tsx` — עריכת רטיינר
- `app/(app)/retainers/actions.ts` — Server Actions: create, update, delete
- `components/retainers/retainer-form.tsx` — טופס רטיינר
- `components/retainers/retainers-table.tsx` — טבלת רטיינרים עם סטטוס

## Key types / exports

**מ-`lib/types.ts`** (ראה [[Data-Model]])
- `Retainer` — הישות המרכזית; `end_date` יכול להיות `null` (רטיינר פתוח)
- `RetainerStatus` — `'active' | 'ended'`
- `RetainerPricingType` — `'hourly' | 'fixed_monthly'`

## לוגיקת שעות בשבוע

```
weekly_contribution = retainer.monthly_hours / 4.33
```

חל לכל שבוע שבין `start_date` לבין `end_date` (או ללא הגבלה אם `end_date = null`).

## Dependencies & consumers
- תלוי ב: [[Data-Model]], [[Clients]]
- משפיע על: [[Utilization-Engine]] — `committedHours` לכל שבוע
```

- [ ] **Step 2: Verify**

```bash
ls Vault/concepts/Retainers.md
```

- [ ] **Step 3: Commit**

```bash
git add Vault/concepts/Retainers.md
git commit -m "feat(vault): add Retainers concept note"
```

---

### Task 8: Clients.md

**Files:**
- Create: `Vault/concepts/Clients.md`

- [ ] **Step 1: Create `Vault/concepts/Clients.md`**

```markdown
---
tags: [clients, entity, crud]
related: [[Data-Model]], [[Projects]], [[Retainers]], [[Pipeline]]
---

# Clients

## What it does
ישות לקוח פשוטה שמקשרת בין כל ה-entities. לקוח אחד יכול להיות מקושר לכמה פרויקטים, רטיינרים ועסקאות pipeline במקביל. ה-UI מאפשר יצירת לקוח חדש inline בתוך טופס פרויקט/רטיינר/עסקה.

## Key files
- `app/(app)/clients/page.tsx` — רשימת לקוחות
- `app/(app)/clients/new/page.tsx` — טופס לקוח חדש
- `app/(app)/clients/[id]/edit/page.tsx` — עריכת לקוח
- `app/(app)/clients/actions.ts` — Server Actions: create, update, delete
- `components/clients/client-form.tsx` — טופס לקוח
- `components/clients/clients-table.tsx` — טבלת לקוחות

## Key types / exports

**מ-`lib/types.ts`** (ראה [[Data-Model]])
- `Client` — `{ id, user_id, name, created_at }`

## קשרים

```
Client 1 → N Project          (project.client_id)
Client 1 → N Retainer         (retainer.client_id)
Client 1 → N PipelineDeal     (pipeline_deal.client_id, nullable)
```

ב-joins מ-Supabase, `clients: { name }` מגיע embedded בתוך `Project`, `Retainer`, `PipelineDeal`.

## Dependencies & consumers
- תלוי ב: [[Data-Model]]
- צורכים אותו: [[Projects]], [[Retainers]], [[Pipeline]]
```

- [ ] **Step 2: Verify**

```bash
ls Vault/concepts/Clients.md
```

- [ ] **Step 3: Commit**

```bash
git add Vault/concepts/Clients.md
git commit -m "feat(vault): add Clients concept note"
```

---

### Task 9: UI-Components.md

**Files:**
- Create: `Vault/concepts/UI-Components.md`

- [ ] **Step 1: Create `Vault/concepts/UI-Components.md`**

```markdown
---
tags: [ui, components, tailwind, rtl, layout]
related: [[Cockpit]], [[Projects]], [[Retainers]], [[Pipeline]], [[Clients]]
---

# UI Components

## What it does
קומפוננטות UI משותפות שכל ה-features משתמשים בהן, פלוס הגדרות layout ו-Tailwind. האפליקציה בעברית RTL — כל ה-layout משתמש ב-`start`/`end` (לא `left`/`right`).

## Key files

**קומפוננטות משותפות:**
- `components/ui/confirm-dialog.tsx` — דיאלוג אישור לפעולות הרסניות
- `components/ui/form-field.tsx` — wrapper לשדות טופס עם label + error
- `components/ui/nav-link.tsx` — קישור ניווט עם active state
- `components/ui/pricing-fields.tsx` — שדות תמחור (hourly rate / fixed price) לפי `pricing_type`

**Layout & styles:**
- `app/(app)/layout.tsx` — sidebar nav + main content wrapper; RTL כברירת מחדל
- `app/layout.tsx` — root layout; `<html dir="rtl" lang="he">`
- `app/globals.css` — Tailwind 4 theme דרך `@theme` blocks (לא `tailwind.config.js`)

## Tailwind 4

- הגדרת theme דרך CSS `@theme {}` ב-`app/globals.css`
- אין `tailwind.config.js` — כל customization ב-CSS
- PostCSS: `postcss.config.mjs` עם `@tailwindcss/postcss`

## RTL

```html
<!-- app/layout.tsx -->
<html dir="rtl" lang="he">
```

- משתמשים בקלאסות `start`/`end` (לא `left`/`right`) לכל layout
- `border-e` = border-inline-end (RTL: צד שמאל)
- Sidebar: `border-e border-gray-200`

## Navigation

```ts
// app/(app)/layout.tsx
const navItems = [
  { href: '/cockpit', label: 'לוח בקרה' },
  { href: '/clients', label: 'לקוחות' },
  { href: '/projects', label: 'פרויקטים' },
  { href: '/retainers', label: 'רטיינרים' },
  { href: '/pipeline', label: 'Pipeline' },
]
```

## Dependencies & consumers
- צורכים אותו: כל ה-features
- תלוי ב: Tailwind CSS 4, Next.js App Router
```

- [ ] **Step 2: Verify**

```bash
ls Vault/concepts/UI-Components.md
```

- [ ] **Step 3: Commit**

```bash
git add Vault/concepts/UI-Components.md
git commit -m "feat(vault): add UI-Components concept note"
```

---

### Task 10: Wikilink consistency check

**Files:**
- Verify: all 9 notes in `Vault/`

- [ ] **Step 1: List all note names (valid wikilink targets)**

```bash
ls Vault/Index.md Vault/concepts/
```

Expected names: `Data-Model`, `Utilization-Engine`, `Cockpit`, `Pipeline`, `Projects`, `Retainers`, `Clients`, `UI-Components`

- [ ] **Step 2: Check all wikilinks reference existing notes**

```bash
grep -oh '\[\[[^\]]*\]\]' Vault/Index.md Vault/concepts/*.md | sort -u
```

Every `[[Name]]` must match one of the 8 names above. No broken links.

- [ ] **Step 3: Verify file count**

```bash
find Vault -name "*.md" | sort
```

Expected: 9 files (1 Index + 8 concepts).

- [ ] **Step 4: Final commit**

```bash
git add Vault/
git commit -m "feat(vault): complete Obsidian concept-based knowledge graph"
```
