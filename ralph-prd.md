# Ralph PRD: Insights Feature (Helix-only Branch)

## Goal
Add "Insights → Audio" to Helix Listen on a separate `insights` branch with its own Vercel deployment — family/friends keep the clean `main`, Suhit gets the full Claude-powered insights experience.

## Context
- Branch: `insights` (branched from `main`)
- Separate Vercel project: `listen-app-insights` tracking the `insights` branch
- New endpoint: `api/insights.js` — calls Claude API to transform text via 8 insight modes
- New Claude Code skill: `/article-insights` — terminal output + Helix Mind ecosystem capture
- Existing endpoints (`/api/extract`, `/api/speak`) unchanged

## Stories

- [x] **Story 1:** Install `@anthropic-ai/sdk` and verify
  - Verify: `node -e "require('@anthropic-ai/sdk'); console.log('OK')"` prints `OK`

- [x] **Story 2:** Create `api/insights.js` with all 8 mode prompts
  - Verify: `curl` test against `vercel dev` returns valid JSON with transformed text

- [x] **Story 3:** Update `public/index.html` — add Insights button, mode dropdown, JS handler
  - Verify: Both buttons visible in browser, Insights → Audio flow completes end-to-end locally

- [x] **Story 4:** Create `/article-insights` Claude Code skill
  - Verify: Skill file exists at correct path, mode menu + ecosystem capture work in test session

- [x] **Story 5:** Create separate Vercel project for `insights` branch + add env vars
  - Verify: Live URL resolves, `/api/insights` returns valid response

- [ ] **Story 6:** Smoke test full flow on live URL + push branch
  - Verify: Insights → Audio plays on production, original Convert to Audio still works

## Constraints
- Node 18+, Vercel serverless, ES modules (`import/export`)
- Model: `claude-sonnet-4-6`
- `main` branch must remain untouched — all changes on `insights` branch only
- No test framework — verify with curl + browser checks
- Keep `/api/speak` and `/api/extract` exactly as they are

## Progress Log
<!-- Updated after each completed story -->
