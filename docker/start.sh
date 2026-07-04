#!/usr/bin/env bash
# Entrypoint for the hosted CoralOS backend container. Boots the Coral Server,
# waits for it to be reachable, then runs the Node market wrapper in the
# foreground (so the container's lifecycle follows the wrapper).
set -euo pipefail

: "${CORAL_API_KEY:?CORAL_API_KEY is required}"
: "${RELIX_MARKET_TOKEN:?RELIX_MARKET_TOKEN is required}"

export CORAL_SERVER_URL="${CORAL_SERVER_URL:-http://localhost:5555}"
export RELIX_CORALOS_ENABLED="${RELIX_CORALOS_ENABLED:-1}"
export CORAL_NAMESPACE="${CORAL_NAMESPACE:-relix}"
export RELIX_DATA_DIR="${RELIX_DATA_DIR:-/data}"
export PORT="${PORT:-8080}"
mkdir -p "$RELIX_DATA_DIR"

# Inject the auth key into the server config without baking it into the image.
sed "s|__CORAL_API_KEY__|${CORAL_API_KEY}|" \
  /opt/relix/coral-server-config.toml > /tmp/coral-config.toml

echo "[start] launching Coral Server (JVM)..."
CONFIG_FILE_PATH=/tmp/coral-config.toml java -jar /opt/relix/coral-server.jar &
CORAL_PID=$!

echo "[start] waiting for Coral Server on ${CORAL_SERVER_URL} ..."
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:5555/ui/console" >/dev/null 2>&1; then
    echo "[start] Coral Server is up"
    break
  fi
  if ! kill -0 "$CORAL_PID" 2>/dev/null; then
    echo "[start] Coral Server exited early" >&2
    exit 1
  fi
  sleep 1
done

echo "[start] launching market wrapper on :${PORT}"
exec node /opt/relix/coralos-server.mjs
