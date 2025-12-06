// firebase-config.js - YOUR CONFIGURATION

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAcCfEouTVJSyEnJNxSheK6xUrP4TEC0Mg",
    authDomain: "projectx-37b9a.firebaseapp.com",
    projectId: "projectx-37b9a",
    storageBucket: "projectx-37b9a.firebasestorage.app",
    messagingSenderId: "140512151028",
    appId: "1:140512151028:web:995969b84f87222fbbe5a1",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Google Provider Configuration
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Add scopes
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Custom parameters
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// Export for global access
window.firebaseAuth = auth;
window.firebaseDb = db;
window.googleProvider = googleProvider;

console.log("Firebase initialized successfully!");
