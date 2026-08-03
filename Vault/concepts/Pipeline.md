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
- `app/(app)/pipeline/[id]/page.tsx` — עמוד עסקה בודדת; משתמש ב-`formatDate()` לפורמט `expected_start_date`, `expected_end_date`, `closed_at`; קורא `searchParams.realize` לפתיחת מודאל המימוש
- `app/(app)/pipeline/[id]/edit/page.tsx` — עריכת עסקה
- `app/(app)/pipeline/actions.ts` — Server Actions: create, update stage, close (won/lost), `realizeDealAction`
- `components/pipeline/realize-deal-modal.tsx` — מודאל מימוש עסקה שנסגרה
- `lib/deal-realization.ts` — מיפוי טהור מעסקה לערכי ברירת המחדל של פרויקט/ריטיינר
- `lib/validation.ts` — `validateProject` / `validateRetainer`, משותפות ל-actions של [[Projects]], [[Retainers]] ו-Pipeline (אי אפשר לייצא פונקציה סינכרונית מקובץ `'use server'`)
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

**סגירת עסקה (won) ומימושה:**

`updateDealAction` מזהה מעבר ל-`won` ומפנה ל-`/pipeline/[id]?realize=1` (במקום ל-`/pipeline`) — אלא אם העסקה כבר מומשה. ה-searchParam הוא שפותח את `RealizeDealModal`; אותו מסלול בדיוק משמש את כפתור "צור פרויקט"/"צור ריטיינר" בעמוד פרטי העסקה, כך שיש מנגנון אחד ולא שניים.

המודאל ממולא מראש מ-`buildProjectDefaults` / `buildRetainerDefaults` ב-`lib/deal-realization.ts` (לוגיקה טהורה, נבדקת ב-`lib/__tests__/deal-realization.test.ts`), וניתן לערוך כל שדה לפני היצירה. `realizeDealAction` יוצר שורה ב-[[Projects]] או ב-[[Retainers]] לפי `deal_type`, עם `source_deal_id` שמקשר חזרה.

שדות שאינם העתקה ישירה:
- `client_id` — nullable בעסקה, NOT NULL ביעד. המודאל דורש בחירת לקוח, ומאפשר יצירת לקוח חדש בזרימה (הלקוח נוצר רק אחרי שהוולידציה עברה, כדי לא להשאיר לקוחות יתומים).
- `pricing_type` בענף ריטיינר — `'fixed'` בעסקה מתורגם ל-`'fixed_monthly'`.
- `monthly_fixed_price` — **לא** מועתק מ-`fixed_price`: בעסקה זה מחיר כולל, ברטיינר זה מחיר לחודש. השדה מגיע ריק עם אזהרה.
- `is_end_date_estimated` — נשלח `true` כברירת מחדל, כי מקור התאריך הוא `expected_end_date`.

**עסקה שנסגרה וטרם מומשה:** `fetcher.ts` שולף רק deals ב-`status = 'active'`, כך שעסקה `won` נושרת מיד מהחישוב המשוקלל. אם לא נוצר יעד — נוצר חור שקט בתחזית. לכן טבלת ה-Pipeline מציגה באדג' "טרם מומשה", ועמוד העסקה מציג הודעה מפורשת + כפתור להשלמה.

**מניעת כפילות:** partial unique index על `source_deal_id` בשתי טבלאות היעד (מיגרציה `20260803000001`). ה-Action בודק מראש וגם תופס `23505` למקרה של שתי הגשות במקביל. הייחודיות היא פר-טבלה — `deal_type` הוא מה שקובע לאיזו טבלה לפנות.

**Free-tier gate:**
עד 3 עסקאות `active` במקביל. עסקה 4+ → modal שדרוג

## Dependencies & consumers
- תלוי ב: [[Data-Model]], [[Clients]]
- משפיע על: [[Utilization-Engine]] (deals → `pipelineHours`)
- [[Cockpit]] מציג נתוני Pipeline דרך המנוע
