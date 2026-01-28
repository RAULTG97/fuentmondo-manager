import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Trophy,
    ChevronDown,
    Settings,
    Activity,
    Info,
    Menu
} from 'lucide-react';
import { APP_LOGO } from '../utils/assets';
import { useTournament } from '../context/TournamentContext';
import { useTournamentData } from '../hooks/useTournamentData';

import PremiumDropdown from './common/PremiumDropdown';
import Sidebar from './Sidebar';
import RoundNavigator from './RoundNavigator';
import MatchupsList from './MatchupsList';
import SanctionsPanel from './SanctionsPanel';
import InfractionsPanel from './InfractionsPanel';
import TeamsPanel from './TeamsPanel';
import CaptainsPanel from './CaptainsPanel';
import SanctionedCaptainsPanel from './SanctionedCaptainsPanel';
import TeamDetailModal from './TeamDetailModal';
import CopaPanel from './CopaPanel';
import CalendarPanel from './CalendarPanel';
import LineupViewer from './LineupViewer';
import MatchDetail from './MatchDetail';
import HallOfFame from './HallOfFame';
import Loader from './Loader';

import TableSkeleton from './skeletons/TableSkeleton';
import CardSkeleton from './skeletons/CardSkeleton';
import PanelSkeleton from './skeletons/PanelSkeleton';

import { getTeamShield } from '../utils/assets';
import './Dashboard.css';

