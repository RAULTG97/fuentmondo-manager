import React, { createContext, useContext, useState, useRef } from 'react';

const TournamentContext = createContext();

export const TournamentProvider = ({ children }) => {
    const [championship, setChampionship] = useState(null);
    const [rounds, setRounds] = useState([]);
    const [selectedRoundId, setSelectedRoundId] = useState(null);
    const [ranking, setRanking] = useState([]);
    const [matches, setMatches] = useState([]);

    // Calculated global data
    const [h2hStandings, setH2HStandings] = useState([]);
    const [sanctionsData, setSanctionsData] = useState({});
    const [cupData, setCupData] = useState(null);

    // Status states
    const [loadingDisplay, setLoadingDisplay] = useState(false);
    const [loadingStandings, setLoadingStandings] = useState(false);
    const [loadingAllLineups, setLoadingAllLineups] = useState(false);
    const [loadingCup, setLoadingCup] = useState(false);
    const [calculationProgress, setCalculationProgress] = useState(0);
    const [standingsLoaded, setStandingsLoaded] = useState(false);

    // Cache for historical rounds (useRef to avoid re-renders)
    const historicalCache = useRef({});

    const value = {
        championship, setChampionship,
        rounds, setRounds,
        selectedRoundId, setSelectedRoundId,
        ranking, setRanking,
        matches, setMatches,
        h2hStandings, setH2HStandings,
        sanctionsData, setSanctionsData,
        cupData, setCupData,
        loadingDisplay, setLoadingDisplay,
        loadingStandings, setLoadingStandings,
        loadingAllLineups, setLoadingAllLineups,
        loadingCup, setLoadingCup,
        calculationProgress, setCalculationProgress,
        standingsLoaded, setStandingsLoaded,
        historicalCache
    };


    return (
        <TournamentContext.Provider value={value}>
            {children}
        </TournamentContext.Provider>
    );
};

export const useTournament = () => {
    const context = useContext(TournamentContext);
    if (!context) {
        throw new Error('useTournament must be used within a TournamentProvider');
    }
    return context;
};
