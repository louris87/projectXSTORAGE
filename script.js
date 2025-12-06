// script.js - COMPLETE VERSION WITH CLOUDINARY INTEGRATION

// Cloudinary Configuration
const cloudinaryConfig = {
    cloudName: 'ck8725201',
    apiKey: '172685636954627',
    uploadPreset: 'ml_default', // Create this in Cloudinary Dashboard
    sources: ['local', 'url', 'camera'],
    multiple: true,
    maxFiles: 20,
    maxFileSize: 52428800, // 50MB
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'mp4', 'mov', 'avi', 'mkv', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'],
    showAdvancedOptions: true,
    singleUploadAutoClose: false,
    styles: {
        palette: {
            window: "#FFFFFF",
            windowBorder: "#90A0B3",
            tabIcon: "#4361ee",
            menuIcons: "#5A616A",
            textDark: "#000000",
            textLight: "#FFFFFF",
            link: "#4361ee",
            action: "#FF620C",
            inactiveTabIcon: "#0E2F5A",
            error: "#F44235",
            inProgress: "#4361ee",
            complete: "#20B832",
            sourceBg: "#F4F4F5"
        }
    }
};

// Global variables
let currentUser = null;
let userFiles = [];
let currentFileView = 'grid';
let cloudinaryWidget = null;
let currentPreviewFile = null;
let notifications = [];

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const loginScreen = document.getElementById('loginScreen');
const signupScreen = document.getElementById('signupScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const uploadBtn = document.querySelector('.btn-upload');
const searchInput = document.getElementById('searchInput');
const storageProgress = document.getElementById('storageProgress');
const storagePercent = document.getElementById('storagePercent');
const storageText = document.getElementById('storageText');
const recentFilesList = document.getElementById('recentFilesList');
const allFilesList = document.getElementById('allFilesList');
const photosGrid = document.getElementById('photosGrid');
const videosGrid = document.getElementById('videosGrid');
const documentsGrid = document.getElementById('documentsGrid');
const recentFilesFull = document.getElementById('recentFilesFull');
const trashList = document.getElementById('trashList');
const uploadModal = document.getElementById('uploadModal');
const previewModal = document.getElementById('previewModal');
const uploadProgressContainer = document.getElementById('uploadProgressContainer');
const previewContent = document.getElementById('previewContent');
const previewFileName = document.getElementById('previewFileName');
const previewFileSize = document.getElementById('previewFileSize');
const previewFileType = document.getElementById('previewFileType');
const previewUploadDate = document.getElementById('previewUploadDate');
const userNameElements = document.querySelectorAll('#userName, #greetingName');
const userEmailElements = document.querySelectorAll('#userEmail, #userEmailInput');
const userAvatar = document.getElementById('userAvatar');
const accountCreated = document.getElementById('accountCreated');
const notificationsPanel = document.getElementById('notificationsPanel');
const notificationsList = document.getElementById('notificationsList');
const notificationCount = document.getElementById('notificationCount');

// Initialize Cloudinary Widget
function initializeCloudinaryWidget() {
    if (!window.cloudinary) {
        console.error('Cloudinary SDK not loaded');
        showError('Cloudinary service not available. Please refresh the page.');
        return;
    }
    
    try {
        cloudinaryWidget = window.cloudinary.createUploadWidget(
            cloudinaryConfig,
            (error, result) => {
                console.log('Cloudinary result:', result?.event, error);
                
                if (error) {
                    showError('Upload failed: ' + error.message);
                    return;
                }
                
                if (result && result.event === "success") {
                    handleUploadSuccess(result.info);
                    showSuccess('File uploaded successfully!');
                }
                
                if (result && result.event === "close") {
                    console.log('Upload widget closed');
                }
            }
        );
        
        console.log('Cloudinary widget initialized');
    } catch (error) {
        console.error('Failed to initialize Cloudinary:', error);
        showError('Failed to initialize upload service');
    }
}

// Open Cloudinary Upload Widget
function openUploadWidget() {
    if (!currentUser) {
        showError('Please login first to upload files');
        showLogin();
        return;
    }
    
    if (!cloudinaryWidget) {
        initializeCloudinaryWidget();
    }
    
    if (cloudinaryWidget) {
        cloudinaryWidget.open();
    } else {
        showError('Upload service not available');
    }
}

// Handle Cloudinary Upload Success
async function handleUploadSuccess(fileInfo) {
    console.log('File uploaded to Cloudinary:', fileInfo);
    
    const fileData = {
        public_id: fileInfo.public_id,
        url: fileInfo.secure_url,
        format: fileInfo.format,
        resource_type: fileInfo.resource_type,
        bytes: fileInfo.bytes,
        width: fileInfo.width || null,
        height: fileInfo.height || null,
        duration: fileInfo.duration || null,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        fileName: fileInfo.original_filename || fileInfo.public_id,
        displayName: currentUser.displayName || 'User',
        tags: fileInfo.tags || [],
        folder: fileInfo.folder || '',
        isDeleted: false
    };
    
    try {
        // Save to Firestore
        await db.collection('files').add(fileData);
        
        // Add notification
        addNotification('File Uploaded', `"${fileData.fileName}" uploaded successfully`, 'success');
        
        // Refresh data
        loadUserFiles();
        updateStorageUsage();
        
    } catch (error) {
        console.error('Error saving file:', error);
        showError('Failed to save file: ' + error.message);
    }
}

// Initialize App
function initializeApp() {
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            showDashboard();
            updateUserInfo();
            loadUserFiles();
            updateStorageUsage();
            loadNotifications();
        } else {
            showLogin();
        }
        
        // Hide loading screen
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    });
    
    // Initialize Cloudinary
    initializeCloudinaryWidget();
    
    // Set up event listeners
    setupEventListeners();
}

