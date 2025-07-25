import admin from 'firebase-admin';
import readline from 'readline';

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

let db;

const notifications = [
  {
    title: "Unregistered Vehicle Notice",
    message: "A friendly reminder to register any new vehicles with the office. Unregistered vehicles are subject to towing at the owner's expense.",
    createdBy: "system",
  },
  {
    title: "Parking Policy Update",
    message: "Please be aware that guest parking is now restricted to designated areas only. Please see the office for a map of approved guest parking zones.",
    createdBy: "system",
  },
  {
    title: "Refer-a-Friend Program",
    message: "Know someone looking for a new apartment? Refer them to our community and receive a $200 rent credit when they sign a lease! Contact the office for more details.",
    createdBy: "system",
  },
  {
    title: "Pool Maintenance",
    message: "The pool will be closed for maintenance on Tuesday, July 29th, from 8 AM to 5 PM. We apologize for any inconvenience.",
    createdBy: "system",
  },
  {
    title: "Towing Notice: Unregistered Vehicle",
    message: "The vehicle with license plate 'FL-2024' is unregistered and parked in a resident-only zone. This vehicle will be towed in 24 hours if not moved.",
    createdBy: "system",
    vehicle: {
      licensePlate: "FL-2024"
    }
  },
  {
    title: "Community BBQ!",
    message: "Join us for a community BBQ this Saturday at 1 PM by the main pool! We'll have hot dogs, hamburgers, and fun for the whole family.",
    createdBy: "system",
  },
  {
    title: "Package Delivery Update",
    message: "Our package locker system is now fully operational. Please ensure your delivery instructions are updated to include your unique package locker code.",
    createdBy: "system",
  },
  {
    title: "Final Towing Notice",
    message: "The unregistered vehicle with license plate 'NY-COOL' will be towed in 2 hours. Please move your vehicle immediately.",
    createdBy: "system",
    vehicle: {
      licensePlate: "NY-COOL"
    }
  }
];

const collectionPath = 'organizations/pNcRD7xrbvCaKNBWSsCV/properties/Rf9JElhXesRAaWB7JxNC/notifications';

async function seedNotifications() {
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
        if (process.env.FIRESTORE_EMULATOR_HOST) {
            console.warn(`Warning: FIRESTORE_EMULATOR_HOST is set to "${process.env.FIRESTORE_EMULATOR_HOST}", but --env=production was specified.`);
            console.warn('Unsetting FIRESTORE_EMULATOR_HOST and targeting PRODUCTION.');
            delete process.env.FIRESTORE_EMULATOR_HOST;
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

    try {
        if (!admin.apps.length) {
            admin.initializeApp({
                projectId: projectId,
            });
        } else {
            admin.app();
        }
    } catch (e) {
        if (e.code !== 'app/duplicate-app') {
            console.error(`Firebase Admin SDK re-initialization check failed: ${e.message}. Exiting.`);
            process.exit(1);
        }
    }
    
    db = admin.firestore();

    console.log('\nStarting to seed notifications...');

    const collectionRef = db.collection(collectionPath);
    const promises = [];

    notifications.forEach(notification => {
        const docRef = collectionRef.doc();
        promises.push(docRef.set({
            ...notification,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }));
    });

    await Promise.all(promises);
    console.log(`Successfully seeded ${notifications.length} notifications.`);
    console.log('\nFinished seeding notifications.');
}

seedNotifications().then(() => {
    console.log('Script completed.');
}).catch(error => {
    console.error('Unhandled error during seeding process:', error);
});
