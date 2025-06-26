// @ts-nocheck
import { System } from '../../core/systems/System';
import type { World } from '../../types';
import {
  Minigame,
  MinigameType,
  MinigameStatus,
  MinigameSession,
  MinigamePlayer,
  MinigameStats,
  MinigameRewards,
  GameRequirements,
  MinigameComponent,
  Team,
  PlayerEntity,
  Vector3
} from '../types';

export class MinigameSystem extends System {
  protected sessions: Map<string, MinigameSession> = new Map();
  protected playerSessions: Map<string, string> = new Map(); // playerId -> sessionId
  protected queuedPlayers: Map<MinigameType, Set<string>> = new Map();
  protected minigameDefinitions: Map<MinigameType, Minigame> = new Map();

  // Configuration
  protected readonly MAX_QUEUE_TIME = 300000; // 5 minutes
  protected readonly MIN_PLAYERS_TO_START = 2;

  constructor(world: World) {
    super(world);
    this.initializeMinigames();
  }

  /**
   * Initialize minigame definitions
   */
  protected initializeMinigames(): void {
    // Basic minigame implementations
    this.minigameDefinitions.set(MinigameType.CASTLE_WARS, {
      id: 'castle_wars',
      name: 'Castle Wars',
      type: MinigameType.CASTLE_WARS,
      minPlayers: 2,
      maxPlayers: 50,
      duration: 1200000, // 20 minutes
      requirements: {
        combatLevel: 10
      },
      rewards: {
        points: 100,
        experience: { attack: 500, strength: 500, defence: 500 }
      },
      status: MinigameStatus.WAITING
    });

    this.minigameDefinitions.set(MinigameType.FIGHT_CAVES, {
      id: 'fight_caves',
      name: 'Fight Caves',
      type: MinigameType.FIGHT_CAVES,
      minPlayers: 1,
      maxPlayers: 1,
      duration: 3600000, // 1 hour
      requirements: {
        combatLevel: 40
      },
      rewards: {
        points: 1000,
        items: [{ itemId: 6570, quantity: 1, chance: 1.0 }] // Fire cape
      },
      status: MinigameStatus.WAITING
    });

    console.log('[MinigameSystem] Initialized with basic minigames');
  }

  /**
   * Join minigame queue
   */
  joinQueue(playerId: string, minigameType: MinigameType): boolean {
    // Check if already in a minigame
    if (this.playerSessions.has(playerId)) {
      this.emit('minigame:error', {
        playerId,
        error: 'You are already in a minigame'
      });
      return false;
    }

    // Check if already in queue
    for (const [type, queue] of this.queuedPlayers) {
      if (queue.has(playerId)) {
        if (type === minigameType) {
          this.emit('minigame:error', {
            playerId,
            error: 'You are already in this queue'
          });
          return false;
        } else {
          queue.delete(playerId);
        }
      }
    }

    const minigame = this.minigameDefinitions.get(minigameType);
    if (!minigame) {return false;}

    // Check requirements
    if (!this.checkRequirements(playerId, minigame.requirements)) {
      return false;
    }

    // Add to queue
    let queue = this.queuedPlayers.get(minigameType);
    if (!queue) {
      queue = new Set();
      this.queuedPlayers.set(minigameType, queue);
    }
    queue.add(playerId);

    // Update player component
    const player = this.world.entities.get(playerId);
    if (player) {
      const component = this.getOrCreateMinigameComponent(player as PlayerEntity);
      component.currentMinigame = minigameType;
    }

    // Check if we can start
    if (queue.size >= minigame.minPlayers) {
      this.tryStartMinigame(minigameType);
    }

    // Emit event
    this.emit('minigame:joined-queue', {
      playerId,
      minigameType,
      queueSize: queue.size,
      minPlayers: minigame.minPlayers
    });

    return true;
  }

