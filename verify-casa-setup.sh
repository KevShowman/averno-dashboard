#!/bin/bash
# Casa Setup Verification Script

echo "🏠 Casa System - Setup Verification"
echo "===================================="
echo ""

# Check 1: Local files
echo "📁 Check 1: Local files..."
if [ -d "apps/api/uploads/casa" ]; then
    echo "✅ Directory exists: apps/api/uploads/casa"
    FILE_COUNT=$(ls -1 apps/api/uploads/casa/*.png 2>/dev/null | wc -l)
    echo "   Found $FILE_COUNT PNG files"
    ls -lh apps/api/uploads/casa/
else
    echo "❌ Directory missing: apps/api/uploads/casa"
fi
echo ""

# Check 2: Dockerfile references
echo "🐳 Check 2: Dockerfile references..."
if grep -q "uploads/casa" apps/api/Dockerfile.prod; then
    echo "✅ Dockerfile references uploads/casa"
else
    echo "❌ Dockerfile missing uploads/casa reference"
fi
echo ""

# Check 3: Backend code
echo "💻 Check 3: Backend code..."
if grep -q "useStaticAssets.*uploads" apps/api/src/main.ts; then
    echo "✅ main.ts serves static uploads"
else
    echo "❌ main.ts missing static upload serving"
fi
echo ""

# Check 4: Init service
echo "🔄 Check 4: Init service..."
if [ -f "apps/api/src/casa/casa-init.service.ts" ]; then
    echo "✅ casa-init.service.ts exists"
else
    echo "❌ casa-init.service.ts missing"
fi
echo ""

# Check 5: SQL migrations
echo "📊 Check 5: SQL migrations..."
if [ -f "CASA_MIGRATION.sql" ] && [ -f "CASA_DEFAULT_IMAGES.sql" ]; then
    echo "✅ SQL migration files exist"
else
    echo "❌ SQL migration files missing"
fi
echo ""

echo "===================================="
echo "✨ Verification complete!"

