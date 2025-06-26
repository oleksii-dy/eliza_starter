// @ts-nocheck
import { MinigameSystem } from '../MinigameSystem';
// import type { World } from '../../../types';
import {
  MinigameType,
  MinigameSession,
  MinigameRewards,
  MinigameStats,
  Team,
  CastleWarsData,
  Vector3,
  Minigame,
  MinigameStatus
} from '../../types';

export class CastleWarsSystem extends MinigameSystem {
  // Castle Wars specific configuration
  private readonly GAME_DURATION = 1200000; // 20 minutes
  private readonly FLAG_CAPTURE_POINTS = 10;
  private readonly BARRICADE_HEALTH = 100;
  private readonly MAX_BARRICADES_PER_TEAM = 10;

  // Map locations
  private readonly SARADOMIN_BASE: Vector3 = { x: 2426, y: 0, z: 3076 };
  private readonly ZAMORAK_BASE: Vector3 = { x: 2373, y: 0, z: 3135 };
  private readonly LOBBY: Vector3 = { x: 2440, y: 0, z: 3090 };

  protected initializeMinigames(): void {
    const castleWars: Minigame = {
      id: 'castle_wars',
      name: 'Castle Wars',
      type: MinigameType.CASTLE_WARS,
      minPlayers: 4,
      maxPlayers: 40,
      duration: this.GAME_DURATION,
      requirements: {
        combatLevel: 40
      },
      rewards: {
        points: 2, // Base points for participation
        experience: {
          combat: 1000
        },
        items: [
          { itemId: 4067, quantity: 1, chance: 0.1 }, // Castle wars ticket
          { itemId: 4068, quantity: 1, chance: 0.05 } // Castle wars decorative armor piece
        ],
        currency: {}
      },
      status: MinigameStatus.WAITING
    };

    this.minigameDefinitions.set(MinigameType.CASTLE_WARS, castleWars);
  }

  protected createTeams(minigameType: MinigameType, playerIds: string[]): Map<string, Team> {
    const teams = new Map<string, Team>();

    // Create Saradomin team
    teams.set('saradomin', {
      id: 'saradomin',
      name: 'Saradomin',
      color: '#0088ff',
      players: new Set(),
      score: 0
    });

    // Create Zamorak team
    teams.set('zamorak', {
      id: 'zamorak',
      name: 'Zamorak',
      color: '#ff0000',
      players: new Set(),
      score: 0
    });

    // Balance teams
    let saradominCount = 0;
    let zamorakCount = 0;

    for (const playerId of playerIds) {
      if (saradominCount <= zamorakCount) {
        teams.get('saradomin')!.players.add(playerId);
        saradominCount++;
      } else {
        teams.get('zamorak')!.players.add(playerId);
        zamorakCount++;
      }
    }

    return teams;
  }

  protected createMinigameData(_minigameType: MinigameType): CastleWarsData {
    return {
      saradominScore: 0,
      zamorakScore: 0,
      flagCarriers: {
        saradomin: null,
        zamorak: null
      },
      barricades: [],
      timeRemaining: this.GAME_DURATION
    };
  }

  protected initializeGameplay(session: MinigameSession): void {
    const _data = session.data as CastleWarsData;

    // Spawn flags at bases
    this.emit('castlewars:flag-spawned', {
      sessionId: session.id,
      team: 'saradomin',
      position: this.SARADOMIN_BASE
    });

    this.emit('castlewars:flag-spawned', {
      sessionId: session.id,
      team: 'zamorak',
      position: this.ZAMORAK_BASE
    });

    // Give starting supplies to players
    for (const playerId of session.players) {
      this.giveStartingSupplies(playerId);
    }
  }

  protected calculateResults(session: MinigameSession): Map<string, any> {
    const results = new Map<string, any>();
    const data = session.data as CastleWarsData;

    // Determine winning team
    let winningTeam: string | null = null;
    if (data.saradominScore > data.zamorakScore) {
      winningTeam = 'saradomin';
    } else if (data.zamorakScore > data.saradominScore) {
      winningTeam = 'zamorak';
    }

    // Calculate results for each player
    for (const playerId of session.players) {
      const player = this.world.entities.get(playerId);
      if (!player) {continue;}

      const component = player.getComponent('minigame');
      if (!component) {continue;}

      const team = (component as any).team;
      const won = team === winningTeam;

      results.set(playerId, {
        won,
        team,
        score: 0, // Would track individual contributions
        flagCaptures: 0,
        kills: 0,
        deaths: 0
      });
    }

    return results;
  }

  protected calculateRewards(baseRewards: MinigameRewards, results: any): MinigameRewards {
    const rewards = { ...baseRewards };

    // Winners get double points
    if (results.won) {
      rewards.points *= 2;
    }

    // Bonus points for performance
    rewards.points += Math.floor(results.flagCaptures * 5);
    rewards.points += Math.floor(results.kills * 0.5);

    // Bonus XP
    if (rewards.experience) {
      for (const skill in rewards.experience) {
        rewards.experience[skill] = Math.floor(rewards.experience[skill] * (results.won ? 2 : 1));
      }
    }

    return rewards;
  }

