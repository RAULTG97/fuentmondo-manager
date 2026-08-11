const fs = require('fs');
const path = require('path');

const escudosDir = path.join(__dirname, '..', 'public', 'escudos');
const files = fs.readdirSync(escudosDir).map(f => f.replace('.jpeg', '').replace('.png', ''));

const detectedTeams = [
  "MTB Drink Team", "Acelgas F. C.", "CALAMARES CON TORRIJAS🦑🍞", "Sporting de Magreta", 
  "Todo por la camiseta 🇪🇸", "Pablo Garcia Saez", "Molinardo fc", "Pokelocos fc", 
  "Tetitas Colesterol . F.C", "LOS POKÉMON 🟡🐭🟡", "Team pepino", "Galácticos de la noche FC",
  "Morenetes de la Giralda 🍩", "Minabo De Kiev", "Pollos sin cabeza 🐥🧄", "parker f.c.", 
  "CAMEL 23 F.C.", "Abogados del Gol FC", "EL CHOLISMO FC", "BANANEROS FC🍌", "simone", 
  "SANTA LUCIA FC", "entrenamientoyociottm", "MORRITOS F.C.", "Jamon York F.C.", 
  "Banano Vallekano 🍌⚡", "galagartos fc", "Kostas Mariotas", "Los Ángeles FC", 
  "Elche pero Peor", "Motobetis a primera!", "Charo la Picanta FC"
];

console.log("Comprobando escudos faltantes:");
const normalizeName = (name) => {
    if (!name) return '';
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^\p{L}\p{N}\p{P}\p{Z}^$]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

const fileNorm = files.map(normalizeName);

detectedTeams.forEach(t => {
   const normT = normalizeName(t);
   if (!fileNorm.includes(normT)) {
      console.log(`Falta: ${t} (norm: ${normT})`);
   }
});
