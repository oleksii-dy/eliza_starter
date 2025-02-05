Project Path: sdk

Source Tree:

```
sdk
├── relay-kit.mdx
├── onramp
│   ├── monerium.mdx
│   ├── stripe.mdx
│   └── _meta.json
├── overview.mdx
├── react-hooks.mdx
├── relay-kit
│   ├── reference
│   │   ├── safe-4337-pack.mdx
│   │   └── _meta.json
│   ├── guides
│   │   ├── 4337-safe-sdk.mdx
│   │   ├── migrate-to-v3.md
│   │   ├── migrate-to-v2.md
│   │   ├── gelato-relay.mdx
│   │   └── _meta.json
│   └── _meta.json
├── protocol-kit
│   ├── guides
│   │   ├── migrate-to-v5.md
│   │   ├── execute-transactions.mdx
│   │   ├── migrate-to-v1.md
│   │   ├── multichain-safe-deployment.mdx
│   │   ├── safe-deployment.mdx
│   │   ├── migrate-to-v3.md
│   │   ├── migrate-to-v2.md
│   │   ├── signatures
│   │   │   ├── messages.mdx
│   │   │   ├── transactions.mdx
│   │   │   └── _meta.json
│   │   ├── migrate-to-v4.md
│   │   ├── signatures.md
│   │   └── _meta.json
│   └── _meta.json
├── api-kit.mdx
├── starter-kit.mdx
├── react-hooks
│   ├── guides
│   │   ├── send-transactions.mdx
│   │   └── _meta.json
│   └── _meta.json
├── starter-kit
│   ├── guides
│   │   ├── send-transactions.mdx
│   │   ├── _meta.json
│   │   └── send-user-operations.mdx
│   └── _meta.json
├── onramp.mdx
├── signers.mdx
├── onchain-tracking.mdx
├── _meta.json
├── api-kit
│   ├── guides
│   │   ├── migrate-to-v1.md
│   │   ├── propose-and-confirm-transactions.mdx
│   │   ├── migrate-to-v2.md
│   │   └── _meta.json
│   └── _meta.json
├── signers
│   ├── web3auth.mdx
│   ├── passkeys.mdx
│   ├── privy.mdx
│   ├── magic.mdx
│   ├── _meta.json
│   └── dynamic.mdx
└── protocol-kit.mdx

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/relay-kit.mdx`:

```mdx
import { Grid } from '@mui/material'
import CustomCard from '../../components/CustomCard'

# Relay Kit

The Relay Kit enables transaction relaying with Safe, and allows users to pay for the transaction fees from their Safe account using the blockchain native token, ERC-20 tokens, or to get their transactions sponsored.

<Grid item mt={3}>
  <CustomCard
    title={'@safe-global/relay-kit'}
    description={''}
    url={'https://www.npmjs.com/package/@safe-global/relay-kit'}
  />
</Grid>

The following guides show how to use the Relay Kit and integrate it into your project by using one of the packs:
- [Integrate ERC-4337 Safe accounts](./relay-kit/guides/4337-safe-sdk.mdx)
- [Integrate Gelato Relay](./relay-kit/guides/gelato-relay.mdx)

## Resources

- [Relay Kit on GitHub](https://github.com/safe-global/safe-core-sdk/tree/main/packages/relay-kit)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/onramp/monerium.mdx`:

```mdx
import { Steps } from 'nextra/components'
import Image from 'next/image'
import MoneriumAddMoney from '../../../assets/monerium-sandbox-add-money.png'
import RemovedContentCallout from '../../../components/RemovedContentCallout'

<RemovedContentCallout>
  The Onramp Kit in the Safe\{Core\} SDK is no longer supported; with that, neither is the `MoneriumPack`. We recommend integrating Monerium directly into your application by following this guide.
</RemovedContentCallout>

# Onramp with Monerium

[Monerium](https://monerium.com) provides EURe, a regulated stablecoin on Ethereum, Polygon, and Gnosis. 
This guide demonstrates how to use the [Monerium SDK](https://monerium.github.io/js-sdk/) and the Safe\{Core\} SDK together to enable direct transfers from Safe accounts to an IBAN via the SEPA network and vice versa.

## Prerequisites

1. [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
2. [Monerium account and application](https://monerium.dev/docs/getting-started/create-app)
3. A web application using your favorite CLI and language. For example [React with NextJS](https://nextjs.org/docs), [Vue with Nuxt](https://nuxt.com/) or [Svelte with SvelteKit](https://kit.svelte.dev/).
4. A [deployed Safe](../protocol-kit.mdx) for your users.

## Overview

The main steps of this tutorial are:

1. Authentication with Monerium and Safe: This requires signing a message with the Safe and using the Monerium Authentication flow.
2. Sending an order from the Safe to an IBAN involves sending an order to Monerium and signing the order with the Safe.

## Step 1: Authenticate with Monerium and Safe

<Steps>

### Sign the link message with the Safe

First, your users have to sign a message with the Safe to prove ownership of the Safe. 
Monerium will scan the signed messages in the Safe to verify ownership.

Use the Safe\{Core\} SDK, as shown below, to sign a message with multiple owners (for example, a two-out-of-three Safe). 
This example programmatically signs a message with two owners. 
In practice, one owner proposes the transaction, and another owner confirms it using the [Safe\{Wallet\}](https://app.safe.global/) UI.

```typescript
import Safe, {
  getSignMessageLibContract,
  hashSafeMessage
} from '@safe-global/protocol-kit'
import { constants } from '@monerium/sdk'

// Initialize the Safe\{Core\} SDK and link it to an existing Safe
const protocolKit = await Safe.init({
  provider: RPC_URL, // set a valid RPC URL
  signer: OWNER_1_PRIVATE_KEY, // set the private key of the first Safe owner
  safeAddress
})

// Create a signed message by creating a transaction to the signMessage contract
const signMessageContract = await getSignMessageLibContract({
  safeProvider: protocolKit.getSafeProvider(),
  safeVersion: await protocolKit.getContractVersion()
})

// Let the contract encode the message's hash to get the transaction data
const txData = signMessageContract.encode('signMessage', [
  hashSafeMessage(constants.LINK_MESSAGE) // 'I hereby declare that I am the address owner.'
])

// Assemble a transaction object
const safeTransactionData = {
  to: await signMessageContract.getAddress(),
  value: '0',
  data: txData,
  operation: OperationType.DelegateCall
}

// Create a transaction
const signMessageTx = await protocolKit.createTransaction({
  transactions: [safeTransactionData]
})

// Sign the transaction with the first owner
const signedTx = await protocolKit.signTransaction(signMessageTx)

// Connect the protocol kit to the second owner
const protocolKitOfOwner2 = await protocolKit.connect({
  signer: OWNER_2_PRIVATE_KEY
})

// Sign and execute the transaction as the second owner
const transactionResult = await protocolKitOfOwner2.executeTransaction(
  signedTx
)

// Check the transaction hash to see if the transaction settled
console.log('transactionResult', transactionResult)
```

The `protocolKit` is an instance of the [`Safe`](../../reference-sdk-protocol-kit/initialization/init.mdx) class. 
For more information on instantiating the Protocol Kit, refer to the [Protocol Kit Quickstart section](../protocol-kit.mdx).

### Initialize the Monerium client and authenticate the users

After the message is signed and the transaction is executed, the users can authenticate with Monerium.

```typescript
import { MoneriumClient } from '@monerium/sdk'

// Initialize the Monerium Client
const monerium = new MoneriumClient({
  clientId: 'a1b2c3-x7y8y9', // Get your client ID from Monerium
  environment: 'sandbox' // Use the appropriate Monerium environment ('sandbox' | 'production')
})

// Start the Monerium authentication flow and send the users to Monerium
await monerium.authorize({
  address: safeAddress, // The address of the users' Safe
  signature: '0x', // '0x' for Safe authentication lets Monerium look for the signature on-chain
  redirectUrl: 'http://localhost:3000/return', // URL where Monerium will redirect the users after authenticating
  chainId: 11155111 // Chain ID of Sepolia in this example
})
```

Calling `authorize` will redirect the users to the Monerium login page. 

### Authenticate with Monerium

At Monerium, the users need to log in or create an account. 
Once logged in, Monerium will verify the ownership of the Safe by checking the signed message. 
After successful verification, Monerium will create an IBAN and link it to the Safe. 
The users will then be redirected to the specified `redirectUrl` with the new session id as a GET parameter.

### Finish the authentication

Once the users land back on your page, finish the authentication process.

```typescript
// Returns true, if the users are authorized
const isAuthorized = await monerium.getAccess()
```

Congratulations, you authenticated your users with Monerium and linked the Safe to the Monerium account.

</Steps>

## Step 2: Place an Order

Once users are authenticated with Monerium, they can place an order to transfer tokens from their Safe to an IBAN.

<Steps>

### Get some tokens

First, your users needs to obtain some EURe test tokens on Sepolia:

* Log into the [Monerium Sandbox](https://sandbox.monerium.dev/accounts) account.
* Click on the `ADD MONEY` button.
* Create a test IBAN transfer onto the account. The tokens from this test transfer will be available in the Safe.

<Image src={MoneriumAddMoney} width={300} height={500}  />

### Send an order to Monerium

To send tokens from a Safe to an IBAN, users must send the order to Monerium and sign a message with their account.

```typescript
import { placeOrderMessage } from '@monerium/sdk'

const amount = '10' // Specify the amount in Euro
const iban = 'DK4878805291075472' // The target IBAN

// 'Send EUR 10 to DK4878805291075472 at Fri, 17 May 2024 20:55:29Z'
const orderMessage = placeOrderMessage(amount, 'eur', iban)

// Send the order to the Monerium backend
const order = await moneriumClient.placeOrder({
  amount,
  signature: '0x',
  currency: 'eur',
  address: safeAddress, // the Safe address
  counterpart: {
    identifier: {
      standard: 'iban',
      iban
    },
    details: {
      firstName: 'User',
      lastName: 'Userson',
      county: 'AL'
    }
  },
  message: orderMessage,
  memo: 'Powered by Monerium SDK',
  chain: 'ethereum',
  network: 'sepolia'
})
```

Monerium will listen for the sign message transaction of the following step on the selected chain and execute the order once the transaction settles.

### Sign the order with the Safe

Now, the Safe needs to sign the order. 
To do this, send a sign message transaction to the blockchain. 
In practice, one owner might propose this transaction using the Safe Transaction Service. The other owner confirms the message and sends the transaction through the [Safe\{Wallet\}](https://app.safe.global/) UI.

```typescript
// Hash and encode the order message
const txData = signMessageContract.encode('signMessage', [
  hashSafeMessage(orderMessage)
])

// Assemble a transaction object
const safeTransactionData = {
  to: await signMessageContract.getAddress(),
  value: '0',
  data: txData,
  operation: OperationType.DelegateCall
}

// Create a transaction with the Safe\{Core\} SDK
const signMessageTx = await protocolKit.createTransaction({
  transactions: [safeTransactionData]
})

// Sign the transaction with the first owner
const signedTx = await protocolKit.signTransaction(signMessageTx)

// Sign and execute the transaction with the second owner
const transactionResult = await protocolKitOfOwner2.executeTransaction(signedTx)

// Verify on-chain settlement
console.log('transactionResult', transactionResult)
```

Monerium will execute the order once the transaction settles.

</Steps>

Well done! You have linked your users' Safes to an IBAN, bridging the gap between blockchain and traditional payment rails. 

## Further reading

* [Monerium Developer Portal](https://monerium.dev/docs/welcome)
* Add [event listeners](https://monerium.github.io/js-sdk/#subscribe-to-order-events) to make your app more interactive.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/onramp/stripe.mdx`:

```mdx
import { Steps, Callout } from 'nextra/components'
import Image from 'next/image'
import StripeKycPersonalInfoImage from '../../../assets/stripe-kyc-personal-info.png'
import KycAddress from '../../../assets/stripe-kyc-address.png'
import PaymentMethod from '../../../assets/stripe-kyc-payment-method.png'
import RemovedContentCallout from '../../../components/RemovedContentCallout'

<RemovedContentCallout>
  The Onramp Kit in the Safe\{Core\} SDK is no longer supported; with that, neither is the `StripePack`. We recommend integrating Stripe directly into your application by following this guide.
</RemovedContentCallout>

# Onramp with Stripe

The [Stripe fiat-to-crypto onramp service](https://docs.stripe.com/crypto/onramp) allows you to integrate a secure widget into your application that enables users to purchase cryptocurrencies using their credit card or bank account.

## Prerequisites

1. [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
2. [Stripe account](https://dashboard.stripe.com/register)
3. A web application using your favorite CLI and language. For example [React with NextJS](https://nextjs.org/docs), [Vue with Nuxt](https://nuxt.com/) or [Svelte with SvelteKit](https://kit.svelte.dev/).
4. A [deployed Safe](../protocol-kit.mdx) for your users.

## Integrate the Stripe fiat-to-crypto onramp widget

<Steps>

### Obtain your public and private keys

To use the Stripe fiat-to-crypto onramp service, you need to obtain your [public and private keys](https://docs.stripe.com/keys).
You have to apply for the crypto onramp service and add at least your business address and information to your Stripe account.
When your application is approved, you will find your public and private keys in your [Stripe Developer Dashboard](https://dashboard.stripe.com/test/apikeys).

### Install dependencies

First, install Stripe's client library.

<CH.Section>
  <CH.Code style={{boxShadow: 'none'}}>
    ```bash npm
    npm install --save @stripe/stripe-js @stripe/crypto
    ```

    ``` bash yarn
    yarn add @stripe/stripe-js @stripe/crypto
    ```

    ```bash pnpm
    pnpm add @stripe/stripe-js @stripe/crypto
    ```
  </CH.Code>
</CH.Section>

### Generate a new `client_secret`

To authenticate your users, you need to generate a `client_secret` to initialize the Stripe widget.
For this, you must make an API request to the [Stripe API](https://docs.stripe.com/api/crypto/onramp_sessions) using your Stripe private key.
It will return a unique `client_secret` that you can use to initialize the Stripe widget for your users.

To ensure you don't leak your private key, you should make the request from your backend.
The backend can then send the `client_secret` to your front end.
You can use the [Stripe server example](https://github.com/5afe/stripe-server-example) as a starting point for your backend.

Here is how you generate a crypto onramp session using your private key:

<CH.Section>
  <CH.Code style={{boxShadow: 'none'}}>
    ```typescript TypeScript
    const stripeSessionResponse = await fetch(
      'https://api.stripe.com/v1/crypto/onramp_sessions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Bearer sk_test_51...Eg7o' // your private key for Stripe
        },
        // optional parameters, for example the users' Safe address
        body: 'wallet_addresses[ethereum]=0x3A16E3090e32DDeD2250E862B9d5610BEF13e93d'
      }
    )

    const decodedResponse = await stripeSessionResponse.json()
    const clientSecret = decodedResponse['client_secret']
    ```

    ```bash curl
    curl -X POST https://api.stripe.com/v1/crypto/onramp_sessions \
      # your private key for Stripe
      -u sk_test_51...Eg7o: \
      # optional parameters, for example a wallet address
      -d "wallet_addresses[ethereum]"="0xB00F0759DbeeF5E543Cc3E3B07A6442F5f3928a2"
    ```
  </CH.Code>
</CH.Section>

### Initialize the Stripe widget

The Stripe widget is a secure iframe that allows users to purchase cryptocurrencies.

You can initialize the Stripe widget using the `client_secret` you obtained from the previous step:
<CH.Section>
  <CH.Code style={{boxShadow: 'none'}}>
    ```typescript TypeScript
    import { loadStripeOnramp } from '@stripe/crypto'

    // StripeOnramp is imported with the scripts from step one  
    const stripeOnramp = await loadStripeOnramp(
      'pk_test_51...GgYH'
    )

    // Use the client secret from the previous step
    const onrampSession = stripeOnramp.createSession({ clientSecret })
    onrampSession.mount('#onramp-element')
    ```

    ```html HTML
    <!-- Make sure to include a corresponding HTML element -->
    <div id='onramp-element' />
    ```
  </CH.Code>
</CH.Section>

### Listen to Stripe events

You can listen to the [frontend events](https://docs.stripe.com/crypto/using-the-api#frontend-events) from the Stripe widget to update your UI or handle errors.

```typescript TypeScript
// Listen to events using the onrampSession object from one of the previous step
onrampSession.addEventListener('onramp_ui_loaded', event => {
  console.log('Onramp UI loaded:', event)
})

onrampSession.addEventListener('onramp_session_updated', event => {
  console.log('Onramp session updated:', event)
})

// For modal overlay render mode only
onrampSession.addEventListener('onramp_ui_modal_opened', event => {
  console.log('Onramp UI modal opened:', event)
})

onrampSession.addEventListener('onramp_ui_modal_closed', event => {
  console.log('Onramp UI modal closed:', event)
})
```

</Steps>

Now, Stripe will render the widget in the `onramp-element` div, allowing users to purchase cryptocurrencies securely.

![The Stripe widget](https://b.stripecdn.com/docs-statics-srv/assets/crypto-onramp-overview.c4c0682697f2cd4c1c2769c3c5e08506.png)

## Test the Stripe widget

### Test customer data

  In production, each customer should pass an individual KYC process, but you should probably test your application before that. 
  You can use the following test data to bypass the KYC process while in [test mode](https://stripe.com/docs/test-mode).
  Make sure to select USD as the currency to buy cryptocurrency with.

  | **Field**                   | **Value**                   | **Description**                                               |
  | --------------------------- | --------------------------- | ------------------------------------------------------------- |
  | **Email**                   | your-email@example.com      | Use any test or fake emails                                   |
  | **Phone Number**            | +18004444444                | Use +18004444444 for phone number                             |
  | **OTP Verification Code**   | 000000                      | Use 000000 for the OTP verification code                      |
  | **First Name**              | John                        | Use any first name                                            |
  | **Last Name**               | Verified                    | Use Verified for the last name                                |
  | **Birthday**                | January 1, 1901             | Use January 1, 1901 for successful identity verification      |
  | **Identification Type**     | Social Security Number      | Select Social Security Number for identification type         |
  | **Identification Number**   | 000000000                   | Enter 000000000 to fill the identification number field       |
  | **Country**                 | United States               | Select United States for country                              |
  | **Address Line 1**          | address_full_match          | Use address_full_match for successful identity verification   |
  | **City**                    | Seattle                     | Use Seattle for city                                          |
  | **State**                   | Washington                  | Select Washington for state                                   |
  | **Zip Code**                | 12345                       | Use 12345 for zip code                                        |
  | **Test Credit Card Number** | 4242424242424242            | Use test credit card 4242424242424242                         |
  | **Expiration Date**         | 12/24                       | Use future expiration date 12/24                              |
  | **CVC**                     | 123                         | Use any CVC 123                                               |
  | **Billing Zip Code**        | 12345                       | Use any zip code 12345 for billing               

### Example images for KYC and payment method

In the following images, you'll find examples of how to complete the KYC process and setup the payment method for a successful test purchase.

#### Personal Info

<Image src={StripeKycPersonalInfoImage} width={300} height={500} alt="KYC Personal info example" />

#### Address

<Image src={KycAddress} width={300} height={500} alt="KYC Address Example" />

#### Payment Method

<Image src={PaymentMethod} width={300} height={500} alt="Payment Method" />

These data will allow you to test the Stripe widget without passing the KYC process.

## Conclusion

Well done, you have successfully integrated the Stripe fiat-to-crypto onramp service into your application.
Your users can now purchase cryptocurrencies securely within your app.

If you have any questions or encounter any issues, contact the [Stripe support](https://support.stripe.com/) team.
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/onramp/_meta.json`:

```json
{
  "monerium": "Monerium",
  "stripe": "Stripe"
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/overview.mdx`:

```mdx
import { Callout } from 'nextra/components'
import { Grid } from '@mui/material'
import CustomCard from '../../components/CustomCard'
import SafeCoreSDK from '../../assets/svg/ic-sdk.svg'
import SafeSmartAccount from '../../assets/svg/ic-smart-account.svg'
import SafeCoreAPI from '../../assets/svg/ic-api.svg'

# Safe\{Core\} SDK

The Safe\{Core\} SDK aims to bring Account Abstraction to life by integrating Safe with different third parties. This SDK helps developers to abstract the complexity of setting up a smart contract account.

<Callout type="warning">
  **Build Compatibility:** The Safe\{Core\} SDK kits are only available in CommonJS build format.
</Callout>

The Safe\{Core\} SDK groups its functionality into four different kits:

## Starter Kit

The [Starter Kit](../sdk/starter-kit) is the starting point for interacting with the Safe smart account. It leverages and abstracts the complex logic from other kits while being modular and customizable, offering the most simplified way to deploy new accounts and handle the Safe transaction flow in all its different forms:

- User operations
- Multi-signature transactions
- Off-chain and on-chain messages

<Grid item mt={3}>
  <CustomCard
    title={'Starter Kit'}
    description={'Learn about the Starter Kit and the Safe Smart Account integration.'}
    url={'./starter-kit'}
    newTab={false}
  />
</Grid>

## Protocol Kit

The [Protocol Kit](./protocol-kit.mdx) helps interact with Safe Smart Accounts. It enables the creation of new Safe accounts, updating their configuration, and signing and executing transactions, among other features.

- Modular and customizable smart contract accounts
- Battle-tested security
- Transaction batching

<Grid container mt={3}>
  <CustomCard
    title={'Protocol Kit'}
    description={'Learn about the Protocol Kit and the Safe Smart Account contracts integration.'}
    url={'./protocol-kit'}
    newTab={false}
  />
</Grid>

## API Kit

The [API Kit](./api-kit.mdx) helps interact with the Safe Transaction Service API. It helps share transactions among the signers and get information from a Safe account. For example, the configuration or transaction history.

<Grid container mt={3}>
  <CustomCard
    title={'API Kit'}
    description={'Learn about the API Kit and the integration with the Safe Transaction Service.'}
    url={'./api-kit'}
    newTab={false}
  />
</Grid>

## Relay Kit

The [Relay Kit](./relay-kit.mdx) enables transaction relaying with Safe and allows users to pay for the transaction fees from their Safe account using the blockchain native token, ERC-20 tokens, or get their transactions sponsored.

- Use ERC-4337 with Safe
- Gas-less experiences using Gelato
- Sponsored transaction
- Pay fees in ERC-20 tokens

<Grid container mt={3}>
  <CustomCard
    title={'Relay Kit'}
    description={'Learn about the Relay Kit and the packs integrating ERC-4337 and Gelato.'}
    url={'./relay-kit'}
    newTab={false}
  />
</Grid>

## Resources
- [Safe\{Core\} Account Abstraction SDK on GitHub](https://github.com/safe-global/safe-core-sdk)
- [Safe\{Core\} Account Abstraction SDK demo application](https://github.com/5afe/account-abstraction-demo-ui)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/react-hooks.mdx`:

```mdx
import { Grid } from '@mui/material'
import CustomCard from '../../components/CustomCard'

# Safe React Hooks

The Safe React Hooks are the starting point for interacting with the Safe smart account using a React application.

These hooks are built on top of the [Starter Kit](./starter-kit.mdx), which leverages and abstracts the complex logic from several kits from the Safe\{Core\} SDK, allowing you to set a React context that gives access to the exposed Safe functionality everywhere in your application. 

<Grid item mt={3}>
  <CustomCard
    title={'@safe-global/safe-react-hooks'}
    description={''}
    url={'https://www.npmjs.com/package/@safe-global/safe-react-hooks'}
  />
</Grid>

The following guides show how to use the Safe React Hooks and integrate it into your project:
- [Send transactions](./react-hooks/guides/send-transactions.mdx)

## Resources

- [Safe React Hooks on GitHub](https://github.com/safe-global/safe-react-hooks)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/relay-kit/reference/safe-4337-pack.mdx`:

