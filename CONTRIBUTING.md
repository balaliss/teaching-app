# Contributing

## Getting it running

`docs/TESTING.md` is the step-by-step version, written for someone who has not seen
the code. The short version:

```bash
git clone https://github.com/balaliss/teaching-app && cd teaching-app
cp .env.example .env      # then fill in AUTH_SECRET, SEED_ADMIN_*, ANTHROPIC_API_KEY
docker compose up -d db
npm install && npm run db:migrate && npm run db:seed
npm run dev
```

You can do everything except generate grids without an `ANTHROPIC_API_KEY`.

## Before you open a pull request

```bash
npm run typecheck
npm test            # 28 unit tests, no API calls, no database
npm run build
npm run test:e2e    # needs a running app and a seeded database
```

CI runs all four against a real Postgres on every push. It does **not** have an API
key, so the end-to-end suite skips its live-generation assertions — if your change
touches generation, say in the PR how you verified it, because CI cannot.

## Things that will get a PR sent back

**Changing a `GridTemplate` row or column `key` that already has cells.** Keys are
storage identifiers on `GridCell`. Renaming a label is safe; renaming a key orphans
every cell stored under the old one.

**Putting a magic number in a component.** `TOKENS_PER_GRID` lives in `lib/quota.ts`
for a reason — it was copy-pasted into a page once and had to be pulled back out.

**Skipping the ownership helper.** Every read or write of a curriculum, lesson, or
grid goes through `lib/access.ts`. A raw Prisma query that filters by id but not by
owner is how you leak one teacher's material to another.

**Developer-facing copy in the UI.** The audience is teachers. `docs/TESTING.md`
explains the standard; the short version is short sentences and no jargon. If your
string mentions parsing, templates, schemas, or tokens, rewrite it.

**A new `.gitignore` pattern that isn't anchored.** `storage/` once matched
`lib/storage/` and silently kept three source files out of the repository. Write
`/storage/` unless you genuinely mean every directory of that name at any depth.

## Where things live

| Path | What it does |
|---|---|
| `lib/parse/witAndWisdom.ts` | Deterministic Module → Lesson → phase parser with a confidence score |
| `lib/parse/structureWithClaude.ts` | Fallback used only when the parser recognises too little |
| `lib/claude/generateGrid.ts` | Builds the tool schema from the template so output maps 1:1 onto cells |
| `lib/grids.ts` | Generation orchestration; teacher-edited cells survive regeneration |
| `lib/quota.ts` | Per-teacher monthly caps, checked before the API call |
| `lib/access.ts` | Ownership checks. Everything goes through here |
| `app/settings/templates/` | The grid shape, stored as data rather than code |

## Commit messages

Say what changed and why it mattered. If you fixed something subtle, say what the
symptom was — the next person to hit it will search for the symptom, not the fix.