  protected checkAchievements(minigameType: MinigameType, stats: MinigameStats, results: any): string[] {
    const achievements: string[] = [];

    // First win
    if (stats.wins === 1) {
      achievements.push('castle_wars_first_win');
    }

    // Win streaks
    if (stats.wins === 10) {
      achievements.push('castle_wars_veteran');
    }

    if (stats.wins === 100) {
      achievements.push('castle_wars_champion');
    }

    // Performance achievements
    if (results.flagCaptures >= 3) {
      achievements.push('castle_wars_flag_runner');
    }

    if (results.kills >= 10 && results.deaths === 0) {
      achievements.push('castle_wars_untouchable');
    }

    return achievements;
  }

  protected teleportToMinigame(playerId: string, _minigameType: MinigameType, _session: MinigameSession): void {
    const player = this.world.entities.get(playerId);
    if (!player) {return;}

    const component = player.getComponent('minigame');
    if (!component) {return;}

    const team = (component as any).team;
    const movement = player.getComponent('movement');

    if (movement) {
      // Teleport to team base
      const destination = team === 'saradomin' ? this.SARADOMIN_BASE : this.ZAMORAK_BASE;
      (movement as any).teleportDestination = destination;
      (movement as any).teleportTime = Date.now();
    }
  }

  protected teleportToLobby(playerId: string): void {
    const player = this.world.entities.get(playerId);
    if (!player) {return;}

    const movement = player.getComponent('movement');
    if (movement) {
      (movement as any).teleportDestination = this.LOBBY;
      (movement as any).teleportTime = Date.now();
    }
  }

  protected updateMinigame(session: MinigameSession, _delta: number): void {
    const data = session.data as CastleWarsData;

    // Update time remaining
    data.timeRemaining -= _delta;

    if (data.timeRemaining <= 0) {
      this.endMinigame(session.id, 'time_up');
      return;
    }

    // Check win conditions (first to 3 captures)
    if (data.saradominScore >= 3 || data.zamorakScore >= 3) {
      this.endMinigame(session.id, 'score_limit');

    }
  }

  /**
   * Castle Wars specific methods
   */

  /**
   * Player picks up flag
   */
  pickupFlag(playerId: string, team: 'saradomin' | 'zamorak'): boolean {
    const sessionId = this.playerSessions.get(playerId);
    if (!sessionId) {return false;}

    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'in_progress') {return false;}

    const data = session.data as CastleWarsData;
    const player = this.world.entities.get(playerId);
    if (!player) {return false;}

    const component = player.getComponent('minigame');
    if (!component) {return false;}

    const playerTeam = (component as any).team;

    // Can't pick up own team's flag
    if (playerTeam === team) {
      this.emit('castlewars:error', {
        playerId,
        error: "You can't pick up your own flag"
      });
      return false;
    }

    // Check if flag is already carried
    if (data.flagCarriers[team]) {
      this.emit('castlewars:error', {
        playerId,
        error: 'Flag is already being carried'
      });
      return false;
    }

    // Pick up flag
    data.flagCarriers[team] = playerId;

    // Give flag item
    const inventory = player.getComponent('inventory');
    if (inventory) {
      const flagItemId = team === 'saradomin' ? 4037 : 4039; // Saradomin/Zamorak flag
      (inventory as any).addItem?.({ id: flagItemId, quantity: 1 });
    }

    // Emit event
    this.emit('castlewars:flag-taken', {
      sessionId: session.id,
      playerId,
      playerTeam,
      flagTeam: team
    });

