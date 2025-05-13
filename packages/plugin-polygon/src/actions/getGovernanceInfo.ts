import { type Action, logger } from '@elizaos/core';
import { z } from 'zod';
import { formatUnits } from '../utils/formatters';
import { GovernanceService } from '../services/GovernanceService';
import { type Address } from '../types';

/**
 * Action to get governance information from Polygon
 */
export const getGovernanceInfoAction: Action = {
  name: 'GET_GOVERNANCE_INFO',
  description: 'Gets governance information from Polygon, including token details and governance settings.',
  
  // Define examples
  examples: [],
  
  // Validation function
  validate: async () => true,
  
  // Actual handler function that performs the operation
  handler: async (runtime, message, state, options) => {
    // Get Governance service
    const governanceService = runtime.getService<GovernanceService>(GovernanceService.serviceType);
    if (!governanceService) throw new Error('GovernanceService not available');
    
    logger.info('Fetching governance information');
    
    try {
      // Get token info and governance settings in parallel
      const [tokenInfo, governanceSettings] = await Promise.all([
        governanceService.getTokenInfo(),
        governanceService.getGovernanceSettings()
      ]);
      
      // Format the values for display
      const formattedTotalSupply = formatUnits(tokenInfo.totalSupply, tokenInfo.decimals);
      const formattedVotingDelay = formatUnits(governanceSettings.votingDelay, 0);
      const formattedVotingPeriod = formatUnits(governanceSettings.votingPeriod, 0);
      const formattedProposalThreshold = formatUnits(governanceSettings.proposalThreshold, tokenInfo.decimals);
      const formattedQuorum = formatUnits(governanceSettings.quorum, tokenInfo.decimals);
      
      // Create human-readable response
      const text = `Governance Information:\n\n` +
        `Token: ${tokenInfo.name} (${tokenInfo.symbol})\n` +
        `Total Supply: ${formattedTotalSupply} ${tokenInfo.symbol}\n` +
        `Decimals: ${tokenInfo.decimals}\n\n` +
        `Governance Settings:\n` +
        `Voting Delay: ${formattedVotingDelay} blocks\n` +
        `Voting Period: ${formattedVotingPeriod} blocks\n` +
        `Proposal Threshold: ${formattedProposalThreshold} ${tokenInfo.symbol}\n` +
        `Quorum: ${formattedQuorum} ${tokenInfo.symbol}`;
      
      return {
        text,
        actions: ['GET_GOVERNANCE_INFO'],
        data: {
          tokenInfo: {
            ...tokenInfo,
            formattedTotalSupply
          },
          governanceSettings: {
            ...governanceSettings,
            formattedVotingDelay,
            formattedVotingPeriod,
            formattedProposalThreshold,
            formattedQuorum
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching governance information:', error);
      return {
        text: `Error fetching governance information: ${error.message}`,
        actions: ['GET_GOVERNANCE_INFO'],
        data: { error: error.message }
      };
    }
  },
};

/**
 * Action to get voting power for an address
 */
export const getVotingPowerAction: Action = {
  name: 'GET_VOTING_POWER',
  description: 'Gets voting power for an address on Polygon governance.',
  
  // Define examples
  examples: [],
  
  // Validation function
  validate: async (options?: Record<string, any>) => {
    // Check if address is provided and valid
    if (!options?.address) {
      return false;
    }
    
    const address = options.address as string;
    if (typeof address !== 'string' || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return false;
    }
    
    return true;
  },
  
  // Actual handler function that performs the operation
  handler: async (runtime, message, state, options) => {
    // Get Governance service
    const governanceService = runtime.getService<GovernanceService>(GovernanceService.serviceType);
    if (!governanceService) throw new Error('GovernanceService not available');
    
    // Get address from options or use agent's address
    let targetAddress = options?.address as Address;
    if (!targetAddress) {
      targetAddress = runtime.getSetting('AGENT_ADDRESS') as Address;
      if (!targetAddress) throw new Error('Address not provided and agent address not found');
    }
    
    logger.info(`Fetching voting power for address: ${targetAddress}`);
    
    try {
      // Get token info, voting power and token balance in parallel
      const [tokenInfo, votingPower, tokenBalance] = await Promise.all([
        governanceService.getTokenInfo(),
        governanceService.getVotingPower(targetAddress),
        governanceService.getTokenBalance(targetAddress)
      ]);
      
      // Format the values for display
      const formattedVotingPower = formatUnits(votingPower, tokenInfo.decimals);
      const formattedTokenBalance = formatUnits(tokenBalance, tokenInfo.decimals);
      
      // Create human-readable response
      const text = `Voting Power for ${targetAddress}:\n\n` +
        `Token: ${tokenInfo.name} (${tokenInfo.symbol})\n` +
        `Token Balance: ${formattedTokenBalance} ${tokenInfo.symbol}\n` +
        `Voting Power: ${formattedVotingPower} votes`;
      
      return {
        text,
        actions: ['GET_VOTING_POWER'],
        data: {
          address: targetAddress,
          tokenInfo,
          votingPower: votingPower.toString(),
          tokenBalance: tokenBalance.toString(),
          formattedVotingPower,
          formattedTokenBalance
        }
      };
    } catch (error) {
      logger.error(`Error fetching voting power for ${targetAddress}:`, error);
      return {
        text: `Error fetching voting power: ${error.message}`,
        actions: ['GET_VOTING_POWER'],
        data: { error: error.message }
      };
    }
  },
}; 