// Load user data from Firestore
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) {
            // Create user document if doesn't exist
            await db.collection('users').doc(currentUser.uid).set({
                name: currentUser.displayName || 'User',
                email: currentUser.email,
                photoURL: currentUser.photoURL || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                storageUsed: 0,
                fileCount: 0,
                settings: {
                    emailNotifications: true,
                    uploadNotifications: true,
                    storageAlerts: true,
                    theme: 'light'
                }
            });
        } else {
            // Load user settings
            const userData = userDoc.data();
            if (userData.createdAt) {
                accountCreated.textContent = userData.createdAt.toDate().toLocaleDateString();
            }
            
            // Apply theme
            if (userData.settings?.theme) {
                document.documentElement.setAttribute('data-theme', userData.settings.theme);
                updateThemeButtons(userData.settings.theme);
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await loginWithEmail(email, password);
    });
    
    // Signup form
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirm').value;
        
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }
        
        await signupWithEmail(name, email, password);
    });
    
    // Search functionality
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
            updateThemeButtons(theme);
            saveUserSettings({ theme: theme });
        });
    });
    
    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModals();
        }
    });
    
    // Close notifications when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-notification') && !e.target.closest('.notifications-panel')) {
            notificationsPanel.classList.remove('show');
        }
    });
}

// Authentication functions
async function loginWithEmail(email, password) {
    try {
        showLoading('Signing in...');
        await auth.signInWithEmailAndPassword(email, password);
        showSuccess('Signed in successfully!');
    } catch (error) {
        showError(getAuthErrorMessage(error));
    } finally {
        hideLoading();
    }
}

async function signupWithEmail(name, email, password) {
    try {
        showLoading('Creating account...');
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update profile
        await userCredential.user.updateProfile({
            displayName: name
        });
        
        // Create user document
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            photoURL: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            storageUsed: 0,
            fileCount: 0,
            settings: {
                emailNotifications: true,
                uploadNotifications: true,
                storageAlerts: true,
                theme: 'light'
            }
        });
        
        showSuccess('Account created successfully!');
    } catch (error) {
        showError(getAuthErrorMessage(error));
    } finally {
        hideLoading();
    }
}

async function signInWithGoogle() {
    try {
        showLoading('Signing in with Google...');
        const result = await auth.signInWithPopup(googleProvider);
        
        // Check if new user
        if (result.additionalUserInfo.isNewUser) {
            await db.collection('users').doc(result.user.uid).set({
                name: result.user.displayName,
                email: result.user.email,
                photoURL: result.user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                storageUsed: 0,
                fileCount: 0,
                settings: {
                    emailNotifications: true,
                    uploadNotifications: true,
                    storageAlerts: true,
                    theme: 'light'
                }
            });
        }
        
        showSuccess('Signed in successfully!');
    } catch (error) {
        console.error('Google sign-in error:', error);
        showError(getAuthErrorMessage(error));
    } finally {
        hideLoading();
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut();
        showSuccess('Logged out successfully!');
    }
}

