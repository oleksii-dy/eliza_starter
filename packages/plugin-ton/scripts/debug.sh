# system: debian11

apt install -y jq
# using node23
nvm use 23

# insert tonplugin as default plugin for the default character
sed -i '/let characters = \[defaultCharacter\];/a \
    const importedPlugin = await import("@elizaos/plugin-ton");\
    defaultCharacter.plugins = [importedPlugin.default];\
    // defaultCharacter.modelProvider = ModelProviderName.OPENAI;' agent/src/index.ts
grep -C 4 'let characters = ' agent/src/index.ts

# you can uncomment above if using openai provider, and should export the OPENAI_API_KEY
# export OPENAI_API_KEY="TODO"

# add below to the root package.json to fix https://github.com/elizaOS/eliza/issues/1965
jq '. + { "resolutions": { "agent-twitter-client": "github:timmyg/agent-twitter-client#main" } }' package.json  > tmp.json && mv tmp.json package.json

pnpm install

# generate ton private key if you do not have one
pnpm --dir packages/plugin-ton mnemonic

pnpm build

export TON_RPC_URL="https://testnet.toncenter.com/api/v2/jsonRPC"
# if no apikey provided, the endpoint may be not working
export TON_RPC_API_KEY="TODO"
# get from the output of the mnemonic command
# https://testnet.tonviewer.com/kQDT62Zxkrlj-NG9cODSAfRzuNYrSbrtVVAnjHfK7lvs4Rp1
# UQDT62Zxkrlj-NG9cODSAfRzuNYrSbrtVVAnjHfK7lvs4fw6
export TON_PRIVATE_KEY="demise portion caught unit slot patient pumpkin second faint surround vote awkward afraid turtle extra donate core auction share arrest spend maid say chuckle"

# get testnet ton from https://t.me/testgiver_ton_bot, you should type your address

# start client
pnpm --dir client dev --
# start agent using the default character
pnpm --dir agent dev --

# open the browser and go to http://localhost:5173/ and select one chat to start

# send `hello`` and wait for it have been initialized

# examples:
# send `Send 0.3 TON tokens to EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4` to test the transfer
