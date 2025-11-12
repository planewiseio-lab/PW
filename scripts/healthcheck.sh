#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "Checking /health..."
curl -fsS "$BASE_URL/api/health" >/dev/null

echo "Checking /ready..."
curl -fsS "$BASE_URL/api/ready" >/dev/null

echo "Checking /metrics..."
curl -fsS "$BASE_URL/api/metrics" | head -n 5 >/dev/null

echo "All health checks passed."






















