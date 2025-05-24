// Import Firebase Admin SDK
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Configuration ---
// Ensure FIRESTORE_EMULATOR_HOST is set in your environment (e.g., export FIRESTORE_EMULATOR_HOST="localhost:8080")
// before running this script.
const projectId = 'phoenix-property-manager-pro';

try {
    admin.initializeApp({
        projectId: projectId,
    });
} catch (e) {
    // It's common for the SDK to be already initialized if running in an environment
    // where other Firebase tools might have done so (like tests or other scripts).
    if (e.code !== 'app/duplicate-app') {
        console.warn(`Firebase Admin SDK initialization failed: ${e.message}.`);
        // If it's not a duplicate app error, it might be more serious.
        // For a seeding script against the emulator, this might still be okay if FIRESTORE_EMULATOR_HOST is set.
    }
}

const db = admin.firestore();

const templatesToSeed = [
    {
        id: 'residentInvitation',
        filePath: path.join(__dirname, '../docs/residentInvitation.json') // Path relative to scripts/
    },
    {
        id: 'propertyManagerInvitation',
        filePath: path.join(__dirname, '../docs/propertyManagerInvitation.json') // Path relative to scripts/
    }
];

async function seedTemplates() {
    console.log(`Attempting to connect to Firestore (Project: ${projectId}).`);
    if (process.env.FIRESTORE_EMULATOR_HOST) {
        console.log(`FIRESTORE_EMULATOR_HOST is set to: ${process.env.FIRESTORE_EMULATOR_HOST}. Connecting to emulator.`);
    } else {
        console.warn('FIRESTORE_EMULATOR_HOST is NOT set. This script will attempt to connect to LIVE Firestore.');
        console.warn('If you intend to seed the emulator, please set FIRESTORE_EMULATOR_HOST="localhost:8080" and re-run.');
        // Add a small delay and a confirmation step if proceeding to live, or exit.
        // For this script, we'll assume emulator is intended.
        // You might want to add a readline prompt here for safety in a real-world script.
    }

    console.log('\nStarting to seed templates...');

    for (const template of templatesToSeed) {
        try {
            if (!fs.existsSync(template.filePath)) {
                console.error(`Error: File not found at ${template.filePath}`);
                continue; // Skip this template
            }
            const fileContent = fs.readFileSync(template.filePath, 'utf8');
            const templateData = JSON.parse(fileContent);

            const docRef = db.collection('templates').doc(template.id);

            await docRef.set({
                ...templateData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Successfully seeded template: ${template.id}`);
        } catch (error) {
            console.error(`Error seeding template ${template.id}:`, error);
        }
    }
    console.log('\nFinished seeding templates.');
}

seedTemplates().then(() => {
    console.log('Script completed.');
    // admin.app().delete(); // Optional: uncomment if you want the script to terminate the Node.js process explicitly.
                            // For simple scripts, Node.js will exit once async operations are done.
}).catch(error => {
    console.error('Unhandled error during seeding process:', error);
    // admin.app().delete(); // Optional: ensure termination on unhandled error too.
});
