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
    DRY_RUN: process.argv.includes('--dry-run'),
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
        const roundsList = metaResp.data.answer || metaResp.data;
        if (!roundsList || roundsList.length === 0) throw new Error('No rounds found in API response.');

        // Sort by number descending
        roundsList.sort((a, b) => Number(b.number) - Number(a.number));

        // Let's filter out 'future' rounds for targeting current/last activity
        // Prioritize: current/running > locked > closed
        const prioritizedRounds = roundsList.filter(r => ['current', 'running', 'locked', 'custom_locked'].includes(r.status));

        // Target the highest-numbered prioritized round, fallback to latest closed/whatever
        const activeRound = prioritizedRounds[0] || roundsList[0];

        const globalRoundNum = Number(activeRound.number);
        const globalRoundId = activeRound.id || activeRound._id;
        const globalStatus = activeRound.status;

        console.log(`  Targeting J${globalRoundNum} (Estado Actual: ${globalStatus})`);
        console.log(`  Último estado en DB: J${lastState.round} (${lastState.status})`);

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
        // Previously we used a Set with string keys. Now we need to pass objects with teamName.
        // We will collect objects first, then deduplicate later.
        const lineupRequests = []; // { teamId, teamName, roundId, champId, ctxName }

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
                                            teamName: team.name, // Added for history tracking
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
                                    teamName: tA.name, // Added for history tracking
                                    roundId: cupRoundId,
                                    champId: ctx.id,
                                    ctxName: ctx.name
                                });
                            }
                            if (tB && (tB.id || tB._id)) {
                                lineupRequests.push({
                                    teamId: tB.id || tB._id,
                                    teamName: tB.name, // Added for history tracking
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

        // D. Fetch Lineups & Calculate Hashes
        // Need to include teamName in the unique key so it persists through the Set
        const requests = new Set();
        for (const r of lineupRequests) {
            // Using a delimiter that won't appear in names. '|' is risky if name has pipe? 
            // JSON stringify is safer but slower? Let's stick to pipe but be careful.
            // Team Name might contain special chars. Let's use JSON stringify for the whole object to be safe.
            requests.add(JSON.stringify(r));
        }

        const uniqueRequests = Array.from(requests).map(str => JSON.parse(str));

        // LOAD HISTORY (for Captain Sanctions)
        const captainHistory = {}; // { teamId: { counts: { name: count } } }
        try {
            const histSnap = await db.collection('captain_history').get();
            histSnap.forEach(doc => {
                captainHistory[doc.id] = doc.data();
            });
            console.log(`Loaded history for ${Object.keys(captainHistory).length} teams.`);
        } catch (e) {
            console.error('Error loading history:', e.message);
        }

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
                const capName = captain ? (captain.name || captain.nick || 'X').trim() : 'N';

                // Captain Sanction Check
                let capSanction = null;
                if (capName !== 'N' && capName !== 'X') {
                    // Use Team Name as key for history (trim to be safe)
                    const teamKey = req.teamName ? req.teamName.trim() : req.teamId;
                    const teamHist = captainHistory[teamKey] || { counts: {} };
                    const histCount = teamHist.counts[capName] || 0;
                    // Check if adding this round triggers sanction (3rd, 6th, etc)
                    // Only effective if round is ACTIVE or CLOSED (implied by this script running context)
                    // We assume +1 for current round
                    if ((histCount + 1) % 3 === 0) {
                        capSanction = `${capName} (3ª)`; // trigger string
                    }
                }

                return {
                    id: `${req.ctxName}:${req.teamId}`,
                    points: points,
                    sanctions: `${stats.y}:${stats.r}`,
                    capName: capName,
                    capSanction: capSanction,
                    req: req // pass request info for updates
                };
            } catch (e) {
                return { id: `${req.ctxName}:${req.teamId}`, points: 0, sanctions: '0:0', capName: 'ERR' };
            }
        };

        // Batch execution (Chunk 20 for speed)
        const chunkSize = 20;
        const allResults = [];
        for (let i = 0; i < uniqueRequests.length; i += chunkSize) {
            const chunk = uniqueRequests.slice(i, i + chunkSize);
            const results = await Promise.all(chunk.map(fetchLineup));
            allResults.push(...results);
        }

        // E. Compute Hashes
        // 1. Master Hash (General Change Detection)
        const masterString = allResults.map(r => `${r.id}:${r.points}:${r.sanctions}:${r.capName}`).sort().join('|');

        // 2. Specific Hashes
        const totalPoints = allResults.reduce((sum, r) => sum + r.points, 0);
        const totalYellows = allResults.reduce((sum, r) => sum + parseInt(r.sanctions.split(':')[0]), 0);
        const totalReds = allResults.reduce((sum, r) => sum + parseInt(r.sanctions.split(':')[1]), 0);

        // Captain Sanctions Hash: List of names triggering sanction
        // Use a Set to deduplicate names (in case a player is in multiple contexts or duplicate results)
        const sanctionsList = Array.from(new Set(allResults.filter(r => r.capSanction).map(r => r.capSanction))).sort();
        const capSanctionsHash = sanctionsList.join(',');

        const pointsHash = `PTS:${totalPoints}`;
        // Combine Card Sanctions and Captain Sanctions into one hash or keep separate?
        // User said "sanciones" refers to captains mainly.
        // Let's combine for "Sanction Notifications" generic bucket, OR specific.
        // "Nuevas tarjetas" vs "Sanción Capitanía".
        // Use a composite hash for sanctions check.
        const sanctionsHash = `Y:${totalYellows}|R:${totalReds}|C:${capSanctionsHash}`;

        console.log(`Global Stats: ${pointsHash} | ${sanctionsHash}`);

        // F. Notify Logic
        let notify = false;
        let notificationTitle = 'Actualización Futmondo';
        let notificationBody = 'Nuevos datos disponibles.';

        // Reminder Logic (24h before)
        if (nextRoundDate && !lastState.reminderSent && nextRoundNum && globalStatus !== 'current' && globalStatus !== 'locked' && globalStatus !== 'custom_locked') {
            const now = new Date();
            const diffMs = nextRoundDate - now;
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours > 0 && diffHours < 24) {
                notify = true;
                notificationTitle = `⏳ J${nextRoundNum}: ¡Solo 24h!`;
                notificationBody = `¡Aviso importante! La Jornada ${nextRoundNum} empieza en unas ${Math.round(diffHours)} horitas. No te olvides de poner a punto tus capitanes. ⚡`;
                lastState.reminderSent = true;
            }
        }

        console.log(`--- DEBUG: NOTIFY PRE-CHECK ---`);
        console.log(`  notify: ${notify}`);
        console.log(`  lastState.round: ${lastState.round} (type: ${typeof lastState.round})`);
        console.log(`  globalRoundNum: ${globalRoundNum} (type: ${typeof globalRoundNum})`);

        if (notify) {
            console.log('  Notify already true (Reminder)');
            // Logic handled above (Reminder)
        } else if (!lastState.round || Number(lastState.round) !== globalRoundNum) {
            console.log('  Triggering New Round Detection!');
            // New Week / Round Detected
            notify = true;
            notificationTitle = `⚽ ¡Nueva Jornada: J${globalRoundNum}!`;

            if (globalStatus === 'current' || globalStatus === 'running') {
                notificationBody = `¡Ya está aquí la Jornada ${globalRoundNum}! Que ruede el balón y que la suerte os acompañe. 🍀`;
                lastState.reminderSent = false;
            } else if (globalStatus === 'custom_locked' || globalStatus === 'locked') {
                notificationBody = `¡Ojo! La Jornada ${globalRoundNum} ya se ha bloqueado. ¡Espero que vuestros capitanes estén listos para el combate! 😉`;
                lastState.reminderSent = false;
            } else if (globalStatus === 'closed') {
                notificationBody = `¡Damos carpetazo a la Jornada ${globalRoundNum}! Ya podéis consultar cómo ha quedado todo. 🏁`;
            } else {
                notificationBody = `¡Se empieza a mover la Jornada ${globalRoundNum}! De momento está "${globalStatus}".`;
            }
        } else if (lastState.status !== globalStatus) {
            // Transition between status (e.g. from locked to running)
            notify = true;
            const statusMap = {
                'running': 'en juego',
                'current': 'en directo',
                'locked': 'bloqueada',
                'custom_locked': 'bloqueada',
                'closed': 'finalizada',
                'future': 'próxima'
            };
            const naturalStatus = statusMap[globalStatus] || globalStatus;
            notificationTitle = `Jornada ${globalRoundNum}: Cambio de estado 🔄`;

            if (globalStatus === 'current' || globalStatus === 'running') {
                notificationBody = `¡Empieza lo bueno! La Jornada ${globalRoundNum} ya está ${naturalStatus}. ¡A por todas! 🚀`;
            } else if (globalStatus === 'closed') {
                let body = `🏁 ¡Pitido final en la Jornada ${globalRoundNum}! Ya podéis ver los puntos definitivos. 🏆`;
                if (capSanctionsHash) {
                    body += `\n\n⚠️ ¡Atención! Tenemos estas sanciones de capitanes:\n${trunc(capSanctionsHash, 100)}`;
                }
                notificationBody = body;

                // --- RESTORED HISTORY UPDATE LOGIC ---
                console.log('Round Closed. Updating Captain History in Firestore...');
                if (CONFIG.DRY_RUN) {
                    console.log('  [DRY RUN] Skipping history write.');
                } else {
                    for (const res of allResults) {
                        if (res.req && res.capName && res.capName !== 'N' && res.capName !== 'X') {
                            const teamKey = res.req.teamName ? res.req.teamName.trim() : res.req.teamId;
                            const teamRef = db.collection('captain_history').doc(teamKey);
                            try {
                                await db.runTransaction(async (t) => {
                                    const doc = await t.get(teamRef);
                                    const data = doc.exists ? doc.data() : { counts: {} };
                                    if (!data.counts) data.counts = {};
                                    if (!data.lastProcessedRound || data.lastProcessedRound < globalRoundNum) {
                                        data.counts[res.capName] = (data.counts[res.capName] || 0) + 1;
                                        data.lastProcessedRound = globalRoundNum;
                                        t.set(teamRef, data, { merge: true });
                                    }
                                });
                            } catch (e) {
                                console.error(`  Error historizando ${teamKey}:`, e.message);
                            }
                        }
                    }
                }
            } else if (globalStatus === 'custom_locked' || globalStatus === 'locked') {
                notificationBody = `¡Atención! La Jornada ${globalRoundNum} se ha bloqueado. ¡Que Dios reparta suerte! 🤞`;
            } else {
                notificationBody = `La Jornada ${globalRoundNum} ha pasado a estar "${naturalStatus}".`;
            }
        } else if (globalStatus === 'current' || globalStatus === 'running') {
            // Live updates while playing
            if (lastState.pointsHash !== pointsHash) {
                notify = true;
                notificationTitle = `⚽ ¡Gooool! - J${globalRoundNum}`;
                notificationBody = `¡Hay movimiento! Se acaban de actualizar los puntos. ¡Echadle un ojo al marcador! 👀`;
            } else if (lastState.sanctionsHash !== sanctionsHash) {
                notify = true;
                notificationTitle = `⚠️ Alerta de Sanciones - J${globalRoundNum}`;
                if (capSanctionsHash && (!lastState.sanctionsHash || !lastState.sanctionsHash.includes(capSanctionsHash))) {
                    notificationBody = `¡Cuidado! Tenemos nuevas sanciones de capitanes: ${trunc(capSanctionsHash, 80)}. 🟥`;
                } else {
                    notificationBody = `¡Vuelan las tarjetas! Hay novedades en las sanciones y tarjetas de la jornada. 🟥🟨`;
                }
            }
        }

        function trunc(str, n) { return (str.length > n) ? str.substr(0, n - 1) + '...' : str; }

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
            console.log(`--- NOTIFICATION PAYLOAD ---`);
            console.log(`  Title: ${notificationTitle}`);
            console.log(`  Body:  ${notificationBody}`);
        }

        if (CONFIG.DRY_RUN) {
            console.log('[DRY RUN] Skipping official send and state update.');
            return;
        }

        if (notify) {
            console.log('Sending live notification...');
            const message = {
                notification: { title: notificationTitle, body: notificationBody },
                topic: 'general'
            };
            await msg.send(message);

            await docRef.set({
                round: globalRoundNum,
                status: globalStatus,
                hash: masterString,
                pointsHash: pointsHash,
                sanctionsHash: sanctionsHash,
                lastUpdate: new Date().toISOString(),
                reminderSent: lastState.reminderSent || false
            });
        } else {
            console.log('No significant changes.');
            // Always update state if hash or reminder status changed to keep sync
            if (lastState.hash !== masterString || lastState.pointsHash !== pointsHash || lastState.sanctionsHash !== sanctionsHash || lastState.reminderSent) {
                await docRef.set({
                    round: globalRoundNum,
                    status: globalStatus,
                    hash: masterString,
                    pointsHash: pointsHash,
                    sanctionsHash: sanctionsHash,
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
