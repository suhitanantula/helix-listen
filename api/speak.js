// API endpoint to convert text to speech using OpenAI

export const config = {
  maxDuration: 60,
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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const { text, voice = 'alloy', speed = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Limit to 4000 chars per request (client handles chunking)
    const inputText = text.slice(0, 4000);

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: inputText,
        voice: voice,
        speed: speed,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Return as audio stream
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (error) {
    console.error('TTS error:', error);
    return res.status(500).json({ error: error.message });
  }
}
