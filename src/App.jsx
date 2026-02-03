import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChampionships } from './services/api';
import { Loader2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import WelcomeScreen from './components/WelcomeScreen';
import { TournamentProvider } from './context/TournamentContext';
import { apiCache } from './utils/apiCache';
import './App.css';

function App() {
  const [selectedChampId, setSelectedChampId] = useState(null);

  // Prune cache on mount (legacy maintenance)
  useEffect(() => {
    apiCache.prune();
  }, []);

  const { data: championshipsData, isLoading, error } = useQuery({
    queryKey: ['championships'],
    queryFn: getChampionships,
    select: (data) => data.data || data.championships || [],
  });

  if (isLoading) {
    return (
      <div className="flex-center" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#03040b' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-center" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#03040b', color: 'var(--error)' }}>
        <p>Error al cargar campeonatos. Por favor, reintenta.</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Reintentar</button>
      </div>
    );
  }

  const championships = championshipsData || [];
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
