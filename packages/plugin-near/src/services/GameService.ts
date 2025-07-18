import { elizaLogger, type IAgentRuntime } from '@elizaos/core';
import { BaseNearService } from './base/BaseService';
import { WalletService } from './WalletService';
import { StorageService } from './StorageService';
import { NearPluginError, NearErrorCode } from '../core/errors';
import { utils } from 'near-api-js';

/**
 * Simple game service using storage for state management
 * Games include guessing games, trivia, and collaborative puzzles
 */
export interface Game {
  id: string;
  type: 'guess_number' | 'riddle' | 'trivia' | 'word_association';
  creator: string;
  participants: string[];
  state: 'waiting' | 'active' | 'completed';
  prize?: string; // In NEAR
  data: any; // Game-specific data
  winner?: string;
  createdAt: number;
  completedAt?: number;
}

export interface GameMove {
  gameId: string;
  player: string;
  move: any;
  timestamp: number;
}

export class GameService extends BaseNearService {
  static serviceType = 'near-games';
  capabilityDescription = 'Manages multi-agent games and competitions on NEAR';

  private walletService!: WalletService;
  private storageService!: StorageService;
  private activeGames: Map<string, Game> = new Map();

  async onInitialize(): Promise<void> {
    const walletService = this.runtime.getService<WalletService>('near-wallet' as any);
    const storageService = this.runtime.getService<StorageService>('near-storage' as any);

    if (!walletService || !storageService) {
      throw new NearPluginError(NearErrorCode.UNKNOWN_ERROR, 'Required services not available');
    }

    this.walletService = walletService;
    this.storageService = storageService;

    // Load active games
    await this.loadActiveGames();

    elizaLogger.info('Game service initialized');
  }

  private async loadActiveGames(): Promise<void> {
    // Skip storage operations in test mode
    if (process.env.NODE_ENV === 'test' || process.env.SKIP_CONTRACT_VERIFICATION === 'true') {
      elizaLogger.info('Skipping active games loading in test mode');
      return;
    }

    try {
      const gameIds = (await this.storageService.get('games:active')) || [];

      for (const gameId of gameIds) {
        const game = await this.storageService.get(`game:${gameId}`);
        if (game && game.state !== 'completed') {
          this.activeGames.set(gameId, game);
        }
      }
    } catch (error) {
      elizaLogger.warn('Failed to load active games', error);
    }
  }

  private async saveActiveGames(): Promise<void> {
    // Skip storage operations in test mode
    if (process.env.NODE_ENV === 'test' || process.env.SKIP_CONTRACT_VERIFICATION === 'true') {
      return;
    }

    const activeGameIds = Array.from(this.activeGames.keys());
    await this.storageService.set('games:active', activeGameIds);
  }

  /**
   * Create a new guess the number game
   */
  async createGuessNumberGame(maxNumber: number = 100, prize?: string): Promise<string> {
    const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const game: Game = {
      id: gameId,
      type: 'guess_number',
      creator: this.walletService.getAddress(),
      participants: [this.walletService.getAddress()],
      state: 'active',
      prize,
      data: {
        secretNumber: Math.floor(Math.random() * maxNumber) + 1,
        maxNumber,
        attempts: [],
      },
      createdAt: Date.now(),
    };

    this.activeGames.set(gameId, game);
    await this.storageService.set(`game:${gameId}`, game);

    // Update active games list
    await this.saveActiveGames();

    elizaLogger.info(`Created guess number game ${gameId}`);
    return gameId;
  }

  /**
   * Join an existing game
   */
  async joinGame(gameId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.state !== 'waiting') {
      throw new Error('Game is not accepting new players');
    }

    const playerAddress = this.walletService.getAddress();
    if (!game.participants.includes(playerAddress)) {
      game.participants.push(playerAddress);
      await this.storageService.set(`game:${gameId}`, game);
      this.activeGames.set(gameId, game);
    }

    // If enough players, start the game
    if (game.participants.length >= 2) {
      game.state = 'active';
      await this.storageService.set(`game:${gameId}`, game);
    }

    // Update active games list
    await this.saveActiveGames();

