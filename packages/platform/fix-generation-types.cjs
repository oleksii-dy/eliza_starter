#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fixGenerationRequestTypes(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix TextGenerationRequest
  content = content.replace(
    /const\s+(\w+):\s*TextGenerationRequest\s*=\s*{\s*type:\s*GenerationType\.TEXT,\s*(?!.*priority)/g,
    'const $1: TextGenerationRequest = {\n          type: GenerationType.TEXT,\n          priority: \'normal\','
  );
  
  // Fix ImageGenerationRequest
  content = content.replace(
    /const\s+(\w+):\s*ImageGenerationRequest\s*=\s*{\s*type:\s*GenerationType\.IMAGE,\s*(?!.*priority)/g,
    'const $1: ImageGenerationRequest = {\n          type: GenerationType.IMAGE,\n          priority: \'normal\',\n          aspect_ratio: \'1:1\',\n          quality: \'standard\','
  );
  
  // Fix AudioGenerationRequest  
  content = content.replace(
    /const\s+(\w+):\s*AudioGenerationRequest\s*=\s*{\s*type:\s*GenerationType\.AUDIO,\s*(?!.*priority)/g,
    'const $1: AudioGenerationRequest = {\n          type: GenerationType.AUDIO,\n          priority: \'normal\',\n          speed: 1.0,\n          output_format: \'mp3\','
  );
  
  // Fix VideoGenerationRequest
  content = content.replace(
    /const\s+(\w+):\s*VideoGenerationRequest\s*=\s*{\s*type:\s*GenerationType\.VIDEO,\s*(?!.*priority)/g,
    'const $1: VideoGenerationRequest = {\n          type: GenerationType.VIDEO,\n          priority: \'normal\',\n          aspect_ratio: \'16:9\',\n          resolution: \'1080p\',\n          fps: 30,\n          loop: false,'
  );
  
  // Remove duplicate priority fields
  content = content.replace(/priority:\s*'normal',\s*\n\s*priority:\s*'normal',/g, "priority: 'normal',");
  
  // Fix fetch mock
  content = content.replace(
    /global\.fetch\s*=\s*vi\.fn\(\)\s*;/g,
    'global.fetch = vi.fn() as any;\n(global.fetch as any).preconnect = vi.fn();'
  );
  
  // Fix metadata access
  content = content.replace(/\.metadata\.(\w+)/g, '.metadata?.$1');
  
  fs.writeFileSync(filePath, content);
}

function findTestFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (item.endsWith('.test.ts') || item.endsWith('.test.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Find and fix all test files in generation domain
const testFiles = findTestFiles('./lib/domains/generation/__tests__');
testFiles.forEach(fixGenerationRequestTypes);

console.log(`Fixed ${testFiles.length} test files`);