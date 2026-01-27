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

import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MatchupsList from './MatchupsList';
import SanctionsPanel from './SanctionsPanel';
import InfractionsPanel from './InfractionsPanel';
import TeamsPanel from './TeamsPanel';
import CaptainsPanel from './CaptainsPanel';
import SanctionedCaptainsPanel from './SanctionedCaptainsPanel';
import TeamDetailModal from './TeamDetailModal';
import CopaPanel from './CopaPanel';
import LineupViewer from './LineupViewer';
import MatchDetail from './MatchDetail';
import HallOfFame from './HallOfFame';

import TableSkeleton from './skeletons/TableSkeleton';
import CardSkeleton from './skeletons/CardSkeleton';
import PanelSkeleton from './skeletons/PanelSkeleton';

import { getTeamShield } from '../utils/assets';
import './Dashboard.css';

const Dashboard = ({ championship, championships, onChampionshipChange }) => {
    const {
        setChampionship, rounds, selectedRoundId, setSelectedRoundId,
        matches, h2hStandings, sanctionsData, cupData,
        loadingDisplay, loadingStandings, loadingAllLineups, loadingCup,
        calculationProgress
    } = useTournament();

    const [activeTab, setActiveTab] = useState('matchups');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [selectedUserTeam, setSelectedUserTeam] = useState(null);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [selectedDetailTeam, setSelectedDetailTeam] = useState(null);

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

    const activeRoundNum = rounds.find(r => r._id === selectedRoundId)?.number || 0;

    const renderMainContent = () => {
        if (loadingDisplay && activeTab === 'matchups') return <CardSkeleton count={6} />;

        switch (activeTab) {
            case 'matchups':
                return <MatchupsList matches={matches} onMatchClick={setSelectedMatch} isLiveRound={selectedRoundId === activeRoundNum} />;
            case 'standings':
                if (loadingStandings) return <TableSkeleton rows={10} columns={12} />;
                return (
                    <div className="standings-view animate-in">
                        <table>
                            <thead>
                                <tr className="table-header-main">
                                    <th colSpan={2}></th>
                                    <th colSpan={2} style={{ background: 'rgba(59, 130, 246, 0.05)', textAlign: 'center' }}>1ª Vuelta</th>
                                    <th colSpan={6} style={{ background: 'rgba(168, 85, 247, 0.05)', textAlign: 'center' }}>2ª Vuelta</th>
                                    <th colSpan={2} style={{ background: 'rgba(251, 191, 36, 0.05)', textAlign: 'center' }}>Global</th>
                                </tr>
                                <tr className="table-header-sub">
                                    <th>Pos</th><th>Equipo</th>
                                    <th>Ptos</th><th>Gen</th>
                                    <th>Pts</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th>
                                    <th style={{ color: 'var(--primary)' }}>Total</th><th style={{ color: 'var(--accent)' }}>Gen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {h2hStandings.map((team, idx) => (
                                    <tr key={team.id}>
                                        <td style={{ fontWeight: 800 }}>{idx + 1}</td>
                                        <td className="team-cell">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <img
                                                    src={getTeamShield(team.name)}
                                                    alt=""
                                                    loading="lazy"
                                                    onClick={() => setSelectedDetailTeam(team)}
                                                    style={{ width: '28px', height: '28px', objectFit: 'contain', cursor: 'pointer' }}
                                                />
                                                <span
                                                    className="clickable-team"
                                                    onClick={() => setSelectedDetailTeam(team)}
                                                    style={{ fontWeight: 600 }}
                                                >
                                                    {team.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-dim)' }}>{team.hist_pts}</td>
                                        <td style={{ color: 'var(--text-dim)' }}>{team.hist_gen}</td>
                                        <td style={{ fontWeight: 700 }}>{team.points}</td>
                                        <td>{team.played}</td>
                                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{team.won}</td>
                                        <td>{team.drawn}</td>
                                        <td style={{ color: 'var(--error)' }}>{team.lost}</td>
                                        <td>{team.gf}</td>
                                        <td style={{ color: 'var(--primary)', fontWeight: 900 }}>{team.points + team.hist_pts}</td>
                                        <td style={{ color: 'var(--accent)', fontWeight: 900 }}>{team.gf + team.hist_gen}</td>
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
                        <h1 className="mobile-title">Fuentmondo<span>Manager</span></h1>
                    </div>
                </div>

                <header className="dashboard-header animate-in">
                    <div className="header-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
                            <div style={{ color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
                                <Activity size={20} />
                            </div>
                            <h2>{activeTab === 'hall_of_fame' ? 'Hall of Fame' : championship.name}</h2>
                            <span className="badge">
                                {activeTab === 'hall_of_fame' ? 'Histórico' : (championship.type === 'copa' ? 'Copa' : 'Liga')}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Settings size={14} color="var(--text-dim)" />
                            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Fuentmondo Manager
                            </p>
                        </div>
                    </div>

                    <div className="header-selectors">
                        {/* Primary Championship Selector - Standardized for all views */}
                        <div className="premium-selector championship-main">
                            <div className="selector-icon">
                                <Trophy size={18} />
                            </div>
                            <div className="selector-content">
                                <span className="selector-label">Campeonato Actual</span>
                                <div className="current-value">
                                    {championship?.name}
                                </div>
                                <select
                                    value={championship?._id}
                                    onChange={(e) => onChampionshipChange(e.target.value)}
                                >
                                    {championships.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <ChevronDown size={14} className="select-arrow" />
                        </div>

                        {rounds.length > 0 && (activeTab === 'matchups' || activeTab === 'standings') && (
                            <div className="premium-selector round-secondary">
                                <Calendar size={18} color="var(--secondary)" />
                                <div className="selector-content">
                                    <span className="selector-label">Jornada</span>
                                    <div className="current-value">
                                        Jornada {rounds.find(r => r._id === selectedRoundId)?.number || 'Seleccionar'}
                                    </div>
                                    <select
                                        value={selectedRoundId || ''}
                                        onChange={(e) => setSelectedRoundId(e.target.value)}
                                    >
                                        {rounds.map(r => (
                                            <option key={r._id} value={r._id}>
                                                Jornada {r.number}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <ChevronDown size={14} className="select-arrow" />
                            </div>
                        )}
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    <motion.section
                        key={activeTab}
                        initial={{ opacity: 0, scale: 0.99, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.99, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="page-wrapper glass-premium"
                        style={{ padding: activeTab === 'standings' ? '0' : '2rem' }}
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
                        roundId={selectedRoundId}
                        onClose={() => setSelectedMatch(null)}
                    />
                )}
                {selectedDetailTeam && (
                    <TeamDetailModal
                        team={selectedDetailTeam}
                        h2hStandings={h2hStandings}
                        sanctionsData={sanctionsData}
                        rounds={rounds}
                        selectedRoundId={selectedRoundId}
                        onClose={() => setSelectedDetailTeam(null)}
                    />
                )}
            </AnimatePresence>

            {/* Mobile Navigation */}
            <MobileNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                championship={championship}
            />

            {calculationProgress > 0 && calculationProgress < 100 && (
                <div style={{
                    position: 'fixed',
                    bottom: '5rem', /* Adjusted for mobile nav */
                    right: '2rem',
                    background: 'var(--bg-card)',
                    padding: '1rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    zIndex: 1000
                }}>
                    <div className="loader" style={{ width: '20px', height: '20px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700 }}>Calculando {calculationProgress}%</span>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
