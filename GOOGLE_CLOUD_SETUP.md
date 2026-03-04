# Google Cloud TTS Setup Guide

## Migration from MiniMax to Google Cloud Text-to-Speech

This guide will help you set up Google Cloud TTS for Helix Listen. **You get 4 million characters FREE per month** - enough for most personal projects!

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or select an existing project
3. Give it a name like "helix-listen" and click **Create**

---

## Step 2: Enable the Text-to-Speech API

1. In your project, go to **APIs & Services** > **Library**
2. Search for **"Cloud Text-to-Speech API"**
3. Click on it and press **Enable**

---

## Step 3: Create API Credentials

### Option A: API Key (Simplest)

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **API key**
3. Copy the generated API key
4. (Recommended) Click **Edit API key** > **Restrict key**
   - Under **API restrictions**, select **Cloud Text-to-Speech API**
   - Under **Application restrictions**, select **HTTP referrers** and add your Vercel domain
5. Save the key

### Option B: Service Account (More Secure)

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **Service account**
3. Give it a name like "helix-listen-tts"
4. Click **Create and continue**
5. Go to the **Keys** tab
6. Click **Add key** > **Create new key**
7. Select **JSON** format and download
8. You'll need to convert this to a base64 string for Vercel

---

## Step 4: Set Up Environment Variables

### For Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your API key:
   ```
   GOOGLE_CLOUD_API_KEY=AIzaSy...your-actual-key-here
   ```

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add a new variable:
   - **Name**: `GOOGLE_CLOUD_API_KEY`
   - **Value**: Your API key
   - **Environment**: Production (and Preview/Development if needed)
4. Click **Save**

---

## Step 5: Test Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the dev server:
   ```bash
   npm run dev
   ```

3. Test the `/api/speak` endpoint with a sample text

---

## Step 6: Deploy to Vercel

```bash
vercel --prod
```

---

## Voice Options

### Standard Voices (Free Tier - 4M chars/month)
- `en-US-Standard-A` - Female
- `en-US-Standard-B` - Male
- `en-US-Standard-C` - Female
- `en-US-Standard-D` - Male
- `en-US-Standard-E` - Female
- `en-US-Standard-F` - Female
- `en-US-Standard-G` - Male
- `en-US-Standard-H` - Female
- `en-US-Standard-I` - Male
- `en-US-Standard-J` - Male

### WaveNet Voices (Better Quality - Count toward free tier)
- `en-US-Wavenet-A` - Female
- `en-US-Wavenet-B` - Male
- `en-US-Wavenet-C` - Female
- `en-US-Wavenet-D` - Male
- `en-US-Wavenet-E` - Female
- `en-US-Wavenet-F` - Female
- `en-US-Wavenet-G` - Male
- `en-US-Wavenet-H` - Male
- `en-US-Wavenet-I` - Male
- `en-US-Wavenet-J` - Male

### Studio Voices (Premium Quality - $160/1M chars)
- `en-US-Studio-O` - Female
- `en-US-Studio-Q` - Male

**Recommendation**: Start with `en-US-Standard-A` or try `en-US-Wavenet-A` for better quality. Both count toward your 4M free characters!

---

## Pricing

| Voice Type | Free Tier | After Free Tier |
|------------|-----------|-----------------|
| Standard | 4M chars/month | $4 per 1M chars |
| WaveNet | 4M chars/month | $4 per 1M chars |
| Neural2 | 1M chars/month | $16 per 1M chars |
| Studio | 1M chars/month | $160 per 1M chars |

**For personal use, you'll likely stay within the free tier!**

---

## Monitoring Usage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Dashboard**
4. Click on **Cloud Text-to-Speech API**
5. View your usage charts and quotas

---

## Troubleshooting

### "API key not configured" error
- Make sure `GOOGLE_CLOUD_API_KEY` is set in `.env.local` (local) or Vercel (production)

### "API disabled" error
- Ensure you've enabled the Cloud Text-to-Speech API in your Google Cloud project

### "Quota exceeded" error
- You've exceeded the free tier limit. Check your usage in Google Cloud Console
- Consider upgrading to a paid plan or optimizing your text length

### Poor audio quality
- Try WaveNet voices (e.g., `en-US-Wavenet-A`) for better quality
- Adjust the `speed` parameter (0.25 to 4.0, where 1.0 is normal)

---

## Comparison: MiniMax vs Google Cloud TTS

| Feature | MiniMax | Google Cloud TTS |
|---------|---------|------------------|
| Free Tier | None | 4M chars/month |
| Cost (standard) | ~$16-25/1M chars | $4/1M chars |
| Voice Quality | Good | Good-Excellent |
| Setup Complexity | Medium | Easy |
| Monthly Cost (100k chars) | ~$2.50 | **$0** |

**You'll save ~$30/year for typical personal usage!**

---

## Next Steps

1. ✅ Set up Google Cloud project
2. ✅ Get API key
3. ✅ Update `.env.local`
4. ✅ Test locally
5. ✅ Deploy to Vercel
6. ✅ Monitor usage

Enjoy your cost savings! 🎉
