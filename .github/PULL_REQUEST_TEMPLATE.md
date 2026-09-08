## What this changes

<!-- One or two sentences. What is different after this merges? -->

## Why

<!-- The problem or need. If it fixes an issue, link it: Fixes #123 -->

## How it was verified

<!-- Tick what you actually ran. CI runs all four, but it has no API key. -->

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] Ran the app and used the change (say what you did)

<!-- If this touches grid generation, CI cannot verify it. Say how you did. -->

## Anything a reviewer should look at closely

<!-- Delete if nothing. Worth flagging:
     - a GridTemplate row/column key change (orphans stored cells)
     - a new database migration
     - a query that reads curricula, lessons or grids (ownership via lib/access.ts)
     - user-facing copy (audience is teachers; short sentences, no jargon)
-->
