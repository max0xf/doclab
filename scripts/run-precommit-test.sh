#!/usr/bin/env bash
set -e

# Always resolve paths relative to the repo root, regardless of where the script is called from
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Start the app on port 8888, wait for it to be ready, then stop
PORT=8888
PID_FILE=".precommit-test-pid"

echo "Starting app on port $PORT..."
REACT_APP_AUTH_API_URL=http://localhost:8000 PORT=$PORT npm start &
echo $! > "$PID_FILE"

APP_PID=$(cat "$PID_FILE")

cleanup() {
  echo "Stopping test server (PID $APP_PID)..."
  kill "$APP_PID" 2>/dev/null || true
  rm -f "$PID_FILE"
}
trap cleanup EXIT

echo "Waiting for app to be ready..."
for i in $(seq 1 30); do
  if lsof -i ":$PORT" -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo "✓ App is ready on port $PORT"
    exit 0
  fi
  sleep 1
done

echo "❌ App did not start within 30 seconds"
exit 1
