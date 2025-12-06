// script.js - COMPLETE FIXED VERSION

// Cloudinary Config
const cloudinaryConfig = {
    cloudName: 'ck8725201',
    uploadPreset: 'ml_default',
    sources: ['local'],
    multiple: true,
    maxFiles: 5,
    maxFileSize: 10485760, // 10MB
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'mp4'],
    showAdvancedOptions: false,
    showPoweredBy: false,
    singleUploadAutoClose: false
};

// Global variables
let currentUser = null;
let cloudinaryWidget = null;
let useLocalStorage = false; // Set to true if Firestore still has issues

// Initialize Cloudinary
function initializeCloudinary() {
    if (!window.cloudinary) {
        console.error('Cloudinary SDK not loaded');
        return;
    }
    
    cloudinaryWidget = window.cloudinary.createUploadWidget(
        cloudinaryConfig,
        (error, result) => {
            if (error) {
                showError('Upload error: ' + error.message);
                return;
            }
            
            if (result.event === 'success') {
                handleUploadSuccess(result.info);
            }
        }
    );
}

// Handle Upload
async function handleUploadSuccess(fileInfo) {
    console.log('Uploaded file:', fileInfo);
    
    if (!currentUser) {
        showError('Please login first');
        return;
    }
    
    // If Firestore has permission issues, use localStorage
    if (useLocalStorage) {
        saveToLocalStorage(fileInfo);
        return;
    }
    
    try {
        // Try Firestore first
        await saveToFirestore(fileInfo);
    } catch (error) {
        console.error('Firestore error:', error);
        
        if (error.code === 'permission-denied') {
            showError('Database permission issue. Saving locally for now.');
            useLocalStorage = true;
            saveToLocalStorage(fileInfo);
        } else {
            showError('Upload failed: ' + error.message);
        }
    }
}

// Save to Firestore
async function saveToFirestore(fileInfo) {
    showLoading('Saving to database...');
    
    const fileData = {
        public_id: fileInfo.public_id,
        url: fileInfo.secure_url,
        format: fileInfo.format,
        bytes: fileInfo.bytes,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        userId: currentUser.uid,
        fileName: fileInfo.original_filename || fileInfo.public_id,
        userName: currentUser.displayName || currentUser.email
    };
    
    // Save to Firestore
    const docRef = await db.collection('files').add(fileData);
    console.log('Saved with ID:', docRef.id);
    
    // Try to update user stats
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        await userRef.set({
            name: currentUser.displayName || currentUser.email,
            email: currentUser.email,
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            storageUsed: firebase.firestore.FieldValue.increment(fileInfo.bytes),
            fileCount: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
    } catch (userError) {
        console.log('User update failed, continuing...', userError);
    }
    
    showSuccess('✅ File uploaded successfully!');
    
    // Refresh data
    setTimeout(() => {
        loadUserFiles();
        updateStorageUsage();
    }, 1000);
}

// Save to LocalStorage (backup)
function saveToLocalStorage(fileInfo) {
    const fileData = {
        id: 'local_' + Date.now(),
        url: fileInfo.secure_url,
        fileName: fileInfo.original_filename || fileInfo.public_id,
        bytes: fileInfo.bytes,
        format: fileInfo.format,
        created_at: new Date().toISOString()
    };
    
    const key = `clouddrive_${currentUser.uid}_files`;
    let files = JSON.parse(localStorage.getItem(key) || '[]');
    files.push(fileData);
    localStorage.setItem(key, JSON.stringify(files));
    
    showSuccess('✅ File saved locally!');
    loadLocalFiles();
}

// Load files from LocalStorage
function loadLocalFiles() {
    if (!currentUser) return;
    
    const key = `clouddrive_${currentUser.uid}_files`;
    const files = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Display in Recent Files
    displayFiles(files.slice(0, 8), recentFilesList);
    
    // Update storage display
    const totalBytes = files.reduce((sum, file) => sum + (file.bytes || 0), 0);
    updateStorageDisplay(totalBytes);
}

// Update storage display
function updateStorageDisplay(bytes) {
    const totalStorage = 25 * 1024 * 1024 * 1024; // 25GB
    const percent = Math.min((bytes / totalStorage) * 100, 100);
    
    if (storageProgress) {
        storageProgress.style.width = `${percent}%`;
        storagePercent.textContent = `${percent.toFixed(1)}%`;
        storageText.textContent = `${formatFileSize(bytes)} of 25 GB used`;
    }
}

// Auth State Changed
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        showDashboard();
        updateUserInfo();
        
        // Try to load from Firestore first
        try {
            await loadUserFiles();
        } catch (error) {
            console.log('Firestore load failed, using localStorage:', error);
            loadLocalFiles();
            useLocalStorage = true;
        }
        
        updateStorageUsage();
    } else {
        showLogin();
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeCloudinary();
    showLogin();
    
    // Test Firestore connection
    testFirestoreConnection();
});

// Test Firestore Connection
async function testFirestoreConnection() {
    try {
        const testRef = db.collection('test').doc('connection_test');
        await testRef.set({ test: true, timestamp: new Date() });
        console.log('Firestore connection OK');
        useLocalStorage = false;
    } catch (error) {
        console.error('Firestore connection failed:', error);
        useLocalStorage = true;
    }
}
