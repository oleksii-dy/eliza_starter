#!/bin/bash

# Function to check if a port is available
check_port() {
    local port=$1
    nc -z localhost $port >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        return 1
    else
        return 0
    fi
}

# Combine all arguments into a single string
CHARACTER_NAMES=$(echo "$*" | tr ' ' ',')

if [ -z "$CHARACTER_NAMES" ]; then
    echo "Please provide character name(s)"
    echo "Usage: pnpm char <character-name> OR pnpm char <character1,character2,character3>"
    exit 1
fi

# Process character names into proper format
CHARACTERS_ARG=""

# First, clean up the input string: remove any .character.json suffixes and extra spaces
CLEANED_NAMES=$(echo "$CHARACTER_NAMES" | sed 's/\.character\.json//g' | sed 's/, */,/g' | sed 's/,\+/,/g' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# Split on commas and process each name
IFS=',' read -ra CHAR_ARRAY <<< "$CLEANED_NAMES"
for i in "${!CHAR_ARRAY[@]}"; do
    CHAR_NAME=$(echo "${CHAR_ARRAY[$i]}" | xargs)

    if [ -n "$CHAR_NAME" ]; then  # Only process non-empty names
        if [ -z "$CHARACTERS_ARG" ]; then
            CHARACTERS_ARG="characters/${CHAR_NAME}.character.json"
        else
            CHARACTERS_ARG="${CHARACTERS_ARG},characters/${CHAR_NAME}.character.json"
        fi
    fi
done

echo "Loading characters: $CHARACTERS_ARG"

# Check if port 3000 is available
if check_port 3000; then
    # Start on port 3000
    SERVER_PORT=3000 pnpm --filter "@elizaos/agent" start --isRoot --characters="${CHARACTERS_ARG}"
else
    # Find next available port
    PORT=3001
    while ! check_port $PORT; do
        PORT=$((PORT + 1))
    done
    echo "Port 3000 is in use. Server will start on port $PORT"
    SERVER_PORT=$PORT pnpm --filter "@elizaos/agent" start --isRoot --characters="${CHARACTERS_ARG}"
fi