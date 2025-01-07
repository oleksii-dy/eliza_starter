import { storageService } from '../src/services/storage.js';

async function setupTestUser() {
    const TEST_USER_ID = 'test-user-123';
    const TEST_PHONE = '+33780999517';  // Your number

    await storageService.initialize();
    await storageService.storeVerifiedUser(TEST_USER_ID, TEST_PHONE);
    console.log('Test user stored with phone:', TEST_PHONE);
}

setupTestUser().catch(console.error);