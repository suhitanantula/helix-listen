// API endpoint to convert text to speech using Google Cloud Text-to-Speech

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
        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
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

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Cloud API key not configured' });
  }

  try {
    const { text, voice = 'en-US-Standard-A', speed = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Validate voice to prevent API errors
    const validVoices = [
      // US Voices
      'en-US-Standard-A', 'en-US-Standard-B', 'en-US-Standard-C', 'en-US-Standard-D',
      'en-US-Standard-E', 'en-US-Standard-F', 'en-US-Standard-G', 'en-US-Standard-H',
      'en-US-Standard-I', 'en-US-Standard-J',
      'en-US-Wavenet-A', 'en-US-Wavenet-B', 'en-US-Wavenet-C', 'en-US-Wavenet-D',
      'en-US-Wavenet-E', 'en-US-Wavenet-F', 'en-US-Wavenet-G', 'en-US-Wavenet-H',
      'en-US-Wavenet-I', 'en-US-Wavenet-J',
      // UK Voices
      'en-GB-Standard-A', 'en-GB-Standard-B', 'en-GB-Standard-C', 'en-GB-Standard-D',
      'en-GB-Standard-F', 'en-GB-Standard-H', 'en-GB-Standard-I',
      'en-GB-Wavenet-A', 'en-GB-Wavenet-B', 'en-GB-Wavenet-C', 'en-GB-Wavenet-D',
      'en-GB-Wavenet-F', 'en-GB-Wavenet-H', 'en-GB-Wavenet-I',
      // Australian Voices
      'en-AU-Standard-A', 'en-AU-Standard-B', 'en-AU-Standard-C', 'en-AU-Standard-D',
      'en-AU-Wavenet-A', 'en-AU-Wavenet-B', 'en-AU-Wavenet-C', 'en-AU-Wavenet-D',
      // Other English variants
      'en-IN-Standard-A', 'en-IN-Standard-B', 'en-IN-Standard-C', 'en-IN-Standard-D',
      'en-IN-Wavenet-A', 'en-IN-Wavenet-B', 'en-IN-Wavenet-C', 'en-IN-Wavenet-D',
    ];

    // Determine voice gender and accent for auto-selection
    let languageCode = 'en-US';
    let ssmlGender = 'FEMALE';
    
    if (voice.includes('GB')) {
      languageCode = 'en-GB';
    } else if (voice.includes('AU')) {
      languageCode = 'en-AU';
    } else if (voice.includes('IN')) {
      languageCode = 'en-IN';
    }

    // Auto-detect gender based on voice name (A, C, E, F, H = Female; B, D, G, I, J = Male)
    const lastChar = voice.slice(-1);
    if (['B', 'D', 'G', 'I', 'J'].includes(lastChar)) {
      ssmlGender = 'MALE';
    }

    // Split into chunks by BYTES (Google Cloud TTS limit: 5000 bytes)
    // Use 4000 bytes to be safe and account for multi-byte characters
    const maxBytes = 4000;
    const chunks = [];
    let encoder = new TextEncoder();
    
    // Simple approach: split by sentences at safe boundaries
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';
    let currentBytes = 0;
    
    for (const sentence of sentences) {
      const sentenceBytes = encoder.encode(sentence).length;
      
      if (currentBytes + sentenceBytes > maxBytes && currentChunk.length > 0) {
        // Current chunk is full, save it and start new one
        chunks.push(currentChunk.trim());
        currentChunk = sentence + ' ';
        currentBytes = sentenceBytes;
      } else {
        // Add to current chunk
        currentChunk += sentence + ' ';
        currentBytes += sentenceBytes;
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    // If any single sentence is still too long, force-split it
    for (let i = 0; i < chunks.length; i++) {
      if (encoder.encode(chunks[i]).length > maxBytes) {
        // Hard split long chunk into smaller pieces
        const text = chunks[i];
        const subChunks = [];
        for (let j = 0; j < text.length; j += 3000) {
          subChunks.push(text.slice(j, j + 3000));
        }
        chunks.splice(i, 1, ...subChunks);
        i += subChunks.length - 1;
      }
    }

    // Process chunks sequentially with delay between requests
    const audioBuffers = [];
    const delayBetweenChunks = 500;

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        await delay(delayBetweenChunks);
      }

      const response = await fetchWithRetry(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              text: chunks[i],
            },
            voice: {
              languageCode: languageCode,
              name: voice,
              ssmlGender: ssmlGender,
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: speed,
              pitch: 0.0,
            },
          }),
        },
        3
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Google Cloud TTS API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.audioContent) {
        throw new Error('No audio data in Google Cloud TTS response');
      }

      audioBuffers.push(Buffer.from(data.audioContent, 'base64'));
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
