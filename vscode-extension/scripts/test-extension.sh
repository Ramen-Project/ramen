#!/bin/bash

# Test script for Ramen VSCode Extension

echo "🍜 Testing Ramen VSCode Extension"
echo "=================================="

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Compile the extension
echo "📦 Compiling TypeScript..."
npm run compile
if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

# Run linting
echo "🔍 Running ESLint..."
npm run lint
if [ $? -ne 0 ]; then
    echo "⚠️  Linting issues found"
fi

# Check if Python dependencies are available
echo "🐍 Checking Python dependencies..."
python3 -c "import pygls; print('✅ pygls available')" 2>/dev/null || echo "⚠️  pygls not found - Language Server may not work"

# Check if example file exists
if [ -f "../example.ramen" ]; then
    echo "✅ Example .ramen file found"
else
    echo "⚠️  No example .ramen file found"
fi

# List compiled output
echo "📁 Compiled files:"
find out -name "*.js" -type f | head -10

echo ""
echo "🚀 Extension is ready for testing!"
echo ""
echo "To test the extension:"
echo "1. Open this directory in VSCode"
echo "2. Press F5 to launch Extension Development Host"
echo "3. Open the parent directory containing .ramen files"
echo "4. Try the following commands:"
echo "   - Right-click on .ramen file → 'Ramen: Open Graph Editor'"
echo "   - Ctrl+Shift+P → 'Ramen: Create New Graph'"
echo "   - F5 on .ramen file → 'Execute Graph'"