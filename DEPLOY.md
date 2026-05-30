# AEGIS Ω — Deployment Guide

**Status:** Products ARE deployed on Vercel at these URLs.
**Branch:** `claude/aegis-setup-Lx7Ji`

---

## CRITICAL: Disable IP Allowlisting (Products are Live but Blocked)

The public product URLs may return 403 `host_not_allowed` when IP allowlisting is active.

**Fix for each project:**
1. Go to vercel.com → select the project (platform-picker / hook-generator / content-calendar / hub)
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


## Public Access Verification (Required Before Launch Announcement)

Complete this checklist for **every production deployment** before saying any product is launched, live, public, released, or ready for customers. This section is mandatory because Vercel can show a successful deployment while public visitors still receive an IP block, authentication wall, or deployment protection page.

### 1. Confirm Vercel Public Access Settings

For each Vercel project (`platform-picker`, `hook-generator`, `content-calendar`, and `hub`), verify both settings below in the Vercel dashboard:

1. **IP Allowlist dashboard path:** Vercel Dashboard → Project → **Settings** → **Security** → **IP Allowlist**.
   - Expected setting: no active IP restrictions for production public access.
2. **Deployment Protection dashboard path:** Vercel Dashboard → Project → **Settings** → **Deployment Protection**.
   - Expected setting: production deployment protection is disabled for public access, with no Vercel authentication, password, SSO, or preview-protection gate shown to visitors.

### 2. Verify Production HTTP Results

Run the HTTP checks from a network that is **not** logged in to Vercel and is not allowlisted. Each production URL must return a public success response.

| App | Production URL | Expected HTTP result | Failure results that block launch |
|---|---|---|---|
| `platform-picker` | `https://platform-picker.vercel.app` | `200 OK` with the Platform Picker app HTML | `403`, Vercel authentication wall, password wall, SSO wall, or deployment protection page |
| `hook-generator` | `https://hook-generator.vercel.app` | `200 OK` with the Hook Generator app HTML | `403`, Vercel authentication wall, password wall, SSO wall, or deployment protection page |
| `content-calendar` | `https://content-calendar.vercel.app` | `200 OK` with the Content Calendar app HTML | `403`, Vercel authentication wall, password wall, SSO wall, or deployment protection page |
| `hub` | `https://myapp.vercel.app` | `200 OK` with the Hub app HTML | `403`, Vercel authentication wall, password wall, SSO wall, or deployment protection page |
| `hub` | `https://aegis-hub.vercel.app` | `200 OK` with the Hub app HTML, if this alias is configured for production | `403`, Vercel authentication wall, password wall, SSO wall, deployment protection page, or unexpected unconfigured-domain page |

Suggested command:

```bash
for url in \
  https://platform-picker.vercel.app \
  https://hook-generator.vercel.app \
  https://content-calendar.vercel.app \
  https://myapp.vercel.app \
  https://aegis-hub.vercel.app
do
  printf '\n%s\n' "$url"
  curl -I -L --max-time 20 "$url" | sed -n '1,12p'
done
```

### 3. Browser Smoke Tests

Use a private/incognito browser window, signed out of Vercel, with extensions disabled if possible. Perform the smoke test for each product URL after the HTTP status is correct.

#### `platform-picker`

1. Open `https://platform-picker.vercel.app`.
2. Confirm the Platform Picker page loads without a 403, Vercel login, password prompt, SSO prompt, or deployment protection screen.
3. Confirm the main product UI renders and is not a blank page.
4. Start the primary platform-selection flow and verify the first user action works.
5. If a license gate is expected, confirm the app-owned license screen appears instead of any Vercel-owned access wall.

#### `hook-generator`

1. Open `https://hook-generator.vercel.app`.
2. Confirm the Hook Generator page loads without a 403, Vercel login, password prompt, SSO prompt, or deployment protection screen.
3. Confirm the main product UI renders and is not a blank page.
4. Start the primary hook-generation flow and verify the first user action works.
5. If a license gate is expected, confirm the app-owned license screen appears instead of any Vercel-owned access wall.

#### `content-calendar`

1. Open `https://content-calendar.vercel.app`.
2. Confirm the Content Calendar page loads without a 403, Vercel login, password prompt, SSO prompt, or deployment protection screen.
3. Confirm the main product UI renders and is not a blank page.
4. Start the primary calendar/planning flow and verify the first user action works.
5. If a license gate is expected, confirm the app-owned license screen appears instead of any Vercel-owned access wall.

#### `hub`

1. Open `https://myapp.vercel.app`.
2. If `https://aegis-hub.vercel.app` is configured, open it too.
3. Confirm each configured Hub URL loads without a 403, Vercel login, password prompt, SSO prompt, or deployment protection screen.
4. Confirm the Hub page renders and is not a blank page.
5. Click each product link from the Hub and confirm it opens the intended product or purchase page.

### 4. HALT Rule

**HALT: Do not announce launch, publish customer-facing launch copy, mark the product as live, or claim public availability while any app returns `403`, an authentication wall, a password/SSO wall, a deployment protection page, or any other Vercel-owned access block.**

Launch may only be announced after every configured production URL above returns the expected public HTTP result and passes its browser smoke test.

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
