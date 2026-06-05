#!/bin/bash
# Check deployment status of all media assets used by RCS content templates
# If any return non-200, RCS sends will fail with Twilio error 11200

BASE_URL="https://sfbli-2271-dev.twil.io"

echo "========================================="
echo " Media Asset Deployment Status"
echo "========================================="
echo "Base URL: ${BASE_URL}"
echo "-----------------------------------------"
echo ""

ASSETS=(
  "Sfbli_main_logo.png|Carousel card 1 image (Promo RCS)"
  "sfbli_steady_growth_chart.jpg|Carousel card 2 image (Promo RCS - Flex Whole Life)"
  "sfbli_digital_vault.jpg|Carousel card 3 image (Promo RCS - LegacyShield)"
  "sfbli_approved.jpg|Carousel card 4 image (Promo RCS - Accelerated Underwriting)"
  "sfbli-whole-life.jpg|Card image (Journey RCS + Policy Change RCS + Email)"
)

# Content template SIDs and their expected media URLs
TEMPLATES=(
  "HX2d884eeb3ebd6c13d8ec1290659b0867|Promo RCS (carousel)"
  "HXe351f9524fb4699fe5bcdc7ee97af576|Journey RCS (property & casualty)"
  "HXe4c64005e49b9d0c135b05ae7aa3cf39|Policy Change RCS (escalation)"
)

PASS=0
FAIL=0

for ENTRY in "${ASSETS[@]}"; do
  FILE="${ENTRY%%|*}"
  DESC="${ENTRY##*|}"
  URL="${BASE_URL}/${FILE}"

  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${URL}")
  SIZE=$(curl -s -o /dev/null -w "%{size_download}" "${URL}")

  if [ "${HTTP}" -eq 200 ]; then
    echo "  [OK]   ${FILE}"
    echo "         ${DESC} (${SIZE} bytes)"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] ${FILE} — HTTP ${HTTP}"
    echo "         ${DESC}"
    FAIL=$((FAIL + 1))
  fi
  echo ""
done

# Check content template media URLs are reachable
API_KEY="${TWILIO_API_KEY:?Set TWILIO_API_KEY env var}"
API_SECRET="${TWILIO_API_SECRET:?Set TWILIO_API_SECRET env var}"

echo "========================================="
echo " Content Template Media Check"
echo "========================================="
echo ""

for ENTRY in "${TEMPLATES[@]}"; do
  SID="${ENTRY%%|*}"
  DESC="${ENTRY##*|}"

  # Fetch template and extract media URLs
  MEDIA_URLS=$(curl -s -u "${API_KEY}:${API_SECRET}" "https://content.twilio.com/v1/Content/${SID}" \
    | python3 -c "
import sys,json
d=json.load(sys.stdin)
urls=set()
for t in d.get('types',{}).values():
  for u in (t.get('media') or []):
    urls.add(u)
  for item in (t.get('items') or []):
    for u in (item.get('media') or []):
      urls.add(u)
for u in sorted(urls):
  print(u)
" 2>/dev/null)

  if [ -z "${MEDIA_URLS}" ]; then
    echo "  [OK]   ${SID} — ${DESC} (no media URLs)"
    PASS=$((PASS + 1))
  else
    ALL_OK=true
    for URL in ${MEDIA_URLS}; do
      HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${URL}")
      if [ "${HTTP}" -eq 200 ]; then
        echo "  [OK]   ${SID} — ${DESC}"
        echo "         ${URL}"
        PASS=$((PASS + 1))
      else
        echo "  [FAIL] ${SID} — ${DESC}"
        echo "         ${URL} — HTTP ${HTTP}"
        FAIL=$((FAIL + 1))
        ALL_OK=false
      fi
    done
  fi
  echo ""
done

echo "-----------------------------------------"
echo "Results: ${PASS} passed, ${FAIL} failed"
echo ""

if [ "${FAIL}" -gt 0 ]; then
  echo "[ACTION REQUIRED] Missing assets will cause RCS 11200 errors."
  echo ""
  echo "To fix, ensure image files are in artefacts/src/assets/ and redeploy:"
  echo "  cd artefacts/src && twilio serverless:deploy -p FLEX"
  echo ""
  echo "Or deploy manually from the Twilio console."
  exit 1
else
  echo "[ALL CLEAR] All media assets are deployed and accessible."
  exit 0
fi