// File management functions
async function loadUserFiles() {
    if (!currentUser) return;
    
    try {
        const filesSnapshot = await db.collection('files')
            .where('userId', '==', currentUser.uid)
            .where('isDeleted', '==', false)
            .orderBy('created_at', 'desc')
            .get();
        
        userFiles = filesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        displayRecentFiles();
        displayAllFiles();
        displayPhotos();
        displayVideos();
        displayDocuments();
        displayRecentFilesFull();
        updateFileCount();
        updateStorageBreakdown();
        
    } catch (error) {
        console.error('Error loading files:', error);
        showError('Failed to load files');
    }
}

function displayRecentFiles() {
    const recentFiles = userFiles.slice(0, 8);
    displayFiles(recentFiles, recentFilesList, true);
}

function displayAllFiles() {
    displayFiles(userFiles, allFilesList, false);
}

function displayPhotos() {
    const photos = userFiles.filter(file => 
        file.resource_type === 'image' || 
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.format)
    );
    
    photosGrid.innerHTML = '';
    
    if (photos.length === 0) {
        photosGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images"></i>
                <p>No photos uploaded yet</p>
                <button class="btn-primary" onclick="openUploadWidget()">Upload Photos</button>
            </div>
        `;
        return;
    }
    
    photos.forEach(file => {
        const photoCard = document.createElement('div');
        photoCard.className = 'photo-card';
        photoCard.onclick = () => previewFile(file);
        photoCard.innerHTML = `
            <img src="${file.url}" alt="${file.fileName}" loading="lazy">
            <div class="photo-overlay">
                <p>${file.fileName}</p>
            </div>
        `;
        photosGrid.appendChild(photoCard);
    });
}

function displayVideos() {
    const videos = userFiles.filter(file => 
        file.resource_type === 'video' || 
        ['mp4', 'mov', 'avi', 'mkv'].includes(file.format)
    );
    
    videosGrid.innerHTML = '';
    
    if (videos.length === 0) {
        videosGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video"></i>
                <p>No videos uploaded yet</p>
                <button class="btn-primary" onclick="openUploadWidget()">Upload Videos</button>
            </div>
        `;
        return;
    }
    
    videos.forEach(file => {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        videoCard.innerHTML = `
            <div class="video-thumbnail" onclick="previewFile(${JSON.stringify(file).replace(/"/g, '&quot;')})">
                <i class="fas fa-play"></i>
            </div>
            <div class="video-info">
                <h4>${file.fileName}</h4>
                <p>${formatFileSize(file.bytes)} • ${file.duration ? formatDuration(file.duration) : 'Video'}</p>
            </div>
        `;
        videosGrid.appendChild(videoCard);
    });
}

