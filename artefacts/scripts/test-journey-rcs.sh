#!/bin/bash
# Test: Send Journey RCS Content to Marco Santos at +13125689550
# Uses JOURNEY_RCS_CONTENT_SID

BASE_URL="https://sfbli-2271-dev.twil.io"
ENDPOINT="${BASE_URL}/send-rcs"

echo "========================================="
echo " Journey RCS — Marco Santos"
echo "========================================="
echo "Endpoint:   ${ENDPOINT}"
echo "To:         +13125689550"
echo "ContentSid: HXe351f9524fb4699fe5bcdc7ee97af576 (JOURNEY_RCS_CONTENT_SID)"
echo "Variables:  1=Marco"
echo "-----------------------------------------"
echo ""

# Pre-flight: check if content template has media that needs deployed images
echo "Pre-flight: Checking known carousel media images..."
IMAGES=(
  "Sfbli_main_logo.png"
  "sfbli_steady_growth_chart.jpg"
  "sfbli_digital_vault.jpg"
  "sfbli_approved.jpg"
)
ALL_OK=true
for IMG in "${IMAGES[@]}"; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/${IMG}")
  if [ "${HTTP}" -eq 200 ]; then
    echo "  [OK]   ${IMG}"
  else
    echo "  [FAIL] ${IMG} (HTTP ${HTTP})"
    ALL_OK=false
  fi
done
echo ""

if [ "${ALL_OK}" = false ]; then
  echo "[WARN] Media images are not deployed — RCS with media will fail (11200)."
  echo "       If this template uses media, redeploy assets first."
  echo "       Run: ./scripts/check-media-status.sh"
  echo ""
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+13125689550",
    "contentSid": "HXe351f9524fb4699fe5bcdc7ee97af576",
    "contentVariables": "{\"1\": \"Marco\"}"
  }')

HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
BODY=$(echo "${RESPONSE}" | sed '$d')

echo "HTTP Status: ${HTTP_CODE}"
echo ""

if echo "${BODY}" | jq . > /dev/null 2>&1; then
  echo "Response:"
  echo "${BODY}" | jq .

  if [ "${HTTP_CODE}" -eq 200 ]; then
    SID=$(echo "${BODY}" | jq -r '.messageSid // empty')
    STATUS=$(echo "${BODY}" | jq -r '.status // empty')
    echo ""
    echo "[OK] RCS message queued"
    [ -n "${SID}" ] && echo "     Message SID: ${SID}"
    [ -n "${STATUS}" ] && echo "     Status: ${STATUS}"
    echo ""
    echo "Tip: Check delivery with:"
    echo "  twilio api:core:messages:fetch --sid ${SID} -p FLEX"
  else
    ERROR=$(echo "${BODY}" | jq -r '.error // empty')
    echo ""
    echo "[FAIL] HTTP ${HTTP_CODE}"
    [ -n "${ERROR}" ] && echo "       Error: ${ERROR}"
    echo ""
    echo "[HINT] If 11200: run ./scripts/check-media-status.sh"
  fi
else
  echo "[FAIL] Non-JSON response:"
  echo "${BODY}"
fi

echo ""
echo "========================================="
