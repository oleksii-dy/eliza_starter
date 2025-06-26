const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

// Common patterns for identifying bundled libraries
const libraryPatterns = {
  // Common bundler patterns
  webpackModule: /^__webpack_require__/,
  webpackExports: /^__webpack_exports__/,
  
  // Common library patterns
  nodeBuiltins: /^(require|module|exports|__dirname|__filename|process|global|Buffer|console)/,
  
  // Library naming patterns (minified/bundled)
  minifiedLibs: /^[a-z]{1,2}\d+$/,  // e.g., e1, t2, n3
  
  // Common library exports patterns
  libraryExports: /(defineProperty|__esModule|default|exports)/,
  
  // Known library patterns
  knownLibs: [
    /^react/i,
    /^vue/i,
    /^angular/i,
    /^lodash/i,
    /^axios/i,
    /^express/i,
    /^chalk/i,
    /^yargs/i,
    /^commander/i,
    /^inquirer/i,
    /^fs-extra/i,
    /^winston/i,
    /^debug/i,
    /^dotenv/i,
    /^uuid/i,
    /^moment/i,
    /^date-fns/i,
    /^joi/i,
    /^zod/i,
    /^tslib/i,
    /^semver/i
  ]
};

class BundleAnalyzer {
  constructor(filePath) {
    this.filePath = filePath;
    this.rootVariables = new Map();
    this.libraryModules = new Map();
    this.businessLogic = new Map();
    this.dependencies = new Set();
    this.imports = new Map();
  }