  /**
   * Leave minigame queue
   */
  leaveQueue(playerId: string): boolean {
    for (const [type, queue] of this.queuedPlayers) {
      if (queue.has(playerId)) {
        queue.delete(playerId);

        // Update player component
        const player = this.world.entities.get(playerId);
        if (player) {
          const component = player.getComponent<MinigameComponent>('minigame');
          if (component) {
            component.currentMinigame = null;
          }
        }

        // Emit event
        this.emit('minigame:left-queue', {
          playerId,
          minigameType: type
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Leave active minigame
   */
  leaveMinigame(playerId: string): boolean {
    const sessionId = this.playerSessions.get(playerId);
    if (!sessionId) {return false;}

    const session = this.sessions.get(sessionId);
    if (!session || session.status === 'completed') {return false;}

    // Remove player
    session.players = session.players.filter(id => id !== playerId);
    this.playerSessions.delete(playerId);

    // Remove from team if applicable
    if (session.teams) {
      for (const team of session.teams.values()) {
        team.players.delete(playerId);
      }
    }

    // Update player component
    const player = this.world.entities.get(playerId);
    if (player) {
      const component = player.getComponent<MinigameComponent>('minigame');
      if (component) {
        component.currentMinigame = null;
        component.sessionId = null;
        component.team = null;
      }
    }

    // Teleport out
    this.teleportToLobby(playerId);

    // Check if minigame should end
    const minigame = this.minigameDefinitions.get(session.type);
    if (minigame && session.players.length < minigame.minPlayers) {
      this.endMinigame(sessionId, 'insufficient_players');
    }

    // Emit event
    this.emit('minigame:player-left', {
      playerId,
      sessionId,
      minigameType: session.type
    });

    return true;
  }

  /**
   * Try to start a minigame
   */
  protected tryStartMinigame(minigameType: MinigameType): boolean {
    const queue = this.queuedPlayers.get(minigameType);
    if (!queue) {return false;}

    const minigame = this.minigameDefinitions.get(minigameType);
    if (!minigame) {return false;}

    if (queue.size < minigame.minPlayers) {return false;}

    // Take players from queue
    const players: string[] = [];
    const maxToTake = Math.min(queue.size, minigame.maxPlayers);
    let count = 0;

    for (const playerId of queue) {
      if (count >= maxToTake) {break;}
      players.push(playerId);
      count++;
    }

    // Remove from queue
    for (const playerId of players) {
      queue.delete(playerId);
    }

    // Create session
    const sessionId = this.createSession(minigameType, players);

    return sessionId !== null;
  }

  /**
   * Create minigame session
   */
  protected createSession(minigameType: MinigameType, playerIds: string[]): string | null {
    const minigame = this.minigameDefinitions.get(minigameType);
    if (!minigame) {return null;}

    const sessionId = this.generateSessionId();
    const session: MinigameSession = {
      id: sessionId,
      type: minigameType,
      players: playerIds,
      teams: this.createTeams(minigameType, playerIds),
      startTime: Date.now(),
      status: 'waiting',
      data: this.createMinigameData(minigameType)
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Map players to session
    for (const playerId of playerIds) {
      this.playerSessions.set(playerId, sessionId);

      // Update player component
      const player = this.world.entities.get(playerId);
      if (player) {
        const component = player.getComponent<MinigameComponent>('minigame');
        if (component) {
          component.sessionId = sessionId;
          if (session.teams) {
            // Assign team
            for (const [teamName, team] of session.teams) {
              if (team.players.has(playerId)) {
                component.team = teamName;
                break;
              }
            }
          }
        }
      }
    }

    // Start preparation phase
    setTimeout(() => {
      this.startMinigame(sessionId);
    }, 30000); // 30 second preparation

    // Emit event
    this.emit('minigame:session-created', {
      sessionId,
      minigameType,
      players: playerIds,
      startTime: session.startTime + 30000
    });

    // Teleport players to minigame
    for (const playerId of playerIds) {
      this.teleportToMinigame(playerId, minigameType, session);
    }

    return sessionId;
  }

  /**
   * Start minigame
   */
  protected startMinigame(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'waiting') {return;}

    session.status = 'in_progress';

    // Initialize minigame-specific logic
    this.initializeGameplay(session);

    // Emit event
    this.emit('minigame:started', {
      sessionId,
      minigameType: session.type,
      players: session.players
    });
  }

  /**
   * End minigame
   */
  protected endMinigame(sessionId: string, reason?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === 'completed') {return;}

    session.status = 'completed';
    session.endTime = Date.now();

    // Calculate results
    const results = this.calculateResults(session);

    // Grant rewards
    for (const playerId of session.players) {
      const player = this.world.entities.get(playerId);
      if (!player) {continue;}

      const playerResults = results.get(playerId);
      if (playerResults) {
        this.grantRewards(playerId, session.type, playerResults);
        this.updateStats(playerId, session.type, playerResults);
      }

      // Clean up
      this.playerSessions.delete(playerId);
      const component = player.getComponent<MinigameComponent>('minigame');
      if (component) {
        component.currentMinigame = null;
        component.sessionId = null;
        component.team = null;
      }

      // Teleport out
      this.teleportToLobby(playerId);
    }

    // Clean up session after delay
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 60000); // Keep for 1 minute for results viewing

    // Emit event
    this.emit('minigame:ended', {
      sessionId,
      minigameType: session.type,
      reason,
      results: Array.from(results.entries())
    });
  }

  /**
   * Update player score
   */
  updatePlayerScore(sessionId: string, playerId: string, points: number): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'in_progress') {return;}

    const minigamePlayer = this.getMinigamePlayer(session, playerId);
    if (minigamePlayer) {
      minigamePlayer.score += points;

      // Update team score if applicable
      if (session.teams && minigamePlayer.teamId) {
        const team = session.teams.get(minigamePlayer.teamId);
        if (team) {
          team.score += points;
        }
      }

      // Emit event
      this.emit('minigame:score-updated', {
        sessionId,
        playerId,
        score: minigamePlayer.score,
        teamId: minigamePlayer.teamId,
        teamScore: session.teams?.get(minigamePlayer.teamId || '')?.score
      });
    }
  }

  /**
   * Check if player meets requirements
   */
  protected checkRequirements(playerId: string, requirements?: GameRequirements): boolean {
    if (!requirements) {return true;}

    const player = this.world.entities.get(playerId) as PlayerEntity;
    if (!player) {return false;}

    // Check combat level
    if (requirements.combatLevel) {
      const stats = player.getComponent('stats') as any;
      if (!stats || stats.combatLevel < requirements.combatLevel) {
        this.emit('minigame:error', {
          playerId,
          error: `You need combat level ${requirements.combatLevel}`
        });
        return false;
      }
    }

    // Check skills
    if (requirements.skills) {
      const stats = player.getComponent('stats');
      if (!stats) {return false;}

      for (const [skill, level] of Object.entries(requirements.skills)) {
        const skillData = (stats as any)[skill];
        if (!skillData || skillData.level < level) {
          this.emit('minigame:error', {
            playerId,
            error: `You need level ${level} ${skill}`
          });
          return false;
        }
      }
    }

    // Check quests
    if (requirements.quests) {
      const questLog = player.getComponent('questLog');
      if (!questLog) {return false;}

      for (const questId of requirements.quests) {
        const quest = (questLog as any).getQuest?.(questId);
        if (!quest || quest.status !== 'completed') {
          this.emit('minigame:error', {
            playerId,
            error: 'You must complete required quests first'
          });
          return false;
        }
      }
    }

    // Check items
    if (requirements.items) {
      const inventory = player.getComponent('inventory');
      if (!inventory) {return false;}

      for (const itemId of requirements.items) {
        if (!(inventory as any).hasItem?.(itemId)) {
          this.emit('minigame:error', {
            playerId,
            error: 'You need the required items'
          });
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Grant rewards to player
   */
  protected grantRewards(playerId: string, minigameType: MinigameType, results: any): void {
    const minigame = this.minigameDefinitions.get(minigameType);
    if (!minigame) {return;}

    const player = this.world.entities.get(playerId);
    if (!player) {return;}

    const rewards = this.calculateRewards(minigame.rewards, results);

    // Grant points
    if (rewards.points > 0) {
      const component = player.getComponent<MinigameComponent>('minigame');
      if (component) {
        const currentPoints = component.points.get(minigameType) || 0;
        component.points.set(minigameType, currentPoints + rewards.points);
      }
    }

    // Grant experience
    if (rewards.experience) {
      for (const [skill, xp] of Object.entries(rewards.experience)) {
        this.emit('skill:grant-xp', {
          playerId,
          skill,
          amount: xp
        });
      }
    }

    // Grant items
    if (rewards.items) {
      const inventory = player.getComponent('inventory');
      if (inventory) {
        for (const item of rewards.items) {
          if (Math.random() < item.chance) {
            (inventory as any).addItem?.({
              id: item.itemId,
              quantity: item.quantity
            });
          }
        }
      }
    }

    // Grant currency
    if (rewards.currency) {
      for (const [type, amount] of Object.entries(rewards.currency)) {
        this.emit('currency:grant', {
          playerId,
          type,
          amount
        });
      }
    }

    // Emit event
    this.emit('minigame:rewards-granted', {
      playerId,
      minigameType,
      rewards
    });
  }

  /**
   * Update player statistics
   */
  protected updateStats(playerId: string, minigameType: MinigameType, results: any): void {
    const player = this.world.entities.get(playerId);
    if (!player) {return;}

    const component = player.getComponent<MinigameComponent>('minigame');
    if (!component) {return;}

    let stats = component.stats.get(minigameType);
    if (!stats) {
      stats = {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        bestScore: 0,
        totalScore: 0,
        achievements: [],
        personalBest: {}
      };
      component.stats.set(minigameType, stats);
    }

    // Update stats
    stats.gamesPlayed++;
    if (results.won) {
      stats.wins++;
    } else {
      stats.losses++;
    }
    stats.totalScore += results.score || 0;
    if (results.score > stats.bestScore) {
      stats.bestScore = results.score;
    }

    // Check achievements
    const newAchievements = this.checkAchievements(minigameType, stats, results);
    for (const achievement of newAchievements) {
      if (!stats.achievements.includes(achievement)) {
        stats.achievements.push(achievement);
        this.emit('minigame:achievement-unlocked', {
          playerId,
          minigameType,
          achievement
        });
      }
    }
  }

  /**
   * Get or create minigame component
   */
  protected getOrCreateMinigameComponent(player: PlayerEntity): MinigameComponent {
    let component = player.getComponent<MinigameComponent>('minigame');
    if (!component) {
      component = {
        type: 'minigame',
        entity: player,
        data: {},
        currentMinigame: null,
        sessionId: null,
        team: null,
        stats: new Map(),
        points: new Map(),
        unlockedRewards: []
      };
      player.addComponent('minigame', component);
    }
    return component;
  }

  /**
   * Basic implementations for minigame methods
   */
  protected createTeams(minigameType: MinigameType, playerIds: string[]): Map<string, Team> | undefined {
    if (minigameType === MinigameType.CASTLE_WARS) {
      const teams = new Map<string, Team>();

      // Create two teams for Castle Wars
      teams.set('red', {
        id: 'red',
        name: 'Red Team',
        players: new Set(),
        score: 0,
        color: '#ff0000'
      });

      teams.set('blue', {
        id: 'blue',
        name: 'Blue Team',
        players: new Set(),
        score: 0,
        color: '#0000ff'
      });

      // Assign players to teams
      for (let i = 0; i < playerIds.length; i++) {
        const teamName = i % 2 === 0 ? 'red' : 'blue';
        teams.get(teamName)?.players.add(playerIds[i]);
      }

      return teams;
    }

    return undefined; // Single player minigames don't need teams
  }

  protected createMinigameData(minigameType: MinigameType): any {
    switch (minigameType) {
      case MinigameType.CASTLE_WARS:
        return {
          flags: { red: null, blue: null },
          captures: { red: 0, blue: 0 },
          respawnTimes: new Map<string, number>()
        };

      case MinigameType.FIGHT_CAVES:
        return {
          wave: 1,
          currentEnemies: [],
          playerPosition: { x: 0, y: 0, z: 0 }
        };

      default:
        return {};
    }
  }

  protected initializeGameplay(session: MinigameSession): void {
    // Basic initialization - override for specific minigames
    console.log(`[MinigameSystem] Initializing gameplay for ${session.type}`);

    if (session.type === MinigameType.CASTLE_WARS) {
      // Initialize castle wars specific gameplay
      this.emit('minigame:message', {
        sessionId: session.id,
        message: 'Castle Wars has begun! Capture the enemy flag!'
      });
    } else if (session.type === MinigameType.FIGHT_CAVES) {
      // Initialize fight caves
      this.emit('minigame:message', {
        sessionId: session.id,
        message: 'Fight Caves: Survive 63 waves to earn your Fire Cape!'
      });
    }
  }

  protected calculateResults(session: MinigameSession): Map<string, any> {
    const results = new Map<string, any>();

    for (const playerId of session.players) {
      const baseResult = {
        playerId,
        score: 100, // Base score
        won: false,
        participated: true,
        duration: Date.now() - session.startTime
      };

      if (session.teams) {
        // Team-based results
        for (const [_teamName, team] of session.teams) {
          if (team.players.has(playerId)) {
            baseResult.won = team.score > 0; // Simple win condition
            baseResult.score += team.score * 10;
            break;
          }
        }
      } else {
        // Individual results - simple completion bonus
        baseResult.won = true;
        baseResult.score += 50;
      }

      results.set(playerId, baseResult);
    }

    return results;
  }

  protected calculateRewards(baseRewards: MinigameRewards, results: any): MinigameRewards {
    const rewards: MinigameRewards = {
      points: baseRewards.points || 0,
      experience: { ...baseRewards.experience },
      items: baseRewards.items ? [...baseRewards.items] : undefined,
      currency: baseRewards.currency ? { ...baseRewards.currency } : undefined
    };

    // Apply multipliers based on performance
    if (results.won) {
      rewards.points = Math.floor(rewards.points * 1.5);

      if (rewards.experience) {
        for (const [skill, xp] of Object.entries(rewards.experience)) {
          rewards.experience[skill] = Math.floor(xp * 1.2);
        }
      }
    }

    // Participation reward
    if (results.participated) {
      rewards.points = Math.max(rewards.points, 25);
    }

    return rewards;
  }

  protected checkAchievements(minigameType: MinigameType, stats: MinigameStats, results: any): string[] {
    const achievements: string[] = [];

    // First game achievement
    if (stats.gamesPlayed === 1) {
      achievements.push(`${minigameType}_first_game`);
    }

    // Win achievements
    if (results.won) {
      if (stats.wins === 1) {
        achievements.push(`${minigameType}_first_win`);
      } else if (stats.wins === 10) {
        achievements.push(`${minigameType}_veteran`);
      } else if (stats.wins === 100) {
        achievements.push(`${minigameType}_master`);
      }
    }

    // Score achievements
    if (results.score >= 1000) {
      achievements.push(`${minigameType}_high_score`);
    }

    return achievements;
  }

  protected teleportToMinigame(playerId: string, minigameType: MinigameType, _session: MinigameSession): void {
    // Basic teleport - in a real implementation this would move the player
    this.emit('player:teleport', {
      playerId,
      destination: this.getMinigameLocation(minigameType),
      reason: 'minigame_start'
    });

    console.log(`[MinigameSystem] Teleported player ${playerId} to ${minigameType}`);
  }

  protected teleportToLobby(playerId: string): void {
    // Teleport back to main game area
    this.emit('player:teleport', {
      playerId,
      destination: { x: 0, y: 0, z: 0 }, // Lobby position
      reason: 'minigame_end'
    });

    console.log(`[MinigameSystem] Teleported player ${playerId} back to lobby`);
  }

  /**
   * Get minigame location
   */
  protected getMinigameLocation(minigameType: MinigameType): Vector3 {
    switch (minigameType) {
      case MinigameType.CASTLE_WARS:
        return { x: -100, y: 0, z: -100 };
      case MinigameType.FIGHT_CAVES:
        return { x: 100, y: 0, z: 100 };
      default:
        return { x: 0, y: 0, z: 50 };
    }
  }

  /**
   * Helper methods
   */
  protected getMinigamePlayer(_session: MinigameSession, _playerId: string): MinigamePlayer | null {
    // This would be overridden by specific implementations
    return null;
  }

  protected generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update loop
   */
  update(_delta: number): void {
    // Check queue timeouts
    const _now = Date.now();
    for (const [type, queue] of this.queuedPlayers) {
      for (const _playerId of queue) {
        // In a real implementation, track when each player joined
        // For now, just try to start periodically
        if (queue.size >= this.MIN_PLAYERS_TO_START) {
          this.tryStartMinigame(type);
        }
      }
    }

    // Update active minigames
    for (const session of this.sessions.values()) {
      if (session.status === 'in_progress') {
        this.updateMinigame(session, _delta);
      }
    }
  }

  /**
   * Update specific minigame
   */
  protected updateMinigame(session: MinigameSession, _delta: number): void {
    // Basic update logic - override for specific minigames
    const minigame = this.minigameDefinitions.get(session.type);
    if (!minigame) {return;}

    // Check for time-based end conditions
    const elapsed = Date.now() - session.startTime;
    if (elapsed >= minigame.duration) {
      this.endMinigame(session.id, 'time_limit');
      return;
    }

    // Update specific minigame logic
    switch (session.type) {
      case MinigameType.CASTLE_WARS:
        this.updateCastleWars(session, _delta);
        break;

      case MinigameType.FIGHT_CAVES:
        this.updateFightCaves(session, _delta);
        break;
    }
  }

  /**
   * Update Castle Wars minigame
   */
  private updateCastleWars(session: MinigameSession, _delta: number): void {
    const _data = session.data as any;

    // Simple scoring simulation
    if (Math.random() < 0.01) { // 1% chance per update
      if (session.teams) {
        const teams = Array.from(session.teams.values());
        const scoringTeam = teams[Math.floor(Math.random() * teams.length)];
        scoringTeam.score++;

        this.emit('minigame:team-scored', {
          sessionId: session.id,
          teamId: scoringTeam.id,
          score: scoringTeam.score
        });

        // Check win condition
        if (scoringTeam.score >= 3) {
          this.endMinigame(session.id, 'victory');
        }
      }
    }
  }

  /**
   * Update Fight Caves minigame
   */
  private updateFightCaves(session: MinigameSession, _delta: number): void {
    const data = session.data as any;

    // Simple wave progression
    if (data.currentEnemies.length === 0) {
      data.wave++;

      if (data.wave > 63) {
        // Completed all waves
        this.endMinigame(session.id, 'victory');
        return;
      }

      // Spawn new enemies for the wave
      const enemyCount = Math.min(data.wave, 5);
      data.currentEnemies = Array(enemyCount).fill(0).map((_, i) => ({
        id: `enemy_${data.wave}_${i}`,
        type: 'tzhaar',
        health: 100 * data.wave
      }));

      this.emit('minigame:wave-started', {
        sessionId: session.id,
        wave: data.wave,
        enemies: data.currentEnemies.length
      });
    }
  }
}
