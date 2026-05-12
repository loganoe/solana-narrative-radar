# Jupiter Developer Experience Report

Project: Solana Narrative Radar

Repository: https://github.com/loganoe/solana-narrative-radar

Submission wallet: `6Da5nELroja5ngTwYZuofFur5V7gZCLvKVRX7iUahwz2`

## What I Built

Solana Narrative Radar is a static dashboard that turns Jupiter token signals and recent Solana developer activity into ranked ecosystem narratives and build ideas.

The refresh script pulls Jupiter token data from:

- `https://lite-api.jup.ag/tokens/v2/toptrending/24h`
- `https://lite-api.jup.ag/tokens/v2/toptraded/24h`
- `https://lite-api.jup.ag/tokens/v2/toporganicscore/24h`
- `https://lite-api.jup.ag/tokens/v2/recent`

It normalizes those responses into a single token signal model, scores each token by source rank, 24-hour volume, liquidity, verification, organic score, and source breadth, then combines token evidence with recently updated GitHub repositories to produce narrative cards.

## What Worked Well

- The Tokens V2 endpoints are fast and easy to call from a simple Node script. I did not need a generated client or a heavy SDK to get useful market context.
- The endpoint names are practical for product prototyping. `toptrending`, `toptraded`, `toporganicscore`, and `recent` map directly to distinct user questions.
- The token payload has enough fields for explainable ranking: symbol, name, tags, liquidity, market cap, holder count, verification state, organic score, first pool data, and 24-hour stats.
- The unauthenticated `lite-api.jup.ag` flow is useful for static reporting tools, scheduled snapshots, and demos where a private key or wallet connection would add unnecessary risk.

## Friction Points

- The token shape is not documented in a copy-paste friendly schema near the endpoint examples. I had to inspect live responses and defensively handle optional fields such as `stats24h`, `firstPool`, `tags`, and `organicScoreLabel`.
- Some numeric values can be absent or string-like depending on the token, so the integration has to coerce values carefully before scoring.
- `recent` is valuable but noisy. A small official guide for combining `recent` with verification, liquidity, and holder signals would help builders avoid surfacing low-quality tokens.
- Rate-limit guidance for scheduled public dashboards is not obvious from the endpoint itself. Even basic guidance like recommended polling cadence and retry headers would reduce guesswork.

## Suggested Improvements

- Add TypeScript interfaces or JSON Schema snippets for each Tokens V2 response family.
- Include a minimal "market intelligence dashboard" recipe that combines trending, traded, organic score, and recent token endpoints.
- Document which fields are stable contracts and which are best-effort enrichment fields.
- Add examples that show safe fallback behavior for missing `stats24h`, token icons, and tags.
- Publish practical rate-limit guidance for read-only dashboards and cron jobs.

## Outcome

The APIs were strong enough to build a useful prototype quickly. The biggest DX improvement would be sharper response contracts and examples aimed at analytics builders, not only swap-flow builders.
