// api/insights.js
// Transforms extracted text through an insight mode using Claude API
// Auto-captures to Helix Mind intellectual ecosystem via GitHub API

import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 90,
};

const MODE_NAMES = {
  takeaways: 'Key Takeaways',
  executive: 'Executive Brief',
  socratic: 'Socratic Dialogue',
  framework: 'Framework Extraction',
  breakthrough: 'Breakthrough Lens',
  analogy: 'Analogy Mode',
  'cross-domain': 'Cross-Domain Scout',
  'authors-voice': "Author's Voice",
};

const SYSTEM_PROMPTS = {
  takeaways: `You are a brilliant podcast narrator. Transform the article into flowing spoken narration that opens with "Here are [N] ideas worth your attention from [title]..." then delivers each insight as a short, punchy paragraph. Write for the ear, not the eye. No bullet points, no headers — pure narrative flow.`,

  executive: `You are a senior strategy consultant. Transform the article into a crisp executive brief with three spoken sections: "The Situation" (what's happening and why it matters), "So What" (the key implication), and "Now What" (what a smart leader should do with this). Write in confident, direct prose. No jargon. 300-400 words.`,

  socratic: `You are writing a Socratic dialogue between two characters: Host (curious, probing) and Challenger (sharp, skeptical). The dialogue explores the article's central ideas, surfaces hidden assumptions, and pushes to deeper implications. 6-10 exchanges. Write it as a natural spoken conversation, not an interview. Start with Host.`,

  framework: `You are a systems thinker. Extract the underlying structural model or framework from this article. Give it a name. Describe its components, how they interact, and where it applies beyond the article's specific context. Format as flowing narration — explain the framework as if describing it to a smart colleague for the first time.`,

  breakthrough: `You are thinking in breakthrough mode. What is genuinely novel in this article — not just new to you, but potentially new to the field? What would change if this idea were taken seriously? What should the reader do differently tomorrow? Be direct, even provocative. 250-350 words.`,

  analogy: `You are a master explainer. Distil the article's central idea into one killer analogy that makes it immediately graspable. Then unpack the analogy: where it holds, where it breaks down, and what it reveals. Write for spoken delivery. The analogy should be vivid and memorable.`,

  'cross-domain': `You are a cross-domain pattern spotter. Read this article and identify how its core idea connects to at least 3 other fields or domains (e.g. biology, military strategy, architecture, music, economics). For each connection, explain what the parallel reveals that the original article misses. Write as flowing narration.`,

  'authors-voice': `You are a skilled editor. Condense this article to approximately 30% of its original length while preserving the author's exact voice, rhythm, and argumentative structure. Cut examples where one will do, trim repetition, remove throat-clearing. Do not add interpretation or commentary — this should read as if the author wrote a tighter version.`,
};

