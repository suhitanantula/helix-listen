# 🎧 Listen - Article to Audio

A simple PWA that converts articles, PDFs, and markdown files into high-quality audio using MiniMax's TTS API.

## Features

- **Paste any article URL** - automatically extracts readable content
- **Upload PDFs** - extracts text and converts to speech
- **Upload Markdown files** - strips formatting and converts to speech
- **6 voice options** - Expressive Narrator, Captivating Storyteller, Calm Woman, Magnetic Man, Radiant Girl, Deep Voice
- **Adjustable speed** - 0.75x to 1.5x
- **Works on iPhone & Android** - install as a PWA
- **Share target** - share URLs directly from your browser to the app
- **Download MP3** - save the audio for offline listening

## Quick Deploy to Vercel

### 1. Prerequisites

- A [Vercel](https://vercel.com) account (free tier works great)
- A [MiniMax API key](https://www.minimaxi.com/) and Group ID

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
2. Add: `MINIMAX_API_KEY` = `your-minimax-api-key`
3. Add: `MINIMAX_GROUP_ID` = `your-minimax-group-id`
4. Redeploy (Settings → Deployments → Redeploy)

### 4. Install on Your Phone

1. Open your deployed URL on your phone
2. **iPhone**: Tap Share → "Add to Home Screen"
3. **Android**: Tap the install prompt or Menu → "Install app"

## Usage

1. **From the app**: Paste a URL, upload a PDF/Markdown file, or paste text — select voice/speed, tap Convert
2. **Share to app**: In any browser, tap Share and select "Listen" from your apps

## Cost Estimate

MiniMax TTS pricing is significantly lower than OpenAI — check [MiniMax pricing](https://www.minimaxi.com/) for current rates.

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (PWA)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Text extraction**: [@mozilla/readability](https://github.com/mozilla/readability) + PDF.js (client-side)
- **TTS**: [MiniMax T2A v2 API](https://www.minimaxi.com/) (speech-2.6-hd model)

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your credentials
cp .env.example .env.local
# Edit .env.local and add your MiniMax API key and Group ID

# Run locally
vercel dev
```

## Troubleshooting

**"Failed to extract text"**
- Some sites block scrapers. Try a different article or use Reader Mode first.

**"MiniMax API key or Group ID not configured"**
- Make sure you've added both `MINIMAX_API_KEY` and `MINIMAX_GROUP_ID` to Vercel environment variables and redeployed.

**Audio cuts off for long articles**
- The app handles chunking automatically, but very long articles (10,000+ words) may take a while.

## License

MIT - do whatever you want with it!
