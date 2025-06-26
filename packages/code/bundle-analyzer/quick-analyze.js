const fs = require('fs');
const readline = require('readline');

class QuickBundleAnalyzer {
  constructor(filePath) {
    this.filePath = filePath;
    this.stats = {
      totalLines: 0,
      imports: new Set(),
      requires: new Set(),
      exports: 0,
      functions: 0,
      classes: 0,
      webpackPatterns: 0,
      minifiedVars: new Set(),
      libraryPatterns: new Map(),
      businessPatterns: new Map()
    };
  }

  async analyze() {
    const fileStream = fs.createReadStream(this.filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    console.log('Analyzing file line by line...');
    
    for await (const line of rl) {
      this.stats.totalLines++;
      this.analyzeLine(line, this.stats.totalLines);
      
      // Show progress every 10000 lines
      if (this.stats.totalLines % 10000 === 0) {
        console.log(`Processed ${this.stats.totalLines} lines...`);
      }
    }

    return this.generateReport();
  }

  analyzeLine(line, lineNumber) {
    // Check for import statements
    const importMatch = line.match(/import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+["']([^"']+)["']/);
    if (importMatch) {
      this.stats.imports.add(importMatch[1]);
    }

    // Check for require statements
    const requireMatches = line.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g);
    for (const match of requireMatches) {
      this.stats.requires.add(match[1]);
    }

    // Check for exports
    if (line.match(/export\s+(default\s+)?(?:const|let|var|function|class)/)) {
      this.stats.exports++;
    }

    // Check for function declarations
    if (line.match(/^(?:export\s+)?(?:async\s+)?function\s+\w+/)) {
      this.stats.functions++;
    }

    // Check for class declarations
    if (line.match(/^(?:export\s+)?class\s+\w+/)) {
      this.stats.classes++;
    }

    // Check for webpack patterns
    if (line.includes('__webpack_require__') || line.includes('__webpack_exports__')) {
      this.stats.webpackPatterns++;
    }

    // Check for minified variable patterns
    const minifiedVarMatch = line.match(/\b([a-z])\d+\s*[=:]/g);
    if (minifiedVarMatch) {
      minifiedVarMatch.forEach(match => {
        this.stats.minifiedVars.add(match.replace(/\s*[=:]/, ''));
      });
    }

    // Check for known library patterns
    this.checkLibraryPatterns(line, lineNumber);
  }

  checkLibraryPatterns(line, lineNumber) {
    const libraryKeywords = {
      'react': /\b(React|ReactDOM|useState|useEffect|Component)\b/i,
      'vue': /\b(Vue|createApp|ref|computed)\b/i,
      'express': /\b(express|app\.get|app\.post|Router)\b/i,
      'axios': /\b(axios|AxiosError)\b/i,
      'lodash': /\b(_\.|lodash|debounce|throttle)\b/i,
      'moment': /\b(moment|dayjs)\b/i,
      'chalk': /\b(chalk|colors)\b/i,
      'yargs': /\b(yargs|argv)\b/i,
      'commander': /\b(commander|program\.option)\b/i,
      'winston': /\b(winston|logger\.info)\b/i,
      'joi': /\b(Joi|schema\.validate)\b/i,
      'zod': /\b(z\.|zod|schema\.parse)\b/i,
      'typescript': /\btslib\b/i,
      'babel': /\b(@babel|_interopRequireDefault)\b/i,
      'webpack': /\b(webpack|__webpack)\b/i
    };

    for (const [lib, pattern] of Object.entries(libraryKeywords)) {
      if (pattern.test(line)) {
        if (!this.stats.libraryPatterns.has(lib)) {
          this.stats.libraryPatterns.set(lib, []);
        }
        this.stats.libraryPatterns.get(lib).push(lineNumber);
      }
    }

    // Check for business logic patterns
    const businessPatterns = {
      'api_calls': /\b(fetch|api|endpoint|request)\b/i,
      'database': /\b(database|query|insert|update|delete|select)\b/i,
      'auth': /\b(auth|login|logout|token|jwt|session)\b/i,
      'validation': /\b(validate|validator|check|verify)\b/i,
      'business_logic': /\b(process|handle|calculate|transform|business)\b/i,
      'config': /\b(config|settings|environment|env)\b/i,
      'utils': /\b(util|helper|formatter|converter)\b/i
    };

    for (const [pattern, regex] of Object.entries(businessPatterns)) {
      if (regex.test(line)) {
        if (!this.stats.businessPatterns.has(pattern)) {
          this.stats.businessPatterns.set(pattern, 0);
        }
        this.stats.businessPatterns.set(pattern, this.stats.businessPatterns.get(pattern) + 1);
      }
    }
  }

