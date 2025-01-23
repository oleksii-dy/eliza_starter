#!/bin/bash
code2prompt ./ --include "**/packages/**/*.ts"  --tokens --output gaia_code_packages.md --exclude-from-tree
code2prompt ./ --include "**/agent/**/*.ts"  --tokens --output gaia_code_agent.md --exclude-from-tree
code2prompt ./ --include "**/characters/**/*.json"  --tokens --output gaia_code_characters.md --exclude-from-tree
code2prompt ./docs/ --exclude "*_*.md,*chat*" --include "*.md"  --tokens --output gaia_code_docs.md --exclude-from-tree
mv -t characters/knowledge/gaia/code/ gaia_code_agent.md gaia_code_characters.md gaia_code_packages.md gaia_code_docs.md
