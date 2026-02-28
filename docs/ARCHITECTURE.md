# Helix Listen — Architecture

## Overview

Two parallel deployments from the same repository:

| Branch | Vercel Project | Audience | Features |
|--------|---------------|----------|---------|
| `main` | `helix-listen` | Family & friends | URL → Audio, PDF → Audio, Markdown → Audio, Paste Text → Audio |
| `insights` | `helix-listen-insights` | Suhit only | All of the above + Insights layer + Helix Mind ecosystem capture |

---

## Tech Stack

- **Hosting:** Vercel (serverless, Node 18+, ES modules)
- **TTS:** MiniMax `speech-2.6-hd` via `api/speak.js`
- **AI Insights:** Anthropic SDK — `claude-sonnet-4-6` (insight generation), `claude-haiku-4-5-20251001` (metadata)
- **PDF extraction:** PDF.js (client-side, no server needed)
- **Ecosystem capture:** GitHub Contents API (PUT to `suhitanantula/helix-mind`)
- **Frontend:** Single-page vanilla HTML/CSS/JS (`public/index.html`)

---

## API Endpoints

### `POST /api/speak`
Converts text to MP3 audio via MiniMax TTS.

**Request:**
```json
{ "text": "...", "voice": "English_expressive_narrator", "speed": 1.0 }
```

**Response:** `audio/mpeg` binary stream

**Config:** `maxDuration: 300` (5 min)

---

### `POST /api/extract`
Server-side URL extraction using `@mozilla/readability` + `jsdom`.

**Request:**
```json
{ "url": "https://..." }
```

**Response:**
```json
{ "title": "...", "text": "...", "wordCount": 1234, "estimatedMinutes": 8 }
```

Uses full Chrome browser headers to avoid 403s on sites that block bots.

---

### `POST /api/insights` *(insights branch only)*
Transforms text through an insight mode using Claude. Optionally captures to Helix Mind.

**Request:**
```json
{
  "text": "...",
  "title": "Article Title",
  "mode": "takeaways",
  "source": "https://... or filename",
  "capture": false
}
```

**`capture: false` (Insights → Audio path):**
- Single Claude `sonnet` call → insight text
- Fast, no GitHub, no metadata
- Used by the Insights → Audio button

**`capture: true` (Save to Ecosystem path):**
- Two parallel Claude calls: `sonnet` for insight + `haiku` for metadata
- Commits structured `.md` to `helix-mind/intellectual_ecosystem/research_library/ingested_articles/`
- Filename: `YYYY-MM-DD_HHMM_slug.md` (Adelaide time, prevents collisions)
- Full article truncated at 40,000 chars for GitHub safety
- Used by the Save to Ecosystem button

**Response:**
```json
{
  "title": "[Key Takeaways] Article Title",
  "text": "Generated insight text...",
  "wordCount": 342,
  "estimatedMinutes": 2,
  "mode": "takeaways",
  "modeName": "Key Takeaways",
  "ecosystemCapture": { "ok": true, "url": "...", "filename": "..." }
}
```

**Config:** `maxDuration: 90`

---

## Eight Insight Modes

| Mode | Key | Output style |
|------|-----|-------------|
| Key Takeaways | `takeaways` | Flowing narration of N ideas |
| Executive Brief | `executive` | Situation / So What / Now What |
| Socratic Dialogue | `socratic` | Host + Challenger, 6–10 exchanges |
| Framework Extraction | `framework` | Named structural model + components |
| Breakthrough Lens | `breakthrough` | What's novel, what to do differently |
| Analogy Mode | `analogy` | One killer analogy, unpacked |
| Cross-Domain Scout | `cross-domain` | 3+ field connections |
| Author's Voice | `authors-voice` | 30% condensed, original voice |

---

## Frontend (`public/index.html`)

Single HTML file, no build step, no framework.

**Input tabs:** URL | PDF | Markdown | Paste Text

**Buttons:**
- 🎙️ **Convert to Audio** — direct TTS of original content
- 💡 **Insights → Audio** — insight mode transform → TTS (capture: false)
- 📚 **Save to Ecosystem** — insight transform + metadata + GitHub commit (capture: true)
- 📋 **Copy** — copies generated insight text to clipboard

**Shared helper:** `extractContent()` — handles all four input tabs, returns `{ extracted, sourceRef }` used by both insights buttons to avoid duplication.

---

## Helix Mind Ecosystem File Format

Files committed to `helix-mind/intellectual_ecosystem/research_library/ingested_articles/`:

```markdown
# [Article Title]

**Source:** URL or filename
**Date Ingested:** YYYY-MM-DD (Adelaide time)
**Insight Mode:** Key Takeaways

---

## 💡 Insight: Key Takeaways
[Generated insight text]

---

## Executive Summary
[2-3 sentence summary from Haiku]

---

## LLV Analysis
Dominant / Signature / Frequency / Why

---

## Framework Connections
[Table: LLV, Co-Intelligence, Navigator, AAA, Strategic Intelligence as Code]

---

## Market Relevance
[1 sentence]

---

## Key Insights
[3 bullet insights]

---

## Quotable Passages
[Top quote]

---

## Full Content
[Original article text, truncated at 40,000 chars if needed]
```

---

## Environment Variables

| Variable | Used in | Purpose |
|---------|---------|---------|
| `ANTHROPIC_API_KEY` | `api/insights.js` | Claude API |
| `MINIMAX_API_KEY` | `api/speak.js` | MiniMax TTS |
| `MINIMAX_GROUP_ID` | `api/speak.js` | MiniMax account group |
| `GITHUB_HELIX_MIND_TOKEN` | `api/insights.js` | GitHub PAT for ecosystem commits |

---

## Branch Strategy

```
main (clean, public)
  └── No Claude API, no ecosystem capture
  └── Deployed to: helix-listen.vercel.app

insights (Suhit-only features)
  └── Full insights layer + ecosystem capture
  └── Deployed to: helix-listen-insights-helixlab-projects.vercel.app
  └── Separate Vercel project + separate env vars
```

The `insights` branch diverges from `main` in: `api/insights.js` (new), `package.json` (`@anthropic-ai/sdk` added), and `public/index.html` (insights UI additions).
