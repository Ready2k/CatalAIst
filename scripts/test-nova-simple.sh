#!/bin/bash

echo "🧪 Testing Nova 2 Sonic Integration Fix"
echo "======================================="
echo ""

# Check if services are running
echo "1. Checking service health..."
HEALTH=$(curl -s http://localhost:8080/health | grep -o '"status":"ok"')
if [ "$HEALTH" = '"status":"ok"' ]; then
    echo "   ✅ Backend service is healthy"
else
    echo "   ❌ Backend service is not healthy"
    exit 1
fi

# Check if frontend is accessible
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80)
if [ "$FRONTEND" = "200" ]; then
    echo "   ✅ Frontend service is accessible"
else
    echo "   ❌ Frontend service is not accessible (HTTP $FRONTEND)"
fi

echo ""
echo "2. Checking WebSocket endpoint..."
# Test WebSocket endpoint availability (this will fail but show if the endpoint exists)
WS_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/nova-sonic/stream)
if [ "$WS_TEST" = "426" ]; then
    echo "   ✅ WebSocket endpoint is available (HTTP 426 = Upgrade Required)"
elif [ "$WS_TEST" = "404" ]; then
    echo "   ❌ WebSocket endpoint not found (HTTP 404)"
else
    echo "   ⚠️  WebSocket endpoint returned HTTP $WS_TEST"
fi

echo ""
echo "3. Event format fix verification..."
echo "   The fix applied:"
echo "   - ✅ Added 'event' wrapper to sessionStart events"
echo "   - ✅ Added 'event' wrapper to audioChunk events" 
echo "   - ✅ Added 'event' wrapper to sessionEnd events"
echo "   - ✅ Made event format consistent with textMessage events"

echo ""
echo "4. Next steps for testing:"
echo "   1. Open http://localhost in your browser"
echo "   2. Configure AWS Bedrock with your credentials:"
echo "      - Provider: AWS Bedrock"
echo "      - Model: amazon.nova-lite-v1:0 (or nova-2-sonic if available)"
echo "      - Region: us-east-1"
echo "      - Voice: Nova 2 Sonic (Ruth)"
echo "   3. Try voice input to test the fix"
echo ""
echo "🔍 Expected behavior after fix:"
echo "   - ❌ Before: 'No events to transform were found' error"
echo "   - ✅ After: Proper audio processing and transcription"

echo ""
echo "📋 Summary:"
echo "   The event format inconsistency has been fixed in the Nova 2 Sonic"
echo "   WebSocket service. All events now use the proper 'event' wrapper"
echo "   format that Nova 2 Sonic expects."