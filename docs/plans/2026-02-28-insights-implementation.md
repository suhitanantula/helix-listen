# Insights Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an "Insights → Audio" button to Helix Listen + a `/article-insights` Claude Code skill that transforms any article through 8 AI-powered insight modes and captures the result into the Helix Mind intellectual ecosystem.

**Architecture:** A new `/api/insights` Vercel serverless endpoint calls the Claude API (`claude-sonnet-4-6`) with a mode-specific system prompt to transform extracted text, then hands the result to the existing `/api/speak` endpoint unchanged. The Claude Code skill does the same transformation but outputs to terminal and saves a structured `.md` file to `helix-mind/intellectual_ecosystem/research_library/ingested_articles/` following the exact `INGESTION_PROCESS.md` format, with the mode output prepended as its own section.

**Tech Stack:** Vercel serverless (Node 18+), Anthropic SDK (`@anthropic-ai/sdk`), MiniMax TTS (unchanged), Claude Code skill (markdown), existing `@mozilla/readability` + `jsdom` for extraction.

---

## Task 1: Install Anthropic SDK + add env var

**Files:**
- Modify: `package.json`
- Create: `.env` (local dev only, never commit)

**Step 1: Install the SDK**

```bash
npm install @anthropic-ai/sdk
```

Expected output: `added 1 package` (or similar), no errors.

**Step 2: Create local `.env` for dev**

Create `.env` in the project root:

```
MINIMAX_API_KEY=your_existing_key_here
MINIMAX_GROUP_ID=your_existing_group_id_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Do NOT commit this file. Verify `.gitignore` already has `.env` (check with `cat .gitignore`). If not, add it.

**Step 3: Add `ANTHROPIC_API_KEY` to Vercel**

```bash
vercel env add ANTHROPIC_API_KEY
```

Paste the key when prompted. Select all environments (Production, Preview, Development).

**Step 4: Verify install**

```bash
node -e "const Anthropic = require('@anthropic-ai/sdk'); console.log('SDK OK')"
```

Expected: `SDK OK`

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install anthropic sdk for insights endpoint"
```

---

## Task 2: Create `api/insights.js`

**Files:**
- Create: `api/insights.js`

**Step 1: Create the file**