```mdx
import { Callout } from 'nextra/components'

# Safe4337Pack

The `Safe4337Pack` enables Safe accounts to interact with user operations through the implementation of the `RelayKitBasePack`. You can find more about ERC-4337 at [this link](https://eips.ethereum.org/EIPS/eip-4337).

## Install dependencies

To use `Safe4337Pack` in your project, start by installing the `relay-kit` package with this command:

```bash
yarn add @safe-global/relay-kit
```

## Reference

The `Safe4337Pack` class make easy to use the [Safe 4337 Module](https://github.com/safe-global/safe-modules/tree/main/modules/4337/contracts/Safe4337Module.sol) with your Safe. It enables creating, signing, and executing transactions grouped in user operations using a selected provider. You can select your preferred [bundler](https://www.erc4337.io/docs/bundlers/introduction) and [paymaster](https://www.erc4337.io/docs/paymasters/introduction).

```typescript
const safe4337Pack = await Safe4337Pack.init({
  provider,
  signer,
  bundlerUrl,
  safeModulesVersion,
  customContracts,
  options,
  paymasterOptions
})
```

### `init(safe4337InitOptions)`

The static method `init()` generates an instance of `Safe4337Pack`. Use this method to create the initial instance instead of the regular constructor.

**Parameters**

The `Safe4337InitOptions` used in the `init()` method are:

```typescript
Safe4337InitOptions = {
  provider: Eip1193Provider | HttpTransport | SocketTransport
  signer?: HexAddress | PrivateKey | PasskeyArgType
  bundlerUrl: string
  safeModulesVersion?: string
  customContracts?: {
    entryPointAddress?: string
    safe4337ModuleAddress?: string
    addModulesLibAddress?: string
  }
  options: ExistingSafeOptions | PredictedSafeOptions
  paymasterOptions?: PaymasterOptions
}

HexAddress = string
PrivateKey = string
HttpTransport = string
SocketTransport = string

Eip1193Provider = {
  request: (args: RequestArguments) => Promise<unknown>
}

RequestArguments = {
  method: string
  params?: readonly unknown[] | object
}

ExistingSafeOptions = {
  safeAddress: string
}

PredictedSafeOptions = {
  owners: string[]
  threshold: number
  safeVersion?: SafeVersion
  saltNonce?: string
}

PaymasterOptions = {
  paymasterUrl?: string
  isSponsored?: boolean
  sponsorshipPolicyId?: string
  paymasterAddress: string
  paymasterTokenAddress?: string
  amountToApprove?: bigint
}
```

- **`provider`** : The EIP-1193 compatible provider or RPC URL of the selected chain.
- **`signer`** : A passkey or the signer private key if the `provider` doesn't resolve to a signer account. If the `provider` resolves to multiple signer addresses, the `signer` property can be used to specify which account to connect, otherwise the first address returned will be used.
- **`rpcUrl`** : The RPC URL of the selected chain.
- **`bundlerUrl`** : The bundler's URL.
- **`safeModulesVersion`** : The version of the [Safe Modules contract](https://github.com/safe-global/safe-modules-deployments/tree/main/src/assets/safe-4337-module).
- **`customContracts`** : An object with custom contract addresses. This is optional, if no custom contracts are provided, default ones will be used.
  - **`entryPointAddress`** : The address of the entry point. Defaults to the address returned by the `eth_supportedEntryPoints` method from the provider API.
  - **`safe4337ModuleAddress`** : The address of the `Safe4337Module`. Defaults to `safe-modules-deployments` using the current version.
  - **`addModulesLibAddress`** : The address of the `AddModulesLib` library. Defaults to `safe-modules-deployments` using the current version.
- **`options`** : The Safe account options.
  - **`safeAddress`** : The Safe address. You can only use this prop to specify an existing Safe account.
  - **`owners`** : The array with Safe owners.
  - **`threshold`** : The Safe threshold. This is the number of owners required to sign and execute a transaction.
  - **`safeVersion`** : The version of the [Safe contract](https://github.com/safe-global/safe-deployments/tree/main/src/assets). Defaults to the current version.
  - **`saltNonce`** : The Safe salt nonce. Changing this value enables the creation of different safe (predicted) addresses using the same configuration (`owners`, `threshold`, and `safeVersion`).
- **`paymasterOptions`** : The paymaster options.
  - **`paymasterUrl`** : The paymaster URL. You can obtain the URL from the management dashboard of the selected services provider. This URL will be used for gas estimations.
  - **`isSponsored`** : A boolean flag to indicate if we want to use a paymaster to sponsor transactions.
  - **`sponsorshipPolicyId`** : The sponsorship policy ID can be obtained from the management dashboard of the selected payment services provider.
  - **`paymasterAddress`** : The address of the paymaster contract to use.
  - **`paymasterTokenAddress`** : The paymaster token address for transaction fee payments.
  - **`amountToApprove`** : The `paymasterTokenAddress` amount to approve.

**Returns**
A promise that resolves to an instance of the `Safe4337Pack`.

**Caveats**

- Use this method to create the initial instance instead of the standard constructor.
- You should search for some API services URLs and contract addresses in the management dashboards of your selected provider. These include `bundlerUrl`, `paymasterUrl`, `paymasterAddress`, `paymasterTokenAddress`, `sponsorshipPolicyId`, and `rpcUrl` (In this case any valid RPC should be fine).
- The SDK uses default versions when `safeModulesVersion` or `safeVersion` are not specified. You can find more details about the current versions [here](https://github.com/safe-global/safe-core-sdk/blob/924ae56ff707509e561c99296fb5e1fbc2050d28/packages/relay-kit/src/packs/safe-4337/Safe4337Pack.ts#L34-L35).
- The `saltNonce` derives different Safe addresses by using the `protocol-kit` method `predictSafeAddress`. You can find more details about this process [here](https://github.com/safe-global/safe-core-sdk/blob/924ae56ff707509e561c99296fb5e1fbc2050d28/packages/protocol-kit/src/contracts/utils.ts#L245-L315).
- We typically initialize the pack in two ways. One way is by using an existing account with the `safeAddress` prop. The other way is by using the `owners`, `threshold`, `saltNonce`, and `safeVersion` props to create a new Safe account. You can also apply the second method to existing addresses, as the output address will be the same if the inputs are identical.
- The SDK queries `eth_supportedEntryPoints` for a default `entryPointAddress` if not given. It fetches `safe4337ModuleAddress` and `addModulesLibAddress` from the `safe-modules-deployments` repository if not provided. You can find them at: [safe-modules-deployments](https://github.com/safe-global/safe-modules-deployments/tree/main/src/assets/safe-4337-module).
- To use a paymaster without sponsorship, you need to hold a certain amount of `paymasterTokenAddress` in the Safe account for fees. Make sure to provide the `paymasterAddress` as well.
- You can choose to use a paymaster to sponsor transactions by setting the `isSponsored` prop. When sponsoring transactions, you need to provide the `paymasterUrl`, `paymasterAddress`, and optionally the `sponsorshipPolicyId`.
- An approval for the concrete ERC-20 token is required to use the paymaster so remember to add the `paymasterTokenAddress` of the ERC-20 token that will pay the fees. The SDK will encode this approval internally and send it to the bundler with the rest of the user operation.
- Specify the amount to approve for the `paymasterTokenAddress` using the `amountToApprove` prop. This is necessary when the Safe account is not deployed, and you need to approve the paymaster token for fee payments and Safe account setup.

### `new Safe4337Pack({protocolKit, bundlerClient, publicClient, bundlerUrl, paymasterOptions, entryPointAddress, safe4337ModuleAddress})`

The `Safe4337Pack` constructor method is used within the `init()` method and should not be directly accessed. The parameters are calculated or provided by the `init()` method.

### `createTransaction(safe4337CreateTransactionProps)`

Create a `SafeOperation` from a transaction batch. You can send multiple transactions to this method. The SDK internally bundles these transactions into a batch sent to the bundler as a `UserOperation`. If the transaction is only one then no batch is created a it's not necessary.

**Parameters**

The `Safe4337CreateTransactionProps`

```typescript
Safe4337CreateTransactionProps = {
  transactions: MetaTransactionData[]
  options?: {
    amountToApprove?: bigint
    validUntil?: number
    validAfter?: number
    feeEstimator?: IFeeEstimator
  }
}
```

- **`transactions`** : Array of `MetaTransactionData` to batch in a `SafeOperation` (using the multisend contract if more than one transaction is included).
- **`options`** : Optional parameters.
  - **`amountToApprove`** : The amount to approve to the `paymasterTokenAddress`.
  - **`validUntil`** : The UserOperation will remain valid until this block's timestamp.
  - **`validAfter`** : The UserOperation will be valid after this block's timestamp.
  - **`feeEstimator`** : The fee estimator calculates gas requirements by implementing the `IFeeEstimator` interface.

**Returns**
A promise that resolves to the `SafeOperation`.

**Caveats**

- The `SafeOperation` is similar to the standard user operation but includes Safe-specific fields. Before sending it to the bundler, we convert the `SafeOperation` to a regular user operation. We need to sign the operation for the bundler to execute it using the `Safe4337Module`.
- You can set the `amountToApprove` in this method to approve the `paymasterTokenAddress` for transaction payments, similar to how `amountToApprove` works in the `init()` method.
- We use a similar API to `protocol-kit` for developers transitioning to `Safe4337Pack`. This API helps with creating and executing transactions, bundling user operations and sending them to the bundler.
- Use `validUntil` and `validAfter` to set the block timestamp range for the user operation's validity. The operation will be rejected if the block timestamp falls outside this range.
- The `feeEstimator` calculates gas needs for the UserOperation. We default to Pimlico's `feeEstimator`, but you can use a different one by providing your own. The IFeeEstimator interface requires an object with specific methods.

```typescript
IFeeEstimator {
  setupEstimation?: EstimateFeeFunction
  adjustEstimation?: EstimateFeeFunction
  getPaymasterEstimation?: EstimateSponsoredFeeFunction
}

 EstimateFeeFunctionProps = {
  userOperation: UserOperation
  bundlerUrl: string
  entryPoint: string
}

EstimateSponsoredFeeFunctionProps = {
  userOperation: UserOperation
  paymasterUrl: string
  entryPoint: string
  sponsorshipPolicyId?: string
}
```

All methods are optional and will be called in the specified order if you provide any of them:

1. `setupEstimation` : This method, called before using the bundler `eth_estimateUserOperationGas` in the pack code, allows you to adjust the user operation before the bundler estimates it, as each provider has its own recommendations.
2. `adjustEstimation` : This method is used after calling `eth_estimateUserOperationGas` in the pack code to adjust the bundler estimation.
3. `getPaymasterEstimation` : After using the bundler `eth_estimateUserOperationGas` from the package code, this method is used if the user operation is sponsored. It helps adjust the bundler's estimation when a paymaster sponsors the transaction that use to involve some specific fee estimations.

### `signSafeOperation(safeOperation, signingMethod)`

Signs a `SafeOperation`.

**Parameters**

- **`safeOperation`** : The `EthSafeOperation | SafeOperationResponse` to sign. Can either be created by the `Safe4337Pack` or fetched via `api-kit`.
- **`signingMethod`** : The method to use for signing the transaction. The default is `SigningMethod.ETH_SIGN_TYPED_DATA_V4`.

**Returns**
A promise that resolves to the signed `SafeOperation`.

**Caveats**

- Use this method after the `SafeOperation` is generated with the `createTransaction` method.
- This method adds the signer's signature to the signatures map of the `SafeOperation` object. Additional signatures can be included from multiple owners.
- It works similar to `signTransaction` and `signMessage` methods in the `protocol-kit` but using `SafeOperation` instead of `SafeTransaction` or `SafeMessage`. For more information, refer to the Safe [docs](https://docs.safe.global/sdk/protocol-kit/guides/signatures).

### `executeTransaction(safe4337ExecutableProps)`

This method sends the user operation to the bundler.

<Callout type="info" emoji="ℹ️">
  If you are not using a paymaster and need to deploy a new Safe (counterfactual
  deployment), you must hold in the predicted Safe address the amount of native
  token required to cover the fees.
</Callout>

**Parameters**

The `Safe4337ExecutableProps`

```typescript
Safe4337ExecutableProps = {
  executable: EthSafeOperation | SafeOperationResponse
}
```

- **`executable`** : The `SafeOperation` to execute. Can either be created by the `Safe4337Pack` or fetched via `api-kit`.

**Returns**
A promise, resolves to the user operation hash.

**Caveats**

- The process converts the `SafeOperation` to a standard user operation, then forwards it to the bundler. The `SafeOperation` must be created and signed by the Safe owner.
- You can use the user operation hash to browse the status (e.g `https://jiffyscan.xyz/userOpHash/{userOpHash}`)

### `getUserOperationByHash(userOpHash)`

Retrieve the user operation using its hash.

**Parameters**

- **`userOpHash`** : The user operation hash is returned by the `executeTransaction` method. The user operation can be executed or pending, and the method will return the payload data for the user operation.

**Returns**
A Promise that resolves to `UserOperationWithPayload`.

```typescript
UserOperationWithPayload = {
  userOperation: UserOperation
  entryPoint: string
  transactionHash: string
  blockHash: string
  blockNumber: string
}
```

**Caveats**

- Use this method to request information about the user operation sent to the bundler, but do not use it for the execution status.

### `getUserOperationReceipt(userOpHash)`

Get `UserOperation` receipt by a hash.

**Parameters**

- **`userOpHash`** : Unique identifier for the `UserOperation`

**Returns**
A Promise that resolves to `UserOperationReceipt` after the user operation is executed.

```typescript
UserOperationReceipt = {
  userOpHash: string
  sender: string
  nonce: string
  actualGasUsed: string
  actualGasCost: string
  success: boolean
  logs: Log[]
  receipt: Receipt
}
```

**Caveats**

- Use this method to obtain the full execution trace and status.
- You can use this method to check if the `UserOperation` was successful by calling it repeatedly until the receipt is available.

### `getSupportedEntryPoints()`

Retrieve all supported entry points.

**Returns**
A promise that resolves to an array of entry point addresses (strings) supported by the bundler.

**Caveats**
We use this method to obtain the default entry point if not provided in the `init()` method.

### `getChainId()`

Retrieve the EIP-155 Chain ID.

**Returns**
A promise that resolves to the EIP-155 Chain ID string.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/relay-kit/reference/_meta.json`:

```json
{
  "safe-4337-pack": "Safe4337Pack"
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/relay-kit/guides/4337-safe-sdk.mdx`:

```mdx
import { Tabs, Steps, Callout } from 'nextra/components'

# Safe accounts with the Safe4337Module

<Callout type="warning">
  **EntryPoint compatibility:**  The Relay Kit only supports the ERC-4337 EntryPoint v0.6. v0.7 is not supported yet.
</Callout>

In this guide, you will learn how to create and execute multiple Safe transactions grouped in a batch from a Safe account that is not yet deployed and where the executor may or may not have funds to pay for the transaction fees. This can be achieved by supporting the [ERC-4337](../../../home/glossary.md#erc-4337) execution flow, which is supported by the [Safe4337Module](../../../advanced/erc-4337/guides/safe-sdk.mdx) and exposed via the Relay Kit from the Safe\{Core\} SDK.

Read the [Safe4337Module documentation](../../../advanced/erc-4337/guides/safe-sdk.mdx) to understand its benefits and flows better.

[Pimlico](https://pimlico.io) is used in this guide as the service provider, but any other provider compatible with the ERC-4337 can be used.

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
- A [Pimlico account](https://dashboard.pimlico.io) and an API key.

## Install dependencies

```bash
yarn add @safe-global/relay-kit
```

## Steps

<Steps>

  ### Imports

  Here are all the necessary imports for the script we implement in this guide.

  {/* <!-- vale off --> */}

  ```typescript
  import { Safe4337Pack } from '@safe-global/relay-kit'
  ```

  {/* <!-- vale on --> */}

  ### Create a signer

  Firstly, we need to get a signer, which will be the owner of a Safe account after it's deployed.

  In this example, we use a private key, but any way to get an EIP-1193 compatible signer can be used.

  {/* <!-- vale off --> */}

  ```typescript
  const SIGNER_ADDRESS = // ...
  const SIGNER_PRIVATE_KEY = // ...
  const RPC_URL = 'https://rpc.ankr.com/eth_sepolia'
  ```

  {/* <!-- vale on --> */}

  ### Initialize the `Safe4337Pack`

  The `Safe4337Pack` class is exported from the Relay Kit and implements the ERC-4337 to create, sign, and submit Safe user operations.

  To instantiate this class, the static `init()` method allows connecting existing Safe accounts (as long as they have the `Safe4337Module` enabled) or setting a custom configuration to deploy a new Safe account at the time where the first Safe transaction is submitted.

  {/* <!-- vale off --> */}

  <Tabs items={['New Safe account', 'Existing Safe account']}>
    <Tabs.Tab>
      When deploying a new Safe account, we need to pass the configuration of the Safe in the `options` property. In this case, we are configuring a Safe account that will have our signer as the only owner.

      Optionally, you can [track your ERC-4337 Safe transactions on-chain](../../onchain-tracking.mdx) by using the `onchainAnalytics` property.

      ```typescript
      const safe4337Pack = await Safe4337Pack.init({
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY,
        bundlerUrl: `https://api.pimlico.io/v1/sepolia/rpc?apikey=${PIMLICO_API_KEY}`,
        options: {
          owners: [SIGNER_ADDRESS],
          threshold: 1
        },
        onchainAnalytics // Optional
        // ...
      })
      ```
    </Tabs.Tab>
    <Tabs.Tab>
      When connecting an existing Safe account, we need to pass the `safeAddress` in the `options` property.
      
      Optionally, you can [track your ERC-4337 Safe transactions on-chain](../../onchain-tracking.mdx) by using the `onchainAnalytics` property.

      ```typescript
      const safe4337Pack = await Safe4337Pack.init({
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY,
        bundlerUrl: `https://api.pimlico.io/v1/sepolia/rpc?apikey=${PIMLICO_API_KEY}`,
        options: {
          safeAddress: '0x...'
        },
        onchainAnalytics // Optional
        // ...
      })
      ```
    </Tabs.Tab>
  </Tabs>

  {/* <!-- vale on --> */}

  By default, the transaction fees will be paid in the native token and extracted from the Safe account, so there must be enough funds in the Safe address. 

  You can also use a paymaster to handle the fees. If you choose to use a paymaster, there are two other ways to initialize the `Safe4337Pack`.

  {/* <!-- vale off --> */}

  <Tabs items={['Using an ERC-20 Paymaster', 'Using a verifying Paymaster (Sponsored)']}>
    <Tabs.Tab>
      A paymaster will execute the transactions and get reimbursed from the Safe account, which must have enough funds in the Safe address in advance. 
      
      Payment of transaction fees is made using an ERC-20 token specified with the `paymasterTokenAddress` property. If an ERC-20 token is used, the Safe must approve that token to the paymaster. If no balance is approved, it can be specified using the `amountToApprove` property.

      ```typescript
      const safe4337Pack = await Safe4337Pack.init({
        // ...
        paymasterOptions: {
          paymasterAddress: '0x...',
          paymasterTokenAddress: '0x...',
          amountToApprove // Optional
        }
      })
      ```
    </Tabs.Tab>
    <Tabs.Tab>
      A paymaster will execute the transactions and pay for the transaction fees.

      If you are using Pimlico infrastructure and don't have funds in your Pimlico account, you need to use a `sponsorshipPolicyId`. Check [How to use Sponsorship Policies](https://docs.pimlico.io/paymaster/verifying-paymaster/how-to/use-sponsorship-policies) to learn more.

      ```typescript
      const safe4337Pack = await Safe4337Pack.init({
        // ...
        paymasterOptions: {
          isSponsored: true,
          paymasterUrl: `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`,
          paymasterAddress: '0x...',
          paymasterTokenAddress: '0x...',
          sponsorshipPolicyId // Optional value to set the sponsorship policy id from Pimlico
        }
      })
      ```
    </Tabs.Tab>
  </Tabs>

  {/* <!-- vale on --> */}

  ### Create a user operation

  To create a Safe user operation, use the `createTransaction()` method, which takes the array of transactions to execute and returns a `SafeOperation` object.
  
  {/* <!-- vale off --> */}

  ```typescript
  // Define the transactions to execute
  const transaction1 = { to, data, value }
  const transaction2 = { to, data, value }

  // Build the transaction array
  const transactions = [transaction1, transaction2]

  // Create the SafeOperation with all the transactions
  const safeOperation = await safe4337Pack.createTransaction({ transactions })
  ```

  {/* <!-- vale on --> */}

  The `safeOperation` object has the `data` and `signatures` properties, which contain all the information about the transaction batch and the signatures of the Safe owners, respectively.

  ### Sign the user operation

  Before sending the user operation to the bundler, it's required to sign the `safeOperation` object with the connected signer. The `signSafeOperation()` method, which receives a `SafeOperation` object, generates a signature that will be checked when the `Safe4337Module` validates the user operation.

  {/* <!-- vale off --> */}

  ```typescript
  const signedSafeOperation = await safe4337Pack.signSafeOperation(identifiedSafeOperation)
  ```

  {/* <!-- vale on --> */}

  ### Submit the user operation

  Once the `safeOperation` object is signed, we can call the `executeTransaction()` method to submit the user operation to the bundler.

  {/* <!-- vale off --> */}

  ```typescript
  const userOperationHash = await safe4337Pack.executeTransaction({
    executable: signedSafeOperation
  })
  ```

  {/* <!-- vale on --> */}

  This method returns the hash of the user operation. With it, we can monitor the transaction status using a block explorer or the bundler's API.

  ### Check the transaction status

  To check the transaction status, we can use the `getTransactionReceipt()` method, which returns the transaction receipt after it's executed.

  {/* <!-- vale off --> */}

  ```typescript
  let userOperationReceipt = null

  while (!userOperationReceipt) {
    // Wait 2 seconds before checking the status again
    await new Promise((resolve) => setTimeout(resolve, 2000))
    userOperationReceipt = await safe4337Pack.getUserOperationReceipt(
      userOperationHash
    )
  }
  ```

  {/* <!-- vale on --> */}

  In addition, we can use the `getUserOperationByHash()` method with the returned hash to retrieve the user operation object we sent to the bundler.

  {/* <!-- vale off --> */}

  ```typescript
  const userOperationPayload = await safe4337Pack.getUserOperationByHash(
    userOperationHash
  )
  ```

  {/* <!-- vale on --> */}

</Steps>

## Recap and further reading

After following this guide, we are able to deploy new Safe accounts and create, sign, and execute Safe transactions in a batch without the executor needing to have funds to pay for the transaction fees.

Learn more about the ERC-4337 standard and the `Safe4337Module` contract following these links:

- [ERC-4337 website](https://www.erc4337.io)
- [EIP-4337 on Ethereum EIPs](https://eips.ethereum.org/EIPS/eip-4337)
- [Safe4337Module on GitHub](https://github.com/safe-global/safe-modules/tree/main/modules/4337)
- [Safe On-chain Identifiers on GitHub](https://github.com/5afe/safe-onchain-identifiers showcases where and how to add the identifier at the end of your Safe transactions data if you are not using the Relay Kit. Check also the [specific code](https://github.com/5afe/safe-onchain-identifiers/blob/main/test/OnchainIdentifier.ts#L197-L217) where the identifier is concatenated to the `callData`.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/relay-kit/guides/migrate-to-v3.md`:

```md
# Migrate to v3

This guide references the major changes between v2 and v3 to help those migrating an existing app.

## Remove the adapters

We have removed the concept of adapters from the `protocol-kit` to simplify the library. Instead of using specific library adapters, we use now an internal `SafeProvider` object to interact with the Safe. This `SafeProvider` will be created using:

- An Ethereum provider, an [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) compatible provider, or an RPC URL.
- An optional address of the signer that is connected to the provider or a private key. If not provided, the first account of the provider (`eth_accounts`) will be selected as the signer.

These changes affect the creation of the `Safe4337Pack` instance, as it was previously using an `ethAdapter` compatible object.

```typescript
// old
const safe4337Pack = await Safe4337Pack.init({
  ethAdapter: new EthersAdapter({ ethers, signerOrProvider }),
  // ...
})
```

```typescript
// new
const safe4337Pack = await Safe4337Pack.init({
  provider: window.ethereum, // Or any compatible EIP-1193 provider,
  signer: 'signerAddressOrPrivateKey', // Signer address or signer private key
  // ...
})

const safe4337Pack = await Safe4337Pack.init({
  provider: 'http://rpc.url', // Or websocket
  signer: 'privateKey', // Signer private key
  // ...
})
```

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/relay-kit/guides/migrate-to-v2.md`:

```md
# Migrate to v2

This guide references the major changes between v1 and v2 to help those migrating an existing app.

## GelatoRelayPack

- The `GelatoRelayPack` constructor now includes a mandatory `protocolKit` parameter. It's required for any new pack extending the `RelayKitBasePack`.

```js
constructor({ apiKey, protocolKit }: GelatoOptions)
```

- We removed the `protocolKit` parameter from the `createTransactionWithHandlePayment()`, `createTransactionWithTransfer()`, and `executeRelayTransaction()` methods in the `GelatoRelayPack` as now it's included in the constructor.

- Removed the `export interface RelayPack` type as we now use an abstract class.
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/relay-kit/guides/gelato-relay.mdx`:

```mdx
import { Steps } from 'nextra/components'

# Integration with Gelato

The [Gelato relay](https://docs.gelato.network/developer-services/relay) allows developers to execute gasless transactions.

## Prerequisites

1. [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm#using-a-node-version-manager-to-install-nodejs-and-npm).
2. Have a Safe account configured with threshold equal to 1, where only one signature is needed to execute transactions.
3. To use Gelato 1Balance an [API key](https://docs.gelato.network/developer-services/relay/payment-and-fees/1balance) is required.

## Install dependencies

```bash
yarn add ethers @safe-global/relay-kit @safe-global/protocol-kit @safe-global/types-kit
```

## Relay Kit options

Currently, the Relay Kit is only compatible with the [Gelato relay](https://docs.gelato.network/developer-services/relay). The Gelato relay can be used in two ways:
1. [Gelato 1Balance](https://docs.gelato.network/developer-services/relay/payment-and-fees/1balance)
2. [Gelato SyncFee](https://docs.gelato.network/developer-services/relay/quick-start/callwithsyncfee)

## Gelato 1Balance

[Gelato 1Balance](https://docs.gelato.network/developer-services/relay/payment-and-fees/1balance) allows you to execute transactions using a prepaid deposit. This can be used to sponsor transactions to other Safes or even to use a deposit on Polygon to pay the fees for a wallet on another chain.

For the 1Balance quickstart tutorial, you will use the Gelato relayer to pay for the gas fees on BNB Chain using the Polygon USDC you have deposited into your Gelato 1Balance account.

<Steps>

  ### Setup

  1. Start with a [1/1 Safe on BNB Chain](https://app.safe.global/transactions/history?safe=bnb:0x6651FD6Abe0843f7B6CB9047b89655cc7Aa78221).
  2. [Deposit Polygon USDC into Gelato 1Balance](https://docs.gelato.network/developer-services/relay/payment-and-fees/.1balance#how-can-i-use-1balance) ([transaction 0xa5f38](https://polygonscan.com/tx/0xa5f388c2d6e0d1bb32e940fccddf8eab182ad191644936665a54bf4bb1bac555)).
  3. The Safe owner [0x6Dbd26Bca846BDa60A90890cfeF8fB47E7d0f22c](https://bscscan.com/address/0x6Dbd26Bca846BDa60A90890cfeF8fB47E7d0f22c) signs a transaction to send 0.0005 BNB and submits it to Gelato relay.
  4. [Track the relay request](https://docs.gelato.network/developer-services/relay/quick-start/tracking-your-relay-request) of [Gelato Task ID 0x1bf7](https://relay.gelato.digital/tasks/status/0x1bf7664a1e176472f604bb3840d3d2a5bf56f98b60307961c3f8cee099f1eeb8).
  5. [Transaction 0x814d3](https://bscscan.com/tx/0x814d385c0ec036be65663b5fbfb0d8d4e0d35af395d4d96b13f2cafaf43138f9) is executed on the blockchain.

  ### Use a Safe as the Relay

  While using Gelato, you can specify that you only want the relay to allow transactions from specific smart contracts. If one of those smart contracts is a Safe smart contract, you will need to either verify the contract on a block explorer or get the ABI of the contract implementation (not the ABI of the smart contract address). This is because the Safe smart contracts use the [Proxy Pattern](https://medium.com/coinmonks/proxy-pattern-and-upgradeable-smart-contracts-45d68d6f15da), so the implementation logic for your smart contract exists on a different address.

  ### Imports

  ```typescript
  import { ethers } from 'ethers'
  import { GelatoRelayPack } from '@safe-global/relay-kit'
  import Safe from '@safe-global/protocol-kit'
  import {
    MetaTransactionData,
    MetaTransactionOptions
  } from '@safe-global/types-kit'
  ```

  ### Initialize the transaction settings

  Modify the variables to customize to match your desired transaction settings.

  ```typescript
  // https://chainlist.org
  const RPC_URL = 'https://endpoints.omniatech.io/v1/bsc/mainnet/public'
  const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY
  const safeAddress = '0x...' // Safe from which the transaction will be sent

  // Any address can be used for destination. In this example, we use vitalik.eth
  const destinationAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  const withdrawAmount = ethers.parseUnits('0.005', 'ether').toString()
  ```

  ### Create a transaction

  ```typescript
  // Create a transactions array with one transaction object
  const transactions: MetaTransactionData[] = [{
    to: destinationAddress,
    data: '0x',
    value: withdrawAmount
  }]

  const options: MetaTransactionOptions = {
    isSponsored: true
  }
  ```

  ### Instantiate the Protocol Kit and Relay Kit

  ```typescript
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: OWNER_PRIVATE_KEY,
    safeAddress
  })

  const relayKit = new GelatoRelayPack({
    apiKey: process.env.GELATO_RELAY_API_KEY!,
    protocolKit
  })
  ```

  ### Prepare the transaction

  ```typescript
  const safeTransaction = await relayKit.createTransaction({
    transactions,
    options
  })

  const signedSafeTransaction = await protocolKit.signTransaction(safeTransaction)
  ```

  ### Send the transaction to the relay

  ```typescript
  const response = await relayKit.executeTransaction({
    executable: signedSafeTransaction,
    options
  })

  console.log(`Relay Transaction Task ID: https://relay.gelato.digital/tasks/status/${response.taskId}`)
  ```

</Steps>

## Gelato SyncFee

[Gelato SyncFee](https://docs.gelato.network/developer-services/relay/quick-start/callwithsyncfee) allows you to execute a transaction and pay the gas fees directly with funds in your Safe, even if you don't have ETH or the native blockchain token.

For the SyncFee quickstart tutorial, you will use the Gelato relayer to pay for the gas fees on the BNB Chain using the BNB you hold in your Safe. No need to have funds on your signer.

<Steps>

  ### Imports

  ```typescript
  import { ethers } from 'ethers'
  import { GelatoRelayPack } from '@safe-global/relay-kit'
  import Safe from '@safe-global/protocol-kit'
  import { MetaTransactionData } from '@safe-global/types-kit'
  ```

  ### Initialize the transaction settings

  Modify the variables to customize to match your desired transaction settings.

  ```typescript
  // https://chainlist.org
  const RPC_URL = 'https://endpoints.omniatech.io/v1/bsc/mainnet/public'
  const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY
  const safeAddress = '0x...' // Safe from which the transaction will be sent

  // Any address can be used for destination. In this example, we use vitalik.eth
  const destinationAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  const withdrawAmount = ethers.parseUnits('0.005', 'ether').toString()
  ```

  ### Create a transaction

  ```typescript
  // Create a transactions array with one transaction object
  const transactions: MetaTransactionData[] = [{
    to: destinationAddress,
    data: '0x',
    value: withdrawAmount
  }]
  ```

  ### Instantiate the Protocol Kit and Relay Kit

  ```typescript
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: OWNER_PRIVATE_KEY,
    safeAddress
  })

  const relayKit = new GelatoRelayPack({ protocolKit })
  ```

  ### Prepare the transaction

  ```typescript
  const safeTransaction = await relayKit.createTransaction({ transactions })

  const signedSafeTransaction = await protocolKit.signTransaction(safeTransaction)
  ```

  ### Send the transaction to the relay

  ```typescript
  const response = await relayKit.executeTransaction({
    executable: signedSafeTransaction  
  })

  console.log(`Relay Transaction Task ID: https://relay.gelato.digital/tasks/status/${response.taskId}`)
  ```

</Steps>

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/relay-kit/guides/_meta.json`:

