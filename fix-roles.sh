#!/bin/bash

# Fix discord.service.ts - Replace old role hierarchies
cd "$(dirname "$0")/apps/api"

# Backup
cp src/discord/discord.service.ts src/discord/discord.service.ts.backup

# Fix first occurrence (around line 207-216)
sed -i '207,216s/\[Role\.ASESOR\]: 4,/\/\/ REMOVED/' src/discord/discord.service.ts
sed -i '207,216s/\[Role\.DON\]: 6,/\/\/ REMOVED/' src/discord/discord.service.ts

# Fix second occurrence (around line 336-344)
sed -i '336,344s/\[Role\.ASESOR\]: 4,/\/\/ REMOVED/' src/discord/discord.service.ts
sed -i '336,344s/\[Role\.DON\]: 6,/\/\/ REMOVED/' src/discord/discord.service.ts

echo "✅ Fixed discord.service.ts"
echo "⚠️  Please manually verify and complete the role hierarchies!"
echo "📝 Backup created at: src/discord/discord.service.ts.backup"

