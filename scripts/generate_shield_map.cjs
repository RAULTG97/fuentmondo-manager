const fs = require('fs');
const path = require('path');

const escudosDir = path.join(__dirname, '../public/escudos');
const dataDir = path.join(__dirname, '../src/data');
const mapFile = path.join(dataDir, 'shieldMap.json');

const files = fs.readdirSync(escudosDir);
const map = {};

const normalize = (str) => {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
};

files.forEach(file => {
    if (file.startsWith('.')) return;
    const nameWithoutExt = file.substring(0, file.lastIndexOf('.'));
    const norm = normalize(nameWithoutExt);
    map[norm] = file;
});

fs.writeFileSync(mapFile, JSON.stringify(map, null, 2));
console.log(`Generated shieldMap.json with ${Object.keys(map).length} entries.`);
