#!/usr/bin/env node

/**
 * Play RPG
 * 
 * Opens the RPG world in the browser for manual testing and gameplay
 */

import puppeteer from 'puppeteer';

async function playRPG() {
  console.log('🎮 Opening RPG World for Play...');
  
  // Check if servers are running
  try {
    const response = await fetch('http://localhost:4445');
    if (!response.ok) throw new Error('Frontend not responding');
    
    const backendResponse = await fetch('http://localhost:4444');
    if (!backendResponse.ok) throw new Error('Backend not responding');
    
    console.log('✅ Servers are running');
  } catch (error) {
    console.error('❌ Servers not running. Start them first with: bun run rpg:start');
    process.exit(1);
  }
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized',
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage();
  
  // Set up console logging for debugging
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error') {
      console.log(`🚨 Browser error: ${msg.text()}`);
    } else if (type === 'warning') {
      console.log(`⚠️ Browser warning: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`💥 Page error: ${error.message}`);
  });
  
  console.log('🌍 Loading RPG world...');
  await page.goto('http://localhost:4445', { waitUntil: 'networkidle0' });
  
  console.log('🎉 RPG World loaded!');
  console.log('📝 Use the browser window to play the RPG');
  console.log('🔧 Check browser console for any errors');
  console.log('');
  console.log('Controls:');
  console.log('  WASD - Move around');
  console.log('  Mouse - Look around');
  console.log('  Click - Interact');
  console.log('');
  console.log('Close the browser window when done playing.');
  
  // Wait for browser to close
  await new Promise((resolve) => {
    browser.on('disconnected', resolve);
  });
  
  console.log('👋 RPG session ended');
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  playRPG().catch(error => {
    console.error('❌ Failed to start RPG:', error);
    process.exit(1);
  });
}

export { playRPG };