import {elizaLogger, IAgentRuntime, Service, ServiceType} from "../../../../core/src";
import {
    RpcClient, getClient
} from "./rpcClient.ts";
import {SupportedUDTs, UDTType} from "../../constants.ts";
import {OpenChannelParams, Script} from "./types.ts";
import {env, fromDecimal, udtEq} from "../../utils.ts";

export const ServiceTypeCKBFiber = 'ckb_fiber' as ServiceType; // ServiceType.CKB_FIBER

export enum State {
    Uninitialized,
    Initializing,
    Initialized,
}

export class CKBFiberService extends Service {
    public runtime: IAgentRuntime
    public rpcClient: RpcClient
    public state = State.Uninitialized

    static serviceType = ServiceTypeCKBFiber;

    async initialize(runtime: IAgentRuntime): Promise<void> {
        this.runtime = runtime;
        this.rpcClient = getClient(env(this.runtime, "RPC_URL"));

        this.state = State.Initializing;
        try {
            await this.initClient()
            this.state = State.Initialized;
        } catch (e) {
            elizaLogger.error('Failed to initialize CKBFiberService', e);
            this.state = State.Uninitialized;
        }
    }

    private async initClient() {
        const peerId = env(this.runtime, "DEFAULT_PEER_ID")
        const peerAddress = env(this.runtime, "DEFAULT_PEER_ADDRESS")

        const ckbFundingAmount = Number(env(this.runtime, "CKB_FUNDING_AMOUNT"))
        const udtFundingAmounts = JSON.parse(env(this.runtime, "UDT_FUNDING_AMOUNTS").toLowerCase())

        await this.rpcClient.connectPeer({address: peerAddress, save: true});

        const channels = await this.rpcClient.listChannels({peer_id: peerId});

        if (!channels?.channels) {
            elizaLogger.error('Failed to list channels');
            throw new Error('Failed to list channels');
        }

        const ckbChannels = channels.channels.filter(channel => channel.funding_udt_type_script === undefined)
        const udtChannels = channels.channels.filter(channel => channel.funding_udt_type_script !== undefined)

        // Open channel if not exist, connect to the default peer, so that we can send payment
        if (ckbChannels.length === 0) {
            elizaLogger.log(`Opening channel with peer ${peerId} with ${ckbFundingAmount} CKB`)

            await this.openChannel(peerId, ckbFundingAmount);
            await this.waitChannelReady(peerId);
        } else
            elizaLogger.log(`CKB channel with peer ${peerId} is ready`)

        for (const udtType in udtFundingAmounts) {
            const udtAmount = udtFundingAmounts[udtType];
            if (udtChannels.find(channel => udtEq(channel.funding_udt_type_script, SupportedUDTs[udtType].script))) {
                elizaLogger.log(`${udtType} channel with peer ${peerId} is ready`)
                continue;
            }
            elizaLogger.log(`Opening channel with peer ${peerId} with ${udtAmount} ${udtType}`)

            await this.openChannel(peerId, udtAmount, true, udtType);
            await this.waitChannelReady(peerId);
        }
    }

    public async openChannel(peerId: string, fundingAmount: number,
                             isPublic = true, udtType?: UDTType,
                             options: Partial<OpenChannelParams> = {}) {
        if (udtType) options.funding_udt_type_script = SupportedUDTs[udtType].script;

        const result = await this.rpcClient.openChannel({
            peer_id: peerId,
            funding_amount: fromDecimal(fundingAmount, udtType),
            public: isPublic,
            ...options
        });

        return result.temporary_channel_id;
    }
    public async waitChannelReady(peerId: string, udtType?: UDTType, index = 0, retry = 20, interval = 2000) {
        return new Promise(async (resolve, reject) => {
            const intervalId = setInterval(async () => {
                const channels = await this.rpcClient.listChannels({peer_id: peerId});

                if (!channels?.channels) {
                    elizaLogger.error('Failed to list channels');
                }

                const targetChannels = (udtType ?
                    channels?.channels?.filter(channel => udtEq(channel.funding_udt_type_script, SupportedUDTs[udtType].script)) :
                    channels?.channels?.filter(channel => channel.funding_udt_type_script === undefined)) || [];

                const state = targetChannels[index]?.state
                if (state && state.state_name === 'CHANNEL_READY') {
                    clearInterval(intervalId);
                    resolve(targetChannels[index]);
                } else if (--retry <= 0) {
                    clearInterval(intervalId);
                    elizaLogger.error('Channel not ready');
                    reject(new Error('Channel not ready'));
                }
            }, interval);
        })
    }
}
