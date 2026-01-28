import { useState, useEffect } from 'react';
import { getChampionships } from './services/api';
import { Loader2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
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
        if (list.length > 0) {
          const preferred = list.find(c => c.name.toUpperCase().includes("CHAMPIONS")) ||
            list.find(c => c.name.toUpperCase().includes("COPA PIRAÑA")) ||
            list[0];
          setSelectedChampId(preferred._id);
        }
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
        {selectedChamp ? (
          <Dashboard
            championship={selectedChamp}
            championships={championships}
            onChampionshipChange={setSelectedChampId}
          />
        ) : (
          <div className="flex-center" style={{ height: '100vh', color: 'white' }}>
            <p>No se han encontrado torneos activos.</p>
          </div>
        )}
      </div>
    </TournamentProvider>
  );
}

export default App;