```json
{
  "4337-safe-sdk": "ERC-4337 Safe SDK",
  "gelato-relay": "Gelato Relay",
  "migrate-to-v2": "Migrate to v2",
  "migrate-to-v3": "Migrate to v3"
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/relay-kit/_meta.json`:

```json
{
    "guides": "Guides",
    "reference": "Reference"
}
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/migrate-to-v5.md`:

```md
# Migrate to v5

This guide references the major changes between v4 and v5 to help those migrating an existing app.

## Removing `SafeFactory` class

The `SafeFactory` class, previously used for deploying Safes, has been removed. The functionality to deploy Safes is now directly available in the `Safe` class through the new `createSafeDeploymentTransaction` method.

### Old Method Using `SafeFactory`

```typescript
// old v4 code
import { SafeFactory, SafeAccountConfig } from '@safe-global/protocol-kit'

const safeFactory = await SafeFactory.init({
   provider,
   signer,
   safeVersion // Optional
})

const safeAccountConfig: SafeAccountConfig = {
   owners: ['0x...', '0x...', '0x...'],
   threshold: 2
}

const protocolKit = await safeFactory.deploySafe({
  safeAccountConfig,
  saltNonce // Optional
})

// Confirm the Safe is deployed and fetch properties
console.log('Is Safe deployed:', await protocolKit.isSafeDeployed())
console.log('Safe Address:', await protocolKit.getAddress())
console.log('Safe Owners:', await protocolKit.getOwners())
console.log('Safe Threshold:', await protocolKit.getThreshold())
```

### New Method Using `Safe` class

```typescript
// new v5 code
import Safe, { PredictedSafeProps } from '@safe-global/protocol-kit'

const predictedSafe: PredictedSafeProps = {
  safeAccountConfig: {
    owners: ['0x...', '0x...', '0x...'],
    threshold: 2
  },
  safeDeploymentConfig: {
    saltNonce, // Optional
    safeVersion // Optional
  }
}

let protocolKit = await Safe.init({
  provider,
  signer,
  predictedSafe
})

// you can predict the address of your Safe if the Safe version is `v1.3.0` or above
const safeAddress = await protocolKit.getAddress()

const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction()

// Execute this transaction using the integrated signer or your preferred external Ethereum client
const client = await protocolKit.getSafeProvider().getExternalSigner()

const txHash = await client.sendTransaction({
  to: deploymentTransaction.to,
  value: BigInt(deploymentTransaction.value),
  data: deploymentTransaction.data as `0x${string}`,
  chain: sepolia
})

const txReceipt = await client.waitForTransactionReceipt({ hash: txHash })

// Reconnect to the newly deployed Safe using the protocol-kit
protocolKit = await protocolKit.connect({ safeAddress })

// Confirm the Safe is deployed and fetch properties
console.log('Is Safe deployed:', await protocolKit.isSafeDeployed())
console.log('Safe Address:', await protocolKit.getAddress())
console.log('Safe Owners:', await protocolKit.getOwners())
console.log('Safe Threshold:', await protocolKit.getThreshold())
```

### Predict the Safe Address

You can predict the address of a Safe account before its deployment, as long as you are using Safe `v1.3.0` or greater, by replacing the `SafeFactory.predictSafeAddress` method with the `Safe.getAddress` method:

```typescript
// old v4 code
const predictedSafeAddress = await safeFactory.predictSafeAddress(
  safeAccountConfig,
  saltNonce  // optional
)

// new v5 code
const predictedSafeAddress = await protocolKit.getAddress()
```

### Migration Steps

- Remove any import or reference of the `SafeFactory` class from your code.
- Replace the `SafeFactory.deploySafe` method with the `Safe.createSafeDeploymentTransaction` method where necessary. You can use your Ethereum client to execute this deployment transaction.
- To predict the Address of your Safe Account, replace the `SafeFactory.predictSafeAddress` method with the `Safe.getAddress` method.
- After the deployment transaction has been executed, it is necessary to reconnect the Protocol Kit instance to the newly created Safe address by using the `connect` method.

The removal of `SafeFactory` means there’s one less class to initialize and manage within your project. You can now directly use the `Safe` class to handle all operations related to Safes, including their deployment.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/execute-transactions.mdx`:

```mdx
import { Steps, Tabs } from 'nextra/components'

# Execute transactions

In this guide, you will learn how to create Safe transactions, sign them, collect the signatures from the different owners, and execute them.

See the [Protocol Kit reference](../../../reference-sdk-protocol-kit/overview.mdx) to find more details and configuration options.

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
- An existing Safe with several signers.

## Install dependencies

First, you need to install some dependencies.

{/* <!-- vale off --> */}

```bash
pnpm add @safe-global/api-kit \
  @safe-global/protocol-kit \
  @safe-global/types-kit
```

{/* <!-- vale on --> */}

## Steps

<Steps>

  ### Imports

  Here are all the necessary imports for this guide.

  {/* <!-- vale off --> */}

  ```typescript
  import SafeApiKit from '@safe-global/api-kit'
  import Safe from '@safe-global/protocol-kit'
  import {
    MetaTransactionData,
    OperationType
  } from '@safe-global/types-types'
  ```

  {/* <!-- vale on --> */}

  ### Setup

  You need a Safe account setup with two or more signers and threshold two, so at least multiple signatures have to be collected when executing a transaction.

  This example uses private keys, but any EIP-1193 compatible signers can be used.

  {/* <!-- vale off --> */}

  ```typescript
  const SAFE_ADDRESS = // ...

  const OWNER_1_ADDRESS = // ...
  const OWNER_1_PRIVATE_KEY = // ...

  const OWNER_2_PRIVATE_KEY = // ...

  const RPC_URL = 'https://eth-sepolia.public.blastapi.io'
  ```

  {/* <!-- vale on --> */}

  This guide uses Sepolia, but you can use any chain from the Safe Transaction Service [supported networks](../../../advanced/smart-account-supported-networks.mdx?service=Transaction+Service&service=Safe{Core}+SDK).

  ### Initialize the Protocol Kit

  To handle transactions and signatures, you need to create an instance of the Protocol Kit with the `provider`, `signer` and `safeAddress`.

  Optionally, you can [track your Safe transactions on-chain](../../onchain-tracking.mdx) by using the `onchainAnalytics` property.

  {/* <!-- vale off --> */}

  ```typescript
  const protocolKitOwner1 = await Safe.init({
    provider: RPC_URL,
    signer: OWNER_1_PRIVATE_KEY,
    safeAddress: SAFE_ADDRESS,
    onchainAnalytics // Optional
  })
  ```

  {/* <!-- vale on --> */}

  ### Create a transaction

  Create a `safeTransactionData` object with the properties of the transaction, add it to an array of transactions you want to execute, and pass it to the `createTransaction` method.

  {/* <!-- vale off --> */}

  ```typescript
  const safeTransactionData: MetaTransactionData = {
    to: '0x',
    value: '1', // 1 wei
    data: '0x',
    operation: OperationType.Call
  }

  const safeTransaction = await protocolKitOwner1.createTransaction({
    transactions: [safeTransactionData]
  })
  ```

  {/* <!-- vale on --> */}

  For more details on what to include in a transaction, see the [`createTransaction`](../reference/safe.mdx#createtransaction) method in the reference.

  ### Propose the transaction

  Before a transaction can be executed, the signer who creates it needs to send it to the Safe Transaction Service so that it is accessible by the other owners, who can then give their approval and sign the transaction.

  Firstly, you need to create an instance of the API Kit. In chains where the [Safe Transaction Service](../../../core-api/transaction-service-overview.mdx) is supported, it's enough to specify the `chainId` property.

  {/* <!-- vale off --> */}

  ```typescript
  const apiKit = new SafeApiKit({
    chainId: 11155111n
  })
  ```

  {/* <!-- vale on --> */}

  You need to calculate the Safe transaction hash, sign the transaction hash, and call the `proposeTransaction` method from the API Kit instance to propose a transaction.

  For a full list and description of the properties see [`proposeTransaction`](../../../reference-sdk-api-kit/proposetransaction.mdx) in the API Kit reference.

  {/* <!-- vale off --> */}

  ```typescript
  // Deterministic hash based on transaction parameters
  const safeTxHash = await protocolKitOwner1.getTransactionHash(safeTransaction)

  // Sign transaction to verify that the transaction is coming from owner 1
  const senderSignature = await protocolKitOwner1.signHash(safeTxHash)

  await apiKit.proposeTransaction({
    safeAddress,
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress: OWNER_1_ADDRESS,
    senderSignature: senderSignature.data
  })
  ```

  {/* <!-- vale on --> */}

  ### Retrieve the pending transactions

  The other signers need to retrieve the pending transactions from the Safe Transaction Service. Depending on the situation, different methods in the API Kit are available.

  Call the [`getPendingTransactions`](../../../reference-sdk-api-kit/getpendingtransactions.mdx) method to retrieve all the pending transactions of a Safe account.

  {/* <!-- vale off --> */}

  ```typescript
  const pendingTransactions = (await apiKit.getPendingTransactions(safeAddress)).results
  ```

  {/* <!-- vale on --> */}

  ### Confirm the transaction

  Once a signer has the pending transaction, they need to sign it with the Protocol Kit and submit the signature to the service using the [`confirmTransaction`](../../../reference-sdk-api-kit/confirmtransaction.mdx) method.

  {/* <!-- vale off --> */}

  ```typescript
  const protocolKitOwner2 = await Safe.init({
    provider: RPC_URL,
    signer: OWNER_2_PRIVATE_KEY,
    safeAddress: SAFE_ADDRESS
    })

      const safeTxHash = transaction.transactionHash
      const signature = await protocolKitOwner2.signHash(safeTxHash)

      // Confirm the Safe transaction
      const signatureResponse = await apiKit.confirmTransaction(
    safeTxHash,
    signature.data
  )
  ```

  {/* <!-- vale on --> */}

  ### Execute the transaction

  The Safe transaction is now ready to be executed. This can be done using the [Safe\{Wallet\}](https://app.safe.global) web interface, the [Protocol Kit](../../../reference-sdk-protocol-kit/transactions/executetransaction.mdx), the [Safe CLI](../../../advanced/cli-reference/tx-service-commands.mdx#execute-pending-transaction) or any other tool that's available.

  In this guide, the first signer will get the transaction from the service by calling the [`getTransaction`](../../../reference-sdk-api-kit/gettransaction.mdx) method and execute it by passing the transaction with all the signatures to the [`executeTransaction`](../../../reference-sdk-protocol-kit/transactions/executetransaction.mdx) method.

  {/* <!-- vale off --> */}

  ```typescript
  const safeTransaction = await apiKit.getTransaction(safeTxHash)
  const executeTxResponse = await protocolKitOwner1.executeTransaction(safeTransaction)
  ```

  {/* <!-- vale on --> */}

</Steps>

## Recap and further reading

After following this guide, you are able to create, sign, and execute Safe transactions with the Protocol Kit and share the signatures with the different signers using the API Kit.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/migrate-to-v1.md`:

```md
# Migrate to v1

This guide references the major changes between `safe-core-sdk` and `protocol-kit` v1 to help those migrating an existing application.

**Note:** Follow this guide before migrating to `protocol-kit` v2.

You can remove `@safe-global/safe-core-sdk` from your `package.json` after completing this guide.

## Adding the new dependency

To add the Protocol Kit to your project, run the following:

```bash
yarn add @safe-global/protocol-kit@1.3.0
```

If you use the types library, you will need to update to v2.3.0:

```bash
yarn add @safe-global/safe-core-sdk-types@2.3.0
```

## `EthAdapter`

### `EthersAdapter` (safe-ethers-lib)

`EthersAdapter` isn't in a separate package anymore. Now, it's provided inside the `protocol-kit` package.

**`protocol-kit v1` only supports `ethers v5`**

```typescript
// old
import EthersAdapter from '@safe-global/safe-ethers-lib'

// new
import { EthersAdapter } from '@safe-global/protocol-kit'
```

After this change, you can remove `@safe-global/safe-ethers-lib` from your `package.json`.

### `Web3Adapter` (safe-web3-lib)

`Web3Adapter` isn't in a separate package anymore. Now, it's part of the `protocol-kit` package.

**Note:** `protocol-kit` v1 only supports Web3.js v1.

```typescript
// old
import Web3Adapter from '@safe-global/safe-web3-lib'

// new
import { Web3Adapter } from '@safe-global/protocol-kit'
```

After this change, you can remove `@safe-global/safe-web3-lib` from your `package.json`.

### Type changes

Type changes are affecting the web3 and ethers adapter libraries.

`getSafeContract`, `getMultisendContract`, `getMultisendCallOnlyContract`, `getCompatibilityFallbackHandlerContract`, `getSafeProxyFactoryContract`, `getSignMessageLibContract` and `getCreateCallContract` don't need the `chainId` parameter anymore, they will use the chain set on the provider. Also, they return a `Promise` now.

`estimateGas` now returns a `string` instead of a `number`.

## `safeFactory.deploySafe()`

`SafeDeploymentConfig` was simplified. If you were using a `saltNonce` you should set it like this:

```typescript
// old
const safeAccountConfig: SafeAccountConfig = {
  ...
}
const safeDeploymentConfig: SafeDeploymentConfig = { saltNonce }

const safeSdk = await safeFactory.deploySafe({ safeAccountConfig, safeDeploymentConfig })

// new
const safeAccountConfig: SafeAccountConfig = {
  ...
}

const saltNonce = '<YOUR_CUSTOM_VALUE>'

const protocolKit = await safeFactory.deploySafe({ safeAccountConfig, saltNonce })
```

## `getAddress()`

The `getAddress()` method now returns a `Promise`.

```typescript
// old
const safeAddress = safeSdk.getAddress()

// new
const safeAddress = await protocolKit.getAddress()
```

## General type changes

If you set `safeTxGas`, `baseGas`, or `gasPrice`, you must use the type `string` instead of `number`.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/multichain-safe-deployment.mdx`:

```mdx
import { Steps } from 'nextra/components'

# Multichain Safe Deployment

This guide will teach you how to replicate a Safe address across different chains using the Protocol Kit. This process includes initializing the Protocol Kit, configuring the Safes to deploy, predicting its address on different chains, and executing the deployment transactions.

For more detailed information, see the [Protocol Kit Reference](../../../reference-sdk-protocol-kit/overview.mdx).

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Install dependencies

First, you need to install the Protocol Kit.

{/* <!-- vale off --> */}

```bash
pnpm add @safe-global/protocol-kit viem
```

{/* <!-- vale on --> */}

## Steps

<Steps>

  ### Imports

  Here are all the necessary imports for this guide.

  {/* <!-- vale off --> */}

  ```typescript
  import Safe, {
    PredictedSafeProps,
    SafeAccountConfig,
    SafeDeploymentConfig
  } from '@safe-global/protocol-kit'
  import { waitForTransactionReceipt } from 'viem/actions'
  import { gnosisChiado, sepolia } from 'viem/chains'
  ```

  {/* <!-- vale on --> */}

  ### Create a signer

  You need a signer to instantiate the Protocol Kit. This example uses a private key to obtain a signer, but other [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) compatible signers are also supported. For detailed information about signers, please refer to the [Protocol Kit reference](../../../reference-sdk-protocol-kit/overview.mdx).

  {/* <!-- vale off --> */}

  ```typescript
  const SIGNER_PRIVATE_KEY = // ...
  ```

  {/* <!-- vale on --> */}

  ### Configure the Safe deployment

  Define the [`predictedSafe`](../../../reference-sdk-protocol-kit/initialization/init.mdx#predictedsafe-optional) object with the configuration for all the Safe accounts you will deploy. Check the reference to learn about all the different configuration options.

  {/* <!-- vale off --> */}

  ```typescript
  const safeAccountConfig: SafeAccountConfig = {
    owners: ['0x...', '0x...', '0x...'],
    threshold: 2
    // ...
  }

  const predictedSafe: PredictedSafeProps = {
    safeAccountConfig
    // ...
  }
  ```

  {/* <!-- vale on --> */}

  ### Initialize the Protocol Kit

  Initialize an instance of the Protocol Kit for each network where you want to deploy a new Safe smart account by calling the [`init`](../../../reference-sdk-protocol-kit/initialization/init.mdx) method. Pass the `provider` with its corresponding value depending on the network, the `signer` executing the deployment, and the [`predictedSafe`](../../../reference-sdk-protocol-kit/initialization/init.mdx#predictedsafe-optional) with the Safe account configuration.

  {/* <!-- vale off --> */}

  ```typescript
  const protocolKitSepolia = await Safe.init({
    provider: sepolia.rpcUrls.default.http[0],
    signer: SIGNER_PRIVATE_KEY,
    predictedSafe,
    onchainAnalytics // Optional
    // ...
  })
  
  const protocolKitChiado = await Safe.init({
    provider: gnosisChiado.rpcUrls.default.http[0],
    signer: PRIVATE_KEY,
    predictedSafe,
    onchainAnalytics // Optional
    // ...
  })
  ```

  {/* <!-- vale on --> */}

  Optionally, you can [track your Safe deployments and transactions on-chain](../../onchain-tracking.mdx) by using the `onchainAnalytics` property.

  ### Predict the Safe addresses

  You can predict the Safe addresses by calling the [`getAddress`](../../../reference-sdk-protocol-kit/safe-info/getaddress.mdx) method from each Protocol Kit instance and ensure that the result addresses are the same.

  {/* <!-- vale off --> */}

  ```typescript
  const sepoliaPredictedSafeAddress = await protocolKitSepolia.getAddress()
  const chiadoPredictedSafeAddress = await protocolKitChiado.getAddress()
  ```

  {/* <!-- vale on --> */}

  ### Deployment on Sepolia

  Create the deployment transaction to deploy a new Safe account in Sepolia by calling the [`createSafeDeploymentTransaction`](../../../reference-sdk-protocol-kit/deployment/createsafedeploymenttransaction.mdx) method.
  
  {/* <!-- vale off --> */}

  ```typescript
  const sepoliaDeploymentTransaction =
    await protocolKitSepolia.createSafeDeploymentTransaction()
  ```
  
  {/* <!-- vale on --> */}

  Call the `sendTransaction` method from your Sepolia client instance and wait for the transaction to be executed.

  {/* <!-- vale off --> */}

  ```typescript
  const sepoliaClient =
    await protocolKitSepolia.getSafeProvider().getExternalSigner()

  const transactionHashSepolia = await sepoliaClient!.sendTransaction({
    to: sepoliaDeploymentTransaction.to,
    value: BigInt(sepoliaDeploymentTransaction.value),
    data: sepoliaDeploymentTransaction.data as `0x${string}`,
    chain: sepolia
  })

  await waitForTransactionReceipt(
    sepoliaClient!,
    { hash: transactionHashSepolia }
  )
  ```

  {/* <!-- vale on --> */}

  Once the deployment transaction is executed, connect the new Safe address to the Protocol Kit instance by calling the [`connect`](../../../reference-sdk-protocol-kit/initialization/connect.mdx) method.

  {/* <!-- vale off --> */}

  ```typescript
  const newProtocolKitSepolia = await protocolKitSepolia.connect({
    safeAddress: sepoliaPredictedSafeAddress
  })

  const isSepoliaSafeDeployed = await newProtocolKitSepolia.isSafeDeployed() // True
  const sepoliaDeployedSafeAddress = await newProtocolKitSepolia.getAddress()
  ```

  {/* <!-- vale on --> */}

  If everything went well, `isSepoliaSafeDeployed` should be `true`, and the `sepoliaDeployedSafeAddress` should equal the `sepoliaPredictedSafeAddress`.

  ### Deployment on Chiado

  Repeat the same steps to deploy a Safe with the same configuration on Chiado testnet.

  {/* <!-- vale off --> */}

  ```typescript
  const chiadoDeploymentTransaction =
    await protocolKitChiado.createSafeDeploymentTransaction()

  const chiadoClient =
    await protocolKitChiado.getSafeProvider().getExternalSigner()

  const transactionHashChiado = await chiadoClient!.sendTransaction({
    to: chiadoDeploymentTransaction.to,
    value: BigInt(chiadoDeploymentTransaction.value),
    data: chiadoDeploymentTransaction.data as `0x${string}`,
    chain: gnosisChiado
  })

  await waitForTransactionReceipt(
    chiadoClient!,
    { hash: transactionHashChiado }
  )

  const newProtocolKitChiado = await protocolKitChiado.connect({
    safeAddress: chiadoPredictedSafeAddress
  })

  const isChiadoSafeDeployed = await newProtocolKitChiado.isSafeDeployed() // True
  const chiadoDeployedSafeAddress = await newProtocolKitChiado.getAddress()
  ```

  {/* <!-- vale on --> */}

  If everything went well, `isChiadoSafeDeployed` should be `true`, and the `chiadoDeployedSafeAddress` should equal the `chiadoPredictedSafeAddress`.

  In addition, `chiadoDeployedSafeAddress` and `sepoliaDeployedSafeAddress` should have the same value.

</Steps>

## Recap and further reading

After following this guide, you are able to deploy multiple Safe accounts with the same address on different chains using the Protocol Kit.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/safe-deployment.mdx`:

