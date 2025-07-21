import {
  Evaluator,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from '@elizaos/core';

export const tradeSuccessEvaluator: Evaluator = {
  name: 'TRADE_SUCCESS_EVALUATOR',
  description: 'Analyzes successful trades to learn patterns and improve future trading decisions',
  
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    // Only evaluate messages that resulted from swap or liquidity actions
    const actions = message.content.actions || [];
    const tradeActions = ['SWAP_TOKENS', 'MANAGE_LIQUIDITY'];
    
    return tradeActions.some(action => actions.includes(action));
  },

  evaluate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined
  ): Promise<{ success: boolean; response?: string }> => {
    try {
      logger.info('Evaluating trade success...');
      
      // Extract trade data from message or state
      const tradeData = message.content.data || {};
      
      // In a real implementation, you would:
      // 1. Analyze the trade outcome (profit/loss)
      // 2. Store successful trade patterns
      // 3. Update agent's trading preferences
      // 4. Learn from slippage and gas costs
      
      // For now, just log the trade
      if (tradeData.transactionHash) {
        logger.info(`Trade completed: ${tradeData.transactionHash}`);
        
        // You could store this in agent memory for future reference
        // runtime.updateMemory({
        //   type: 'trade_history',
        //   data: tradeData
        // });
      }

      return {
        success: true,
        response: 'Trade analysis completed',
      };
    } catch (error) {
      logger.error('Error in trade success evaluator:', error);
      return {
        success: false,
        response: 'Failed to evaluate trade',
      };
    }
  },
};