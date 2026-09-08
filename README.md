# Teaching App

[![CI](https://github.com/balaliss/teaching-app/actions/workflows/ci.yml/badge.svg)](https://github.com/balaliss/teaching-app/actions/workflows/ci.yml)

Turns a **Wit & Wisdom ELD** Teacher Edition into an explicit, printable instruction
grid for the specific lesson being taught — one version per language-proficiency band.

Upload the Teacher Edition once per module. The app pulls out the modules, lessons and
lesson phases (Welcome, Launch, Learn, Land, Wrap), you confirm what it found, and then
Claude expands any lesson into step-by-step teaching instructions laid out as a grid you
can print and teach from.

> **This repository contains no curriculum content.** Wit & Wisdom and Wit & Wisdom ELD
> are published by Great Minds and are licensed material. Nothing from them is included
> here — not lesson text, not module content, not sample pages. The parser recognises
> their *structure* (the words "Module", "Lesson", and the Welcome / Launch / Learn /
> Land headings), which is public knowledge about how the programme is organised.
>
> To use this you supply your own licensed Teacher Edition. Uploaded files stay private
> to the account that uploaded them, and lesson text is sent to the Anthropic API when a
> grid is generated. If your district restricts third-party processing of Great Minds
> material, run the local Docker setup below rather than deploying it.

## What a teacher does

1. **Sign in.** Accounts are invite-only; an admin issues invite links from `/admin/invites`.
2. **Set the proficiency bands** (`/settings/levels`) — Emerging / Expanding / Bridging by
   default, or WIDA's six, or whatever the district uses. The description you write for each
   band is what tells Claude how heavily to scaffold.
3. **Upload a Teacher Edition** (`/curricula`). PDF, DOCX and XLSX are accepted.
4. **Confirm the structure** (`/curricula/<id>/review`). Teacher Edition layouts vary between
   grades and printings, so anything the parser got wrong is fixed here. The phase text on
   this page is exactly what Claude reads.
5. **Open the lesson** and hit Generate. Tabs switch the same grid between proficiency bands.
6. **Edit any cell** you disagree with. Edited cells are marked and are preserved when you
   regenerate — the rest of the grid refreshes around them.
7. **Print** (`/lessons/<id>/print`) — one landscape page per band.

## The grid shape is configurable

Rows and columns live in the database as data, not in code, so the layout can change from
`/settings/templates` without a migration. The seeded default is:

| | Minutes | Teacher says & does | Students do | Materials | Language objective | Check for understanding |
|---|---|---|---|---|---|---|
| **Welcome** | | | | | | |
| **Launch** | | | | | | |
| **Learn** | | | | | | |
| **Land** | | | | | | |
| **Wrap** | | | | | | |

Each row and column carries a **hint** that is passed to Claude, so the hint is the most
direct way to control what lands in a cell. Existing grids keep the cells they already have
when the layout changes; regenerate a lesson to fill any new rows or columns.

## Running it locally

**New here? Read [docs/TESTING.md](docs/TESTING.md)** — a step-by-step walkthrough of setup
and what to check, written for someone who has not touched the code.

The short version. Requires Node 22+ and Postgres 16.

```bash
cp .env.example .env          # then edit: AUTH_SECRET, SEED_ADMIN_*, ANTHROPIC_API_KEY
docker compose up -d db       # or point DATABASE_URL at any Postgres
npm install
npm run db:migrate            # creates the schema
npm run db:seed               # default grid layout + the admin account from .env
npm run dev                   # http://localhost:3000
```

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

To run the whole stack in containers instead: `docker compose --profile full up --build`.

### Environment variables

Everything is documented in `.env.example`. The ones that matter:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Local Docker, Neon, Fly, Render all work |
| `DIRECT_URL` | Unpooled connection string; only needed on a pooled host such as Neon |
| `AUTH_SECRET` | Session signing key |
| `ANTHROPIC_API_KEY` | One shared server-side key; never reaches the browser |
| `CLAUDE_GRID_MODEL` | Model used to write the grids (default `claude-opus-5`) |
| `CLAUDE_STRUCTURE_MODEL` | Cheaper model used only when the deterministic parser fails (default `claude-sonnet-5`) |
| `DEFAULT_MONTHLY_TOKEN_CAP` | Token allowance given to newly registered teachers |
| `STORAGE_DRIVER` | `disk` for a single machine, `s3` for any S3-compatible bucket |

## Costs and limits

Generation runs on one shared server-side key, so every account has a monthly token
allowance. The cap is checked *before* the API call and usage is recorded after, so a
teacher who over-generates gets a "limit reached" message rather than running up a bill.
Admins see per-teacher usage and can raise or remove any cap at `/admin/usage`.

The deterministic parser handles well-formed Teacher Editions for free; Claude is only
asked to identify structure when that parser recognises too little.

## Architecture

| Path | What lives there |
|---|---|
| `prisma/schema.prisma` | Data model. `GridTemplate.rows`/`.columns` hold the grid shape as JSON |
| `lib/parse/extract.ts` | PDF / DOCX / XLSX → text with page boundaries preserved |
| `lib/parse/witAndWisdom.ts` | Deterministic Module → Lesson → phase parser, with a confidence score |
| `lib/parse/structureWithClaude.ts` | Fallback structuring pass for layouts the parser does not recognise |
| `lib/claude/generateGrid.ts` | Builds the tool schema from the template, so output maps 1:1 onto cells |
| `lib/quota.ts` | Per-teacher monthly caps, checked before each call |
| `lib/grids.ts` | Generation orchestration; teacher-edited cells survive regeneration |
| `lib/storage/` | `disk` and `s3` drivers behind one interface |
| `app/lessons/[id]/` | The grid workspace and the print view |
| `app/settings/` | Grid layout and proficiency-band settings |

## Tests

```bash
npm test        # parser, grid template validation, quota maths, PDF extraction
npm run test:e2e
```

The end-to-end suite needs the app running (`npm run dev` or `npm start`) and a seeded
database. It covers sign-in, invites, upload and parse, structure corrections, changing the
grid layout, per-teacher isolation, and the print view. Live generation is only asserted
when `ANTHROPIC_API_KEY` is set, so the suite is free to run without one.

If Playwright's own browsers are not downloaded, point it at an existing Chromium:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run test:e2e
```

## Deploying

**Vercel + Neon + Cloudflare R2: see [docs/DEPLOY.md](docs/DEPLOY.md)** for the full
walkthrough, including the two Neon connection strings, R2 token scopes, the one-time seed
step, and the function-timeout trap that decides which Claude model to use.

Self-hosting instead: the Dockerfile builds a standalone server bundle (`BUILD_STANDALONE=1`),
so the image runs anywhere. Set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` and `ANTHROPIC_API_KEY`, run
`npx prisma migrate deploy && npm run db:seed`, and switch `STORAGE_DRIVER` to `s3` if the
host has no persistent disk.

## License

[MIT](LICENSE) — use it, change it, run it in your district. No warranty.

The licence covers **this software only**. It says nothing about Wit & Wisdom, which
remains Great Minds' copyrighted material and needs your own licence.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports go through
[private advisories](https://github.com/balaliss/teaching-app/security/advisories/new),
not public issues — see [SECURITY.md](SECURITY.md).
