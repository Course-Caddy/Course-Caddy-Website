/**
 * Course Caddy Tournament - Firebase Configuration
 */

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDyDTvRklWi0nrLD7HJ6JB-10PUwdqQi8w",
    authDomain: "course-caddy-tournament.firebaseapp.com",
    projectId: "course-caddy-tournament",
    storageBucket: "course-caddy-tournament.firebasestorage.app",
    messagingSenderId: "194827108351",
    appId: "1:194827108351:web:b092254eed2b74ea3df1ca"
};

// Set to false to use Firebase, true for local testing with mock data
const USE_MOCK_DATA = false;

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
let auth = null;

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
        console.error('<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js"></script>');
        return;
    }

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    db = firebase.firestore();
    storage = firebase.storage();

    // Only initialize auth if the auth SDK is loaded
    if (typeof firebase.auth === 'function') {
        auth = firebase.auth();
        console.log('Firebase initialized with Auth');
    } else {
        console.log('Firebase initialized (Auth SDK not loaded)');
    }
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
    
    try {
        // Try with orderBy first (requires composite index)
        const snapshot = await db.collection('registrations')
            .where('tournamentId', '==', tournamentId)
            .orderBy('submittedAt', 'desc')
            .get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore timestamp to ISO string if present
            submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || doc.data().submittedAt
        }));
    } catch (error) {
        // If index doesn't exist, fall back to simple query without orderBy
        console.warn('Composite index not available, falling back to simple query:', error.message);
        
        const snapshot = await db.collection('registrations')
            .where('tournamentId', '==', tournamentId)
            .get();
        
        const registrations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || doc.data().submittedAt
        }));
        
        // Sort in JavaScript instead
        registrations.sort((a, b) => {
            const dateA = a.submittedAt ? new Date(a.submittedAt) : new Date(0);
            const dateB = b.submittedAt ? new Date(b.submittedAt) : new Date(0);
            return dateB - dateA; // desc
        });
        
        return registrations;
    }
}

// Auth Functions

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} User credential
 */
async function signIn(email, password) {
    if (USE_MOCK_DATA) {
        // Mock auth for testing
        if (email === 'admin@coursecaddy.com' && password === 'admin123') {
            return { user: { email: email } };
        }
        throw new Error('Invalid email or password');
    }

    if (!auth) {
        throw new Error('Authentication not available');
    }

    return await auth.signInWithEmailAndPassword(email, password);
}

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
async function signOut() {
    if (USE_MOCK_DATA) {
        return;
    }

    if (!auth) {
        throw new Error('Authentication not available');
    }

    return await auth.signOut();
}

/**
 * Listen for auth state changes
 * @param {Function} callback - Called with user object or null
 */
function onAuthStateChanged(callback) {
    if (USE_MOCK_DATA) {
        // In mock mode, always call with null (not authenticated)
        setTimeout(() => callback(null), 100);
        return () => {};
    }

    if (!auth) {
        // Auth not available, call with null
        setTimeout(() => callback(null), 100);
        return () => {};
    }

    return auth.onAuthStateChanged(callback);
}

/**
 * Get current user
 * @returns {Object|null} Current user or null
 */
function getCurrentUser() {
    if (USE_MOCK_DATA) {
        return null;
    }

    if (!auth) {
        return null;
    }

    return auth.currentUser;
}

// Initialize Firebase immediately (scripts are loaded at end of body)
initializeFirebase();
