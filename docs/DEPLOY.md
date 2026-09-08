# Deploying to Vercel + Neon + R2

Three accounts, all with free tiers that cover a handful of teachers: **Vercel** (the app),
**Neon** (Postgres), **Cloudflare R2** or **AWS S3** (uploaded Teacher Editions).

You need to create the accounts and paste the secrets yourself — they are yours, and nothing
in this repo can or should hold them.

Expect about 25 minutes.

---

## 1. Database — Neon

1. Create a project at [neon.tech](https://neon.tech). Pick the region closest to you.
2. From the connection details, copy **two** strings:
   - the **pooled** one (the host contains `-pooler`) → this becomes `DATABASE_URL`
   - the **direct** one (no `-pooler`) → this becomes `DIRECT_URL`

Both are needed. Serverless functions open and drop connections constantly, so the app talks
to the pooler; Prisma migrations cannot run through a transaction pooler, so they use the
direct connection. That split is already wired into `prisma/schema.prisma`.

## 2. File storage — Cloudflare R2

R2 has no egress fees and a free tier, which suits a few hundred Teacher Edition PDFs.

1. In the Cloudflare dashboard, go to **R2** → **Create bucket**. Name it e.g.
   `teaching-app-uploads`. Keep it **private** — do not enable public access.
2. **R2** → **API** → **Manage API tokens** → **Create API token**:
   - Permission: **Object Read & Write**
   - Scope it to the one bucket you just made
   - Copy the **Access Key ID** and **Secret Access Key** (shown once)
3. Note your **Account ID** from the R2 overview page. Your endpoint is
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

No CORS configuration is needed: uploads go browser → app server → bucket, so the browser
never talks to R2 directly.

<details>
<summary>Using AWS S3 instead</summary>

Create a private bucket, then an IAM user with `s3:PutObject`, `s3:GetObject` and
`s3:DeleteObject` on `arn:aws:s3:::<bucket>/*`. Set `S3_REGION` to the bucket's real region
and leave `S3_ENDPOINT` blank — the driver switches to virtual-host addressing automatically.
</details>

## 3. App — Vercel

1. [vercel.com/new](https://vercel.com/new) → import `balaliss/teaching-app`.
2. Leave the production branch as `main`.
3. Add these environment variables (Settings → Environment Variables):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DIRECT_URL` | Neon **direct** connection string |
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `ANTHROPIC_API_KEY` | your Claude API key |
| `STORAGE_DRIVER` | `s3` |
| `S3_BUCKET` | your bucket name |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (blank for AWS S3) |
| `S3_ACCESS_KEY_ID` | from step 2 |
| `S3_SECRET_ACCESS_KEY` | from step 2 |
| `S3_REGION` | leave blank for R2, or the bucket's region for AWS |
| `DEFAULT_MONTHLY_TOKEN_CAP` | e.g. `2000000` |
| `CLAUDE_GRID_MODEL` | see the timeout note below |

Do **not** set `AUTH_URL` — Auth.js reads Vercel's own URL, so preview deployments work too.

4. Deploy. `vercel.json` runs `prisma migrate deploy` during the build, so the schema is
   created on first deploy.

## 4. Seed it once

Migrations create the tables but not the starting data. The app needs one admin account and
the default grid layout, so run the seed once from your machine against the Neon database:

```bash
gh repo clone balaliss/teaching-app   # the repo is private; see docs/TESTING.md for auth
cd teaching-app && npm install

DATABASE_URL='<neon direct connection string>' \
DIRECT_URL='<neon direct connection string>' \
SEED_ADMIN_EMAIL='you@yourschool.org' \
SEED_ADMIN_PASSWORD='<a real password>' \
SEED_ADMIN_NAME='Your Name' \
npm run db:seed
```

Use the **direct** string here, not the pooled one. Then open your Vercel URL, sign in with
that email and password, and issue invites from `/admin/invites`.

If you skip this step, sign-in fails (no accounts exist) and generation reports
`No grid template found`.

---

## Things that will bite you

**Function timeout.** Grid generation is one Claude call and has to finish inside the
function's time limit. Vercel's Hobby plan caps functions at 60 seconds; `vercel.json` and
the route segment configs are set to that. An Opus call writing a full six-column grid can
run close to that ceiling on a long lesson.

- On **Hobby**: set `CLAUDE_GRID_MODEL=claude-sonnet-5`. Noticeably faster, and comfortably
  inside 60s.
- On **Pro**: `claude-opus-5` is fine. Raise `maxDuration` to `300` in `vercel.json`,
  `app/api/curricula/route.ts` and `app/lessons/[id]/page.tsx` (check Vercel's current plan
  limits first).

A timeout surfaces as a failed grid with an error on the lesson page — nothing is corrupted,
and you can just generate again.

**Upload size.** `next.config.ts` allows 25 MB and `MAX_UPLOAD_MB` defaults to 25. A full
Teacher Edition PDF can exceed that; raise both if uploads are rejected.

**Vercel Hobby is non-commercial.** Fine for you and a few colleagues trying it out. If this
becomes a district tool, that needs a Pro plan.

**Cold starts.** The first request after a quiet period takes a few seconds while the
function and a database connection spin up. Normal, not a bug.

**Licensed material leaves your machine.** Uploaded Teacher Editions land in your bucket and
lesson text goes to the Anthropic API at generation time. If your district objects to
third-party processing of Great Minds material, run the local Docker setup in the README
instead of deploying.

## Updating the deployment

Push to the production branch; Vercel rebuilds and reruns `prisma migrate deploy`. Re-running
`npm run db:seed` is safe — it upserts the admin and refreshes the default layout without
touching curricula or grids.