    return true;
  }

  /**
   * Player captures flag
   */
  captureFlag(playerId: string): boolean {
    const sessionId = this.playerSessions.get(playerId);
    if (!sessionId) {return false;}

    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'in_progress') {return false;}

    const data = session.data as CastleWarsData;
    const player = this.world.entities.get(playerId);
    if (!player) {return false;}

    const component = player.getComponent('minigame');
    if (!component) {return false;}

    const playerTeam = (component as any).team;

    // Check if carrying enemy flag
    let carryingFlag: 'saradomin' | 'zamorak' | null = null;
    if (data.flagCarriers.saradomin === playerId) {
      carryingFlag = 'saradomin';
    } else if (data.flagCarriers.zamorak === playerId) {
      carryingFlag = 'zamorak';
    }

    if (!carryingFlag) {
      this.emit('castlewars:error', {
        playerId,
        error: "You're not carrying a flag"
      });
      return false;
    }

    // Must be at own base
    // In real implementation, check position

    // Score point
    if (playerTeam === 'saradomin') {
      data.saradominScore++;
    } else {
      data.zamorakScore++;
    }

    // Reset flag
    data.flagCarriers[carryingFlag] = null;

    // Remove flag item
    const inventory = player.getComponent('inventory');
    if (inventory) {
      const flagItemId = carryingFlag === 'saradomin' ? 4037 : 4039;
      (inventory as any).removeItem?.(flagItemId, 1);
    }

    // Update player score
    this.updatePlayerScore(sessionId, playerId, this.FLAG_CAPTURE_POINTS);

    // Emit event
    this.emit('castlewars:flag-captured', {
      sessionId: session.id,
      playerId,
      team: playerTeam,
      score: {
        saradomin: data.saradominScore,
        zamorak: data.zamorakScore
      }
    });

    // Respawn flag
    this.emit('castlewars:flag-spawned', {
      sessionId: session.id,
      team: carryingFlag,
      position: carryingFlag === 'saradomin' ? this.SARADOMIN_BASE : this.ZAMORAK_BASE
    });

    return true;
  }

  /**
   * Player drops flag (on death/disconnect)
   */
  dropFlag(playerId: string): void {
    const sessionId = this.playerSessions.get(playerId);
    if (!sessionId) {return;}

    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'in_progress') {return;}

    const data = session.data as CastleWarsData;

    // Check if carrying flag
    let droppedFlag: 'saradomin' | 'zamorak' | null = null;
    if (data.flagCarriers.saradomin === playerId) {
      droppedFlag = 'saradomin';
      data.flagCarriers.saradomin = null;
    } else if (data.flagCarriers.zamorak === playerId) {
      droppedFlag = 'zamorak';
      data.flagCarriers.zamorak = null;
    }

    if (droppedFlag) {
      const player = this.world.entities.get(playerId);
      if (player) {
        const movement = player.getComponent('movement');
        const position = (movement as any)?.position;

        // Emit event
        this.emit('castlewars:flag-dropped', {
          sessionId: session.id,
          playerId,
          flag: droppedFlag,
          position
        });

        // Remove flag item
        const inventory = player.getComponent('inventory');
        if (inventory) {
          const flagItemId = droppedFlag === 'saradomin' ? 4037 : 4039;
          (inventory as any).removeItem?.(flagItemId, 1);
        }
      }
    }
  }

  /**
   * Build barricade
   */
  buildBarricade(playerId: string, position: Vector3): boolean {
    const sessionId = this.playerSessions.get(playerId);
    if (!sessionId) {return false;}

    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'in_progress') {return false;}

    const data = session.data as CastleWarsData;
    const player = this.world.entities.get(playerId);
    if (!player) {return false;}

    const component = player.getComponent('minigame');
    if (!component) {return false;}

    const team = (component as any).team;

    // Count team barricades
    const teamBarricades = data.barricades.filter(b => b.team === team);
    if (teamBarricades.length >= this.MAX_BARRICADES_PER_TEAM) {
      this.emit('castlewars:error', {
        playerId,
        error: 'Maximum barricades reached'
      });
      return false;
    }

    // Check if has barricade in inventory
    const inventory = player.getComponent('inventory');
    if (!inventory || !(inventory as any).hasItem?.(4053)) { // Barricade item
      this.emit('castlewars:error', {
        playerId,
        error: 'You need a barricade to build'
      });
      return false;
    }

    // Remove barricade item
    (inventory as any).removeItem?.(4053, 1);

    // Add barricade
    data.barricades.push({
      team: team as 'saradomin' | 'zamorak',
      position,
      health: this.BARRICADE_HEALTH
    });

    // Emit event
    this.emit('castlewars:barricade-built', {
      sessionId: session.id,
      playerId,
      team,
      position
    });

    return true;
  }

  /**
   * Give starting supplies
   */
  private giveStartingSupplies(playerId: string): void {
    const player = this.world.entities.get(playerId);
    if (!player) {return;}

    const inventory = player.getComponent('inventory');
    if (!inventory) {return;}

    // Give standard supplies
    const supplies = [
      { id: 4053, quantity: 5 },    // Barricades
      { id: 4043, quantity: 1 },    // Explosive potion
      { id: 4045, quantity: 1 },    // Bronze pickaxe
      { id: 4046, quantity: 1 },    // Toolkit
      { id: 2434, quantity: 20 },   // Prayer potions
      { id: 385, quantity: 20 }     // Sharks (food)
    ];

    for (const item of supplies) {
      (inventory as any).addItem?.(item);
    }
  }

  /**
   * Handle player death in Castle Wars
   */
  onPlayerDeath(playerId: string): void {
    // Drop flag if carrying
    this.dropFlag(playerId);

    // Respawn at base after delay
    setTimeout(() => {
      const sessionId = this.playerSessions.get(playerId);
      if (!sessionId) {return;}

      const session = this.sessions.get(sessionId);
      if (!session) {return;}

      const player = this.world.entities.get(playerId);
      if (!player) {return;}

      const component = player.getComponent('minigame');
      if (!component) {return;}

      const team = (component as any).team;
      const movement = player.getComponent('movement');

      if (movement) {
        const destination = team === 'saradomin' ? this.SARADOMIN_BASE : this.ZAMORAK_BASE;
        (movement as any).teleportDestination = destination;
        (movement as any).teleportTime = Date.now();
      }

      // Restore stats
      const stats = player.getComponent('stats');
      if (stats) {
        (stats as any).hitpoints.current = (stats as any).hitpoints.max;
        (stats as any).prayer.points = (stats as any).prayer.maxPoints;
      }
    }, 5000); // 5 second respawn
  }
}
