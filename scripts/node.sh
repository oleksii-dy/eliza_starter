
curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=10.0.0 sh -

. ~/.bashrc

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

nvm install 23
nvm use 23

cd /opt/agent
pnpm install