```mdx
import { Steps } from 'nextra/components'

# Safe Deployment

This guide will teach you how to deploy a new Safe using the Protocol Kit. This process includes initializing the Protocol Kit, setting up your Safe configuration, and executing the deployment.

For more detailed information, see the [Protocol Kit Reference](../../../reference-sdk-protocol-kit/overview.mdx).

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Install dependencies

First, you need to install some dependencies.

{/* <!-- vale off --> */}

```bash
pnpm add @safe-global/protocol-kit viem
```

{/* <!-- vale on --> */}

## Steps

<Steps>

  ### Imports

  Here are all the necessary imports for this guide.

  {/* <!-- vale off --> */}

  ```typescript
  import Safe, {
    PredictedSafeProps,
    SafeAccountConfig,
    SafeDeploymentConfig
  } from '@safe-global/protocol-kit'
  import { sepolia } from 'viem/chains'
  ```

  {/* <!-- vale on --> */}

  ### Create a signer

  You need a signer to instantiate the Protocol Kit. This example uses a private key to obtain a signer, but [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) compatible signers are also supported. For detailed information about signers, please refer to the [Protocol Kit reference](../../../reference-sdk-protocol-kit/overview.mdx).

  {/* <!-- vale off --> */}

  ```typescript
  const SIGNER_PRIVATE_KEY = // ...
  ```

  {/* <!-- vale on --> */}

  ### Initialize the Protocol Kit
  
  Initialize an instance of the Protocol Kit for each network where you want to deploy a new Safe smart account by calling the [`init`](../../../reference-sdk-protocol-kit/initialization/init.mdx) method. Pass the `provider` with its corresponding value depending on the network, the `signer` executing the deployment, and the [`predictedSafe`](../../../reference-sdk-protocol-kit/initialization/init.mdx#predictedsafe-optional) with the Safe account configuration.

  Optionally, you can [track your Safe deployments and transactions on-chain](../../onchain-tracking.mdx) by using the `onchainAnalytics` property.

  {/* <!-- vale off --> */}

  ```typescript
  const safeAccountConfig: SafeAccountConfig = {
    owners: ['0x...', '0x...', '0x...'],
    threshold: 2
    // More optional properties
  }

  const predictedSafe: PredictedSafeProps = {
    safeAccountConfig
    // More optional properties
  }

  const protocolKit = await Safe.init({
    provider: sepolia.rpcUrls.default.http[0],
    signer: SIGNER_PRIVATE_KEY,
    predictedSafe,
    onchainAnalytics // Optional
  })
  ```

  {/* <!-- vale on --> */}

  ### Predict the Safe address

  You can predict the Safe address using the [`getAddress`](../../../reference-sdk-protocol-kit/safe-info/getaddress.mdx) method in the Protocol Kit.

  {/* <!-- vale off --> */}

  ```typescript
  const safeAddress = await protocolKit.getAddress()
  ```

  {/* <!-- vale on --> */}

  ### Create the deployment transaction

  Create the deployment transaction to deploy a new Safe smart account by calling the [`createSafeDeploymentTransaction`](../../../reference-sdk-protocol-kit/deployment/createsafedeploymenttransaction.mdx) method.

  {/* <!-- vale off --> */}

  ```typescript
  const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction()
  ```

  {/* <!-- vale on --> */}

  ### Execute the deployment transaction

  Once the deployment transaction object is ready, execute it using the provided signer or your preferred external Ethereum client.

  {/* <!-- vale off --> */}

  ```typescript
  const client = await protocolKit.getSafeProvider().getExternalSigner()

  const transactionHash = await client.sendTransaction({
    to: deploymentTransaction.to,
    value: BigInt(deploymentTransaction.value),
    data: deploymentTransaction.data as `0x${string}`,
    chain: sepolia
  })

  const transactionReceipt = await client.waitForTransactionReceipt({
    hash: transactionHash
  })
  ```

  {/* <!-- vale on --> */}

  ### Reinitialize the Protocol Kit

  Once the deployment transaction is executed, connect the new Safe address to the Protocol Kit instance by calling the [`connect`](../../../reference-sdk-protocol-kit/initialization/connect.mdx) method.

  {/* <!-- vale off --> */}

  ```typescript
  const newProtocolKit = await protocolKit.connect({
    safeAddress
  })

  const isSafeDeployed = await newProtocolKit.isSafeDeployed() // True
  const safeAddress = await newProtocolKit.getAddress()
  const safeOwners = await newProtocolKit.getOwners()
  const safeThreshold = await newProtocolKit.getThreshold()
  ```

  {/* <!-- vale on --> */}

</Steps>

## Recap and further reading

After following this guide, you are able to deploy new Safe smart accounts with the Protocol Kit.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/migrate-to-v3.md`:

```md
# Migrate to v3

This guide references the major changes between v2 and v3 to help those migrating an existing app.

**Note:** When upgrading to `protocol-kit` v3, it's necessary to upgrade to `safe-core-sdk-types` v4.

## The signTransactionHash() was renamed signHash()

The `signTransactionHash()` method was renamed to `signHash()` to align with the method's purpose. The method is not strictly for transactions, as the parameter is a hash, so the new name is more accurate.

```js
// old:
protocolKit.signTransactionHash(safeTxHash)

// new:
protocolKit.signHash(safeTxHash)
```

## Type changes

The `SafeTransactionEIP712Args` was renamed `SafeEIP712Args` as the EIP-712 is not exclusive for transactions.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/migrate-to-v2.md`:

```md
# Migrate to v2

This guide references the major changes between v1 and v2 to help those migrating an existing app.

**Note:** When upgrading to `protocol-kit` v2, it's necessary to upgrade to `safe-core-sdk-types` v3.

## MasterCopy to Singleton

To avoid confusion between terms used as synonyms, we aligned all our code to use the word `singleton`.

- Rename `isL1SafeMasterCopy` to `isL1SafeSingleton`
```js
// old:
SafeFactory.create({ ethAdapter, isL1SafeMasterCopy: true })

// new:
SafeFactory.create({ ethAdapter, isL1SafeSingleton: true })
```

## Ethers v6

From `protocolKit v2`, `EthersAdapter` will only be compatible with ethers.js v6. If you still need to use v5, we recommend you keep `protocolKit v1`, but we encourage you to migrate to the latest version when you can.

## Protocol Kit createTransaction() accepts only transaction array

In `protocolKit v1`, the `createTransaction()` method accepted either an object or an array as a parameter. To avoid confusion, we changed it to accept only an array. Here is a migration example:

```js
// old:
const safeTransactionData = {
  to: '',
  data: '',
  value: '',
  nonce: '',
  safeTxGas: ''
}
const safeTransaction = protocolKit.createTransaction({ safeTransactionData })

// new:
const safeTransactionData = {
  to: '',
  data: '',
  value: ''
}
const options = {
  nonce: '',
  safeTxGas: ''
}
const safeTransaction = protocolKit.createTransaction({
  transactions: [safeTransactionData],
  options
})
```

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/signatures/messages.mdx`:

```mdx
import { Callout, Steps } from 'nextra/components'

# Message signatures

Using the Protocol Kit, this guide explains how to generate and sign messages from a Safe account, including plain string messages and EIP-712 JSON messages.

<Callout type='info' emoji='ℹ️'>
  Before starting, check this guide's [setup](../signatures.md).
</Callout>

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Steps

<Steps>

  ### Install dependencies

  ```bash
  yarn install @safe-global/protocol-kit
  ```

  ### Create a message

  Messages can be plain strings or valid EIP-712 typed data structures.

  ```typescript
  // An example of a string message
  const STRING_MESSAGE = "I'm the owner of this Safe account"
  ```

  ```typescript
  // An example of a typed data message
  const TYPED_MESSAGE = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' }
      ],
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallets', type: 'address[]' }
      ],
      Mail: [
        { name: 'from', type: 'Person' },
        { name: 'to', type: 'Person[]' },
        { name: 'contents', type: 'string' }
      ]
    },
    domain: {
      name: 'Ether Mail',
      version: '1',
      chainId: Number(chainId),
      verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
    },
    primaryType: 'Mail',
    message: {
      from: {
        name: 'Cow',
        wallets: [
          '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
          '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF'
        ]
      },
      to: [
        {
          name: 'Bob',
          wallets: [
            '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
            '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
            '0xB0B0b0b0b0b0B000000000000000000000000000'
          ]
        }
      ],
      contents: 'Hello, Bob!'
    }
  }
  ```

  The `createMessage` method in the Protocol Kit allows for creating new messages and returns an instance of the `EthSafeMessage` class. Here, we are passing `TYPED_MESSAGE`, but `STRING_MESSAGE` could also be passed.

  ```typescript
  let safeMessage = protocolKit.createMessage(TYPED_MESSAGE)
  ```

  The returned `safeMessage` object contains the message data (`safeMessage.data`) and a map of owner-signature pairs (`safeMessage.signatures`). The structure is similar to the `EthSafeTransaction` class but applied for messages instead of transactions.

  We use `let` to initialize the `safeMessage` variable because we will add the signatures later.

  ```typescript
  class EthSafeMessage implements SafeMessage {
    data: EIP712TypedData | string
    signatures: Map<string, SafeSignature> = new Map()
    ...
    // Other props and methods
  }
  ```

  ### Sign the message

  Once the `safeMessage` object is created, we need to collect the signatures from the signers who will sign it.

  Following our [setup](../signatures.md), we will sign a message with `SAFE_3_4_ADDRESS`, the main Safe account in this guide. To do that, we first need to sign the same message with its owners: `OWNER_1_ADDRESS`, `OWNER_2_ADDRESS`, `SAFE_1_1_ADDRESS`, and `SAFE_2_3_ADDRESS`.

  #### ECDSA signatures

  This applies to `OWNER_1_ADDRESS` and `OWNER_2_ADDRESS` accounts, as both are EOAs.

  The `signMessage` method takes the `safeMessage` together with a `SigningMethod` and adds the new signature to the `signMessage.signatures` map. Depending on the type of message, the `SigningMethod` can take these values:
  - `SigningMethod.ETH_SIGN`
  - `SigningMethod.ETH_SIGN_TYPED_DATA_V4`

  ```typescript
  // Connect OWNER_1_ADDRESS
  protocolKit = await protocolKit.connect({
    provider: RPC_URL
    signer: OWNER_1_PRIVATE_KEY
  })

  // Sign the safeMessage with OWNER_1_ADDRESS
  // After this, the safeMessage contains the signature from OWNER_1_ADDRESS
  safeMessage = await protocolKit.signMessage(
    safeMessage,
    SigningMethod.ETH_SIGN_TYPED_DATA_V4
  )

  // Connect OWNER_2_ADDRESS
  protocolKit = await protocolKit.connect({
    provider: RPC_URL
    signer: OWNER_2_PRIVATE_KEY
  })

  // Sign the safeMessage with OWNER_2_ADDRESS
  // After this, the safeMessage contains the signature from OWNER_1_ADDRESS and OWNER_2_ADDRESS
  safeMessage = await protocolKit.signMessage(
    safeMessage,
    SigningMethod.ETH_SIGN_TYPED_DATA_V4
  )
  ```

  #### Smart contract signatures

  When signing with a Safe account, the `SigningMethod` will take the value `SigningMethod.SAFE_SIGNATURE`.

  ##### 1/1 Safe account

  This applies to the `SAFE_1_1_ADDRESS` account, another owner of `SAFE_3_4_ADDRESS`.

  We need to connect the Protocol Kit to `SAFE_1_1_ADDRESS` and the `OWNER_3_ADDRESS` account (the only owner of `SAFE_1_1_ADDRESS`) and sign the message.

  ```typescript
  // Create a new message object
  let messageSafe1_1 = await createMessage(TYPED_MESSAGE)

  // Connect OWNER_3_ADDRESS and SAFE_1_1_ADDRESS
  protocolKit = await protocolKit.connect({
    provider: RPC_URL
    signer: OWNER_3_PRIVATE_KEY,
    safeAddress: SAFE_1_1_ADDRESS
  })

  // Sign the messageSafe1_1 with OWNER_3_ADDRESS
  // After this, the messageSafe1_1 contains the signature from OWNER_3_ADDRESS
  messageSafe1_1 = await signMessage(
    messageSafe1_1,
    SigningMethod.SAFE_SIGNATURE,
    SAFE_3_4_ADDRESS // Parent Safe address
  )

  // Build the contract signature of SAFE_1_1_ADDRESS
  const signatureSafe1_1 = await buildContractSignature(
    Array.from(messageSafe1_1.signatures.values()),
    SAFE_1_1_ADDRESS
  )

  // Add the signatureSafe1_1 to safeMessage
  // After this, the safeMessage contains the signature from OWNER_1_ADDRESS, OWNER_2_ADDRESS and SAFE_1_1_ADDRESS
  safeMessage.addSignature(signatureSafe1_1)
  ```

  When signing with a child Safe account, we need to specify the parent Safe address to generate the signature based on the version of the contract.

  ##### 2/3 Safe account

  This applies to the `SAFE_2_3_ADDRESS` account, another owner of `SAFE_3_4_ADDRESS`.

  We need to connect the Protocol Kit to `SAFE_2_3_ADDRESS` and the `OWNER_4_ADDRESS` and `OWNER_5_ADDRESS` accounts (owners of `SAFE_2_3_ADDRESS`) and sign the message.

  ```typescript
  // Create a new message object
  let messageSafe2_3 = await createMessage(TYPED_MESSAGE)

  // Connect OWNER_4_ADDRESS and SAFE_2_3_ADDRESS
  protocolKit = await protocolKit.connect({
    provider: RPC_URL,
    signer: OWNER_4_PRIVATE_KEY,
    safeAddress: SAFE_2_3_ADDRESS
  })

  // Sign the messageSafe2_3 with OWNER_4_ADDRESS
  // After this, the messageSafe2_3 contains the signature from OWNER_4_ADDRESS
  messageSafe2_3 = await protocolKit.signMessage(
    messageSafe2_3,
    SigningMethod.SAFE_SIGNATURE,
    SAFE_3_4_ADDRESS // Parent Safe address
  )

  // Connect OWNER_5_ADDRESS
  protocolKit = await protocolKit.connect({
    provider: RPC_URL,
    signer: OWNER_5_PRIVATE_KEY
  })

  // Sign the messageSafe2_3 with OWNER_5_ADDRESS
  // After this, the messageSafe2_3 contains the signature from OWNER_5_ADDRESS
  messageSafe2_3 = await protocolKit.signMessage(
    messageSafe2_3,
    SigningMethod.SAFE_SIGNATURE,
    SAFE_3_4_ADDRESS // Parent Safe address
  )

  // Build the contract signature of SAFE_2_3_ADDRESS
  const signatureSafe2_3 = await buildContractSignature(
    Array.from(messageSafe2_3.signatures.values()),
    SAFE_2_3_ADDRESS
  )

  // Add the signatureSafe2_3 to safeMessage
  // After this, the safeMessage contains the signature from OWNER_1_ADDRESS, OWNER_2_ADDRESS, SAFE_1_1_ADDRESS and SAFE_2_3_ADDRESS
  safeMessage.addSignature(signatureSafe2_3)
  ```

  After following all the steps above, the `safeMessage` now contains all the signatures from the owners of the Safe.

  ### Publish the signed message

  As messages aren't stored in the blockchain, we must make them public and available to others by storing them elsewhere.

  Safe messages can be stored on-chain and off-chain:

  - **Off-chain**: Messages are stored in the Safe Transaction Service. This is the default option and doesn't require any on-chain interaction.
  - **On-chain**: Messages are [stored](https://github.com/safe-global/safe-smart-account/blob/f03dfae65fd1d085224b00a10755c509a4eaacfe/contracts/Safe.sol#L68-L69) in the Safe contract.

  Safe supports signing [EIP-191](https://eips.ethereum.org/EIPS/eip-191) messages and [EIP-712](https://eips.ethereum.org/EIPS/eip-712) typed data messages all together with off-chain [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271) validation for signatures.

  #### Off-chain messages

  To use off-chain messages, we need to use the functionality from this guide and call the Safe Transaction Service API to store the messages and signatures.

  We mentioned the utility of storing messages in the contract. Off-chain messages have the same purpose, but they're stored in the Safe Transaction Service. It stores the messages and signatures in a database. It's a centralized service, but it's open-source and can be deployed by anyone.

  The Safe Transaction Service is used by [Safe\{Wallet\}](https:/app.safe.global) to store messages and signatures by default.

  ##### Propose the message

  To store a new message, we need to call the `addMessage` from the API Kit, passing the Safe address, an object with the message, and a signature from one owner.

  ```typescript
  // Get the signature from OWNER_1_ADDRESS
  const signatureOwner1 = safeMessage.getSignature(OWNER_1_PRIVATE_KEY) as EthSafeSignature

  // Instantiate the API Kit
  // Use the chainId where you have the Safe account deployed
  const apiKit = new SafeApiKit({ chainId })

  // Propose the message
  apiKit.addMessage(SAFE_3_4_ADDRESS, {
    message: TYPED_MESSAGE, // or STRING_MESSAGE
    signature: buildSignatureBytes([signatureOwner1])
  })
  ```

  The message is now publicly available in the Safe Transaction Service with the signature of the owner who submitted it.

  ##### Confirm the message

  To add the signatures from the remaining owners, we need to call the `addMessageSignature`, passing the `safeMessageHash` and a signature from the owner.

  ```typescript
  // Get the safeMessageHash
  const safeMessageHash = await protocolKit.getSafeMessageHash(
    hashSafeMessage(TYPED_MESSAGE) // or STRING_MESSAGE
  )

  // Get the signature from OWNER_2_ADDRESS
  const signatureOwner2 = safeMessage.getSignature(OWNER_2_ADDRESS) as EthSafeSignature

  // Add signature from OWNER_2_ADDRESS
  await apiKit.addMessageSignature(
    safeMessageHash,
    buildSignatureBytes([signatureOwner2])
  )

  // Add signature from the owner SAFE_1_1_ADDRESS
  await apiKit.addMessageSignature(
    safeMessageHash,
    buildSignatureBytes([signatureSafe1_1])
  )

  // Add signature from the owner SAFE_2_3_ADDRESS
  await apiKit.addMessageSignature(
    safeMessageHash,
    buildSignatureBytes([signatureSafe2_3])
  )
  ```

  At this point, the message stored in the Safe Transaction Service contains all the required signatures from the owners of the Safe.

  The `getMessage` method returns the status of a message.

  ```typescript
  const confirmedMessage = await apiKit.getMessage(safeMessageHash)
  ```

  [Safe\{Wallet\}](https://app.safe.global) exposes to its users the list of off-chain messages signed by a Safe account.

  ```
  https://app.safe.global/transactions/messages?safe=<NETWORK_PREFIX>:<SAFE_ADDRESS>
  ```

  #### On-chain messages

  Storing messages on-chain is less efficient than doing it off-chain because it requires executing a transaction to store the message hash in the contract, resulting in additional gas costs. To do this on-chain, we use the `SignMessageLib` contract.

  ```typescript
  // Get the contract with the correct version
  const signMessageLibContract = await getSignMessageLibContract({
    safeVersion: '1.4.1'
  })
  ```

  We need to calculate the `messageHash`, encode the call to the `signMessage` function in the `SignMessageLib` contract and create the transaction that will store the message hash in that contract.

  ```typescript
  const messageHash = hashSafeMessage(MESSAGE)
  const txData = signMessageLibContract.encode('signMessage', [messageHash])

  const safeTransactionData: SafeTransactionDataPartial = {
    to: signMessageLibContract.address,
    value: '0',
    data: txData,
    operation: OperationType.DelegateCall
  }

  const signMessageTx = await protocolKit.createTransaction({
    transactions: [safeTransactionData]
  })
  ```

  Once the transaction object is instantiated, the owners must sign and execute it.

  ```typescript
  // Collect the signatures using the signTransaction method

  // Execute the transaction to store the messageHash
  await protocolKit.executeTransaction(signMessageTx)
  ```

  Once the transaction is executed, the message hash will be stored in the contract.

  ### Validate the signature

  #### On-chain

  When a message is stored on-chain, the `isValidSignature` method in the Protocol Kit needs to be called with the parameters `messageHash` and `0x`. The method will check the stored hashes in the Safe contract to validate the signature.

  ```typescript
  import { hashSafeMessage } from '@safe-global/protocol-kit'

  const messageHash = hashSafeMessage(MESSAGE)

  const isValid = await protocolKit.isValidSignature(messageHash, '0x')
  ```

  #### Off-chain

  When a message is stored off-chain, the `isValidSignature` method in the Protocol Kit must be called with the `messageHash` and the `encodedSignatures` parameters. The method will check the `isValidSignature` function defined in the `CompatibilityFallbackHandler` [contract](https://github.com/safe-global/safe-smart-account/blob/f03dfae65fd1d085224b00a10755c509a4eaacfe/contracts/handler/CompatibilityFallbackHandler.sol#L51-L68) to validate the signature.

  ```typescript
  const encodedSignatures = safeMessage.encodedSignatures()

  const isValid = await protocolKit.isValidSignature(
    messageHash,
    encodedSignatures
  )
  ```

</Steps>

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/signatures/transactions.mdx`:

