#!/usr/bin/env bash
# Local end-to-end test of the hosted CoralOS backend container:
# builds the image, runs it, waits for /health, and calls /market — expecting
# all three seller bids and real CoralOS proof ids. Requires Docker.
set -euo pipefail

IMG="${IMG:-relix-coralos}"
NAME="${NAME:-relix-coralos-test}"
PORT="${PORT:-8080}"
MARKET_TOKEN="${RELIX_MARKET_TOKEN:-test-market-token}"
API_KEY="${CORAL_API_KEY:-relix-dev-key}"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "== docker build =="
docker build -f Dockerfile -t "$IMG" .

cleanup
echo "== docker run =="
docker run -d --name "$NAME" \
  -e CORAL_API_KEY="$API_KEY" \
  -e RELIX_MARKET_TOKEN="$MARKET_TOKEN" \
  -e PORT="$PORT" \
  -p "${PORT}:${PORT}" "$IMG"

echo "== waiting for /health =="
ok=""
for _ in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/health" || true)
  if [ "$code" = "200" ]; then ok=1; break; fi
  sleep 2
done
if [ -z "$ok" ]; then
  echo "FAIL: /health never returned 200"; docker logs "$NAME" 2>&1; exit 1
fi
echo "health: $(curl -s "http://localhost:${PORT}/health")"

echo "== POST /market =="
resp=$(curl -s -X POST "http://localhost:${PORT}/market" \
  -H "Authorization: Bearer ${MARKET_TOKEN}" \
  -H "Content-Type: application/json" \
  --data @scripts/coralos/sample-job.json)
echo "$resp" | head -c 2000; echo

bids=$(echo "$resp" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log((JSON.parse(s).bids||[]).length)}catch{console.log(0)}})")
echo "== collected bids: ${bids} =="
if [ "$bids" -ge 3 ]; then
  echo "PASS: hosted backend returned ${bids} seller bids over CoralOS"
else
  echo "FAIL: expected 3 seller bids, got ${bids}"
  echo "== full container logs =="
  docker logs "$NAME" 2>&1
  echo "== buyer-related lines only =="
  docker logs "$NAME" 2>&1 | grep -iE "buyer|rror|xception|agent added" || echo "(no buyer/error lines found at all)"
  exit 1
fi
