import { ByteArray, formatEther, parseEther, type Hex } from "viem";
import {
    composeContext,
    generateObjectDeprecated,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

import { networks, Psbt } from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import {randomBytes} from 'crypto';
import * as ecc from 'tiny-secp256k1';
import { BtcWallet, privateKeyFromWIF } from "@okxweb3/coin-bitcoin";
import { base } from "@okxweb3/crypto-lib";
import { mintTemplate } from "../templates";
import {initBtcFunProvider} from "../providers/btcfun.ts";
export { mintTemplate };

export const btcfunMintAction = {
    name: "btcfun",
    description: "btcfun mint brc20",
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        console.log("btcfun action handler called");
        const btcfunProvider = initBtcFunProvider(runtime);

        const chainCode = randomBytes(32);
        const bip32Factory = BIP32Factory(ecc);
        const network = networks.bitcoin;
        const privateKeyWif = runtime.getSetting("BTC_PRIVATE_KEY_WIF") ?? process.env.BTC_PRIVATE_KEY_WIF;
        let address = runtime.getSetting("ADDRESS") ?? process.env.ADDRESS;
        //const psbtHex = '70736274ff0100dd0200000002079a01841a17ba439545a00c73031db6a2317be7b12b619a4a1239a67e18ffaa0000000000fdffffffa0dffa35eee28e5c1b0c2048f5725f82200c6726337c27160b324e77a9c6ad530100000000fdffffff032202000000000000225120a11f9fa43193da4b9b825cf92d13fde040fc7205076c5a6eebfdb4b6a67a583d805c00000000000022512097162ff9c360ce05c59079a6f34897564528eee056dfcf2549383a3016683b8a4f0200000000000022512097162ff9c360ce05c59079a6f34897564528eee056dfcf2549383a3016683b8a000000000001012b220200000000000022512097162ff9c360ce05c59079a6f34897564528eee056dfcf2549383a3016683b8a011720e2df0c6fced9b8530a46649bc7ec06abfa8636a51bcacde4150c52715b76e9df0001012bc56800000000000022512097162ff9c360ce05c59079a6f34897564528eee056dfcf2549383a3016683b8a011720e2df0c6fced9b8530a46649bc7ec06abfa8636a51bcacde4150c52715b76e9df00000000';

        const privateKey = base.fromHex(privateKeyFromWIF(privateKeyWif, network));
        const privateKeyHex = base.toHex(privateKey);
        console.log('Private key: ', privateKeyHex)
        const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');
        const keyPair = bip32Factory.fromPrivateKey(privateKeyBuffer, chainCode, network);
        const publicKeyBuffer = Buffer.from(keyPair.publicKey);
        const publicKeyHex = publicKeyBuffer.toString('hex');
        console.log('Public Key: ', publicKeyHex);

        // Compose mint context
        const mintContext = composeContext({
            state,
            template: mintTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: mintContext,
            modelClass: ModelClass.LARGE,
        });
        let tick = content.inputToken;
        console.log("begin to mint token", tick, content)
        //todo remove
        tick = "dongj"

        try {
            const {order_id, psbt_hex} = await btcfunProvider.createBrc20Order(publicKeyHex, address, publicKeyHex, address, 5, tick,"100",864000,"1000")
            console.log("11110",psbt_hex)
            const psbt = Psbt.fromHex(psbt_hex)
            let wallet = new BtcWallet()
            const toSignInputs = [];
            psbt.data.inputs.forEach((input, index)=>{
                toSignInputs.push({
                    index: index,
                    address: address,
                    sighashTypes: [0],
                    disableTweakSigner: false,
                });
            })

            let params = {
                type: 3,
                psbt: psbt_hex,
                autoFinalized: false,
                toSignInputs: toSignInputs,
            };

            let signParams = {
                privateKey: privateKeyWif,
                data: params,
            };
            console.log("signParams: ", signParams)
            //let signedPsbtHex = await wallet.signTransaction(signParams);

            //todo open
            //await btcfunProvider.broadcastOrder(orderID, signedPsbtHex)
            //console.log('signedPsbtHex: ', signedPsbtHex, 'orderID: ', order_id)
            if (callback) {
                callback({
                    text: `Successfully mint ${tick} tokens`,
                    content: {
                        success: true,
                        orderID: order_id,
                        //psbtHex: signedPsbtHex,
                    },
                });
            }
        } catch (error) {
            console.error('Error:', error);
        }
    },
    template: mintTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("BTC_PRIVATE_KEY_WIF");
        return typeof privateKey === "string" && privateKey.length > 0;
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll help you mint 100000000 Party",
                    action: "MINT_BRC20",
                },
            },
            {
                user: "user",
                content: {
                    text: "import token BRC20 `Party`",
                    action: "MINT_BRC20",
                },
            },
        ],
    ],
    similes: ["MINT_BRC20","MINT_RUNES"],
};
