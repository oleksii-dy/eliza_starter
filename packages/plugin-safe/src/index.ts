import { Plugin, Runtime} from '@elizaos/core'
import Safe from '@safe-global/protocol-kit'
import SafeApiKit from '@safe-global/api-kit'
import { MetaTransactionData } from '@safe-global/safe-core-sdk-types'

// Import actions
import {
  createSafeAction,
  deployNewSafeAction,
  proposeTransactionAction,
  executeTransactionAction,
  batchTransactionsAction,
  addOwnerAction,
  removeOwnerAction,
  changeThresholdAction
} from './actions'

// Import providers
import {
  safeBalanceProvider,
  safeTransactionProvider,
  safeOwnerProvider,
  safeConfigProvider
} from './providers'

// Import evaluators
import {
  transactionEvaluator,
  ownershipEvaluator
} from './evaluators'

export class SafePlugin implements Plugin {
  name = 'plugin-safe'
  runtime: Runtime
  safeSDK: Safe
  safeApi: SafeApiKit

  constructor(runtime: Runtime) {
    this.runtime = runtime
    this.initializeSafeSDK()
    this.initializeApiKit()

    // Register components
    this.registerActions()
    this.registerProviders()
    this.registerEvaluators()
  }

  private async initializeSafeSDK() {
    this.safeSDK = await Safe.create({
      ethAdapter: this.runtime.ethAdapter,
      safeAddress: this.runtime.config.safeAddress
    })
  }

  private initializeApiKit() {
    this.safeApi = new SafeApiKit({
      txServiceUrl: this.runtime.config.safeApiUrl,
      ethAdapter: this.runtime.ethAdapter
    })
  }

  private registerActions() {
    return [
      createSafeAction,
      deployNewSafeAction,
      proposeTransactionAction,
      executeTransactionAction,
      batchTransactionsAction,
      addOwnerAction,
      removeOwnerAction,
      changeThresholdAction
    ]
  }

  private registerProviders() {
    return [
      safeBalanceProvider,
      safeTransactionProvider,
      safeOwnerProvider,
safeConfigProvider
    ]
  }

  private registerEvaluators() {
    return [
      transactionEvaluator,
      ownershipEvaluator
    ]
  }
}
