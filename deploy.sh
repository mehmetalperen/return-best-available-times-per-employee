#!/bin/bash

# Deploy script for Best Available Times API

echo "🚀 Deploying Best Available Times API to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "📦 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Your API is now live at: https://your-project-name.vercel.app/api"
echo ""
echo "📝 Test your API with:"
echo "curl -X POST https://your-project-name.vercel.app/api \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"client_booking_time\": \"2025-09-10T09:00:00-05:00\", \"employees\": []}'"
