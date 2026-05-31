#!/usr/bin/env bash
# AEGIS Commercial Products — One-Command Deploy to Vercel
# Run this from your LOCAL machine (not the cloud container)
# Requires: vercel CLI installed + logged in + DASHSCOPE API key
#
# Usage:
#   export DASHSCOPE_KEY="sk-XXXXXXXXXXXXXXXX"   # your DashScope API key
#   bash scripts/deploy-products.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DASHSCOPE_KEY="${DASHSCOPE_KEY:-}"
PRODUCTS=("platform-picker" "hook-generator" "content-calendar" "hub")

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()    { echo -e "${GREEN}✓${NC} $*"; }
warn()   { echo -e "${YELLOW}⚠${NC} $*"; }
die()    { echo -e "${RED}✗ ERROR:${NC} $*"; exit 1; }

# ── Pre-flight checks ──────────────────────────────────────────────────────────
command -v vercel >/dev/null 2>&1 || die "vercel CLI not installed. Run: npm i -g vercel"
vercel whoami >/dev/null 2>&1 || die "Not logged in to Vercel. Run: vercel login"

if [[ -z "$DASHSCOPE_KEY" ]]; then
  echo ""
  warn "DASHSCOPE_KEY not set. Products will build but AI calls will fail."
  warn "Get your key from: dashscope.aliyun.com → API Keys"
  warn "Set it: export DASHSCOPE_KEY=sk-XXXXXXXXXXXXXXXX"
  echo ""
  read -p "Continue anyway? (y/N): " cont
  [[ "$cont" =~ ^[Yy]$ ]] || exit 0
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  AEGIS Ω — Deploying commercial products to Vercel"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── Deploy each product ────────────────────────────────────────────────────────
for product in "${PRODUCTS[@]}"; do
  dir="$REPO_ROOT/$product"
  [[ -d "$dir" ]] || { warn "Directory $product not found, skipping"; continue; }

  echo "▸ Deploying $product..."
  cd "$dir"

  # Build locally first to catch errors
  npm install --silent
  npm run build --silent
  log "$product build OK"

  # Deploy to Vercel production
  if [[ -n "$DASHSCOPE_KEY" && "$product" != "hub" ]]; then
    # Set env vars and deploy
    vercel --prod --yes \
      -e "VITE_DASHSCOPE_API_KEY=$DASHSCOPE_KEY" \
      -e "VITE_DASHSCOPE_MODEL=qwen-plus" \
      2>&1 | tail -5
  else
    vercel --prod --yes 2>&1 | tail -5
  fi

  log "$product deployed ✓"
  echo ""
done

cd "$REPO_ROOT"
echo "═══════════════════════════════════════════════════════"
echo ""
log "All products deployed!"
echo ""
echo "Next steps:"
echo "  1. Note the deployment URLs from above"
echo "  2. Update hub links to point to the deployed product URLs"
echo "  3. Set up Gumroad products (see DEPLOY.md):"
echo "     - aegis-platform-picker   → \$19"
echo "     - aegis-hook-generator    → \$19"
echo "     - aegis-content-calendar  → \$19"
echo "     - aegis-full-toolkit      → \$39 (bundle)"
echo ""
echo "  4. Point Gumroad product URLs to your Vercel deployment URLs"
echo ""
