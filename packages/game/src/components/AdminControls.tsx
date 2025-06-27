import { useState } from 'react';
import type { GameMode } from '../types/gameTypes';

interface AdminControlsProps {
  mode: GameMode;
  onModeChange: (mode: GameMode) => Promise<void>;
  onEmergencyStop: () => Promise<void>;
  isLoading: boolean;
}

export function AdminControls({ 
  mode, 
  onModeChange, 
  onEmergencyStop, 
  isLoading 
}: AdminControlsProps) {
  const [isChangingMode, setIsChangingMode] = useState(false);

  const handleModeToggle = async (newMode: GameMode) => {
    if (newMode === mode || isChangingMode) return;

    setIsChangingMode(true);
    try {
      await onModeChange(newMode);
    } catch (error) {
      console.error('[AdminControls] Mode change failed:', error);
    } finally {
      setIsChangingMode(false);
    }
  };

  const handleEmergencyStop = async () => {
    if (window.confirm('Are you sure you want to emergency stop all agents? This will pause all activities.')) {
      try {
        await onEmergencyStop();
      } catch (error) {
        console.error('[AdminControls] Emergency stop failed:', error);
      }
    }
  };

  return (
    <div className="admin-controls">
      <div className="mode-controls">
        <div className="mode-buttons">
          <button 
            className={`mode-btn auto ${mode === 'auto' ? 'active' : ''}`}
            onClick={() => handleModeToggle('auto')}
            disabled={isLoading || isChangingMode}
            data-testid="auto-mode-btn"
            title="Enable autonomous mode - agents work continuously"
          >
            <span className="mode-icon">🤖</span>
            <span className="mode-label">Auto Mode</span>
            {mode === 'auto' && <span className="active-indicator">●</span>}
          </button>

          <button 
            className={`mode-btn manual ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => handleModeToggle('manual')}
            disabled={isLoading || isChangingMode}
            data-testid="manual-mode-btn"
            title="Enable manual mode - agents await user instructions"
          >
            <span className="mode-icon">👤</span>
            <span className="mode-label">Manual Mode</span>
            {mode === 'manual' && <span className="active-indicator">●</span>}
          </button>

          <button 
            className={`mode-btn paused ${mode === 'paused' ? 'active' : ''}`}
            onClick={() => handleModeToggle('paused')}
            disabled={isLoading || isChangingMode}
            data-testid="pause-btn"
            title="Pause all agent activities"
          >
            <span className="mode-icon">⏸️</span>
            <span className="mode-label">Paused</span>
            {mode === 'paused' && <span className="active-indicator">●</span>}
          </button>
        </div>

        {isChangingMode && (
          <div className="mode-changing">
            <span className="loading-spinner small"></span>
            <span>Changing mode...</span>
          </div>
        )}
      </div>

      <div className="control-actions">
        <button 
          className="emergency-stop"
          onClick={handleEmergencyStop}
          disabled={isLoading}
          title="Emergency stop all agents immediately"
        >
          <span className="stop-icon">🛑</span>
          <span>Emergency Stop</span>
        </button>
      </div>

      <div className="mode-description">
        {mode === 'auto' && (
          <div className="description auto">
            <span className="icon">🔄</span>
            <span>Agents working autonomously</span>
          </div>
        )}
        {mode === 'manual' && (
          <div className="description manual">
            <span className="icon">✋</span>
            <span>Agents awaiting instructions</span>
          </div>
        )}
        {mode === 'paused' && (
          <div className="description paused">
            <span className="icon">⏸️</span>
            <span>All activities paused</span>
          </div>
        )}
      </div>
    </div>
  );
}