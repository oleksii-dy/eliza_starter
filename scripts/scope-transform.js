const fs = require('fs');
const path = require('path');
const util = require('util');
const glob = util.promisify(require('glob'));
const { execSync } = require('child_process');

const OLD_SCOPE = '@elizaos'; // Define the old scope
const NEW_SCOPE = '@5dlabs';  // Define the new scope

// Define the backup file path
const BACKUP_FILE = path.join(__dirname, '..', 'backup', 'config-backup.json');

// Ensure the backup directory exists
const backupDir = path.dirname(BACKUP_FILE);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Define the directories to process (e.g., 'packages' and any other folders)
const TARGET_DIRS = [
  path.join(__dirname, '..', 'packages'), // Include the 'packages' directory
  path.join(__dirname, '..', 'agent'),
  path.join(__dirname, '..', 'client'),
// Add any other folder you want to process
];

// List of native Node.js modules required by the script
const requiredModules = ['glob'];

// Function to check and install missing modules
function ensureModulesInstalled() {
  requiredModules.forEach(module => {
    try {
      require.resolve(module);
      console.log(`Module ${module} is already installed.`);
    } catch (e) {
      console.log(`Module ${module} is not installed. Installing...`);
      execSync(`npm install ${module}`, { stdio: 'inherit' });
    }
  });
}

// Call the function to ensure all modules are installed
ensureModulesInstalled();

// Function to determine if a directory should be excluded
function shouldExclude(dir) {
  const excludeDirs = ['node_modules', '.git', '.husky', '.github'];
  return excludeDirs.some(excludeDir => dir.includes(excludeDir));
}

async function getLocalPackageNames() {
  try {
    const packages = [];
    for (const dir of TARGET_DIRS) {
      const foundPackages = await glob(`${dir}/**/package.json`);
      packages.push(...foundPackages);
    }

    if (!Array.isArray(packages) || packages.length === 0) {
      console.warn('No package.json files found in the specified directories.');
      return new Set();
    }

    const names = new Set();
    for (const pkg of packages) {
      const content = await fs.promises.readFile(pkg, 'utf8');
      const { name } = JSON.parse(content);
      names.add(name);
    }
    return names;
  } catch (error) {
    console.error('Error while collecting local package names:', error);
    return new Set();
  }
}

function rewritePackageJson(filePath, localNames) {
  const original = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(original);

  // Rename package's own name
  if (typeof json.name === 'string' && json.name.startsWith(OLD_SCOPE)) {
    json.name = json.name.replace(OLD_SCOPE, NEW_SCOPE);
  }

  // Process dependencies
  for (const depKey of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (!json[depKey]) continue;

    const newDeps = {};
    for (let [depName, version] of Object.entries(json[depKey])) {
      // Special case: Exclude renaming for @elizaos/adapter-sqlite in all packages
      if (depName === '@elizaos/adapter-sqlite') {
        newDeps[depName] = version;
        continue;
      }

      // Special case: Preserve Node.js version (e.g., "node" or "nodejs")
      if (depName === 'node' || depName === 'nodejs') {
        newDeps[depName] = version;
        continue;
      }

      // Rename all other dependencies from old scope to new scope
      if (depName.startsWith(OLD_SCOPE)) {
        const newName = depName.replace(OLD_SCOPE, NEW_SCOPE);
        newDeps[newName] = version;
      } else {
        newDeps[depName] = version;
      }
    }
    json[depKey] = newDeps;
  }

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
}

function rewriteTurboConfig() {
  const turboConfigPath = path.join(__dirname, '..', 'turbo.json');

  if (!fs.existsSync(turboConfigPath)) {
    console.warn(`turbo.json not found at path: ${turboConfigPath}`);
    return;
  }

  const original = fs.readFileSync(turboConfigPath, 'utf8');
  const turboConfig = JSON.parse(original);

  // Example logic: Update any relevant fields in turboConfig
  if (turboConfig.someField && turboConfig.someField.startsWith(OLD_SCOPE)) {
    turboConfig.someField = turboConfig.someField.replace(OLD_SCOPE, NEW_SCOPE);
  }

  fs.writeFileSync(turboConfigPath, JSON.stringify(turboConfig, null, 2), 'utf8');
}

async function main() {
  const mode = process.argv[2]; // "rewrite" or "revert"
  if (!mode || !['rewrite', 'revert'].includes(mode)) {
    console.error('Usage: node scope-transform.js [rewrite|revert]');
    process.exit(1);
  }

  if (mode === 'rewrite') {
    const localNames = await getLocalPackageNames();
    const localNamesSet = new Set([...localNames]);

    try {
      const packageJsonFiles = [];
      for (const dir of TARGET_DIRS) {
        const foundFiles = await glob(`${dir}/**/package.json`);
        packageJsonFiles.push(...foundFiles);
      }

      for (const filePath of packageJsonFiles) {
        if (shouldExclude(path.dirname(filePath))) continue;
        rewritePackageJson(filePath, localNamesSet);
      }
    } catch (error) {
      console.error('Error while collecting package.json files:', error);
      return;
    }

    rewriteTurboConfig();

    fs.writeFileSync(BACKUP_FILE, JSON.stringify({}, null, 2), 'utf8');
    console.log(`All package.json files have been rewritten from ${OLD_SCOPE} -> ${NEW_SCOPE}.`);
  } else {
    revert();
  }
}

main();