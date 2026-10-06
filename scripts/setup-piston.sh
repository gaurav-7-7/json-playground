#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 Setting up local Piston Code Execution Engine"
echo "=================================================="

# Check if docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "📦 Starting Piston container on port 2000..."
docker compose up -d

echo "⏳ Waiting for Piston to initialize..."
sleep 3

# Wait for health check
MAX_RETRIES=15
COUNT=0
while ! curl -s "http://localhost:2000/api/v2/runtimes" >/dev/null 2>&1; do
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Timed out waiting for Piston to become ready."
        exit 1
    fi
    echo "Waiting for Piston API ($COUNT/$MAX_RETRIES)..."
    sleep 2
done

echo "✅ Piston is running!"
echo "📦 Installing language runtimes (Python, GCC/C++, Java, Go, Node.js, TypeScript)..."

LANGUAGES=(
  '{"language":"python","version":"3.12.0"}'
  '{"language":"node","version":"20.11.1"}'
  '{"language":"typescript","version":"5.0.3"}'
  '{"language":"gcc","version":"10.2.0"}'
  '{"language":"java","version":"15.0.2"}'
  '{"language":"go","version":"1.16.2"}'
)

for pkg in "${LANGUAGES[@]}"; do
  echo "Installing $pkg..."
  curl -s -X POST http://localhost:2000/api/v2/packages \
    -H "Content-Type: application/json" \
    -d "$pkg" >/dev/null 2>&1 || true
done

echo ""
echo "🎉 Setup Complete! Installed Runtimes:"
curl -s http://localhost:2000/api/v2/runtimes | grep -o '\"language\":\"[^\"]*\"' || true
echo ""
echo "=================================================="
echo "Piston is active at: http://localhost:2000"
echo "API status: http://localhost:2000/api/v2/runtimes"
echo "=================================================="
