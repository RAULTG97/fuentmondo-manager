import { useState, useEffect } from 'react';
import { getChampionships } from './services/api';
import { Loader2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import WelcomeScreen from './components/WelcomeScreen';
import { TournamentProvider } from './context/TournamentContext';
import './App.css';

function App() {
  const [championships, setChampionships] = useState([]);
  const [selectedChampId, setSelectedChampId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChampionships()
      .then(data => {
        const list = data.data || data.championships || [];
        setChampionships(list);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1d' }}>
        <Loader2 className="animate-spin" size={48} color="#3b82f6" />
      </div>
    );
  }

  const selectedChamp = championships.find(c => c._id === selectedChampId);

  return (
    <TournamentProvider>
      <div className="app-root">
        {selectedChampId ? (
          <Dashboard
            championship={selectedChamp}
            championships={championships}
            onChampionshipChange={setSelectedChampId}
          />
        ) : (
          <WelcomeScreen
            championships={championships}
            onSelect={setSelectedChampId}
          />
        )}
      </div>
    </TournamentProvider>
  );
}

export default App;
