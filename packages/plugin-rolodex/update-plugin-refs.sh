#!/bin/bash

# Update plugin references in all scenario files
echo "Updating plugin references in scenario files..."

# Update in CLI scenarios directory
cd ../cli/scenarios/rolodex

# Replace all occurrences of plugins: ['rolodex'] with plugins: ['@elizaos/plugin-rolodex']
for file in *.ts; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        sed -i '' "s/plugins: \['rolodex'\]/plugins: ['@elizaos\/plugin-rolodex']/g" "$file"
    fi
done

echo "Done updating plugin references!"

# Return to plugin directory
cd ../../../plugin-rolodex 