# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Utilization — a freelancer utilization management tool built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Supabase.

## Commands

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build (also runs TypeScript check)
npm run start    # serve the production build
```

There is no lint script configured. TypeScript errors surface during `npm run build`.

## Important: This is Next.js 16 — read before writing code

Next.js 16 has breaking changes from earlier versions. Before writing any code, read the relevant guide in `node_modules/next/dist/docs/`. Key differences:

- **Turbopack** is the default bundler (not Webpack). Use `--webpack` flag to opt out.
- **`fetch` is not cached by default.** Use the `use cache` directive to cache results, or wrap in `<Suspense>` to stream. Old fetch cache options (`next: { revalidate }` on the fetch call) belong to the previous model — see `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` if you need them.
- **`params` is now a Promise.** Dynamic route params must be awaited: `const { id } = await params`.
- **`next build` no longer runs ESLint** automatically.
- **Cache Components** (opt-in via `cacheComponents: true` in `next.config.ts`) enable the new `use cache` directive model.

## Architecture

**Routing** uses the App Router (`app/` directory). No `src/` directory. Import alias `@/*` resolves to the project root.

**Rendering model**: layouts and pages are Server Components by default. Add `'use client'` only at the boundary where browser APIs, state, or event handlers are needed — not to every component in the subtree.

**Data fetching in Server Components** — call Supabase (or any async I/O) directly in async Server Components or Route Handlers. Supabase credentials stay server-side; only `NEXT_PUBLIC_` env vars reach the client.

**Data mutations** use Server Functions with the `'use server'` directive. Always verify auth inside every Server Function — they are reachable via direct POST requests.

**Route Handlers** live at `app/api/**/route.ts`. They support GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS. GET handlers are not cached by default.

**Supabase** (`@supabase/supabase-js` ^2.110.8) is installed. Convention: create a client factory in `lib/supabase/` — a server client (using service role key, server-only) and a browser client (using `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

**Tailwind CSS 4** — configured via PostCSS (`postcss.config.mjs` with `@tailwindcss/postcss`). There is no `tailwind.config.js`; customization goes in `app/globals.css` using CSS `@theme` blocks.
