# Project Matchmaker

A platform for students to post project ideas, discover projects to join, and manage applications — built for the ACM WebDev Induction.

## Live Demo

(https://project-matchmaker-five.vercel.app/)

## The Core Idea

Google sign-in → post an idea → feed shows it → someone applies → owner accepts. That loop, end to end, is the whole product.

## Architectural Decisions

### Why Next.js instead of a static site

The original blueprint used vanilla HTML/JS + Supabase + GitHub Pages. That stack works well for a simple product, but GitHub Pages is static-only hosting — it cannot do Server-Side Rendering, server-side rate limiting, or server-side logging, because there's no server to run them on.

**Solution:** Next.js (App Router) + Supabase + Vercel.

- SSR is built in — any page that's a Server Component fetching data directly is already server-rendered, no extra configuration needed.
- Vercel deploys straight from GitHub with zero config.
- API routes / middleware provide a real place to implement rate limiting and logging.
- Everything from the original Supabase plan (schema, RLS, Auth, Storage, Realtime) carries over unchanged.

This ended up being *less* total work than retrofitting SSR, rate limiting, and logging onto a static site.

## Tech Stack

- **Frontend/Backend:** Next.js 16 (App Router, Server Components, Server Actions)
- **Database & Auth:** Supabase (PostgreSQL, Supabase Auth with Google OAuth, Row Level Security)
- **Hosting:** Vercel
- **Styling:** Plain CSS with custom properties (dark purple theme)

## Features Implemented

- **Authentication** — Google OAuth sign-in via Supabase Auth, with a Postgres trigger that auto-creates a `users` row on first sign-up.
- **Database schema** — three tables (`users`, `projects`, `applications`) with foreign key relationships.
- **Row Level Security (RBAC)** — Postgres RLS policies enforce that:
  - Anyone can read projects.
  - Only a project's owner can update or delete it (admins can also delete).
  - Only signed-in users can create projects, and only as themselves.
  - Only an applicant or the relevant project owner can see a given application.
  - Only a project owner can update an application's status.
- **Discovery feed** (`/`) — server-rendered list of all projects, newest first.
- **Post an idea** (`/post-idea`) — form backed by a Server Action that inserts a new project, protected by RLS so `owner_id` can't be spoofed.
- **Project detail page** (`/project/[id]`) — shows project info; owners see an applicant list with Accept/Decline actions, non-owners see a "Pitch to Join" form.
- **Join/Handshake workflow** — applicants submit a message, owners accept or decline, status is reflected back to the applicant.

## Planned / Not Yet Implemented

- Separate tabs that display your projects , projects you applied for and the projects proposed by others
- The unlocking of another tab which contains the indepth details of the project after the applicant is accepted.
- Create a base home page again
- make sure only the titles are visible in the home page when clicked on leads to a new tab with the project idea and then to the project apllication
- Email notifications on new applications (Supabase Edge Function + Resend)
- Push notifications via Web Push API
- Structured logging table for key actions
- Caching strategy (`revalidate`, SWR)
- Lazy loading for images/heavy components
- 

## Local Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com).

3. In Supabase → Authentication → Providers, enable **Google** (requires a Google OAuth Client ID/Secret from Google Cloud Console).

4. Create a `.env.local` file in the project root:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Run the database setup SQL (see `/supabase` or the schema below) in the Supabase SQL Editor.

6. Start the dev server:
   ```bash
   npm run dev
   ```

7. Visit `http://localhost:3000/login` to sign in.

## Database Schema

```sql
create table users (
  id uuid references auth.users primary key,
  name text,
  email text,
  major text,
  role text default 'student',
  skills text[]
);

create table projects (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references users(id),
  title text,
  description text,
  required_roles text[],
  status text default 'Recruiting',
  created_at timestamp default now()
);

create table applications (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id),
  applicant_id uuid references users(id),
  message text,
  status text default 'Pending'
);
```

A trigger on `auth.users` automatically creates a matching `users` row on every new sign-up.

## Project Structure

app/
  auth/callback/route.js   — OAuth callback, exchanges code for session
  login/page.js             — Sign-in page
  post-idea/page.js         — Create a new project (Server Action)
  project/[id]/page.js      — Project detail, applications, accept/decline
  page.js                   — Discovery feed
  layout.js                 — Root layout
  globals.css                — Theme
lib/
  supabase/
    client.js                — Browser Supabase client
    server.js                 — Server Supabase client (cookie-aware)
