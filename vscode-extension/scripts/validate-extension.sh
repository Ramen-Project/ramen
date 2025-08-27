#!/bin/bash

echo "🍜 Ramen VSCode Extension Validation"
echo "===================================="

cd "$(dirname "$0")/.."

# Check compiled files exist
echo "📦 Checking compiled files..."
EXPECTED_FILES=(
    "out/extension/extension.js"
    "out/extension/commands.js"
    "out/extension/webview/webviewManager.js"
    "out/extension/server/serverManager.js"
    "out/extension/language/languageClient.js"
    "out/extension/providers/graphProvider.js"
    "out/webview/webview.js"
)

ALL_PRESENT=true
for file in "${EXPECTED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        ALL_PRESENT=false
    fi
done

# Check package.json structure
echo ""
echo "📋 Checking package.json structure..."
if jq -e '.contributes.languages[] | select(.id == "ramen")' package.json > /dev/null; then
    echo "  ✅ Ramen language registered"
else
    echo "  ❌ Ramen language not found"
    ALL_PRESENT=false
fi

if jq -e '.contributes.commands[] | select(.command == "ramen.openGraphEditor")' package.json > /dev/null; then
    echo "  ✅ Core commands registered"
else
    echo "  ❌ Commands not properly registered"
    ALL_PRESENT=false
fi

# Check resources
echo ""
echo "🎨 Checking resources..."
if [ -f "resources/file-icon.svg" ]; then
    echo "  ✅ File icon present"
else
    echo "  ❌ File icon missing"
    ALL_PRESENT=false
fi

if [ -f "media/vscode.css" ] && [ -f "media/webview.css" ]; then
    echo "  ✅ CSS stylesheets present"
else
    echo "  ❌ CSS stylesheets missing"
    ALL_PRESENT=false
fi

# Check Language Server
echo ""
echo "🐍 Checking Language Server dependencies..."
if python3 -c "import pygls" 2>/dev/null; then
    echo "  ✅ pygls available"
else
    echo "  ⚠️  pygls not available (Language Server won't work)"
fi

if [ -f "src/language-server/server.py" ]; then
    echo "  ✅ Language Server implementation present"
else
    echo "  ❌ Language Server missing"
    ALL_PRESENT=false
fi

# Check test example
echo ""
echo "📄 Checking example files..."
if [ -f "../example.ramen" ]; then
    echo "  ✅ Example .ramen file present"
else
    echo "  ⚠️  No example .ramen file for testing"
fi

# Summary
echo ""
echo "📊 Validation Summary"
echo "===================="

if [ "$ALL_PRESENT" = true ]; then
    echo "✅ All core components present and valid"
    echo ""
    echo "🚀 Extension is ready for testing!"
    echo "   1. Open this directory in VSCode"
    echo "   2. Press F5 to launch Extension Development Host"
    echo "   3. Test with .ramen files"
    exit 0
else
    echo "❌ Some components are missing or invalid"
    echo "   Run 'npm run compile' to rebuild"
    exit 1
fi