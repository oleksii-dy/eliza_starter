#!/usr/bin/env bun

import { createSearchProvider } from './src/integrations/factory';
import { logger } from '@elizaos/core';

// Mock runtime
const mockRuntime = {
  getSetting: (key: string) => process.env[key] || '',
  logger: logger,
};

async function testSearchContamination() {
  console.log('🔍 Testing for Search Provider Contamination\n');

  // Test 1: Create first provider and search
  console.log('=== Test 1: Japan Elderly Search ===');
  const provider1 = createSearchProvider('web', mockRuntime);
  console.log(`Provider 1 name: ${provider1.name}`);

  const results1 = await provider1.search(
    'From 2020 to 2050, how many elderly people will there be in Japan?',
    5
  );
  console.log(`Found ${results1.length} results:`);
  results1.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title.substring(0, 60)}...`);
    console.log(`   URL: ${r.url}`);
  });

  // Test 2: Create SECOND provider and search different query
  console.log('\n=== Test 2: Investment Philosophy Search (New Provider) ===');
  const provider2 = createSearchProvider('web', mockRuntime);
  console.log(`Provider 2 name: ${provider2.name}`);
  console.log(`Same instance? ${provider1 === provider2}`);

  const results2 = await provider2.search(
    'What are the investment philosophies of Warren Buffett and Charlie Munger?',
    5
  );
  console.log(`Found ${results2.length} results:`);
  results2.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title.substring(0, 60)}...`);
    console.log(`   URL: ${r.url}`);
  });

  // Check for contamination
  console.log('\n🔍 Checking for contamination...');
  const japanUrls = results2.filter(
    (r) =>
      r.url.toLowerCase().includes('japan') ||
      r.title.toLowerCase().includes('japan') ||
      r.url.toLowerCase().includes('elderly') ||
      r.title.toLowerCase().includes('elderly')
  );

  if (japanUrls.length > 0) {
    console.error('❌ CONTAMINATION DETECTED!');
    console.error('Found Japan-related results in investment query:');
    japanUrls.forEach((r) => console.error(`   - ${r.title}`));
  } else {
    console.log('✅ No contamination detected');
  }

  // Test 3: Try academic provider
  console.log('\n=== Test 3: Academic Provider Test ===');
  const academic1 = createSearchProvider('academic', mockRuntime);
  const academic2 = createSearchProvider('academic', mockRuntime);
  console.log(`Academic providers same instance? ${academic1 === academic2}`);
}

testSearchContamination().catch(console.error);
