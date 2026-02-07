/**
 * Check Updates Script
 * Run by GitHub Actions to check for new rounds/scores
 * HYBRID STRATEGY V6 (Robust Multi-Champion): 
 * 1. Checks Primera, Segunda, AND Copa.
 * 2. Aggregates matches and teams from all sources.
 * 3. Fetches lineups using specific Round IDs for each championship.
 * 4. HANDLES MISSING ROUND IDs in Segunda by falling back to Global ID.
 * 5. Subscribes tokens and notifies on changes.
 */
const admin = require('firebase-admin');
const axios = require('axios');

// 1. Initialize Firebase Admin
let db, msg;
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccount = serviceAccountRaw ? JSON.parse(serviceAccountRaw) : null;

if (!serviceAccount || !serviceAccount.project_id) {
    console.error('Missing or invalid FIREBASE_SERVICE_ACCOUNT env var');
    process.exit(1);
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    msg = admin.messaging();
} catch (e) {
    console.error('Firebase Init Error:', e);
    process.exit(1);
}

// Configuration
const CONFIG = {
    BASE_URL: 'https://api.futmondo.com',
    AUTH: {
        TOKEN: process.env.VITE_INTERNAL_TOKEN || 'e1c9_5554f9913726b6e2563b78e8200c5e5b',
        USER_ID: process.env.VITE_INTERNAL_USER_ID || '55e4de47d26f276304fcc222'
    },
    // Championship Contexts
    CONTEXTS: [
        {
            id: '6598143af1e53905facfcc6d',
            name: 'Primera',
            type: 'league',
            userTeamId: '65981926d220e05de3fdc762' // Used for Metadata master clock
        },
        {
            id: '65981dd8f1fa9605fbefe305',
            name: 'Segunda',
            type: 'league',
            userTeamId: null
        },
        {
            id: '697663371311f0fd5379a446',
            name: 'Copa',
            type: 'cup',
            userTeamId: '69766337c15cdb2bd57b94c0'
        }
    ]
};

