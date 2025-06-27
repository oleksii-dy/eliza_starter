import { GameDashboard } from './components/GameDashboard';
import './styles/game.css';

function App() {
  console.log('[App] Rendering Autonomous Coding Game Dashboard');
  
  return (
    <div className="app">
      <GameDashboard />
    </div>
  );
}

export default App; 