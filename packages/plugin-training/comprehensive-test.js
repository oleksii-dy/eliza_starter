#!/usr/bin/env node

/**
 * Comprehensive test of both base and fine-tuned models
 */

const TOGETHER_API_KEY = "f8b2d1d28bbf45711a1a55b156fc3d53826d9422ad0af59dbcf038cd12d17fdf";
const FINE_TUNED_MODEL = "moonmakesmagic/DeepSeek-R1-Distill-Qwen-1.5B-eliza-demo-f94707be";
const BASE_MODEL = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B";

async function testModel(model, prompt) {
  try {
    console.log(`🧪 Testing: ${model}`);
    
    const response = await fetch('https://api.together.xyz/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        max_tokens: 100,
        temperature: 0.1,
        stop: ["</s>", "\n\n"]
      })
    });

    console.log(`📡 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      return {
        text: data.choices[0].text || '',
        usage: data.usage
      };
    } else {
      console.error('❌ No response from model');
      return null;
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

async function checkModelAvailability() {
  try {
    console.log('🔍 Checking model availability...');
    
    const response = await fetch('https://api.together.xyz/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const models = data.data || [];
      
      const fineTunedExists = models.some(m => m.id === FINE_TUNED_MODEL);
      const baseExists = models.some(m => m.id === BASE_MODEL);
      
      console.log(`✅ Base model available: ${baseExists}`);
      console.log(`🎯 Fine-tuned model available: ${fineTunedExists}`);
      
      if (fineTunedExists) {
        const fineModel = models.find(m => m.id === FINE_TUNED_MODEL);
        console.log(`📊 Fine-tuned model details:`, {
          id: fineModel.id,
          created: fineModel.created,
          owned_by: fineModel.owned_by
        });
      }
      
      return { fineTunedExists, baseExists };
    } else {
      console.error('❌ Cannot check model availability');
      return { fineTunedExists: false, baseExists: false };
    }
  } catch (error) {
    console.error('❌ Error checking models:', error.message);
    return { fineTunedExists: false, baseExists: false };
  }
}

async function main() {
  console.log('🚀 Comprehensive Model Testing');
  console.log('═'.repeat(50));
  
  // Check model availability first
  const availability = await checkModelAvailability();
  console.log('─'.repeat(50));
  
  const testPrompt = "What is 2+2?";
  console.log(`📝 Test prompt: "${testPrompt}"`);
  console.log('─'.repeat(50));

  // Test base model first (should always work)
  if (availability.baseExists) {
    console.log('\n📊 Testing Base Model');
    const baseResult = await testModel(BASE_MODEL, testPrompt);
    
    if (baseResult) {
      console.log('✅ Base model response:');
      console.log('─'.repeat(30));
      console.log(baseResult.text);
      console.log('─'.repeat(30));
      console.log(`📊 Tokens used: ${baseResult.usage?.total_tokens || 'unknown'}`);
    }
  } else {
    console.log('⚠️ Base model not available');
  }

  // Test fine-tuned model
  if (availability.fineTunedExists) {
    console.log('\n🎯 Testing Fine-tuned Model');
    const fineResult = await testModel(FINE_TUNED_MODEL, testPrompt);
    
    if (fineResult) {
      console.log('✅ Fine-tuned model response:');
      console.log('─'.repeat(30));
      console.log(fineResult.text);
      console.log('─'.repeat(30));
      console.log(`📊 Tokens used: ${fineResult.usage?.total_tokens || 'unknown'}`);
      console.log('\n🎉 Fine-tuned model is working!');
    } else {
      console.log('⚠️ Fine-tuned model may still be deploying or temporarily unavailable');
    }
  } else {
    console.log('⚠️ Fine-tuned model not found in available models');
    console.log('💡 This might mean:');
    console.log('   - Model is still deploying after training');
    console.log('   - Model name has changed');
    console.log('   - Model requires special access');
  }

  console.log('\n✅ Testing complete!');
}

main().catch(console.error);