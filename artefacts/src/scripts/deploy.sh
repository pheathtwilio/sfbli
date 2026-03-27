#!/usr/bin/env bash
set -euo pipefail

# SFBLI Call Center — Deploy Script
# Usage:
#   ./scripts/deploy.sh dev     # Local dev: CRelay via ngrok, Flex local
#   ./scripts/deploy.sh prod    # Production: CRelay on Fly.io, Flex deployed + released
#
# Prerequisites:
#   - Twilio CLI with FLEX profile configured
#   - flyctl installed and authenticated (prod only)
#   - ngrok running with domain (dev only)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$SRC_DIR/.env"

# Paths to related repos
CRELAY_DIR="/tmp/forge-cr"
FLEX_DIR="/Users/pheath/Development/one-ring-to-rule-them-all/projects/flex"

# Fly.io config
FLY_APP="forge-cr-sfbli"
FLY_DOMAIN="$FLY_APP.fly.dev"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $1"; }
err()  { echo -e "${RED}[deploy]${NC} $1" >&2; }
step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

ENV="${1:-}"
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
  echo "Usage: $0 <dev|prod>"
  echo ""
  echo "  dev   — CRelay via ngrok, local Flex plugin"
  echo "  prod  — CRelay on Fly.io, Flex plugin deployed to cloud"
  exit 1
fi

# ─── Read current ngrok domain from .env ───
NGROK_DOMAIN=""
if grep -q "NGROK_DOMAIN" "$CRELAY_DIR/.env" 2>/dev/null; then
  NGROK_DOMAIN=$(grep NGROK_DOMAIN "$CRELAY_DIR/.env" | cut -d'"' -f2)
fi

# ─── Determine CRelay base URL ───
if [[ "$ENV" == "dev" ]]; then
  if [[ -z "$NGROK_DOMAIN" ]]; then
    err "No NGROK_DOMAIN found in $CRELAY_DIR/.env"
    err "Start ngrok and set NGROK_DOMAIN in the .env file"
    exit 1
  fi
  CRELAY_BASE="https://$NGROK_DOMAIN"
  log "Mode: DEV — CRelay at $CRELAY_BASE (ngrok)"
else
  CRELAY_BASE="https://$FLY_DOMAIN"
  log "Mode: PROD — CRelay at $CRELAY_BASE (Fly.io)"
fi

# ═══════════════════════════════════════════
# 1. CRelay Server
# ═══════════════════════════════════════════
step "1/4 — CRelay Server ($ENV)"

if [[ "$ENV" == "prod" ]]; then
  if ! command -v flyctl &>/dev/null && ! command -v fly &>/dev/null; then
    export PATH="$HOME/.fly/bin:$PATH"
  fi

  if ! flyctl auth whoami &>/dev/null; then
    err "Not logged in to Fly.io. Run: flyctl auth login"
    exit 1
  fi

  log "Deploying CRelay to Fly.io ($FLY_APP)..."
  cd "$CRELAY_DIR"
  flyctl deploy --app "$FLY_APP"
  log "CRelay deployed to $CRELAY_BASE"
else
  log "Skipping CRelay deploy (dev mode — run locally with: cd $CRELAY_DIR && npm run dev)"
  log "Ensure ngrok is running: ngrok http --domain=$NGROK_DOMAIN 3000"
fi

# ═══════════════════════════════════════════
# 2. Update SFBLI Functions env
# ═══════════════════════════════════════════
step "2/4 — SFBLI Twilio Functions"

# Update CRELAY_BASE_URL in .env
if grep -q "CRELAY_BASE_URL=" "$ENV_FILE"; then
  sed -i '' "s|CRELAY_BASE_URL=.*|CRELAY_BASE_URL=$CRELAY_BASE|" "$ENV_FILE"
  log "Updated CRELAY_BASE_URL=$CRELAY_BASE in .env"
else
  echo "CRELAY_BASE_URL=$CRELAY_BASE" >> "$ENV_FILE"
  log "Added CRELAY_BASE_URL=$CRELAY_BASE to .env"
fi

log "Deploying SFBLI Functions..."
cd "$SRC_DIR"
npx twilio serverless:deploy --service-name sfbli -p FLEX --override-existing-project

log "Verifying config endpoint..."
RETURNED_URL=$(curl -s "https://sfbli-2271-dev.twil.io/config" | python3 -c "import sys,json; print(json.load(sys.stdin).get('crelayBaseUrl',''))" 2>/dev/null || echo "")
if [[ "$RETURNED_URL" == "$CRELAY_BASE" ]]; then
  log "Config verified: CRELAY_BASE_URL=$RETURNED_URL"
else
  warn "Config returned '$RETURNED_URL' — expected '$CRELAY_BASE'"
fi

# ═══════════════════════════════════════════
# 3. Flex Config
# ═══════════════════════════════════════════
step "3/4 — Flex Configuration"

# Source API credentials from Flex .env
FLEX_ENV="$FLEX_DIR/.env"
if [[ ! -f "$FLEX_ENV" ]]; then
  err "Flex .env not found at $FLEX_ENV"
  exit 1
fi

TWILIO_ACCOUNT_SID=$(grep TWILIO_ACCOUNT_SID "$FLEX_ENV" | head -1 | cut -d= -f2)
TWILIO_API_KEY=$(grep TWILIO_API_KEY "$FLEX_ENV" | head -1 | cut -d= -f2)
TWILIO_API_SECRET=$(grep TWILIO_API_SECRET "$FLEX_ENV" | head -1 | cut -d= -f2)

log "Deploying flex-config (sfbli_call_center: enabled)..."
cd "$FLEX_DIR/flex-config"
ENVIRONMENT=dev \
  TWILIO_ACCOUNT_SID="$TWILIO_ACCOUNT_SID" \
  TWILIO_API_KEY="$TWILIO_API_KEY" \
  TWILIO_API_SECRET="$TWILIO_API_SECRET" \
  OVERWRITE_CONFIG=true \
  npm run deploy

# ═══════════════════════════════════════════
# 4. Flex Plugin
# ═══════════════════════════════════════════
step "4/4 — Flex Plugin"

if [[ "$ENV" == "prod" ]]; then
  log "Building and deploying Flex plugin..."
  cd "$FLEX_DIR/plugin-flex-ts-template-v2"
  npm run build
  npm run deploy -- --changelog "Deploy from script ($ENV mode)"

  # Get the latest version
  PLUGIN_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
  PLUGIN_NAME=$(grep '"name"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')

  log "Releasing $PLUGIN_NAME@$PLUGIN_VERSION..."
  twilio flex:plugins:release \
    --plugin "$PLUGIN_NAME@$PLUGIN_VERSION" \
    --name "SFBLI Deploy $(date +%Y-%m-%d)" \
    --description "Deployed via script ($ENV mode)" \
    -p FLEX

  log "Flex plugin released: $PLUGIN_NAME@$PLUGIN_VERSION"
else
  log "Skipping Flex plugin deploy (dev mode — run locally with: cd $FLEX_DIR && npm start)"
fi

# ═══════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════
step "Deploy Complete"
echo ""
log "Environment:     $ENV"
log "CRelay:          $CRELAY_BASE"
log "SFBLI Functions: https://sfbli-2271-dev.twil.io"
log "Call Center:     https://sfbli-2271-dev.twil.io/callcenter.html"
if [[ "$ENV" == "prod" ]]; then
  log "Flex:            https://flex.twilio.com"
else
  log "Flex (local):    http://localhost:3000"
fi
echo ""
