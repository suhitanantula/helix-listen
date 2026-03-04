// API endpoint to convert text to speech using Google Cloud Text-to-Speech

export const config = {
  maxDuration: 300, // 5 minutes max for long documents
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Google Cloud API key not configured' });

  try {
    const { text, voice = 'en-GB-Wavenet-A', speed = 1.0 } = req.body;

    if (!text) return res.status(400).json({ error: 'No text provided' });

    // Validate voice and determine language/gender
    let languageCode = 'en-US';
    let ssmlGender = 'FEMALE';
    
    if (voice.includes('GB')) languageCode = 'en-GB';
    else if (voice.includes('AU')) languageCode = 'en-AU';
    
    const lastChar = voice.slice(-1);
    if (['B', 'D', 'G', 'I', 'J'].includes(lastChar)) ssmlGender = 'MALE';

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

    // Process chunks sequentially
    const audioBuffers = [];

    for (let i = 0; i < chunks.length; i++) {
      // Add small delay between chunks (except before first)
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: chunks[i] },
            voice: {
              languageCode,
              name: voice,
              ssmlGender,
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: speed,
              pitch: 0.0,
            },
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Google Cloud TTS error: ${response.status}`);
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
