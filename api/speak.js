// API endpoint to convert text to speech using OpenAI

export const config = {
  maxDuration: 300, // 5 minutes max for long documents
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

    // Split into chunks (OpenAI TTS limit is 4096 chars)
    const maxChunkSize = 4000;
    const chunks = [];
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.slice(i, i + maxChunkSize));
    }

    // Process chunks in parallel batches of 3
    const batchSize = 3;
    const audioBuffers = new Array(chunks.length);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchPromises = batch.map(async (chunk, idx) => {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: chunk,
            voice: voice,
            speed: speed,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `OpenAI API error: ${response.status}`);
        }

        return { index: i + idx, buffer: Buffer.from(await response.arrayBuffer()) };
      });

      const results = await Promise.all(batchPromises);
      results.forEach(({ index, buffer }) => {
        audioBuffers[index] = buffer;
      });
    }

    // Concatenate all audio buffers
    const combinedBuffer = Buffer.concat(audioBuffers);

    // Return as audio stream
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', combinedBuffer.length);
    return res.send(combinedBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    return res.status(500).json({ error: error.message });
  }
}
