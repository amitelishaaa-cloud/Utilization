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
