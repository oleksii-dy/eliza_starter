import { createApiKeyAction } from './dist/index.js';
import { ethers } from 'ethers';

console.log('🔑 Creating Polymarket API Credentials...');
console.log('=' .repeat(60));

// Mock runtime with your wallet configuration
const mockRuntime = {
    getSetting: (key) => {
        const settings = {
            'CLOB_API_URL': 'https://clob.polymarket.com',
            'WALLET_PRIVATE_KEY': process.env.WALLET_PRIVATE_KEY || 
                                 'cb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346',
            'PRIVATE_KEY': process.env.WALLET_PRIVATE_KEY || 
                          'cb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346',
            'POLYMARKET_PRIVATE_KEY': process.env.WALLET_PRIVATE_KEY || 
                                     'cb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346'
        };
        return settings[key];
    },
    setSetting: (key, value, sensitive) => {
        console.log(`📝 Setting ${key}: ${sensitive ? value.substring(0, 8) + '...' : value}`);
        // Store the settings for later use
        process.env[key] = value;
    }
};

// Mock message for action context
const mockMessage = {
    content: {
        text: 'Create API key for Polymarket trading'
    }
};

// Mock state
const mockState = {};

// Mock options
const mockOptions = {};

// Callback to capture the response
let apiCredentials = null;
const mockCallback = (response) => {
    console.log('\n📋 **API KEY CREATION RESPONSE**');
    console.log(response.text);
    console.log();
    
    if (response.data && response.data.success && response.data.apiKey) {
        apiCredentials = response.data.apiKey;
        console.log('✅ **CREDENTIALS EXTRACTED**');
        console.log(`   API Key: ${apiCredentials.id}`);
        console.log(`   Secret: ${apiCredentials.secret ? apiCredentials.secret.substring(0, 12) + '...' : 'Not available'}`);
        console.log(`   Passphrase: ${apiCredentials.passphrase ? apiCredentials.passphrase.substring(0, 12) + '...' : 'Not available'}`);
        console.log();
        
        // Export as environment variables
        console.log('📜 **EXPORT COMMANDS**');
        console.log('Copy and paste these commands to set your environment variables:');
        console.log();
        console.log(`export CLOB_API_URL="https://clob.polymarket.com"`);
        console.log(`export CLOB_API_KEY="${apiCredentials.id}"`);
        console.log(`export CLOB_API_SECRET="${apiCredentials.secret}"`);
        console.log(`export CLOB_API_PASSPHRASE="${apiCredentials.passphrase}"`);
        console.log();
        
        console.log('💾 **SAVE THESE CREDENTIALS**');
        console.log('Store these in a secure location:');
        console.log(`• API Key: ${apiCredentials.id}`);
        console.log(`• Secret: ${apiCredentials.secret}`);
        console.log(`• Passphrase: ${apiCredentials.passphrase}`);
        console.log();
        
        return apiCredentials;
    } else {
        console.log('❌ **FAILED TO EXTRACT CREDENTIALS**');
        console.log('Response data:', JSON.stringify(response.data, null, 2));
    }
};

async function createApiCredentials() {
    try {
        console.log('🚀 **STARTING API KEY CREATION**');
        
        // Get wallet info first
        const privateKey = mockRuntime.getSetting('WALLET_PRIVATE_KEY');
        const formattedKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
        const wallet = new ethers.Wallet(formattedKey);
        
        console.log(`   Wallet Address: ${wallet.address}`);
        console.log(`   Private Key: ${privateKey.substring(0, 10)}...${privateKey.substring(privateKey.length - 4)}`);
        console.log();

        // Validate the action first
        console.log('🔍 **VALIDATING ACTION**');
        const isValid = await createApiKeyAction.validate(mockRuntime, mockMessage);
        
        if (!isValid) {
            console.log('❌ **VALIDATION FAILED**');
            console.log('The createApiKeyAction validation failed. Check your private key configuration.');
            return;
        }
        
        console.log('✅ **VALIDATION PASSED**');
        console.log();

        // Execute the action
        console.log('⚡ **EXECUTING API KEY CREATION**');
        console.log('This will:');
        console.log('1. Sign an EIP-712 message with your wallet');
        console.log('2. Authenticate with Polymarket');
        console.log('3. Create or derive API credentials');
        console.log('4. Return your trading credentials');
        console.log();

        await createApiKeyAction.handler(
            mockRuntime,
            mockMessage,
            mockState,
            mockOptions,
            mockCallback
        );

        if (apiCredentials) {
            console.log('🎉 **SUCCESS!**');
            console.log('Your Polymarket API credentials have been created successfully!');
            console.log();
            console.log('🔄 **NEXT STEPS**:');
            console.log('1. Copy the export commands above');
            console.log('2. Paste them in your terminal');
            console.log('3. Try your order again: "buy 500 shares at $0.001 for [token-id]"');
            console.log('4. The order should now work with proper API authentication!');
        } else {
            console.log('⚠️ **PARTIAL SUCCESS**');
            console.log('API key action completed but credentials were not captured properly.');
            console.log('Check the response above for the actual credentials.');
        }

    } catch (error) {
        console.error('❌ **ERROR CREATING API CREDENTIALS**');
        console.error(`Error: ${error.message}`);
        console.error();
        
        if (error.message.includes('401') || error.message.includes('authentication')) {
            console.error('🔐 **AUTHENTICATION ERROR**:');
            console.error('   • Your wallet signature may be invalid');
            console.error('   • Check your private key is correct');
            console.error('   • Ensure you have a Polygon wallet');
        } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
            console.error('📝 **REQUEST ERROR**:');
            console.error('   • You might already have API keys');
            console.error('   • Try using the getAllApiKeysAction first');
            console.error('   • Or try the deleteApiKey action to clear existing keys');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            console.error('🌐 **NETWORK ERROR**:');
            console.error('   • Check your internet connection');
            console.error('   • Polymarket API might be temporarily unavailable');
            console.error('   • Try again in a few minutes');
        }
        
        console.error();
        console.error('🛠️ **TROUBLESHOOTING**:');
        console.error('1. Verify your private key is correct');
        console.error('2. Ensure you have sufficient MATIC for signing');
        console.error('3. Try creating an account on polymarket.com first');
        console.error('4. Contact Polymarket support if issues persist');
        
        console.error();
        console.error('Full error details:', error);
    }
}

// Run the credential creation
createApiCredentials()
    .then(() => {
        console.log('\n✅ API credential creation process complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 