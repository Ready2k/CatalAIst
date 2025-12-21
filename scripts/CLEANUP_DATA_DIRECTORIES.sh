#!/bin/bash

# Cleanup script to consolidate data storage to backend/data/

echo "=== CatalAIst Data Directory Cleanup ==="
echo ""
echo "Current situation:"
echo "- backend/data/ contains actual data (KEEP THIS)"
echo "- ./data/ is empty/unused (REMOVE THIS)"
echo ""

# Check if backend/data has content
if [ -d "backend/data/prompts" ] && [ "$(ls -A backend/data/prompts)" ]; then
    echo "✓ backend/data/prompts/ has content ($(ls backend/data/prompts/*.txt 2>/dev/null | wc -l) files)"
else
    echo "✗ backend/data/prompts/ is empty or missing!"
    exit 1
fi

# Check if root data is empty
if [ -d "data/prompts" ]; then
    PROMPT_COUNT=$(ls data/prompts/*.txt 2>/dev/null | wc -l)
    if [ "$PROMPT_COUNT" -eq 0 ]; then
        echo "✓ ./data/prompts/ is empty (safe to remove)"
    else
        echo "⚠ ./data/prompts/ has $PROMPT_COUNT files - backing up first"
        mkdir -p backups
        cp -r data/prompts backups/data-prompts-backup-$(date +%Y%m%d-%H%M%S)
        echo "  Backed up to backups/"
    fi
fi

echo ""
read -p "Remove root ./data/ directory? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing ./data/ directory..."
    rm -rf data/
    echo "✓ Removed ./data/"
    
    echo ""
    echo "Updating .gitignore..."
    
    # Remove root data section from .gitignore
    sed -i.bak '/^# Data directory (contains user data)/,/^$/d' .gitignore
    
    echo "✓ Updated .gitignore (backup saved as .gitignore.bak)"
    
    echo ""
    echo "=== Cleanup Complete ==="
    echo ""
    echo "Data is now stored in: backend/data/"
    echo "Prompts are in: backend/data/prompts/"
    echo ""
    echo "Next steps:"
    echo "1. Test the application: cd backend && npm run dev"
    echo "2. Verify prompts load correctly"
    echo "3. Commit changes: git add .gitignore && git commit -m 'Remove unused root data directory'"
else
    echo "Cleanup cancelled."
fi
