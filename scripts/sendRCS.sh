#!/bin/bash

TWILIO_ACCOUNT_SID="ACc1493738a107a65f9292e273184a2c99"
TWILIO_AUTH_TOKEN="f4d0ee0fa814624700a843475d2b2777"

MESSAGING_SERVICE_SID="MGe93f845bb37fb656488897759dd72a7f"
TO_PHONE="+13125689550"
MESSAGE_BODY="Hello from RCS!"

curl -s -X POST "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json" \
  --data-urlencode "Body=${MESSAGE_BODY}" \
  --data-urlencode "MessagingServiceSid=${MESSAGING_SERVICE_SID}" \
  --data-urlencode "To=${TO_PHONE}" \
  -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" | jq .
