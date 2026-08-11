import { getAssetPath } from './path';

export { getAssetPath };

import shieldMap from '../data/shieldMap.json';

const normalizeForMap = (str) => {
    if (!str) return '';
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
};

export const getTeamShield = (teamName) => {
    if (!teamName) return null;

    let cleanName = teamName.trim().replace(/\s+/g, ' ');
    const norm = normalizeForMap(cleanName);

    // 1. Check dynamic mapping first
    if (shieldMap[norm]) {
        return getAssetPath(`/escudos/${shieldMap[norm]}`);
    }

    // 2. Specific fixes for known mismatches if not caught by normalization
    if (cleanName.includes('Samba Rovinha')) {
        return getAssetPath('/escudos/Samba Rovinha 🇧🇷.jpeg');
    }
    if (cleanName.includes('LOS POKÉMON')) {
        return getAssetPath('/escudos/LOS POKÉMON 🟡🐭🟡.jpeg');
    }
    if (cleanName.includes('Tetitas Colesterol')) {
        return getAssetPath('/escudos/Tetitas Colesterol . F.C.jpeg');
    }

    // 3. Fallback: URL encode clean name with .jpeg
    return getAssetPath(`/escudos/${encodeURIComponent(cleanName)}.jpeg`);
};

// App Logos and Intro Assets
export const APP_LOGO = getAssetPath('/escudos/fuentmondo.jpeg');
export const COPA_LOGO = getAssetPath('/escudos/CopaPirana.jpeg');
export const INTRO_CHAMPIONS = getAssetPath('/escudos/intro_Champions.png');
export const INTRO_LIGA_ML = getAssetPath('/escudos/intro_LigaML.png');
export const INTRO_COPA = getAssetPath('/escudos/intro_Copa.jpeg');
