import {
    type IAgentRuntime,
    type Provider,
    type Memory,
    type State,
} from "@elizaos/core";
import {
    authenticatedLndGrpc,
    AuthenticatedLnd,
    GetIdentityResult,
    GetChannelsResult,
    getIdentity,
    getChannels,
    CreateInvoiceResult,
    createInvoice,
    pay,
    PayResult,
} from "astra-lightning";
import { CreateInvoiceArgs, PayArgs } from "../types";
export class LightningProvider {
    lndClient: AuthenticatedLnd;
    constructor(cert: string, macaroon: string, socket: string) {
        const { lnd } = authenticatedLndGrpc({
            cert: cert,
            macaroon: macaroon,
            socket: socket,
        });
        this.lndClient = lnd;
    }
    async getLndIdentity(): Promise<GetIdentityResult> {
        try {
            return await getIdentity({ lnd: this.lndClient });
        } catch (error) {
            throw new Error(`Failed to get LND identity: ${error.message}`);
        }
    }
    async getLndChannel(): Promise<GetChannelsResult> {
        const ret = await getChannels({ lnd: this.lndClient });
        return ret;
    }
    async createInvoice(
        createInvoiceArgs: CreateInvoiceArgs
    ): Promise<CreateInvoiceResult> {
        const ret = await createInvoice({
            lnd: this.lndClient,
            ...createInvoiceArgs,
        });
        return ret;
    }
    async payInvoice(payInvoiceArgs: PayArgs): Promise<PayResult> {
        const ret = await pay({
            lnd: this.lndClient,
            ...payInvoiceArgs,
        });
        return ret;
    }
}

export const initLightningProvider = async (runtime: IAgentRuntime) => {
    const cert = runtime.getSetting("LND_TLS_CERT");
    const macaroon = runtime.getSetting("LND_MACAROON");
    const socket = runtime.getSetting("LND_SOCKET");
    return new LightningProvider(cert, macaroon, socket);
};

export const lndProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        state?: State
    ): Promise<string | null> {
        try {
            const lightningProvider = await initLightningProvider(runtime);
            const { public_key: nodePubkey } =
                await lightningProvider.getLndIdentity();
            const { channels } = await lightningProvider.getLndChannel();
            const agentName = state?.agentName || "The agent";
            return `${agentName}'s Lightning Node publickey : ${nodePubkey}\n,Channel count : ${channels.length}`;
        } catch (error) {
            console.error("Error in Lightning provider:", error);
            return null;
        }
    },
};
