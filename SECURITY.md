# Security

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's private reporting instead: go to the
[Security tab](https://github.com/balaliss/teaching-app/security/advisories/new)
and open a draft advisory. That stays private between you and the maintainers until
it's fixed.

If that isn't available to you, open a normal issue saying only that you have a
security report and asking for a private channel — no details in the issue itself.

Expect a first reply within a week. This is a small project maintained part-time; it
has no paid support and no formal SLA.

## What counts as sensitive here

This app handles three things worth attacking, so reports about them are especially
welcome:

**A shared Claude API key.** Generation runs on one server-side key
(`ANTHROPIC_API_KEY`). Anything that lets a signed-in teacher bypass their monthly
token cap, or that exposes the key to the browser, is a real finding — it costs the
operator money directly.

**Other teachers' uploaded curriculum.** Uploads are private per account. Any path
that reads, lists, or infers another account's curriculum, lessons, or generated
grids is a finding. Ownership is enforced in `lib/access.ts`; a missing check
somewhere that bypasses it is exactly the bug worth reporting.

**Teacher accounts.** Sign-up is invite-only by design. Anything that allows account
creation without a valid unused invite, or that lets one teacher escalate to ADMIN,
is a finding.

## What is not a finding

- The absence of rate limiting on login. Known gap, not yet addressed.
- Uploaded files being sent to the Anthropic API. That is the documented purpose of
  the app, disclosed in the UI and in `README.md`.
- Anything requiring server or database access you already have.

## Operators: your responsibilities

If you deploy this, the following are yours and not the project's:

- Keep `ANTHROPIC_API_KEY` and `AUTH_SECRET` out of version control. `.env` is
  gitignored; keep it that way.
- Set a real `DEFAULT_MONTHLY_TOKEN_CAP`. Without it, one account can spend without
  limit on your key.
- Uploaded Teacher Editions are licensed third-party material. Restricting who can
  reach your deployment is your call to make and your obligation to honour.
