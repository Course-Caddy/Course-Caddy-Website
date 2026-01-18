/**
 * Course Caddy Tournament - Firebase Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or use existing Course Caddy project)
 * 3. Enable Firestore Database (Start in test mode for now)
 * 4. Enable Cloud Storage
 * 5. Go to Project Settings > General > Your apps > Add web app
 * 6. Copy your config values below
 * 7. Enable Cloud Functions (requires Blaze plan for PDF generation)
 */

// Firebase SDK imports (using CDN for simplicity)
// These are loaded via script tags, so we check if Firebase is available
const firebaseConfig = {
    // TODO: Replace with your Firebase config
  apiKey: "AIzaSyDyDTvRklWi0nrLD7HJ6JB-10PUwdqQi8w",
  authDomain: "course-caddy-tournament.firebaseapp.com",
  projectId: "course-caddy-tournament",
  storageBucket: "course-caddy-tournament.firebasestorage.app",
  messagingSenderId: "194827108351",
  appId: "1:194827108351:web:b092254eed2b74ea3df1ca"
};

// For development/testing without Firebase, we can use mock data
const USE_MOCK_DATA = false; // Set to false when Firebase is configured

// Mock tournaments data for testing
const MOCK_TOURNAMENTS = [
    {
        id: 'member-guest-2025',
        name: 'Member-Guest Championship',
        course: 'Hope Valley Country Club',
        date: '2025-06-14',
        registrationCutoff: '2025-06-12T18:00:00',
        elevation: 400,
        morningTemp: 68,
        morningHumidity: 75,
        afternoonTemp: 82,
        afternoonHumidity: 55,
        eveningTemp: 74,
        eveningHumidity: 65
    },
    {
        id: 'club-championship-2025',
        name: 'Club Championship Qualifier',
        course: 'Pine Hollow Golf Club',
        date: '2025-07-08',
        registrationCutoff: '2025-07-06T18:00:00',
        elevation: 650,
        morningTemp: 72,
        morningHumidity: 70,
        afternoonTemp: 88,
        afternoonHumidity: 50,
        eveningTemp: 78,
        eveningHumidity: 60
    },
    {
        id: 'charity-scramble-2025',
        name: 'Annual Charity Scramble',
        course: 'Willow Creek Golf Course',
        date: '2025-08-02',
        registrationCutoff: '2025-07-31T18:00:00',
        elevation: 200,
        morningTemp: 75,
        morningHumidity: 80,
        afternoonTemp: 92,
        afternoonHumidity: 45,
        eveningTemp: 82,
        eveningHumidity: 55
    }
];

// Initialize Firebase (when not using mock data)
let db = null;
let storage = null;

function initializeFirebase() {
    if (USE_MOCK_DATA) {
        console.log('Using mock data - Firebase not initialized');
        return;
    }
    
    // Check if Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded. Add the following to your HTML:');
        console.error('<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>');
        console.error('<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js"></script>');
        return;
    }
    
    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    db = firebase.firestore();
    storage = firebase.storage();
    
    console.log('Firebase initialized successfully');
}

// API Functions

/**
 * Get all tournaments
 * @returns {Promise<Array>} Array of tournament objects
 */
async function getTournaments() {
    if (USE_MOCK_DATA) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return MOCK_TOURNAMENTS;
    }
    
    const snapshot = await db.collection('tournaments').orderBy('date', 'asc').get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

/**
 * Get a single tournament by ID
 * @param {string} tournamentId 
 * @returns {Promise<Object|null>} Tournament object or null
 */
async function getTournament(tournamentId) {
    if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return MOCK_TOURNAMENTS.find(t => t.id === tournamentId) || null;
    }
    
    const doc = await db.collection('tournaments').doc(tournamentId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

/**
 * Submit a registration
 * @param {Object} registration Registration data
 * @returns {Promise<Object>} Result with success status
 */
async function submitRegistration(registration) {
    if (USE_MOCK_DATA) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Mock registration submitted:', registration);
        
        // Store in localStorage for demo purposes
        const registrations = JSON.parse(localStorage.getItem('mockRegistrations') || '[]');
        registrations.push({
            ...registration,
            id: 'reg-' + Date.now(),
            submittedAt: new Date().toISOString(),
            pdfGenerated: false
        });
        localStorage.setItem('mockRegistrations', JSON.stringify(registrations));
        
        return { success: true, id: 'mock-' + Date.now() };
    }
    
    // Add timestamp
    registration.submittedAt = firebase.firestore.FieldValue.serverTimestamp();
    registration.pdfGenerated = false;
    
    const docRef = await db.collection('registrations').add(registration);
    return { success: true, id: docRef.id };
}

/**
 * Get registrations for a tournament (admin use)
 * @param {string} tournamentId 
 * @returns {Promise<Array>} Array of registration objects
 */
async function getRegistrations(tournamentId) {
    if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const registrations = JSON.parse(localStorage.getItem('mockRegistrations') || '[]');
        return registrations.filter(r => r.tournamentId === tournamentId);
    }
    
    const snapshot = await db.collection('registrations')
        .where('tournamentId', '==', tournamentId)
        .orderBy('submittedAt', 'desc')
        .get();
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeFirebase);
