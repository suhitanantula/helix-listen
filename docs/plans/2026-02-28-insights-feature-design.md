# Insights Feature Design
**Date:** 2026-02-28
**Status:** Approved

---

## Overview

Add an "Insights → Audio" capability to Helix Listen that transforms articles, PDFs, and text through 8 AI-powered insight modes before converting to audio. The same transformation engine is also exposed as a Claude Code skill (`/article-insights`) that shows output in terminal and captures it into the Helix Mind intellectual ecosystem.

---

## Two Surfaces, One Engine

```
Content (URL / PDF / Markdown / Text)
        │
        ▼
   /api/insights  ──── Claude API (claude-sonnet-4-6)
        │                    │
        │              mode-transformed text
        │
   ┌────┴─────────────────────────────────┐
   │                                      │
   ▼                                      ▼
Helix Listen                    Claude Code Skill
/api/speak → audio player       terminal output +
                                 ecosystem .md file
```

---

## Surface 1: Helix Listen (Web App)

### UI Change

Below the existing "Convert to Audio" button, a second button + inline dropdown:

```
[ 🎙️  Convert to Audio          ]
[ 💡  Insights → Audio   [mode ▾] ]
```

The mode dropdown contains all 8 insight modes. Default: Key Takeaways.

### Flow

`extract → /api/insights (Claude) → /api/speak (MiniMax) → audio player`

The existing "Convert to Audio" path is unchanged.

### New Endpoint: `api/insights.js`

- **Input:** `{ text, title, mode }`
- **Process:** Calls Claude API with a mode-specific system prompt
- **Output:** `{ text, title, wordCount, estimatedMinutes }` — same shape as extract output so it drops straight into the existing speak call
- **Model:** `claude-sonnet-4-6`

### New Environment Variable

`ANTHROPIC_API_KEY` — added to Vercel project settings.

---

## Surface 2: Claude Code Skill (`/article-insights`)

### Invocation

User types `/article-insights` with a URL, PDF path, or pastes text. The skill interactively asks one question:

```
Which insight mode?
  1. Key Takeaways
  2. Executive Brief
  3. Socratic Dialogue
  4. Framework Extraction
  5. Breakthrough Lens
  6. Analogy Mode
  7. Cross-Domain Scout
  8. Author's Voice
```

### What Happens

1. Fetch and extract the content (URL via fetch + Readability, PDF via path, or raw text)
2. Call Claude with the chosen mode prompt
3. Display the transformed insight in terminal
4. Save a structured `.md` file to:
   `helix-mind/intellectual_ecosystem/research_library/ingested_articles/`
5. Offer to commit to helix-mind git

### Ecosystem File Structure (Option C)

The saved file follows the exact `INGESTION_PROCESS.md` format, with the mode output added as a named section above the standard analysis:

```markdown
# [Article Title]

**Source:** [URL / path]
**Date Ingested:** YYYY-MM-DD
**Insight Mode:** [mode name]

---

## 💡 Insight: [Mode Name]

[Mode-transformed content — the Socratic dialogue / framework / analogy / etc.]

---

## Executive Summary
[2-3 sentence summary]

---

## LLV Analysis
**Dominant Rhythm:** [Lines / Loops / Vibes]
**Signature:** [e.g., ▲▲⟳〰️]
**Frequency:** [20Hz / 60Hz / 95Hz]
**Why:** [explanation]

---

## Framework Connections
| Framework | Relevance | Connection |
|-----------|-----------|------------|
[All 13 frameworks checked]

---

## Market Relevance
| Market | Relevance | Application |
[5 markets checked]

---

## Key Insights
1. ...

---

## Quotable Passages
> "[quote]"

---

## Full Content
[Complete article text]
```

---

## The 8 Insight Modes

| Mode | Name | What it produces |
|------|------|-----------------|
| `takeaways` | Key Takeaways | "5 ideas worth your attention..." as flowing narration |
| `executive` | Executive Brief | Situation / So What / Now What — consulting style |
| `socratic` | Socratic Dialogue | Two voices (Host + Challenger) probing and questioning the ideas |
| `framework` | Framework Extraction | Pulls out the underlying structural model or pattern |
| `breakthrough` | Breakthrough Lens | What's genuinely novel? What would you do with it? |
| `analogy` | Analogy Mode | Distils to one killer analogy + explanation |
| `cross-domain` | Cross-Domain Scout | Connects the content to other fields and domains |
| `authors-voice` | Author's Voice | Condenses to ~30% preserving the writer's style and voice |

---

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| LLM for insights | Claude API (`claude-sonnet-4-6`) | Suhit's primary tool; best reasoning |
| Insights endpoint style | Separate `/api/insights` | Modular; speak endpoint unchanged |
| Skill output | Terminal + ecosystem file (Option C) | Mode output + structured capture = full intelligence |
| Skill interaction | Interactive mode selection | Better UX than flags |
| Ecosystem format | Extends `INGESTION_PROCESS.md` exactly | Consistent with existing research library |

---

## Files to Create / Modify

### Listen App
- `api/insights.js` — new endpoint (Claude API → transformed text)
- `public/index.html` — add Insights button + mode dropdown
- `.env` / Vercel settings — add `ANTHROPIC_API_KEY`

### Claude Code Skill
- `/Users/suhitanantula/.claude/skills/article-insights/` — new skill directory
  - `skill.md` — skill definition and prompts for all 8 modes

---

## Out of Scope

- Showing the transformed text before audio generation (future "preview" option)
- Batch processing multiple articles at once
- Storing audio in the ecosystem (audio stays in Listen only)
