# Quick Start Guide - ElizaOS Plugin Registry Scripts

## 🚀 Getting Started in 5 Minutes

### 1. Setup Environment

```bash
# Copy the example environment file
cp scripts/example.env .env

# Edit .env with your GitHub token
# Get a token at: https://github.com/settings/tokens/new
# Required scopes: repo, public_repo
```

### 2. Install Dependencies

```bash
# If using npm
npm install

# If using bun (recommended for ElizaOS)
bun install
```

### 3. Test Your Setup

```bash
npm run test-scripts
```

You should see:
```
🧪 ElizaOS Plugin Registry Scripts Test Suite

1️⃣  Testing Environment Setup...
   ✅ GITHUB_TOKEN found

2️⃣  Testing Script Files...
   ✅ analyze-plugin-registry.ts exists
   ✅ enhance-plugin-docs.ts exists
   ✅ fix-plugin-dependencies.ts exists

...

✅ All tests passed! Your scripts are ready to use.
```

### 4. Run the Scripts

#### Option A: Full Workflow (Recommended)

```bash
# 1. Analyze all plugins and find missing ones
npm run analyze-registry

# 2. Generate enhanced documentation (optional, requires AI key)
npm run enhance-docs

# 3. Fix dependencies and create PRs
npm run fix-dependencies
```

#### Option B: Just Add Missing Plugins

```bash
# Quick mode - just find and add missing plugins
npm run analyze-registry
```

## 📊 What Each Script Does

### `analyze-registry`
- Discovers all plugins in elizaos-plugins org
- Finds plugins not in the registry
- Creates a PR to add missing plugins
- Output: `plugin-data/` directory

### `enhance-docs` (Optional)
- Clones each plugin repository
- Extracts all environment variables
- Uses AI to improve documentation
- Output: `enhanced-plugin-data/` directory

### `fix-dependencies`
- Fixes workspace:* dependencies
- Updates versions to stable
- Enhances README files
- Creates PRs with fixes
- Output: `plugin-fixes/` directory

## 🔧 Common Tasks

### Add Missing Plugins Only
```bash
npm run analyze-registry
# Check plugin-data/analysis-report.json for results
```

### Generate Plugin Report
```bash
npm run analyze-registry
# Open plugin-data/analysis-report.json
```

### Fix a Specific Plugin
1. Run `analyze-registry` first
2. Edit the generated JSON in `plugin-data/`
3. Run `fix-dependencies`

### Dry Run Mode
```bash
# Set in .env
DRY_RUN=true

# Run scripts - they'll analyze but not create PRs
npm run analyze-registry
```

## 📝 Example Output

After running `analyze-registry`:
```
📥 Fetching plugin registry...
✅ Found 42 plugins in registry

🔍 Searching for all plugins in elizaos-plugins organization...
✅ Found 45 plugin repositories

🔍 Found 3 plugins not in registry:
  - @elizaos/plugin-new-feature
  - @elizaos/plugin-experimental
  - @elizaos/plugin-beta

📝 Creating pull request to add missing plugins...
✅ Pull request created: https://github.com/elizaos-plugins/registry/pull/123
```

## 🆘 Troubleshooting

### "GITHUB_TOKEN not found"
1. Create a token: https://github.com/settings/tokens/new
2. Add to `.env`: `GITHUB_TOKEN=ghp_...`

### "Rate limit exceeded"
- Wait 1 hour for limits to reset
- Or use a different GitHub token

### "TypeScript errors"
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### "Can't find scripts"
Make sure you're in the plugin-github directory:
```bash
cd packages/plugin-github
npm run test-scripts
```

## 🎯 Best Practices

1. **Always Test First**: Run `test-scripts` before using
2. **Check Reports**: Review JSON reports before creating PRs
3. **Use AI Keys**: Add OpenAI/Anthropic keys for better docs
4. **Review PRs**: Always review generated PRs before merging
5. **Batch Operations**: Process plugins in batches to avoid rate limits

## 📚 Next Steps

- Read the full documentation: `scripts/README.md`
- Check example outputs in `plugin-data/` after first run
- Join ElizaOS Discord for support
- Contribute improvements back to the scripts!

## 🤝 Getting Help

1. Run `npm run test-scripts` to diagnose issues
2. Check `scripts/test-results.json` for details
3. Review error messages - they're descriptive
4. Check GitHub API status: https://status.github.com
5. Ask in ElizaOS Discord #plugin-development channel 