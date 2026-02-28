// api/insights.js
// Transforms extracted text through an insight mode using Claude API

import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
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
  if (!systemPrompt) return res.status(400).json({ error: `Unknown mode: ${mode}. Valid modes: ${Object.keys(SYSTEM_PROMPTS).join(', ')}` });

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
    const modeName = MODE_NAMES[mode] || mode;

    return res.status(200).json({
      title: `[${modeName}] ${title}`,
      text: transformedText,
      wordCount,
      estimatedMinutes: Math.ceil(wordCount / 150),
      mode,
      modeName,
    });
  } catch (error) {
    console.error('Insights error:', error);
    return res.status(500).json({ error: error.message });
  }
}
