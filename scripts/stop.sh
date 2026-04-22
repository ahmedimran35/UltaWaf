#!/bin/bash
set -e

echo "🛡️ UltraShield WAF - Stopping..."

docker-compose down

echo "✅ Stopped all containers"

echo "🧹 Cleaning up..."

echo "✅ Cleanup complete"

echo ""
echo "To restart: docker-compose up -d"