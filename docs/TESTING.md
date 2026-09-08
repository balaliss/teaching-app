# How to test this — start here

Plain-English walkthrough for getting the app running on your own laptop and trying it
properly. **Everything runs on your machine.** No accounts to create except one Claude API
key, no cloud, no cost beyond a few cents of API usage.

Total time: about 15 minutes to set up, 10 minutes to test.

> Doing the Vercel deployment instead so colleagues can log in? Do **this** first anyway —
> if it doesn't work locally, it won't work deployed. Then see [DEPLOY.md](DEPLOY.md).

---

# Part 1 — Set it up (15 min)

## Before you start: install three things

| Thing | Why | Where |
|---|---|---|
| **Node 22 or newer** | Runs the app | [nodejs.org](https://nodejs.org) — take the LTS download |
| **Docker Desktop** | Runs the database, so you don't have to install Postgres | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **A Claude API key** | Writes the lesson instructions | [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key |

**About the API key:** it starts with `sk-ant-`. You'll see it once — copy it somewhere safe.
You need a few dollars of credit on the account (Billing → add credit). This is separate from
a Claude.ai subscription; a Pro/Max plan does **not** give you API credit.

Open Docker Desktop and leave it running. If its whale icon isn't steady, nothing below works.

## Step 1 — Get the code

Open Terminal (Mac) or PowerShell (Windows) and paste:

```bash
git clone -b claude/teaching-app-curriculum-grid-6331v5 https://github.com/balaliss/teaching-app
cd teaching-app
```

✅ You should see: a new `teaching-app` folder, and your prompt now inside it.

## Step 2 — Make your settings file

```bash
cp .env.example .env
```

On Windows PowerShell use `copy .env.example .env` instead.

✅ You should see: nothing. Silence means it worked.

## Step 3 — Fill in four settings

Open the new `.env` file in any text editor (VS Code, Notepad, TextEdit). Change **only these
four lines** — leave everything else exactly as it is:

```
AUTH_SECRET="<paste the random string from below>"
SEED_ADMIN_EMAIL="you@yourschool.org"
SEED_ADMIN_PASSWORD="pick-a-real-password"
ANTHROPIC_API_KEY="sk-ant-..."
```

To generate the random string for `AUTH_SECRET`, run this and paste what it prints:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are the login you'll use in a minute. Make them
something you'll remember. Save the file.

## Step 4 — Start the database

```bash
docker compose up -d db
```

✅ You should see: `Container teaching-app-db-1  Started`

## Step 5 — Install and set up

Three commands, one at a time:

```bash
npm install
npm run db:migrate
npm run db:seed
```

✅ You should see, in order:
- `npm install` → a few hundred packages added (takes 1–2 minutes, warnings are normal)
- `npm run db:migrate` → `Your database is now in sync with your schema`
- `npm run db:seed` → `Created default grid template ...` and `Admin account ready: you@yourschool.org`

**That last line is the one that matters.** If you don't see "Admin account ready", you can't
log in. Go back to Step 3 and check the email and password lines are filled in.

## Step 6 — Run it

```bash
npm run dev
```

✅ You should see: `✓ Ready in ...` and `- Local: http://localhost:3000`

Open **http://localhost:3000** in your browser. You'll get a sign-in page. Log in with the
email and password from Step 3.

**Leave this terminal window open** — closing it stops the app. To stop it later, press
`Ctrl+C`. To start again another day: `docker compose up -d db` then `npm run dev`.

---

# Part 2 — Test it (10 min)

Have your Wit & Wisdom ELD Teacher Edition PDF handy, and the paper/PDF version open beside
you so you can compare.

## 1. Upload

Click **Curricula** in the top bar. Fill in:
- **Title** — anything, e.g. "Grade 3 ELD — Module 1"
- **Grade band** — e.g. "Grade 3" (optional)
- **File** — your Teacher Edition PDF

Click **Upload and parse**. Takes 5–30 seconds depending on the file size.

## 2. Check what it found — *this is the important screen*

You land on the structure page automatically. This tells you whether the app understood your
PDF. Look at:

- Is the **module title** right?
- Is the **Focusing Question** right?
- Does the **lesson count** look right? (top of the page: "1 module(s) · 12 lesson(s)")
- Click a lesson open. Are **Welcome / Launch / Learn / Land** attached to the right chunks
  of text?

Anything wrong, fix it right here — the boxes are editable, and there are Add/Remove buttons.
Then click **Save structure**.

> **If it found nothing or made a mess:** that's useful information, not a dead end. The app
> falls back to asking Claude to read the layout, and you can also build the structure by
> hand. Either way, **tell me what you saw** — that's the parser needing to learn your
> edition's layout, and it's fixable.

## 3. Pick a lesson

Click **Done — go to lessons**, then click the lesson you'd actually teach next week.

You'll see an **empty grid** with your rows and columns. Look at it before generating —
are those the six columns you'd want? (You can change them later; see Part 3.)

## 4. Generate

Click **Generate Emerging**. Wait 20–60 seconds — this is Claude writing the whole grid.

Then click the **Expanding** and **Bridging** tabs and generate those too, or use
**Generate all 3 levels**.

## 5. Try editing

Hover over any cell → click **Edit** → change the text → **Save**. The cell gets an
orange **"edited"** badge.

Now click **Regenerate**. Your edited cell should stay exactly as you wrote it while
everything else refreshes. **If your edit gets wiped, that's a bug — tell me.**

## 6. Print

Click **Print view** → **Print / save as PDF**. Choose **Landscape** in the print dialog.
You get one page per proficiency level.

---

# Part 3 — What to actually judge

The mechanics above I've already tested. What I could **not** test is whether the writing is
any good — I had no API key. That's the real question, and it needs you with the Teacher
Edition open next to the screen.

Four things to look for:

### 1. Does it make things up?
The biggest risk. Check for handouts, page numbers, texts or assessments that **aren't in
your Teacher Edition**. I wrote the prompt to forbid this, but it's the failure mode to hunt
for. Even one invented page number is worth reporting.

### 2. Are the three levels actually different?
Emerging and Bridging should differ in *support* — supplied vs. student-generated sentence
frames, how much is read aloud, how much vocabulary is pre-taught — but engage the same text
and the same thinking.

**If the three tabs read almost identically**, that's fixable by you: go to **Proficiency
levels**, and write a more concrete description of what each band can and can't do. That
description is exactly what Claude reads to decide how much to scaffold. Vague description in,
vague differentiation out.

### 3. Are these the right columns?
The open design question. Right now: *Minutes · Teacher says & does · Students do · Materials ·
Language objective · Check for understanding.*

If a column is useless, or something's missing, go to **Grid layout** and change it —
add, remove, rename, reorder. No code change needed. Each row and column has a **"Hint for
Claude"** box, and that hint is the steering wheel for what lands in that cell. Change it,
regenerate a lesson, compare.

### 4. Could a substitute teach from it?
That was the design target. If a sub couldn't pick it up and run the lesson, say what's
missing.

---

# Part 4 — If something breaks

| What you see | What it means | Fix |
|---|---|---|
| `docker: command not found` | Docker Desktop isn't installed or isn't running | Install it, open it, wait for the whale icon to settle |
| `Can't reach database server` | The database container isn't up | `docker compose up -d db`, wait 10 seconds, retry |
| Login says "that combination did not work" | The seed didn't run, or the password is different | Re-check Step 3, then re-run `npm run db:seed` |
| `No grid template found` | The seed step was skipped | `npm run db:seed` |
| `ANTHROPIC_API_KEY is not configured` | The key line in `.env` is empty | Fill it in, then stop (`Ctrl+C`) and restart `npm run dev` — `.env` is only read at startup |
| Generation fails with a credit/billing error | The API account has no credit | Add credit at console.anthropic.com → Billing |
| `Monthly generation limit reached` | You hit the built-in token cap | **Usage** in the top bar → clear your cap box → **Set** |
| "That file is larger than the 25 MB limit" | Big Teacher Edition | Raise `MAX_UPLOAD_MB` in `.env`, restart |
| Port 3000 already in use | Something else is running there | `npm run dev -- -p 3001`, then use localhost:3001 |

**Anything else — copy the red error text and send it to me.** The terminal window running
`npm run dev` is where the useful errors appear.

---

# Part 5 — What it costs

Generating one grid is one Claude call: roughly 10,000 tokens in (the lesson text) and 3,000
out (the grid).

| | Per grid | One lesson, all 3 levels | A whole 35-lesson module × 3 levels |
|---|---|---|---|
| **Opus 5** (default, best writing) | ~$0.13 | ~$0.40 | ~$14 |
| **Sonnet 5** (faster, cheaper) | ~$0.05 | ~$0.15 | ~$5 |

Estimates, not a quote — real cost depends on how long your lessons are. Watch actual usage
at **Usage** in the top bar, or in the Anthropic console.

To try the cheaper model: set `CLAUDE_GRID_MODEL="claude-sonnet-5"` in `.env` and restart.
Generate the same lesson both ways and see whether you can tell the difference — that's a
worthwhile test in itself.

The built-in cap (`DEFAULT_MONTHLY_TOKEN_CAP`) is 2,000,000 tokens/month per teacher, which is
roughly **150 grids a month** each. It stops runaway spending before the API call is made.

---

# Part 6 — Optional extras

**Check nobody can see each other's stuff.** Go to **Invites** → create one → open the link in
a private/incognito window → register as a second teacher. That teacher should see an empty
Curricula list, get a 404 on your curriculum's URL, and be bounced away from the admin pages.

**Run the automated tests.** In a *second* terminal window, in the same folder:

```bash
npm test          # 28 checks: the PDF parser, the grid layout rules, the spending cap, file storage
npm run test:e2e  # 4 browser tests that click through the app (needs `npm run dev` still running)
```

All should pass. These also run automatically on GitHub for every push, so if you change
something and the badge at the top of the README goes red, that tells you what broke. With your API key set, `npm run test:e2e` also tests real generation —
the one thing I couldn't run.

---

# What to tell me

After you've been through it, the most useful feedback is:

1. **Did the structure page get your PDF right?** (the make-or-break step)
2. **Did it invent anything?**
3. **Are the columns right, or what would you change?**
4. **Do the three levels feel meaningfully different?**
5. Anything that errored — with the red text.
