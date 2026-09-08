# Third-party skills

The skills in `.claude/skills/` are vendored copies of other people's work, not ours.
All three sources are MIT licensed, which permits this as long as the copyright notice
travels with the copy — that is what this file is for.

Vendored rather than installed as plugins so that anyone who clones this repository
gets them automatically, with no setup step. The cost is that they do not update
themselves: to refresh one, re-copy from the source repository and update the commit
recorded below.

## i-have-adhd

- Source: <https://github.com/ayghri/i-have-adhd>
- Vendored from commit `58494af` (2026-09-01)
- Copies: `skills/i-have-adhd/` verbatim
- What it does: shapes replies for a reader with ADHD — next action first, numbered
  steps, state restated each turn, tangents suppressed.
- Activation: **manual only** (`disable-model-invocation: true`). Run `/i-have-adhd`
  to turn it on; it stays on until you say "stop adhd mode".

## ponytail

- Source: <https://github.com/DietrichGebert/ponytail>
- Vendored from commit `356918e` (2026-09-07)
- Copies: `skills/ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-help`,
  `ponytail-debt`, `ponytail-gain` verbatim
- What it does: pushes for the smallest solution that works — YAGNI, standard library
  before dependencies, one line before fifty. Intensity levels: `lite`, `full`, `ultra`.
- Activation: **automatic on coding tasks.** Turn it off with "stop ponytail".

## gstack — not vendored

- Source: <https://github.com/garrytan/gstack>
- Inspected at commit `0530392` (2026-09-06), then deliberately left out.
- Why: it is a 32 MB toolkit, not a self-contained skill. Its `SKILL.md` is a router
  that dispatches to sibling directories (`review`, `ship`, `qa`, `spec`, `retro`,
  `plan-*`) backed by 8 MB of `lib/` and its own `bun` dependencies. Copying the router
  alone yields a router pointing at nothing; copying the whole thing puts someone
  else’s toolkit inside this application repository.
- To use it: clone it separately and install it as a plugin from there. See
  `.claude/README.md`.

---

## License notices

Reproduced as MIT requires. Each applies to the vendored copy of that project only;
this repository's own license is in `LICENSE` at the root.

### i-have-adhd

MIT License

Copyright (c) 2026 Ayoub Ghriss

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### ponytail

MIT License

Copyright (c) 2026 DietrichGebert

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
