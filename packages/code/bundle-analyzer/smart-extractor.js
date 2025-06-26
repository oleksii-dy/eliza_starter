const fs = require('fs');
const path = require('path');
const readline = require('readline');

class SmartExtractor {
  constructor(inputFile, outputDir) {
    this.inputFile = inputFile;
    this.outputDir = outputDir;
    this.classes = [];
    this.functions = [];
    this.constants = [];
    this.imports = new Set();
    this.exports = [];
    this.authLogic = [];
    this.cliLogic = [];
    this.sessionLogic = [];
    this.markdownLogic = [];
  }

  async extract() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    console.log('Analyzing file structure...');
    await this.analyzeFile();
    
    console.log('Extracting components...');
    this.categorizeComponents();
    
    console.log('Generating output files...');
    this.generateOutputFiles();
    
    return {
      classesFound: this.classes.length,
      functionsFound: this.functions.length,
      constantsFound: this.constants.length,
      authComponents: this.authLogic.length,
      cliComponents: this.cliLogic.length
    };
  }

  async analyzeFile() {
    const fileStream = fs.createReadStream(this.inputFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let currentBlock = [];
    let inClass = false;
    let inFunction = false;
    let braceDepth = 0;
    let lineNumber = 0;

    for await (const line of rl) {
      lineNumber++;
      
      // Track imports
      if (line.includes('import ')) {
        const importMatch = line.match(/import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+["']([^"']+)["']/);
        if (importMatch) {
          this.imports.add(importMatch[1]);
        }
      }

      // Track exports
      if (line.includes('export ')) {
        this.exports.push({ line, lineNumber });
      }

      // Detect class definitions
      if (line.match(/^\s*(export\s+)?class\s+(\w+)/)) {
        inClass = true;
        currentBlock = [{ line, lineNumber }];
        braceDepth = 0;
      }
      
      // Detect function definitions
      else if (line.match(/^\s*(export\s+)?(async\s+)?function\s+(\w+)/)) {
        inFunction = true;
        currentBlock = [{ line, lineNumber }];
        braceDepth = 0;
      }
      
      // Detect const/let/var declarations
      else if (line.match(/^\s*(export\s+)?(const|let|var)\s+(\w+)\s*=/)) {
        const match = line.match(/^\s*(export\s+)?(const|let|var)\s+(\w+)\s*=/);
        if (match) {
          this.constants.push({
            name: match[3],
            type: match[2],
            exported: !!match[1],
            line: line,
            lineNumber: lineNumber
          });
        }
      }

      // Track braces for block detection
      if (inClass || inFunction) {
        currentBlock.push({ line, lineNumber });
        
        // Count braces
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        braceDepth += openBraces - closeBraces;
        
        // Check if block is complete
        if (braceDepth === 0 && currentBlock.length > 1) {
          if (inClass) {
            this.extractClassInfo(currentBlock);
            inClass = false;
          } else if (inFunction) {
            this.extractFunctionInfo(currentBlock);
            inFunction = false;
          }
          currentBlock = [];
        }
      }

      // Progress indicator
      if (lineNumber % 10000 === 0) {
        console.log(`Processed ${lineNumber} lines...`);
      }
    }
  }

  extractClassInfo(block) {
    const firstLine = block[0].line;
    const className = firstLine.match(/class\s+(\w+)/)?.[1];
    
    if (!className) return;

    const classInfo = {
      name: className,
      startLine: block[0].lineNumber,
      endLine: block[block.length - 1].lineNumber,
      properties: [],
      methods: [],
      constructor: null,
      code: block.map(b => b.line).join('\n')
    };

    // Extract class members
    block.forEach(({ line }) => {
      // Properties
      const propMatch = line.match(/^\s*(\w+)\s*(=|;)/);
      if (propMatch && !line.includes('function')) {
        classInfo.properties.push(propMatch[1]);
      }
      
      // Methods
      const methodMatch = line.match(/^\s*(async\s+)?(\w+)\s*\(/);
      if (methodMatch && !line.includes('function')) {
        classInfo.methods.push(methodMatch[2]);
      }
      
      // Constructor
      if (line.includes('constructor(')) {
        classInfo.constructor = line;
      }
    });

    this.classes.push(classInfo);
  }

  extractFunctionInfo(block) {
    const firstLine = block[0].line;
    const funcMatch = firstLine.match(/function\s+(\w+)/);
    
    if (!funcMatch) return;

    const functionInfo = {
      name: funcMatch[1],
      startLine: block[0].lineNumber,
      endLine: block[block.length - 1].lineNumber,
      isAsync: firstLine.includes('async'),
      isExported: firstLine.includes('export'),
      code: block.map(b => b.line).join('\n')
    };

    this.functions.push(functionInfo);
  }

  categorizeComponents() {
    // Categorize classes
    this.classes.forEach(cls => {
      const code = cls.code.toLowerCase();
      
      if (code.includes('auth') || code.includes('oauth') || code.includes('token')) {
        this.authLogic.push(cls);
      }
      else if (code.includes('command') || code.includes('cli') || code.includes('argv')) {
        this.cliLogic.push(cls);
      }
      else if (code.includes('session') || code.includes('state')) {
        this.sessionLogic.push(cls);
      }
      else if (code.includes('markdown') || code.includes('render')) {
        this.markdownLogic.push(cls);
      }
    });

    // Categorize functions
    this.functions.forEach(func => {
      const code = func.code.toLowerCase();
      
      if (code.includes('auth') || code.includes('login') || code.includes('token')) {
        this.authLogic.push(func);
      }
      else if (code.includes('command') || code.includes('execute') || code.includes('shell')) {
        this.cliLogic.push(func);
      }
      else if (code.includes('session') || code.includes('save') || code.includes('load')) {
        this.sessionLogic.push(func);
      }
    });
  }

  generateOutputFiles() {
    // Create main index file
    this.generateIndexFile();
    
    // Generate component files
    this.generateComponentFile('auth', this.authLogic);
    this.generateComponentFile('cli', this.cliLogic);
    this.generateComponentFile('session', this.sessionLogic);
    this.generateComponentFile('markdown', this.markdownLogic);
    
    // Generate types file
    this.generateTypesFile();
    
    // Generate demangled names mapping
    this.generateNameMapping();
    
    // Create package.json
    this.createPackageJson();
  }

  generateIndexFile() {
    const content = `// Extracted business logic components
// Generated on ${new Date().toISOString()}

export * from './auth';
export * from './cli';
export * from './session';
export * from './markdown';

// Re-export main components
export {
  ${this.classes.slice(0, 10).map(c => c.name).join(',\n  ')}
} from './classes';

// Utility functions
export {
  ${this.functions.slice(0, 10).map(f => f.name).join(',\n  ')}
} from './functions';
`;

    fs.writeFileSync(path.join(this.outputDir, 'index.ts'), content);
  }

  generateComponentFile(name, components) {
    if (components.length === 0) return;

    const content = `// ${name.charAt(0).toUpperCase() + name.slice(1)} Components
// Extracted from bundled code

${components.map(comp => {
  if (comp.code) {
    return `// ${comp.name} - Lines ${comp.startLine}-${comp.endLine}
${this.cleanupCode(comp.code)}
`;
  }
  return '';
}).join('\n\n')}

export {
  ${components.slice(0, 20).map(c => c.name).join(',\n  ')}
};
`;

    fs.writeFileSync(path.join(this.outputDir, `${name}.ts`), content);
  }

  cleanupCode(code) {
    // Basic cleanup - expand minified patterns
    let cleaned = code;
    
    // Expand common minified patterns
    cleaned = cleaned.replace(/\b([a-z])\b(?=\s*[=:.])/g, (match, char) => {
      const expansions = {
        'A': 'arg',
        'B': 'param',
        'Q': 'result',
        'I': 'index',
        'G': 'value',
        'Z': 'data',
        'D': 'item',
        'Y': 'temp',
        'W': 'callback',
        'J': 'element',
        'F': 'flag',
        'X': 'context',
        'V': 'state',
        'C': 'config',
        'K': 'key',
        'E': 'event',
        'N': 'node',
        'q': 'query',
        'O': 'options',
        'R': 'response',
        'T': 'type',
        'L': 'list',
        '_': 'prop',
        'k': 'count',
        'i': 'iterator'
      };
      
      return expansions[char] || `var_${char}`;
    });
    
    // Add TypeScript types where possible
    cleaned = cleaned.replace(/function\s+(\w+)\s*\(([^)]*)\)/g, 'function $1($2): any');
    cleaned = cleaned.replace(/^\s*(const|let|var)\s+(\w+)\s*=/gm, '$1 $2: any =');
    
    return cleaned;
  }

  generateTypesFile() {
    const content = `// Type definitions for extracted components
// Auto-generated - requires manual refinement

// Authentication types
export interface AuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string[];
}

export interface Session {
  id: string;
  userId?: string;
  token?: string;
  expiresAt?: number;
  data?: Record<string, any>;
}

// CLI types
export interface CommandOptions {
  name: string;
  description?: string;
  options?: Array<{
    flag: string;
    description: string;
    required?: boolean;
  }>;
}

// Add interfaces for detected classes
${this.classes.slice(0, 10).map(cls => `
export interface ${cls.name} {
  ${cls.properties.map(p => `${p}: any;`).join('\n  ')}
  ${cls.methods.map(m => `${m}(...args: any[]): any;`).join('\n  ')}
}`).join('\n')}
`;

    fs.writeFileSync(path.join(this.outputDir, 'types.ts'), content);
  }

  generateNameMapping() {
    const mapping = {
      variables: {},
      functions: {},
      classes: {}
    };

    // Create mapping suggestions
    this.functions.forEach(func => {
      if (func.name.match(/^[a-z]{1,2}\d*$/)) {
        const suggestion = this.suggestFunctionName(func);
        if (suggestion) {
          mapping.functions[func.name] = suggestion;
        }
      }
    });

    this.classes.forEach(cls => {
      if (cls.name.match(/^[A-Z][a-z]?\d*$/)) {
        const suggestion = this.suggestClassName(cls);
        if (suggestion) {
          mapping.classes[cls.name] = suggestion;
        }
      }
    });

    fs.writeFileSync(
      path.join(this.outputDir, 'name-mapping.json'),
      JSON.stringify(mapping, null, 2)
    );
  }

  suggestFunctionName(func) {
    const code = func.code.toLowerCase();
    
    // Pattern-based suggestions
    if (code.includes('auth') && code.includes('token')) return 'handleAuthentication';
    if (code.includes('parse') && code.includes('command')) return 'parseCommand';
    if (code.includes('execute') && code.includes('shell')) return 'executeShellCommand';
    if (code.includes('render') && code.includes('markdown')) return 'renderMarkdown';
    if (code.includes('save') && code.includes('session')) return 'saveSession';
    if (code.includes('load') && code.includes('config')) return 'loadConfiguration';
    if (code.includes('validate')) return 'validateInput';
    if (code.includes('format')) return 'formatOutput';
    
    return null;
  }

  suggestClassName(cls) {
    const code = cls.code.toLowerCase();
    
    // Pattern-based suggestions
    if (code.includes('auth') && code.includes('listener')) return 'AuthenticationListener';
    if (code.includes('command') && code.includes('handler')) return 'CommandHandler';
    if (code.includes('session') && code.includes('manager')) return 'SessionManager';
    if (code.includes('markdown') && code.includes('renderer')) return 'MarkdownRenderer';
    if (code.includes('terminal')) return 'TerminalInterface';
    if (code.includes('config')) return 'ConfigurationManager';
    
    return null;
  }

  createPackageJson() {
    const detectedDeps = {};
    
    // Map imports to npm packages
    this.imports.forEach(imp => {
      if (!imp.startsWith('.') && !imp.startsWith('node:')) {
        const pkg = imp.split('/')[0];
        if (pkg.startsWith('@')) {
          const scopedPkg = imp.split('/').slice(0, 2).join('/');
          detectedDeps[scopedPkg] = '*';
        } else {
          detectedDeps[pkg] = '*';
        }
      }
    });

    const packageJson = {
      name: 'extracted-cli-app',
      version: '1.0.0',
      description: 'Extracted CLI application business logic',
      main: 'dist/index.js',
      type: 'module',
      scripts: {
        'build': 'tsc',
        'dev': 'ts-node src/index.ts',
        'clean': 'rm -rf dist',
        'lint': 'eslint src/**/*.ts'
      },
      dependencies: {
        ...detectedDeps,
        'commander': '^11.0.0',
        'chalk': '^5.0.0',
        'zod': '^3.0.0'
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        'typescript': '^5.0.0',
        'ts-node': '^10.0.0',
        'eslint': '^8.0.0',
        '@typescript-eslint/parser': '^6.0.0',
        '@typescript-eslint/eslint-plugin': '^6.0.0'
      }
    };

    fs.writeFileSync(
      path.join(this.outputDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        lib: ['ES2022'],
        moduleResolution: 'node',
        rootDir: './src',
        outDir: './dist',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        removeComments: false,
        allowJs: true,
        checkJs: false
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist']
    };

    fs.writeFileSync(
      path.join(this.outputDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
  }
}

// Main execution
async function main() {
  const extractor = new SmartExtractor('cli.js', './smart-extracted');
  
  try {
    const result = await extractor.extract();
    
    console.log('\n=== Extraction Complete ===');
    console.log(`Classes found: ${result.classesFound}`);
    console.log(`Functions found: ${result.functionsFound}`);
    console.log(`Constants found: ${result.constantsFound}`);
    console.log(`Auth components: ${result.authComponents}`);
    console.log(`CLI components: ${result.cliComponents}`);
    
    console.log('\nOutput directory: ./smart-extracted');
    console.log('\nNext steps:');
    console.log('1. Review the extracted components in ./smart-extracted');
    console.log('2. Check name-mapping.json for variable name suggestions');
    console.log('3. Refine the TypeScript types in types.ts');
    console.log('4. Run npm install in the output directory');
    console.log('5. Build with npm run build');
    
  } catch (error) {
    console.error('Extraction failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SmartExtractor }; 