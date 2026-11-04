# Phase 5 setup: Cloudflare Worker + Claude API

The app works without this — meals just save as text with a "needs analysis" status. Do these steps whenever you're ready to turn on AI food analysis.

## 1. Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com), sign up or sign in.
2. **Settings → Limits**: set a **monthly spend limit of $5**. This is the hard cost cap from the PRD; the Worker's own 30/day limit is a second backstop.
3. **API Keys → Create Key**, copy it somewhere safe (you'll paste it into `wrangler secret put` below, not into any file).

## 2. Cloudflare account

1. Sign up at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) (free plan is enough).
2. From the `worker/` folder, authenticate the CLI:
   ```bash
   cd worker
   npx wrangler login
   ```
   This opens a browser tab to authorize — approve it.

## 3. Create the KV namespace (rate limiting)

```bash
npx wrangler kv namespace create RATE_LIMIT
```

It prints an `id`. Open `worker/wrangler.toml` and replace `REPLACE_WITH_KV_NAMESPACE_ID` with that id.

If your GitHub username isn't `Adamcguz` or you renamed the repo, also update `ALLOWED_ORIGIN` in `wrangler.toml` to match your actual Pages URL.

## 4. Set the API key secret

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

Paste the key from step 1 when prompted. This stores it encrypted in Cloudflare — it never touches the repo or this chat.

## 5. Deploy the Worker

```bash
npm install
npm run deploy
```

Wrangler prints a URL like `https://health-tracker-worker.<your-subdomain>.workers.dev`. Copy it.

## 6. Point the app at the Worker

Two places need that URL:

**For local development**, create `.env.local` in the project root (already gitignored):
```
VITE_WORKER_URL=https://health-tracker-worker.<your-subdomain>.workers.dev
```

**For the deployed GitHub Pages site**, add a repository variable so the build picks it up:
```bash
gh variable set WORKER_URL --body "https://health-tracker-worker.<your-subdomain>.workers.dev"
```
Then push any commit (or re-run the last "Deploy to GitHub Pages" action) to rebuild with it baked in.

## Verifying it worked

Open Settings in the app — "AI food analysis" should say "connected" instead of "not set up yet". Log a meal on the Food tab and confirm it returns a breakdown instead of "Needs analysis".

## Cost monitoring

Settings also shows this month's analysis count. At Haiku 5.5 pricing (~$0.10/$0.50 per million input/output tokens) and the Worker's 30/day cap, expect well under $1/month even at max usage — see the PRD's cost-cap math.
