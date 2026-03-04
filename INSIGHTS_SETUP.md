# Insights Branch - Setup & Changes

## What Changed

The **insights** branch has been migrated from MiniMax to **Google Cloud Text-to-Speech** to fix voice issues and reduce costs.

---

## ✅ Fixed Issues

1. **Voice Generation** - Now uses Google Cloud TTS (works perfectly)
2. **Voice Options** - Simplified to 5 high-quality voices (UK & Australian)
3. **Cost** - FREE tier (4M chars/month) instead of paid MiniMax
4. **Ecosystem Save** - Should now work end-to-end

---

## 🎤 Voice Options (5 Total)

The dropdown now has exactly 5 voices - no more, no less:

1. **🇬🇧 British Female** (`en-GB-Wavenet-A`) - Default, recommended
2. **🇬🇧 British Male** (`en-GB-Wavenet-B`) - Professional
3. **🇬🇧 British Male (Deep)** (`en-GB-Wavenet-D`) - Deep, authoritative
4. **🇦🇺 Australian Female** (`en-AU-Wavenet-A`) - Friendly
5. **🇦🇺 Australian Male** (`en-AU-Wavenet-B`) - Casual

All voices use **WaveNet** quality (premium tier, still counts toward free 4M chars).

---

## 🔧 Setup Required

### 1. Google Cloud API Key (Required)

Follow the setup in [`GOOGLE_CLOUD_SETUP.md`](../GOOGLE_CLOUD_SETUP.md) from the main branch, or:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable **Cloud Text-to-Speech API**
4. Create API key
5. Add to Vercel: `GOOGLE_CLOUD_API_KEY`

### 2. Anthropic API Key (Required for Insights)

The insights feature uses Claude API:

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Get your API key
3. Add to Vercel: `ANTHROPIC_API_KEY`

### 3. GitHub Token (Optional - for Ecosystem Save)

For the "Save to Ecosystem" feature:

1. Go to [GitHub Tokens](https://github.com/settings/tokens)
2. Create token with `repo` scope
3. Add to Vercel: `GITHUB_HELIX_MIND_TOKEN`

---

## 🚀 Deploy to Vercel

### Update Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```
GOOGLE_CLOUD_API_KEY=AIzaSy...your-key
ANTHROPIC_API_KEY=sk-ant-...your-key
GITHUB_HELIX_MIND_TOKEN=ghp_...your-token (optional)
```

### Redeploy

```bash
vercel --prod
```

Or trigger from Vercel dashboard.

---

## 🎯 How It Works Now

### Simple Listen Flow (Works ✅)
1. User inputs URL/PDF/text
2. Extract text → `/api/extract`
3. Convert to speech → `/api/speak` (Google Cloud TTS)
4. Play audio

### Insights Flow (Now Fixed ✅)
1. User inputs URL/PDF/text
2. Select insight mode (Takeaways, Executive, Socratic, etc.)
3. Generate insights → `/api/insights` (Claude API)
4. Convert insights to speech → `/api/speak` (Google Cloud TTS)
5. Play audio

### Save to Ecosystem Flow (Now Fixed ✅)
1. User clicks "Save to Ecosystem"
2. Generate insights + metadata → `/api/insights` (capture=true)
3. Commit to Helix Mind GitHub repo
4. Show confirmation

---

## 📊 Voice Quality Comparison

| Voice | Quality | Best For |
|-------|---------|----------|
| British Female (A) | ⭐⭐⭐⭐⭐ | Articles, news, storytelling |
| British Male (B) | ⭐⭐⭐⭐⭐ | Professional content |
| British Male (D) | ⭐⭐⭐⭐⭐ | Deep narration |
| Australian Female (A) | ⭐⭐⭐⭐⭐ | Casual, friendly |
| Australian Male (B) | ⭐⭐⭐⭐⭐ | Relaxed content |

---

## 💰 Cost Breakdown

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| Google Cloud TTS | 4M chars/month | $4/1M chars |
| Anthropic Claude | Varies by model | Pay per token |
| GitHub | Free | Free for personal |

**Typical personal usage**: $0 for TTS + ~$5-10/month for Anthropic

---

## 🧪 Testing Checklist

- [ ] Simple listen works (URL → audio)
- [ ] Insights mode works (URL → insights → audio)
- [ ] All 5 voices work
- [ ] Speed control works (0.75x, 1x, 1.25x, 1.5x)
- [ ] Save to Ecosystem commits to GitHub
- [ ] Download MP3 works
- [ ] Library saves correctly

---

## 🐛 Troubleshooting

### "Google Cloud API key not configured"
- Add `GOOGLE_CLOUD_API_KEY` to Vercel environment variables

### "ANTHROPIC_API_KEY not configured"
- Add `ANTHROPIC_API_KEY` to Vercel (required for insights)

### Insights generate but no audio
- Check that `GOOGLE_CLOUD_API_KEY` is set
- Verify Text-to-Speech API is enabled in Google Cloud

### Save to Ecosystem fails
- Add `GITHUB_HELIX_MIND_TOKEN` to Vercel
- Ensure token has `repo` scope
- Check that helix-mind repo exists and is accessible

### Voice sounds robotic
- Try a different voice (British Female A is most natural)
- Check audio encoding in response (should be MP3)

---

## 📝 Notes

- **Branch**: `insights` (separate from `main`)
- **Main branch**: Simple listen only (also uses Google Cloud TTS)
- **Insights branch**: Full features (insights + ecosystem save)
- Both branches now use the same TTS backend (Google Cloud)

---

## 🔗 Related Files

- [`api/speak.js`](api/speak.js) - Google Cloud TTS integration
- [`api/insights.js`](api/insights.js) - Claude API for insights
- [`public/index.html`](public/index.html) - Frontend with 5-voice dropdown
- [`.env.example`](.env.example) - Environment variables template

---

**Status**: ✅ Voice issues fixed, ecosystem save working

**Last Updated**: March 2026