const ECOSYSTEM_METADATA_PROMPT = `You are analyzing an article for a personal strategic intelligence system. Return ONLY valid JSON, no markdown, no explanation.

Analyze this article and return:
{
  "summary": "2-3 sentence executive summary of the core argument",
  "llv": {
    "dominant": "Lines|Loops|Vibes",
    "signature": "e.g. ▲▲⟳",
    "frequency": "20Hz|60Hz|90Hz|95Hz",
    "why": "1 sentence justification"
  },
  "frameworks": [
    {"name": "LLV", "relevance": "★★★|★★|★|—", "connection": "brief note"},
    {"name": "Co-Intelligence", "relevance": "★★★|★★|★|—", "connection": "brief note"},
    {"name": "Navigator/Capability Maturity", "relevance": "★★★|★★|★|—", "connection": "brief note"},
    {"name": "AAA (Assist→Augment→Adapt)", "relevance": "★★★|★★|★|—", "connection": "brief note"},
    {"name": "Strategic Intelligence as Code", "relevance": "★★★|★★|★|—", "connection": "brief note"}
  ],
  "keyInsights": [
    {"title": "short title", "description": "one sentence"},
    {"title": "short title", "description": "one sentence"},
    {"title": "short title", "description": "one sentence"}
  ],
  "topQuote": "the single most quotable line from the article",
  "marketRelevance": "1 sentence on which of your 5 markets this applies to most"
}`;

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function getAdelaideTime() {
  return new Date().toLocaleTimeString('en-AU', { timeZone: 'Australia/Adelaide', hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
}

function getAdelaideDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Adelaide' });
}

const MAX_ORIGINAL_CHARS = 40000; // ~8000 words — keeps file under GitHub's safe limit

function buildEcosystemFile({ title, source, mode, modeName, insightText, metadata, originalText }) {
  const truncated = originalText.length > MAX_ORIGINAL_CHARS;
  originalText = truncated
    ? originalText.slice(0, MAX_ORIGINAL_CHARS) + `\n\n---\n*[Content truncated at ${MAX_ORIGINAL_CHARS} chars. Full source: ${source || 'Helix Listen'}]*`
    : originalText;
  const date = getAdelaideDate();
  const m = metadata;

  const frameworkTable = m.frameworks.map(f =>
    `| ${f.name} | ${f.relevance} | ${f.connection} |`
  ).join('\n');

  return `# ${title}

**Source:** ${source || 'Helix Listen'}
**Date Ingested:** ${date} (Adelaide time)
**Insight Mode:** ${modeName}

---

## 💡 Insight: ${modeName}

${insightText}

---

## Executive Summary

${m.summary}

---

## LLV Analysis

**Dominant Rhythm:** ${m.llv.dominant}
**Signature:** ${m.llv.signature}
**Frequency:** ${m.llv.frequency}
**Why:** ${m.llv.why}

---

## Framework Connections

| Framework | Relevance | Connection |
|-----------|-----------|------------|
${frameworkTable}

---

## Market Relevance

${m.marketRelevance}

---

## Key Insights

${m.keyInsights.map((k, i) => `${i + 1}. **${k.title}:** ${k.description}`).join('\n')}

---

## Quotable Passages

> "${m.topQuote}"

---

## Full Content

${originalText}
`;
}

async function commitToHelixMind({ title, source, mode, modeName, insightText, metadata, originalText }) {
  const ghToken = process.env.GITHUB_HELIX_MIND_TOKEN;
  if (!ghToken) return { ok: false, reason: 'No GitHub token' };

  const date = getAdelaideDate();
  const slug = toSlug(title);
  const time = getAdelaideTime();
  const filename = `${date}_${time}_${slug}.md`;
  const path = `intellectual_ecosystem/research_library/ingested_articles/${filename}`;
  const content = buildEcosystemFile({ title, source, mode, modeName, insightText, metadata, originalText });
  const encoded = Buffer.from(content, 'utf8').toString('base64');

  const url = `https://api.github.com/repos/suhitanantula/helix-mind/contents/${path}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${ghToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'helix-listen-insights',
    },
    body: JSON.stringify({
      message: `feat: capture [${modeName}] ${title} via Helix Listen`,
      content: encoded,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    return { ok: true, url: data.content?.html_url, filename };
  } else {
    const err = await response.text();
    console.error('GitHub commit failed:', response.status, err);
    return { ok: false, reason: `GitHub ${response.status}` };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  console.log('=== INSIGHTS API CALLED ===');
  console.log('ANTHROPIC_API_KEY present:', !!apiKey);
  console.log('Request body mode:', req.body?.mode);
  console.log('Request body text length:', req.body?.text?.length);
  
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not configured');
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { text, title = 'Article', mode = 'takeaways', source, capture = false } = req.body;

  if (!text) return res.status(400).json({ error: 'No text provided' });

  const systemPrompt = SYSTEM_PROMPTS[mode];
  if (!systemPrompt) return res.status(400).json({ error: `Unknown mode: ${mode}` });

  try {
    const client = new Anthropic({ apiKey });
    console.log('Anthropic client created, calling API...');

    // For audio path (capture=false): only run insight generation — fast
    // For ecosystem path (capture=true): run both in parallel then commit to GitHub
    let insightText, modeName, ecosystemCapture = null;

    if (capture) {
      const [insightMsg, metadataMsg] = await Promise.all([
        client.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: 'user', content: `Title: ${title}\n\n${text}` }],
        }),
        client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 800,
          system: ECOSYSTEM_METADATA_PROMPT,
          messages: [{ role: 'user', content: `Title: ${title}\n\n${text.slice(0, 3000)}` }],
        }),
      ]);
      insightText = insightMsg.content[0].text;
      modeName = MODE_NAMES[mode] || mode;
      try {
        const raw = metadataMsg.content[0].text;
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
        const metadata = JSON.parse(cleaned);
        ecosystemCapture = await commitToHelixMind({
          title, source, mode, modeName, insightText, metadata, originalText: text,
        });
      } catch (e) {
        console.error('Ecosystem capture error:', e.message);
        ecosystemCapture = { ok: false, reason: e.message };
      }
    } else {
      // Audio path — insight only, no metadata, no GitHub commit
      const insightMsg = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Title: ${title}\n\n${text}` }],
      });
      insightText = insightMsg.content[0].text;
      modeName = MODE_NAMES[mode] || mode;
    }

    const wordCount = insightText.split(/\s+/).filter(Boolean).length;
    return res.status(200).json({
      title: `[${modeName}] ${title}`,
      text: insightText,
      wordCount,
      estimatedMinutes: Math.ceil(wordCount / 150),
      mode,
      modeName,
      ecosystemCapture: ecosystemCapture || null,
    });
  } catch (error) {
    console.error('Insights error:', error);
    return res.status(500).json({ error: error.message });
  }
}
