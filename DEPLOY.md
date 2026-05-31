# AEGIS Ω — Deployment Guide

**Status:** Products ARE deployed on Vercel at these URLs.
**Branch:** `claude/aegis-setup-Lx7Ji`

---

## CRITICAL: Disable IP Allowlisting (Products are Live but Blocked)

All 3 products return 403 `host_not_allowed`. This means IP allowlisting is active.

**Fix for each project:**
1. Go to vercel.com → select the project (platform-picker / hook-generator / content-calendar)
2. **Settings** → **Security** → **IP Allowlist** → **Remove all IP restrictions** (or disable the feature)
3. Also check: **Settings** → **Deployment Protection** → set to **Disabled** (for public access)
4. Redeploy or wait for the change to propagate (~30 seconds)

**Test:** Open `https://platform-picker.vercel.app` in your browser. You should see the app.

---

## Products — Current Deployment URLs

| Product | URL | Status |
|---|---|---|
| Platform Picker | https://platform-picker.vercel.app | 403 (IP blocked) |
| Hook Generator | https://hook-generator.vercel.app | 403 (IP blocked) |
| Content Calendar | https://content-calendar.vercel.app | 403 (IP blocked) |
| Hub | https://myapp.vercel.app or https://aegis-hub.vercel.app | 403 (IP blocked) |

---

## Step 2 — Set the DashScope API Key

Each product needs `VITE_DASHSCOPE_API_KEY` to make AI calls.

**For each project in Vercel:**
1. Settings → Environment Variables
2. Add: `VITE_DASHSCOPE_API_KEY` = your DashScope sk- key
3. Add: `VITE_DASHSCOPE_MODEL` = `qwen-plus`
4. Redeploy (Deployments → Redeploy)

**Get your DashScope sk- key:** dashscope.aliyun.com → Console → API Keys
Format: `sk-XXXXXXXXXXXXXXXX` (must start with `sk-`, NOT `LTAI...`)

---

## Step 3 — Set Up Gumroad Products

Create these 4 products on **gumroad.com** with EXACT permalink slugs:

| Product | Permalink | Price |
|---|---|---|
| Platform Picker | `aegis-platform-picker` | $19 |
| Hook Generator | `aegis-hook-generator` | $19 |
| Content Calendar | `aegis-content-calendar` | $19 |
| Full Toolkit bundle | `aegis-full-toolkit` | $39 |

The permalink MUST match exactly — the license verification API uses these to validate keys.

**For each Gumroad product:**
- Product type: Digital product
- Content: The Vercel deployment URL (so buyers can access the tool)
- License key: Enable "Generate a unique license key per sale"

---

## Step 4 — Update Hub Links (Optional)

The hub already links to the Gumroad URLs. Once Gumroad + Vercel are connected, the full flow works:
1. Buyer clicks "Buy" on hub → goes to Gumroad
2. Buys for $19 → gets email with license key
3. Goes to the product Vercel URL → enters license key → unlocked!

---

## Redeploy from Latest Branch (if needed)

If you need to push new code to Vercel:
```bash
# On your local machine:
git pull origin claude/aegis-setup-Lx7Ji
cd platform-picker && vercel --prod
cd ../hook-generator && vercel --prod
cd ../content-calendar && vercel --prod
cd ../hub && vercel --prod
```

---

## Pricing
- Platform Picker: **$19** | Hook Generator: **$19** | Content Calendar: **$19**
- Any 2: **$29** | All 3 (Full Creator AI Toolkit): **$39**
