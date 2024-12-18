{
  description = "Eliza development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};

      # Read versions from package.json
      packageJson = builtins.fromJSON (builtins.readFile ./package.json);
      versions = let
        # Extract version from packageManager string (e.g., "pnpm@9.12.3+sha512...")
        pnpmFull = packageJson.packageManager or "pnpm@9.12.3";
        pnpmVersion = builtins.head (builtins.match "pnpm@([^+]+).*" pnpmFull);
      in {
        nodejs = builtins.replaceStrings ["^" "~"] ["" ""] packageJson.engines.node;
        pnpm = pnpmVersion;
      };

      # Function to fetch Node.js tarball with hash
      fetchNodeJs = version: platform: arch:
        pkgs.fetchurl {
          url = "https://nodejs.org/dist/v${version}/node-v${version}-${platform}-${arch}.tar.gz";
          hash = null; # Nix will provide the correct hash when it fails
        };

      # Function to fetch pnpm tarball with hash
      fetchPnpm = version:
        pkgs.fetchurl {
          url = "https://registry.npmjs.org/pnpm/-/pnpm-${version}.tgz";
          hash = null; # Nix will provide the correct hash when it fails
        };

      # Define specific Node.js version
      nodejs = pkgs.stdenv.mkDerivation rec {
        pname = "nodejs";
        version = versions.nodejs;

        src =
          fetchNodeJs version
          (
            if pkgs.stdenv.isDarwin
            then "darwin"
            else "linux"
          )
          (
            if pkgs.stdenv.isx86_64
            then "x64"
            else "arm64"
          );

        installPhase = ''
          mkdir -p $out
          cp -r ./* $out/
          chmod +x $out/bin/node
          chmod +x $out/bin/npm
          chmod +x $out/bin/npx
        '';

        dontStrip = true;
      };

      # Define specific pnpm version
      pnpm = pkgs.stdenv.mkDerivation {
        name = "pnpm";
        version = versions.pnpm;

        src = fetchPnpm versions.pnpm;

        buildInputs = [nodejs];

        installPhase = ''
          # Create directories
          mkdir -p $out/{lib,bin}

          # Extract tarball
          cd $out/lib
          tar xzf $src --strip-components=1

          # Create the executable
          cat > $out/bin/pnpm << EOF
          #!${nodejs}/bin/node
          require(process.env.PNPM_DIST || require('path').resolve(__dirname, '../lib/dist/pnpm.cjs'))
          EOF

          chmod +x $out/bin/pnpm

          # Export the dist path
          mkdir -p $out/nix-support
          echo "export PNPM_DIST=\"$out/lib/dist/pnpm.cjs\"" >> $out/nix-support/setup-hook
        '';

        dontStrip = true;
      };

      # Define development tools separately
      devTools = with pkgs; [
        nixpkgs-fmt
        remarshal
        gcc
        gnumake
        python3
        vips
        libopus
        rabbitmq-server
        pkg-config
        pnpm # Our specific pnpm version
      ];
    in {
      devShells.default = pkgs.mkShell {
        buildInputs = devTools;

        shellHook = ''
          echo "Welcome to Eliza development environment"

          # Ensure project-specific Node.js takes precedence
          export PATH="${nodejs}/bin:$PATH"

          # Set up pnpm environment
          export PNPM_HOME="$HOME/.local/share/pnpm"
          export PATH="$PNPM_HOME:$PATH"

          # Ensure PNPM_HOME exists
          mkdir -p "$PNPM_HOME"

          # Set up development environment variables
          export NODE_ENV="development"
          export VERBOSE="true"
          export DEBUG="eliza:*"

          # Print available commands
          echo "Available commands:"
          echo "  pnpm i  - Install dependencies"
          echo "  pnpm build    - Build the project"
          echo "  pnpm dev      - Start development server"
          echo "  pnpm test     - Run tests"

          # Print actual environment versions
          node_version=$(${nodejs}/bin/node --version)
          pnpm_version=$(pnpm --version)
          echo "Node.js version: $node_version"
          echo "pnpm version: $pnpm_version"
        '';
      };

      formatter = pkgs.nixpkgs-fmt;
    });
}