  generateReport() {
    const npmDependencies = new Set();
    
    // Combine imports and requires, filter out local imports
    [...this.stats.imports, ...this.stats.requires].forEach(dep => {
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        // Extract package name from deep imports (e.g., 'lodash/debounce' -> 'lodash')
        const packageName = dep.split('/')[0];
        if (!packageName.startsWith('@')) {
          npmDependencies.add(packageName);
        } else {
          // Handle scoped packages (@org/package)
          const scopedName = dep.split('/').slice(0, 2).join('/');
          npmDependencies.add(scopedName);
        }
      }
    });

    const report = {
      fileStats: {
        totalLines: this.stats.totalLines,
        imports: this.stats.imports.size,
        requires: this.stats.requires.size,
        exports: this.stats.exports,
        functions: this.stats.functions,
        classes: this.stats.classes,
        webpackPatterns: this.stats.webpackPatterns,
        minifiedVariables: this.stats.minifiedVars.size
      },
      detectedLibraries: Object.fromEntries(
        [...this.stats.libraryPatterns.entries()]
          .map(([lib, lines]) => [lib, lines.length])
          .sort((a, b) => b[1] - a[1])
      ),
      businessPatterns: Object.fromEntries(this.stats.businessPatterns),
      npmDependencies: Array.from(npmDependencies).sort(),
      analysis: {
        isWebpackBundle: this.stats.webpackPatterns > 10,
        isMinified: this.stats.minifiedVars.size > 50,
        hasBusinessLogic: this.stats.businessPatterns.size > 0,
        primaryLibraries: this.identifyPrimaryLibraries()
      }
    };

    return report;
  }

  identifyPrimaryLibraries() {
    const sorted = [...this.stats.libraryPatterns.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([lib, lines]) => ({ library: lib, occurrences: lines.length }));
    
    return sorted;
  }
}

// Main execution
async function main() {
  const analyzer = new QuickBundleAnalyzer('cli.js');
  
  try {
    const report = await analyzer.analyze();
    
    // Save report
    fs.writeFileSync('quick-analysis.json', JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n=== Quick Bundle Analysis Summary ===');
    console.log(`Total lines: ${report.fileStats.totalLines}`);
    console.log(`Import statements: ${report.fileStats.imports}`);
    console.log(`Require calls: ${report.fileStats.requires}`);
    console.log(`Export statements: ${report.fileStats.exports}`);
    console.log(`Webpack patterns: ${report.fileStats.webpackPatterns}`);
    console.log(`Minified variables: ${report.fileStats.minifiedVariables}`);
    
    console.log('\n=== Detected Libraries ===');
    Object.entries(report.detectedLibraries).forEach(([lib, count]) => {
      console.log(`- ${lib}: ${count} occurrences`);
    });
    
    console.log('\n=== Business Logic Patterns ===');
    Object.entries(report.businessPatterns).forEach(([pattern, count]) => {
      console.log(`- ${pattern}: ${count} occurrences`);
    });
    
    console.log('\n=== NPM Dependencies ===');
    report.npmDependencies.slice(0, 20).forEach(dep => {
      console.log(`- ${dep}`);
    });
    
    if (report.npmDependencies.length > 20) {
      console.log(`... and ${report.npmDependencies.length - 20} more`);
    }
    
    console.log('\n=== Analysis Summary ===');
    console.log(`Is Webpack bundle: ${report.analysis.isWebpackBundle}`);
    console.log(`Is minified: ${report.analysis.isMinified}`);
    console.log(`Has business logic: ${report.analysis.hasBusinessLogic}`);
    
    console.log('\nFull report saved to: quick-analysis.json');
    
  } catch (error) {
    console.error('Error analyzing bundle:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { QuickBundleAnalyzer }; 