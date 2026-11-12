#!/usr/bin/env bash
set -euo pipefail
: "${RENDER_EXTERNAL_URL:?Adresse publique Render manquante}"
npx --yes --package=qrcode@1.5.4 qrcode -o dist/qr-application.png -w 480 "${RENDER_EXTERNAL_URL%/}/"
test -s dist/qr-application.png
test -f dist/index.html