function displayDocuments() {
    const documents = userFiles.filter(file => 
        ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(file.format)
    );
    
    documentsGrid.innerHTML = '';
    
    if (documents.length === 0) {
        documentsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <p>No documents uploaded yet</p>
                <button class="btn-primary" onclick="openUploadWidget()">Upload Documents</button>
            </div>
        `;
        return;
    }
    
    displayFiles(documents, documentsGrid, true);
}

function displayRecentFilesFull() {
    displayFiles(userFiles.slice(0, 12), recentFilesFull, true);
}

function displayFiles(files, container, showActions = true) {
    container.innerHTML = '';
    
    if (files.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>No files uploaded yet</p>
                <button class="btn-primary" onclick="openUploadWidget()">Upload Your First File</button>
            </div>
        `;
        return;
    }
    
    files.forEach(file => {
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card';
        fileCard.onclick = () => previewFile(file);
        
        const fileType = getFileType(file);
        const iconClass = getFileIconClass(file);
        const iconColor = getFileIconColor(file);
        
        fileCard.innerHTML = `
            <div class="file-icon ${fileType}" style="color: ${iconColor}">
                <i class="${iconClass}"></i>
            </div>
            <h4 title="${file.fileName}">${file.fileName}</h4>
            <p>${formatFileSize(file.bytes)} • ${formatDate(file.created_at?.toDate())}</p>
            ${showActions ? `
                <div class="file-actions">
                    <button class="file-action-btn" onclick="event.stopPropagation(); downloadFile('${file.id}')">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="file-action-btn" onclick="event.stopPropagation(); shareFile('${file.id}')">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button class="file-action-btn" onclick="event.stopPropagation(); deleteFile('${file.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : ''}
        `;
        container.appendChild(fileCard);
    });
}

// File utilities
function getFileType(file) {
    if (file.resource_type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.format)) {
        return 'image';
    } else if (file.resource_type === 'video' || ['mp4', 'mov', 'avi', 'mkv'].includes(file.format)) {
        return 'video';
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(file.format)) {
        return 'document';
    } else if (file.format === 'txt') {
        return 'text';
    } else if (['zip', 'rar'].includes(file.format)) {
        return 'archive';
    } else {
        return 'other';
    }
}

function getFileIconClass(file) {
    const type = getFileType(file);
    switch(type) {
        case 'image': return 'fas fa-image';
        case 'video': return 'fas fa-video';
        case 'document': return 'fas fa-file-alt';
        case 'text': return 'fas fa-file-alt';
        case 'archive': return 'fas fa-file-archive';
        default: return 'fas fa-file';
    }
}

function getFileIconColor(file) {
    const type = getFileType(file);
    switch(type) {
        case 'image': return '#4361ee';
        case 'video': return '#f72585';
        case 'document': return '#f8961e';
        case 'text': return '#4cc9f0';
        case 'archive': return '#7209b7';
        default: return '#6c757d';
    }
}

// Storage management
async function updateStorageUsage() {
    if (!currentUser) return;
    
    try {
        const filesSnapshot = await db.collection('files')
            .where('userId', '==', currentUser.uid)
            .where('isDeleted', '==', false)
            .get();
        
        let totalStorageUsed = 0;
        filesSnapshot.docs.forEach(doc => {
            totalStorageUsed += doc.data().bytes || 0;
        });
        
        const totalStorage = 25 * 1024 * 1024 * 1024; // 25GB in bytes
        const percent = Math.min((totalStorageUsed / totalStorage) * 100, 100);
        
        storageProgress.style.width = `${percent}%`;
        storagePercent.textContent = `${percent.toFixed(1)}%`;
        storageText.textContent = `${formatFileSize(totalStorageUsed)} of 25 GB used`;
        
        // Update user document
        await db.collection('users').doc(currentUser.uid).update({
            storageUsed: totalStorageUsed,
            fileCount: filesSnapshot.size
        });
        
    } catch (error) {
        console.error('Error updating storage:', error);
    }
}

function updateStorageBreakdown() {
    let photosSize = 0, videosSize = 0, docsSize = 0, otherSize = 0;
    
    userFiles.forEach(file => {
        const type = getFileType(file);
        switch(type) {
            case 'image': photosSize += file.bytes || 0; break;
            case 'video': videosSize += file.bytes || 0; break;
            case 'document': docsSize += file.bytes || 0; break;
            case 'text': docsSize += file.bytes || 0; break;
            default: otherSize += file.bytes || 0; break;
        }
    });
    
    const totalSize = photosSize + videosSize + docsSize + otherSize;
    
    document.getElementById('photosSize').textContent = formatFileSize(photosSize);
    document.getElementById('videosSize').textContent = formatFileSize(videosSize);
    document.getElementById('docsSize').textContent = formatFileSize(docsSize);
    document.getElementById('otherSize').textContent = formatFileSize(otherSize);
    
    document.getElementById('photosStorage').style.width = totalSize > 0 ? `${(photosSize / totalSize) * 100}%` : '0%';
    document.getElementById('videosStorage').style.width = totalSize > 0 ? `${(videosSize / totalSize) * 100}%` : '0%';
    document.getElementById('docsStorage').style.width = totalSize > 0 ? `${(docsSize / totalSize) * 100}%` : '0%';
    document.getElementById('otherStorage').style.width = totalSize > 0 ? `${(otherSize / totalSize) * 100}%` : '0%';
}

// File operations
async function previewFile(file) {
    currentPreviewFile = file;
    
    previewFileName.textContent = file.fileName;
    previewFileSize.textContent = formatFileSize(file.bytes);
    previewFileType.textContent = file.format.toUpperCase();
    previewUploadDate.textContent = file.created_at ? formatDate(file.created_at.toDate()) : 'Unknown';
    
    if (getFileType(file) === 'image') {
        previewContent.innerHTML = `<img src="${file.url}" alt="${file.fileName}">`;
    } else if (getFileType(file) === 'video') {
        previewContent.innerHTML = `
            <video controls style="max-width: 100%; max-height: 400px;">
                <source src="${file.url}" type="video/${file.format}">
                Your browser does not support the video tag.
            </video>
        `;
    } else {
        previewContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="${getFileIconClass(file)}" style="font-size: 4rem; color: ${getFileIconColor(file)}; margin-bottom: 20px;"></i>
                <p>Preview not available for ${file.format.toUpperCase()} files</p>
                <p>Click Download to access this file</p>
            </div>
        `;
    }
    
    previewModal.classList.add('active');
}

async function downloadFile(fileId) {
    const file = userFiles.find(f => f.id === fileId);
    if (!file) {
        showError('File not found');
        return;
    }
    
    try {
        showLoading('Preparing download...');
        const response = await fetch(file.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        addNotification('Download Started', `"${file.fileName}" download started`, 'info');
    } catch (error) {
        console.error('Download error:', error);
        showError('Failed to download file');
    } finally {
        hideLoading();
    }
}

async function shareFile(fileId) {
    const file = userFiles.find(f => f.id === fileId);
    if (!file) {
        showError('File not found');
        return;
    }
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: file.fileName,
                text: 'Check out this file from CloudDrive',
                url: file.url
            });
            showSuccess('File shared successfully!');
        } catch (error) {
            if (error.name !== 'AbortError') {
                // Fallback to clipboard
                copyToClipboard(file.url);
            }
        }
    } else {
        copyToClipboard(file.url);
    }
}

