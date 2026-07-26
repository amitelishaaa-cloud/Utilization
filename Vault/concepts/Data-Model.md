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
- `Project` — `{ id, user_id, client_id, source_deal_id, name, pricing_type, estimated_hours, actual_hours, hourly_rate, fixed_price, start_date, end_date, is_end_date_estimated, status, notes: string | null, priority: 'low' | 'medium' | 'high' | null, created_at, clients? }`
- `RetainerStatus` — `'active' | 'ended'`
- `RetainerPricingType` — `'hourly' | 'fixed_monthly'`
- `Retainer` — `{ id, user_id, client_id, name, monthly_hours, pricing_type, hourly_rate, monthly_fixed_price, start_date, end_date, status, created_at, clients? }`
- `PipelineStage` — `'inquiry' | 'proposal' | 'negotiation' | 'verbal_close' | 'contract'`
- `DealStatus` — `'active' | 'won' | 'lost'`
- `PipelineDeal` — `{ id, user_id, client_id, name, pricing_type, estimated_hours, hourly_rate, fixed_price, expected_start_date, expected_end_date, current_stage, probability_override, status, created_at, closed_at, clients? }`
- `PipelineStageHistory` — `{ id, deal_id, from_stage, to_stage, changed_at }`
- `ProjectWeeklyAllocation` — `{ id, project_id, week_start, allocated_hours }`
- `CapacityException` — `{ id, user_id, week_start, available_hours, reason, created_at }`

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
