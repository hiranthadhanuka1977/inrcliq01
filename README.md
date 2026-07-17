# InrCliq Web (Next.js)

Production app converted from the static prototype in `../prototype/`.

## Stack

- Next.js 16 (App Router)
- PostgreSQL + Prisma 7
- Session cookies for auth (OTP login + signup/onboarding)

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and set your Postgres credentials:

   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/inrcliq?schema=public"
   AUTH_SECRET="generate-with-openssl-rand-base64-32"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   EMAIL_PROVIDER=sendgrid
   EMAIL_FROM=support@insider-hub.com
   SENDGRID_API_KEY=your-sendgrid-api-key
   ```

3. **Create database** (if it does not exist)

   ```bash
   psql -U postgres -c "CREATE DATABASE inrcliq;"
   ```

4. **Run migrations**

   ```bash
   npm run db:migrate
   ```

5. **Start dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Implemented flows

### Login
- `/` — landing login (prototype ONB-01)
- `POST /api/auth/login/send-code` — hashed OTP, 30s cooldown
- `POST /api/auth/login/verify-code` — verifies code, creates session, redirects by onboarding state

### Signup (email)
- `/signup` — 3-step signup (choose method → join form → verify email)
- `POST /api/auth/signup/join` — saves profile, sends verification link
- `POST /api/auth/verify-email/resend` — resend with 30s cooldown
- `/verify-email?token=…` — confirms email, creates session

### Post-verify onboarding
- `/onboarding/password` — create password or skip (ONB-06)
- `/onboarding/handle` — choose @handle or skip (ONB-07)
- `/home` — placeholder after onboarding complete

### Minor parent approval
- `/onboarding/parent` — parent email invite (ONB-03)
- `/onboarding/waiting` — pending approval screen (ONB-04)
- `/guardian/approve?token=…` — parent approval page
- Dev only: simulate parent approval from the waiting screen

## Email (SendGrid)

Set `EMAIL_PROVIDER=sendgrid` with `EMAIL_FROM` and `SENDGRID_API_KEY` to send real emails. Use `EMAIL_PROVIDER=console` (or omit SendGrid vars) to log messages to the server console instead.

Emails are sent for:

- Signup email verification
- Login one-time codes
- Parent/guardian approval invites
- Child notification when a parent approves or declines
- Profile completion after handle setup

## Next migration slices

1. OAuth (Google / Apple)
2. Topic selection (ONB-08)
3. Guardian ID verification screens

## Deploying to Vercel

1. Add Vercel Postgres or Neon
2. Set `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `EMAIL_PROVIDER`, `EMAIL_FROM`, and `SENDGRID_API_KEY`
3. **HTTP Basic Auth (demo gate)** — set these in Vercel → Project → Settings → Environment Variables:
   - `BASIC_AUTH_ENABLED` = `true`
   - `BASIC_AUTH_USER` = `inrcliqdemo`
   - `BASIC_AUTH_PASSWORD` = `inrcliqdemo@100%`
4. Build command: `prisma generate && prisma migrate deploy && next build`

Visitors will see the browser login prompt before any page or API route loads. Leave Basic Auth unset (or set `BASIC_AUTH_ENABLED=false`) for local development without the prompt.
