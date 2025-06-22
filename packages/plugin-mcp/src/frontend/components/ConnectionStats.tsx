import React from 'react';

export interface ConnectionStatsProps {
  total: number;
  connected: number;
}

export const ConnectionStats: React.FC<ConnectionStatsProps> = ({ total, connected }) => {
  const disconnected = total - connected;
  const connectionRate = total > 0 ? Math.round((connected / total) * 100) : 0;
  
  return (
    <div className="connection-stats">
      <div className="stat-item">
        <span className="stat-label">Total</span>
        <span className="stat-value">{total}</span>
      </div>
      
      <div className="stat-item">
        <span className="stat-label">Connected</span>
        <span className="stat-value connected">{connected}</span>
      </div>
      
      <div className="stat-item">
        <span className="stat-label">Disconnected</span>
        <span className="stat-value disconnected">{disconnected}</span>
      </div>
      
      <div className="stat-item">
        <span className="stat-label">Connection Rate</span>
        <span className="stat-value">
          <div className="connection-rate">
            <div 
              className="rate-bar"
              style={{ width: `${connectionRate}%` }}
            />
            <span className="rate-text">{connectionRate}%</span>
          </div>
        </span>
      </div>
    </div>
  );
}; 