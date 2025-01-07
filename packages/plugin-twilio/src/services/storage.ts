import { Service, ServiceType } from '@elizaos/core';

interface VerifiedUser {
    phoneNumber: string;
    verifiedAt: Date;
}

export class StorageService implements Service {
    private verifiedUsers: Map<string, VerifiedUser> = new Map();

    get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    async initialize(): Promise<void> {
        // Initialize in-memory storage
    }

    async storeVerifiedUser(userId: string, phoneNumber: string): Promise<void> {
        // Normalize phone number before storing
        phoneNumber = phoneNumber.trim();
        if (!phoneNumber.startsWith('+')) {
            phoneNumber = `+${phoneNumber}`;
        }

        this.verifiedUsers.set(userId, {
            phoneNumber,
            verifiedAt: new Date()
        });
    }

    async getVerifiedUser(userId: string): Promise<VerifiedUser | undefined> {
        return this.verifiedUsers.get(userId);
    }

    async getAllVerifiedUsers(): Promise<Map<string, VerifiedUser>> {
        return this.verifiedUsers;
    }
}

const storageService = new StorageService();
export { storageService };