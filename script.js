// script.js - SIMPLE WORKING VERSION

// ==================== CLOUDINARY CONFIG ====================
const cloudinaryConfig = {
    cloudName: 'ck8725201',
    uploadPreset: 'ml_default', // သင့်မှာရှိပြီးသား preset
    
    // BASIC SETTINGS
    sources: ['local'], // Local files only
    multiple: true,     // Multiple files
    maxFiles: 5,        // Max 5 files
    maxFileSize: 10485760, // 10MB (အရင်သေးသေးနဲ့စမ်းပါ)
    
    // FILE TYPE RESTRICTION - ဒါက code ကနေပဲထိန်းတာ
    clientAllowedFormats: [
        // Images
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
        // Documents
        'pdf',
        // Videos
        'mp4', 'mov',
        // Office files
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        // Others
        'txt', 'zip'
    ],
    
    // IMPORTANT: ဒီ option ကို TRUE လုပ်ပါ
    validateMaxFileSize: true,
    
    // SIMPLE UI
    showAdvancedOptions: false,
    showPoweredBy: false,
    cropping: false,
    showSkipCropButton: false,
    
    styles: {
        palette: {
            window: "#FFFFFF",
            sourceBg: "#F4F4F5",
            windowBorder: "#4361ee",
            tabIcon: "#4361ee",
            inactiveTabIcon: "#69778A",
            menuIcons: "#4361ee",
            link: "#4361ee",
            action: "#4361ee",
            inProgress: "#4361ee",
            complete: "#20b832",
            error: "#c43737",
            textDark: "#000000",
            textLight: "#FFFFFF"
        }
    }
};

// script.js - UPDATED UPLOAD FUNCTION

async function handleUploadSuccess(fileInfo) {
    console.log('Processing uploaded file:', fileInfo);
    
    if (!currentUser) {
        showError('Please login first');
        return;
    }
    
    // Check if user document exists, if not create it
    const userDocRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
        // Create user document if doesn't exist
        await userDocRef.set({
            name: currentUser.displayName || currentUser.email,
            email: currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            storageUsed: 0,
            fileCount: 0
        });
    }
    
    // Prepare file data
    const fileData = {
        public_id: fileInfo.public_id,
        url: fileInfo.secure_url,
        thumbnail_url: fileInfo.secure_url.replace('/upload/', '/upload/w_300,h_300,c_fill/'),
        format: fileInfo.format,
        resource_type: fileInfo.resource_type,
        bytes: fileInfo.bytes,
        width: fileInfo.width || null,
        height: fileInfo.height || null,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        fileName: fileInfo.original_filename || fileInfo.public_id,
        displayName: currentUser.displayName || 'User'
    };
    
    try {
        showLoading('Saving file information...');
        
        // Save file to Firestore
        const fileRef = await db.collection('files').add(fileData);
        console.log('File saved with ID:', fileRef.id);
        
        // Update user's storage usage
        await userDocRef.update({
            storageUsed: firebase.firestore.FieldValue.increment(fileInfo.bytes),
            fileCount: firebase.firestore.FieldValue.increment(1),
            lastUpload: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showSuccess(`✅ File uploaded successfully! (${formatFileSize(fileInfo.bytes)})`);
        
        // Refresh the file lists
        setTimeout(() => {
            loadUserFiles();
            updateStorageUsage();
        }, 500);
        
    } catch (error) {
        console.error('Firestore Save Error:', error);
        
        // Check specific error
        if (error.code === 'permission-denied') {
            showError('Permission denied. Please check Firestore security rules.');
            console.error('Firestore Rules need to be updated!');
        } else {
            showError('Failed to save file: ' + error.message);
        }
    } finally {
        hideLoading();
    }
}

// ==================== OPEN UPLOAD ====================
function openUploadWidget() {
    if (!currentUser) {
        showError('Please login first');
        showLogin();
        return;
    }
    
    console.log('Opening upload widget...');
    
    if (!cloudinaryWidget) {
        initializeCloudinary();
        
        // Wait a bit for initialization
        setTimeout(() => {
            if (cloudinaryWidget) {
                cloudinaryWidget.open();
            } else {
                showError('Upload service not ready. Please try again.');
            }
        }, 500);
    } else {
        cloudinaryWidget.open();
    }
}

// ==================== UPLOAD SUCCESS ====================
async function handleUploadSuccess(fileInfo) {
    console.log('Processing uploaded file:', fileInfo);
    
    const fileData = {
        public_id: fileInfo.public_id,
        url: fileInfo.secure_url,
        format: fileInfo.format,
        resource_type: fileInfo.resource_type,
        bytes: fileInfo.bytes,
        created_at: new Date().toISOString(),
        userId: currentUser.uid,
        fileName: fileInfo.original_filename || fileInfo.public_id,
        displayName: currentUser.displayName || currentUser.email,
        folder: fileInfo.folder || 'clouddriver'
    };
    
    try {
        showLoading('Saving file information...');
        
        // Save to Firestore
        await db.collection('files').add(fileData);
        
        showSuccess(`✅ File uploaded successfully! (${formatFileSize(fileInfo.bytes)})`);
        
        // Refresh
        loadUserFiles();
        updateStorageUsage();
        
    } catch (error) {
        console.error('Save error:', error);
        showError('Failed to save file info: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ==================== TEST UPLOAD ====================
// Test function ကိုခေါ်ပြီး စမ်းကြည့်ပါ
function testCloudinaryUpload() {
    console.log('Testing Cloudinary Upload...');
    
    // Direct test without widget
    const testWidget = window.cloudinary.createUploadWidget({
        cloudName: 'ck8725201',
        uploadPreset: 'ml_default',
        sources: ['local'],
        maxFiles: 1
    }, (error, result) => {
        console.log('Test Result:', result);
        if (result.event === 'success') {
            alert('Test Upload Successful! Check console for details.');
        }
    });
    
    testWidget.open();
}

// Browser console မှာ testCloudinaryUpload() လို့ရိုက်ပြီး စမ်းကြည့်ပါ
