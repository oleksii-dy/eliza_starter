

export interface StorageClientConfig {
    /**
     * The delegation that authorizes the Agent to upload data to the Storacha network.
     * This is the base64 encoded delegation string.
     * You can install and sign up for a Storacha account using the CLI https://docs.storacha.network/w3cli
     * And then create a delegation for your agent:
     * - https://docs.storacha.network/concepts/ucan/#delegate-across-apps-and-services
     * - https://github.com/storacha/upload-service/blob/main/packages/cli/README.md#storacha-delegation-create-audience-did
     */
    agentDelegation: string;
    /**
     * The private key of the agent that is used to sign the data before uploading to the Storacha network.
     * You can install and sign up for a Storacha account using the CLI https://docs.storacha.network/w3cli
     * And then create a private key for your agent:
     * - https://github.com/storacha/upload-service/blob/main/packages/cli/README.md#storacha-agent-create-private-key
     */
    agentPrivateKey: string;
    /**
     * The gateway to use for fetching data from the network.
     * By default, it uses the Storacha public gateway: https://w3s.link, but you can use any trustless gateway you
     */
    gateway?: string;
    /**
     * The CID of the root index for sharing history.
     * If you want to share history across multiple agents, you can use the same root index CID.
     */
    rootIndexCID?: string; // CID of the root index for sharing history
}
