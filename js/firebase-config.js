const firebaseConfig = {
    apiKey: "AIzaSyAUSMY4re_g9Ca9uzpQa5SOu15aeJ_eR1E",
    authDomain: "algolearn-9da34.firebaseapp.com",
    databaseURL: "https://algolearn-9da34-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "algolearn-9da34",
    storageBucket: "algolearn-9da34.firebasestorage.app",
    messagingSenderId: "966537776486",
    appId: "1:966537776486:web:5b4425b9df8f9d2bd64ca7",
    measurementId: "G-GK71X9SRC9"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const analytics = firebase.analytics();
const realtimeDB = firebase.database();

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('Browser doesn\'t support persistence.');
        }
    });

// Collection names
const COLLECTIONS = {
    USERS: 'users',
    COURSES: 'courses',
    LESSONS: 'lessons',
    QUIZZES: 'quizzes',
    PROGRESS: 'progress',
    ENROLLMENTS: 'enrollments',
    BOOKMARKS: 'bookmarks',
    CATEGORIES: 'categories',
    QUIZ_RESULTS: 'quizResults'
};

// Export for use in other files
window.firebaseApp = firebase;
window.auth = auth;
window.db = db;
window.storage = storage;
window.analytics = analytics;
window.realtimeDB = realtimeDB;
window.COLLECTIONS = COLLECTIONS;

// Log successful initialization
console.log('[FIREBASE] Initialized successfully with project:', firebaseConfig.projectId);
console.log('[FIREBASE] Realtime Database URL:', firebaseConfig.databaseURL);
