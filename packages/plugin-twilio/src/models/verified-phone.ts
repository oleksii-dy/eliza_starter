import mongoose from 'mongoose';

const VerifiedPhoneSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    verifiedAt: {
        type: Date,
        default: Date.now
    }
});

// Use mongoose.models to prevent model recompilation error
export const VerifiedPhone = mongoose.models.VerifiedPhone || mongoose.model('VerifiedPhone', VerifiedPhoneSchema);