#!/usr/bin/env node

/**
 * A script to dynamically rename package scopes from "@elizaos" to "@myorg"
 * just before publishing, then revert them afterwards.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Customize these
const PACKAGES_DIR = path.join(__dirname, '..', 'packages'); 
const OLD_SCOPE = '@elizaos';
const NEW_SCOPE = '@5d-labs'; // The scope you control on GitHub or npm

// 1) Recursively collect all package.json files under /packages (or wherever your packages live)
function getAllPackageJsons(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllPackageJsons(fullPath));
    } else if (entry.name === 'package.json') {
      files.push(fullPath);
    }
  }
  return files;
}

// 2) Rewrite names & deps in memory, then write them back
function rewritePackageJson(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let json = JSON.parse(original);

  // If package has name = "@elizaos/xyz", rename to "@myorg/xyz"
  if (typeof json.name === 'string' && json.name.startsWith(OLD_SCOPE)) {
    json.name = json.name.replace(OLD_SCOPE, NEW_SCOPE);
  }

  // Rewrite dependencies/devDependencies/peerDependencies that reference the old scope
  ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].forEach(depKey => {
    if (json[depKey]) {
      for (const [depName, version] of Object.entries(json[depKey])) {
        if (depName.startsWith(OLD_SCOPE)) {
          const newDepName = depName.replace(OLD_SCOPE, NEW_SCOPE);
          json[depKey][newDepName] = version;
          delete json[depKey][depName];
        }
      }
    }
  });

  // Return both the updated JSON object and original text so we can revert later
  const updatedString = JSON.stringify(json, null, 2);
  fs.writeFileSync(filePath, updatedString);
  return original; // so we can restore it
}

function main() {
  console.log('Collecting all package.json files...');
  const packageJsonPaths = getAllPackageJsons(PACKAGES_DIR);

  // Track original contents so we can revert
  const originals = {};

  console.log(`Rewriting package.json from ${OLD_SCOPE} -> ${NEW_SCOPE} ...`);
  for (const p of packageJsonPaths) {
    originals[p] = fs.readFileSync(p, 'utf8'); // store original
    const updated = rewritePackageJson(p);     // do rewrite
  }

  try {
    // 3) Publish all packages with PNPM (or Lerna)
    // Example with PNPM recursively:
    console.log('Publishing with PNPM...');
    execSync('pnpm -r publish --access public --no-git-checks --registry https://npm.pkg.github.com', {
      stdio: 'inherit'
    });

    console.log('Publish succeeded!');
  } catch (err) {
    console.error('Publish failed:', err);
  } finally {
    // 4) Revert changes to keep your repo clean
    console.log('Reverting package.json changes...');
    for (const [p, originalContent] of Object.entries(originals)) {
      fs.writeFileSync(p, originalContent);
    }
  }
}

main();
