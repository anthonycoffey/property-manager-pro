// Import Firebase Admin SDK
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Configuration ---
const projectId = 'phoenix-property-manager-pro';

// Helper function to parse command line arguments
function getArg(argName) {
    const arg = process.argv.find(a => a.startsWith(`--${argName}=`));
    if (arg) {
        return arg.split('=')[1];
    }
    return null;
}

const targetEnv = getArg('env') || 'emulator'; // Default to emulator

async function askConfirmation(promptMessage) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(promptMessage, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

// REMOVE Global Firebase Admin SDK initialization from here.
// It will be initialized within the seedTemplates function.

let db; // Declare db here, initialize later

const templatesToSeed = [
    {
        id: 'residentInvitation',
        filePath: path.join(__dirname, '../docs/residentInvitation.json') // Path relative to scripts/
    },
    {
        id: 'propertyManagerInvitation',
        filePath: path.join(__dirname, '../docs/propertyManagerInvitation.json') // Path relative to scripts/
    },
    {
        id: 'organizationManagerInvitation',
        filePath: path.join(__dirname, '../docs/organizationManagerInvitation.json') // Path relative to scripts/
    }
];

async function seedTemplates() {
    console.log(`Targeting environment: ${targetEnv.toUpperCase()}`);

    if (targetEnv === 'emulator') {
        if (!process.env.FIRESTORE_EMULATOR_HOST) {
            console.log('FIRESTORE_EMULATOR_HOST is not set externally. Defaulting to "localhost:8080" for emulator.');
            process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
        } else {
            console.log(`FIRESTORE_EMULATOR_HOST is already set to: ${process.env.FIRESTORE_EMULATOR_HOST}. Using this for emulator.`);
        }
        console.log(`Connecting to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST} for project ${projectId}.`);
    } else if (targetEnv === 'production') {
        // For production, ensure FIRESTORE_EMULATOR_HOST is not set, so it connects to live.
        if (process.env.FIRESTORE_EMULATOR_HOST) {
            console.warn(`Warning: FIRESTORE_EMULATOR_HOST is set to "${process.env.FIRESTORE_EMULATOR_HOST}", but --env=production was specified.`);
            console.warn('Unsetting FIRESTORE_EMULATOR_HOST and targeting PRODUCTION.');
            delete process.env.FIRESTORE_EMULATOR_HOST; // Ensure it's not used for production
        }
        console.log(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
        console.log(`!!! WARNING: Preparing to seed data to PRODUCTION Firestore for project '${projectId}' !!!`);
        console.log(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`);
        const confirmation = await askConfirmation("This action is potentially destructive and irreversible. Are you absolutely sure you want to continue? (Type 'Y' or 'yes' to proceed): ");
        if (confirmation !== 'y' && confirmation !== 'yes') {
            console.log('Production seed operation cancelled by user. Exiting.');
            process.exit(0);
        }
        console.log('Confirmation received. Proceeding with PRODUCTION seed...');
    } else {
        console.error(`Invalid --env value: "${targetEnv}". Must be 'emulator' or 'production'. Exiting.`);
        process.exit(1);
    }

    // Initialize SDK and Firestore client HERE, after env vars are set
    try {
        // Check if app is already initialized to avoid re-initialization error if this function were called multiple times
        // though in this script structure, it's called once.
        if (!admin.apps.length) {
            admin.initializeApp({
                projectId: projectId,
                // For emulator, if FIRESTORE_EMULATOR_HOST is set, credentials are not strictly needed for Firestore.
                // For production, it will use Application Default Credentials.
            });
        } else {
            // If called again, use the existing default app
            admin.app();
        }
    } catch (e) {
        // This catch is more for the case where initializeApp might be called in a context where it's already initialized by another part
        // For this script, the top-level try/catch for initializeApp is the primary one.
        if (e.code !== 'app/duplicate-app') {
            console.error(`Firebase Admin SDK re-initialization check failed: ${e.message}. Exiting.`);
            process.exit(1);
        }
    }
    
    db = admin.firestore(); // Initialize db after SDK is confirmed to be initialized

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
