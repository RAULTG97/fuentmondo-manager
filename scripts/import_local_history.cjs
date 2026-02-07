const fs = require('fs');
const path = require('path');
const axios = require('axios');
const admin = require('firebase-admin');

// Service Account
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccount = serviceAccountRaw ? JSON.parse(serviceAccountRaw) : null;

if (!serviceAccount || !serviceAccount.project_id) {
    console.error('Missing or invalid FIREBASE_SERVICE_ACCOUNT env var');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

const CONFIG = {
    BASE_URL: 'https://api.futmondo.com',
    AUTH: {
        TOKEN: process.env.VITE_INTERNAL_TOKEN || 'e1c9_5554f9913726b6e2563b78e8200c5e5b',
        USER_ID: process.env.VITE_INTERNAL_USER_ID || '55e4de47d26f276304fcc222'
    },
    CHAMPS: [
        { id: '6598143af1e53905facfcc6d', name: 'Champions Fuentmondo (Primera)' },
        { id: '65981dd8f1fa9605fbefe305', name: 'Segunda' }
    ],
    BACKUP_DIR: process.argv[2] || '/home/blackman/Documents/fuentmondo/backups/temporada_invierno_2026/resultados'
};

const logFile = 'debug/import_log.txt';
if (!fs.existsSync('debug')) fs.mkdirSync('debug');
fs.writeFileSync(logFile, 'Starting Robust Import...\n');

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

async function getTeamMapping() {
    const mapping = {}; // Name -> ID
    log('Fetching Team IDs from API...');

    for (const ctx of CONFIG.CHAMPS) {
        try {
            const res = await axios.post(`${CONFIG.BASE_URL}/1/championship/ranking`, {
                header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
                query: { championshipId: ctx.id },
                answer: {}
            });
            const ranking = res.data.answer || res.data || [];
            ranking.forEach(t => {
                const name = (t.name || '').trim();
                mapping[name] = t.id || t._id;
                mapping[name.toLowerCase()] = t.id || t._id;
            });
            log(`  Loaded ${ranking.length} teams from ${ctx.name}`);
        } catch (e) {
            log(`  Failed to load ranking for ${ctx.name}: ${e.message}`);
        }
    }
    return mapping;
}

async function importHistory() {
    try {
        const teamMap = await getTeamMapping();

        const files = fs.readdirSync(CONFIG.BACKUP_DIR).filter(f => f.endsWith('.json') && f.includes('jornada_'));
        log(`Found ${files.length} backup files.`);

        const history = {};

        files.sort((a, b) => {
            const ext = (s) => parseInt(s.match(/jornada_(\d+)/)[1]);
            return ext(a) - ext(b);
        });

        for (const file of files) {
            log(`Processing ${file}...`);
            const roundNum = parseInt(file.match(/jornada_(\d+)/)[1]);
            const content = JSON.parse(fs.readFileSync(path.join(CONFIG.BACKUP_DIR, file), 'utf8'));
            const matches = content["Resultados por combate"] || [];

            for (const match of matches) {
                const keys = Object.keys(match).filter(k => k !== 'Combate' && k !== 'Jugadores repetidos');
                for (const teamName of keys) {
                    const teamData = match[teamName];
                    const capName = teamData.Capitan;
                    if (!capName || capName === 'N/A') continue;

                    const teamKey = teamName.trim();
                    const teamId = teamMap[teamKey] || teamMap[teamKey.toLowerCase()];

                    if (!history[teamKey]) {
                        history[teamKey] = { name: teamName, counts: {}, lastProcessedRound: 0, _legacyId: teamId || null };
                    }

                    if (!history[teamKey].counts[capName]) history[teamKey].counts[capName] = 0;
                    history[teamKey].counts[capName]++;

                    if (roundNum > history[teamKey].lastProcessedRound) {
                        history[teamKey].lastProcessedRound = roundNum;
                    }
                }
            }
        }

        log(`\nWriting to Firestore... (${Object.keys(history).length} teams)`);
        let batch = db.batch();
        let count = 0;

        for (const [teamKey, data] of Object.entries(history)) {
            const ref = db.collection('captain_history').doc(teamKey);
            batch.set(ref, data);
            count++;

            if (count >= 400) {
                await batch.commit();
                log(`  Committed batch (400)`);
                batch = db.batch();
                count = 0;
            }
        }
        if (count > 0) {
            await batch.commit();
            log(`  Committed final batch (${count})`);
        }

        log(`Successfully imported history.`);
    } catch (e) {
        log(`FATAL ERROR: ${e.message}\n${e.stack}`);
    }
}

importHistory();
