// API endpoint to extract text from URLs and PDFs
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, pdfBase64 } = req.body;

    let text = '';
    let title = '';

    if (url) {
      // Fetch and parse article
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ListenApp/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        throw new Error('Could not extract article content');
      }

      title = article.title || 'Article';
      text = article.textContent;
    } else if (pdfBase64) {
      // Parse PDF
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = Buffer.from(pdfBase64, 'base64');
      const data = await pdfParse(buffer);
      title = 'PDF Document';
      text = data.text;
    } else {
      return res.status(400).json({ error: 'No URL or PDF provided' });
    }

    // Clean up the text
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Estimate reading time (avg 150 words per minute for speech)
    const wordCount = text.split(/\s+/).length;
    const estimatedMinutes = Math.ceil(wordCount / 150);

    return res.status(200).json({
      title,
      text,
      wordCount,
      estimatedMinutes,
      // Truncate for TTS (OpenAI has a 4096 char limit per request)
      // We'll chunk it on the frontend
      charCount: text.length,
    });
  } catch (error) {
    console.error('Extraction error:', error);
    return res.status(500).json({ error: error.message });
  }
}