```javascript
// api/insights.js
// Transforms extracted text through an insight mode using Claude API

import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
};

const SYSTEM_PROMPTS = {
  takeaways: `You are a brilliant podcast narrator. Transform the article into flowing spoken narration that opens with "Here are [N] ideas worth your attention from [title]..." then delivers each insight as a short, punchy paragraph. Write for the ear, not the eye. No bullet points, no headers — pure narrative flow.`,

  executive: `You are a senior strategy consultant. Transform the article into a crisp executive brief with three spoken sections: "The Situation" (what's happening and why it matters), "So What" (the key implication), and "Now What" (what a smart leader should do with this). Write in confident, direct prose. No jargon. 300-400 words.`,

  socratic: `You are writing a Socratic dialogue between two characters: Host (curious, probing) and Challenger (sharp, skeptical). The dialogue explores the article's central ideas, surfaces hidden assumptions, and pushes to deeper implications. 6-10 exchanges. Write it as a natural spoken conversation, not an interview. Start with Host.`,

  framework: `You are a systems thinker. Extract the underlying structural model or framework from this article. Give it a name. Describe its components, how they interact, and where it applies beyond the article's specific context. Format as flowing narration — explain the framework as if describing it to a smart colleague for the first time.`,

  breakthrough: `You are thinking in breakthrough mode (90hz). What is genuinely novel in this article — not just new to you, but potentially new to the field? What would change if this idea were taken seriously? What should the reader do differently tomorrow? Be direct, even provocative. 250-350 words.`,

  analogy: `You are a master explainer. Distil the article's central idea into one killer analogy that makes it immediately graspable. Then unpack the analogy: where it holds, where it breaks down, and what it reveals. Write for spoken delivery. The analogy should be vivid and memorable.`,

  'cross-domain': `You are a cross-domain pattern spotter. Read this article and identify how its core idea connects to at least 3 other fields or domains (e.g. biology, military strategy, architecture, music, economics). For each connection, explain what the parallel reveals that the original article misses. Write as flowing narration.`,

  'authors-voice': `You are a skilled editor. Condense this article to approximately 30% of its original length while preserving the author's exact voice, rhythm, and argumentative structure. Cut examples where one will do, trim repetition, remove throat-clearing. Do not add interpretation or commentary — this should read as if the author wrote a tighter version.`,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { text, title = 'Article', mode = 'takeaways' } = req.body;

  if (!text) return res.status(400).json({ error: 'No text provided' });

  const systemPrompt = SYSTEM_PROMPTS[mode];
  if (!systemPrompt) return res.status(400).json({ error: `Unknown mode: ${mode}` });

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Title: ${title}\n\n${text}`,
        },
      ],
    });

    const transformedText = message.content[0].text;
    const wordCount = transformedText.split(/\s+/).length;

    return res.status(200).json({
      title: `[${modeName(mode)}] ${title}`,
      text: transformedText,
      wordCount,
      estimatedMinutes: Math.ceil(wordCount / 150),
    });
  } catch (error) {
    console.error('Insights error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function modeName(mode) {
  const names = {
    takeaways: 'Key Takeaways',
    executive: 'Executive Brief',
    socratic: 'Socratic Dialogue',
    framework: 'Framework Extraction',
    breakthrough: 'Breakthrough Lens',
    analogy: 'Analogy Mode',
    'cross-domain': 'Cross-Domain Scout',
    'authors-voice': "Author's Voice",
  };
  return names[mode] || mode;
}
```

**Step 2: Test locally with curl**

Start dev server first:
```bash
vercel dev
```

Then in a new terminal:
```bash
curl -X POST http://localhost:3000/api/insights \
  -H "Content-Type: application/json" \
  -d '{"text": "Artificial intelligence is transforming how organizations work. The key insight is that AI works best when humans and machines collaborate rather than compete. Early adopters who embraced this saw 40% productivity gains.", "title": "Test Article", "mode": "takeaways"}' \
  | jq .
```

Expected: JSON with `title`, `text` (transformed narration), `wordCount`, `estimatedMinutes`.

**Step 3: Test each mode quickly**

```bash
# Test socratic
curl -X POST http://localhost:3000/api/insights \
  -H "Content-Type: application/json" \
  -d '{"text": "The same test text here", "title": "Test", "mode": "socratic"}' | jq .text
```

Verify the response reads as a dialogue (Host/Challenger).

**Step 4: Commit**

```bash
git add api/insights.js
git commit -m "feat: add insights API endpoint with 8 Claude-powered modes"
```

---

## Task 3: Update `public/index.html` — Insights button + mode dropdown

**Files:**
- Modify: `public/index.html`

### Step 1: Add CSS for the insights button and mode selector

Find the `.btn-primary:disabled` block (around line 216) and add after it:

```css
.btn-insights {
  background: linear-gradient(90deg, #7c3aed, #a855f7);
  color: white;
  margin-top: 10px;
}

.btn-insights:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(124, 58, 237, 0.3);
}

.btn-insights:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.insights-row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  align-items: stretch;
}

.insights-row .btn-insights {
  flex: 1;
  margin-top: 0;
}

.mode-select-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.mode-select-wrapper select {
  height: 100%;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 13px;
  min-width: 150px;
}
```

### Step 2: Add the Insights button row to HTML

Find the existing convert button in HTML (around line 449):
```html
<button class="btn btn-primary" id="convert-btn">
  <span>🎙️</span>
  <span>Convert to Audio</span>
</button>
```

Replace with:
```html
<button class="btn btn-primary" id="convert-btn">
  <span>🎙️</span>
  <span>Convert to Audio</span>
</button>

<div class="insights-row">
  <button class="btn btn-insights" id="insights-btn">
    <span>💡</span>
    <span>Insights → Audio</span>
  </button>
  <div class="mode-select-wrapper">
    <select id="mode-select">
      <option value="takeaways">Key Takeaways</option>
      <option value="executive">Executive Brief</option>
      <option value="socratic">Socratic Dialogue</option>
      <option value="framework">Framework Extraction</option>
      <option value="breakthrough">Breakthrough Lens</option>
      <option value="analogy">Analogy Mode</option>
      <option value="cross-domain">Cross-Domain Scout</option>
      <option value="authors-voice">Author's Voice</option>
    </select>
  </div>
</div>
```

### Step 3: Add JS for the Insights button

Find `const downloadBtn = document.getElementById('download-btn');` (around line 499) and add:

```javascript
const insightsBtn = document.getElementById('insights-btn');
const modeSelect = document.getElementById('mode-select');
```

Then add this handler after the existing `convertBtn.addEventListener` block (after the closing `});` around line 722):

```javascript
// Insights button handler
insightsBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  const pdfFile = pdfInput.files[0];
  const mdFile = mdInput.files[0];
  const pastedText = textInput.value.trim();

  if (activeTab === 'url' && !url) { showStatus('Please enter a URL', 'error'); return; }
  if (activeTab === 'pdf' && !pdfFile) { showStatus('Please upload a PDF', 'error'); return; }
  if (activeTab === 'markdown' && !mdFile) { showStatus('Please upload a Markdown file', 'error'); return; }
  if (activeTab === 'text' && !pastedText) { showStatus('Please paste some text', 'error'); return; }

  insightsBtn.disabled = true;
  insightsBtn.innerHTML = '<div class="spinner"></div><span>Generating insights...</span>';
  convertBtn.disabled = true;
  playerSection.classList.remove('visible');

  try {
    let extracted;

    if (activeTab === 'text') {
      const wordCount = pastedText.split(/\s+/).length;
      extracted = { title: 'Pasted Text', text: pastedText, wordCount, estimatedMinutes: Math.ceil(wordCount / 150) };
    } else if (activeTab === 'markdown') {
      showStatus('Processing Markdown...', 'loading');
      const rawMd = await mdFile.text();
      const plainText = stripMarkdown(rawMd);
      if (!plainText || plainText.length < 20) throw new Error('Could not extract readable text from Markdown.');
      const wordCount = plainText.split(/\s+/).length;
      extracted = { title: mdFile.name.replace(/\.(md|markdown)$/i, ''), text: plainText, wordCount, estimatedMinutes: Math.ceil(wordCount / 150) };
    } else if (activeTab === 'pdf') {
      showStatus('Extracting text from PDF...', 'loading');
      const pdfText = await extractPdfText(pdfFile);
      if (!pdfText || pdfText.length < 50) throw new Error('Could not extract text from PDF.');
      const wordCount = pdfText.split(/\s+/).length;
      extracted = { title: pdfFile.name.replace('.pdf', ''), text: pdfText, wordCount, estimatedMinutes: Math.ceil(wordCount / 150) };
    } else {
      showStatus('Extracting article...', 'loading');
      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const responseText = await extractRes.text();
      try { extracted = JSON.parse(responseText); } catch (e) {
        throw new Error('Server error extracting article. Try pasting text directly.');
      }
      if (!extractRes.ok) throw new Error(extracted.error || 'Failed to extract article');
    }

    // Step 2: Generate insights
    const mode = modeSelect.value;
    showStatus(`Generating ${modeSelect.options[modeSelect.selectedIndex].text}...`, 'loading');

    const insightsRes = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: extracted.text, title: extracted.title, mode }),
    });

    if (!insightsRes.ok) {
      const err = await insightsRes.json();
      throw new Error(err.error || 'Failed to generate insights');
    }

    const insightsData = await insightsRes.json();
    currentTitle = insightsData.title;

    // Step 3: Convert to speech
    showStatus(`Converting ${insightsData.wordCount} words to speech...`, 'loading');

    const voice = voiceSelect.value;
    const speed = parseFloat(speedSelect.value);

    const speakRes = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: insightsData.text, voice, speed }),
    });

    if (!speakRes.ok) {
      const errText = await speakRes.text();
      let errMsg = 'Failed to generate speech';
      try { errMsg = JSON.parse(errText).error || errMsg; } catch (e) {}
      throw new Error(errMsg);
    }

    currentAudioBlob = await speakRes.blob();
    const audioUrl = URL.createObjectURL(currentAudioBlob);

    articleTitle.textContent = insightsData.title;
    articleMeta.textContent = `${insightsData.wordCount} words • ~${insightsData.estimatedMinutes} min`;
    audioPlayer.src = audioUrl;
    playerSection.classList.add('visible');

    showStatus('Insights ready to play!', 'success');
    audioPlayer.play().catch(() => showStatus('Tap play to start', 'success'));

  } catch (error) {
    console.error(error);
    showStatus(error.message, 'error');
  } finally {
    insightsBtn.disabled = false;
    insightsBtn.innerHTML = '<span>💡</span><span>Insights → Audio</span>';
    convertBtn.disabled = false;
  }
});
```

### Step 4: Verify in browser

```bash
vercel dev
```

Open `http://localhost:3000`. Verify:
- Two buttons appear below voice/speed options
- Mode dropdown shows all 8 options
- Pasting text + clicking "Insights → Audio" completes successfully
- Audio plays with transformed content
- Original "Convert to Audio" still works unchanged

### Step 5: Commit

```bash
git add public/index.html
git commit -m "feat: add insights button with 8-mode selector to UI"
```

---

## Task 4: Create `/article-insights` Claude Code skill

**Files:**
- Create: `/Users/suhitanantula/.claude/skills/article-insights/skill.md`

**Step 1: Create the skill directory and file**

```bash
mkdir -p /Users/suhitanantula/.claude/skills/article-insights
```

**Step 2: Write `skill.md`**

```markdown
---
name: article-insights
description: Transform any article, PDF, or text through 8 AI insight modes and capture to Helix Mind intellectual ecosystem. Use when user shares an article URL, PDF path, or text and wants insights, analysis, or research capture.
allowed-tools: [Bash, Read, Write, WebFetch, Glob]
---

# Article Insights Skill

Transform any article through 8 insight modes. Show output in terminal. Save structured capture to Helix Mind intellectual ecosystem.

## Invocation

`/article-insights [URL or file path or "paste text below"]`

## Process

### Step 1: Get the content

**If URL:** Use WebFetch to retrieve and extract the article text.

**If PDF path:** Use Read tool on the file path.

**If no argument:** Ask the user to paste the text.

Store: `title` (from page title or filename), `source` (URL or path), `raw_text`.

### Step 2: Ask which mode (one question)

Present this exact menu and wait for the user's response:

```
Which insight mode?

  1. Key Takeaways      — "5 ideas worth your attention..." as flowing narration
  2. Executive Brief    — Situation / So What / Now What
  3. Socratic Dialogue  — Two voices (Host + Challenger) probing the ideas
  4. Framework Extraction — Pull out the underlying structural model
  5. Breakthrough Lens  — What's genuinely novel? What would you do with it?
  6. Analogy Mode       — Distil to one killer analogy + explanation
  7. Cross-Domain Scout — Connect to other fields and domains
  8. Author's Voice     — Condense to ~30% preserving the writer's style

Enter number or name:
```

### Step 3: Transform with Claude

Use the appropriate system prompt below and call Claude with the article text. Display the full transformed output in the terminal with a header:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 [MODE NAME]: [Article Title]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[transformed content here]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: Save to intellectual ecosystem

Save a `.md` file to:
`/Users/suhitanantula/Documents/Git/helix-mind/intellectual_ecosystem/research_library/ingested_articles/`

Filename: `YYYY-MM-DD_[Source]_[Title-Slug].md`
Use Adelaide timezone for date: `TZ='Australia/Adelaide' date '+%Y-%m-%d'`

File structure (fill in all sections):

```markdown
# [Article Title]

**Source:** [URL or file path]
**Date Ingested:** YYYY-MM-DD
**Insight Mode:** [mode name]

---

## 💡 Insight: [Mode Name]

[The full transformed output from Step 3]

---

## Executive Summary

[2-3 sentences capturing the core argument/insight]

---

## LLV Analysis

**Dominant Rhythm:** [Lines / Loops / Vibes — pick the strongest]
**Signature:** [e.g., ▲▲⟳〰️]
**Frequency:** [20Hz deep / 60Hz balanced / 90Hz breakthrough / 95Hz chaos]
**Why:** [1-2 sentences justifying the classification]

LLV guide:
- Lines (▲): Structured arguments, frameworks, step-by-step processes, data-heavy
- Loops (⟳): Iterative, experimental, learning from failure, adaptation
- Vibes (〰️): Cultural, emergent, intuitive, vision, inspiration

---

## Framework Connections

Check all 13 — rate ★★★ (direct), ★★ (relevant), ★ (tangential), or skip if no connection:

| Framework | Relevance | Connection |
|-----------|-----------|------------|
| LLV | | |
| Co-Intelligence | | |
| Navigator / Capability Maturity | | |
| AAA (Assist→Augment→Adapt) | | |
| GAIN | | |
| Helix Rhythm | | |
| 5As | | |
| 5Ps | | |
| 5×5 Grid | | |
| 4D Diagnostic | | |
| Strategic Intelligence as Code | | |
| Helix Mind | | |
| Probes | | |

---

## Market Relevance

| Market | Relevance | Application |
|--------|-----------|-------------|
| Local Government / Councils | | |
| State Government / Public Sector | | |
| Enterprise / Large Organizations | | |
| Aged Care / NFPs | | |
| Professional Services | | |

---

## Key Insights

1. **[Insight title]:** [Description]
2. **[Insight title]:** [Description]
3. **[Insight title]:** [Description]

---

## Quotable Passages

> "[Best quote from the article]"

> "[Second quote if strong enough]"

---

## Integration Notes

**Connects to existing work:**
- [Any helix-mind file or framework this relates to]

**Potential applications:**
- [How this could be used in client work or book]

---

## Full Content

[Complete article text]
```

### Step 5: Update INGESTION_LOG.md

Append one line to `/Users/suhitanantula/Documents/Git/helix-mind/intellectual_ecosystem/research_library/ingested_articles/INGESTION_LOG.md`:

```
| YYYY-MM-DD | [Title] | [Source] | [Mode] | [Top framework connection] |
```

### Step 6: Offer to commit

Ask: "Commit to helix-mind? (y/n)"

If yes:
```bash
cd /Users/suhitanantula/Documents/Git/helix-mind
git add intellectual_ecosystem/research_library/ingested_articles/
git commit -m "feat: ingest [title] via [mode] mode"
git push origin main
```

---

## System Prompts by Mode

### Key Takeaways
```
You are a brilliant podcast narrator. Transform the article into flowing spoken narration that opens with "Here are [N] ideas worth your attention from [title]..." then delivers each insight as a short, punchy paragraph. Write for the ear, not the eye. No bullet points, no headers — pure narrative flow.
```

### Executive Brief
```
You are a senior strategy consultant. Transform the article into a crisp executive brief with three spoken sections: "The Situation" (what's happening and why it matters), "So What" (the key implication), and "Now What" (what a smart leader should do with this). Write in confident, direct prose. No jargon. 300-400 words.
```

### Socratic Dialogue
```
You are writing a Socratic dialogue between two characters: Host (curious, probing) and Challenger (sharp, skeptical). The dialogue explores the article's central ideas, surfaces hidden assumptions, and pushes to deeper implications. 6-10 exchanges. Write it as a natural spoken conversation, not an interview. Start with Host.
```

### Framework Extraction
```
You are a systems thinker. Extract the underlying structural model or framework from this article. Give it a name. Describe its components, how they interact, and where it applies beyond the article's specific context. Format as flowing narration — explain the framework as if describing it to a smart colleague for the first time.
```

### Breakthrough Lens
```
You are thinking in breakthrough mode (90hz). What is genuinely novel in this article — not just new to you, but potentially new to the field? What would change if this idea were taken seriously? What should the reader do differently tomorrow? Be direct, even provocative. 250-350 words.
```

### Analogy Mode
```
You are a master explainer. Distil the article's central idea into one killer analogy that makes it immediately graspable. Then unpack the analogy: where it holds, where it breaks down, and what it reveals. Write for spoken delivery. The analogy should be vivid and memorable.
```

### Cross-Domain Scout
```
You are a cross-domain pattern spotter. Read this article and identify how its core idea connects to at least 3 other fields or domains (e.g. biology, military strategy, architecture, music, economics). For each connection, explain what the parallel reveals that the original article misses. Write as flowing narration.
```

### Author's Voice
```
You are a skilled editor. Condense this article to approximately 30% of its original length while preserving the author's exact voice, rhythm, and argumentative structure. Cut examples where one will do, trim repetition, remove throat-clearing. Do not add interpretation or commentary — this should read as if the author wrote a tighter version.
```
```

**Step 3: Verify the skill appears**

```bash
ls /Users/suhitanantula/.claude/skills/article-insights/
```

Expected: `skill.md`

**Step 4: Test the skill**

Open a new Claude Code session and type:
```
/article-insights https://www.example.com
```

Or with a real article URL you have handy. Verify:
- Mode menu appears
- Transformed output displays in terminal with header
- `.md` file is created in the ingested_articles folder
- File contains both the mode output section AND all structured sections (LLV, frameworks, etc.)
- INGESTION_LOG.md has a new row

**Step 5: Commit the skill**

```bash
git -C /Users/suhitanantula/.claude add skills/article-insights/skill.md
git -C /Users/suhitanantula/.claude commit -m "feat: add article-insights skill with 8 modes + ecosystem capture"
```

---

## Task 5: Deploy to Vercel + smoke test

**Step 1: Deploy**

```bash
vercel --prod
```

**Step 2: Smoke test the live endpoint**

```bash
curl -X POST https://your-app.vercel.app/api/insights \
  -H "Content-Type: application/json" \
  -d '{"text": "AI is transforming work. The key is human-AI collaboration not replacement.", "title": "Test", "mode": "executive"}' \
  | jq .
```

Expected: valid JSON with transformed text.

**Step 3: Test full flow in browser**

1. Open the live URL
2. Paste some text in the Text tab
3. Select "Socratic Dialogue" from the mode dropdown
4. Click "Insights → Audio"
5. Verify audio plays with a dialogue format

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: insights feature complete — 8-mode Claude transformation + audio + Claude Code skill"
```

---

## Quick Reference: What was built

| Surface | Trigger | Output |
|---------|---------|--------|
| Helix Listen | "Insights → Audio" button | Transformed audio via Claude + MiniMax |
| Claude Code | `/article-insights` | Terminal output + `.md` in intellectual ecosystem |
| Both | Same 8 modes | Same Claude system prompts |
