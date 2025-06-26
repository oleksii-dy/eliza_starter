const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

class BusinessLogicExtractor {
  constructor(inputFile, outputDir) {
    this.inputFile = inputFile;
    this.outputDir = outputDir;
    this.extractedModules = new Map();
    this.dependencies = new Set();
    this.importMap = new Map();
    this.variableRenames = new Map();
    this.libraryCode = [];
    this.businessCode = [];
  }

  async extract() {
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    console.log('Reading and parsing file...');
    const code = fs.readFileSync(this.inputFile, 'utf-8');
    
    // Try to parse with all modern plugins
    let ast;
    try {
      ast = parser.parse(code, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript', 
          'decorators-legacy',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'asyncGenerators',
          'functionBind',
          'functionSent',
          'dynamicImport',
          'numericSeparator',
          'optionalChaining',
          'importMeta',
          'bigInt',
          'optionalCatchBinding',
          'throwExpressions',
          ['pipelineOperator', { proposal: 'minimal' }],
          'nullishCoalescingOperator',
          'logicalAssignment',
          'partialApplication',
          'topLevelAwait'
        ],
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true
      });
    } catch (error) {
      console.error('Parse error:', error.message);
      console.log('Attempting fallback extraction...');
      return this.fallbackExtraction(code);
    }

    console.log('Analyzing AST...');
    this.analyzeAST(ast);
    
    console.log('Generating output files...');
    this.generateOutputFiles();
    
    console.log('Creating package.json...');
    this.createPackageJson();
    
    return {
      modulesExtracted: this.extractedModules.size,
      dependencies: Array.from(this.dependencies),
      outputDirectory: this.outputDir
    };
  }

  analyzeAST(ast) {
    // First pass: collect all top-level declarations
    traverse(ast, {
      Program: (path) => {
        path.node.body.forEach((node, index) => {
          this.categorizeNode(node, index);
        });
      },
      
      ImportDeclaration: (path) => {
        const source = path.node.source.value;
        if (!source.startsWith('.')) {
          this.dependencies.add(this.extractPackageName(source));
        }
        
        // Track imports for demangling
        path.node.specifiers.forEach(spec => {
          if (t.isImportSpecifier(spec)) {
            this.importMap.set(spec.local.name, {
              imported: spec.imported.name,
              source: source
            });
          } else if (t.isImportDefaultSpecifier(spec)) {
            this.importMap.set(spec.local.name, {
              imported: 'default',
              source: source
            });
          }
        });
      },
      
      CallExpression: (path) => {
        // Track require() calls
        if (t.isIdentifier(path.node.callee, { name: 'require' }) ||
            (t.isMemberExpression(path.node.callee) && 
             t.isIdentifier(path.node.callee.property, { name: 'require' }))) {
          const arg = path.node.arguments[0];
          if (t.isStringLiteral(arg) && !arg.value.startsWith('.')) {
            this.dependencies.add(this.extractPackageName(arg.value));
          }
        }
      }
    });

    // Second pass: intelligent variable renaming
    this.intelligentRename(ast);
  }

  categorizeNode(node, index) {
    const nodeInfo = {
      node: node,
      index: index,
      code: generate(node).code,
      isLibrary: false,
      moduleName: null
    };

    // Check if this is likely library code
    if (this.isLibraryCode(node, nodeInfo.code)) {
      nodeInfo.isLibrary = true;
      this.libraryCode.push(nodeInfo);
    } else {
      // Extract business logic module name
      nodeInfo.moduleName = this.extractModuleName(node, nodeInfo.code);
      this.businessCode.push(nodeInfo);
      
      // Group related business logic
      if (nodeInfo.moduleName) {
        if (!this.extractedModules.has(nodeInfo.moduleName)) {
          this.extractedModules.set(nodeInfo.moduleName, []);
        }
        this.extractedModules.get(nodeInfo.moduleName).push(nodeInfo);
      }
    }
  }

  isLibraryCode(node, code) {
    // Heuristics to identify library code
    const libraryPatterns = [
      /\b__webpack_require__\b/,
      /\bdefine\s*\(\s*\[/,
      /\bSystem\.register\b/,
      /\b_interopRequireDefault\b/,
      /\b__esModule\b/,
      /\bObject\.defineProperty\(exports/,
      /function\s*\(\s*[a-z]\s*,\s*[a-z]\s*,\s*[a-z]\s*\)\s*{[\s\S]{0,100}[a-z]\.exports/,
      /^var\s+[a-z]\d+\s*=\s*function/,
      /^var\s+[a-z]\d+\s*=\s*\(/
    ];

    // Check code length and patterns
    if (code.length > 5000) return true;
    
    return libraryPatterns.some(pattern => pattern.test(code));
  }

  extractModuleName(node, code) {
    // Try to extract a meaningful module name
    if (t.isFunctionDeclaration(node) && node.id) {
      return this.demangleName(node.id.name);
    }
    
    if (t.isClassDeclaration(node) && node.id) {
      return this.demangleName(node.id.name);
    }
    
    if (t.isVariableDeclaration(node)) {
      const firstDeclarator = node.declarations[0];
      if (t.isIdentifier(firstDeclarator.id)) {
        return this.demangleName(firstDeclarator.id.name);
      }
    }
    
    // Check for module patterns in code
    const moduleMatch = code.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*{[\s\S]*?}/);
    if (moduleMatch) {
      return this.demangleName(moduleMatch[1]);
    }
    
    return null;
  }

  demangleName(name) {
    // If already renamed, use that
    if (this.variableRenames.has(name)) {
      return this.variableRenames.get(name);
    }
    
    // Skip if already meaningful
    if (name.length > 3 && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      return name;
    }
    
    // Try to infer from import map
    if (this.importMap.has(name)) {
      const importInfo = this.importMap.get(name);
      return importInfo.imported === 'default' ? 
        path.basename(importInfo.source, path.extname(importInfo.source)) : 
        importInfo.imported;
    }
    
    // Generate meaningful name based on usage context
    // This is a simplified version - you could make this more sophisticated
    return `renamed_${name}`;
  }

  intelligentRename(ast) {
    // Collect variable usage patterns to inform renaming
    const usagePatterns = new Map();
    
    traverse(ast, {
      MemberExpression: (path) => {
        if (t.isIdentifier(path.node.object)) {
          const varName = path.node.object.name;
          const propName = t.isIdentifier(path.node.property) ? path.node.property.name : null;
          
          if (propName) {
            if (!usagePatterns.has(varName)) {
              usagePatterns.set(varName, new Set());
            }
            usagePatterns.get(varName).add(propName);
          }
        }
      },
      
      CallExpression: (path) => {
        if (t.isIdentifier(path.node.callee)) {
          const funcName = path.node.callee.name;
          if (!usagePatterns.has(funcName)) {
            usagePatterns.set(funcName, new Set());
          }
          usagePatterns.get(funcName).add('__call__');
        }
      }
    });
    
    // Use patterns to suggest better names
    for (const [varName, patterns] of usagePatterns) {
      if (varName.match(/^[a-z]\d*$/)) {
        const newName = this.suggestName(patterns);
        if (newName) {
          this.variableRenames.set(varName, newName);
        }
      }
    }
  }

  suggestName(patterns) {
    const patternArray = Array.from(patterns);
    
    // Common patterns
    if (patterns.has('createElement') || patterns.has('Component')) return 'React';
    if (patterns.has('get') && patterns.has('post')) return 'httpClient';
    if (patterns.has('readFile') || patterns.has('writeFile')) return 'fileSystem';
    if (patterns.has('parse') && patterns.has('stringify')) return 'jsonUtil';
    if (patterns.has('info') && patterns.has('error')) return 'logger';
    if (patterns.has('validate') || patterns.has('schema')) return 'validator';
    
    // Check for common method patterns
    const methods = patternArray.filter(p => p !== '__call__');
    if (methods.length > 0) {
      // Use the most descriptive method name as a base
      const baseName = methods.reduce((a, b) => a.length > b.length ? a : b);
      return `${baseName}Util`;
    }
    
    return null;
  }

  extractPackageName(source) {
    if (source.startsWith('@')) {
      return source.split('/').slice(0, 2).join('/');
    }
    return source.split('/')[0];
  }

  generateOutputFiles() {
    // Generate main business logic file
    const mainContent = this.generateMainFile();
    fs.writeFileSync(path.join(this.outputDir, 'index.ts'), mainContent);
    
    // Generate individual module files
    for (const [moduleName, nodes] of this.extractedModules) {
      const moduleContent = this.generateModuleFile(moduleName, nodes);
      const fileName = `${moduleName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ts`;
      fs.writeFileSync(path.join(this.outputDir, fileName), moduleContent);
    }
    
    // Generate types file
    const typesContent = this.generateTypesFile();
    fs.writeFileSync(path.join(this.outputDir, 'types.ts'), typesContent);
  }

  generateMainFile() {
    const imports = [];
    const exports = [];
    
    // Add dependency imports
    for (const dep of this.dependencies) {
      if (!dep.startsWith('node:')) {
        imports.push(`import * as ${this.sanitizeName(dep)} from '${dep}';`);
      }
    }
    
    // Add module imports
    for (const moduleName of this.extractedModules.keys()) {
      const fileName = moduleName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      imports.push(`import * as ${moduleName} from './${fileName}';`);
      exports.push(`  ${moduleName},`);
    }
    
    return `// Auto-extracted business logic from bundled file
// Generated on ${new Date().toISOString()}

${imports.join('\n')}

// Re-export all modules
export {
${exports.join('\n')}
};

// Main entry point
export default {
${exports.join('\n')}
};
`;
  }

  generateModuleFile(moduleName, nodes) {
    const moduleCode = nodes.map(nodeInfo => {
      // Apply variable renames
      let code = nodeInfo.code;
      for (const [oldName, newName] of this.variableRenames) {
        code = code.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
      }
      return code;
    }).join('\n\n');
    
    return `// Module: ${moduleName}
// Auto-extracted from bundled file

${moduleCode}
`;
  }

  generateTypesFile() {
    return `// Type definitions for extracted modules
// These are inferred and may need manual refinement

export interface Config {
  [key: string]: any;
}

export interface Logger {
  info(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  debug(...args: any[]): void;
}

// Add more type definitions as needed
`;
  }

  createPackageJson() {
    const packageJson = {
      name: 'extracted-business-logic',
      version: '1.0.0',
      description: 'Business logic extracted from bundled JavaScript',
      main: 'index.ts',
      type: 'module',
      scripts: {
        'build': 'tsc',
        'dev': 'ts-node index.ts'
      },
      dependencies: {},
      devDependencies: {
        '@types/node': '^20.0.0',
        'typescript': '^5.0.0',
        'ts-node': '^10.0.0'
      }
    };
    
    // Add detected dependencies
    for (const dep of this.dependencies) {
      if (!dep.startsWith('node:') && !['fs', 'path', 'os', 'crypto', 'util', 'stream', 'http', 'https', 'url', 'assert', 'zlib'].includes(dep)) {
        packageJson.dependencies[dep] = '*';
      }
    }
    
    fs.writeFileSync(
      path.join(this.outputDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        allowJs: true,
        outDir: './dist'
      },
      include: ['*.ts'],
      exclude: ['node_modules']
    };
    
    fs.writeFileSync(
      path.join(this.outputDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
  }

  sanitizeName(name) {
    return name.replace(/[@/-]/g, '_');
  }

  async fallbackExtraction(code) {
    console.log('Using fallback regex-based extraction...');
    
    // Extract functions
    const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*{[^}]+}/g;
    const functions = [...code.matchAll(functionPattern)];
    
    // Extract classes
    const classPattern = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?\s*{[^}]+}/g;
    const classes = [...code.matchAll(classPattern)];
    
    // Extract constants
    const constPattern = /(?:export\s+)?const\s+(\w+)\s*=\s*[^;]+;/g;
    const constants = [...code.matchAll(constPattern)];
    
    console.log(`Found ${functions.length} functions, ${classes.length} classes, ${constants.length} constants`);
    
    // Generate simplified output
    const outputFile = path.join(this.outputDir, 'extracted-fallback.js');
    const content = `// Fallback extraction - manual cleanup required

// Functions
${functions.map(m => m[0]).join('\n\n')}

// Classes  
${classes.map(m => m[0]).join('\n\n')}

// Constants
${constants.slice(0, 100).map(m => m[0]).join('\n')}
`;
    
    fs.writeFileSync(outputFile, content);
    
    return {
      message: 'Fallback extraction completed',
      outputFile: outputFile
    };
  }
}

// Main execution
async function main() {
  const extractor = new BusinessLogicExtractor('cli.js', './extracted');
  
  try {
    const result = await extractor.extract();
    console.log('\n=== Extraction Complete ===');
    console.log(`Modules extracted: ${result.modulesExtracted || 0}`);
    console.log(`Dependencies found: ${result.dependencies ? result.dependencies.length : 0}`);
    console.log(`Output directory: ${result.outputDirectory || './extracted'}`);
    
    if (result.dependencies && result.dependencies.length > 0) {
      console.log('\n=== Detected Dependencies ===');
      result.dependencies.forEach(dep => console.log(`- ${dep}`));
    }
    
  } catch (error) {
    console.error('Extraction failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { BusinessLogicExtractor }; 