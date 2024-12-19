{
  description = "Eliza Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    pnpm2nix.url = "github:nzbr/pnpm2nix-nzbr";
  };

  outputs = {
    self,
    nixpkgs,
    pnpm2nix,
  }: let
    systems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
    forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
  in {
    devShells = forAllSystems (system: let
      pkgs = import nixpkgs {
        inherit system;
        overlays = [pnpm2nix.overlays.default];
      };

      nodePackages =
        (import ./default.nix {
          inherit pkgs system;
          sha256 = null;
        })
        .buildNodePackages
        pkgs;
    in {
      default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodePackages.nodejs
          nodePackages.pnpm
          python3
          pkg-config
        ];
      };
    });

    lib = {
      getPlatformString = system: platform:
        if platform == "nodejs"
        then
          if builtins.match ".*darwin.*" system != null
          then
            if builtins.match ".*aarch64.*" system != null
            then "darwin-arm64"
            else "darwin-x64"
          else if builtins.match ".*aarch64.*" system != null
          then "linux-arm64"
          else "linux-x64"
        else if builtins.match ".*darwin.*" system != null
        then
          if builtins.match ".*aarch64.*" system != null
          then "macos-arm64"
          else "macos-x64"
        else if builtins.match ".*aarch64.*" system != null
        then "linux-arm64"
        else "linux-x64";
    };
  };
}
