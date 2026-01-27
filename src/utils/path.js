/**
 * Utility for handling asset paths with Vite's base URL
 */

export const getAssetPath = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    // Clean path to ensure it starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // Import meta.env.BASE_URL is '/' in dev and '/fuentmondo-manager/' in prod
    return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${cleanPath}`;
};
