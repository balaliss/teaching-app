# `.claude/` — how this repo steers Claude

Anything in here applies to everyone working in this repository, automatically. No
setup, no install. Clone the repo, open Claude Code, and it is in effect.

## What's here

```
.claude/
  skills/
    i-have-adhd/        how replies are formatted        (manual: /i-have-adhd)
    ponytail*/          how code gets written            (automatic on coding tasks)
    THIRD_PARTY.md      sources, commits, license notices
```

## The three you asked for

| | What it shapes | How it turns on |
|---|---|---|
| **i-have-adhd** | Output format — next action first, numbered steps, no tangents | `/i-have-adhd`, off with "stop adhd mode" |
| **ponytail** | Code — smallest thing that works, YAGNI, fewer dependencies | Automatic. `/ponytail lite\|full\|ultra`, off with "stop ponytail" |
| **gstack** | Product and vision reviews | **Not installed.** See below |

## Why gstack isn't in here

It isn't a skill; it's a 32 MB toolkit. Its `SKILL.md` is a router that dispatches to
sibling directories (`review`, `ship`, `qa`, `spec`, `retro`, `plan-ceo-review`,
`plan-design-review`, `plan-eng-review`) backed by 8 MB of `lib/`, its own `bin/`, and
`bun` dependencies. It also ships no `.claude-plugin/`, unlike the other two.

Copying just the router gives you a router pointing at nothing. Copying the whole thing
puts a third party's entire toolkit inside an application repo, where it would dwarf the
app and get stale immediately.

Use it from its own checkout instead:

```bash
git clone https://github.com/garrytan/gstack ~/src/gstack
```

Then from this repo, `/plugin marketplace add ~/src/gstack` and enable what you want —
the plan and review commands are the parts that speak to product direction.

## A tension worth knowing about

**ponytail is on by default and it argues for less.** That is usually right, and it is
why you added it. But it pulls against a few things this repo already does on purpose:

- Writing tests for a bug before fixing it
- Keeping `lib/access.ts` ownership checks on every query, even where a shortcut looks safe
- Verifying against a real database rather than mocks

If ponytail ever pushes toward dropping one of those, that's the skill doing its job in
the wrong place. `/ponytail lite` dials it back; "stop ponytail" turns it off.

## Adding more

Drop a directory under `.claude/skills/` containing a `SKILL.md` with `name` and
`description` frontmatter. If it came from someone else, record the source, the commit
you took it from, and its license in `THIRD_PARTY.md` — that file is what keeps the
vendored copies legitimate.
