#!/bin/bash

# OneLLM Production Deployment Script for Render
# This script builds and starts the application for production

set -e

echo "🚀 OneLLM Production Deployment"
echo "================================"

# Install dependencies
# echo "📦 Installing dependencies..."
# npm install

# Generate Prisma client
# echo "🔧 Generating Prisma client..."
# npm run db:generate

# Build the frontend
echo "🏗️  Building frontend..."
npm run build

# Start the server
echo "🌐 Starting production server..."
NODE_ENV=production node apps/server/index.js
