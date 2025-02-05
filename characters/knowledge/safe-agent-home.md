# Agentic Safe Home Docs

Project Path: home

Source Tree:

```
home
├── ai-advanced-setups.mdx
├── safe-core.mdx
├── ai-overview.mdx
├── glossary.md
├── what-is-safe.mdx
├── _meta.json
├── ai-agent-actions
│   ├── ai-agent-swaps-with-cow-swap.mdx
│   ├── _meta.json
│   ├── ai-agent-swaps-on-uniswap.mdx
│   └── introduction.mdx
└── ai-agent-quickstarts
    ├── basic-agent-setup.mdx
    ├── human-approval.mdx
    ├── agent-with-spending-limit.mdx
    ├── _meta.json
    ├── introduction.mdx
    └── multi-agent-setup.mdx

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-advanced-setups.mdx`:

```mdx
# Advanced Safe Smart Account Setups for AI agents

Here you find advanced setups for Safe Smart Accounts for AI agents.

* Agent proposes transactions, human executes them
* Multi-agent setup
* Agent manages a certain amount of funds
* Agent is scoped to selected actions




```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/safe-core.mdx`:

```mdx
import { Grid } from '@mui/material'
import { Cards, Card } from 'nextra/components'
import CustomCard from '../../components/CustomCard'
import SafeCoreSDK from '../../assets/svg/ic-sdk.svg'
import SafeSmartAccount from '../../assets/svg/ic-smart-account.svg'
import SafeCoreAPI from '../../assets/svg/ic-api.svg'
import Money from '../../assets/svg/money.svg'
import Verify from '../../assets/svg/check-badge.svg'
import Community from '../../assets/svg/people.svg'

# Safe\{Core\}

