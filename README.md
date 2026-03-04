# 🎧 Listen - Article to Audio

A simple PWA that converts articles, PDFs, and markdown files into high-quality audio using **Google Cloud Text-to-Speech API**.

## Features

- **Paste any article URL** - automatically extracts readable content
- **Upload PDFs** - extracts text and converts to speech
- **Upload Markdown files** - strips formatting and converts to speech
- **Multiple voice options** - 20+ Standard & WaveNet voices (Male/Female)
- **Adjustable speed** - 0.75x to 1.5x
- **Works on iPhone & Android** - install as a PWA
- **Share target** - share URLs directly from your browser to the app
- **Download MP3** - save the audio for offline listening
- **FREE tier** - 4 million characters per month included!

## Quick Deploy to Vercel

### 1. Prerequisites

- A [Vercel](https://vercel.com) account (free tier works great)
- A [Google Cloud API key](https://console.cloud.google.com/) (FREE - 4M chars/month)

See **[GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md)** for detailed setup instructions.

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

### 3. Add Your API Credentials

In the Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add: `GOOGLE_CLOUD_API_KEY` = `your-google-cloud-api-key`
3. Redeploy (Settings → Deployments → Redeploy)

### 4. Install on Your Phone

1. Open your deployed URL on your phone
2. **iPhone**: Tap Share → "Add to Home Screen"
3. **Android**: Tap the install prompt or Menu → "Install app"

## Usage

1. **From the app**: Paste a URL, upload a PDF/Markdown file, or paste text — select voice/speed, tap Convert
2. **Share to app**: In any browser, tap Share and select "Listen" from your apps

## Cost Estimate

**Google Cloud TTS includes 4 million characters FREE per month!**

| Voice Type | Free Tier | After Free Tier |
|------------|-----------|-----------------|
| Standard | 4M chars/month | $4 per 1M chars |
| WaveNet | 4M chars/month | $4 per 1M chars |

**Example**: 100k characters/month (typical personal use) = **$0/month** 🎉

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (PWA)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Text extraction**: [@mozilla/readability](https://github.com/mozilla/readability) + PDF.js (client-side)
- **TTS**: [Google Cloud Text-to-Speech API](https://cloud.google.com/text-to-speech) (Standard & WaveNet voices)

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your credentials
cp .env.example .env.local
# Edit .env.local and add your Google Cloud API key

# Run locally
vercel dev
```

## Troubleshooting

**"Failed to extract text"**
- Some sites block scrapers. Try a different article or use Reader Mode first.

**"Google Cloud API key not configured"**
- Make sure you've added `GOOGLE_CLOUD_API_KEY` to Vercel environment variables and redeployed.

**"API disabled" error**
- Ensure you've enabled the Cloud Text-to-Speech API in your Google Cloud project.

**Audio cuts off for long articles**
- The app handles chunking automatically, but very long articles (10,000+ words) may take a while.

## License

MIT - do whatever you want with it!
