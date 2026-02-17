// API endpoint to convert text to speech using MiniMax TTS

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

  const apiKey = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;
  if (!apiKey || !groupId) {
    return res.status(500).json({ error: 'MiniMax API key or Group ID not configured' });
  }

  try {
    const { text, voice = 'English_expressive_narrator', speed = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Split into chunks (MiniMax handles reasonable lengths, use ~4000 chars)
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
        const response = await fetch(
          `https://api.minimaxi.chat/v1/t2a_v2?GroupId=${groupId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'speech-2.6-hd',
              text: chunk,
              voice_setting: {
                voice_id: voice,
                speed: speed,
              },
              audio_setting: {
                format: 'mp3',
                audio_sample_rate: 32000,
                bitrate: 128000,
              },
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.base_resp?.status_msg || `MiniMax API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.base_resp && data.base_resp.status_code !== 0) {
          throw new Error(data.base_resp.status_msg || 'MiniMax API returned an error');
        }

        const audioHex = data.data?.audio;
        if (!audioHex) {
          throw new Error('No audio data in MiniMax response');
        }

        return { index: i + idx, buffer: Buffer.from(audioHex, 'hex') };
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
