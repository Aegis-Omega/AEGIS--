# AEGIS Ω — Deployment Guide

All builds verified clean on branch claude/aegis-setup-Lx7Ji.

---

## Step 1 — Fix existing `myapp` Vercel project → deploys hub (landing page)

The existing `myapp` project has Root Directory set to `sovereign-omega-v2`.
Change it so the root `vercel.json` takes over and deploys hub instead.

1. Go to: vercel.com/tariks-projects-e9198507/myapp/settings
2. General → Root Directory → **clear it completely** (blank = repo root) → Save
3. Deployments → Redeploy latest from branch `claude/aegis-setup-Lx7Ji`
4. Add env vars: VITE_DASHSCOPE_API_KEY + VITE_DASHSCOPE_MODEL=qwen-plus

Result: myapp.vercel.app → hub (landing page linking to all products)

---

## Step 2 — Create 3 new projects for the commercial products

Go to vercel.com/new for each. Import tarikskalic33/myapp.

### platform-picker
Root Directory: `platform-picker`
Env: VITE_DASHSCOPE_API_KEY=LTAI5tCeUz1QrPd6mk8N7nN8
Env: VITE_DASHSCOPE_MODEL=qwen-plus

### hook-generator
Root Directory: `hook-generator`
Env: VITE_DASHSCOPE_API_KEY=LTAI5tCeUz1QrPd6mk8N7nN8
Env: VITE_DASHSCOPE_MODEL=qwen-plus

### content-calendar
Root Directory: `content-calendar`
Env: VITE_DASHSCOPE_API_KEY=LTAI5tCeUz1QrPd6mk8N7nN8
Env: VITE_DASHSCOPE_MODEL=qwen-plus

---

## Step 3 — Sovereign Omega Runtime (governance dashboard)

Still needed as a separate project if you want the governance UI deployed.
Root Directory: `sovereign-omega-v2`
No env vars required for build.

---

## Studio + Cockpit (Docker — optional)

Run the full stack locally or on a VPS:
```bash
docker compose up --build   # from repo root
# cockpit: localhost:3000
# studio:  localhost:3001
# bridge:  localhost:7890
```
Requires VITE_BRIDGE_URL to point to hosted bridge.py for live telemetry.

---

## Gumroad Pricing
Platform Picker: $19 | Hook Generator: $19 | Content Calendar: $19
Any 2: $29 | All 3 (Full Creator AI Toolkit): $39
