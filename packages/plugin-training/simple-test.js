#!/usr/bin/env node

/**
 * Simple test to verify our fine-tuned model works
 */

const TOGETHER_API_KEY = "f8b2d1d28bbf45711a1a55b156fc3d53826d9422ad0af59dbcf038cd12d17fdf";
const FINE_TUNED_MODEL = "moonmakesmagic/DeepSeek-R1-Distill-Qwen-1.5B-eliza-demo-f94707be";

async function testSimplePrompt() {
  try {
    console.log('🧪 Testing fine-tuned model with simple prompt...');
    console.log(`📝 Prompt: "What is 2+2?"`);
    console.log('─'.repeat(50));
    
    const response = await fetch('https://api.together.xyz/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: FINE_TUNED_MODEL,
        prompt: "What is 2+2?",
        max_tokens: 100,
        temperature: 0.1,
        stop: ["</s>", "\n\n"]
      })
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${errorText}`);
      return;
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      console.log('✅ Model response:');
      console.log('─'.repeat(30));
      console.log(data.choices[0].text);
      console.log('─'.repeat(30));
      console.log(`📊 Tokens used: ${data.usage?.total_tokens || 'unknown'}`);
      console.log('🎉 Model is working!');
    } else {
      console.error('❌ No response from model');
      console.log('Raw response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSimplePrompt();