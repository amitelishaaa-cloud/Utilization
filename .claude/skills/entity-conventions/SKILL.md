---
name: entity-conventions
description: Use when adding a new CRUD entity to the project — defines the standard file structure, Server Action pattern, Supabase query pattern, and Vault note requirement.
---

# Entity Conventions — Utilization

## File structure for a new entity `[entity]`

```
lib/types.ts                          ← append types here (never new file)
app/(app)/[entity]/
  page.tsx                            ← Server Component, fetches + renders list
  actions.ts                          ← Server Actions ('use server')
Vault/concepts/[Entity].md            ← required concept note
```

## lib/types.ts — type pattern

```ts
export type [Entity]Status = 'active' | 'ended'   // if applicable

export interface [Entity] {
  id: string
  user_id: string
  client_id: string                   // most entities belong to a client
  // ... entity-specific fields
  created_at: string
  clients?: Client                    // optional join
}
```

## page.tsx — Server Component pattern

```tsx
import { createServerClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/supabase/server'

export default async function [Entity]Page() {
  const supabase = createServerClient()
  const userId = getDevUserId()

  const { data } = await supabase
    .from('[entities]')
    .select('*, clients(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return <[Entity]List items={data ?? []} />
}
```

- No `'use client'` on page.tsx itself
- Interactive sub-components get `'use client'` at their own boundary

## actions.ts — Server Actions pattern

```ts
'use server'

import { createServerClient, getDevUserId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function create[Entity](formData: FormData) {
  const userId = getDevUserId()         // always first
  const supabase = createServerClient()

  await supabase.from('[entities]').insert({
    user_id: userId,
    // ... fields from formData
  })

  revalidatePath('/[entity]')
}
```

## Vault note — required

Create `Vault/concepts/[Entity].md` following this template:

```markdown
---
tags: [[entity], crud]
related: [[Data-Model]], [[Clients]]
---

# [Entity]

## What it does
[one sentence]

## Key files
- `app/(app)/[entity]/page.tsx`
- `app/(app)/[entity]/actions.ts`

## Key types / exports
- `[Entity]` — `{ id, user_id, client_id, ... }`

## DB Table
| עמודה | סוג |
|-------|-----|
| id | uuid |
| user_id | uuid |
| ... | ... |

## Dependencies
- [[Data-Model]] — TypeScript types
- [[Clients]] — client join
```

## Checklist before finishing

- [ ] Type added to `lib/types.ts`
- [ ] `user_id` present in type and all insert calls
- [ ] `getDevUserId()` called at top of every Server Action
- [ ] `revalidatePath` called after mutations
- [ ] Vault concept note created
- [ ] `npm run build` passes (TypeScript check)