async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to move this file to trash?')) return;
    
    try {
        await db.collection('files').doc(fileId).update({
            isDeleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const file = userFiles.find(f => f.id === fileId);
        addNotification('File Moved to Trash', `"${file.fileName}" moved to trash`, 'warning');
        
        showSuccess('File moved to trash');
        loadUserFiles();
        updateStorageUsage();
        
    } catch (error) {
        console.error('Delete error:', error);
        showError('Failed to delete file');
    }
}

// UI functions
function showLogin() {
    hideAllScreens();
    loginScreen.classList.add('active');
}

function showSignup() {
    hideAllScreens();
    signupScreen.classList.add('active');
}

function showDashboard() {
    hideAllScreens();
    dashboard.classList.add('active');
    showSection('dashboardHome');
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    
    const menuItem = document.querySelector(`[onclick*="${sectionId}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }
    
    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        document.querySelector('.sidebar').classList.remove('active');
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function changeView(view) {
    currentFileView = view;
    const allFilesList = document.getElementById('allFilesList');
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', 
            (view === 'grid' && btn.querySelector('.fa-th')) ||
            (view === 'list' && btn.querySelector('.fa-list'))
        );
    });
    
    allFilesList.classList.toggle('list-view', view === 'list');
}

function toggleNotifications() {
    notificationsPanel.classList.toggle('show');
}

function clearSearch() {
    searchInput.value = '';
    handleSearch();
}

function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm === '') {
        displayAllFiles();
        return;
    }
    
    const filteredFiles = userFiles.filter(file => 
        file.fileName.toLowerCase().includes(searchTerm) ||
        (file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
        file.format.toLowerCase().includes(searchTerm)
    );
    
    displayFiles(filteredFiles, allFilesList, false);
}

// Formatting utilities
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date) {
    if (!date) return 'Unknown';
    const now = new Date();
    const diff = now - date;
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// User info and settings
function updateUserInfo() {
    if (!currentUser) return;
    
    userNameElements.forEach(element => {
        element.textContent = currentUser.displayName || currentUser.email.split('@')[0];
    });
    
    userEmailElements.forEach(element => {
        element.textContent = currentUser.email;
        if (element.tagName === 'INPUT') {
            element.value = currentUser.email;
        }
    });
    
    // Update avatar
    if (currentUser.photoURL) {
        userAvatar.innerHTML = `<img src="${currentUser.photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%;">`;
    } else {
        userAvatar.innerHTML = `<i class="fas fa-user"></i>`;
    }
}

async function updateProfile() {
    const displayName = document.getElementById('displayName').value;
    
    try {
        await currentUser.updateProfile({
            displayName: displayName
        });
        
        await db.collection('users').doc(currentUser.uid).update({
            name: displayName
        });
        
        updateUserInfo();
        showSuccess('Profile updated successfully!');
    } catch (error) {
        showError('Failed to update profile: ' + error.message);
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function updateThemeButtons(theme) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

async function saveUserSettings(settings) {
    if (!currentUser) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            [`settings.${Object.keys(settings)[0]}`]: Object.values(settings)[0]
        });
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Notifications
function addNotification(title, message, type = 'info') {
    const notification = {
        id: Date.now().toString(),
        title,
        message,
        type,
        timestamp: new Date(),
        read: false
    };
    
    notifications.unshift(notification);
    updateNotificationsUI();
    
    // Save to localStorage for persistence
    localStorage.setItem('notifications', JSON.stringify(notifications.slice(0, 50)));
}

function loadNotifications() {
    const saved = localStorage.getItem('notifications');
    if (saved) {
        notifications = JSON.parse(saved).map(n => ({
            ...n,
            timestamp: new Date(n.timestamp)
        }));
        updateNotificationsUI();
    }
}

function updateNotificationsUI() {
    const unreadCount = notifications.filter(n => !n.read).length;
    notificationCount.textContent = unreadCount > 9 ? '9+' : unreadCount;
    
    notificationsList.innerHTML = '';
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="notification-item">
                <div class="notification-icon">
                    <i class="fas fa-bell-slash"></i>
                </div>
                <div class="notification-content">
                    <p>No notifications yet</p>
                </div>
            </div>
        `;
        return;
    }
    
    notifications.slice(0, 10).forEach(notification => {
        const item = document.createElement('div');
        item.className = `notification-item ${notification.read ? '' : 'unread'}`;
        item.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <div class="notification-time">${formatDate(notification.timestamp)}</div>
            </div>
        `;
        item.onclick = () => markAsRead(notification.id);
        notificationsList.appendChild(item);
    });
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function markAsRead(id) {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
        updateNotificationsUI();
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }
}

function clearNotifications() {
    notifications = [];
    updateNotificationsUI();
    localStorage.removeItem('notifications');
}

// Toast notifications
function showToast(message, type = 'info', title = 'Notification') {
    const toastContainer = document.getElementById('toastContainer');
    const toastId = 'toast-' + Date.now();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.id = toastId;
    toast.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="toast-close" onclick="removeToast('${toastId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        removeToast(toastId);
    }, 5000);
}

function removeToast(id) {
    const toast = document.getElementById(id);
    if (toast) {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }
}

// Loading states
function showLoading(message = 'Loading...') {
    loadingScreen.style.display = 'flex';
    loadingScreen.querySelector('p').textContent = message;
}

function hideLoading() {
    loadingScreen.style.display = 'none';
}

// Success and error messages
function showSuccess(message) {
    showToast(message, 'success', 'Success');
}

function showError(message) {
    showToast(message, 'error', 'Error');
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showSuccess('Link copied to clipboard!');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showSuccess('Link copied to clipboard!');
    });
}

function getAuthErrorMessage(error) {
    const messages = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'Email is already in use',
        'auth/weak-password': 'Password must be at least 6 characters',
        'auth/operation-not-allowed': 'This operation is not allowed',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
        'auth/popup-blocked': 'Please allow popups for Google Sign-In',
        'auth/popup-closed-by-user': 'Sign-in was cancelled',
        'auth/unauthorized-domain': 'This domain is not authorized for Google Sign-In'
    };
    
    return messages[error.code] || error.message || 'An error occurred';
}

// Modal functions
function closeModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
}

function closeUploadModal() {
    uploadModal.classList.remove('active');
}

function closePreviewModal() {
    previewModal.classList.remove('active');
    currentPreviewFile = null;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
