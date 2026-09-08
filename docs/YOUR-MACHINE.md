# Working on this from another computer

Everything in this guide is a one-time setup per machine. Do it once at home and
once at work; after that it's `npm run dev` and you're going.

---

# What follows the code, and what doesn't

This trips everyone up once. There are **two separate places** the project's rules live.

## ✅ Comes with the code

`git clone` gets you all of this. Nothing to configure, nothing to install.

| | |
|---|---|
| `.claude/skills/` | The ADHD output style and the ponytail code skills. Live the moment you open Claude Code in the folder. |
| `.github/workflows/ci.yml` | The tests that run on every push — on GitHub's computers, not yours. |
| PR and issue templates | Only do anything on github.com, but they travel. |
| `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` | Just there. |

## ✅ Lives on GitHub, not in the code

You will never find these in a file. They're settings on the repository itself, which
means they apply **no matter which computer you push from** — including a brand new one.

| | |
|---|---|
| The rule on `main` | Requires a PR and green CI. Nobody can push straight to `main`. |
| Secret scanning + push protection | Blocks a commit containing an API key before it leaves your laptop. |
| Repo visibility | Public. |

## ❌ Does NOT travel — you redo it per machine

| | Why |
|---|---|
| `.env` | It holds your API key. A key in a public repo is a stolen key. |
| The database | Each machine runs its own. |
| Git login | One `gh auth login` per computer. |

> ### ⚠️ The one that surprises people
>
> **Your home copy is a completely separate app.** Different database, different
> accounts, different uploads. Curriculum you upload at work will **not** be at home.
>
> If you want one instance with your data everywhere, deploy it — see
> [DEPLOY.md](DEPLOY.md). Otherwise treat work and home as two sandboxes.

---

# Setting up a new machine

## 1. Install three things

- **Node 22+** → [nodejs.org](https://nodejs.org), the green LTS button
- **Docker Desktop** → [docker.com](https://www.docker.com/products/docker-desktop/) — then **open it** and wait for the whale icon to stop moving
- **Claude Code** → [claude.com/claude-code](https://claude.com/claude-code)

## 2. Get the code

```bash
git clone https://github.com/balaliss/teaching-app
```

```bash
cd teaching-app
```

## 3. Make your settings file

```bash
cp .env.example .env
```

Open `.env` and change **only these four lines**:

```
AUTH_SECRET="<paste from the command below>"
SEED_ADMIN_EMAIL="your@email.com"
SEED_ADMIN_PASSWORD="make one up"
ANTHROPIC_API_KEY="sk-ant-..."
```

For `AUTH_SECRET`, run this and paste what it prints:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Your API key comes from [console.anthropic.com](https://console.anthropic.com) → API Keys.
It needs a few dollars of credit. **A Claude.ai subscription is not the same thing** and
will not work.

## 4. Start it

```bash
docker compose up -d db
```

```bash
npm install && npm run db:migrate && npm run db:seed
```

> ✅ Look for `Admin account ready: your@email.com`. No such line means step 3 didn't
> take — check the email and password lines.

```bash
npm run dev
```

Open <http://localhost:3000> and log in with the email and password from step 3.

## 5. To push code from this machine

```bash
gh auth login
```

Answer: **GitHub.com** → **HTTPS** → **Y** → *Login with a web browser*.

Remember the rule on `main`: work on a branch, open a PR, let CI pass, then merge.
Pushing straight to `main` is blocked on purpose.

---

# Making the skills apply to *everything* you work on

By default the skills in `.claude/skills/` only apply **inside this repo**. To have them
in every project on a machine, copy them to your personal folder:

```bash
mkdir -p ~/.claude/skills
```

```bash
cp -R .claude/skills/i-have-adhd .claude/skills/ponytail* ~/.claude/skills/
```

Run that from inside the `teaching-app` folder, once per computer.

`~/.claude/skills/` lives on your machine and belongs to no repo, so it follows **you**
instead of the code. Keeping both copies is fine — the ones in this repo keep working
for anyone else who clones it.

**To update them later**, re-copy from a fresh clone of the source projects and update
the commit recorded in `.claude/skills/THIRD_PARTY.md`. Vendored copies don't update
themselves; that's the trade for them being there with no install step.

---

# Coming back after a break

```bash
cd teaching-app && git pull
docker compose up -d db
npm install          # only if package.json changed
npm run dev
```

If `git pull` brings in a database change, run `npm run db:migrate` too.
