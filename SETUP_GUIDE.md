# DigitalVault — Local Setup Guide (Windows)

Written after getting this project running on a clean machine. Follow top to bottom.

---

## Part 1 — Prerequisites

### 1. Install Node.js

You need **Node.js 20.9 or newer** (this project runs Next.js 16, which refuses to start on anything older). The current LTS is Node 24.

Check the official [Node.js download page](https://nodejs.org/en/download) and install the **LTS** build. During setup, make sure the installer adds it to your PATH.

Verify it worked — open a **new** terminal (PATH changes don't reach already-open windows):

```powershell
node --version   # expect v20.9+ / v22 / v24
npm --version
```

### 2. If PowerShell blocks npm

If you see this error:

```
npm.ps1 : File ...\npm.ps1 cannot be loaded because running scripts is disabled
```

PowerShell blocks script execution by default. Fix it for your user account only (no admin needed):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

This is safe: `RemoteSigned` still blocks scripts downloaded from the internet.

---

## Part 2 — Install the project

From the project folder:

```powershell
npm install
```

Takes about 5-10 minutes on a normal connection (it downloaded 516 packages here).

> **Note about Bun:** the README mentions Bun, and there's a `bun.lock` file. You do
> **not** need Bun. `npm` works fine — every npm script in `package.json` runs under it.
> The only thing that assumes Bun is `npm run db:backup`, which is optional.

---

## Part 3 — Configure the database

This project uses **Prisma**. You need a database before the app will start.

### Which database?

| | SQLite | Postgres |
|---|---|---|
| Setup | None — a file on disk | Needs a running server |
| Good for | Local development | **Vercel / production** |
| Use when | Developing on your own machine | Deploying anywhere |

**Important:** the schema uses no Postgres-only features (no enums, no JSON columns,
no native type attributes), so it converts between the two cleanly.

### Option A — SQLite (recommended for local dev)

Edit the datasource block at the top of `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Then in `.env`:

```env
DATABASE_URL="file:./dev.db"
```

The path is relative to `prisma/schema.prisma`, so this creates `prisma/dev.db`.

### Option B — Postgres (required for Vercel)

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

`DATABASE_URL` is for normal traffic. `DIRECT_URL` is the **unpooled** connection and is
required for migrations — with Supabase's connection pooler, schema pushes hang without it.

Then in `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/postgres"
DIRECT_URL="postgresql://user:password@host:5432/postgres"
```

---

## Part 4 — Configure `.env`

Create `.env` in the project root (copy `.env.example` as a starting point — it documents
every variable). The minimum for local dev:

```env
# --- Database (see Part 3) ---
DATABASE_URL="file:./dev.db"
# DIRECT_URL="..."   # Postgres only

# --- Session signing (REQUIRED, min 32 characters) ---
SESSION_SECRET="<paste a random string here>"

# --- Site URLs (must have NO trailing slash) ---
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
SITE_URL="http://localhost:3000"

# --- Optional ---
NEXT_PUBLIC_GTM_ID=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Generate a good `SESSION_SECRET` with PowerShell:

```powershell
$bytes = New-Object byte[] 48
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$rng.GetBytes($bytes); $rng.Dispose()
[Convert]::ToBase64String($bytes)
```

> ### Why SESSION_SECRET matters
> It signs every session cookie with HMAC. If it's too short, missing, or set to a known
> placeholder, **the app refuses to boot in production** (`src/lib/password.ts`). It will
> fall back to a known constant in development, which means anyone who reads this repo can
> forge an admin session cookie. Don't do that outside your own machine.

> ### About Google OAuth locally
> `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` point at the **deployed** site's origin, so
> "Sign in with Google" will fail against `localhost` until you add
> `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI in the
> Google Cloud console. Email/password login works with no setup.

---

## Part 5 — Create the database

```powershell
npx prisma generate   # generate the Prisma client
npx prisma db push    # create tables in the database
```

`db push` is used instead of migrations because this project has no `migrations/` folder.
It reads `schema.prisma` and makes the database match. Run it again any time you change
the schema.

---

## Part 6 — Seed demo data (optional but recommended)

Gives you an admin account, a demo buyer, sample products, auctions, and blog posts.

```powershell
$env:ADMIN_SEED_PASSWORD = "pick-a-strong-password"
$env:BUYER_SEED_PASSWORD = "pick-another-one"
npx tsx --env-file=.env scripts/seed.ts
```

The script refuses to run if `NODE_ENV=production`, so it can never seed a live database.

> `tsx` is used because the seed script is TypeScript. If you get
> `Cannot find module '.../src/lib/db'`, that's it — plain `node` can't resolve
> extensionless TypeScript imports.

---

## Part 7 — Run it

```powershell
npm run dev
```

Open **http://localhost:3000**.

### Logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@asset.shop` | whatever you set in `ADMIN_SEED_PASSWORD` |
| Buyer | `demo@buyer.shop` | whatever you set in `BUYER_SEED_PASSWORD` |

### This is a single-page app — expect 404s

Most of the admin UI lives *inside* the homepage, swapped in client-side after login
(see `src/components/AppShell.tsx`). These URLs return 404 **by design**:

| URL | Status | Reality |
|---|---|---|
| `/` | 200 | Everything. Login happens in a modal here. |
| `/login` | 404 | No such page. Use `http://localhost:3000/?signin=1` |
| `/admin` | 404 | No such page. Log in and the dashboard renders on `/` |
| `/products` | 404 | Products are listed on `/`, not their own page |
| `/special-deal` | 200 | Auctions |
| `/blogs`, `/about`, `/contact`, `/terms`, `/privacy` | 200 | Static-ish pages |

### Real routes

| Page | URL |
|---|---|
| Storefront + login + dashboard | `/` |
| Product detail | `/product-details-page?id=<id>` |
| Checkout | `/checkout-page?id=<id>` |
| Deposit funds | `/deposit` |
| Auctions | `/special-deal`, `/special-deal/<slug>` |
| Blog | `/blogs`, `/blogs/<slug>` |

---

## Part 8 — Production build (test before deploying)

```powershell
npm run build
npm start
```

**Always run this before pushing to Vercel.** Vercel runs the same build, so anything that
fails here fails there too — but here you get the error immediately instead of after a
2-minute remote build.

---

## Part 9 — Deploying to Vercel

**SQLite will not work on Vercel.** The filesystem is read-only and wiped on every
deploy, so `dev.db` vanishes and every query fails.

### Steps

1. **Get a Postgres database.** Supabase, Neon, Railway, or Vercel Postgres.
2. **Switch the schema back** to Postgres (Option B in Part 3) and commit that change.
3. **Push this folder to GitHub.** Vercel deploys from a git repo.
4. **In Vercel:** New Project → import the repo.
5. **Add environment variables** (Settings → Environment Variables) for **Production**
   *and* **Preview**:
   - `DATABASE_URL` — pooled connection
   - `DIRECT_URL` — direct (non-pooled) connection
   - `SESSION_SECRET` — 32+ chars
   - `NEXT_PUBLIC_SITE_URL` — `https://your-app.vercel.app` (no trailing slash)
   - `SITE_URL` — same
6. **Set the Node version** to 20.9+ (Settings → Build & Development → Node.js Version).
   Vercel's default can be older than Next.js 16 requires.
7. **Deploy.** The first deploy has no tables — run this against the production database
   from your machine:
   ```powershell
   $env:DATABASE_URL="<production pooled url>"
   $env:DIRECT_URL="<production direct url>"
   npx prisma db push --accept-data-loss
   npx tsx --env-file=.env scripts/seed.ts   # optional, creates the admin user
   ```

### Common build errors

| Error | Cause | Fix |
|---|---|---|
| `Node.js version ... not supported` | Vercel's default Node is older than Next.js 16 requires | Pin Node 20.9+ in project settings |
| `Environment variable not found: DIRECT_URL` | Comes from `prisma db push`/`migrate`, not the build. The build itself only runs `prisma generate`, which was verified to succeed with no database env vars set (Prisma 6.19.3) | Set `DIRECT_URL` in the shell before running schema commands |
| `error: pnpm-lock.yaml / package-lock.yaml out of sync` | Lockfile doesn't match `package.json` | Delete the lockfile and redeploy, or commit the regenerated one |
| Build passes, every page 500s | `SESSION_SECRET` missing or under 32 chars — the app deliberately refuses to boot | Set a proper secret |
| Build passes, database errors | SQLite on Vercel, or tables never created | Use Postgres + run `prisma db push` |

---

## Quick reference

```powershell
npm install                              # install dependencies
npx prisma generate                      # regenerate the client after schema edits
npx prisma db push                       # sync schema to the database
npm run dev                              # dev server on :3000
npm run build                            # production build (run before deploying)
npm start                                # serve the production build
npx tsx --env-file=.env scripts/seed.ts  # seed demo data
```