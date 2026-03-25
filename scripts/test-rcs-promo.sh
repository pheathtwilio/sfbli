#!/bin/bash
# Test promotional RCS send via the deployed Twilio Function

# Load env vars
source "$(dirname "$0")/../artefacts/src/.env"

TO="${1:-$DEFAULT_RECIPIENT_PHONE}"
NAME="${2:-Paul Heath}"

echo "Sending promotional RCS to $TO with name '$NAME'..."
echo "Using PROMO_CONTENT_SID=$PROMO_CONTENT_SID"

curl -s -X POST "https://sfbli-2271-dev.twil.io/send-rcs" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TO\",
    \"contentVariables\": \"{\\\"1\\\": \\\"$NAME\\\"}\"
  }" | python3 -m json.tool

echo ""
echo "Done."
