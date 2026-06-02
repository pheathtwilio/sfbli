#!/bin/bash
# Test: Send Policy Change Email to pheath@twilio.com
# Uses POLICY_CHANGE_EMAIL_TEMPLATE_ID with first_name dynamic field

BASE_URL="https://sfbli-2271-dev.twil.io"
ENDPOINT="${BASE_URL}/send-email"

echo "========================================="
echo " Policy Change Email"
echo "========================================="
echo "Endpoint: ${ENDPOINT}"
echo "To:       pheath@twilio.com"
echo "Template: d-3682a82ae50145999948d22afb5a3c72 (POLICY_CHANGE_EMAIL_TEMPLATE_ID)"
echo "Data:     first_name=Paul"
echo "-----------------------------------------"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "pheath@twilio.com",
    "templateId": "d-3682a82ae50145999948d22afb5a3c72",
    "dynamicData": "{\"first_name\": \"Paul\"}"
  }')

HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
BODY=$(echo "${RESPONSE}" | sed '$d')

echo "HTTP Status: ${HTTP_CODE}"
echo ""

if echo "${BODY}" | jq . > /dev/null 2>&1; then
  echo "Response:"
  echo "${BODY}" | jq .

  if [ "${HTTP_CODE}" -eq 200 ]; then
    STATUS=$(echo "${BODY}" | jq -r '.status // empty')
    MSG_ID=$(echo "${BODY}" | jq -r '.messageId // empty')
    echo ""
    echo "[OK] Email sent successfully"
    [ -n "${MSG_ID}" ] && echo "     Message ID: ${MSG_ID}"
  else
    ERROR=$(echo "${BODY}" | jq -r '.error // empty')
    echo ""
    echo "[FAIL] HTTP ${HTTP_CODE}"
    [ -n "${ERROR}" ] && echo "       Error: ${ERROR}"
  fi
else
  echo "[FAIL] Non-JSON response:"
  echo "${BODY}"
fi

echo ""
echo "========================================="
