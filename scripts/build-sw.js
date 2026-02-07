import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// ESM dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const DIST_DIR = path.join(__dirname, '../dist');
const PUBLIC_SW = path.join(__dirname, '../public/firebase-messaging-sw.js');
const DIST_SW = path.join(DIST_DIR, 'firebase-messaging-sw.js');
const DIST_CONFIG = path.join(DIST_DIR, 'firebase-config.js');

console.log('--- Injecting Firebase Config into Service Worker ---');

if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist/ directory not found. Run build first.');
    process.exit(1);
}

// 1. Prepare Config Object
const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const configString = `var firebaseConfig = ${JSON.stringify(config, null, 4)};`;

// 2. Read SW Template
let swContent = fs.readFileSync(PUBLIC_SW, 'utf-8');

// 3. Replace Import with Inline Config
// Replaces: importScripts('./firebase-config.js');
const importPattern = /importScripts\(['"]\.\/firebase-config\.js['"]\);?/;

if (swContent.match(importPattern)) {
    swContent = swContent.replace(importPattern, configString);
    console.log('✅ Replaced importScripts with inline config.');
} else {
    // If pattern not found, prepend config
    console.warn('⚠️ Import pattern not found. Prepending config.');
    swContent = configString + '\n' + swContent;
}

// 4. Write to Dist
fs.writeFileSync(DIST_SW, swContent);
console.log(`✅ Wrote modified Service Worker to ${DIST_SW}`);

// 5. Remove standalone config file from Dist (if copied by Vite)
if (fs.existsSync(DIST_CONFIG)) {
    fs.unlinkSync(DIST_CONFIG);
    console.log('✅ Removed sensitive file: dist/firebase-config.js');
} else {
    console.log('ℹ️ dist/firebase-config.js not found (already clean).');
}

console.log('--- Injection Complete ---');
