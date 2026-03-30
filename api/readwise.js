// api/readwise.js
// Fetches articles from Readwise Reader API and extracts clean text
// GET  /api/readwise?action=list&cursor=<cursor>   — paginated article list
// POST /api/readwise { documentId }                — fetch + extract single article text

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export const config = {
  maxDuration: 30,
};

const READWISE_API = 'https://readwise.io/api/v3';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.READWISE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'READWISE_TOKEN not configured' });
  }

  // GET — list recent articles from Reader
  if (req.method === 'GET') {
    const { cursor, category = 'article' } = req.query;
    const params = new URLSearchParams({ category, pageCursor: cursor || '' });
    if (!cursor) params.delete('pageCursor');

    const rwRes = await fetch(`${READWISE_API}/list/?${params}`, {
      headers: { Authorization: `Token ${token}` },
    });

    if (!rwRes.ok) {
      const err = await rwRes.text();
      console.error('Readwise list error:', rwRes.status, err);
      return res.status(rwRes.status).json({ error: `Readwise API error: ${rwRes.status}` });
    }

    const data = await rwRes.json();

    // Return slim list — title, author, url, id, word_count, updated_at
    const articles = (data.results || []).map(doc => ({
      id: doc.id,
      title: doc.title || doc.source_url || 'Untitled',
      author: doc.author || null,
      url: doc.source_url || doc.url || null,
      wordCount: doc.word_count || null,
      updatedAt: doc.updated_at,
      imageUrl: doc.image_url || null,
    }));

    return res.status(200).json({
      articles,
      nextCursor: data.nextPageCursor || null,
      count: articles.length,
    });
  }

  // POST — fetch a specific document and extract clean text
  if (req.method === 'POST') {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ error: 'documentId required' });

    const rwRes = await fetch(`${READWISE_API}/list/?id=${documentId}`, {
      headers: { Authorization: `Token ${token}` },
    });

    if (!rwRes.ok) {
      return res.status(rwRes.status).json({ error: `Readwise API error: ${rwRes.status}` });
    }

    const data = await rwRes.json();
    const doc = data.results?.[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    let text = '';
    let title = doc.title || 'Article';

    // Prefer html_content → Readability extraction
    if (doc.html_content) {
      try {
        const dom = new JSDOM(doc.html_content, { url: doc.source_url || 'https://readwise.io' });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article?.textContent) {
          text = article.textContent;
          title = article.title || title;
        }
      } catch (e) {
        console.warn('Readability parse failed, falling back to html strip:', e.message);
      }
    }

    // Fallback: strip tags from html_content
    if (!text && doc.html_content) {
      text = doc.html_content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Last resort: summary field
    if (!text && doc.summary) {
      text = doc.summary;
    }

    if (!text) {
      return res.status(422).json({ error: 'Could not extract text from this document. Try using the URL tab instead.' });
    }

    text = text.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    return res.status(200).json({
      title,
      text,
      wordCount,
      estimatedMinutes: Math.ceil(wordCount / 150),
      sourceUrl: doc.source_url || doc.url || null,
      author: doc.author || null,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
