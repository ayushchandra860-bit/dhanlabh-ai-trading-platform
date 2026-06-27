# Deployment Guide

## GitHub

1. Create a GitHub repository.
2. Commit this project.
3. Push the main branch.

## Render

1. In Render, choose **New → Blueprint**.
2. Select the GitHub repository.
3. Render will read `render.yaml`.
4. Add optional environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TWELVEDATA_API_KEY`
5. Deploy.

The Render service uses:

- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check: `/api/health`

## Supabase PostgreSQL

The app runs without Supabase, but production persistence should use it.

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `backend/supabase.schema.sql`.
4. Copy your project URL and service role key into Render environment variables.

## Local verification checklist

Run:

```bash
npm install
npm run build
npm run start
```

Then verify:

- `/api/health` returns OK.
- Dashboard loads at `http://localhost:10000`.
- Asset switching works.
- WebSocket status becomes live or polling.
- Backtest button returns metrics.
- Journal saves entries.
- Screenshot AI returns an analysis.