    elizaLogger.info(`Player ${playerAddress} joined game ${gameId}`);
  }

  /**
   * Make a move in a game
   */
  async makeMove(
    gameId: string,
    move: any
  ): Promise<{
    correct?: boolean;
    hint?: string;
    winner?: string;
  }> {
    try {
      const game = this.activeGames.get(gameId);

      if (!game || game.state !== 'active') {
        throw new NearPluginError(NearErrorCode.UNKNOWN_ERROR, 'Game not active');
      }

      const playerAddress = this.walletService.getAddress();

      if (!game.participants.includes(playerAddress)) {
        throw new NearPluginError(NearErrorCode.UNKNOWN_ERROR, 'Not a participant in this game');
      }

      // Store move
      const gameMove: GameMove = {
        gameId,
        player: playerAddress,
        move,
        timestamp: Date.now(),
      };

      await this.storageService.set(`game:${gameId}:move:${Date.now()}`, gameMove);

      // Process move based on game type
      let result: any = {};

      switch (game.type) {
        case 'guess_number':
          result = await this.processNumberGuess(game, playerAddress, move);
          break;
        case 'riddle':
          result = await this.processRiddleAnswer(game, playerAddress, move);
          break;
        case 'trivia':
          result = await this.processTriviaAnswer(game, playerAddress, move);
          break;
        default:
          throw new Error('Unknown game type');
      }

      // Check if game is won
      if (result.correct && game.type === 'guess_number') {
        game.state = 'completed';
        game.winner = playerAddress;
        game.completedAt = Date.now();

        // Award prize if any
        if (game.prize && game.creator !== playerAddress) {
          const account = await this.walletService.getAccount();
          await account.sendMoney(
            playerAddress,
            BigInt(utils.format.parseNearAmount(game.prize) || '0')
          );
        }

        await this.storageService.set(`game:${gameId}`, game);
        this.activeGames.delete(gameId);

        result.winner = playerAddress;
      }

      return result;
    } catch (error) {
      throw new NearPluginError(NearErrorCode.TRANSACTION_FAILED, 'Failed to make move', error);
    }
  }

  private async processNumberGuess(
    game: Game,
    player: string,
    guess: number
  ): Promise<{ correct: boolean; hint?: string }> {
    const secretNumber = game.data.secretNumber;

    // Track attempt
    if (!game.data.attempts[player]) {
      game.data.attempts[player] = [];
    }
    game.data.attempts[player].push(guess);

    if (guess === secretNumber) {
      return { correct: true };
    } else if (guess < secretNumber) {
      return { correct: false, hint: 'Too low!' };
    } else {
      return { correct: false, hint: 'Too high!' };
    }
  }

  private async processRiddleAnswer(
    game: Game,
    player: string,
    answer: string
  ): Promise<{ correct: boolean }> {
    const correctAnswer = game.data.answer.toLowerCase();
    const playerAnswer = answer.toLowerCase().trim();

    return { correct: correctAnswer === playerAnswer };
  }

  private async processTriviaAnswer(
    game: Game,
    player: string,
    answer: string
  ): Promise<{ correct: boolean }> {
    const correctAnswer = game.data.correctAnswer;

    return { correct: answer === correctAnswer };
  }

  /**
   * Create a riddle game
   */
  async createRiddleGame(riddle: string, answer: string, prize?: string): Promise<string> {
    try {
      const account = await this.walletService.getAccount();

      const game: Game = {
        id: `game-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'riddle',
        creator: account.accountId,
        participants: [account.accountId],
        state: 'waiting',
        prize,
        data: {
          riddle,
          answer, // In production, this would be hashed
        },
        createdAt: Date.now(),
      };

      await this.storageService.set(`game:${game.id}`, game);
      this.activeGames.set(game.id, game);

      elizaLogger.success(`Created riddle game: ${game.id}`);
      return game.id;
    } catch (error) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        'Failed to create riddle game',
        error
      );
    }
  }

  /**
   * Get active games
   */
  async getActiveGames(): Promise<Game[]> {
    return Array.from(this.activeGames.values())
      .filter((game) => game.state !== 'completed')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get game details
   */
  async getGame(gameId: string): Promise<Game | null> {
    try {
      const game =
        this.activeGames.get(gameId) || (await this.storageService.get(`game:${gameId}`));

      return game;
    } catch (error) {
      elizaLogger.warn(`Failed to get game ${gameId}`, error);
      return null;
    }
  }

  /**
   * Get game history for a player
   */
  async getPlayerHistory(playerAddress?: string): Promise<{
    wins: number;
    losses: number;
    games: Game[];
  }> {
    try {
      const player = playerAddress || this.walletService.getAddress();
      const stats = (await this.storageService.get(`player:${player}:stats`)) || {
        wins: 0,
        losses: 0,
        gameIds: [],
      };

      const games: Game[] = [];
      for (const gameId of stats.gameIds || []) {
        const game = await this.storageService.get(`game:${gameId}`);
        if (game) {
          games.push(game);
        }
      }

      return {
        wins: stats.wins,
        losses: stats.losses,
        games,
      };
    } catch (error) {
      elizaLogger.warn('Failed to get player history', error);
      return { wins: 0, losses: 0, games: [] };
    }
  }

  /**
   * Create a collaborative word association game
   */
  async createWordGame(startWord: string, targetWord: string): Promise<string> {
    try {
      const account = await this.walletService.getAccount();

      const game: Game = {
        id: `game-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'word_association',
        creator: account.accountId,
        participants: [account.accountId],
        state: 'waiting',
        data: {
          startWord,
          targetWord,
          chain: [startWord],
          moves: [],
        },
        createdAt: Date.now(),
      };

      await this.storageService.set(`game:${game.id}`, game);
      this.activeGames.set(game.id, game);

      elizaLogger.success(`Created word association game: ${game.id}`);
      return game.id;
    } catch (error) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        'Failed to create word game',
        error
      );
    }
  }

  protected async checkHealth(): Promise<void> {
    // Service is healthy if wallet and storage are available
    await this.walletService.getAccount();
  }

  protected async onCleanup(): Promise<void> {
    // Save active games before cleanup
    if (this.activeGames.size > 0) {
      await this.saveActiveGames();
    }
  }

  static async start(runtime: IAgentRuntime): Promise<GameService> {
    const service = new GameService();
    await service.initialize(runtime);
    return service;
  }

  async stop(): Promise<void> {
    await this.cleanup();
  }
}
