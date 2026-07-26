---
name: nextjs16-guide
description: Use when writing or modifying any file in app/, components/, or lib/ that touches Next.js routing, rendering, caching, or Supabase data fetching. Read before writing new pages, layouts, route handlers, or server actions.
---

# Next.js 16 — Project Guide

## Breaking changes from earlier versions

- **Turbopack** is the default bundler. Use `--webpack` flag to opt out.
- **`fetch` is not cached by default.** Use the `use cache` directive, or wrap in `<Suspense>` to stream. Old `next: { revalidate }` on fetch calls belong to the previous model — see `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` if needed.
- **`params` is a Promise.** Always await: `const { id } = await params`.
- **`next build` no longer runs ESLint** automatically.
- **Cache Components** (opt-in via `cacheComponents: true` in `next.config.ts`) enable the `use cache` directive model.

## Architecture

**Routing** — App Router (`app/` directory). No `src/`. Import alias `@/*` resolves to project root.

**Rendering model** — layouts and pages are Server Components by default. Add `'use client'` only at the boundary where browser APIs, state, or event handlers are needed — not to every component in the subtree.

**Data fetching** — call Supabase (or any async I/O) directly in async Server Components or Route Handlers. Supabase credentials stay server-side; only `NEXT_PUBLIC_` env vars reach the client.

**Data mutations** — Server Functions with `'use server'` directive. Always verify auth inside every Server Function — they are reachable via direct POST requests. In dev: call `getDevUserId()` at the top of each action.

**Route Handlers** — `app/api/**/route.ts`. Support GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS. GET handlers are not cached by default.

**Supabase** — `@supabase/supabase-js` ^2.110.8. Server client in `lib/supabase/server.ts` (service role key, server-only). Browser client uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Tailwind CSS 4** — configured via PostCSS (`postcss.config.mjs`). No `tailwind.config.js`. Customization in `app/globals.css` via `@theme` blocks. Always use static class strings — no dynamic concatenation.
