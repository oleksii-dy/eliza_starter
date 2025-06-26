
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createRPGClientWorld } from '../core/createRPGClientWorld';
import type { World } from '../types';

// Configuration
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4445';
const PLAYER_NAME = import.meta.env.VITE_PLAYER_NAME || `Player${Math.floor(Math.random() * 1000)}`;

// Global world instance
let world: World | null = null;

/**
 * RPG Client Application
 */
function RPGClient() {
  const [connected, setConnected] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playerInfo, setPlayerInfo] = React.useState<any>(null);

  React.useEffect(() => {
    initializeWorld();
  }, []);

  async function initializeWorld() {
    try {
      console.log('[RPGClient] Creating world...');
      world = await createRPGClientWorld();

      // Initialize world
      await world.init({
        storage: null,
        renderer: 'webgl2'
      });

      // Set up event listeners
      world.on?.('player', (player: any) => {
        console.log('[RPGClient] Local player created:', player);
        setPlayerInfo({
          id: player.id,
          name: player.name,
          position: player.position
        });
      });

      world.on?.('disconnect', () => {
        console.log('[RPGClient] Disconnected from server');
        setConnected(false);
      });

      world.on?.('kick', (reason: string) => {
        console.log('[RPGClient] Kicked:', reason);
        setError(`Kicked from server: ${reason}`);
        setConnected(false);
      });

      // Connect to server
      console.log(`[RPGClient] Connecting to ${WS_URL}...`);
      const network = world.network;
      if (network && 'init' in network) {
        await (network as any).init({
          wsUrl: WS_URL,
          name: PLAYER_NAME,
          avatar: null
        });
        setConnected(true);
        setLoading(false);
      }

      // Start game loop
      startGameLoop();

    } catch (err) {
      console.error('[RPGClient] Failed to initialize:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      setLoading(false);
    }
  }

  function startGameLoop() {
    if (!world) {return;}

    function loop(time: number) {
      if (world) {
        world.tick(time);
      }
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }

  // Render UI
  if (loading) {
    return (
      <div className="rpg-client-loading">
        <h2>Loading RPG World...</h2>
        <p>Connecting to {WS_URL}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rpg-client-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }

  return (
    <div className="rpg-client">
      <div className="rpg-client-status">
        <h3>RuneScape RPG</h3>
        <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
        {playerInfo && (
          <div>
            <p>Player: {playerInfo.name}</p>
            <p>ID: {playerInfo.id}</p>
          </div>
        )}
      </div>

      <canvas id="rpg-canvas" className="rpg-client-canvas" />

      <div className="rpg-client-ui">
        {/* Game UI components would go here */}
        <div className="inventory-panel">
          <h4>Inventory</h4>
          {/* Inventory slots */}
        </div>

        <div className="skills-panel">
          <h4>Skills</h4>
          {/* Skill levels */}
        </div>

        <div className="chat-panel">
          <h4>Chat</h4>
          {/* Chat messages */}
        </div>
      </div>
    </div>
  );
}

// Mount the application
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <RPGClient />
    </React.StrictMode>
  );
}

// CSS styles
const styles = `
  .rpg-client {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #000;
    color: #fff;
    font-family: Arial, sans-serif;
  }

  .rpg-client-status {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    padding: 10px;
    border-radius: 5px;
    z-index: 1000;
  }

  .rpg-client-canvas {
    flex: 1;
    width: 100%;
    height: 100%;
  }

  .rpg-client-ui {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    gap: 10px;
    padding: 10px;
  }

  .inventory-panel,
  .skills-panel,
  .chat-panel {
    flex: 1;
    background: rgba(255, 255, 255, 0.1);
    padding: 10px;
    border-radius: 5px;
    overflow-y: auto;
  }

  .rpg-client-loading,
  .rpg-client-error {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: #000;
    color: #fff;
  }

  .rpg-client-error button {
    margin-top: 20px;
    padding: 10px 20px;
    font-size: 16px;
    background: #ff4444;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }

  .rpg-client-error button:hover {
    background: #ff6666;
  }
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);
