#!/usr/bin/env bash
# wire-custom-domain.sh
#
# Wires aegis-vertex.aegisomega.com → aegis-vertex Cloud Run (europe-west3)
# via Global HTTPS Load Balancer + Serverless NEG.
#
# Domain mappings are unsupported in europe-west3 — this is the correct path.
#
# Run from Cloud Shell:
#   bash scripts/wire-custom-domain.sh
#
# After the script completes:
#   1. Add a DNS A record in Cloudflare:
#      aegis-vertex.aegisomega.com  →  <IP printed by this script>
#      (or AAAA for IPv6 — the script prints both if available)
#   2. Certificate provisioning takes 10–20 min after DNS propagates.
#   3. Smoke test:  curl -I https://aegis-vertex.aegisomega.com/health
#
# The script is idempotent — re-running skips resources that already exist.

set -euo pipefail

PROJECT="aegisomegav1"
REGION="europe-west3"
SERVICE="aegis-vertex"
DOMAIN="aegis-vertex.aegisomega.com"

# Resource names (stable — never change after creation)
NEG_NAME="aegis-vertex-neg"
BACKEND_NAME="aegis-vertex-backend"
URLMAP_NAME="aegis-vertex-urlmap"
CERT_NAME="aegis-vertex-cert"
PROXY_NAME="aegis-vertex-https-proxy"
RULE_NAME="aegis-vertex-fwd-rule"
IP_NAME="aegis-vertex-ip"

echo "=== AEGIS-Ω custom domain wiring ==="
echo "Project : $PROJECT"
echo "Region  : $REGION"
echo "Service : $SERVICE"
echo "Domain  : $DOMAIN"
echo ""

# ── 1. Reserve a global static IP ───────────────────────────────────────────
echo "[1/8] Reserving global static IP..."
if gcloud compute addresses describe "$IP_NAME" --global --project "$PROJECT" &>/dev/null; then
  echo "  → already exists, skipping"
else
  gcloud compute addresses create "$IP_NAME" \
    --global \
    --ip-version=IPV4 \
    --project "$PROJECT"
  echo "  → created"
fi

LB_IP=$(gcloud compute addresses describe "$IP_NAME" \
  --global --project "$PROJECT" --format="get(address)")
echo "  → IP: $LB_IP"

# ── 2. Create Serverless NEG for Cloud Run ───────────────────────────────────
echo "[2/8] Creating Serverless NEG..."
if gcloud compute network-endpoint-groups describe "$NEG_NAME" \
    --region "$REGION" --project "$PROJECT" &>/dev/null; then
  echo "  → already exists, skipping"
else
  gcloud compute network-endpoint-groups create "$NEG_NAME" \
    --region="$REGION" \
    --network-endpoint-type=SERVERLESS \
    --cloud-run-service="$SERVICE" \
    --project "$PROJECT"
  echo "  → created"
fi

# ── 3. Create backend service ────────────────────────────────────────────────
echo "[3/8] Creating backend service..."
if gcloud compute backend-services describe "$BACKEND_NAME" \
    --global --project "$PROJECT" &>/dev/null; then
  echo "  → already exists, skipping"
else
  gcloud compute backend-services create "$BACKEND_NAME" \
    --global \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --project "$PROJECT"
  echo "  → created"
fi

# Add NEG to backend service (idempotent check via backend list)
EXISTING_BACKEND=$(gcloud compute backend-services describe "$BACKEND_NAME" \
  --global --project "$PROJECT" --format="get(backends)" 2>/dev/null || echo "")
if echo "$EXISTING_BACKEND" | grep -q "$NEG_NAME"; then
  echo "  → NEG already attached, skipping"
else
  gcloud compute backend-services add-backend "$BACKEND_NAME" \
    --global \
    --network-endpoint-group="$NEG_NAME" \
    --network-endpoint-group-region="$REGION" \
    --project "$PROJECT"
  echo "  → NEG attached"
fi

# ── 4. Create URL map ────────────────────────────────────────────────────────
echo "[4/8] Creating URL map..."
if gcloud compute url-maps describe "$URLMAP_NAME" \
    --global --project "$PROJECT" &>/dev/null; then
  echo "  → already exists, skipping"
else
  gcloud compute url-maps create "$URLMAP_NAME" \
    --default-service="$BACKEND_NAME" \
    --global \
    --project "$PROJECT"
  echo "  → created"