```mdx
import { Callout, Steps } from 'nextra/components'

# Transaction signatures

This guide explains how transactions are signed by the Safe owners using the Protocol Kit.

<Callout type='info' emoji='ℹ️'>
  Before starting, check this guide's [setup](../signatures.md).
</Callout>

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Steps

<Steps>

  ### Install dependencies

  ```bash
  yarn install @safe-global/protocol-kit
  ```

  ### Create a transaction

  The `createTransaction` method in the Protocol Kit allows the creation of new Safe transactions and returns an instance of the `EthSafeTransaction` class.

  ```typescript
  // Create a transaction to send 0.01 ETH
  const safeTransactionData: SafeTransactionDataPartial = {
    to: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
    value: '100000000000000000', // 0.01 ETH
    data: '0x'
  }

  let safeTransaction = await protocolKit.createTransaction({
    transactions: [safeTransactionData]
  })
  ```

  The returned `safeTransaction` object contains the transaction data (`safeTransaction.data`) and a map of the owner-signature pairs (`safeTransaction.signatures`). The structure is similar to the `EthSafeMessage` class but applied for transactions instead of messages.

  We use `let` to initialize the `safeTransaction` variable because we will add the signatures later.

  ```typescript
  class EthSafeTransaction implements SafeTransaction {
    data: SafeTransactionData
    signatures: Map<string, SafeSignature> = new Map()
    ...
    // Other properties and methods
  }
  ```

  ### Sign the transaction

  Once the `safeTransaction` object is created, we need to collect the signatures from the signers who will sign it.

  Following our [setup](../signatures.md), we will sign a Safe transaction from `SAFE_3_4_ADDRESS`, the main Safe account in this guide. To do that, we first need to sign the same transaction with its owners: `OWNER_1_ADDRESS`, `OWNER_2_ADDRESS`, `SAFE_1_1_ADDRESS`, and `SAFE_2_3_ADDRESS`.

  #### ECDSA signature

  This applies to `OWNER_1_ADDRESS` and `OWNER_2_ADDRESS` accounts, as both are EOAs.

  The `signTransaction` method takes the `safeTransaction` together with a `SigningMethod` and adds the new signature to the `safeTransaction.signatures` map. Depending on the type of message, the `SigningMethod` can take these values:
  - `SigningMethod.ETH_SIGN`
  - `SigningMethod.ETH_SIGN_TYPED_DATA_V4`

  ```typescript
  // Connect OWNER_1_ADDRESS
  protocolKit = await protocolKit.connect({
    provider: RPC_URL,
    signer: OWNER_1_PRIVATE_KEY
  })

  // Sign the safeTransaction with OWNER_1_ADDRESS
  // After this, the safeTransaction contains the signature from OWNER_1_ADDRESS
  safeTransaction = await protocolKit.signTransaction(
    safeTransaction,
    SigningMethod.ETH_SIGN
  )

  // Connect OWNER_2_ADDRESS
  protocolKit = await protocolKit.connect({
    provider: RPC_URL,
    signer: OWNER_2_PRIVATE_KEY
  })

  // Sign the safeTransaction with OWNER_2_ADDRESS
  // After this, the safeTransaction contains the signature from OWNER_1_ADDRESS and OWNER_2_ADDRESS
  safeTransaction = await protocolKit.signTransaction(
    safeTransaction,
    SigningMethod.ETH_SIGN_TYPED_DATA_V4
  )
  ```

  At this point, the `safeTransaction` object should look like this:

  ```typescript
  EthSafeTransaction {
    signatures: Map(2) {
      '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1' => EthSafeSignature {
        signer: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
        data: '0x969308e2abeda61a0c9c41b3c615012f50dd7456ca76ea39a18e3b975abeb67f275b07810dd59fc928f3f9103e52557c1578c7c5c171ffc983afa5306466b1261f',
        isContractSignature: false
      },
      '0xffcf8fdee72ac11b5c542428b35eef5769c409f0' => EthSafeSignature {
        signer: '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0',
        data: '0x4d63c79cf9d743782bc31ad58c1a316020b39839ab164caee7ecac9829f685cc44ec0d066a5dfe646b2ffeeb37575df131daf9c96ced41b8c7c4aea8dc5461801c',
        isContractSignature: false
      }
    },
    data: { ... }
  }
  ```

  The `signatures.data` represents a specific signature. The `isContractSignature` flag set to `false` indicates that the signature isn't a smart contract signature but an ECDSA signature instead.

  An ECDSA signature comprises two 32-byte integers (`r`, `s`) and an extra byte for recovery (`v`), totaling 65 bytes. In hexadecimal string format, each byte is represented by two characters. Hence, a 65-byte Ethereum signature will be 130 characters long. Including the `0x` prefix commonly used with signatures, the total character count for such a signature would be 132.

  Two more characters are required to represent a byte (8 bits) in hexadecimal. Each hexadecimal character represents four bits. Therefore, two hexadecimal characters (2 x 4 bits) can represent a byte (8 bits).

  The final part of the signature, either `1f` or `1c`, indicates the signature type.

  Safe supports the following `v` values:
  - `0`: Contract signature.
  - `1`: Approved hash.
  - `{27, 28} + 4`: Ethereum adjusted ECDSA recovery byte for EIP-191 signed message.
  > Regarding the EIP-191 signed message, the `v` value is adjusted to the ECDSA `v + 4`. If the generated value is `28` and adjusted to `0x1f`, the signature verification will fail as it should be `0x20` ('28 + 4 = 32`) instead. If `v > 30`, then the default `v` (`27`, `28`) was adjusted because of the `eth_sign` implementation. This calculation is automatically done by the Safe\{Core\} SDK.
  - Other: Ethereum adjusted ECDSA recovery byte for raw signed hash.

  The hexadecimal value `1f` equals the decimal number `31`. If the decimal value is greater than `30`, it [indicates](https://github.com/safe-global/safe-smart-account/blob/f03dfae65fd1d085224b00a10755c509a4eaacfe/contracts/Safe.sol#L344-L347) that the signature is an `eth_sign` signature.

  The hexadecimal value `1c` equals the decimal number `28`, indicating that the signature is a typed data signature.

  The initial signature should look like this:

  `0x969308e2abeda61a0c9c41b3c615012f50dd7456ca76ea39a18e3b975abeb67f275b07810dd59fc928f3f9103e52557c1578c7c5c171ffc983afa5306466b1261f`:

  | Type | Description | Bytes | Value |
  | :--- | :--- | :---: | :--- |
  | Hex | Hex string characters | 1 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>0x</div> |
  | Signature | Signature bytes | 64 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>969308e2abeda61a0c9c41b3c615012f50dd7456ca76ea39a18e3b975abeb67f275b07810dd59fc928f3f9103e52557c1578c7c5c171ffc983afa5306466b126</div> |
  | Signature Type | 1f hex is 31 in decimal | 1 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>1f</div> |

  #### Smart contract signatures

  When signing with a Safe account, the `SigningMethod` will take the value `SigningMethod.SAFE_SIGNATURE`.

  ##### 1/1 Safe account

  This applies to the `SAFE_1_1_ADDRESS` account, another owner of `SAFE_3_4_ADDRESS`.

  We need to connect the Protocol Kit to `SAFE_1_1_ADDRESS` and the `OWNER_3_ADDRESS` account (the only owner of `SAFE_1_1_ADDRESS`) and sign the transaction.

  ```typescript
  // Create a new transaction object
  let transactionSafe1_1 = await protocolKit.createTransaction({
    transactions: [safeTransactionData]
  })

  // Connect OWNER_3_ADDRESS and SAFE_1_1_ADDRESS
  protocolKit = await protocolKit.connect({
    provider: RPC_URL,
    signer: OWNER_3_PRIVATE_KEY,
    safeAddress: SAFE_1_1_ADDRESS
  })

  // Sign the transactionSafe1_1 with OWNER_3_ADDRESS
  // After this, transactionSafe1_1 contains the signature from OWNER_3_ADDRESS
  transactionSafe1_1 = await protocolKit.signTransaction(
    transactionSafe1_1,
    SigningMethod.SAFE_SIGNATURE,
    SAFE_3_4_ADDRESS // Parent Safe address
  )
  ```

  When signing with a child Safe account, we need to specify the parent Safe address to generate the signature based on the version of the contract.

  At this point, the `transactionSafe1_1` object should look like this:

  ```typescript
  EthSafeTransaction {
    signatures: Map(1) {
      '0x22d491bde2303f2f43325b2108d26f1eaba1e32b' => EthSafeSignature {
        signer: '0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b',
        data: '0x5edb6ffe67dd935d93d07c634970944ba0b096f767b92018ad635e8b28effeea5a1e512f1ad6f886690e0e30a3fae2c8c61d3f83d24d43276acdb3254b92ea5b1f',
        isContractSignature: false
      }
    },
    data: { ...}
  }
  ```

  The `signatures.data` represents a specific signature. The `isContractSignature` flag set to `false` indicates that the signature isn't a smart contract signature but an ECDSA signature instead.

  To generate a Safe compatible signature, we use the `buildContractSignature` method, which takes an array of signatures and returns another signature that can be used with Safe accounts. After that, we add the signature from `SAFE_1_1_ADDRESS` to our initial transaction.

  ```typescript
  // Build the contract signature of SAFE_1_1_ADDRESS
  const signatureSafe1_1 = await buildContractSignature(
    Array.from(transactionSafe1_1.signatures.values()),
    SAFE_1_1_ADDRESS
  )

  // Add the signatureSafe1_1 to safeTransaction
  // After this, the safeTransaction contains the signature from OWNER_1_ADDRESS, OWNER_2_ADDRESS and SAFE_1_1_ADDRESS
  safeTransaction.addSignature(signatureSafe1_1)
  ```

  The `signatureSafe1_1` object should look like this:

  ```typescript
  EthSafeSignature {
    signer: '0x215033cdE0619D60B7352348F4598316Cc39bC6E',
    data: '0x5edb6ffe67dd935d93d07c634970944ba0b096f767b92018ad635e8b28effeea5a1e512f1ad6f886690e0e30a3fae2c8c61d3f83d24d43276acdb3254b92ea5b1f',
    isContractSignature: true
  }
  ```

  The `isContractSignature` flag is now `true` because `signatureSafe1_1` is an EIP-1271 smart contract signature from the `SAFE_1_1_ADDRESS` account.

  The `signatureSafe1_1.data` signature should look like this:

  ```
  0x000000000000000000000000215033cdE0619D60B7352348F4598316Cc39bC6E00000000000000000000000000000000000000000000000000000000000000410000000000000000000000000000000000000000000000000000000000000000415edb6ffe67dd935d93d07c634970944ba0b096f767b92018ad635e8b28effeea5a1e512f1ad6f886690e0e30a3fae2c8c61d3f83d24d43276acdb3254b92ea5b1f
  ```

  | Type | Description | Bytes | Value |
  | :--- | :--- | :---: | :--- |
  | Hex | Hex string characters | 1 | 0x |
  | Verifier | Padded address of the contract that implements the EIP-1271 interface to verify the signature. The Safe signer address | 32 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>000000000000000000000000215033cdE0619D60B7352348F4598316Cc39bC6E</div> |
  | Data position | Start position of the signature data (offset relative to the beginning of the signature data). 41 hex is 65 in decimal | 32 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>0000000000000000000000000000000000000000000000000000000000000041</div> |
  | Signature Type | [00 for Safe accounts](https://github.com/safe-global/safe-smart-account/blob/f03dfae65fd1d085224b00a10755c509a4eaacfe/contracts/Safe.sol#L322-L336) | 1 | 00 |
  | Signature Length | The length of the signature. 41 hex is 65 in decimal | 32 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>0000000000000000000000000000000000000000000000000000000000000041</div> |
  | Signature | Signature bytes that are verified by the signature verifier | 65 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>5edb6ffe67dd935d93d07c634970944ba0b096f767b92018ad635e8b28effeea5a1e512f1ad6f886690e0e30a3fae2c8c61d3f83d24d43276acdb3254b92ea5b1f</div> |

  ##### 2/3 Safe account

  This applies to the `SAFE_2_3_ADDRESS` account, another owner of `SAFE_3_4_ADDRESS`.

  We need to connect the Protocol Kit to `SAFE_2_3_ADDRESS` and the `OWNER_4_ADDRESS` and `OWNER_5_ADDRESS` accounts (owners of `SAFE_2_3_ADDRESS`) and sign the transaction.

  ```typescript
  // Create a new transaction object
  let transactionSafe2_3 = await protocolKit.createTransaction({
    transactions: [safeTransactionData]
  })

  // Connect OWNER_4_ADDRESS and the address of SAFE_2_3_ADDRESS
  protocolKit = await protocolKit.connect({
    provider: RPC_URL,
    signer: OWNER_4_ADDRESS,
    safeAddress: SAFE_2_3_ADDRESS
  })

  // Sign the transactionSafe2_3 with OWNER_4_ADDRESS
  // After this, the transactionSafe2_3 contains the signature from OWNER_4_ADDRESS
  transactionSafe2_3 = await protocolKit.signTransaction(
    transactionSafe2_3,
    SigningMethod.SAFE_SIGNATURE,
    SAFE_3_4_ADDRESS // Parent Safe address
  )

  // Connect OWNER_5_ADDRESS
  protocolKit = await protocolKit.connect({
    provider: RPC_URL,
    signer: OWNER_5_ADDRESS
  })

  // Sign the transactionSafe2_3 with OWNER_5_ADDRESS
  // After this, the transactionSafe2_3 contains the signature from OWNER_5_ADDRESS
  transactionSafe2_3 = await protocolKit.signTransaction(
    transactionSafe2_3,
    SigningMethod.SAFE_SIGNATURE,
    SAFE_3_4_ADDRESS // Parent Safe address
  )
  ```

  At this point, the `transactionSafe2_3` object should look like this:

  ```typescript
  EthSafeTransaction {
    signatures: Map(2) {
      '0xe11ba2b4d45eaed5996cd0823791e0c93114882d' => EthSafeSignature {
        signer: '0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d',
        data: '0xd3e6565e5590641db447277243cf24711dce533cfcaaf3a64415dcb9fa309fbf2de1ae4709c6450752acc0d45e01b67b55379bdf4e3dc32b2d89ad0a60c231d61f',
        isContractSignature: false
      },
      '0xd03ea8624c8c5987235048901fb614fdca89b117' => EthSafeSignature {
        signer: '0xd03ea8624C8C5987235048901fB614fDcA89b117',
        data: '0x023d1746ed548e90f387a6b8ddba26e6b80a78d5bfbc36e5bfcbfd63e136f8071db6e91c037fa36bde72159138bbb74fc359b35eb515e276a7c0547d5eaa042520',
        isContractSignature: false
      }
    },
    data: { ... }
  }
  ```

  We now have two signatures from the owners, `OWNER_4_ADDRESS` and `OWNER_5_ADDRESS`. Following the same process, we can create the contract signature and examine the result.

  The `signatures.data` represents a specific signature. The `isContractSignature` flag set to `false` indicates that the signature isn't a smart contract signature but an ECDSA signature instead.

  To generate a Safe compatible signature, we use the `buildContractSignature` method, which takes an array of signatures and returns another signature that can be used with Safe accounts. After that, we add the signature from `safe1_1` to our initial transaction.

  ```typescript
  // Build the contract signature of SAFE_2_3_ADDRESS
  const signatureSafe2_3 = await buildContractSignature(
    Array.from(transactionSafe2_3.signatures.values()),
    SAFE_2_3_ADDRESS
  )

  // Add the signatureSafe2_3 to safeTransaction
  // After this, the safeTransaction contains the signature from OWNER_1_ADDRESS, OWNER_2_ADDRESS, SAFE_1_1_ADDRESS and SAFE_2_3_ADDRESS
  safeTransaction.addSignature(signatureSafe2_3)
  ```

  The `signatureSafe2_3` object should look like this:

  ```
  0x000000000000000000000000f75D61D6C27a7CC5788E633c1FC130f0F4a62D330000000000000000000000000000000000000000000000000000000000000041000000000000000000000000000000000000000000000000000000000000000082023d1746ed548e90f387a6b8ddba26e6b80a78d5bfbc36e5bfcbfd63e136f8071db6e91c037fa36bde72159138bbb74fc359b35eb515e276a7c0547d5eaa042520d3e6565e5590641db447277243cf24711dce533cfcaaf3a64415dcb9fa309fbf2de1ae4709c6450752acc0d45e01b67b55379bdf4e3dc32b2d89ad0a60c231d61f
  ```

  | Type | Description | Bytes | Value |
  | :--- | :--- | :---: | :--- |
  | Hex | Hex string characters | 1 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>0x</div> |
  | Verifier | Padded address of the contract that implements the EIP-1271 interface to verify the signature. The Safe signer address | 32 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>000000000000000000000000f75D61D6C27a7CC5788E633c1FC130f0F4a62D33</div> |
  | Data position | Start position of the signature data (offset relative to the beginning of the signature data). 41 hex is 65 in decimal | 32 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>0000000000000000000000000000000000000000000000000000000000000041</div> |
  | Signature Type | [00 for Safe accounts](https://github.com/safe-global/safe-smart-account/blob/f03dfae65fd1d085224b00a10755c509a4eaacfe/contracts/Safe.sol#L322-L336) | 1 | 00 
  | Signature Length | The length of the signature. 82 hex is 130 in decimal | 32 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>0000000000000000000000000000000000000000000000000000000000000082</div> |
  | Signature | Signature bytes that are verified by the signature verifier (130 bytes are represented by 260 characters in an hex string) | 130 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>023d1746ed548e90f387a6b8ddba26e6b80a78d5bfbc36e5bfcbfd63e136f8071db6e91c037fa36bde72159138bbb74fc359b35eb515e276a7c0547d5eaa042520d3e6565e5590641db447277243cf24711dce533cfcaaf3a64415dcb9fa309fbf2de1ae4709c6450752acc0d45e01b67b55379bdf4e3dc32b2d89ad0a60c231d61f</div> |

  The table looks very similar to the previous one, but there are two main differences:
  - The **Signature Length** value has doubled because `safe2_3` needs two signatures.
  - The **Signature** value is a concatenation of the two regular signatures.

  After following all the steps above, the `safeTransaction` now contains all the signatures from the owners of the Safe.

  The `safeTransaction` object should look like this:

  ```typescript
  EthSafeTransaction {
    signatures: Map(4) {
      '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1' => EthSafeSignature {
        signer: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
        data: '0x969308e2abeda61a0c9c41b3c615012f50dd7456ca76ea39a18e3b975abeb67f275b07810dd59fc928f3f9103e52557c1578c7c5c171ffc983afa5306466b1261f',
        isContractSignature: false
      },
      '0xffcf8fdee72ac11b5c542428b35eef5769c409f0' => EthSafeSignature {
        signer: '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0',
        data: '0x4d63c79cf9d743782bc31ad58c1a316020b39839ab164caee7ecac9829f685cc44ec0d066a5dfe646b2ffeeb37575df131daf9c96ced41b8c7c4aea8dc5461801c',
        isContractSignature: false
      },
      '0x215033cde0619d60b7352348f4598316cc39bc6e' => EthSafeSignature {
        signer: '0x215033cdE0619D60B7352348F4598316Cc39bC6E',
        data: '0x5edb6ffe67dd935d93d07c634970944ba0b096f767b92018ad635e8b28effeea5a1e512f1ad6f886690e0e30a3fae2c8c61d3f83d24d43276acdb3254b92ea5b1f',
        isContractSignature: true
      },
      '0xf75d61d6c27a7cc5788e633c1fc130f0f4a62d33' => EthSafeSignature {
        signer: '0xf75D61D6C27a7CC5788E633c1FC130f0F4a62D33',
        data: '0x023d1746ed548e90f387a6b8ddba26e6b80a78d5bfbc36e5bfcbfd63e136f8071db6e91c037fa36bde72159138bbb74fc359b35eb515e276a7c0547d5eaa042520d3e6565e5590641db447277243cf24711dce533cfcaaf3a64415dcb9fa309fbf2de1ae4709c6450752acc0d45e01b67b55379bdf4e3dc32b2d89ad0a60c231d61f',
        isContractSignature: true
      }
    },
    data: {
      to: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
      value: '100000000000000000',
      data: '0x',
      operation: 0,
      baseGas: '0',
      gasPrice: '0',
      gasToken: '0x0000000000000000000000000000000000000000',
      refundReceiver: '0x0000000000000000000000000000000000000000',
      nonce: 0,
      safeTxGas: '0'
    }
  }
  ```

  ### Propose the transaction

  To store the transactions and signatures off-chain, we need to call the Safe Transaction Service API - a centralized and open-source service that anyone can deploy and run.

  The Safe Transaction Service is used by [Safe\{Wallet\}](https://app.safe.global) to store transactions and signatures by default.

  To store a new transaction, we need to call the `proposeTransaction` from the API Kit, passing the Safe address, an object with the transaction, and a signature from one owner.

  ```typescript
  // Get the signature from OWNER_1_ADDRESS
  const signatureOwner1 = safeTransaction.getSignature(OWNER_1_ADDRESS) as EthSafeSignature

  // Get the transaction hash of the safeTransaction
  const safeTransactionHash = await protocolKit.getTransactionHash(safeTransaction)

  // Instantiate the API Kit
  // Use the chainId where you have the Safe account deployed
  const apiKit = new SafeApiKit({ chainId })

  // Propose the transaction
  await apiKit.proposeTransaction({
    safeAddress: SAFE_3_4_ADDRESS,
    safeTransactionData: safeTransaction.data,
    safeTxHash: safeTransactionHash,
    senderAddress: signerAddress,
    senderSignature: buildSignatureBytes([signatureOwner1])
  })
  ```

  The transaction is now publicly available in the Safe Transaction Service with the signature of the owner who submitted it.

  ### Confirm the transaction

  To add the signatures from the remaining owners, we need to call the `confirmTransaction`, passing the `safeMessageHash` and a signature from the owner.

  Once a transaction is proposed, it becomes available on [Safe\{Wallet\}](https://app.safe.global). However, to execute the transaction, all the confirmations from the owners are needed.

  ```typescript
  const signatureOwner2 = safeTransaction.getSignature(OWNER_2_ADDRESS) as EthSafeSignature

  // Confirm the transaction from OWNER_2_ADDRESS
  await apiKit.confirmTransaction(
    safeTransactionHash,
    buildSignatureBytes([signatureOwner2])
  )

  // Confirm the transaction with the owner SAFE_1_1_ADDRESS
  await apiKit.confirmTransaction(
    safeTransactionHash,
    buildSignatureBytes([signatureSafe1_1])
  )

  // Add signature from the owner SAFE_2_3_ADDRESS
  await apiKit.confirmTransaction(
    safeTransactionHash,
    buildSignatureBytes([signerSafeSig2_3])
  )
  ```

  At this point, the transaction stored in the Safe Transaction Service contains all the required signatures from the owners of the Safe.

  The `getTransaction` method returns the transaction with the `confirmations` property to check all the added signatures.

  ```typescript
  // Get the transactions
  const signedTransaction = await apiKit.getTransaction(safeTransactionHash)

  // Get the confirmations
  const confirmations = signedTransaction.confirmations
  ```

  [Safe\{Wallet\}](https://app.safe.global) exposes to its users the list of pending transactions.

  ```
  https://app.safe.global/transactions/queue?safe=<NETWORK_PREFIX>:<SAFE_ADDRESS>
  ```

  ### Execute the transaction

  Connect the Safe and an a signer to the Protocol Kit. Ensure enough funds are available in the owner's account to execute the transaction and cover the gas costs. Once the Protocol Kit is initialized, the `executeTransaction` method receives and executes the transaction with the required signatures.

  ```typescript
  protocolKit = await protocolKit.connect({
    provider: RPC_URL,
    signer: OWNER_1_PRIVATE_KEY,
    safeAddress: SAFE_3_4_ADDRESS
  })

  // Execute the Safe transaction
  const transactionResponse = await protocolKit.executeTransaction(safeTransaction)
  ```

  At this point, the Safe transaction should be executed on-chain and listed on [Safe\{Wallet\}](https://app.safe.global).

  ```
  https://app.safe.global/transactions/history?safe=<NETWORK_PREFIX>:<SAFE_ADDRESS>
  ```

  The `safeTransaction.encodedSignature` method returns the signatures concatenated and sorted by the address of the signers. It should look like this:

  ```
  0x000000000000000000000000215033cdE0619D60B7352348F4598316Cc39bC6E000000000000000000000000000000000000000000000000000000000000010400969308e2abeda61a0c9c41b3c615012f50dd7456ca76ea39a18e3b975abeb67f275b07810dd59fc928f3f9103e52557c1578c7c5c171ffc983afa5306466b1261f000000000000000000000000f75D61D6C27a7CC5788E633c1FC130f0F4a62D330000000000000000000000000000000000000000000000000000000000000165004d63c79cf9d743782bc31ad58c1a316020b39839ab164caee7ecac9829f685cc44ec0d066a5dfe646b2ffeeb37575df131daf9c96ced41b8c7c4aea8dc5461801c00000000000000000000000000000000000000000000000000000000000000415edb6ffe67dd935d93d07c634970944ba0b096f767b92018ad635e8b28effeea5a1e512f1ad6f886690e0e30a3fae2c8c61d3f83d24d43276acdb3254b92ea5b1f0000000000000000000000000000000000000000000000000000000000000082023d1746ed548e90f387a6b8ddba26e6b80a78d5bfbc36e5bfcbfd63e136f8071db6e91c037fa36bde72159138bbb74fc359b35eb515e276a7c0547d5eaa042520d3e6565e5590641db447277243cf24711dce533cfcaaf3a64415dcb9fa309fbf2de1ae4709c6450752acc0d45e01b67b55379bdf4e3dc32b2d89ad0a60c231d61f
  ```

  | Type | Description | Bytes | Acc byte | Value |
  | :--- | :--- | :---: | :---: | :--- |
  | Hex | Hex string characters | 1 | - | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>0x</div> |
  | 1/1 Safe signer | Safe Address | 32 | 32 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>000000000000000000000000215033cdE0619D60B7352348F4598316Cc39bC6E</div> |
  | Data position for 1/1 Safe | 104 hex = Signature data for 1/1 Safe start at byte 260 | 32 | 64 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>0000000000000000000000000000000000000000000000000000000000000104</div> |
  | Signature Type | Smart contract signature | 1 | 65 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>00</div> |
  | Owner signature | `OWNER_1_ADDRESS` signature | 65 |  130 |<div style={{ maxWidth: "300px", textWrap: "wrap" }}>969308e2abeda61a0c9c41b3c615012f50dd7456ca76ea39a18e3b975abeb67f275b07810dd59fc928f3f9103e52557c1578c7c5c171ffc983afa5306466b1261f</div> |
  | 2/3 Safe signer | Safe Address | 32 | 162 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>000000000000000000000000f75D61D6C27a7CC5788E633c1FC130f0F4a62D33</div> |
  | Data position for 2/3 Verifier | 165 hex = Signature data for 2/3 Safe start at byte 357 | 32 | 194 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>0000000000000000000000000000000000000000000000000000000000000165</div> |
  | Signature | Type Smart contract signature | 1 | 195 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>00</div> |
  | Owner signature | `OWNER_2_ADDRESS` signature | 65 | 260 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>4d63c79cf9d743782bc31ad58c1a316020b39839ab164caee7ecac9829f685cc44ec0d066a5dfe646b2ffeeb37575df131daf9c96ced41b8c7c4aea8dc5461801c</div> |
  | 1/1 Safe Signature Length | Start of the 1/1 Safe Signature. 41 hex = 65 bytes | 32 | 292 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>0000000000000000000000000000000000000000000000000000000000000041</div> |
  | Signature | `OWNER_3_ADDRESS` signature | 65 | 357 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>5edb6ffe67dd935d93d07c634970944ba0b096f767b92018ad635e8b28effeea5a1e512f1ad6f886690e0e30a3fae2c8c61d3f83d24d43276acdb3254b92ea5b1f</div> |
  | 2/3 Safe Signature length | Start of the 2/3 Safe Signature. 82 hex = 130 bytes | 32 | 389 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>0000000000000000000000000000000000000000000000000000000000000082</div> |
  | Signature | `OWNER_4_ADDRESS` and `OWNER_5_ADDRESS` concatenated signatures | 130 | 519 | <div style={{ maxWidth: "300px", textWrap: "wrap" }}>023d1746ed548e90f387a6b8ddba26e6b80a78d5bfbc36e5bfcbfd63e136f8071db6e91c037fa36bde72159138bbb74fc359b35eb515e276a7c0547d5eaa042520d3e6565e5590641db447277243cf24711dce533cfcaaf3a64415dcb9fa309fbf2de1ae4709c6450752acc0d45e01b67b55379bdf4e3dc32b2d89ad0a60c231d61f</div> |

</Steps>

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/signatures/_meta.json`:

```json
{
  "transactions": "Transactions",
  "messages": "Messages"
}
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/migrate-to-v4.md`:

```md
# Migrate to v4

This guide references the major changes between v3 and v4 to help those migrating an existing app.

**Note:** When upgrading to `protocol-kit` v4, it's necessary to upgrade to `types-kit` v1.

## The create() method was renamed init() in the SafeFactory and Safe classes

We renamed the `create()` method to `init()` to better reflect the method's purpose. The term `create()` was misleading, suggesting a new Safe account would be created and deployed. However, this method only initializes the `Safe` class, so `init()` is a more accurate and descriptive name.

```js
// old
const protocolKit = await Safe.create({ ... })
const safeFactory = await SafeFactory.create({ ... })

// new
const protocolKit = await Safe.init({ ... })
const safeFactory = await SafeFactory.init({ ... })
```

## Remove the adapters

We have removed the concept of adapters from the `protocol-kit` to simplify the library. Instead of using specific library adapters, we use now an internal `SafeProvider` object to interact with the Safe. This `SafeProvider` will be created using:

- An Ethereum provider, an [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) compatible provider, or an RPC URL.
- An optional address of the signer that is connected to the provider or a private key. If not provided, the first account of the provider (`eth_accounts`) will be selected as the signer.

The `EthAdapter` interface, the `EthersAdapter` class, and the `Web3Adapter` class are no longer available. Similarly, `EthersAdapterConfig` and `Web3AdapterConfig` were removed as well.


```js
// old
const ethAdapter = new EthersAdapter({ ethers, signerOrProvider })
// const ethAdapter = new Web3Adapter({ web3, signerAddress })
await Safe.create({
   ethAdapter,
   safeAddress: '0xSafeAddress'
   ...
})

// new
await Safe.init({
   provider: window.ethereum, // Or any compatible EIP-1193 provider
   signer: '0xSignerAddressOrPrivateKey', // Signer address or private key
   safeAddress: '0xSafeAddress'
   ...
})

// ...or...
await Safe.init({
   provider: 'http://rpc.url', // Or websocket
   signer: '0xPrivateKey' // Signer private key
   safeAddress: '0xSafeAddress'
   ...
})
```

## `EthersTransactionOptions` and `Web3TransactionOptions` types are now `TransactionOptions`

Together with the adapters, we also removed the specific transaction options objects for each library, leaving just a single `TransactionOptions` type.

We removed the `gas` property from the `TransactionOptions` object as it was a specific property for the web3.js library. Now, you should use the `gasLimit` property instead.

## `EthersTransactionResult` and `Web3TransactionResult` types are now `TransactionResult`

Together with the adapters, we also removed the specific transaction result objects for each library, leaving just a single `TransactionResult` type.

## Contract classes suffixed with Ethers and Web3

All the contract classes that were suffixed with `Ethers` or `Web3` were renamed to remove the suffix.

```js
SafeBaseContractEthers, SafeBaseContractWeb3 -> SafeBaseContract
MultiSendBaseContractEthers, MultiSendBaseContractWeb3 -> MultiSendBaseContract
MultiSendCallOnlyBaseContractEthers, MultiSendCallOnlyBaseContractWeb3 -> MultiSendCallOnlyBaseContract
SafeProxyFactoryBaseContractEthers, SafeProxyFactoryBaseContractWeb3 -> SafeProxyFactoryBaseContract
SignMessageLibBaseContractEthers, SignMessageLibBaseContractWeb3 -> SignMessageLibBaseContract
CreateCallBaseContractEthers, CreateCallBaseContractWeb3 -> CreateCallBaseContract
```

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/signatures.md`:

```md
# Safe Signatures

This guide shows how Safe signatures work and how to generate them using the Protocol Kit.

## Setup

Safe accounts can be configured with different threshold values and types of owners. Safe owners can be any Ethereum address, such as:
- Externally-owned accounts (EOAs). They generate an ECDSA signature to approve Safe transactions.
- Smart accounts that implement the [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271) for signature validation, like Safe does. They use a different signature algorithm depending on the implementation of the smart account.

In the following guides, there are different accounts involved that will be used as an example:

| Who | Description | Address for this example |
| :--- | :--- | :--- |
| `SAFE_3_4_ADDRESS` | 3/4 Safe (3 signatures required out of 4 owners) | 0xb3b3862D8e38a1E965eb350B09f2167B2371D652 |
| `OWNER_1_ADDRESS` | EOA and owner of `SAFE_3_4_ADDRESS` | 0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1 |
| `OWNER_2_ADDRESS` | EOA and owner of `SAFE_3_4_ADDRESS` | 0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0 |
| `SAFE_1_1_ADDRESS` | 1/1 Safe and owner of `SAFE_3_4_ADDRESS` | 0x215033cdE0619D60B7352348F4598316Cc39bC6E |
| `OWNER_3_ADDRESS` | EOA and owner of `SAFE_1_1_ADDRESS` | 0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b |
| `SAFE_2_3_ADDRESS` | 2/3 Safe and owner of `SAFE_3_4_ADDRESS` | 0xf75D61D6C27a7CC5788E633c1FC130f0F4a62D33 |
| `OWNER_4_ADDRESS` | EOA and owner of `SAFE_2_3_ADDRESS` | 0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d |
| `OWNER_5_ADDRESS` | EOA and owner of `SAFE_2_3_ADDRESS` | 0xd03ea8624C8C5987235048901fB614fDcA89b117 |

We need to instantiate all the signers based on the Safe owner accounts.

```typescript
// https://chainlist.org/?search=sepolia&testnets=true
const RPC_URL = 'https://eth-sepolia.public.blastapi.io'

// Initialize signers
const OWNER_1_PRIVATE_KEY = // ...
const OWNER_2_PRIVATE_KEY = // ...
const OWNER_3_PRIVATE_KEY = // ...
const OWNER_4_PRIVATE_KEY = // ...
const OWNER_5_PRIVATE_KEY = // ...
```

## Guides

### Transaction signatures

- The [Transaction signatures](./signatures/transactions.mdx) guide explains how transactions are signed by Safe owners using the Protocol Kit.

### Message signatures

- Using the Protocol Kit, the [Message signatures](./signatures/messages.mdx) guide explains how to generate and sign messages, including plain string messages and EIP-712 JSON messages.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/guides/_meta.json`:

```json
{
  "safe-deployment": "Safe deployment",
  "multichain-safe-deployment": "Multichain Safe deployment",
  "execute-transactions": "Execute transactions",
  "signatures": "Signatures",
  "migrate-to-v1": "Migrate to v1",
  "migrate-to-v2": "Migrate to v2",
  "migrate-to-v3": "Migrate to v3",
  "migrate-to-v4": "Migrate to v4",
  "migrate-to-v5": "Migrate to v5"
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit/_meta.json`:

```json
{
  "guides": "Guides",
  "references": {
    "title": "Reference",
    "href": "/reference-sdk-protocol-kit/overview"
  }
}
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/api-kit.mdx`:

```mdx
import { Grid } from '@mui/material'
import CustomCard from '../../components/CustomCard'

# API Kit

The API Kit facilitates the interaction with the [Safe Transaction Service API](../core-api/transaction-service-overview.mdx), allowing to propose and share transactions with the other signers of a Safe, sending the signatures to the service to collect them, getting information about a Safe (like reading the transaction history, pending transactions, enabled Modules and Guards, etc.), among other features.

<Grid item mt={3}>
  <CustomCard
    title={'@safe-global/api-kit'}
    description={''}
    url={'https://www.npmjs.com/package/@safe-global/api-kit'}
  />
</Grid>

The following guides show how to use the API Kit and integrate it into your project:
- [Propose and confirm transactions](./api-kit/guides/propose-and-confirm-transactions.mdx)

## Resources

- [API Kit on GitHub](https://github.com/safe-global/safe-core-sdk/tree/main/packages/api-kit)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/starter-kit.mdx`:

```mdx
import { Grid } from '@mui/material'
import CustomCard from '../../components/CustomCard'

# Starter Kit

The Starter Kit is the starting point for interacting with the Safe smart account using a TypeScript interface.

The Starter Kit is built on top of several kits from the Safe\{Core\} SDK, leveraging and abstracting the complex logic. At the same time, it's modular and customizable, offering the most simplified way to deploy new accounts and handle the Safe transaction flow in all its different forms:

- User operations
- Multi-signature transactions
- Off-chain and on-chain messages

<Grid item mt={3}>
  <CustomCard
    title={'@safe-global/sdk-starter-kit'}
    description={''}
    url={'https://www.npmjs.com/package/@safe-global/sdk-starter-kit'}
  />
</Grid>

The following guides show how to use the Starter Kit and integrate it into your project:
- [Send transactions](./starter-kit/guides/send-transactions.mdx)
- [Send user operations](./starter-kit/guides/send-user-operations.mdx)

## Resources

- [Starter Kit on GitHub](https://github.com/safe-global/safe-core-sdk/tree/main/packages/sdk-starter-kit)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/react-hooks/guides/send-transactions.mdx`:

```mdx
import { Steps, Tabs } from 'nextra/components'

# Send Transactions

This guide will teach you how to deploy new Safe accounts and create, sign, and execute Safe transactions using the Safe React Hooks.

For more detailed information, see the [Safe React Hooks Reference](../../../reference-sdk-react-hooks/overview.mdx).

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Install dependencies

First, you need to install some dependencies.

```bash
pnpm add @safe-global/safe-react-hooks
```

## Steps

<Steps>

  ### Imports

  Here are all the necessary imports for this guide.

  {/* <!-- vale off --> */}

  ```typescript
  import {
    SafeProvider,
    createConfig,
    useSafe,
    useSendTransaction,
    SendTransactionVariables,
    useConfirmTransaction,
    ConfirmTransactionVariables
  } from '@safe-global/safe-react-hooks'
  import { sepolia } from 'viem/chains'
  ```

  {/* <!-- vale on --> */}

  ### Create a signer and provider

  Firstly, you need to get a signer, which will be the owner of a Safe account after it's deployed.

  This example uses a private key, but any way to get an EIP-1193 compatible signer can be used.

  {/* <!-- vale off --> */}

  ```typescript
  const SIGNER_ADDRESS = // ...
  const SIGNER_PRIVATE_KEY = // ...

  const RPC_URL = 'https://rpc.ankr.com/eth_sepolia'
  ```

  {/* <!-- vale on --> */}

  ### Initialize the Safe React Hooks

  You need to wrap your app with the [`SafeProvider`](../../../reference-sdk-react-hooks/safeprovider.mdx) to have access to the different Safe React Hooks like `useSendTransaction()`, `useConfirmTransaction()`, and `usePendingTransactions()` that will provide the functionality you need in this guide.

  `SafeProvider` receives a `config` object with different properties to create the global configuration that you can get from the [`createConfig`](../../../reference-sdk-react-hooks/createconfig.mdx) function. 

  {/* <!-- vale off --> */}

  <Tabs items={['New Safe account', 'Existing Safe account']}>
    <Tabs.Tab>
      When deploying a new Safe account for the connected signer, you need to pass the configuration of the Safe in the `safeOptions` property. In this case, the Safe account is configured with your signer as the only owner.

      ```typescript
      const config = createConfig({
        chain: sepolia,
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY,
        safeOptions: {
          owners: [SIGNER_ADDRESS],
          threshold: 1
        }
      })
      ```
    </Tabs.Tab>
    <Tabs.Tab>
      When connecting an existing Safe account, you need to pass the `safeAddress` property.

      ```typescript
      const config = createConfig({
        chain: sepolia,
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY,
        safeAddress: '0x...'
      })
      ```
    </Tabs.Tab>
  </Tabs>
  
  {/* <!-- vale on --> */}

  To apply the global configuration to your app, pass the created `config` to the `SafeProvider`.

  {/* <!-- vale off --> */}

  ```typescript
  <SafeProvider config={config}>
    <App />
  </SafeProvider>
  ```

  {/* <!-- vale on --> */}

  ### Create a Safe transaction

  Create an array of Safe transactions to execute.

  {/* <!-- vale off --> */}

  ```typescript
  const transactions = [{
    to: '0x...',
    data: '0x',
    value: '0'
  }]
  ```

  {/* <!-- vale on --> */}

  ### Send the Safe transaction

  Create a `SendTransaction` component in your application to create and send a transaction.

  If you configured your Safe with `threshold` equal to `1`, calling the `sendTransaction` function from the [`useSendTransaction`](../../../reference-sdk-react-hooks/usesendtransaction.mdx) hook will execute the Safe transaction. However, if the `threshold` is greater than `1` the other owners of the Safe will need to confirm the transaction until the required number of signatures are collected.

  {/* <!-- vale off --> */}

  <Tabs items={['SendTransaction.tsx']}>
    <Tabs.Tab>
      ```typescript
      function SendTransaction() {
        const { sendTransaction } = useSendTransaction()

        const sendTransactionParams: SendTransactionVariables = {
          transactions
        }

        return (
          <button onClick={() => sendTransaction(sendTransactionParams)}>
            Send Transaction
          </button>
        )
      }

      export default SendTransaction
      ```
    </Tabs.Tab>
  </Tabs>

  {/* <!-- vale on --> */}

  ### Confirm the Safe transaction

  Create a `ConfirmPendingTransactions` component in your application to check the transactions pending for confirmation in case the Safe transaction needs to be confirmed by other Safe owners.
  
  Retrieve all the pending Safe transactions from the Safe Transaction Service by calling the [`getPendingTransaction`](../../../reference-sdk-react-hooks/usesafe/getpendingtransactions.mdx) function from the [`useSafe`](../../../reference-sdk-react-hooks/usesafe.mdx) hook, and call the `confirmTransaction` function from the [`useConfirmTransaction`](../../../reference-sdk-react-hooks/useconfirmtransaction.mdx) hook to confirm them.

  Notice that the `SafeProvider` configuration needs to be initialized with a different Safe owner as the `signer` when confirming a transaction.

  {/* <!-- vale off --> */}

  <Tabs items={['ConfirmPendingTransactions.tsx']}>
    <Tabs.Tab>
      ```typescript
      function ConfirmPendingTransactions() {
        const { getPendingTransactions } = useSafe()
        const { data = [] } = getPendingTransactions()
        const { confirmTransaction } = useConfirmTransaction()
  
        return (
          <>
            {data.length > 0 && data.map(tx => (
              <>
                {tx.safeTxHash}
                <button onClick={() => confirmTransaction({
                  safeTxHash: tx.safeTxHash
                })} />
              </>
            ))}
          </>
        )
      }

      export default ConfirmPendingTransactions
      ```
    </Tabs.Tab>
  </Tabs>

  {/* <!-- vale on --> */}

  Once the total number of confirmations reaches the `threshold` of the Safe, the `confirmTransaction` will automatically execute the transaction. 

</Steps>

## Recap and further reading

After following this guide, you are able to deploy new Safe accounts and create, sign, and execute Safe transactions using the Safe React Hooks.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/react-hooks/guides/_meta.json`:

```json
{
  "send-transactions": "Send Transactions"
}
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/react-hooks/_meta.json`:

```json
{
  "guides": "Guides",
  "references": {
    "title": "Reference",
    "href": "/reference-sdk-react-hooks/overview"
  }
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/starter-kit/guides/send-transactions.mdx`:

```mdx
import { Steps, Tabs } from 'nextra/components'

# Send Transactions

In this guide, you will learn how to create Safe transactions, sign them, collect the signatures from the different owners, and execute them.

For more detailed information, see the [Starter Kit Reference](../../../reference-sdk-starter-kit/overview.mdx).

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Install dependencies

First, you need to install some dependencies.

```bash
pnpm add @safe-global/sdk-starter-kit
```

## Steps

<Steps>

  ### Imports

  Here are all the necessary imports for this guide.

  {/* <!-- vale off --> */}

  ```typescript
  import { createSafeClient } from '@safe-global/sdk-starter-kit'
  ```

  {/* <!-- vale on --> */}

  ### Create a signer

  Firstly, you need to get a signer, which will be the owner of a Safe account after it's deployed.

  This example uses a private key, but any way to get an EIP-1193 compatible signer can be used.

  {/* <!-- vale off --> */}

  ```typescript
  const SIGNER_ADDRESS = // ...
  const SIGNER_PRIVATE_KEY = // ...
  const RPC_URL = 'https://rpc.ankr.com/eth_sepolia'
  ```

  {/* <!-- vale on --> */}

  ### Initialize the `SafeClient`

  {/* <!-- vale off --> */}

  <Tabs items={['New Safe account', 'Existing Safe account']}>
    <Tabs.Tab>
      When deploying a new Safe account, you need to pass the configuration of the Safe in the `safeOptions` property. The Safe account is configured with your signer as the only owner in this case.

      ```typescript
      const safeClient = await createSafeClient({
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY,
        safeOptions: {
          owners: [SIGNER_ADDRESS],
          threshold: 1
        }
      })
      ```
    </Tabs.Tab>
    <Tabs.Tab>
      When connecting an existing Safe account, you need to pass the `safeAddress`.

      ```typescript
      const safeClient = await createSafeClient({
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY,
        safeAddress: '0x...'
      })
      ```
    </Tabs.Tab>
  </Tabs>

  {/* <!-- vale on --> */}

  ### Create a Safe transaction

  Create an array of Safe transactions to execute.

  {/* <!-- vale off --> */}

  ```typescript
  const transactions = [{
    to: '0x...',
    data: '0x',
    value: '0'
  }]
  ```

  {/* <!-- vale on --> */}

  ### Send the Safe transaction

  If you configured your Safe with `threshold` equal to `1`, calling the [`send`](../../../reference-sdk-starter-kit/safe-client/send.mdx) method will execute the Safe transaction. However, if the `threshold` is greater than `1` the other owners of the Safe will need to confirm the transaction until the required number of signatures are collected.

  {/* <!-- vale off --> */}

  ```typescript
  const txResult = await safeClient.send({ transactions })

  const safeTxHash = txResult.transactions?.safeTxHash
  ```

  {/* <!-- vale on --> */}

  ### Confirm the Safe transaction

  If the Safe transaction needs to be confirmed by other Safe owners, call the [`confirm`](../../../reference-sdk-starter-kit/safe-client/confirm.mdx) method from a new `SafeClient` instance initialized with each of the signers that need to confirm it.

  {/* <!-- vale off --> */}

  ```typescript
  const newSafeClient = await createSafeClient({
    provider: RPC_URL,
    signer,
    safeAddress: '0x...'
  })
  ```
  
  {/* <!-- vale on --> */}

  Finally, retrieve all the pending Safe transactions from the Safe Transaction Service and confirm the one you just created with each missing owner.

  {/* <!-- vale off --> */}

  ```typescript
  const pendingTransactions = await newSafeClient.getPendingTransactions()

  for (const transaction of pendingTransactions.results) {
    if (transaction.safeTxHash !== safeTxHash) {
      return
    }

    const txResult = await safeClient.confirm({ safeTxHash })
  }
  ```

  {/* <!-- vale on --> */}

</Steps>

## Recap and further reading

After following this guide, you are able to deploy new Safe accounts and create, sign, and execute Safe transactions with the Starter Kit.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/starter-kit/guides/_meta.json`:

```json
{
  "send-transactions": "Send Transactions",
  "send-user-operations": "Send User Operations"
}
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/starter-kit/guides/send-user-operations.mdx`:

```mdx
import { Steps, Tabs } from 'nextra/components'

# Send User Operations

In this guide, you will learn how to create Safe [user operations](../../../home/glossary.md#useroperation), sign them, collect the signatures from the different owners, and execute them.

For more detailed information, see the [Starter Kit Reference](../../../reference-sdk-starter-kit/overview.mdx).

[Pimlico](https://pimlico.io) is used in this guide as the service provider, but any other provider compatible with the ERC-4337 can be used.

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- A [Pimlico account](https://dashboard.pimlico.io) and an API key.

## Install dependencies

First, you need to install some dependencies.

```bash
pnpm add @safe-global/sdk-starter-kit
```

## Steps

<Steps>

  ### Imports

  Here are all the necessary imports for this guide.

  {/* <!-- vale off --> */}

  ```typescript
  import {
    createSafeClient,
    safeOperations,
    BundlerOptions
  } from '@safe-global/sdk-starter-kit'
  ```

  {/* <!-- vale on --> */}

  ### Create a signer

  Firstly, you need to get a signer, which will be the owner of a Safe account after it's deployed.

  This example uses a private key, but any way to get an EIP-1193 compatible signer can be used.

  {/* <!-- vale off --> */}

  ```typescript
  const SIGNER_ADDRESS = // ...
  const SIGNER_PRIVATE_KEY = // ...
  const RPC_URL = 'https://rpc.ankr.com/eth_sepolia'
  ```

  {/* <!-- vale on --> */}

  ### Initialize the `SafeClient`

  {/* <!-- vale off --> */}

  <Tabs items={['New Safe account', 'Existing Safe account']}>
    <Tabs.Tab>
      When deploying a new Safe account, you need to pass the configuration of the Safe in the `safeOptions` property. The Safe account is configured with your signer as the only owner in this case.

      ```typescript
      const safeClient = await createSafeClient({
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY,
        safeOptions: {
          owners: [SIGNER_ADDRESS],
          threshold: 1
        }
      })
      ```
    </Tabs.Tab>
    <Tabs.Tab>
      When connecting an existing Safe account, you need to pass the `safeAddress`.

      ```typescript
      const safeClient = await createSafeClient({
        provider: RPC_URL,
        signer: SIGNER_PRIVATE_KEY,
        safeAddress: '0x...'
      })
      ```
    </Tabs.Tab>
  </Tabs>

  {/* <!-- vale on --> */}

  As this guide is related with ERC-4337 user operations, you need to add the `safeOperations` extension to the `safeClient` instance to support this functionality.

  {/* <!-- vale off --> */}

  ```typescript
  const bundlerOptions: BundlerOptions = {
    bundlerUrl: `https://api.pimlico.io/v1/sepolia/rpc?apikey=${PIMLICO_API_KEY}`
  }

  const paymasterOptions: PaymasterOptions = {
    isSponsored: true,
    paymasterUrl: `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`
  }

  const safeClientWithSafeOperation = await safeClient.extend(
    safeOperations(bundlerOptions, paymasterOptions)
  )
  ```

  The `safeClientWithSafeOperation` instance has now support for managing user operations.

  {/* <!-- vale on --> */}

  ### Create a Safe transaction

  Create an array of Safe transactions to execute.

  {/* <!-- vale off --> */}

  ```typescript
  const transactions = [{
    to: '0x...',
    data: '0x',
    value: '0'
  }]
  ```

  {/* <!-- vale on --> */}

  ### Send the Safe operation

  If you configured your Safe with `threshold` equal to `1`, calling the [`sendSafeOperation`](../../../reference-sdk-starter-kit/safe-operations/sendsafeoperation.mdx) method will execute the user operation. However, if the `threshold` is greater than `1` the other owners of the Safe will need to confirm the user operation until the required number of signatures are collected.

  {/* <!-- vale off --> */}

  ```typescript
  const safeOperationResult = await safeClientWithSafeOperation.sendSafeOperation({
    transactions
  })

  const safeOperationHash = safeOperationResult.safeOperations?.safeOperationHash
  ```

  {/* <!-- vale on --> */}

  ### Confirm the Safe operations

  If the user operation needs to be confirmed by other Safe owners, call the [`confirmSafeOperation`](../../../reference-sdk-starter-kit/safe-operations/confirmsafeoperation.mdx) method from a new `SafeClient` instance initialized with each of the signers that need to confirm it.

  {/* <!-- vale off --> */}

  ```typescript
  const newSafeClient = await createSafeClient({
    provider: RPC_URL,
    signer,
    safeAddress: '0x...'
  })

  const newSafeClientWithSafeOperation = await newSafeClient.extend(
    safeOperations({
      bundlerUrl: `https://api.pimlico.io/v1/sepolia/rpc?apikey=${PIMLICO_API_KEY}`
    }, {
      isSponsored: true,
      paymasterUrl: `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`
    })
  )
  ```
  {/* <!-- vale on --> */}

  Finally, retrieve all the pending user operations from the Safe Transaction Service and confirm the one you just created with each missing owner.

  {/* <!-- vale off --> */}

  ```typescript
  const pendingSafeOperations =
    await newSafeClientWithSafeOperation.getPendingSafeOperations()

  for (const safeOperation of pendingSafeOperations.results) {
    if (safeOperation.safeOperationHash !== safeOperationHash) {
      return
    }

    const safeOperationResult =
      await newSafeClientWithSafeOperation.confirmSafeOperation({ safeOperationHash })
  }
  ```

  {/* <!-- vale on --> */}

</Steps>

## Recap and further reading

After following this guide, you are able to deploy new Safe accounts and create, sign, and submit user operations with the Starter Kit.

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/starter-kit/_meta.json`:

```json
{
  "guides": "Guides",
  "references": {
    "title": "Reference",
    "href": "/reference-sdk-starter-kit/overview"
  }
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/onramp.mdx`:

```mdx
import RemovedContentCallout from '../../components/RemovedContentCallout'

<RemovedContentCallout>
  The Onramp Kit in the Safe\{Core\} SDK is no longer supported. We recommend integrating onramp providers directly into your application by following these guides.
</RemovedContentCallout>

# Onramp guides

The guides in this section show how to use different onramp services with the Safe\{Core\} SDK. 
With these onramp services, you can enable users to buy cryptocurrencies using their credit card or bank account.
With Monerium, you can even send IBAN transfers from a Safe account to a bank account.

The following guides show how to do onramping with the following services:

- [Monerium](./onramp/monerium.mdx)
- [Stripe](./onramp/stripe.mdx)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/signers.mdx`:

```mdx
import RemovedContentCallout from '../../components/RemovedContentCallout'

<RemovedContentCallout>
  The Auth Kit in the Safe\{Core\} SDK is no longer supported. We recommend integrating Web3 authentication providers directly into your application by following these guides.
</RemovedContentCallout>

# Signers

Safe Smart Accounts can be set up with multiple and different signer accounts.

The following guides show how to create a signer account with different service providers and use them to initialize any of the kits from the Safe\{Core\} SDK.

- [Dynamic](./signers/dynamic.mdx)
- [Magic](./signers/magic.mdx)
- [Passkeys](./signers/passkeys.mdx)
- [Privy](./signers/privy.mdx)
- [Web3Auth](./signers/web3auth.mdx)

## Resources

- [Demo app on GitHub](https://github.com/5afe/safe-signers)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/onchain-tracking.mdx`:

```mdx
import { Tabs, Steps, Callout } from 'nextra/components'

# On-chain Tracking

We aim to understand better and recognise our key contributors who are driving the adoption of smart accounts within our ecosystem.

Implementing a Safe on-chain identifier enables tracking of complex data, such as whether a Safe transaction is executed via our SDK or another, whether it originates from a platform like a Safe App or widget (for example, the CoW Swap widget in our Safe interface), the tool version, the project, and more.

By submitting your on-chain identifier through the form provided at the end of this page, you will help us accurately attribute activity and allow us to return value to our Ecosystem Partners in the future.

<Callout type='info' emoji='ℹ️'>
  On-chain tracking is supported starting from [Protocol Kit](../sdk/protocol-kit.mdx) `v5.2.0` and [Relay Kit](../sdk/relay-kit.mdx) `v3.4.0`.
</Callout>

## On-chain identifier format

The identifiers used to track Safe deployments and transactions are 50 bytes in length and follow the format below:

`5afe` `00` `6363643438383836663461336661366162653539` `646561` `393238` `653366`

Check the last 50 bytes of the `data` field in this [example transaction](https://sepolia.etherscan.io/tx/0xe0192eedd1fc2d06be0561d57380d610dd6d162af0f3cfbd6c08f9062d738761) to see how the identifier appears after the transaction is executed.

### Prefix hash

- **Type:** `2 bytes`
- **Example:** `5afe`

Static prefix to identify the Safe on-chain identifier.

### Version hash

- **Type:** `1 byte`
- **Example:** `00`

Version number of the Safe on-chain identifier format.

### Project hash

- **Type:** `20 bytes`
- **Example:** `6363643438383836663461336661366162653539`

Truncated hash of the project's name (for example, "Gnosis", "CoW Swap").

### Platform hash

- **Type:** `3 bytes`
- **Example:** `646561`

Truncated hash of the platform's name (for example, "Web", "Mobile", "Safe App", "Widget").

### Tool hash

- **Type:** `3 bytes`
- **Example:** `393238`

Truncated hash of the tool's name (for example, "protocol-kit", "relay-kit", or any custom tool built by projects).

### Tool version hash

- **Type:** `3 bytes`
- **Example:** `653366`

Truncated hash of the tool's version (for example, "1.0.0", "1.0.1").

## Steps

The on-chain identifier allows tracking the deployment of Safe accounts, the execution of Safe transactions, and the execution of Safe user operations:

<Steps>

  ### Generate an on-chain identifier

  Feel free to skip this section if you use the Protocol Kit or Relay Kit from the Safe\{Core\} SDK, as this is handled internally.

  To create an on-chain identifier with the format described above, you need to implement a function that receives the `project`, `platform`, `tool`, and `toolVersion` used; and returns the correct identifier after hashing, truncating, and concatenating all these parameters.

  {/* <!-- vale off --> */}

  ```typescript
  function generateOnChainIdentifier({
    project,
    platform = 'Web',
    tool,
    toolVersion
  }: OnChainIdentifierParamsType): string {
    const identifierPrefix = '5afe' // Safe identifier prefix
    const identifierVersion = '00' // First version
    const projectHash = generateHash(project, 20) // Take the last 20 bytes
    const platformHash = generateHash(platform, 3) // Take the last 3 bytes
    const toolHash = generateHash(tool, 3) // Take the last 3 bytes
    const toolVersionHash = generateHash(toolVersion, 3) // Take the last 3 bytes

    return `${identifierPrefix}${identifierVersion}${projectHash}${platformHash}${toolHash}${toolVersionHash}`
  }

  function generateHash(input: string, size: number): string {
    const fullHash = keccak256(toHex(input))
    return toHex(fullHash.slice(-size)).replace('0x', '') // Take the last X bytes
  }
  ```

  {/* <!-- vale on --> */}

  This identifier will be added to all your Safe transactions and become searchable on-chain.

  ### Track Safe deployments
  
  Safe deployments can be tracked by concatenating the on-chain identifier at the end of the deployment transaction `data`. This way Safe deployment transactions will include the identifier.
  
  If you use the [Protocol Kit](../sdk/protocol-kit.mdx) or the [Relay Kit](../sdk/relay-kit.mdx) to deploy a Safe, adding the `onchainAnalytics` property to the initialization method will automatically handle this.
  
  If you use a custom implementation, remember to manually add the on-chain identifier at the end of the deployment transaction `data`.

  {/* <!-- vale off --> */}

  <Tabs items={['Protocol Kit', 'Relay Kit']}>
    <Tabs.Tab>
      ```typescript
      import Safe, { OnchainAnalyticsProps } from '@safe-global/protocol-kit'

      const onchainAnalytics: OnchainAnalyticsProps = {
        project: 'YOUR_PROJECT_NAME' // Required. Always use the same value for your project.
        platform: 'CURRENT_PLATFORM' // Optional
      }

      const protocolKit = await Safe.init({
        // ...
        onchainAnalytics
      })

      // Execute the deployment
      ```
    </Tabs.Tab>
    <Tabs.Tab>
      ```typescript
      import { Safe4337Pack } from '@safe-global/relay-kit'
      import { OnchainAnalyticsProps } from '@safe-global/protocol-kit'

      const onchainAnalytics: OnchainAnalyticsProps = {
        project: 'YOUR_PROJECT_NAME' // Required. Always use the same value for your project.
        platform: 'CURRENT_PLATFORM' // Optional
      }
      
      const safe4337Pack = await Safe4337Pack.init({
        // ...
        onchainAnalytics
      })

      // Execute the deployment
      ```
    </Tabs.Tab>
  </Tabs>

  {/* <!-- vale on --> */}

  ### Track Safe transactions

  Safe transactions can be tracked by concatenating the on-chain identifier at the end of the transaction `data` or user operation `callData` properties. This way Safe transactions will include the identifier.

  If you use the [Protocol Kit](../sdk/protocol-kit.mdx) or the [Relay Kit](../sdk/relay-kit.mdx) to execute the Safe transactions, adding the `onchainAnalytics` property to the initialization method will automatically handle this.

  If you use a custom implementation, remember to manually add the on-chain identifier at the end of the transaction `data`/`callData`.

  {/* <!-- vale off --> */}

  <Tabs items={['Protocol Kit', 'Relay Kit']}>
    <Tabs.Tab>
      ```typescript
      import Safe, { OnchainAnalyticsProps } from '@safe-global/protocol-kit'

      const onchainAnalytics: OnchainAnalyticsProps = {
        project: 'YOUR_PROJECT_NAME'
        platform: 'CURRENT_PLATFORM' // Optional
      }

      const protocolKit = await Safe.init({
        // ...
        onchainAnalytics
      })

      // Execute the transaction
      ```
    </Tabs.Tab>
    <Tabs.Tab>
      ```typescript
      import { Safe4337Pack } from '@safe-global/relay-kit'
      import { OnchainAnalyticsProps } from '@safe-global/protocol-kit'

      const onchainAnalytics: OnchainAnalyticsProps = {
        project: 'YOUR_PROJECT_NAME'
        platform: 'CURRENT_PLATFORM' // Optional
      }
      
      const safe4337Pack = await Safe4337Pack.init({
        // ...
        onchainAnalytics
      })

      // Execute the transaction
      ```
    </Tabs.Tab>
  </Tabs>

  {/* <!-- vale on --> */}

  ### Get the on-chain identifier

  If you use the Protocol Kit or the Relay Kit, call the `getOnchainIdentifier` method from an initialized instance of the Protocol Kit to get the current Safe on-chain identifier.

  {/* <!-- vale off --> */}

  ```typescript
  const onchainIdentifier = protocolKit.getOnchainIdentifier()
  ```

  {/* <!-- vale on --> */}

</Steps>

## Submission Form

You can fill out the form by clicking [this link](https://forms.gle/NYkorYebc6Fz1fMW6) or using the form below:

<br/>

<iframe
  src="https://docs.google.com/forms/d/e/1FAIpQLSfHWSPbSQwmo0mbtuFFewfLvDEOvTxfuvEl7AHOyrFE_dqpwQ/viewform?embedded=true"
  width="100%"
  height="1750"
  frameborder="0"
>Loading…</iframe>

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/_meta.json`:

```json
{
  "home": {
    "title": "← Go Home",
    "href": "/"
  },
  "-- Safe{Core} SDK": {
    "type": "separator",
    "title": "Safe{Core} SDK"
  },
  "overview": "Overview",
  "starter-kit": "Starter Kit",
  "protocol-kit": "Protocol Kit",
  "api-kit": "API Kit",
  "relay-kit": "Relay Kit",
  "-- React Hooks": {
    "type": "separator",
    "title": "React Hooks"
  },
  "react-hooks": "Safe React Hooks",
  "-- Integrations": {
    "type": "separator",
    "title": "Integrations"
  },
  "signers": "Signers",
  "onchain-tracking": "On-chain Tracking",
  "onramp": "Onramp"
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/api-kit/guides/migrate-to-v1.md`:

```md
# Migrate to v1

This guide references the major changes between `safe-service-client` and `api-kit` v1 to help those migrating an existing application.

**Note:** Follow this guide before migrating to `api-kit` v2.

After completing this guide, you can remove `@safe-global/safe-service-client` from your `package.json`.

## Adding the new dependency

To add the API Kit to your project, run the following:

```bash
yarn add @safe-global/api-kit@1.3.1
```

Change your initialization like this:

```typescript
// old
import SafeServiceClient from '@safe-global/safe-service-client'

const safeService = new SafeServiceClient({
  txServiceUrl: 'https://your-transaction-service-url',
  ethAdapter
})

// new
import SafeApiKit from '@safe-global/api-kit'

const apiKit = new SafeApiKit({
  txServiceUrl: 'https://your-transaction-service-url',
  ethAdapter
})
```

## `getSafeDelegates()`

The `getSafeDelegates` was updated to accept more filtering parameters. Now, it accepts an object with multiple properties instead of only the `safeAddress` parameter.

```typescript
const delegateConfig: GetSafeDelegateProps = {
  safeAddress, // Optional
  delegateAddress, // Optional
  delegatorAddress, // Optional
  label, // Optional
  limit, // Optional
  offset // Optional
}
const delegates: SafeDelegateListResponse = await apiKit.getSafeDelegates(delegateConfig)
```

## `addSafeDelegate()`

Parameter object properties were updated as follows:

```typescript
// old
const delegateConfig: SafeDelegateConfig = {
  safe,
  delegate,
  label,
  signer
}
await safeService.addSafeDelegate(delegateConfig)

// new
const delegateConfig: AddSafeDelegateProps = {
  safeAddress, // Optional
  delegateAddress,
  delegatorAddress,
  label,
  signer
}
await apiKit.addSafeDelegate(delegateConfig)
```

## `removeAllSafeDelegates()`

The method was deprecated and removed.

## `removeSafeDelegate()`

Parameter object properties were updated as follows:

```typescript
// old
const delegateConfig: SafeDelegateDeleteConfig = {
  safe,
  delegate,
  signer
}
await safeService.removeSafeDelegate(delegateConfig)

// new
const delegateConfig: DeleteSafeDelegateProps = {
  delegateAddress,
  delegatorAddress,
  signer
}
await apiKit.removeSafeDelegate(delegateConfig)
```

## `getBalances()`

The method was deprecated and removed.

## `getUSDBalances()`

The method was deprecated and removed.

## `getCollectibles()`

The method was deprecated and removed.
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/api-kit/guides/propose-and-confirm-transactions.mdx`:

```mdx
import { Steps } from 'nextra/components'

# Propose and confirm transactions

In this guide you will learn how to propose transactions to the service and collect the signatures from the owners so they become executable.

For more detailed information, see the [API Kit Reference](../../../reference-sdk-api-kit/overview.mdx).

## Prerequisites

1. [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
2. A Safe with several signers

## Steps

<Steps>

  ### Install dependencies

  First, you need to install some dependencies.

  ```bash
  yarn add @safe-global/api-kit \
    @safe-global/protocol-kit \
    @safe-global/types-kit
  ```

  ### Imports

  Here are all the necessary imports for this guide.

  ```typescript
  import SafeApiKit from '@safe-global/api-kit'
  import Safe from '@safe-global/protocol-kit'
  import {
    MetaTransactionData,
    OperationType
  } from '@safe-global/types-kit'
  ```

  ### Setup

  We will use a Safe account setup with two or more signers, and threshold two, so at least multiple signatures will need to be collected when executing a transaction.

  ```typescript
  // https://chainlist.org/?search=sepolia&testnets=true
  const RPC_URL = 'https://eth-sepolia.public.blastapi.io'

  const SAFE_ADDRESS = // ...

  const OWNER_1_ADDRESS = // ...
  const OWNER_1_PRIVATE_KEY = // ...

  const OWNER_2_PRIVATE_KEY = // ...
  ```

  ### Initialize the API Kit

  Firstly, you need to create an instance of the API Kit. In chains where the [Safe Transaction Service](../../../core-api/transaction-service-overview.mdx) is supported, it's enough to specify the `chainId` property.

  ```typescript
  const apiKit = new SafeApiKit({
    chainId: 1n
  })
  ```

  Alternatively, you can use a custom service using the optional `txServiceUrl` property.

  ```typescript
  const apiKit = new SafeApiKit({
    chainId: 1n, // set the correct chainId
    txServiceUrl: 'https://url-to-your-custom-service'
  })
  ```

  ### Initialize the Protocol Kit

  To handle transactions and signatures, you need to create an instance of the Protocol Kit with the `provider`, `signer` and `safeAddress`.

  ```typescript
  const protocolKitOwner1 = await Safe.init({
    provider: RPC_URL,
    signer: OWNER_1_PRIVATE_KEY,
    safeAddress: SAFE_ADDRESS
  })
  ```

  ### Propose a transaction to the service

  Before a transaction can be executed, any of the Safe signers needs to initiate the process by creating a proposal of a transaction. This transaction is sent to the service to make it accessible by the other owners so they can give their approval and sign the transaction as well.

  For a full list and description of the properties see [`proposeTransaction`](../../../reference-sdk-api-kit/proposetransaction.mdx) in the API Kit reference.

  ```typescript
  // Create transaction
  const safeTransactionData: MetaTransactionData = {
    to: '0x',
    value: '1', // 1 wei
    data: '0x',
    operation: OperationType.Call
  }

  const safeTransaction = await protocolKitOwner1.createTransaction({
    transactions: [safeTransactionData]
  })

  const safeTxHash = await protocolKitOwner1.getTransactionHash(safeTransaction)
  const signature = await protocolKitOwner1.signHash(safeTxHash)

  // Propose transaction to the service
  await apiKit.proposeTransaction({
    safeAddress: SAFE_ADDRESS,
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress: OWNER_1_ADDRESS,
    senderSignature: signature.data
  })
  ```

  ### Retrieve the pending transactions

  Different methods in the API Kit are available to retrieve pending transactions depending on the situation. To retrieve a transaction given the Safe transaction hash use the method that's not commented.

  ```typescript
  const transaction = await service.getTransaction(safeTxHash)
  // const transactions = await service.getPendingTransactions()
  // const transactions = await service.getIncomingTransactions()
  // const transactions = await service.getMultisigTransactions()
  // const transactions = await service.getModuleTransactions()
  // const transactions = await service.getAllTransactions()
  ```

  ### Confirm the transaction

  In this step you need to sign the transaction with the Protocol Kit and submit the signature to the Safe Transaction Service using the [`confirmTransaction`](../../../reference-sdk-api-kit/confirmtransaction.mdx) method.

  ```typescript
  const protocolKitOwner2 = await Safe.init({
    provider: RPC_URL,
    signer: OWNER_2_PRIVATE_KEY,
    safeAddress: SAFE_ADDRESS
  })

  const safeTxHash = transaction.transactionHash
  const signature = await protocolKitOwner2.signHash(safeTxHash)

  // Confirm the Safe transaction
  const signatureResponse = await apiKit.confirmTransaction(
    safeTxHash,
    signature.data
  )
  ```

  The Safe transaction is now ready to be executed. This can be done using the [Safe\{Wallet\} web](https://app.safe.global) interface, the [Protocol Kit](../../../reference-sdk-protocol-kit/transactions/executetransaction.mdx), the [Safe CLI](../../../advanced/cli-reference/tx-service-commands.mdx#execute-pending-transaction) or any other tool that's available.

</Steps>

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/api-kit/guides/migrate-to-v2.md`:

```md
# Migrate to v2

This guide references the major changes between v1 and v2 to help those migrating an existing app.

## API Kit constructor

It won't be necessary to specify a `txServiceUrl` in environments where Safe has a Transaction Service running. Providing the chain ID will be enough. If you want to use your custom service or the kit in a chain not supported by a Safe Transaction Service, you can add the `txServiceUrl` parameter.

```js
// old:
import SafeApiKit from '@safe-global/api-kit'

const apiKit = new SafeApiKit({
  txServiceUrl: 'https://your-transaction-service-url',
  ethAdapter
})

// new:
import SafeApiKit from '@safe-global/api-kit'

const chainId: bigint = 1n
const apiKit = new SafeApiKit({
  chainId
})

// or set a custom Transaction Service
const apiKit = new SafeApiKit({
  chainId,
  txServiceUrl: 'https://your-transaction-service-url'
})
```

## Use the route you prefer

API Kit v1 forced any custom service to be hosted under the `/api` route of the URL specified in `txServiceUrl`. This isn't the case anymore; you can specify any preferred route or subdomain.

Note that if you use a custom service running under `/api`, you will now need to migrate as follows:

```js
// old:
const txServiceUrl = 'https://your-transaction-service-domain/'
const apiKit = new SafeApiKit({
  txServiceUrl,
  ethAdapter
})
// new:
const chainId: bigint = 1n
const txServiceUrl = 'https://your-transaction-service-domain/api'
const apiKit = new SafeApiKit({
  chainId,
  txServiceUrl
})
```

## MasterCopy to Singleton

To avoid confusion between terms used as synonyms, we aligned all our code to use the word `singleton`.

- Rename type `MasterCopyResponse` to `SafeSingletonResponse`
- Rename method `getServiceMasterCopiesInfo()` to `getServiceSingletonsInfo()`
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/api-kit/guides/_meta.json`:

```json
{
  "propose-and-confirm-transactions": "Propose and Confirm Transactions",
  "migrate-to-v1": "Migrate to v1",
  "migrate-to-v2": "Migrate to v2"
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/api-kit/_meta.json`:

```json
{
    "guides": "Guides",
    "references": {
        "title": "Reference",
        "href": "/reference-sdk-api-kit/overview"
    }
}
```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/signers/web3auth.mdx`:

```mdx


import { Tabs, Steps, Callout } from 'nextra/components'

# Web3Auth Signer

In this guide, you will learn how to create a [Web3Auth](https://web3auth.io) signer that can be added as a Safe owner and used to initialize any of the kits from the Safe\{Core\} SDK.

Check out the [Safe Signers demo app](https://github.com/5afe/safe-signers) on GitHub to follow along this guide with the completed code.

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
- A [Web3Auth account](https://dashboard.web3auth.io) and a Client ID.

## Install dependencies

{/* <!-- vale off --> */}

<Tabs items={['npm', 'yarn', 'pnpm']}>
  <Tabs.Tab>
    ```bash
    npm install @web3auth/modal @web3auth/base @web3auth/ethereum-provider
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    yarn add @web3auth/modal @web3auth/base @web3auth/ethereum-provider
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    pnpm add @web3auth/modal @web3auth/base @web3auth/ethereum-provider
    ```
  </Tabs.Tab>
</Tabs>

{/* <!-- vale on --> */}

## Steps

<Steps>

  ### Imports

  Here are the necessary imports for this guide. 

  {/* <!-- vale off --> */}

  ```typescript
  import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from '@web3auth/base'
  import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider'
  import { Web3Auth } from '@web3auth/modal'
  ```

  {/* <!-- vale on --> */}

  In addition, you will need to import a web3 library of your choice to use in the "Get the provider and signer" section. In this guide, we are using `viem`.

  ### Get the Client ID

  Check Web3Auth documentation on how to create a new project in their [dashboard](https://dashboard.web3auth.io) and [get the client ID](https://web3auth.io/docs/dashboard-setup/projects-and-analytics#client-id).

  Once you have it, you need to initialize the `WEB3AUTH_CLIENT_ID` variable with it.

  {/* <!-- vale off --> */}

  ```typescript
  const WEB3AUTH_CLIENT_ID = // ...
  ```

  {/* <!-- vale on --> */}

  ### Initialize Web3Auth

  Web3Auth initialization is done by instantiating the `Web3Auth` class with a `clientId`, a `privateKeyProvider` and some other configuration parameters like `web3AuthNetwork`, depending on if you are using it in a development or production environment. The full list of parameters can be checked in the [Instantiating Web3Auth guide](https://web3auth.io/docs/sdk/pnp/web/modal/initialize#instantiating-web3auth) from Web3Auth.

  To instantiate the `privateKeyProvider` you need to define the configuration of the selected chain for the signer with several properties like the ones listed below as an example for Sepolia testnet.

  After initializing the `web3auth` instance, you need to call the `initModal()` method.

  {/* <!-- vale off --> */}

  ```typescript
   const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: '0xaa36a7',
    rpcTarget: 'https://ethereum-sepolia-rpc.publicnode.com',
    displayName: 'Ethereum Sepolia Testnet',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    ticker: 'ETH',
    tickerName: 'Ethereum',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  }

  const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: { chainConfig }
  })

  const web3auth = new Web3Auth({
    clientId: WEB3AUTH_CLIENT_ID,
    privateKeyProvider,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
  })

  await web3auth.initModal()
  ```

  {/* <!-- vale on --> */}

  ### Login

  To login with an email address or social account you need to call the following method, that will open the popup and request the user to submit the login form.

  {/* <!-- vale off --> */}

  ```typescript
  const web3authProvider = await web3auth.connect()
  ```

  {/* <!-- vale on --> */}

  ### Get the provider and signer

  Once the user is logged in, you can get the `provider` and `signer`, which is the externally-owned account of the user that was derived from its credentials.

  {/* <!-- vale off --> */}

  <Tabs items={['viem']}>
    <Tabs.Tab>
      You can instantiate the provider using `viem` and the following imports:

      ```typescript
      import { createWalletClient, custom } from 'viem'
      import { sepolia } from 'viem/chains'
      ```

      ```typescript
      const provider = createWalletClient({
        chain: sepolia,
        transport: custom(web3authProvider)
      })

      const signer = await provider.getAddresses())[0]
      ```
    </Tabs.Tab>
  </Tabs>

  {/* <!-- vale on --> */}

  With the `provider` and `signer` you are ready to instantiate any of the kits from the Safe\{Core\} SDK and set up or use this signer as a Safe owner.

  ### Logout

  Finally, to logout the user, call the `logout()` method.

  {/* <!-- vale off --> */}

  ```typescript
  await web3auth.logout()
  ```

  {/* <!-- vale on --> */}

</Steps>

## Recap and further reading

After following this guide, you are able to create a Safe signer using Web3Auth and get the `provider` and `signer` required to initialize the kits from the Safe\{Core\} SDK.

Learn more about Web3Auth by checking the following resources:

- [Web3Auth website](https://web3auth.io)
- [Web3Auth documentation](https://web3auth.io/docs)
- [Web3Auth quickstart guide](https://web3auth.io/docs/quick-start?product=PNP&sdk=PNP_MODAL&framework=REACT&stepIndex=0&stepIndex=1)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/signers/passkeys.mdx`:

```mdx
import { Callout, Steps, Tabs } from 'nextra/components'

# Passkeys Signer

In this guide, you will learn how to create a Passkey signer that can be added as a Safe owner and used to initialize any of the kits from the Safe\{Core\} SDK.

<Callout type="warning" emoji="⚠️">
  Please always use a combination of passkeys and other authentication methods to ensure the security of your users' assets.
</Callout>

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
- Passkeys feature is available only in [secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (HTTPS), in some or all [supporting browsers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API#browser_compatibility).

## Install dependencies

{/* <!-- vale off --> */}

<Tabs items={['npm', 'yarn', 'pnpm']}>
  <Tabs.Tab>
    ```bash
    npm install @safe-global/protocol-kit
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    yarn add @safe-global/protocol-kit
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    pnpm add @safe-global/protocol-kit
    ```
  </Tabs.Tab>
</Tabs>

{/* <!-- vale on --> */}

## Steps

<Steps>

  ### Imports

  Here are the necessary imports for this guide.

  {/* <!-- vale off --> */}

  ```typescript
  import Safe from '@safe-global/protocol-kit'
  ```

  {/* <!-- vale on --> */}

  In addition, you will need to import a web3 library of your choice to use in the "Get the provider and signer" section. In this guide, we are using `viem`.

  ### Create a passkey

  Firstly, you need to generate a passkey credential using the [WebAuthn API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API) in a supporting browser environment.

  {/* <!-- vale off --> */}

  ```typescript
  const RP_NAME = 'Safe Smart Account'
  const USER_DISPLAY_NAME = 'User display name'
  const USER_NAME = 'User name'

  const passkeyCredential = await navigator.credentials.create({
    publicKey: {
      pubKeyCredParams: [
        {
          alg: -7,
          type: 'public-key'
        }
      ],
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: {
        name: RP_NAME
      },
      user: {
        displayName: USER_DISPLAY_NAME,
        id: crypto.getRandomValues(new Uint8Array(32)),
        name: USER_NAME
      },
      timeout: 60_000,
      attestation: 'none'
    }
  })
  ```

  {/* <!-- vale on --> */}

  After generating the `passkeyCredential` object, you need to create the signer. This signer will be a `PasskeyArgType` object containing the `rawId` and the `coordinates` information.

  {/* <!-- vale off --> */}

  ```typescript
  if (!passkeyCredential) {
    throw Error('Passkey creation failed: No credential was returned.')
  }

  const passkeySigner = await Safe.createPasskeySigner(passkeyCredential)
  ```

  {/* <!-- vale on --> */}

  At this point, it's critical to securely store the information in the `passkeySigner` object in a persistent service. Losing access to this data will result in the user being unable to access their passkey and, therefore, their Safe Smart Account.

  ### Get the provider and signer

  Once the passkey is created, you need the `provider` and `signer` properties required to instantiate the Safe\{Core\} SDK kits.

  Check [how to initialize the Protocol Kit](../../reference-sdk-protocol-kit/initialization/init.mdx)

  {/* <!-- vale off --> */}

  <Tabs items={['viem']}>
    <Tabs.Tab>
      You can instantiate the provider using `viem` and the following imports:

      ```typescript
      import { createWalletClient, http } from 'viem'
      import { sepolia } from 'viem/chains
      
      const provider = createWalletClient({
        chain: sepolia,
        transport: http('https://rpc.ankr.com/eth_sepolia')
      })
      const signer = passkey
      ```
    </Tabs.Tab>
  </Tabs>

  {/* <!-- vale on --> */}

  ### Instantiate SDK

  With the `provider` and `signer` you are ready to instantiate any of the kits from the Safe\{Core\} SDK and set up or use this signer as a Safe owner.

  For example, you can instantiate the `protocol-kit` as follows and sign a transaction with the passkey signer:

  {/* <!-- vale off --> */}

  ```typescript
  const protocolKit = await Safe.init({ provider, signer, safeAddress })
  
  const transaction = { to: '0x1234', value: '0x0', data: '0x' }
  const safeTransaction = await protocolKit.createTransaction({ transactions: [transaction] })
  const signedSafeTransaction = await protocolKit.signTransaction(safeTransaction)
  ```
  
  {/* <!-- vale on --> */}
  
</Steps>

## Recap and further reading

After following this guide, you are able to create a Safe signer using passkeys and get the `provider` and `signer` required to initialize the kits from the Safe\{Core\} SDK.

- [Safe Passkeys contracts](https://github.com/safe-global/safe-modules/tree/main/modules/passkey)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/signers/privy.mdx`:

```mdx


import { Tabs, Steps, Callout } from 'nextra/components'

# Privy Signer

In this guide, you will learn how to create a [Privy](https://privy.io) signer that can be added as a Safe owner and used to initialize any of the kits from the Safe\{Core\} SDK.

Check out the [Safe Signers demo app](https://github.com/5afe/safe-signers) on GitHub to follow along this guide with the completed code.

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
- A [Privy account](https://dashboard.privy.io) and an App ID.

## Install dependencies

{/* <!-- vale off --> */}

<Tabs items={['npm', 'yarn', 'pnpm']}>
  <Tabs.Tab>
    ```bash
    npm install @privy-io/react-auth
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    yarn add @privy-io/react-auth
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    pnpm add @privy-io/react-auth
    ```
  </Tabs.Tab>
</Tabs>

{/* <!-- vale on --> */}

## Steps

<Steps>

  ### Imports

  Here are the necessary imports for this guide.

  {/* <!-- vale off --> */}

  ```typescript
  import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth'
  ```

  {/* <!-- vale on --> */}

  In addition, you will need to import a web3 library of your choice to use in the "Get the provider and signer" section. In this guide, we are using `viem`.

  ### Get the App ID

  Check Privy documentation on how to create a new project in their [dashboard](https://dashboard.privy.io) and [get the client ID](https://docs.privy.io/guide/react/configuration/app-clients#app-clients).

  Once you have it, you need to initialize the `PRIVY_APP_ID` variable with it.

  {/* <!-- vale off --> */}

  ```typescript
  const PRIVY_APP_ID = // ...
  ```

  {/* <!-- vale on --> */}

  ### Initialize Privy

  Privy works with React hooks. This means you can wrap your app with the `PrivyProvider` and have access to several react hooks like `usePrivy()` and `useWallets()` that will provide all the functionality.

  `ProvyProvider` receives an `appId` and a `config` object with different properties. Check [Using the Privy React SDK](https://docs.privy.io/guide/react/concepts/use-privy#the-privyprovider-component) from Privy documentation to learn more about all the different configuration options, appearance, login methods, etc.

  {/* <!-- vale off --> */}

  ```typescript
  <PrivyProvider
    appId={PRIVY_APP_ID}
    config={{
      embeddedWallets: { 
        createOnLogin: 'users-without-wallets' // defaults to 'off'
      }
    }}
  >
    <App />
  </PrivyProvider>
  ```

  {/* <!-- vale on --> */}

  In this guide you will use the following variables and methods from the `usePrivy()` and `useWallets()` React hooks.
  
  {/* <!-- vale off --> */}

  ```typescript
  const { login, logout, ready, authenticated } = usePrivy()
  const { ready: readyWallets, wallets } = useWallets()
  ```

  {/* <!-- vale on --> */}

  ### Login

  To login with an email address or social account you need to call the following method, that will open the popup and request the user to submit the login form.

  {/* <!-- vale off --> */}

  ```typescript
  login()
  ```

  {/* <!-- vale on --> */}

  ### Get the provider and signer

  Once the user is logged in, you can get the `provider` and `signer`, which is the externally-owned account of the user that was derived from its credentials.
  
  To do that there is a `useEffect()` that is executed when any of the `ready`, `authenticated`, `readyWallets` and `wallets` variables have its value updated. Once they all are `true` and `wallets` has a length greater than zero, you have access to the `wallets` first element, which is the user's connected signer.

  {/* <!-- vale off --> */}

  <Tabs items={['viem']}>
    <Tabs.Tab>
      You can instantiate the provider using `viem` and the following imports:

      ```typescript
      import { createWalletClient, custom } from 'viem'
      import { sepolia } from 'viem/chains'
      ```

      ```typescript
      useEffect(() => {
        const init = async () => {
          if (ready && authenticated && readyWallets && wallets.length > 0 ) {
            const ethereumProvider = await wallets[0].getEthereumProvider()

            const provider = createWalletClient({
              chain: sepolia,
              transport: custom(ethereumProvider)
            })
      
            const signer = wallets[0].address
          }
        }
        init()
      }, [ready, authenticated, readyWallets, wallets])
      ```
    </Tabs.Tab>
  </Tabs>
  
  {/* <!-- vale on --> */}

  With the `provider` and `signer` you are ready to instantiate any of the kits from the Safe\{Core\} SDK and set up or use this signer as a Safe owner.

  ### Logout

  Finally, to logout the user, call the `logout()` method.

  {/* <!-- vale off --> */}

  ```typescript
  logout()
  ```

  {/* <!-- vale on --> */}

</Steps>

## Recap and further reading

After following this guide, you are able to create a Safe signer using Privy and get the `provider` and `signer` required to initialize the kits from the Safe\{Core\} SDK.

Learn more about Privy by checking the following resources:

- [Privy website](https://privy.io)
- [Privy documentation](https://docs.privy.io)
- [Privy quickstart guide](https://docs.privy.io/guide/react/quickstart)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/signers/magic.mdx`:

```mdx


import { Tabs, Steps, Callout } from 'nextra/components'

# Magic Signer

In this guide, you will learn how to create a [Magic](https://magic.link/) signer that can be added as a Safe owner and used to initialize any of the kits from the Safe\{Core\} SDK.

Check out the [Safe Signers demo app](https://github.com/5afe/safe-signers) on GitHub to follow along this guide with the completed code.

## Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
- A [Magic account](https://dashboard.magic.link) and an API key.

## Install dependencies

{/* <!-- vale off --> */}

<Tabs items={['npm', 'yarn', 'pnpm']}>
  <Tabs.Tab>
    ```bash
    npm install magic-sdk
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    yarn add magic-sdk
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    pnpm add magic-sdk
    ```
  </Tabs.Tab>
</Tabs>

{/* <!-- vale on --> */}

## Steps

<Steps>

  ### Imports

  Here are the necessary imports for this guide.

  {/* <!-- vale off --> */}

  ```typescript
  import { Magic } from 'magic-sdk'
  ```

  {/* <!-- vale on --> */}

  In addition, you will need to import a web3 library of your choice to use in the "Get the provider and signer" section. In this guide, we are using `viem`.

  ### Get the API Key

  Check Magic documentation on how to create a new project in their [dashboard](https://dashboard.magic.link) and [get the API key.](https://magic.link/docs/home/quickstart/cli#add-your-api-key)

  Once you have it, you need to initialize the `MAGIC_API_KEY` variable with it.

  {/* <!-- vale off --> */}

  ```typescript
  const MAGIC_API_KEY = // ...
  ```

  {/* <!-- vale on --> */}

  ### Initialize Magic

  Magic initialization is done by instantiating the `Magic` class with an `MAGIC_API_KEY`. Optionally, it also accepts some configuration parameters that can be checked in the [Magic Web API Reference](https://magic.link/docs/api/client-side-sdks/web).

  {/* <!-- vale off --> */}

  ```typescript
  const magic = new Magic(MAGIC_API_KEY)
  ```

  {/* <!-- vale on --> */}

  ### Login

  To login with an email address or social account you need to call the following method, that will open the popup and request the user to submit the login form.

  {/* <!-- vale off --> */}

  ```typescript
  await magic.wallet.connectWithUI()
  ```

  {/* <!-- vale on --> */}

  ### Get the provider and signer

  Once the user is logged in, you can get the `provider` and `signer`, which is the externally-owned account of the user that was derived from its credentials.

  {/* <!-- vale off --> */}

  <Tabs items={['viem']}>
    <Tabs.Tab>
      You can instantiate the provider using `viem` and the following imports:

      ```typescript
      import { createWalletClient, custom } from 'viem'
      import { sepolia } from 'viem/chains'
      ```

      ```typescript
      const provider = createWalletClient({
        chain: sepolia,
        transport: custom(magic.rpcProvider)
      })

      const metadata = await magic.user.getInfo()
      const signer = metadata.publicAddress
      ```
    </Tabs.Tab>
  </Tabs>

  {/* <!-- vale on --> */}

  With the `provider` and `signer` you are ready to instantiate any of the kits from the Safe\{Core\} SDK and set up or use this signer as a Safe owner.


  ### Logout

  Finally, to logout the user, call the `logout()` method.

  {/* <!-- vale off --> */}

  ```typescript
  await magic.user.logout()
  ```

  {/* <!-- vale on --> */}

</Steps>

## Recap and further reading

After following this guide, you are able to create a Safe signer using Magic and get the `provider` and `signer` required to initialize the kits from the Safe\{Core\} SDK.

Learn more about Magic by checking the following resources:

- [Magic website](https://magic.link)
- [Magic documentation](https://magic.link/docs)
- [Magic quickstart guide](https://magic.link/docs/home/quickstart/cli)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/signers/_meta.json`:

```json
{
  "dynamic": "Dynamic",
  "magic": "Magic",
  "passkeys": "Passkeys",
  "privy": "Privy",
  "web3auth": "Web3Auth"
}

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/signers/dynamic.mdx`:

```mdx


import { Tabs, Steps, Callout } from 'nextra/components'

# Dynamic Signer

In this guide, you will learn how to create a [Dynamic](https://dynamic.xyz) signer that can be added as a Safe owner and used to initialize any of the kits from the Safe\{Core\} SDK.

Check out the [Safe Signers demo app](https://github.com/5afe/safe-signers) on GitHub to follow along this guide with the completed code.

Note that this guide will focus on supporting Ethereum and EVM-compatible wallets. You can enable, import and add [more connectors](https://docs.dynamic.xyz/chains/enabling-chains#enabling-a-chain-network) as needed.

## Prerequisites

- A [Dynamic account](https://app.dynamic.xyz) and an environment ID.

## Install dependencies

{/* <!-- vale off --> */}

<Tabs items={['npm', 'yarn', 'pnpm']}>
  <Tabs.Tab>
    ```bash
    npm install @dynamic-labs/sdk-react-core @dynamic-labs/ethereum
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    yarn add @dynamic-labs/sdk-react-core @dynamic-labs/ethereum
    ```
  </Tabs.Tab>
  <Tabs.Tab>
    ```bash
    pnpm add @dynamic-labs/sdk-react-core @dynamic-labs/ethereum
    ```
  </Tabs.Tab>
</Tabs>

{/* <!-- vale on --> */}

## Steps

<Steps>

  ### Imports

  Here are the necessary imports for this guide.

  {/* <!-- vale off --> */}

  ```typescript
  import {
    DynamicContextProvider,
    useDynamicContext,
    useIsLoggedIn
  } from '@dynamic-labs/sdk-react-core'
  import {
    EthereumWalletConnectors,
    isEthereumWallet
  } from '@dynamic-labs/ethereum'
  ```

  {/* <!-- vale on --> */}

  ### Get the Environment ID

  Once you create a new Dynamic project in [the dashboard](https://app.dynamic.xyz), you will find your environment ID in [the SDK & API Keys page](https://app.dynamic.xyz/dashboard/developer/api).

  Once you have it, you need to initialize the `DYNAMIC_ENVIRONMENT_ID` variable with it.

  {/* <!-- vale off --> */}

  ```typescript
  const DYNAMIC_ENVIRONMENT_ID = // ...
  ```

  {/* <!-- vale on --> */}

  ### Initialize Dynamic

  Dynamic works with React hooks. This means you can wrap your app with the `DynamicContextProvider` and have access to several react hooks like `useDynamicContext()` that will provide all the functionality.

  `DynamicContextProvider` receives an `environmentId` and other configuration options. Check [Dynamic React SDK documentation](https://docs.dynamic.xyz/sdks/react-sdk/providers/dynamiccontextprovider) to learn more about all the different configuration options.

  {/* <!-- vale off --> */}

  ```typescript
  <DynamicContextProvider
    settings={{
      environmentId: DYNAMIC_ENVIRONMENT_ID,
      walletConnectors: [EthereumWalletConnectors],
      // Add other configuration options as needed
    }}
  >
    <App />
  </DynamicContextProvider>
  ```

  {/* <!-- vale on --> */}

  In this guide you will use the `primaryWallet` from the `useDynamicContext()` hook, and the `useIsLoggedIn()` hook.
  
  ```typescript
  const { primaryWallet } = useDynamicContext()
  const isLoggedIn = useIsLoggedIn()
  ```

  ### Login

  In the `App` component, add [the DynamicWidget component](https://docs.dynamic.xyz/sdks/react-sdk/components/dynamicwidget) that will handle all the login and authentication logic for you.

  {/* <!-- vale off --> */}

  ```typescript
  import { DynamicWidget } from '@dynamic-labs/sdk-react-core'

  const App = () => {
    return (
      <>
        // Your other content here
        <DynamicWidget />
      </>
    )
  }
  ```

  {/* <!-- vale on --> */}

  ### Get the provider and signer

  Once the user is logged in through the `DynamicWidget`, you can get the `provider` and `signer`, which is the externally-owned account of the user that was derived from its credentials.
  
  To do that there is a `useEffect()` that executes when any of the `isLoggedIn` and `primaryWallet` variables have their values updated. Once they are all `true`, you have access to the user's connected signer. Note that you should also check that the wallet is an Ethereum wallet using the `isEthereumWallet()` function.

  {/* <!-- vale off --> */}

  You can instantiate the provider and signer like so:

  ```typescript
  useEffect(() => {
    const init = async () => {
      if (isLoggedIn && primaryWallet && isEthereumWallet(primaryWallet)) {
        const provider = await primaryWallet.getWalletClient()

        const signer = primaryWallet.address
      }
    }
    init()
  }, [isLoggedIn, primaryWallet])
  ```

  {/* <!-- vale on --> */}
  
  With the `provider` and `signer` you are ready to instantiate any of the kits from the Safe\{Core\} SDK and set up or use this signer as a Safe owner.

</Steps>

## Recap and further reading

After following this guide, you are able to create a Safe signer using Dynamic and get the `provider` and `signer` required to initialize the kits from the Safe\{Core\} SDK.

Learn more about Dynamic by checking the following resources:

- [Dynamic website](https://dynamic.xyz)
- [Dynamic documentation](https://docs.dynamic.xyz)
- [Dynamic quickstart guide](https://docs.dynamic.xyz/quickstart)
- [Dynamic in a Safe App](https://docs.dynamic.xyz/guides/integrations/safe-app)

```

`/home/ygg/Workspace/Eliza/safe-docs/pages/sdk/protocol-kit.mdx`:

```mdx
import { Grid } from '@mui/material'
import CustomCard from '../../components/CustomCard'

# Protocol Kit

The Protocol Kit enables developers to interact with [Safe Smart Accounts](https://github.com/safe-global/safe-smart-account) using a TypeScript interface. This kit can be used to create new Safe smart accounts, update the configuration of existing Safes, propose and execute transactions, among other features.

<Grid item mt={3}>
  <CustomCard
    title={'@safe-global/protocol-kit'}
    description={''}
    url={'https://www.npmjs.com/package/@safe-global/protocol-kit'}
  />
</Grid>

The following guides show how to use the Protocol Kit and integrate it into your project:
- [Safe deployment](./protocol-kit/guides/safe-deployment.mdx)
- [Multichain Safe deployment](./protocol-kit/guides/multichain-safe-deployment.mdx)
- [Execute transactions](./protocol-kit/guides/execute-transactions.mdx)
- [Transactions signatures](./protocol-kit/guides/signatures/transactions.mdx)
- [Message signatures](./protocol-kit/guides/signatures/messages.mdx)

## Resources

- [Protocol Kit on GitHub](https://github.com/safe-global/safe-core-sdk/tree/main/packages/protocol-kit)

```
