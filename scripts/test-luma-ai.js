// Simple script to test the Luma AI integration
require('dotenv').config();
const { LumaAI } = require('lumaai');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Main function to test the integration
async function testLumaAI() {
  console.log('Testing Luma AI integration...');
  
  // Check for API key
  const lumaApiKey = process.env.LUMAAI_API_KEY;
  if (!lumaApiKey) {
    console.error('LUMAAI_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  // Initialize Luma AI client
  const client = new LumaAI({
    authToken: lumaApiKey
  });
  
  try {
    // Create test prompt
    const prompt = 'A beautiful sunset over the ocean with palm trees in the foreground';
    console.log(`Generating image with prompt: "${prompt}"`);
    
    // Create image generation request
    const generation = await client.generations.image.create({
      prompt: prompt,
      aspect_ratio: '16:9',
      model: 'photon-1'
    });
    
    console.log(`Generation created with ID: ${generation.id}`);
    
    // Poll for generation completion
    let completed = false;
    while (!completed) {
      const generationStatus = await client.generations.get(generation.id);
      
      if (generationStatus.state === 'completed') {
        completed = true;
        console.log('Image generation completed!');
      } else if (generationStatus.state === 'failed') {
        console.error(`Generation failed: ${generationStatus.failure_reason}`);
        process.exit(1);
      } else {
        console.log(`Generation in progress... (State: ${generationStatus.state})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before polling again
      }
    }
    
    // Get the final generation result
    const finalGeneration = await client.generations.get(generation.id);
    const imageUrl = finalGeneration.assets.image;
    
    if (!imageUrl) {
      console.error('No image URL returned from Luma AI');
      process.exit(1);
    }
    
    console.log(`Image URL: ${imageUrl}`);
    
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(`Failed to download image: ${imageResponse.statusText}`);
      process.exit(1);
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Save the image to disk
    const tempDir = path.join(process.cwd(), 'generated-media');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = path.join(tempDir, `luma-ai-test-${Date.now()}.png`);
    fs.writeFileSync(filePath, buffer.toString('binary'), 'binary');
    console.log(`Image saved to: ${filePath}`);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing Luma AI integration:', error);
    process.exit(1);
  }
}

// Run the test
testLumaAI(); 