fi

# ── 5. Provision Google-managed SSL certificate ──────────────────────────────
echo "[5/8] Provisioning managed SSL certificate for $DOMAIN..."
if gcloud compute ssl-certificates describe "$CERT_NAME" \
    --global --project "$PROJECT" &>/dev/null; then
  echo "  → already exists, skipping"
else
  gcloud compute ssl-certificates create "$CERT_NAME" \
    --domains="$DOMAIN" \
    --global \
    --project "$PROJECT"
  echo "  → created (will become ACTIVE once DNS points to $LB_IP)"
fi

# ── 6. Create HTTPS target proxy ─────────────────────────────────────────────
echo "[6/8] Creating HTTPS target proxy..."
if gcloud compute target-https-proxies describe "$PROXY_NAME" \
    --global --project "$PROJECT" &>/dev/null; then
  echo "  → already exists, skipping"
else
  gcloud compute target-https-proxies create "$PROXY_NAME" \
    --url-map="$URLMAP_NAME" \
    --ssl-certificates="$CERT_NAME" \
    --global \
    --project "$PROJECT"
  echo "  → created"
fi

# ── 7. Create HTTP→HTTPS redirect ─────────────────────────────────────────
# (URL map for the redirect)
HTTP_URLMAP_NAME="aegis-vertex-http-redirect"
HTTP_PROXY_NAME="aegis-vertex-http-proxy"
HTTP_RULE_NAME="aegis-vertex-http-fwd-rule"

echo "[7/8] Creating HTTP→HTTPS redirect..."
if ! gcloud compute url-maps describe "$HTTP_URLMAP_NAME" \
    --global --project "$PROJECT" &>/dev/null; then
  gcloud compute url-maps import "$HTTP_URLMAP_NAME" \
    --global --project "$PROJECT" <<'YAML'
name: aegis-vertex-http-redirect
defaultUrlRedirect:
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
  httpsRedirect: true
YAML
  echo "  → HTTP redirect URL map created"
else
  echo "  → HTTP redirect URL map already exists, skipping"
fi

if ! gcloud compute target-http-proxies describe "$HTTP_PROXY_NAME" \
    --global --project "$PROJECT" &>/dev/null; then
  gcloud compute target-http-proxies create "$HTTP_PROXY_NAME" \
    --url-map="$HTTP_URLMAP_NAME" \
    --global \
    --project "$PROJECT"
  echo "  → HTTP proxy created"
else
  echo "  → HTTP proxy already exists, skipping"
fi

if ! gcloud compute forwarding-rules describe "$HTTP_RULE_NAME" \
    --global --project "$PROJECT" &>/dev/null; then
  gcloud compute forwarding-rules create "$HTTP_RULE_NAME" \
    --address="$LB_IP" \
    --global \
    --target-http-proxy="$HTTP_PROXY_NAME" \
    --ports=80 \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --project "$PROJECT"
  echo "  → HTTP forwarding rule created"
else
  echo "  → HTTP forwarding rule already exists, skipping"
fi

# ── 8. Create HTTPS forwarding rule ─────────────────────────────────────────
echo "[8/8] Creating HTTPS forwarding rule..."
if gcloud compute forwarding-rules describe "$RULE_NAME" \
    --global --project "$PROJECT" &>/dev/null; then
  echo "  → already exists, skipping"
else
  gcloud compute forwarding-rules create "$RULE_NAME" \
    --address="$LB_IP" \
    --global \
    --target-https-proxy="$PROXY_NAME" \
    --ports=443 \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --project "$PROJECT"
  echo "  → created"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Load balancer ready."
echo ""
echo "  NEXT: Add this DNS record in Cloudflare (proxied OFF):"
echo ""
echo "    Type : A"
echo "    Name : aegis-vertex"
echo "    Value: $LB_IP"
echo "    TTL  : Auto"
echo "    Proxy: DNS only (grey cloud)"
echo ""
echo "  Certificate provisioning starts once DNS propagates."
echo "  Check status in ~15 min:"
echo "    gcloud compute ssl-certificates describe $CERT_NAME --global --project $PROJECT"
echo ""
echo "  Smoke test (after cert goes ACTIVE):"
echo "    curl -I https://$DOMAIN/health"
echo "═══════════════════════════════════════════════════════"
