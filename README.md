# 🎧 Listen - Article to Audio

A simple PWA that converts articles and PDFs into high-quality audio using OpenAI's TTS API.

## Features

- **Paste any article URL** - automatically extracts readable content
- **Upload PDFs** - extracts text and converts to speech
- **6 voice options** - choose from Alloy, Echo, Fable, Onyx, Nova, or Shimmer
- **Adjustable speed** - 0.75x to 1.5x
- **Works on iPhone & Android** - install as a PWA
- **Share target** - share URLs directly from your browser to the app
- **Download MP3** - save the audio for offline listening

## Quick Deploy to Vercel

### 1. Prerequisites

- A [Vercel](https://vercel.com) account (free tier works great)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 2. Deploy

**Option A: One-Click Deploy**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/listen-app)

**Option B: Manual Deploy**

```bash
# Install Vercel CLI
npm i -g vercel

# Clone/download this folder, then:
cd listen-app
vercel login
vercel
```

### 3. Add Your API Key

In the Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add: `OPENAI_API_KEY` = `your-openai-api-key`
3. Redeploy (Settings → Deployments → Redeploy)

### 4. Install on Your Phone

1. Open your deployed URL on your phone
2. **iPhone**: Tap Share → "Add to Home Screen"
3. **Android**: Tap the install prompt or Menu → "Install app"

## Usage

1. **From the app**: Paste a URL or upload a PDF, select voice/speed, tap Convert
2. **Share to app**: In any browser, tap Share and select "Listen" from your apps

## Cost Estimate

OpenAI TTS pricing is ~$15 per 1 million characters.

- Average article (2,000 words / ~10,000 chars): **~$0.15**
- Average book chapter (5,000 words / ~25,000 chars): **~$0.38**

For casual use (few articles per day), expect **$1-5/month**.

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (PWA)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Text extraction**: [@mozilla/readability](https://github.com/mozilla/readability) + [pdf-parse](https://www.npmjs.com/package/pdf-parse)
- **TTS**: [OpenAI Audio API](https://platform.openai.com/docs/guides/text-to-speech)

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your API key
cp .env.example .env.local
# Edit .env.local and add your key

# Run locally
vercel dev
```

## Troubleshooting

**"Failed to extract text"**
- Some sites block scrapers. Try a different article or use Reader Mode first.

**"OpenAI API key not configured"**
- Make sure you've added `OPENAI_API_KEY` to Vercel environment variables and redeployed.

**Audio cuts off for long articles**
- The app handles chunking automatically, but very long articles (10,000+ words) may take a while.

## License

MIT - do whatever you want with it!
