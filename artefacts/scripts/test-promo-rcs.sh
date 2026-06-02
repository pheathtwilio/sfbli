#!/bin/bash
# Test: Send RCS Promo Carousel to Paul Heath at +13125689550
# Uses PROMO_CONTENT_SID (carousel with media images)

BASE_URL="https://sfbli-2271-dev.twil.io"
ENDPOINT="${BASE_URL}/send-rcs"

echo "========================================="
echo " RCS Promo Carousel — Paul Heath"
echo "========================================="
echo "Endpoint:   ${ENDPOINT}"
echo "To:         +13125689550"
echo "ContentSid: HX2d884eeb3ebd6c13d8ec1290659b0867 (PROMO_CONTENT_SID)"
echo "Variables:  1=Paul"
echo "-----------------------------------------"
echo ""

# Pre-flight: check media image availability
echo "Pre-flight: Checking carousel media images..."
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
  echo "[WARN] One or more carousel images are not deployed!"
  echo "       RCS will fail with 11200 if images are missing."
  echo "       Run: twilio serverless:deploy --cwd artefacts/src -p FLEX"
  echo "       Or run: ./scripts/check-media-status.sh"
  echo ""
  read -p "Continue anyway? (y/N) " CONT
  [ "${CONT}" != "y" ] && echo "Aborted." && exit 1
  echo ""
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+13125689550",
    "contentSid": "HX2d884eeb3ebd6c13d8ec1290659b0867",
    "contentVariables": "{\"1\": \"Paul\"}"
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
