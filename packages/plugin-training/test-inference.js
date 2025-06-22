#!/usr/bin/env node

/**
 * Simple test script to verify our fine-tuned model works
 */

const TOGETHER_API_KEY = "1ba7ad9a4c2d32b5f55ec2f66da8df82c8ba56edd4e6daa4e0b6c79ef97c32e14";
const FINE_TUNED_MODEL = "moonmakesmagic/DeepSeek-R1-Distill-Qwen-1.5B-eliza-demo-f94707be";
const BASE_MODEL = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B";

async function testModel(model, prompt) {
  try {
    console.log(`🧪 Testing ${model}...`);
    
    const response = await fetch('https://api.together.xyz/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.1,
        stop: ["</s>", "\n\n\n"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      return {
        text: data.choices[0].text || '',
        usage: data.usage
      };
    } else {
      throw new Error('No completion returned');
    }
  } catch (error) {
    console.error(`❌ Error testing ${model}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Fine-tuned Model Testing');
  console.log('═'.repeat(50));
  
  const testPrompt = "Create a Discord plugin for ElizaOS that responds to mentions with personalized greetings.";
  
  console.log(`📝 Test prompt: ${testPrompt}`);
  console.log('─'.repeat(50));

  // Test base model
  console.log('\n📊 Testing Base Model');
  const baseResult = await testModel(BASE_MODEL, testPrompt);
  
  if (baseResult) {
    console.log('✅ Base model response:');
    console.log(baseResult.text.substring(0, 300) + '...');
    console.log(`📊 Tokens used: ${baseResult.usage?.total_tokens || 'unknown'}`);
  }

  // Test fine-tuned model
  console.log('\n🎯 Testing Fine-tuned Model');
  const fineResult = await testModel(FINE_TUNED_MODEL, testPrompt);
  
  if (fineResult) {
    console.log('✅ Fine-tuned model response:');
    console.log(fineResult.text.substring(0, 300) + '...');
    console.log(`📊 Tokens used: ${fineResult.usage?.total_tokens || 'unknown'}`);
  }

  // Quick analysis
  console.log('\n📈 Quick Analysis');
  console.log('─'.repeat(30));
  
  if (baseResult && fineResult) {
    const baseWords = baseResult.text.split(' ').length;
    const fineWords = fineResult.text.split(' ').length;
    
    const baseEliza = (baseResult.text.match(/Plugin|Action|Provider|runtime|ElizaOS/gi) || []).length;
    const fineEliza = (fineResult.text.match(/Plugin|Action|Provider|runtime|ElizaOS/gi) || []).length;
    
    console.log(`📝 Base model: ${baseWords} words, ${baseEliza} ElizaOS terms`);
    console.log(`🎯 Fine-tuned: ${fineWords} words, ${fineEliza} ElizaOS terms`);
    
    if (fineEliza > baseEliza) {
      console.log('🎉 Fine-tuned model shows more ElizaOS knowledge!');
    } else {
      console.log('🤔 Need more training data or longer training');
    }
  }

  console.log('\n✅ Testing complete!');
}

main().catch(console.error);