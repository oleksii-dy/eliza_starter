// Simple script to test the Luma AI video generation
require('dotenv').config();
const { LumaAI } = require('lumaai');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Main function to test the video generation
async function testLumaVideoGeneration() {
  console.log('Testing Luma AI video generation...');
  
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
    const prompt = 'A teddy bear in sunglasses playing electric guitar and dancing';
    console.log(`Generating video with prompt: "${prompt}"`);
    
    // Create video generation request
    const generation = await client.generations.create({
      prompt: prompt,
      aspect_ratio: '16:9',
      loop: true
    });
    
    console.log(`Video generation created with ID: ${generation.id}`);
    
    // Poll for generation completion
    let completed = false;
    while (!completed) {
      const generationStatus = await client.generations.get(generation.id);
      
      if (generationStatus.state === 'completed') {
        completed = true;
        console.log('Video generation completed!');
      } else if (generationStatus.state === 'failed') {
        console.error(`Generation failed: ${generationStatus.failure_reason}`);
        process.exit(1);
      } else {
        console.log(`Video generation in progress... (State: ${generationStatus.state})`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before polling again
      }
    }
    
    // Get the final generation result
    const finalGeneration = await client.generations.get(generation.id);
    const videoUrl = finalGeneration.assets.video;
    
    if (!videoUrl) {
      console.error('No video URL returned from Luma AI');
      process.exit(1);
    }
    
    console.log(`Video URL: ${videoUrl}`);
    
    // Download the video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      console.error(`Failed to download video: ${videoResponse.statusText}`);
      process.exit(1);
    }
    
    const arrayBuffer = await videoResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Save the video to disk
    const tempDir = path.join(process.cwd(), 'generated-media');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = path.join(tempDir, `luma-ai-video-test-${Date.now()}.mp4`);
    fs.writeFileSync(filePath, buffer);
    console.log(`Video saved to: ${filePath}`);
    
    // Display dimensions and other properties if available
    if (finalGeneration.parameters) {
      console.log('Video parameters:');
      console.log(JSON.stringify(finalGeneration.parameters, null, 2));
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing Luma AI video generation:', error);
    process.exit(1);
  }
}

// Run the test
testLumaVideoGeneration(); 