[Safe\{Core\}](https://safe.global/core) is an open-source and modular account abstraction stack. It's the essential tooling and infrastructure for integrating the Safe Smart Account into any digital platform, ensuring a tested core with flexible and secure capabilities for innovative applications.


## Why build on Safe\{Core\}?

Safe secures an extensive amount of assets. It has been thoroughly audited and tested since 2018, and it has become the default wallet of choice for many, including DAOs, web3 native companies, and individuals like Vitalik Buterin, who trust Safe with their own assets. In addition, over 200 projects are currently building on top of Safe, and it's expected that this number will only continue to grow.

<Cards>
  <Card icon={<Money />} title="$100B+ secured" href="https://dune.com/safe" target="_blank"/>
  <Card icon={<Verify />} title="Formally verified" href="../advanced/smart-account-audits" />
  <Card icon={<Community />} title="200+ projects" href="https://safe.global/ecosystem" target="_blank" />
</Cards>

With Safe\{Core\}, we are putting a modular stack in the hands of developers to build the next generation of account abstraction wallets and solutions. We have partnered with the best in the business to improve UX capabilities and compatibility with existing ecosystem tools. 

## Our stack

The Safe\{Core\} stack is categorized into three distinct groups:

<Grid
  container
  spacing={2}
  display='flex'
  alignContent='flex-start'
  mt={3}
>
  <Grid item xs={12} md={12}>
    <CustomCard
      title={'Safe{Core} SDK'}
      description={'The SDK offers developers the ability to abstract the complexity that comes with operating a smart contract account. It also provides developer kits to help integrate Safe with external service providers.'}
      url={'../sdk/overview'}
      icon={<SafeCoreSDK />}
      newTab={false}
    />
  </Grid>
  <Grid item xs={12} md={6}>
    <CustomCard
      title={'Safe{Core} API'}
      description={'The Safe infrastructure needed to power interfaces with all Safe account related information. This includes the Safe Transaction Service, Safe Events Service, etc.'}
      url={'../core-api/transaction-service-overview'}
      icon={<SafeCoreAPI />}
      newTab={false}
    />
  </Grid>
  <Grid item xs={12} md={6}>
    <CustomCard
      title={'Safe Smart Account'}
      description={'The modular and extensible smart contract account, designed to serve as the standard core utilized in all smart contract-based wallets and applications.'}
      url={'../advanced/smart-account-overview'}
      icon={<SafeSmartAccount />}
      newTab={false}
      />
  </Grid>
</Grid>

## Getting started

Are you new to Safe and not sure where to get started? We recommend heading over to one of our [tutorials](../resource-hub.mdx?source=Safe+Team&tag=Tutorial).

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-overview.mdx`:

```mdx
import { Callout } from 'nextra/components'
import { Grid } from '@mui/material'
import Lock from '../../assets/svg/lock.svg'
import SafeCore from '../../assets/svg/code.svg'
import CustomCard from '../../components/CustomCard'

# AI agents Powered by Safe Smart Accounts

The intersection of AI and blockchain technology is evolving rapidly. 
This section provides a fast-track guide to getting started with AI agents that leverage Safe Smart Accounts for blockchain interactions.

## Quickstart Guides

Eager to start building? Get started quickly and efficiently here:

<Grid
  container
  spacing={2}
  display='flex'
  alignContent='flex-start'
  mt={3}
>
  <Grid item xs={12} md={6} flex="1">
    <CustomCard
      title={'Quickstart Guides'}
      description={'Equip your AI agent with the most secure, advanced and flexible Smart Accounts, quick and simple.'}
      url={'./ai-agent-quickstarts/introduction'}
      icon={<Lock />}
      newTab={false}
    />
  </Grid>
  <Grid item xs={12} md={6}>
    <CustomCard
      title={'Example Actions'}
      description={'Let your AI agent trade tokens on the most popular exchanges or interact with DeFi protocols.'}
      url={'./ai-agent-actions/introduction'}
      icon={<SafeCore />}
      newTab={false}
    />
  </Grid>
</Grid>

## Why Use Safe Smart Accounts for AI agents?

Safe Smart Accounts offer a secure and modular solution for enabling AI agents to interact with the blockchain. 
While other options include giving an AI agent a private key, using Multi-Party Computation (MPC), relying on custodial services with an API, or manually sending transactions from a user's wallet, Safe Smart Accounts offer distinct advantages.

## Key Benefits of Safe Smart Accounts for AI agents:

1. **Enhanced Security**: Safe Smart Accounts offer robust security features, making them one of the most secure methods for blockchain interactions. 
Signers retain control of private keys, and signers can be replaced if necessary. Additional security measures, such as spending limits, timelocks, and whitelists, can be easily added to safeguard transactions.  
*This is especially crucial since many AI agents can be influenced by specific prompts.*

2. **True Self-Custody**: With Safe Smart Accounts, there's no reliance on third-party intermediaries. 
This reduces costs and eliminates single points of failure, aligning with blockchain's core principle of decentralization.

3. **Modular Design**: Safe Smart Accounts provide unmatched modularity. Native and third-party modules extend functionality, allowing you to customize accounts based on your project's needs.

4. **Flexibility**: Multiple signers can propose transactions within a Safe Smart Account. 
This allows your AI agent to propose transactions while maintaining your control over the account, with the option to withdraw funds or intervene at any point.

5. **Multi-Signer Setup**: Some use cases involve multiple AI agents acting as signers on a single Smart Account. 
These agents must reach consensus before a transaction is signed, adding an extra layer of security and decentralization.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/glossary.md`:

```md
# Glossary

This glossary contains terms and definitions used throughout the Safe documentation.

## Account Abstraction

Account Abstraction is a new paradigm that focuses on improving the user experience when interacting with the blockchain by replacing the use of [externally-owned accounts](#externally-owned-account) with [smart accounts](#smart-account).

Some Account Abstraction features are:
- Elimination of seed phrase reliance
- Ease of multichain interactions
- Account recovery
- [Gasless transactions](#gasless-transaction)
- Transaction batching

See also:
- [Account Abstraction](https://ethereum.org/en/roadmap/account-abstraction) on ethereum.org
- [ERC-4337: Account Abstraction](https://www.erc4337.io) on erc4337.io

## Bundler

Bundlers are nodes that participate in the [ERC-4337](#erc-4337) standard who bundle [user operations](#user-operation) from an alternative mempool and submit them to the blockchain. Bundlers pay for the associated transaction fees in advance, which are later refunded by the user account who proposed the user operation or by a [Paymaster](#paymaster).

See also:
- [Bundling](https://eips.ethereum.org/EIPS/eip-4337#bundling) process on ethereum.org
- [Bundlers](https://erc4337.io/docs/bundlers/introduction) on erc4337.io

## EIP-1271

The [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271) is an [Ethereum Improvement Proposal](https://eips.ethereum.org) that proposes a standard way for any contract to verify whether a signature on behalf of a given contract is valid. This is possible via the implementation of a `isValidSignature(hash, signature)` function on the signing contract, which can be called to validate a signature.

## EIP-712

The [EIP-712](https://eips.ethereum.org/EIPS/eip-712) is an Ethereum Improvement Proposal that proposes a standard for hashing and signing of typed structured data instead of just bytestrings.

## EntryPoint

According to the [ERC-4337](#erc-4337), the EntryPoint is the singleton smart contract that processes bundles of [UserOperation](#user-operation) objects sent by the [Bundlers](#bundler). It verifies and executes them by calling the target smart accounts according to predefined rules.

See also:
- [EntryPoint](https://eips.ethereum.org/EIPS/eip-4337#entrypoint-definition) on ethereum.org
- [Bundlers](https://erc4337.io/docs/bundlers/introduction) on erc4337.io

## ERC-4337

The [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) is an [Ethereum Request for Comments](https://eips.ethereum.org/erc) that introduces a higher-layer pseudo-transaction object called `UserOperation`. Users send `UserOperation` objects into a separate mempool. A special class of actor called [Bundlers](#bundler) package up a set of these objects into a transaction making a `handleOps` call to a special contract, and that transaction then gets included in a block.

See also:
- [ERC-4337 Documentation](https://www.erc4337.io) on erc4337.io

## Externally-Owned Account

An externally-owned account (also known as EOA) is one of the two types of Ethereum accounts. A private key controls it; it has no code, and users can send messages by creating and signing Ethereum transactions.

See also:
- [Ethereum Accounts](https://ethereum.org/en/developers/docs/accounts) on ethereum.org
- [Ethereum Whitepaper](https://ethereum.org/en/whitepaper/#ethereum-accounts) on ethereum.org

## Gasless Transaction

Gasless transactions (also known as meta-transactions) are Ethereum transactions that are executed by a third party called [relayer](#relayer) on behalf of a [smart account](#smart-account) to abstract the use of gas. Users must sign a message (instead of the transaction itself) with information about the transaction they want to execute. A relayer will create the Ethereum transaction, sign and execute it, and pay for the gas costs. The main benefit is that users can interact with the blockchain without holding the native token in their account.

See also:
- [Relay Kit documentation](../sdk/relay-kit) on docs.safe.global

## Multi-signature

A multi-signature account is a [smart account](#smart-account) that allows you to customize ownership and control structures according to your needs. Multiple [externally-owned accounts](#externally-owned-account) can be designated as owners, and you can specify how many of those owners must approve a transaction before it is executed.

**Possible configurations:**

- **0/0 Safe**: An account with no owners, controlled entirely by [Safe Modules](#safe-module). This configuration is typically used for automation or executing conditional functions within a protocol's architecture.
- **1/1 Safe**: An account with a single owner who has full control and ownership. Ideal for setting up a smart account with a single EOA that can take advantage of all smart account functionalities. Warning: If the owner loses access to their private key, there is no way to recover the account. A recovery plan or an emergency mechanism to handle key loss should be set.
- **N/N Safe**: An account with multiple owners, all of whom must approve a transaction before it is executed. This setup is perfect for scenarios where equal ownership and responsibility among all participants are required. Warning: If any owner loses their private key, the Safe may become locked and unable to process transactions. A recovery plan or an emergency mechanism to handle key loss should be set.
- **N/M Safe**: An account with multiple owners, but only a subset of them is required to approve a transaction. This configuration is useful when you want to distribute responsibility while maintaining flexibility in decision-making.

**How does it work?**

- Multi-signature is a function native to Safe smart contract.
- The contract stores the owners' addresses and the threshold needed to execute a transaction in the smart contract storage.
- When the user wants to perform a transaction, they send a payload containing the transaction details and the owners' signatures to the Safe account.
- The safe account iterates through the signatures to verify that the payload has been signed correctly and by the correct owners.

**Benefits:**

- **Enhanced Security**: Reduces the risk associated with single points of failure, protecting your assets even if a key is lost or compromised.
- **Customizable**: Tailor each smart account to fit your specific needs, allowing you to set up configurations that work best for your particular use case.
- **Interoperable**: Flexibly assign a variety of signers as owners, including:
  - Hardware wallets such as [Leger](https://www.ledger.com) or [Trezor](https://trezor.io/).
  - Software wallets such as [Trust](https://trustwallet.com) or [Metamask](https://metamask.io).
  - MPC wallets such as [Fireblocks](https://www.fireblocks.com) or [Zengo](https://zengo.com).
  - Another smart contract account, such as Safe.
  - Wallets generated via Social Logins or Passkeys.
- **Upgradable**: Easily adjust the number of owners and the signing threshold for your account whenever
- **Key Rotation**: Rotate ownership of any accounts at any time, maintaining security while adapting to changes.
- **Shared Control**: Grant shared access and control of your account to multiple individuals, ensuring collaborative management.
- **Auditability**: Maintain a transparent, auditable record of who signed each transaction and when providing clear accountability for all account activities.

## Network

A blockchain network is a collection of interconnected computers that utilize a blockchain protocol for communication. Decentralized networks allow users to send transactions, that are processed on a distributed ledger with a consensus mechanism ensuring the batching, verification, and acceptance of data into blocks. This structure enables the development of applications without the need for a central authority or server.

See also:
- [Networks](https://ethereum.org/en/developers/docs/networks) on ethereum.org

## Owner

A Safe owner is one of the accounts that control a given Safe. Only owners can manage the configuration of a Safe and approve transactions. They can be either [externally-owned accounts](#externally-owned-account) or [smart accounts](#smart-account). The [threshold](#threshold) of a Safe defines how many owners need to approve a Safe transaction to make it executable.

See also:
- [OwnerManager.sol](https://github.com/safe-global/safe-smart-account/blob/main/contracts/base/OwnerManager.sol) on github.com

## Paymaster

Paymasters are smart contracts that allow an account to pay for the gas fees of other users. This feature abstracts away the concept of gas fees by subsidizing them for users, allowing them to pay with ERC-20 tokens, and enables many other use cases.

See also:
- [Paymasters](https://eips.ethereum.org/EIPS/eip-4337#extension-paymasters) on ethereum.org
- [Paymasters](https://www.erc4337.io/docs/paymasters/introduction) on erc4337.io

## Relayer

A relayer is a third-party service acting as an intermediary between users' accounts and [blockchain networks](#network). It executes transactions on behalf of users and covers the associated execution costs, which may or may not be claimed.

See also:
- [What's Relaying?](https://docs.gelato.network/developer-services/relay/what-is-relaying) on docs.gelato.network

## Safe{DAO}

The Safe{DAO} is the [Decentralized Autonomous Organization](https://ethereum.org/dao) (DAO) that aims to foster a vibrant ecosystem of applications and wallets leveraging Safe accounts. This will be achieved through data-backed discussions, grants, and ecosystem investments, as well as providing developer tools and infrastructure.

See also:
- [Safe{DAO} Forum](https://forum.safe.global)
- [Safe{DAO} Governance process](https://forum.safe.global/t/how-to-safedao-governance-process/846) on forum.safe.global
- [Safe{DAO} Proposals](https://snapshot.org/#/safe.eth) on snapshot.org

## Safe{Wallet}

[Safe{Wallet}](https://app.safe.global) is the official user interface to manage Safe accounts.

See also:
- [Getting Started with Safe{Wallet}](https://help.safe.global/en/collections/9801-getting-started) on help.safe.global

## Safe Apps

Safe Apps are web applications that run in the Safe Apps marketplace. They support Safe, use the Safe Apps SDK to interact with it, and aren't owned, controlled, maintained, or audited by Safe.

See also:
- [Safe Apps SDK](https://github.com/safe-global/safe-apps-sdk) on GitHub

## Safe Guard

A Safe Guard is a smart contract that adds restrictions on top of the n-out-of-m scheme that Safe accounts offer. They make checks before and after the execution of a Safe transaction.

See also:
- [Safe Guards documentation](../advanced/smart-account-guards.mdx) on docs.safe.global
- [Zodiac Guards](https://zodiac.wiki/index.php%3Ftitle=Introduction:_Zodiac_Protocol.html#Guards) on zodiac.wiki
- [Get the enabled Safe Guard](../reference-sdk-protocol-kit/safe-guards/getguard.mdx) and [enable a Safe Guard](../reference-sdk-protocol-kit/safe-guards/createenableguardtx.mdx) with the Safe{Core} SDK on docs.safe.global

## Safe Module

A Safe Module is a smart contract that adds functionality to Safe while separating module logic from Safe core contracts.

See also:
- [Safe Modules documentation](../advanced/smart-account-modules.mdx) on docs.safe.global
- [Safe Modules repository](https://github.com/safe-global/safe-modules) on github.com
- [Zodiac Modules](https://zodiac.wiki/index.php%3Ftitle=Introduction:_Zodiac_Protocol.html#Modules) on zodiac.wiki
- [Get the enabled Safe Modules](../reference-sdk-protocol-kit/safe-modules/getmodules.mdx) and [enable a Safe Module](../reference-sdk-protocol-kit/safe-modules/createenablemoduletx.mdx) with the Safe\{Core\} SDK on docs.safe.global

## Smart Account

A smart account (also known as a smart contract account) leverages the programmability of smart contracts to extend its functionality and improve its security in comparison with [externally-owned accounts](#externally-owned-account). Smart accounts are controlled by one or multiple externally-owned accounts or other smart accounts, and all transactions have to be initiated by one of those.

Some common features that smart accounts offer to their users are:
- [Multi-signature](#multi-signature) scheme
- Transaction batching
- Account recovery
- [Gasless transactions](#gasless-transaction)

Safe is one of the most trusted implementations of a smart account.

## Transaction

A transaction is an action initiated by an [externally-owned account](#externally-owned-account) to update the state of the EVM network. Transaction objects must be signed using the sender's private key, require a fee, and be included in a validated block.

A Safe transaction is a transaction sent to a Safe Proxy contract calling the [execTransaction](https://github.com/safe-global/safe-smart-account/blob/main/contracts/Safe.sol#L104) method.

See also:
- [Transactions](https://ethereum.org/developers/docs/transactions) on ethereum.org

## Threshold

The threshold of a Safe account is a crucial configuration element that enables using Safe as a multi-signature smart account. It defines the number of required confirmations from the Safe owners a (Safe) transaction must have to be executable.

See also:
- [Get the threshold](../reference-sdk-protocol-kit/safe-info/getthreshold.mdx) and [change the threshold](../reference-sdk-protocol-kit/safe-info/createchangethresholdtx.mdx) of a Safe with the Safe{Core} SDK on docs.safe.global

## UserOperation

`UserOperation` objects are pseudo-transaction objects introduced by the [ERC-4337](#erc-4337) that users send to the `UserOperation` mempool. They wrap the users' transactions, and are sent to the [EntryPoint](#entrypoint) contract by [Bundlers](#bundler).

See also:
- [UserOperations](https://eips.ethereum.org/EIPS/eip-4337#useroperation) on ethereum.org
- [UserOperation mempool](https://www.erc4337.io/docs/understanding-ERC-4337/user-operation#useroperation-mempool) on erc4337.io

## Wallet

A wallet is an interface or application that gives users control over their blockchain account. Wallets allow users to sign in to applications, read their account balance, send transactions, and verify their identity.

See also:
- [Ethereum Wallets](https://ethereum.org/wallets) on ethereum.org

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/what-is-safe.mdx`:

```mdx
import { Callout } from 'nextra/components'
import { Grid } from '@mui/material'
import SafeWallet from '../../assets/svg/lock.svg'
import SafeCore from '../../assets/svg/code.svg'
import CustomCard from '../../components/CustomCard'

# Welcome

At [Safe](https://safe.global), we pursue a future where everyone has complete control and flexibility over their digital assets. Our vision is to move from merely reading and writing in the digital realm to fully owning our digital identities, financial assets, digital art, and more. 

## Smart accounts

While [externally-owned accounts](./glossary.md#externally-owned-account) (EOAs) have been the cornerstone of digital assets management thus far, they have a lot of limitations and fall short in onboarding mainstream users. Not only are seed phrases cumbersome to secure, but the lack of flexibility and the limited security of EOAs hinder our progress toward actual digital ownership.

Safe is at the forefront of modular [smart account](./glossary.md#smart-account) infrastructure, paving the way for developers to create various applications and wallets. Safe brings digital ownership of accounts to everyone by building universal and open contract standards for the custody of digital assets, data, and identity.

## Our stack

Our goal is to establish smart accounts as the default, and our approach to making this a reality has developed across two primary areas of focus:

<Grid
  container
  spacing={2}
  display='flex'
  alignContent='flex-start'
  mt={3}
>
  <Grid item xs={12} md={6} flex="1">
    <CustomCard
      title={'Safe{Core}'}
      description={'The most secure and robust tooling and infrastructure to integrate Safe Smart Account and leverage account abstraction into your product.'}
      url={'./safe-core'}
      icon={<SafeCore />}
      newTab={false}
    />
  </Grid>
  <Grid item xs={12} md={6}>
    <CustomCard
      title={'Safe{Wallet}'}
      description={'Official interface designed for individuals and industries spanning various sectors, ensuring a seamless and secure digital asset management experience.'}
      url={'https://safe.global/wallet'}
      icon={<SafeWallet />}
    />
  </Grid>
</Grid>

This documentation site is solely focused on [Safe\{Core\}](./safe-core.mdx). Visit our [Help Center](https://help.safe.global) to learn more about Safe\{Wallet\}.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/_meta.json`:

```json
{
  "-- Getting Started": {
    "type": "separator",
    "title": "Getting Started"
  },
  "what-is-safe": "What is Safe?",
  "safe-core": "Safe{Core}",
  "tutorials": {
    "title": "Tutorials",
    "href": "/resource-hub?source=Safe+Team&tag=Tutorial"
  },
  "-- AI": {
    "type": "separator",
    "title": "AI"
  },
  "ai-overview": "Overview",
  "ai-agent-quickstarts": "Quickstart Guides",
  "ai-agent-actions": "Action Guides",
  "-- Help": {
    "type": "separator",
    "title": "Help"
  },
  "glossary": "Glossary",
  "support": {
    "title": "Support",
    "href": "/support"
  }
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-agent-actions/ai-agent-swaps-with-cow-swap.mdx`:

```mdx
import { Steps } from 'nextra/components'

# AI agent swaps on CoW Swap

CoW swap ensures best prices and fastest execution and minimizes MEV.

You can find a working code example to run locally in our [AI agent with Safe Smart Account CoW Swap example repository](https://github.com/5afe/safe-cowswap).

Here is a quick guide to get you up and running:

## Requirements

- A deployed Safe Smart Account
- The AI agent is a signer on the Safe
- This example assumes, that the threshold of the Safe Smart Account is one, so the AI agent can sign autonomously.
If you require more signatures, you have to collect those signatures programmatically of with the [Safe Wallet](https://app.safe.global/).

## Let your AI agent send an intent 

<Steps>
### Setup the Safe Smart Account 

Your Safe Smart Account should be deployed.
Now, initialize an instance with the [Protocol Kit](./../../sdk/protocol-kit.mdx):

```typescript
import Safe from "@safe-global/protocol-kit";

const preExistingSafe = await Safe.init({
  provider: RPC_URL,
  signer: AGENT_PRIVATE_KEY,
  safeAddress: SAFE_ADDRESS,
});
```

### Send swap intent

Now, you can use the CoW Swap SDK to assemble a transaction that you can sign and execute with your Safe Smart Account.
The swap will then be executed.

Please be aware that the CoW Swap's SDK uses Ethers, while Safe's SDK use viem.
You will see some warnings in the logs, but the code works nonetheless.

In this example, we buy COW and pay with WETH.

```typescript
import {
  SwapAdvancedSettings,
  TradeParameters,
  TradingSdk,
  SupportedChainId,
  OrderKind,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import { VoidSigner } from "@ethersproject/abstract-signer";
import { JsonRpcProvider } from "@ethersproject/providers";

const traderParams = {
  chainId: SupportedChainId.SEPOLIA,
  signer: new VoidSigner(
    smartContractWalletAddress: SAFE_ADDRESS,
    new JsonRpcProvider("https://sepolia.gateway.tenderly.co")
  ),
  appCode: "awesome-app",
};

const cowSdk = new TradingSdk(traderParams, { logs: false });

const parameters: TradeParameters = {
  kind: OrderKind.SELL,
  sellToken: WETH_ADDRESS,
  sellTokenDecimals: 18,
  buyToken: COW_ADDRESS,
  buyTokenDecimals: 18,
  amount: INPUT_AMOUNT,
};

const advancedParameters: SwapAdvancedSettings = {
  quoteRequest: {
  // Specify the signing scheme
  signingScheme: SigningScheme.PRESIGN,
  },
};

const orderId = await cowSdk.postSwapOrder(parameters, advancedParameters);

console.log(`Order ID: [${orderId}]`);

const preSignTransaction = await cowSdk.getPreSignTransaction({
  orderId,
  account: smartContractWalletAddress,
});

const customChain = defineChain({
  ...sepolia,
  name: "custom chain",
  transport: http(RPC_URL),
});

const publicClient = createPublicClient({
  chain: customChain,
  transport: http(RPC_URL),
});

const safePreSignTx: MetaTransactionData = {
  to: preSignTransaction.to,
  value: preSignTransaction.value,
  data: preSignTransaction.data,
  operation: OperationType.Call,
};

const safeTx = await preExistingSafe.createTransaction({
  transactions: [safePreSignTx],
  onlyCalls: true,
});

// You might need to collect more signatures here

const txResponse = await preExistingSafe.executeTransaction(safeTx);
console.log(`Sent tx hash: [${txResponse.hash}]`);
console.log("Waiting for the tx to be mined");
await publicClient.waitForTransactionReceipt({
  hash: txResponse.hash as `0x${string}`,
});
```

</Steps>

## Next steps

Now, where your AI agent can execute trades autonomously, you are free to use this power as you like.
You can find more specific information in the [CoW Swap Trading SDK docs](https://github.com/cowprotocol/cow-sdk/tree/main/src/trading#readme).

If you have a technical question about Safe Smart Accounts, feel free to reach out on [Stack Exchange](https://ethereum.stackexchange.com/questions/tagged/safe-core) with the safe-core tag.
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-agent-actions/_meta.json`:

```json
{
  "introduction": "Introduction",
  "ai-agent-swaps-with-cow-swap": "AI agent swaps on CoW Swap",
  "ai-agent-swaps-on-uniswap": "AI agent swaps on Uniswap"
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-agent-actions/ai-agent-swaps-on-uniswap.mdx`:

```mdx
import { Steps } from 'nextra/components'

# AI agent swaps on Uniswap

You can find a working code example to run locally in our [example repository](https://github.com/5afe/safe-uniswap-example).


## Requirements
- A deployed Safe Smart Account
- The AI agent is a signer on the Safe
- This example assumes, that the threshold of the Safe Smart Account is one, so the AI agent can sign autonomously.
If you require more signatures, you have to collect those signatures programmatically of with the [Safe Wallet](https://app.safe.global/).
- This guide assumes the Safe owns WETH.
The example repository shows how to swap ETH to WETH.

## Swap on Uniswap

Here is a quick guide to get you up and running:

<Steps>

### Setup the Safe Smart Account 

Your Safe Smart Account should be deployed.
Now, initialize an instance with the Safe [Protocol Kit](./../../sdk/protocol-kit.mdx):

```typescript
import Safe from "@safe-global/protocol-kit";

const preExistingSafe = await Safe.init({
  provider: RPC_URL,
  signer: AGENT_PRIVATE_KEY,
  safeAddress: SAFE_ADDRESS,
});
```

### Fetch Uniswap pool data

First, you have to fetch the pool data from Uniswap. 
This data provides information about the liquidity at the current and at other prices.
Uniswap has a unique [Pricing Math](https://docs.uniswap.org/contracts/v3/reference/core/libraries/SqrtPriceMath).

```typescript
import {
  Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  http,
  PublicClient,
} from "viem";

// Fetch slot0 data (current price, tick, etc.)
const slot0 = (await publicClient.readContract({
  address: poolAddress,
  abi: POOL_ABI,
  functionName: "slot0",
})) as any;

// Fetch liquidity
const liquidity = (await publicClient.readContract({
  address: poolAddress,
  abi: POOL_ABI,
  functionName: "liquidity",
})) as any;

const sqrtPriceX96 = BigInt(slot0[0]);
const tick = slot0[1];
```

### Execute Swap

Now, you can setup your Safe Smart Account and send a swap transaction to Uniswap:

```typescript
import { 
  FeeAmount,
  Pool,
  Route,
  SwapRouter,
  CurrencyAmount,
  TradeType,
  Percent
} from "@uniswap/v3-sdk";
import { Token, SwapOptions } from "@uniswap/sdk-core";
import JSBI from "jsbi";
import { OperationType, MetaTransactionData } from "@safe-global/types-kit";

// Set up viem clients and accounts
const account = privateKeyToAccount(AGENT_PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  transport: http(RPC_URL!)
});
const walletClient = createWalletClient({
  transport: http(RPC_URL!)
});

const chainId = (await publicClient.getChainId());

// Example Values for WETH/USDC Uniswap Pool on Sepolia:
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_ETH_POOL_ADDRESS = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";
const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // Uniswap V3 Router
const INPUT_AMOUNT = "100000000000"; // Amount of ETH to swap to USDC
const OUTOUT_AMOUNT = "0"; // 0 USDC

// Define token details
const USDC = new Token(chainId, USDC_ADDRESS, 6, "USDC", "USD Coin");
const WETH = new Token(chainId, WETH_ADDRESS, 18, "WETH", "Wrapped Ether");

const callDataApprove = encodeFunctionData({
  abi: WETH_ABI,
  functionName: "approve",
  args: [SWAP_ROUTER_ADDRESS, INPUT_AMOUNT],
});

const safeApproveTx: MetaTransactionData = {
  to: WETH_ADDRESS,
  value: "0",
  data: callDataApprove,
  operation: OperationType.Call,
};

const options: SwapOptions = {
  slippageTolerance: new Percent(50, 10_000), // 50 bips, or 0.50%
  deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
  recipient: SAFE_ADDRESS,
};

const poolInfo = await fetchPoolData(publicClient, USDC_ETH_POOL_ADDRESS);

// Create the pool object
const pool = new Pool(
  WETH,
  USDC,
  FeeAmount.MEDIUM,
  JSBI.BigInt(poolInfo.sqrtPriceX96.toString()),
  JSBI.BigInt(poolInfo.liquidity.toString()),
  poolInfo.tick
);

const swapRoute = new Route([pool], WETH, USDC);

const uncheckedTrade = Trade.createUncheckedTrade({
  tradeType: TradeType.EXACT_INPUT,
  route: swapRoute,
  inputAmount: CurrencyAmount.fromRawAmount(WETH, 
    INPUT_AMOUNT
  ),
  outputAmount: CurrencyAmount.fromRawAmount(USDC, OUTOUT_AMOUNT),
});

const methodParameters = SwapRouter.swapCallParameters(
  [uncheckedTrade],
  options
);

const safeSwapTx: MetaTransactionData = {
  to: SWAP_ROUTER_ADDRESS,
  value: methodParameters.value,
  data: methodParameters.calldata,
  operation: OperationType.Call,
};

const safeTx = await preExistingSafe.createTransaction({
  transactions: [safeApproveTx, safeSwapTx],
  onlyCalls: true,
});

// You might need to collect more signatures here, depending on the threshold

const txResponse = await preExistingSafe.executeTransaction(safeTx);
  await publicClient.waitForTransactionReceipt({
  hash: txResponse.hash as `0x${string}`,
});

console.log(`Deposit and approve transaction: [${txResponse.hash}]`);
```

Now your AI agent executed a swap on Uniswap.

</Steps>

## Next steps

You can find more information about Swaps on Uniswap in their [docs about swaps](https://docs.uniswap.org/contracts/v4/quickstart/swap).

If you have a technical question about Safe Smart Accounts, feel free to reach out on [Stack Exchange](https://ethereum.stackexchange.com/questions/tagged/safe-core) with the safe-core tag.
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-agent-actions/introduction.mdx`:

```mdx
# Introduction

Here you find example actions your AI agent can do.

1. [AI agent swaps on CoW Swap](./ai-agent-swaps-with-cow-swap.mdx): The AI agent sends a swap intent to CoW Swap, which ensures the best swap rates and reduces MEV losses.
2. [AI agent swaps on Uniswap](./ai-agent-swaps-on-uniswap.mdx): An example of how your AI agent can trade tokens on Uniswap.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-agent-quickstarts/basic-agent-setup.mdx`:

```mdx
# Basic setup to equip your AI agent with a Smart Account

Get started with Safe AI integration in just a few steps.

This guide will help you set up a Safe Smart Account with the AI agent as the only signer.
This 1-out-of-1 signer setup is discouraged by Safe, as it is not the most secure.
However, many projects choose this setup for simplicity.

## Installation

First, add the Safe [Protocol Kit](./../../sdk/protocol-kit.mdx) to your project:

```bash
import Safe from '@safe-global/protocol-kit'
```

## Creating a Safe Smart Account for your AI agent

When your AI agent is ready to interact with the blockchain, you can create a Safe Smart Account for it.

```typescript
import Safe from '@safe-global/protocol-kit'

const SIGNER_ADDRESS = // ...
const SIGNER_PRIVATE_KEY = // ...
const RPC_URL = 'https://rpc.ankr.com/eth_sepolia'

const safeClient = await Safe.init({
  provider: RPC_URL,
  signer: SIGNER_PRIVATE_KEY,
  safeOptions: {
    owners: [SIGNER_ADDRESS],
    threshold: 1
  }
})
```

This creates a Safe Smart Account, but the actual smart contract will be deployed when you send the first transaction.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-agent-quickstarts/human-approval.mdx`:

```mdx
import { Steps } from 'nextra/components'

# Human approval for AI agent actions

This page describes a setup, where an autonomous agent proposes transactions, and one or more human signers approve and execute the transaction.

This setup benefits from increased security, as the Smart Account can not be compromised by convincing the agent to execute a malicious transaction.

On the other hand, it can take minutes or hours to collect the necessary approvals, which reduces the agility of this setup.

## Setup the Smart Account

For this setup, we recommend a 2-out-of-3, 3-out-of-5, or 5-out-of-7 threshold.
The important considerations are:

* The AI agent should be one signer
* The threshold should be two more, so at least one human approval is required
* The amount of signers should be higher than the threshold to make sure the Safe Smart Account is functional when one key is lost

<Steps>

Here is an example setup:

### Deploy Safe

You can add the AI agent as a signer in the [Safe Wallet](https://app.safe.global/).

You can also setup the Safe Smart Account programmatically like this using the Safe [Protocol Kit](./../../sdk/protocol-kit.mdx):

```typescript
import Safe from '@safe-global/protocol-kit'

const AGENT_ADDRESS = // ...
const AGENT_PRIVATE_KEY = // ...
const HUMAN_SIGNER_1_ADDRESS = // ...
const HUMAN_SIGNER_2_ADDRESS = // ...
const RPC_URL = 'https://rpc.ankr.com/eth_sepolia'

const newSafe = await Safe.init({
  provider: RPC_URL,
  signer: AGENT_PRIVATE_KEY,
  safeOptions: {
    owners: [AGENT_ADDRESS, HUMAN_SIGNER_1_ADDRESS, HUMAN_SIGNER_2_ADDRESS],
    threshold: 2
  }
})
```

Here, the AI agent creates the Safe Smart Account and adds two human signers for a 2-out-of-3 setup.
The Smart Account will be deployed when the first transaction is executed.

### Assemble and propose a transaction

The AI agent can now propose transactions.
We recommend sending the transactions to the [Safe Transaction Service](./../../../core-api/transaction-service-overview.mdx).
By this, you make sure that the transactions show up in the Safe Wallet interface and can easily be checked, approved and executed by the human signers.

You can use the [API Kit](./../../sdk/api-kit.mdx) to propose transactions to the Safe Transaction Service.

A simple example transaction to the zero address can be proposed like this:

```typescript
import SafeApiKit from '@safe-global/api-kit'

const apiKit = new SafeApiKit({
  chainId: 11155111n
})

const tx = await newSafe.createTransaction({
  transactions: [
    {
      to: '0x0000000000000000000000000000000000000000',
      data: '0x',
      value: '0'
    }
  ]
})

// Every transaction has a Safe (Smart Account) Transaction Hash different than the final transaction hash
const safeTxHash = await newSafe.getTransactionHash(tx)
// The AI agent signs this Safe (Smart Account) Transaction Hash
const signature = await newSafe.signHash(safeTxHash)

// Now the transaction with the signature is sent to the Transaction Service with the Api Kit:
await apiKit.proposeTransaction({
  safeAddress: safeAddress,
  safeTransactionData: tx.data,
  safeTxHash,
  senderSignature: signature.data,
  senderAddress: AGENT_ADDRESS
})
```

## Approve and execute the transactions

The transactions will now show up in the transaction interface of the [Safe Wallet](https://app.safe.global).
The human signers now have to connect their Metamask, and approve and/or execute the transactions with a click.
They can also use the [Mobile App](https://help.safe.global/en/articles/40844-sign-transactions) to sign the transactions.

In the Safe Wallet, the human signers will see the transaction in the queued transaction view:

![ai-agent-approve-transaction-1](../../../assets/ai-agent-approve-transaction-1.png)

And can either add a signature or execute the transaction when enough signatures were collected:

![ai-agent-approve-transaction-2](../../../assets/ai-agent-approve-transaction-2.png)

</Steps>

## Next steps
Now your AI agent is equipped with a Safe Smart Account and you are in full control of the transactions.
We are exited to see what you will build.

If you have a technical question, feel free to reach out on [Stack Exchange](https://ethereum.stackexchange.com/questions/tagged/safe-core) with the safe-core tag.
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-agent-quickstarts/agent-with-spending-limit.mdx`:

```mdx
import { Steps } from 'nextra/components'

# AI agent with a spending limit for a treasury

This setup is used by DAOs or other organizations that want to utilize AI agents to manage their funds.

This setup uses Safe's [allowance module](https://github.com/safe-global/safe-modules/blob/main/modules/allowances/contracts/AllowanceModule.sol).
After activating it for a Safe Smart Account, you can set an allowance per token for a spender (the delegator).
It can be a one-time allowance, or an allowance that resets after a certain time interval (for example, 100 USDC every day).

You can find an easy to run example for the allowance module in our [example repository](https://github.com/5afe/allowance-module-scripts).

You can setup an allowance (spending limit) on a Safe Smart Account with the [Safe Wallet](https://app.safe.global) interface following [this guide](https://help.safe.global/en/articles/40842-set-up-and-use-spending-limits).
Then, your agent can spend the allowance, as described in the last step.

Here are the important code snippets to get you up and running:

## Pre-requisites

- A deployed Safe Smart Account
- The Smart Account should hold an amount of the ERC20 token for which the allowance will be given

## Set and use a spending limit for the AI agent

<Steps>

### Enable the Allowance module on your Safe

When you set a spending limit from Safe Wallet, the allowance module will be enabled automatically.
You will use the Safe [Protocol Kit](./../../sdk/protocol-kit.mdx).
Here is a code example to enable it programmatically:

```typescript
import Safe from '@safe-global/protocol-kit'
import { getAllowanceModuleDeployment } from '@safe-global/safe-modules-deployments'

const preExistingSafe = await Safe.init({
  provider: RPC_URL,
  signer: OWNER_1_PRIVATE_KEY,
  safeAddress: safeAddress
})

// Add Module
const allowanceModule = getAllowanceModuleDeployment({ network: '11155111' })!
const safeTransaction = await preExistingSafe.createEnableModuleTx(
  allowanceModule.networkAddresses['11155111']
)
const txResponse = await preExistingSafe.executeTransaction(safeTransaction)
console.log(txResponse)
```

### Set spending limit for AI agent

Now you can set a spending limit to your AI agent:

```typescript
import { getAllowanceModuleDeployment } from '@safe-global/safe-modules-deployments'
import Safe from '@safe-global/protocol-kit'
import { getAllowanceModuleDeployment } from '@safe-global/safe-modules-deployments'
import { OperationType, MetaTransactionData } from '@safe-global/types-kit'

const ERC20_TOKEN_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
const preExistingSafe = await Safe.init({
  provider: RPC_URL,
  signer: OWNER_1_PRIVATE_KEY,
  safeAddress: safeAddress
})

const allowanceModule = getAllowanceModuleDeployment({ network: '11155111' })!

const allowanceModuleAddress = allowanceModule.networkAddresses['11155111']

const callData1 = encodeFunctionData({
  abi: allowanceModule.abi,
  functionName: 'addDelegate',
  args: [AGENT_ADDRESS]
})
// agent can spend 1 USDC per day:
const callData2 = encodeFunctionData({
  abi: allowanceModule.abi,
  functionName: 'setAllowance',
  args: [
    AGENT_ADDRESS, // delegate
    ERC20_TOKEN_ADDRESS, // token
    1_000_000, // allowance amount (1 USDC)
    1_440, // reset time in minutes (1440 mins = 1 day)
    0 // reset base (fine to set zero)
  ]
})

const safeTransactionData1: MetaTransactionData = {
  to: allowanceModuleAddress,
  value: '0',
  data: callData1,
  operation: OperationType.Call
}

const safeTransactionData2: MetaTransactionData = {
  to: allowanceModuleAddress,
  value: '0',
  data: callData2,
  operation: OperationType.Call
}

const safeTransaction = await preExistingSafe.createTransaction({
  transactions: [safeTransactionData1, safeTransactionData2],
  onlyCalls: true
})

const txResponse = await preExistingSafe.executeTransaction(safeTransaction)
console.log(txResponse)
```

### Let the AI agent use the spending limit

Now your agent has a spending limit, either set programmatically or from Safe Wallet.

Here is how the agent can spend it:

```typescript
import {
  createPublicClient,
  http,
  encodeFunctionData,
  zeroAddress,
  createWalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
const ERC20_TOKEN_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

const allowanceModule = getAllowanceModuleDeployment({ network: '11155111' })!

const allowanceModuleAddress = allowanceModule.networkAddresses[
  '11155111'
] as `0x${string}`

const publicClient = createPublicClient({ transport: http(RPC_URL!) })

// Read allowance module to get current nonce
const allowance = await publicClient.readContract({
  address: allowanceModuleAddress,
  abi: allowanceModule.abi,
  functionName: 'getTokenAllowance',
  args: [safeAddress, AGENT_ADDRESS, ERC20_TOKEN_ADDRESS]
})

const amount = 1 // You might want to adapt the amount

// generate hash
const hash = await publicClient.readContract({
  address: allowanceModuleAddress,
  abi: allowanceModule.abi,
  functionName: 'generateTransferHash',
  args: [
    safeAddress,
    ERC20_TOKEN_ADDRESS,
    AGENT_ADDRESS,
    amount,
    zeroAddress,
    0,
    allowance[4] // nonce
  ]
})

const agentAccount = privateKeyToAccount(
  AGENT_PRIVATE_KEY as `0x${string}`
)
const signature = await agentAccount.sign({
  hash: hash as unknown as `0x${string}`
})

const { request } = await publicClient.simulateContract({
  address: allowanceModuleAddress,
  abi: allowanceModule.abi,
  functionName: 'executeAllowanceTransfer',
  args: [
    safeAddress,
    ERC20_TOKEN_ADDRESS,
    AGENT_ADDRESS,
    amount,
    zeroAddress,
    0,
    AGENT_ADDRESS,
    signature
  ],
  account: agentAccount
})

const walletClient = createWalletClient({ transport: http(RPC_URL!) })

const tx = await walletClient.writeContract(request)
console.log(tx)
```

In this example, your agent will get a daily spending limit of 10 USDC.

</Steps>

## Next steps

You can find more info in the example repository or in the documentation about the allowance module.

If you have a technical question, feel free to reach out on [Stack Exchange](https://ethereum.stackexchange.com/questions/tagged/safe-core) with the safe-core tag.
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-agent-quickstarts/_meta.json`:

```json
{
  "introduction": "Introduction",
  "basic-agent-setup": "Setup your Agent with a Safe account",
  "human-approval": "Human approval for agent action",
  "multi-agent-setup": "Multiple Agent setup",
  "agent-with-spending-limit": "Agent with spending limit"
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-agent-quickstarts/introduction.mdx`:

```mdx
# Quickstarts to set up your AI agent with Safe Smart Account

In these pages you will find quickstart guides to set your AI agent up and running with Safe Smart Accounts.

We describe these different setups:

1. [Basic Agent Setup](./basic-agent-setup.mdx): The simplest and fastest setup for your agent.
2. [Human Approval for agent actions](./human-approval.mdx): The AI agent proposes transactions, human signers approve and execute the transaction. Highest security, but not the fastest.
3. [Multi Agent Setup](./multi-agent-setup.mdx): Multiple Agents are signers of a Smart Account. They have to approve and execute each others transactions.
4. [Agent with a spending limit](./agent-with-spending-limit.mdx): An AI agent gets a spending limit on your treasury or DAO funds. This advanced setup allows fast transactions with a good amount of security.
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/home/ai-agent-quickstarts/multi-agent-setup.mdx`:

```mdx
import { Steps } from 'nextra/components'

# Multi-Agent Setup

In this guide, you'll learn how to set up and manage a Safe Smart Account with multiple agents.
This setup ensures that every transaction proposed by one agent is approved by at least one other agent.
To maintain full functionality, we recommend including human signers in addition to the AI agents. 

Below, we demonstrate a 2-out-of-4 setup as an example.

# Two Agents Propose, Check, and Execute Transactions

<Steps>

### Setup Safe Smart Account with agent one

You will use the Safe [Protocol Kit](./../../sdk/protocol-kit.mdx).

```typescript
import Safe from '@safe-global/protocol-kit'

const AGENT_1_ADDRESS = // ...
const AGENT_1_PRIVATE_KEY = // ...
const AGENT_2_ADDRESS = // ...
const HUMAN_SIGNER_1_ADDRESS = // ...
const HUMAN_SIGNER_2_ADDRESS = // ...
const RPC_URL = 'https://rpc.ankr.com/eth_sepolia'

const newSafe = await Safe.init({
  provider: RPC_URL,
  signer: AGENT_1_PRIVATE_KEY,
  safeOptions: {
    owners: [AGENT_1_ADDRESS, AGENT_2_ADDRESS, HUMAN_SIGNER_1_ADDRESS, HUMAN_SIGNER_2_ADDRESS],
    threshold: 2
  }
})
```
The Smart Account is now created with a fixed address. If the account has not been deployed yet, it will automatically deploy when the first transaction is executed.

### Propose a Transaction with Agent One

Agent One can now propose transactions. We recommend sending these transactions to the [Safe Transaction Service](./../../../core-api/transaction-service-overview.mdx). Using this service provides several benefits:
- It allows Agent Two to easily receive, sign, and execute the transaction.
- Transactions appear in the Safe Wallet interface, where human signers can review, approve, and execute them.

You can use the [API Kit](./../../sdk/api-kit.mdx) to propose transactions to the Safe Transaction Service.

Here's an example of how Agent One can propose a simple transaction to the zero address:


```typescript
import SafeApiKit from '@safe-global/api-kit'

const apiKit = new SafeApiKit({
  chainId: 11155111n
})

const tx = await newSafe.createTransaction({
  transactions: [
    {
      to: '0x0000000000000000000000000000000000000000',
      data: '0x',
      value: '0'
    }
  ]
})

// Every transaction has a Safe (Smart Account) Transaction Hash different than the final transaction hash
const safeTxHash = await newSafe.getTransactionHash(tx)
// The AI agent signs this Safe (Smart Account) Transaction Hash
const signature = await newSafe.signHash(safeTxHash)

// Now the transaction with the signature is sent to the Transaction Service with the Api Kit:
await apiKit.proposeTransaction({
  safeAddress: safeAddress,
  safeTransactionData: tx.data,
  safeTxHash,
  senderSignature: signature.data,
  senderAddress: AGENT_ADDRESS
})
```

### Receive and sign transaction with agent two

In the next step, the second AI agent needs to receive the transaction and, after performing any necessary checks, sign and execute it.

The second AI agent will run on its own machine, so you would have to initialize the Safe instance with the Smart Account's address.


```typescript
const SAFE_ADDRESS = '0x...' // The address of the Smart Account from step one

// Initialize the Safe object with the same address, but a different signer
const existingSafe = await Safe.init({
  provider: RPC_URL,
  signer: AGENT_2_PRIVATE_KEY,
  safeAddress: SAFE_ADDRESS
})

// Get pending transactions that need a signature
const pendingTransactions = await apiKit.getPendingTransactions(SAFE_ADDRESS)
// We assume there is only one pending transaction
const transaction = pendingTransactions.results[0]

// Here, your AI agent could check this transaction.

// As only one more signater is required, AI agent two can execute the transaction:
existingSafe.executeTransaction(transaction)
```
</Steps>


## Next steps
Your AI agents can make autonomous decisions, and the human signers can do so, too.
We are exited to see what you will build.

If you have a technical question, feel free to reach out on [Stack Exchange](https://ethereum.stackexchange.com/questions/tagged/safe-core) with the safe-core tag.
```


