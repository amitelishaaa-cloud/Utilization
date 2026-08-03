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
- `app/(app)/pipeline/[id]/page.tsx` — עמוד עסקה בודדת; משתמש ב-`formatDate()` לפורמט `expected_start_date`, `expected_end_date`, `closed_at`
- `app/(app)/pipeline/[id]/edit/page.tsx` — עריכת עסקה
- `app/(app)/pipeline/actions.ts` — Server Actions: create, update stage, close (won/lost)
- `components/pipeline/deal-form.tsx` — טופס עסקה (שדות + validation); ניהול state של `expectedStartDate` + חישוב `min` תאריך סיום בהתאם
- `components/pipeline/deals-table.tsx` — טבלת עסקאות עם סטטוס + שלב
- `components/pipeline/stage-history-timeline.tsx` — ציר זמן מעברי שלבים

## Key types / exports

**מ-`lib/types.ts`** (ראה [[Data-Model]])
- `PipelineDeal` — הישות המרכזית
- `PipelineStageHistory` — לוג מעברי שלב
- `PipelineStage` — `'inquiry' | 'proposal' | 'negotiation' | 'verbal_close' | 'contract'`
- `DealStatus` — `'active' | 'won' | 'lost'`
- `DealType` — `'project' | 'retainer'`

## סוג עסקה (deal_type)

כל עסקת pipeline היא מסוג `'project'` (ברירת מחדל) או `'retainer'`:

| deal_type | שדות חובה | expected_end_date | נוסחת חישוב ב-pipeline |
|-----------|-----------|-------------------|------------------------|
| `project` | `estimated_hours` | חובה | `estimated_hours / deal_weeks × probability` |
| `retainer` | `monthly_hours` | אופציונלי (ריטיינר פתוח) | `monthly_hours / 4.33 × probability` לכל שבוע פעיל |

ריטיינר פתוח (ללא `expected_end_date`) תורם שעות עד סוף חלון החישוב — בדיוק כמו ריטיינר אמיתי בטבלת `retainers`.

בלעדיות הדדית ב-DB: `CHECK chk_deal_type_fields` — project דורש `estimated_hours IS NOT NULL AND monthly_hours IS NULL AND expected_end_date IS NOT NULL`; retainer דורש `monthly_hours IS NOT NULL AND estimated_hours IS NULL`.

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