  async analyze() {
    console.log('Reading file...');
    const code = fs.readFileSync(this.filePath, 'utf-8');
    
    console.log('Parsing AST...');
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
      allowImportExportEverywhere: true
    });

    console.log('Analyzing root-level variables...');
    this.extractRootVariables(ast);
    
    console.log('Categorizing modules...');
    this.categorizeModules();
    
    console.log('Detecting dependencies...');
    this.detectDependencies();
    
    return this.generateReport();
  }

  extractRootVariables(ast) {
    traverse(ast, {
      VariableDeclaration: (path) => {
        // Only process root-level declarations
        if (path.parent.type === 'Program') {
          path.node.declarations.forEach(declaration => {
            if (t.isIdentifier(declaration.id)) {
              const varName = declaration.id.name;
              const varInfo = {
                name: varName,
                kind: path.node.kind,
                loc: declaration.loc,
                init: declaration.init,
                code: generate(declaration).code,
                isLibrary: false,
                libraryName: null,
                patterns: []
              };
              
              this.rootVariables.set(varName, varInfo);
            }
          });
        }
      },
      
      FunctionDeclaration: (path) => {
        if (path.parent.type === 'Program' && path.node.id) {
          const funcName = path.node.id.name;
          const funcInfo = {
            name: funcName,
            kind: 'function',
            loc: path.node.loc,
            code: generate(path.node).code.substring(0, 500) + '...',
            isLibrary: false,
            patterns: []
          };
          
          this.rootVariables.set(funcName, funcInfo);
        }
      }
    });
  }

  categorizeModules() {
    for (const [varName, varInfo] of this.rootVariables) {
      // Check against library patterns
      varInfo.patterns = this.checkPatterns(varName, varInfo.code);
      
      // Heuristics for library detection
      if (this.isLikelyLibrary(varName, varInfo)) {
        varInfo.isLibrary = true;
        varInfo.libraryName = this.guessLibraryName(varName, varInfo);
        this.libraryModules.set(varName, varInfo);
      } else {
        this.businessLogic.set(varName, varInfo);
      }
    }
  }

  checkPatterns(varName, code) {
    const patterns = [];
    
    // Check variable name patterns
    for (const [patternName, pattern] of Object.entries(libraryPatterns)) {
      if (pattern instanceof RegExp && pattern.test(varName)) {
        patterns.push(`name:${patternName}`);
      }
    }
    
    // Check code content patterns
    const codeSnippet = code.substring(0, 1000);
    
    if (codeSnippet.includes('require(')) patterns.push('uses:require');
    if (codeSnippet.includes('exports')) patterns.push('uses:exports');
    if (codeSnippet.includes('module.exports')) patterns.push('uses:module.exports');
    if (codeSnippet.includes('__webpack')) patterns.push('webpack');
    if (codeSnippet.includes('define(') && codeSnippet.includes('AMD')) patterns.push('amd');
    if (codeSnippet.includes('System.register')) patterns.push('systemjs');
    
    // Check for known library patterns in code
    for (const libPattern of libraryPatterns.knownLibs) {
      if (libPattern.test(codeSnippet)) {
        patterns.push(`lib:${libPattern.source}`);
      }
    }
    
    return patterns;
  }

  isLikelyLibrary(varName, varInfo) {
    // Strong indicators of library code
    if (varInfo.patterns.some(p => p.startsWith('lib:'))) return true;
    if (varInfo.patterns.includes('webpack')) return true;
    if (varInfo.patterns.includes('amd')) return true;
    if (varInfo.patterns.includes('systemjs')) return true;
    
    // Minified variable names
    if (libraryPatterns.minifiedLibs.test(varName)) {
      // But check if it's not just a simple assignment
      if (varInfo.code.length > 100) return true;
    }
    
    // Module pattern
    if (varInfo.code.includes('function(module,exports)') ||
        varInfo.code.includes('function(e,t,n)') ||
        varInfo.code.includes('function(e,t,r)')) {
      return true;
    }
    
    // IIFE with complex structure
    if (varInfo.code.match(/^\s*\(function\s*\([^)]*\)\s*{[\s\S]{100,}/)) {
      return true;
    }
    
    return false;
  }

  guessLibraryName(varName, varInfo) {
    // Check for explicit library patterns in code
    for (const libPattern of libraryPatterns.knownLibs) {
      if (libPattern.test(varInfo.code)) {
        const match = libPattern.source.replace(/[^a-z]/gi, '');
        return match;
      }
    }
    
    // Check for package name strings in code
    const packageMatch = varInfo.code.match(/"name"\s*:\s*"([^"]+)"/);
    if (packageMatch) return packageMatch[1];
    
    // Check for common library identifiers
    const libMatch = varInfo.code.match(/(?:window\.|global\.|exports\.)(\w+)\s*=/);
    if (libMatch) return libMatch[1];
    
    return 'unknown-lib';
  }

  detectDependencies() {
    // Scan for require() calls and import patterns
    for (const [varName, varInfo] of this.rootVariables) {
      const requireMatches = varInfo.code.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g);
      for (const match of requireMatches) {
        const dep = match[1];
        if (!dep.startsWith('.') && !dep.startsWith('/')) {
          this.dependencies.add(dep);
        }
      }
    }
  }

  generateReport() {
    const report = {
      summary: {
        totalRootVariables: this.rootVariables.size,
        libraryModules: this.libraryModules.size,
        businessLogicModules: this.businessLogic.size,
        detectedDependencies: this.dependencies.size
      },
      libraries: [],
      businessLogic: [],
      dependencies: Array.from(this.dependencies).sort()
    };

    // Add library details
    for (const [varName, varInfo] of this.libraryModules) {
      report.libraries.push({
        variable: varName,
        guessedLibrary: varInfo.libraryName,
        patterns: varInfo.patterns,
        codePreview: varInfo.code.substring(0, 200) + '...'
      });
    }

    // Add business logic details
    for (const [varName, varInfo] of this.businessLogic) {
      report.businessLogic.push({
        variable: varName,
        kind: varInfo.kind,
        patterns: varInfo.patterns,
        codePreview: varInfo.code.substring(0, 200) + '...'
      });
    }

    return report;
  }
}

// Main execution
async function main() {
  const analyzer = new BundleAnalyzer('cli.js');
  
  try {
    const report = await analyzer.analyze();
    
    // Save detailed report
    fs.writeFileSync('bundle-analysis.json', JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n=== Bundle Analysis Summary ===');
    console.log(`Total root variables: ${report.summary.totalRootVariables}`);
    console.log(`Library modules: ${report.summary.libraryModules}`);
    console.log(`Business logic modules: ${report.summary.businessLogicModules}`);
    console.log(`Detected dependencies: ${report.summary.detectedDependencies}`);
    
    console.log('\n=== Top Detected Libraries ===');
    report.libraries.slice(0, 10).forEach(lib => {
      console.log(`- ${lib.variable} => ${lib.guessedLibrary} (patterns: ${lib.patterns.join(', ')})`);
    });
    
    console.log('\n=== Detected NPM Dependencies ===');
    report.dependencies.slice(0, 20).forEach(dep => {
      console.log(`- ${dep}`);
    });
    
    console.log('\nFull report saved to: bundle-analysis.json');
    
  } catch (error) {
    console.error('Error analyzing bundle:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { BundleAnalyzer }; 