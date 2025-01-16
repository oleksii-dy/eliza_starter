export interface SendMessageOptions {
    originChain: string; // The source chain
    destinationChain: string; // The target chain
    recipient: string; // Recipient address on the target chain
    content: string; // Message content
}
