// API endpoint to convert text to speech using MiniMax TTS

export const config = {
  maxDuration: 300, // 5 minutes max for long documents
};

// Helper: delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: fetch with retry and exponential backoff
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Check for rate limit (429) or server errors (5xx)
      if (response.status === 429 || response.status >= 500) {
        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
        console.log(`Rate limited or server error (${response.status}), waiting ${Math.round(waitTime)}ms before retry ${attempt + 1}/${maxRetries}`);
        await delay(waitTime);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`Network error, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
      await delay(waitTime);
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

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

    // Split into chunks (MiniMax supports up to 10,000 chars, use 8,000 for safety)
    const maxChunkSize = 8000;
    const chunks = [];
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.slice(i, i + maxChunkSize));
    }

    // Process chunks sequentially with delay between requests
    const audioBuffers = [];
    const delayBetweenChunks = 500; // 500ms between chunks to avoid rate limits

    for (let i = 0; i < chunks.length; i++) {
      // Add delay between chunks (not before first)
      if (i > 0) {
        await delay(delayBetweenChunks);
      }

      const response = await fetchWithRetry(
        `https://api.minimaxi.chat/v1/t2a_v2?GroupId=${groupId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'speech-2.6-hd',
            text: chunks[i],
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
        },
        3 // max retries
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

      audioBuffers.push(Buffer.from(audioHex, 'hex'));
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