const Dashboard = ({ championship, championships, onChampionshipChange }) => {
    const {
        setChampionship, rounds, selectedRoundId, setSelectedRoundId,
        matches, h2hStandings, sanctionsData, cupData,
        allRounds, currentRoundNumber,
        loadingDisplay, loadingStandings, loadingAllLineups, loadingCup,
        calculationProgress
    } = useTournament();

    const [activeTab, setActiveTab] = useState('matchups');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [selectedUserTeam, setSelectedUserTeam] = useState(null);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [selectedMatchRoundId, setSelectedMatchRoundId] = useState(null);
    const [selectedDetailTeam, setSelectedDetailTeam] = useState(null);
    const [expandedVuelta, setExpandedVuelta] = useState(null); // null | 1 | 2

    // Sync championship with context
    useEffect(() => {
        if (championship) {
            setChampionship(championship);
            const isCopa = championship.name?.toUpperCase().includes('COPA PIRAÑA') ||
                championship.mode === 'cup' ||
                championship.type === 'copa';
            if (isCopa) setActiveTab('copa');
            else if (activeTab === 'copa') setActiveTab('matchups');
        }
    }, [championship, setChampionship]);

    // Handle data fetching side effects
    useTournamentData(activeTab);

    const currentRoundObj = rounds.find(r => {
        if (typeof selectedRoundId === 'number') return r.number === selectedRoundId;
        return r._id === selectedRoundId;
    });
    const activeRoundNum = currentRoundObj?.number || 0;
    const selectedRound = currentRoundObj;
    const actualRoundIdForAPI = currentRoundObj?._id || selectedRoundId;
    const isHistoricalRound = (championship?.type !== 'copa' && typeof selectedRoundId === 'number' && selectedRoundId < 20) || selectedRound?.isHistorical || false;

    const handleMatchClick = (match, roundId = null) => {
        setSelectedMatch(match);
        setSelectedMatchRoundId(roundId);
    };

    const closeMatchDetail = () => {
        setSelectedMatch(null);
        setSelectedMatchRoundId(null);
    };

    const renderMainContent = () => {
        if (loadingDisplay && activeTab === 'matchups') return <CardSkeleton count={6} />;

        switch (activeTab) {
            case 'matchups':
                // For league championships, use allRounds data
                if (championship?.type !== 'copa' && allRounds.length > 0) {
                    const currentRound = allRounds.find(r => r.number == selectedRoundId) ||
                        allRounds.find(r => r.number == currentRoundNumber);

                    if (currentRound) {
                        return (
                            <>
                                <RoundNavigator
                                    currentRound={currentRound.number}
                                    totalRounds={38}
                                    onRoundChange={(newRound) => setSelectedRoundId(newRound)}
                                    roundStatus={currentRound.status}
                                    onReturnToCurrent={currentRoundNumber && currentRound.number != currentRoundNumber ? () => setSelectedRoundId(currentRoundNumber) : null}
                                />
                                <MatchupsList
                                    matches={currentRound.matches}
                                    onMatchClick={setSelectedMatch}
                                    isLiveRound={currentRound.status === 'current'}
                                    roundStatus={currentRound.status}
                                />
                            </>
                        );
                    }
                }
                // Fallback to old behavior for Copa or when allRounds not ready
                const roundStatus = isHistoricalRound ? 'historical' : 'current';
                return <MatchupsList matches={matches} onMatchClick={setSelectedMatch} isLiveRound={selectedRoundId === activeRoundNum} roundStatus={roundStatus} />;
            case 'standings':
                if (loadingStandings) return <TableSkeleton rows={10} columns={12} />;
                return (
                    <div className="standings-view animate-in">
                        <table>
                            <thead>
                                <tr className="table-header-main">
                                    <th className="sticky-col-1-2" colSpan={2}></th>
                                    <th colSpan={2} className="hide-mobile" style={{ background: 'rgba(251, 191, 36, 0.05)', textAlign: 'center' }}>Global</th>
                                    <th colSpan={2} className="show-mobile-table-cell sticky-col-3-4" style={{ background: 'rgba(59, 130, 246, 0.1)', textAlign: 'center', fontSize: '0.7rem', letterSpacing: '0.1em' }}>GLOBAL</th>
                                    <th
                                        colSpan={expandedVuelta === 1 ? 2 : 1}
                                        className={`clickable-header ${expandedVuelta === 1 ? 'expanded' : 'collapsed'} hide-mobile`}
                                        onClick={() => setExpandedVuelta(expandedVuelta === 1 ? null : 1)}
                                        style={{ background: 'rgba(59, 130, 246, 0.05)', textAlign: 'center', cursor: 'pointer' }}
                                    >
                                        <span className="hide-mobile">{expandedVuelta === 1 ? '1ª Vuelta' : '1ª V'}</span>
                                        <span className="show-mobile-inline">{expandedVuelta === 1 ? '1ªV' : '1ªV'}</span>
                                        {expandedVuelta === 1 ? ' ▾' : ' ▸'}
                                    </th>
                                    <th
                                        colSpan={expandedVuelta === 2 ? 6 : 1}
                                        className={`clickable-header ${expandedVuelta === 2 ? 'expanded' : 'collapsed'} hide-mobile`}
                                        onClick={() => setExpandedVuelta(expandedVuelta === 2 ? null : 2)}
                                        style={{ background: 'rgba(168, 85, 247, 0.05)', textAlign: 'center', cursor: 'pointer' }}
                                    >
                                        <span className="hide-mobile">{expandedVuelta === 2 ? '2ª Vuelta' : '2ª V'}</span>
                                        <span className="show-mobile-inline">{expandedVuelta === 2 ? '2ªV' : '2ªV'}</span>
                                        {expandedVuelta === 2 ? ' ▾' : ' ▸'}
                                    </th>
                                </tr>
                                <tr className="table-header-sub">
                                    <th className="sticky-col-1">Pos</th><th className="sticky-col-2">Equipo</th>
                                    <th className="global-col sticky-col-3" style={{ color: 'var(--primary)', fontWeight: 800 }}>Total</th>
                                    <th className="global-col sticky-col-4" style={{ color: 'var(--accent)', fontWeight: 800 }}>Gen</th>

                                    {/* 1st Leg Columns */}
                                    <th className={expandedVuelta === 1 ? '' : 'hide-column'}>Pts</th>
                                    <th className={expandedVuelta === 1 ? '' : 'hide-column'}>Gen</th>
                                    {expandedVuelta !== 1 && <th className="summary-col hide-mobile">Pts</th>}

                                    {/* 2nd Leg Columns */}
                                    <th className={expandedVuelta === 2 ? '' : 'hide-column'}>Pts</th>
                                    <th className={expandedVuelta === 2 ? '' : 'hide-column'}>PJ</th>
                                    <th className={expandedVuelta === 2 ? 'hide-mobile' : 'hide-column'}>PG</th>
                                    <th className={expandedVuelta === 2 ? 'hide-mobile' : 'hide-column'}>PE</th>
                                    <th className={expandedVuelta === 2 ? 'hide-mobile' : 'hide-column'}>PP</th>
                                    <th className={expandedVuelta === 2 ? 'hide-mobile' : 'hide-column'}>GF</th>
                                    {expandedVuelta !== 2 && <th className="summary-col hide-mobile">Pts</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {h2hStandings.map((team, idx) => (
                                    <tr key={team.id}>
                                        <td className="sticky-col-1" style={{ fontWeight: 800 }}>{idx + 1}</td>
                                        <td className="team-cell sticky-col-2">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <img
                                                    src={getTeamShield(team.name)}
                                                    alt=""
                                                    loading="lazy"
                                                    onClick={() => setSelectedDetailTeam(team)}
                                                    style={{ width: '24px', height: '24px', objectFit: 'contain', cursor: 'pointer' }}
                                                />
                                                <span
                                                    className="clickable-team"
                                                    onClick={() => setSelectedDetailTeam(team)}
                                                    style={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.1 }}
                                                >
                                                    {team.name}
                                                </span>
                                            </div>
                                        </td>
                                        {/* Global Scores First */}
                                        <td className="global-col sticky-col-3" style={{ color: 'var(--primary)', fontWeight: 900 }}>{team.points + team.hist_pts}</td>
                                        <td className="global-col sticky-col-4" style={{ color: 'var(--accent)', fontWeight: 900 }}>{team.gf + team.hist_gen}</td>

                                        {/* 1st Leg Data */}
                                        <td className={expandedVuelta === 1 ? '' : 'hide-column'} style={{ color: 'var(--text-dim)' }}>{team.hist_pts}</td>
                                        <td className={expandedVuelta === 1 ? '' : 'hide-column'} style={{ color: 'var(--text-dim)' }}>{team.hist_gen}</td>
                                        {expandedVuelta !== 1 && <td className="summary-col hide-mobile" style={{ color: 'var(--text-dim)', opacity: 0.6 }}>{team.hist_pts}</td>}

                                        {/* 2nd Leg Data */}
                                        <td className={expandedVuelta === 2 ? '' : 'hide-column'}>{team.points}</td>
                                        <td className={expandedVuelta === 2 ? '' : 'hide-column'}>{team.played}</td>
                                        <td className={expandedVuelta === 2 ? 'hide-mobile' : 'hide-column'} style={{ color: 'var(--success)', fontWeight: 600 }}>{team.won}</td>
                                        <td className={expandedVuelta === 2 ? 'hide-mobile' : 'hide-column'}>{team.drawn}</td>
                                        <td className={expandedVuelta === 2 ? 'hide-mobile' : 'hide-column'} style={{ color: 'var(--error)' }}>{team.lost}</td>
                                        <td className={expandedVuelta === 2 ? 'hide-mobile' : 'hide-column'}>{team.gf}</td>
                                        {expandedVuelta !== 2 && <td className="summary-col hide-mobile" style={{ opacity: 0.6 }}>{team.points}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'teams':
                return <TeamsPanel h2hStandings={h2hStandings} onTeamClick={setSelectedDetailTeam} />;
            case 'captains':
                if (loadingAllLineups) return <PanelSkeleton rows={10} />;
                return <CaptainsPanel sanctionsData={sanctionsData.teamStats || {}} rounds={rounds} />;
            case 'sanctions':
                if (loadingAllLineups) return <PanelSkeleton rows={8} />;
                return <SanctionsPanel sanctionsData={sanctionsData.teamStats || {}} />;
            case 'infractions':
                return <InfractionsPanel infractions={sanctionsData.infractions || []} />;
            case 'restricted':
                return <SanctionedCaptainsPanel />;
            case 'copa':
                return <CopaPanel cupData={cupData} loading={loadingCup} championship={championship} />;
            case 'calendar':
                return <CalendarPanel allRounds={allRounds} h2hStandings={h2hStandings} onTeamClick={setSelectedDetailTeam} onMatchClick={handleMatchClick} />;
            case 'hall_of_fame':
                return <HallOfFame />;
            default: return null;
        }
    };

    return (
        <div className="layout-root">
            <Sidebar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                championship={championship}
                championships={championships}
                onChampionshipChange={onChampionshipChange}
            />

            <main className="dashboard-content">
                {/* Mobile Branding Bar (Persistent on small screens) */}
                <div className="mobile-branding-bar">
                    <div className="logo-section">
                        <img src={APP_LOGO} alt="Logo" className="mobile-logo" />
                        <h1 className="mobile-title">Fuentmondo</h1>
                    </div>
                </div>

                <header className="dashboard-header animate-in">
                    <div className="header-info">
                        <div className="header-title-row">
                            <div className="header-icon-box">
                                <Activity size={20} />
                            </div>
                            <h2>{activeTab === 'hall_of_fame' ? 'Hall of Fame' : championship.name}</h2>
                            <span className="badge">
                                {activeTab === 'hall_of_fame' ? 'Histórico' : (championship.type === 'copa' ? 'Copa' : 'Liga')}
                            </span>
                        </div>
                        <div className="header-subtitle-row">
                            <Settings size={14} color="var(--text-dim)" />
                            <p className="header-subtitle">
                                Fuentmondo
                            </p>
                        </div>
                    </div>

                    <div className="header-selectors">
                        <PremiumDropdown
                            label="Campeonato Actual"
                            value={championship?._id}
                            options={championships.map(c => ({ id: c._id, label: c.name }))}
                            onChange={onChampionshipChange}
                            icon={Trophy}
                            className="championship-main"
                        />

                        {(rounds.length > 0 || allRounds.length > 0) && activeTab === 'matchups' && (
                            <PremiumDropdown
                                label="Jornada"
                                value={selectedRoundId}
                                options={(championship?.type === 'copa' ? rounds : allRounds).map(r => ({
                                    id: championship?.type === 'copa' ? r._id : r.number,
                                    label: `Jornada ${r.number}`
                                }))}
                                onChange={setSelectedRoundId}
                                icon={Calendar}
                                className="round-secondary"
                                displayValue={(() => {
                                    const rList = championship?.type === 'copa' ? rounds : allRounds;
                                    const r = rList.find(r => {
                                        if (typeof selectedRoundId === 'number') return r.number === selectedRoundId;
                                        return r._id === selectedRoundId;
                                    });
                                    return r ? `Jornada ${r.number}` : (typeof selectedRoundId === 'number' ? `Jornada ${selectedRoundId}` : 'Seleccionar');
                                })()}
                            />
                        )}
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    <motion.section
                        key={activeTab}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                            opacity: { duration: 0.2 }
                        }}
                        className={`page-wrapper glass-premium ${activeTab === 'standings' ? 'no-padding' : ''}`}
                    >
                        {renderMainContent()}
                    </motion.section>
                </AnimatePresence>
            </main>

            {/* Modals & Overlays */}
            <AnimatePresence>
                {selectedUserTeam && (
                    <LineupViewer
                        userTeam={selectedUserTeam}
                        onClose={() => setSelectedUserTeam(null)}
                    />
                )}
                {selectedMatch && (
                    <MatchDetail
                        match={selectedMatch}
                        championshipId={championship._id}
                        roundId={selectedMatchRoundId || actualRoundIdForAPI}
                        onClose={closeMatchDetail}
                    />
                )}
                {selectedDetailTeam && (
                    <TeamDetailModal
                        team={selectedDetailTeam}
                        h2hStandings={h2hStandings}
                        sanctionsData={sanctionsData}
                        rounds={rounds}
                        allRounds={allRounds}
                        selectedRoundId={actualRoundIdForAPI}
                        currentRoundNumber={currentRoundNumber}
                        onClose={() => setSelectedDetailTeam(null)}
                    />
                )}
            </AnimatePresence>

            {calculationProgress > 0 && calculationProgress < 100 && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(12px)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)',
                    zIndex: 1000
                }}>
                    <Loader text={`Calculando ${calculationProgress}%`} type="inline" />
                </div>
            )}
        </div>
    );
};

export default Dashboard;
