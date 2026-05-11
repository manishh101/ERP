#!/bin/bash

# Health Check Script

API_URL="${1:-http://localhost:4000}"
CLIENT_URL="${2:-http://localhost:5173}"
MAX_RETRIES=5
RETRY_DELAY=2

echo "Health Check Starting..."
echo "API: $API_URL"
echo "Client: $CLIENT_URL"
echo ""

# Check API
echo "Checking API health..."
for i in $(seq 1 $MAX_RETRIES); do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health" 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo "✓ API is healthy"
        break
    else
        echo "  Attempt $i/$MAX_RETRIES failed (HTTP $response). Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        echo "✗ API health check failed after $MAX_RETRIES attempts"
        exit 1
    fi
done

# Check Client
echo "Checking Client..."
for i in $(seq 1 $MAX_RETRIES); do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$CLIENT_URL" 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo "✓ Client is accessible"
        break
    else
        echo "  Attempt $i/$MAX_RETRIES failed (HTTP $response). Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        echo "✗ Client check failed after $MAX_RETRIES attempts"
        exit 1
    fi
done

echo ""
echo "✓ All health checks passed!"
exit 0
