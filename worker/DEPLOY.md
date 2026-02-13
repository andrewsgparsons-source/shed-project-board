# Deploying the Photo Upload Worker

## Prerequisites
- Free Cloudflare account (https://dash.cloudflare.com/sign-up)
- Node.js installed (already have this)

## Setup (one-time, ~5 minutes)

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```
This opens a browser — click authorize.

### 3. Deploy the worker
```bash
cd shed-project-board/worker
wrangler deploy
```
It'll give you a URL like: `https://gb-photo-upload.<your-subdomain>.workers.dev`

### 4. Set secrets
```bash
wrangler secret put GITHUB_TOKEN
# Paste your GitHub PAT (same one used for git pushes)

wrangler secret put UPLOAD_PASSWORD
# Choose a shared password (e.g. "shed2026photos")
```

### 5. Done!
The worker is live. First time you tap "Add Photo" on the dashboard, it'll ask for:
- **Worker URL**: the URL from step 3
- **Upload Password**: what you set in step 4

These are saved in your browser. Anyone you share them with can upload photos.

## For Whelpley Farm (later)
Add another secret:
```bash
wrangler secret put WHELPLEY_REPO
# Value: andrewsgparsons-source/whelpley-farm-dashboard
```

## Troubleshooting
- **CORS errors**: The worker handles CORS automatically
- **401 Unauthorized**: Wrong upload password
- **GitHub commit failed**: Check the GITHUB_TOKEN has repo write access
- **Photos not showing**: GitHub Pages can take 1-2 minutes to deploy after upload
