#!/usr/bin/env bun

import { TavilySearchProvider } from './src/integrations/search-providers/tavily';

const apiKey = process.env.TAVILY_API_KEY;
if (!apiKey) {
  console.error('Please set TAVILY_API_KEY');
  process.exit(1);
}

async function testTavily() {
  const tavily = new TavilySearchProvider({ apiKey: apiKey! });

  // Test two different queries
  console.log('\n=== Test 1: Japan Elderly Population ===');
  const results1 = await tavily.search('From 2020 to 2050, how many elderly people will there be in Japan?', 5);
  console.log(`Found ${results1.length} results:`);
  results1.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title}`);
    console.log(`   URL: ${r.url}`);
  });

  console.log('\n=== Test 2: Investment Philosophies ===');
  const results2 = await tavily.search('What are the investment philosophies of Duan Yongping, Warren Buffett, and Charlie Munger?', 5);
  console.log(`Found ${results2.length} results:`);
  results2.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title}`);
    console.log(`   URL: ${r.url}`);
  });
}

testTavily().catch(console.error);
