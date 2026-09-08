# Try the app — start here

**You need:** a laptop, ~25 minutes, and a Teacher Edition PDF.

**You'll do:** install 3 things → paste 6 commands → upload a PDF → get a lesson grid.

If you get stuck, jump to [Something broke](#something-broke) at the bottom. Every error has a fix there.

---

# 🟩 Part 1 — Install 3 things

Skip anything you already have.

**1. Node** → [nodejs.org](https://nodejs.org) → click the big green **LTS** button → install it.

**2. Docker Desktop** → [docker.com](https://www.docker.com/products/docker-desktop/) → download → install → **open it**.

> ⚠️ Docker has to be *running*, not just installed. Look for the whale icon in your menu bar. Wait until it stops moving.

**3. A Claude API key** → [console.anthropic.com](https://console.anthropic.com) → **API Keys** → **Create Key** → copy it somewhere safe.

> ⚠️ Two gotchas:
> - You only see the key **once**. Copy it now.
> - Add ~$5 credit under **Billing**. A Claude.ai subscription does **not** work here. Different thing.

---

# 🟩 Part 2 — Six commands

Open **Terminal** (Mac) or **PowerShell** (Windows). Paste these one at a time.

### 1️⃣ Get the code

```bash
git clone -b claude/teaching-app-curriculum-grid-6331v5 https://github.com/balaliss/teaching-app
```

```bash
cd teaching-app
```

### 2️⃣ Make your settings file

```bash
cp .env.example .env
```

> Windows: use `copy .env.example .env`

### 3️⃣ Make a password key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Copy what it prints.** You need it in the next step.

### 4️⃣ Edit 4 lines

Open the `.env` file in any editor (VS Code, Notepad, TextEdit).

Find these 4 lines. Change **only** these 4. Leave everything else alone.

```
AUTH_SECRET="paste what step 3 printed"
SEED_ADMIN_EMAIL="your@email.com"
SEED_ADMIN_PASSWORD="make one up"
ANTHROPIC_API_KEY="sk-ant-... your key from Part 1"
```

**Save the file.**

> 💡 That email and password = your login. Write them down.

### 5️⃣ Start the database + install

```bash
docker compose up -d db
```

```bash
npm install
```

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

> ✅ **Look for this line:** `Admin account ready: your@email.com`
>
> 🛑 **Don't see it?** Your `.env` email/password lines are empty. Go back to step 4️⃣.

### 6️⃣ Run it

```bash
npm run dev
```

Open **http://localhost:3000** → log in with your email + password from step 4️⃣.

**🎉 You're in.**

> Keep that terminal window **open**. Closing it stops the app.
> To stop: `Ctrl+C`. To start again tomorrow: `docker compose up -d db` then `npm run dev`.

---

# 🟩 Part 3 — Test it (10 min)

Have your Teacher Edition open next to you — paper or PDF. You'll be comparing.

### ⬜ Upload

**Curricula** (top bar) → type any title → pick your PDF → **Upload and parse**

Wait ~30 seconds.

### ⬜ Check what it found ← *the important one*

You land on a page showing what the app pulled out of your PDF.

**Look at 4 things:**

- ⬜ Module title — right?
- ⬜ Focusing Question — right?
- ⬜ Lesson count — right?
- ⬜ Click a lesson open. Are Welcome / Launch / Learn / Land on the right chunks?

Wrong? **Fix it right there** — the boxes are editable. Then **Save structure**.

> 🛑 **A total mess?** That's genuinely useful to know — tell me. It means the app can't read your edition's layout yet. Fixable.

### ⬜ Pick a lesson

**Done — go to lessons** → click the lesson you'd teach next week.

You'll see an **empty grid**. Look at the column headings before you spend anything.

**Are those the columns you'd want?**

### ⬜ Generate

Click **Generate Emerging**.

Wait 20–60 seconds. That's Claude writing the whole grid.

Then click the **Expanding** and **Bridging** tabs → generate those too.

### ⬜ Edit something

Hover a cell → **Edit** → change the words → **Save**

It gets an **"edited"** badge.

Now click **Regenerate**.

> ✅ Your edit should survive untouched. Everything else refreshes.
>
> 🛑 Edit got wiped? **Bug. Tell me.**

### ⬜ Print

**Print view** → **Print / save as PDF** → pick **Landscape**

One page per level.

---

# 🟩 Part 4 — The 4 questions I need answered

I built and tested the machinery. I have **never seen it write a real instruction** — I had no API key.

So these are yours to answer:

### 1. Did it make anything up?
Handouts, page numbers, texts that **aren't in your Teacher Edition**.

*This is the big one.* Even one invented page number matters.

### 2. Do the 3 levels actually feel different?
Emerging should have more support than Bridging. Same text, same thinking — different scaffolding.

> 💡 **All three read the same?** You can fix that yourself. Go to **Proficiency levels** and write a more specific description of each band. That description is exactly what Claude reads to decide how much support to give. Vague in → vague out.

### 3. Are the columns right?
Right now: *Minutes · Teacher says & does · Students do · Materials · Language objective · Check for understanding*

Wrong ones? Missing one? Go to **Grid layout** → add / remove / rename → regenerate.

No code needed. Each column has a **"Hint for Claude"** box — that's the steering wheel.

### 4. Could a sub teach from it?
That was the whole point. If not — what's missing?

---

# Something broke

| You see | Do this |
|---|---|
| `docker: command not found` | Docker isn't running. Open Docker Desktop, wait for the whale to settle. |
| `Can't reach database server` | `docker compose up -d db` → wait 10 sec → try again |
| Login says "did not work" | Re-run `npm run db:seed`. Check your `.env` email/password. |
| `No grid template found` | You skipped the seed. Run `npm run db:seed` |
| `ANTHROPIC_API_KEY is not configured` | Key line in `.env` is empty. Fill it → `Ctrl+C` → `npm run dev` again. |
| A billing / credit error | Add credit at console.anthropic.com → Billing |
| `Monthly generation limit reached` | **Usage** in top bar → clear your cap box → **Set** |
| "larger than the 25 MB limit" | Change `MAX_UPLOAD_MB` in `.env` → restart |
| `Port 3000 already in use` | `npm run dev -- -p 3001` → use localhost:3001 |

**Anything else:** copy the red text from the terminal and send it to me.

---

# 💰 What it costs

| | 1 grid | 1 lesson (3 levels) | Whole module (35 lessons) |
|---|---|---|---|
| Default (Opus) | ~13¢ | ~40¢ | ~$14 |
| Cheaper (Sonnet) | ~5¢ | ~15¢ | ~$5 |

Estimates. Watch the real number under **Usage** in the top bar.

**Want the cheap one?** Put `CLAUDE_GRID_MODEL="claude-sonnet-5"` in `.env`, restart.

Built-in safety net: each teacher is capped at ~150 grids/month. It stops before spending, not after.

---

<details>
<summary><strong>Optional extras</strong> (click to open)</summary>

**Check teachers can't see each other's stuff**

**Invites** → create one → open the link in a private window → sign up as a second teacher.
That teacher should see nothing of yours, and get bounced from admin pages.

**Run the automated tests**

Second terminal, same folder:

```bash
npm test
npm run test:e2e
```

All should pass. These also run automatically on GitHub for every change — if the badge on the README goes red, something broke.

</details>
