# Ralph Progress

## Status: COMPLETE
## Stories: 6/6 complete

### Completed

- **Story 1** — `@anthropic-ai/sdk` installed, syntax verified
- **Story 2** — `api/insights.js` created, all 8 modes + system prompts, `claude-sonnet-4-6`
- **Story 3** — `public/index.html` updated: purple insights button, mode dropdown (8 options), full JS handler
- **Story 4** — `/article-insights` Claude Code skill created, already live in skills list
- **Story 5** — `helix-listen-insights` Vercel project created, all env vars added (MINIMAX + ANTHROPIC), `insights` branch deployed: https://helix-listen-insights.vercel.app
- **Story 6** — Smoke tested live: Executive Brief + Socratic Dialogue both return valid Claude responses. Full pipeline verified.

### Learnings

- `vercel dev` script in package.json causes recursive invocation — changed to avoid it
- To create a second Vercel project for same repo: back up `.vercel/project.json`, run `vercel link --project new-name --yes`, restore. Env vars must be re-added manually.
- Vercel queues first-time builds for new projects — expect a few minutes
- Two separate production URLs achieved: `main` = existing listen-app, `insights` = helix-listen-insights
