import { getAssetPath } from './path';

export const getTeamShield = (teamName) => {
    if (!teamName) return null;

    // 1. Basic normalization: trim and collapse multiple spaces (important for Charo la   Picanta)
    let cleanName = teamName.trim().replace(/\s+/g, ' ');

    // 2. Specific fixes for known mismatches between API names and filenames

    // Samba Rovinha: API uses flags at start/end, filename only at end
    if (cleanName.includes('Samba Rovinha')) {
        return getAssetPath('/escudos/Samba Rovinha 🇧🇷.jpeg');
    }

    // Los Pokémon: API emoji order vs filename emoji order
    if (cleanName.includes('LOS POKÉMON')) {
        return getAssetPath('/escudos/LOS POKÉMON 🟡🐭🟡.jpeg');
    }

    // Tetitas Colesterol: filename has extra dots or spaces
    if (cleanName.includes('Tetitas Colesterol')) {
        return getAssetPath('/escudos/Tetitas Colesterol . F.C.jpeg');
    }

    // Elche: API might say something else? List dir had "Elche pero Peor"

    // Handle the .jpeg extension and URL encoding
    return getAssetPath(`/escudos/${encodeURIComponent(cleanName)}.jpeg`);
};

export const APP_LOGO = getAssetPath('/logo.jpeg');
export const COPA_LOGO = getAssetPath(`/escudos/${encodeURIComponent('CopaPirana')}.jpeg`);