async function checkUpdates() {
    try {
        console.log('Starting Update Check (Hybrid V6 - Robust Multi-Champion)...');

        // A. Get Last State from Firestore
        const docRef = db.collection('app_state').doc('last_checked');
        let lastState = {};
        try {
            const doc = await docRef.get();
            lastState = doc.exists ? doc.data() : {};
        } catch (dbError) {
            console.error('Warning: Failed to fetch from Firestore. Proceeding empty.');
            lastState = {};
        }

        // B. Determine GLOBAL Round Number & Schedule (Master Clock from Primera)
        const masterCtx = CONFIG.CONTEXTS[0];
        console.log(`Fetching Master Metadata from ${masterCtx.name}...`);

        // 1. Get Status from standard rounds endpoint (for current status)
        const metaResp = await axios.post(`${CONFIG.BASE_URL}/1/userteam/rounds`, {
            header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
            query: { championshipId: masterCtx.id, userteamId: masterCtx.userTeamId },
            answer: {}
        });
        const rounds = metaResp.data.answer || metaResp.data;
        // activeRound is the CURRENT one, or the last one if season ended/paused
        const activeRound = rounds.find(r => r.status === 'current') || rounds[rounds.length - 1];

        const globalRoundNum = Number(activeRound.number);
        const globalRoundId = activeRound.id || activeRound._id;
        const globalStatus = activeRound.status;
        console.log(`Global Target: J${globalRoundNum} (${globalStatus})`);

        // 2. Get Schedule from Active Championships (for Next Round Date)
        let nextRoundDate = null;
        let nextRoundNum = null;
        try {
            console.log('Fetching Schedule from /2/user/activechampionships...');
            const activeResp = await axios.post(`${CONFIG.BASE_URL}/2/user/activechampionships`, {
                header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
                query: { excludeGeneral: false, includeProphets: true },
                answer: {}
            });
            const activeData = activeResp.data.answer || activeResp.data;
            const schedRounds = activeData.rounds || [];

            // Find round for Primera (Master ID)
            // The rounds array here usually contains the NEXT round info
            const masterNextRound = schedRounds.find(r => r.championshipId === '504e4f584d8bec9a67000079'); // Primera League ID from user example
            // OR match by name/context if IDs don't align. 
            // In the user example, Primera League ID is "504e4f584d8bec9a67000079"

            if (masterNextRound && masterNextRound.beginProcess) {
                nextRoundDate = new Date(masterNextRound.beginProcess);
                nextRoundNum = masterNextRound.number;
                console.log(`Next Round: J${nextRoundNum} starts at ${nextRoundDate.toISOString()}`);
            }
        } catch (e) {
            console.error('Schedule Fetch Error:', e.message);
        }

        // C. Collect Lineup Requests
        const lineupRequests = []; // { teamId, roundId, champId }

        // Iterate Contexts
        for (const ctx of CONFIG.CONTEXTS) {
            console.log(`\nProcessing ${ctx.name} (${ctx.type})...`);

            if (ctx.type === 'league') {
                try {
                    const res = await axios.post(`${CONFIG.BASE_URL}/5/ranking/matches`, {
                        header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
                        query: { championshipId: ctx.id },
                        answer: {}
                    });
                    const d = res.data.answer || res.data;
                    const teamsList = d.teams || [];
                    const allRoundGroups = d.rounds || [];

                    // Find group for Global Round (Prioritize Exact Match)
                    let targetGroup = null;
                    let ctxRoundId = null;

                    const exactGroup = allRoundGroups.find(g => g.length > 0 && g[0].id && Number(g[0].id.r) === globalRoundNum);

                    if (exactGroup) {
                        targetGroup = exactGroup;
                        const rIdObj = targetGroup[0].id;
                        ctxRoundId = rIdObj.id || rIdObj._id;
                        console.log(`  Found Exact Match r=${globalRoundNum}`);
                    } else {
                        console.log(`  Exact Match r=${globalRoundNum} NOT found via r-check.`);
                    }

                    // FALLBACK STRATEGY (Applied to ALL leagues now)
                    if (!ctxRoundId) {
                        console.log(`  Missing Group ID for ${ctx.name}. Applying Logic...`);

                        // 1. Try Offset Group if Target wasn't found exact
                        if (!targetGroup) {
                            const offsetGroup = (globalRoundNum > 19)
                                ? allRoundGroups.find(g => g.length > 0 && g[0].id && Number(g[0].id.r) === (globalRoundNum - 19))
                                : null;
                            if (offsetGroup) targetGroup = offsetGroup;
                        }

                        // 2. Override/Set ID using Global Master if still missing (Segunda Case)
                        // Even if targetGroup found but has no ID, or if we fallback entirely
                        console.log(`  -> Using Global Round ID: ${globalRoundId}`);
                        ctxRoundId = globalRoundId;
                    }

                    if (targetGroup && ctxRoundId) {
                        console.log(`  Processing ${targetGroup.length} matches...`);
                        targetGroup.forEach(m => {
                            if (m.p) {
                                m.p.forEach(pIndex => {
                                    const team = teamsList[pIndex - 1];
                                    if (team && team._id) {
                                        lineupRequests.push({
                                            teamId: team._id,
                                            roundId: ctxRoundId,
                                            champId: ctx.id,
                                            ctxName: ctx.name
                                        });
                                    }
                                });
                            }
                        });
                    } else {
                        console.log(`  No matches found for J${globalRoundNum} (TargetGroup: ${!!targetGroup})`);
                    }
                } catch (e) {
                    console.error(`  Error processing ${ctx.name}:`, e.message);
                }

            } else if (ctx.type === 'cup') {
                try {
                    const res = await axios.post(`${CONFIG.BASE_URL}/5/cup/get`, {
                        header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
                        query: { championshipId: ctx.id, userteamId: ctx.userTeamId },
                        answer: {}
                    });
                    const d = res.data.answer || res.data;
                    const cupRounds = d.rounds || [];

                    // Find active round (Running or Current)
                    let activeCupRound = cupRounds.find(r => r.current === true);

                    // Fallback: Find last round with non-finished matches
                    if (!activeCupRound && cupRounds.length > 0) {
                        activeCupRound = cupRounds.reverse().find(r => r.matches && r.matches.some(m => !m.finished)) || cupRounds[0];
                    }

                    if (activeCupRound && activeCupRound.matches) {
                        console.log(`  Active Cup Round: ${activeCupRound.number} (Matches: ${activeCupRound.matches.length})`);
                        const cupRoundId = activeCupRound.id || activeCupRound._id || activeCupRound.roundId;

                        activeCupRound.matches.forEach(m => {
                            const tA = m.home?.team;
                            const tB = m.away?.team;

                            if (tA && (tA.id || tA._id)) {
                                lineupRequests.push({
                                    teamId: tA.id || tA._id,
                                    roundId: cupRoundId,
                                    champId: ctx.id,
                                    ctxName: ctx.name
                                });
                            }
                            if (tB && (tB.id || tB._id)) {
                                lineupRequests.push({
                                    teamId: tB.id || tB._id,
                                    roundId: cupRoundId,
                                    champId: ctx.id,
                                    ctxName: ctx.name
                                });
                            }
                        });
                    } else {
                        console.log('  No active cup round found.');
                    }

                } catch (e) {
                    console.error(`  Error processing ${ctx.name}:`, e.message);
                }
            }
        }

        // D. Fetch Lineups (Batch)
        // Deduplicate requests by unique tuple
        const uniqueRequests = lineupRequests.filter((v, i, a) => a.findIndex(t => (t.teamId === v.teamId && t.roundId === v.roundId && t.champId === v.champId)) === i);

        console.log(`\nFetching ${uniqueRequests.length} lineups...`);

        const hashComponents = [];

        // Helper
        const fetchLineup = async (req) => {
            try {
                const res = await axios.post(`${CONFIG.BASE_URL}/1/userteam/roundlineup`, {
                    header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
                    query: { championshipId: req.champId, userteamId: req.teamId, round: req.roundId },
                    answer: {}
                });
                const lData = res.data.answer || res.data;
                const list = lData.players?.initial || lData.players || lData.lineup || [];

                const points = list.reduce((sum, p) => sum + (p.points || 0), 0);

                // Calculate Cards/Sanctions
                const stats = list.reduce((acc, p) => {
                    const s = p.stats || (p.detailedPoints && p.detailedPoints.data) || {};
                    acc.y += (s.yellow_card || s.cards_yellow || 0);
                    acc.r += (s.red_card || s.cards_red || 0);
                    return acc;
                }, { y: 0, r: 0 });

                const captain = list.find(p => p.captain || p.cpt);
                const capName = captain ? (captain.name || captain.nick || 'X') : 'N';

                return {
                    id: `${req.ctxName}:${req.teamId}`,
                    points: points,
                    sanctions: `${stats.y}:${stats.r}`,
                    capName: capName
                };
            } catch (e) {
                return { id: `${req.ctxName}:${req.teamId}`, points: 0, sanctions: '0:0', capName: 'ERR' };
            }
        };

        // Batch execution (Chunk 20 for speed)
        const chunkSize = 20;
        for (let i = 0; i < uniqueRequests.length; i += chunkSize) {
            const chunk = uniqueRequests.slice(i, i + chunkSize);
            const results = await Promise.all(chunk.map(fetchLineup));
            hashComponents.push(...results);
        }

        // E. Compute Hash
        hashComponents.sort();
        const masterHash = hashComponents.join('|');
        console.log(`Master Hash Length: ${masterHash.length}`);

        // F. Notify Logic
        let notify = false;
        let notificationTitle = 'Actualización Futmondo';
        let notificationBody = 'Nuevos datos disponibles.';

        // Reminder Logic (24h before)
        if (nextRoundDate && !lastState.reminderSent && nextRoundNum) { // Check if we have a future date and haven't sent it
            // Ensure we don't send reminder if the round is already current/locked (handled above)
            if (globalStatus !== 'current' && globalStatus !== 'locked' && globalStatus !== 'custom_locked') {
                const now = new Date();
                const diffMs = nextRoundDate - now;
                const diffHours = diffMs / (1000 * 60 * 60);

                if (diffHours > 0 && diffHours < 24) {
                    notify = true;
                    notificationTitle = `Recordatorio J${nextRoundNum}`;
                    notificationBody = `⏳ La Jornada ${nextRoundNum} empieza en menos de 24h (${Math.round(diffHours)}h). ¡Revisa tus capitanes!`;
                    lastState.reminderSent = true;
                }
            }
        }

        if (!lastState.round || lastState.round !== globalRoundNum) {
            // New Round Detected (Jumps from X to Y)
            // Usually happens when previous round closes and next one becomes active/pending
            notify = true;
            notificationTitle = `Jornada ${globalRoundNum}`;
            if (globalStatus === 'current') {
                notificationBody = `⚽ ¡Arranca la Jornada ${globalRoundNum}!`;
                lastState.reminderSent = false;
            } else if (globalStatus === 'custom_locked' || globalStatus === 'locked') {
                notificationBody = `⏳ Jornada ${globalRoundNum} bloqueada. ¡Revisa tus capitanes! Queda poco.`;
            } else {
                notificationBody = `Nueva Jornada ${globalRoundNum} detectada (${globalStatus}).`;
                lastState.reminderSent = false;
            }
        }

        // Reminder Logic (24h before)
        if (nextRoundDate && !lastState.reminderSent && nextRoundNum) { // Check if we have a future date and haven't sent it
            // Ensure we don't send reminder if the round is already current/locked (handled above)
            if (globalStatus !== 'current' && globalStatus !== 'locked' && globalStatus !== 'custom_locked') {
                const now = new Date();
                const diffMs = nextRoundDate - now;
                const diffHours = diffMs / (1000 * 60 * 60);

                if (diffHours > 0 && diffHours < 24) {
                    notify = true;
                    notificationTitle = `Recordatorio J${nextRoundNum}`;
                    notificationBody = `⏳ La Jornada ${nextRoundNum} empieza en menos de 24h (${Math.round(diffHours)}h). ¡Revisa tus capitanes!`;
                    lastState.reminderSent = true;
                }
            }
        }

        if (notify) {
            // Logic handled below
        } else if (lastState.status !== globalStatus) {
            // Status Change within same round
            notify = true;
            notificationTitle = `Jornada ${globalRoundNum}`;
            if (globalStatus === 'current') {
                notificationBody = `⚽ ¡Arranca la Jornada ${globalRoundNum}!`;
                lastState.reminderSent = false;
            } else if (globalStatus === 'closed') {
                notificationBody = `🏁 Jornada ${globalRoundNum} finalizada. Consulta los resultados finales.`;
            } else if (globalStatus === 'custom_locked' || globalStatus === 'locked') {
                notificationBody = `⏳ Jornada ${globalRoundNum} bloqueada. ¡Última oportunidad para capitanes!`;
            } else {
                notificationBody = `Estado actualizado: ${globalStatus}.`;
            }
        } else if (lastState.hash && lastState.hash !== masterHash && globalStatus === 'current') {
            // Score/Lineup Updates during live round
            notify = true;
            notificationTitle = `Jornada ${globalRoundNum} en directo`;
            notificationBody = `Han cambiado las puntuaciones o alineaciones.`;
        }

        // --- SUBSCRIBE TOKENS TO TOPIC ---
        try {
            const tokensSnapshot = await db.collection('fcm_tokens').get();
            const tokens = [];
            tokensSnapshot.forEach(doc => {
                if (doc.data().token) tokens.push(doc.data().token);
            });

            if (tokens.length > 0) {
                console.log(`Subscribing ${tokens.length} tokens to 'general'...`);
                const topicName = 'general';
                for (let i = 0; i < tokens.length; i += 1000) {
                    const batch = tokens.slice(i, i + 1000);
                    const response = await msg.subscribeToTopic(batch, topicName);
                    console.log(`Batch ${i / 1000 + 1}: Success ${response.successCount}`);
                }
            } else {
                console.log('No tokens found to subscribe.');
            }
        } catch (subError) {
            console.error('Subscription Error (Non-Fatal):', subError.message);
        }

        if (notify) {
            console.log('Sending notification:', notificationBody);
            const message = {
                notification: { title: notificationTitle, body: notificationBody },
                topic: 'general'
            };
            await msg.send(message);

            await docRef.set({
                round: globalRoundNum,
                status: globalStatus,
                hash: masterHash,
                lastUpdate: new Date().toISOString(),
                reminderSent: lastState.reminderSent || false
            });
        } else {
            console.log('No significant changes.');
            // Always update state if hash or reminder status changed
            if (lastState.hash !== masterHash || lastState.reminderSent) {
                await docRef.set({
                    round: globalRoundNum,
                    status: globalStatus,
                    hash: masterHash,
                    lastUpdate: new Date().toISOString(),
                    reminderSent: lastState.reminderSent || false
                }, { merge: true });
            }
        }

    } catch (error) {
        console.error('Fatal Error:', error.message);
        process.exit(1);
    }
}

checkUpdates();
