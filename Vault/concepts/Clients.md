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
