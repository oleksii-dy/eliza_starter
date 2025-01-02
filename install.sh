# make sure you r installing theright nvm version
# 1. Install nvm if you haven't already
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell configuration
source ~/.bashrc  # or source ~/.zshrc if using zsh

# 2. Install Node.js 23
nvm install 23

# 3. Use Node.js 23
nvm use 23

# 4. Verify installation
node --version  # Should show v23.x.x
npm --version

# 5. Install pnpm globally
npm install -g pnpm@9.4.0

# 6. Verify pnpm installation
pnpm --version

# Optional: Set Node.js 23 as default
nvm alias default 23

# always checkout the latest branch
git checkout $(git describe --tags --abbrev=0)
# check out latest version
pnpm install
pnump build