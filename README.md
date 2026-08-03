# Utilization

A freelancer utilization management tool — track clients, projects, retainers, pipeline deals, and weekly capacity.

**Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase.

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/amitelishaaa-cloud/Utilization.git
cd Utilization
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

Create a new project at [supabase.com](https://supabase.com), then run the migrations in order:

```bash
# Using the Supabase CLI (recommended)
supabase link --project-ref <your-project-ref>
supabase db push

# Or run the SQL files manually in the Supabase SQL editor:
# supabase/migrations/20260722000001_create_enums.sql
# supabase/migrations/20260722000002_create_users.sql
# ... (all files in order)
```

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Find these values in your Supabase project under **Settings → API**.

The app talks to Supabase with the anon key only — every query is subject to RLS.
There is no service-role key in this project; do not add one.

Under **Authentication → Providers → Email**, leave **Confirm email** off. Sign-up
expects a session back immediately.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Commands

```bash
npm run dev      # development server (Turbopack)
npm run build    # production build + TypeScript check
npm run start    # serve production build
```

---

## Project Structure

```
app/
  (app)/
    clients/     # Client list, create, edit
    projects/    # Project list, create, edit
    retainers/   # Retainer list, create, edit
components/
  clients/       # ClientForm, ClientsTable
  projects/      # ProjectForm, ProjectsTable
  retainers/     # RetainerForm, RetainersTable
  ui/            # Shared components (FormField, NavLink, ConfirmDialog…)
lib/
  supabase/      # Server & browser Supabase client factories
  types.ts       # Shared TypeScript types
supabase/
  migrations/    # SQL migration files (run in order)
```

---

## Database Schema

The schema covers 8 tables with Row-Level Security:

| Table | Purpose |
|---|---|
| `users` | Freelancer profile (name, weekly capacity, hourly rate) |
| `clients` | Client directory |
| `projects` | Fixed-fee and hourly projects |
| `retainers` | Recurring monthly engagements |
| `pipeline_deals` | Pre-project opportunities |
| `project_weekly_allocations` | Hours planned per project per week |
| `capacity_exceptions` | Vacation / sick days / public holidays |
| `pipeline_stage_history` | Audit log of deal stage changes |
