import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Calendar, Users } from 'lucide-react';
import { useTournament } from '../context/TournamentContext';
import { useTournamentData } from '../hooks/useTournamentData';

import Sidebar from './Sidebar';
import LineupViewer from './LineupViewer';
import MatchupsList from './MatchupsList';
import MatchDetail from './MatchDetail';
import CaptainsPanel from './CaptainsPanel';
import SanctionsPanel from './SanctionsPanel';
import InfractionsPanel from './InfractionsPanel';
import SanctionedCaptainsPanel from './SanctionedCaptainsPanel';
import TeamsPanel from './TeamsPanel';
import TeamDetailModal from './TeamDetailModal';
import CopaPanel from './CopaPanel';
import TableSkeleton from './skeletons/TableSkeleton';
import CardSkeleton from './skeletons/CardSkeleton';
import PanelSkeleton from './skeletons/PanelSkeleton';
import { getTeamShield } from '../utils/assets';
import './Dashboard.css';

function Dashboard({ championship, championships, onChampionshipChange }) {

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

    useEffect(() => {
        if (championship) {
            setChampionship(championship);
            // Auto-show Copa tab if championship is Copa Piraña
            const isCopaPirana = championship.name?.toUpperCase().includes('COPA PIRAÑA');
            const isCopaType = championship.mode === 'cup' || championship.type === 'copa';
            setActiveTab((isCopaPirana || isCopaType) ? 'copa' : 'matchups');
        }
    }, [championship, setChampionship]);

    useEffect(() => {
        // Clear detail modals when switching tabs
        setSelectedDetailTeam(null);
        setSelectedMatch(null);
    }, [activeTab]);


    useTournamentData(activeTab);

    if (!championship) return null;

    const activeRoundNum = rounds.find(r => r._id === selectedRoundId)?.number || 0;

    const pageVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
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
                {selectedUserTeam && <LineupViewer userTeam={selectedUserTeam} onClose={() => setSelectedUserTeam(null)} />}
                {selectedMatch && (
                    <MatchDetail
                        match={selectedMatch}
                        championshipId={championship._id}
                        roundId={selectedRoundId}
                        onClose={() => setSelectedMatch(null)}
                    />
                )}

                <div className="dashboard-header animate-in">
                    <div className="header-info">
                        <h2>{championship.name}</h2>
                        <span className="badge">{championship.dataSourceChamp?.toUpperCase()}</span>
                    </div>

                    {rounds.length > 0 && activeTab === 'matchups' && (
                        <div className="round-picker">
                            <Calendar size={18} />
                            <select
                                value={selectedRoundId || ''}
                                onChange={(e) => setSelectedRoundId(e.target.value)}
                            >
                                {rounds.map(r => (
                                    <option key={r._id} value={r._id}>
                                        Jornada {r.number} {r.date ? `(${new Date(r.date).toLocaleDateString()})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="page-wrapper"
                    >
                        <div className="card glass-premium">
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

                            {activeTab === 'teams' ? (
                                <TeamsPanel h2hStandings={h2hStandings} onTeamClick={setSelectedDetailTeam} />
                            ) : activeTab === 'standings' ? (
                                <div className="standings-view">
                                    {loadingStandings ? (
                                        <TableSkeleton rows={8} columns={12} />
                                    ) : (
                                        <table>
                                            <thead>
                                                <tr className="table-header-main">
                                                    <th colSpan={2}></th>
                                                    <th colSpan={2} className="excel-col">1ª Vuelta</th>
                                                    <th colSpan={6} className="api-col">2ª Vuelta</th>
                                                    <th colSpan={2} className="total-col">Global</th>
                                                </tr>
                                                <tr className="table-header-sub">
                                                    <th>Pos</th><th>Equipo</th>
                                                    <th>Ptos</th><th>Gen</th>
                                                    <th>Pts</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th>
                                                    <th className="total">Total</th><th className="total">Gen</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {h2hStandings.map((team, idx) => (
                                                    <tr key={team.id}>
                                                        <td>{idx + 1}</td>
                                                        <td className="team-cell">
                                                            <img
                                                                src={getTeamShield(team.name)}
                                                                alt=""
                                                                onClick={() => setSelectedDetailTeam(team)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                            <span
                                                                className="clickable-team"
                                                                onClick={() => setSelectedDetailTeam(team)}
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                {team.name}
                                                            </span>
                                                        </td>

                                                        <td className="dim">{team.hist_pts}</td>
                                                        <td className="dim">{team.hist_gen}</td>
                                                        <td className="bold">{team.points}</td>
                                                        <td>{team.played}</td>
                                                        <td className="win">{team.won}</td>
                                                        <td className="draw">{team.drawn}</td>
                                                        <td className="loss">{team.lost}</td>
                                                        <td>{team.gf}</td>
                                                        <td className="total-val">{team.points + team.hist_pts}</td>
                                                        <td className="total-val">{team.gf + team.hist_gen}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            ) : activeTab === 'captains' ? (
                                <div className="captains-view">
                                    {loadingAllLineups ? (
                                        <PanelSkeleton rows={10} />
                                    ) : <CaptainsPanel sanctionsData={sanctionsData.teamStats || {}} rounds={rounds} />}
                                </div>
                            ) : activeTab === 'sanctions' ? (
                                <div className="sanctions-view">
                                    {loadingAllLineups ? (
                                        <PanelSkeleton rows={8} />
                                    ) : <SanctionsPanel sanctionsData={sanctionsData.teamStats || {}} />}
                                </div>
                            ) : activeTab === 'infractions' ? (
                                <InfractionsPanel infractions={sanctionsData.infractions || []} />
                            ) : activeTab === 'restricted' ? (
                                <SanctionedCaptainsPanel activeSanctions={sanctionsData.activeSanctions || []} currentRound={activeRoundNum} />
                            ) : activeTab === 'copa' ? (
                                <CopaPanel cupData={cupData} loading={loadingCup} championship={championship} />
                            ) : loadingDisplay ? (
                                <CardSkeleton count={6} />
                            ) : (
                                <MatchupsList matches={matches} onMatchClick={(m) => setSelectedMatch(m)} isLiveRound={selectedRoundId === activeRoundNum} />
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}

export default Dashboard;
