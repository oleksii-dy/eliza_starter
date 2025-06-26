#!/usr/bin/env node

/**
 * Pixel Detection Test
 * 
 * Use Sharp to analyze the screenshots and see if any colored pixels
 * are present, even if they're not visible to us.
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function analyzeScreenshot(imagePath, expectedColor) {
  try {
    console.log(`\\n🔍 Analyzing ${imagePath} for color ${expectedColor}`);
    
    const metadata = await sharp(imagePath).metadata();
    console.log(`   Image size: ${metadata.width}x${metadata.height}`);
    
    // Get raw RGB data
    const imageData = await sharp(imagePath)
      .raw()
      .toBuffer();
    
    // Convert hex color to RGB
    const hexMatch = expectedColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!hexMatch) {
      console.log(`   ❌ Invalid color format: ${expectedColor}`);
      return;
    }
    
    const targetR = parseInt(hexMatch[1], 16);
    const targetG = parseInt(hexMatch[2], 16);
    const targetB = parseInt(hexMatch[3], 16);
    
    console.log(`   Target RGB: (${targetR}, ${targetG}, ${targetB})`);
    
    // Sample some pixels to see what colors are present
    const sampleSize = Math.min(1000, Math.floor(imageData.length / 3 / 10));
    const colorCounts = new Map();
    let totalPixels = 0;
    let matchingPixels = 0;
    
    for (let i = 0; i < imageData.length; i += 3) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      
      totalPixels++;
      
      // Check for exact match
      if (r === targetR && g === targetG && b === targetB) {
        matchingPixels++;
      }
      
      // Check for close match (within tolerance)
      const distance = Math.sqrt((r - targetR) ** 2 + (g - targetG) ** 2 + (b - targetB) ** 2);
      if (distance <= 10) {
        matchingPixels++;
      }
      
      // Count color frequencies (sample)
      if (totalPixels % 100 === 0) {
        const colorKey = `${r},${g},${b}`;
        colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
      }
    }
    
    console.log(`   Total pixels: ${totalPixels}`);
    console.log(`   Matching pixels: ${matchingPixels}`);
    console.log(`   Match rate: ${(matchingPixels / totalPixels * 100).toFixed(4)}%`);
    
    // Show most common colors
    const sortedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    console.log(`   Top colors:`);
    sortedColors.forEach(([color, count]) => {
      console.log(`     RGB(${color}): ${count} samples`);
    });
    
    return matchingPixels > 0;
    
  } catch (error) {
    console.error(`   ❌ Error analyzing ${imagePath}:`, error.message);
    return false;
  }
}

async function runPixelDetectionTest() {
  console.log('🎯 Pixel Detection Test');
  console.log('========================');
  
  const testDir = join(__dirname, '..', 'camera-debug-test');
  
  const tests = [
    { file: '2-center.png', color: '#FF0000', name: 'Red Center' },
    { file: '3-front-close.png', color: '#00FF00', name: 'Green Front-Close' },
    { file: '4-front-far.png', color: '#0000FF', name: 'Blue Front-Far' },
    { file: '5-above.png', color: '#FFFF00', name: 'Yellow Above' },
    { file: '6-below.png', color: '#FF00FF', name: 'Magenta Below' },
    { file: '7-left.png', color: '#00FFFF', name: 'Cyan Left' },
    { file: '8-right.png', color: '#FFA500', name: 'Orange Right' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const imagePath = join(testDir, test.file);
    const hasColor = await analyzeScreenshot(imagePath, test.color);
    results.push({ ...test, hasColor });
  }
  
  console.log('\\n📊 Summary:');
  console.log('=============');
  
  let foundAny = false;
  results.forEach(result => {
    const status = result.hasColor ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.hasColor ? 'FOUND' : 'NOT FOUND'}`);
    if (result.hasColor) foundAny = true;
  });
  
  if (foundAny) {
    console.log('\\n🎉 SUCCESS: Some colored pixels were detected!');
    console.log('The visual system is working, entities are rendering.');
  } else {
    console.log('\\n❌ ISSUE: No colored pixels detected in any screenshot.');
    console.log('This suggests the entities may not be rendering visually.');
  }
  
  return foundAny;
}

// Run the test
const success = await runPixelDetectionTest();
process.exit(success ? 0 : 1);