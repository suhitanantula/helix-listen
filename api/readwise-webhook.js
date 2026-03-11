// api/readwise-webhook.js
// Receives Readwise Reader webhooks, triggers helix pipeline when a document note is added
//
// Flow:
//   Reader: you add a note to a document
//   → Readwise POSTs webhook here
//   → We check: does document have a note?
//   → Fetch full article text via Readability
//   → Run insights pipeline (breakthrough mode) + ecosystem metadata
//   → Commit to helix-mind intellectual_ecosystem/research_library/ingested_articles/

import Anthropic from '@anthropic-ai/sdk';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export const config = {
  maxDuration: 120,
};

// --- Reused from insights.js ---

const MODE = 'breakthrough';
const MODE_NAME = 'Breakthrough Lens';

const INSIGHT_PROMPT = `You are thinking in breakthrough mode. What is genuinely novel in this article — not just new to you, but potentially new to the field? What would change if this idea were taken seriously? What should the reader do differently tomorrow? Be direct, even provocative. 250-350 words.`;

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

const MAX_ORIGINAL_CHARS = 40000;

function buildEcosystemFile({ title, source, userNote, insightText, metadata, originalText }) {
  const truncated = originalText.length > MAX_ORIGINAL_CHARS;
  const bodyText = truncated
    ? originalText.slice(0, MAX_ORIGINAL_CHARS) + `\n\n---\n*[Content truncated at ${MAX_ORIGINAL_CHARS} chars. Full source: ${source}]*`
    : originalText;

  const date = getAdelaideDate();
  const m = metadata;

  const frameworkTable = m.frameworks.map(f =>
    `| ${f.name} | ${f.relevance} | ${f.connection} |`
  ).join('\n');

  const noteSection = userNote
    ? `## Your Note\n\n> ${userNote}\n\n---\n\n`
    : '';

  return `# ${title}

**Source:** ${source}
**Date Ingested:** ${date} (Adelaide time)
**Trigger:** #helixbrief tag added in Readwise Reader
**Insight Mode:** ${MODE_NAME}

---

${noteSection}## 💡 Insight: ${MODE_NAME}

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

${bodyText}
`;
}

async function commitToHelixMind({ title, source, userNote, insightText, metadata, originalText }) {
  const ghToken = process.env.GITHUB_HELIX_MIND_TOKEN;
  if (!ghToken) return { ok: false, reason: 'No GitHub token' };

  const date = getAdelaideDate();
  const slug = toSlug(title);
  const time = getAdelaideTime();
  const filename = `${date}_${time}_${slug}.md`;
  const path = `intellectual_ecosystem/research_library/ingested_articles/${filename}`;
  const content = buildEcosystemFile({ title, source, userNote, insightText, metadata, originalText });
  const encoded = Buffer.from(content, 'utf8').toString('base64');

  const url = `https://api.github.com/repos/suhitanantula/helix-mind/contents/${path}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${ghToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'helix-listen-readwise',
    },
    body: JSON.stringify({
      message: `feat: capture [Readwise] ${title}`,
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

// --- Article extraction (mirrors extract.js) ---

async function extractArticleText(articleUrl) {
  const html = await fetch(articleUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    },
  }).then(r => r.text());

  const dom = new JSDOM(html, { url: articleUrl });
  const article = new Readability(dom.window.document).parse();
  if (!article) throw new Error('Readability could not parse article');

  const text = article.textContent.replace(/\s+/g, ' ').trim();
  return { title: article.title || 'Untitled', text };
}

// --- Fetch document from Readwise Reader API ---

async function fetchReaderDocument(documentId) {
  const token = process.env.READWISE_TOKEN;
  if (!token) throw new Error('READWISE_TOKEN not configured');

  const res = await fetch(`https://readwise.io/api/v3/list/?id=${documentId}`, {
    headers: { 'Authorization': `Token ${token}` },
  });

  if (!res.ok) throw new Error(`Readwise API error: ${res.status}`);
  const data = await res.json();
  const doc = data.results?.[0];
  if (!doc) throw new Error(`Document ${documentId} not found`);
  return doc;
}

// --- Main handler ---

export default async function handler(req, res) {
  // Readwise sends POST for webhook events
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });


  const payload = req.body;
  console.log('=== READWISE WEBHOOK ===', JSON.stringify(payload, null, 2));

  // readwise.highlight.tag_added payload:
  // { event, highlight: { id, text, book_id, tags: [{name}] }, tag: {name} }
  const tagName = (payload?.tag?.name || '').toLowerCase();
  const highlight = payload?.highlight;

  // Only proceed if the helixbrief tag was the one added
  if (tagName !== 'helixbrief') {
    console.log('Tag is not helixbrief — skipping. Tag:', tagName);
    return res.status(200).json({ skipped: true, reason: `Tag is ${tagName || 'unknown'}` });
  }

  console.log('helixbrief tag added — proceeding');

  // Use book_id to fetch the parent document from Reader
  const bookId = highlight?.book_id;
  if (!bookId) {
    return res.status(400).json({ error: 'No book_id on highlight payload' });
  }

  let document;
  try {
    document = await fetchReaderDocument(bookId);
  } catch (err) {
    console.error('Failed to fetch document:', err.message);
    return res.status(500).json({ error: err.message });
  }

  const articleUrl = document.source_url || document.url;
  const title = document.title || 'Untitled';
  const note = highlight?.text ? `Highlight: "${highlight.text}"` : (document.notes?.trim() || null);

  if (!articleUrl) {
    return res.status(400).json({ error: 'No article URL on document' });
  }

  // Extract full article text
  let articleText;
  try {
    const extracted = await extractArticleText(articleUrl);
    articleText = extracted.text;
    // Use Reader's title if available, fallback to extracted
    if (!document.title && extracted.title) document.title = extracted.title;
  } catch (err) {
    console.error('Article extraction failed:', err.message);
    // Fall back to Reader's stored summary if extraction fails
    articleText = document.summary || document.content || '';
    if (!articleText) return res.status(500).json({ error: `Extraction failed: ${err.message}` });
  }

  // Run insight + metadata in parallel (same pattern as insights.js capture:true)
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let insightText, metadata;
  try {
    const [insightMsg, metadataMsg] = await Promise.all([
      client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        system: INSIGHT_PROMPT,
        messages: [{ role: 'user', content: `Title: ${title}\n\n${articleText}` }],
      }),
      client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        system: ECOSYSTEM_METADATA_PROMPT,
        messages: [{ role: 'user', content: `Title: ${title}\n\n${articleText.slice(0, 3000)}` }],
      }),
    ]);

    insightText = insightMsg.content[0].text;

    const raw = metadataMsg.content[0].text;
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    metadata = JSON.parse(cleaned);
  } catch (err) {
    console.error('Claude API error:', err.message);
    return res.status(500).json({ error: `Claude API failed: ${err.message}` });
  }

  // Commit to helix-mind
  const result = await commitToHelixMind({
    title,
    source: articleUrl,
    userNote: note,
    insightText,
    metadata,
    originalText: articleText,
  });

  console.log('Ecosystem commit result:', result);
  return res.status(200).json({ ok: result.ok, filename: result.filename, url: result.url });
}
