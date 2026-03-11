// api/macwhisper-webhook.js
// Receives MacWhisper webhook after transcription completes
//
// MacWhisper title format (set via AI title prompt):
//   "[Client] - [Meeting Type] - [Key Theme]"
//   e.g. "ARI - Strategy Session - AI Policy Framework"
//        "Itziar - Discovery Call - Basque AI Implementation"
//        "Internal - Planning - Q2 Priorities"
//
// Flow:
//   MacWhisper finishes transcription → POSTs here
//   → Parse client from title (first segment)
//   → Fuzzy match to clawd-workspace/clients/[folder]
//   → Run executive brief on transcript (Sonnet)
//   → Extract action items + key decisions (Haiku)
//   → Commit to clawd-workspace/clients/[client]/YYYY-MM-DD-[slug].md

import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 120,
};

// Known client folders — maps common name variations to folder name
const CLIENT_MAP = {
  'ari': 'americans-for-responsible-innovation',
  'americans for responsible innovation': 'americans-for-responsible-innovation',
  'americans-for-responsible-innovation': 'americans-for-responsible-innovation',
  'itziar': 'itziar',
  'alc': 'itziar',
  'mitcham': 'city-of-mitcham',
  'city of mitcham': 'city-of-mitcham',
  'dfe': 'dfe-pls-backup-moved-to-onedrive',
  'emma': 'emma-aiken-klar',
  'emma aiken': 'emma-aiken-klar',
  'ethnobot': 'ethnobot',
  'studio 9': 'studio-9',
  'studio9': 'studio-9',
  'timberlink': 'timberlink',
  'wisetech': 'wisetech',
  'ai colab': 'ai-colab-commonwealth',
  'commonwealth': 'ai-colab-commonwealth',
  'internal': 'internal',
};

function matchClient(rawName) {
  if (!rawName) return null;
  const key = rawName.toLowerCase().trim();
  // Exact match first
  if (CLIENT_MAP[key]) return CLIENT_MAP[key];
  // Partial match
  for (const [pattern, folder] of Object.entries(CLIENT_MAP)) {
    if (key.includes(pattern) || pattern.includes(key)) return folder;
  }
  // Fall back to slugified raw name
  return key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

function getAdelaideDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Adelaide' });
}

function getAdelaideTime() {
  return new Date().toLocaleTimeString('en-AU', { timeZone: 'Australia/Adelaide', hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
}

const EXECUTIVE_BRIEF_PROMPT = `You are a senior strategy consultant reviewing a meeting transcript. Transform it into a crisp executive brief with four sections:

**The Meeting** (2-3 sentences: who, what was discussed, context)
**Key Decisions** (bullet points — what was agreed or decided)
**Open Questions** (bullet points — what remains unresolved)
**Next Actions** (bullet points — who does what, by when if mentioned)

Write in confident, direct prose. No filler. 300-400 words total.`;

const ACTION_ITEMS_PROMPT = `You are extracting structured data from a meeting transcript. Return ONLY valid JSON, no markdown, no explanation.

{
  "participants": ["name or role if mentioned"],
  "duration_estimate": "e.g. 30 min, 1 hour — infer from transcript length/content",
  "meeting_type": "e.g. Strategy, Discovery, Check-in, Workshop, Presentation",
  "key_themes": ["3-5 word theme", "another theme"],
  "action_items": [
    {"owner": "name or 'Suhit'", "action": "what to do", "deadline": "if mentioned or null"}
  ],
  "follow_up_required": true
}`;

function buildMeetingFile({ title, clientFolder, brief, structured, transcript, date }) {
  const m = structured;

  const participantsLine = m.participants?.length
    ? m.participants.join(', ')
    : 'Not specified';

  const actionItems = m.action_items?.length
    ? m.action_items.map(a => `- [ ] **${a.owner}:** ${a.action}${a.deadline ? ` *(by ${a.deadline})*` : ''}`).join('\n')
    : '- None identified';

  const themes = m.key_themes?.length
    ? m.key_themes.map(t => `\`${t}\``).join(' ')
    : '';

  const truncated = transcript.length > 40000;
  const transcriptBody = truncated
    ? transcript.slice(0, 40000) + '\n\n---\n*[Transcript truncated at 40000 chars]*'
    : transcript;

  return `# ${title}

**Date:** ${date} (Adelaide time)
**Client:** ${clientFolder}
**Participants:** ${participantsLine}
**Meeting Type:** ${m.meeting_type || 'Meeting'}
**Themes:** ${themes}
**Captured via:** MacWhisper → Helix Listen

---

## Executive Brief

${brief}

---

## Action Items

${actionItems}

---

## Full Transcript

${transcriptBody}
`;
}

async function commitToClawd({ clientFolder, filename, content }) {
  const ghToken = process.env.GITHUB_HELIX_MIND_TOKEN;
  if (!ghToken) return { ok: false, reason: 'No GitHub token' };

  const path = `clients/${clientFolder}/${filename}`;
  const encoded = Buffer.from(content, 'utf8').toString('base64');
  const repo = 'suhitanantula/clawd-workspace';

  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${ghToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'helix-listen-macwhisper',
    },
    body: JSON.stringify({
      message: `feat: meeting transcript — ${filename}`,
      content: encoded,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    return { ok: true, url: data.content?.html_url, filename, path };
  } else {
    const err = await response.text();
    console.error('GitHub commit failed:', response.status, err);
    return { ok: false, reason: `GitHub ${response.status}: ${err}` };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = req.body;
  console.log('=== MACWHISPER WEBHOOK ===');
  console.log('Keys:', Object.keys(payload || {}));

  // MacWhisper webhook payload — extract transcript and title
  // MacWhisper sends: { title, text, segments, duration, ... }
  const title = payload?.title || payload?.name || 'Untitled Meeting';
  const transcript = payload?.text || payload?.transcript || payload?.content || '';

  if (!transcript) {
    console.log('No transcript in payload');
    return res.status(400).json({ error: 'No transcript found in payload' });
  }

  console.log(`Title: "${title}" | Transcript length: ${transcript.length} chars`);

  // Parse client from title: "ClientName - Meeting Type - Theme"
  const titleParts = title.split(' - ');
  const rawClient = titleParts[0]?.trim();
  const clientFolder = matchClient(rawClient);

  console.log(`Client: "${rawClient}" → folder: "${clientFolder}"`);

  // Run executive brief + structured extraction in parallel
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let brief, structured;
  try {
    const [briefMsg, structuredMsg] = await Promise.all([
      client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        system: EXECUTIVE_BRIEF_PROMPT,
        messages: [{ role: 'user', content: `Title: ${title}\n\n${transcript}` }],
      }),
      client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        system: ACTION_ITEMS_PROMPT,
        messages: [{ role: 'user', content: `Title: ${title}\n\n${transcript.slice(0, 4000)}` }],
      }),
    ]);

    brief = briefMsg.content[0].text;

    const raw = structuredMsg.content[0].text;
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    structured = JSON.parse(cleaned);
  } catch (err) {
    console.error('Claude API error:', err.message);
    return res.status(500).json({ error: `Claude API failed: ${err.message}` });
  }

  // Build filename: YYYY-MM-DD-slug.md
  const date = getAdelaideDate();
  const slug = toSlug(title);
  const filename = `${date}-${slug}.md`;

  const content = buildMeetingFile({ title, clientFolder, brief, structured, transcript, date });

  const result = await commitToClawd({ clientFolder, filename, content });

  console.log('Commit result:', result);
  return res.status(200).json({
    ok: result.ok,
    filename: result.filename,
    path: result.path,
    url: result.url,
    client: clientFolder,
  });
}
