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

// ==================== UPLOAD FUNCTION ====================
function initializeCloudinary() {
    console.log('Initializing Cloudinary with:', {
        cloudName: cloudinaryConfig.cloudName,
        uploadPreset: cloudinaryConfig.uploadPreset
    });
    
    if (!window.cloudinary) {
        console.error('Cloudinary SDK not loaded!');
        // Reload SDK
        const script = document.createElement('script');
        script.src = 'https://upload-widget.cloudinary.com/global/all.js';
        script.onload = () => {
            console.log('Cloudinary SDK loaded, creating widget...');
            createCloudinaryWidget();
        };
        document.head.appendChild(script);
        return;
    }
    
    createCloudinaryWidget();
}

function createCloudinaryWidget() {
    try {
        cloudinaryWidget = window.cloudinary.createUploadWidget(
            cloudinaryConfig,
            (error, result) => {
                console.log('Cloudinary Event:', result?.event);
                
                if (error) {
                    console.error('Cloudinary Error:', error);
                    showError('Upload error: ' + error.message);
                    return;
                }
                
                if (result.event === 'success') {
                    console.log('Upload Success!', result.info);
                    handleUploadSuccess(result.info);
                }
                
                if (result.event === 'close') {
                    console.log('Widget closed');
                }
                
                if (result.event === 'queues-end') {
                    console.log('All uploads finished');
                }
            }
        );
        
        console.log('Cloudinary Widget Created Successfully!');
        
    } catch (error) {
        console.error('Failed to create widget:', error);
        showError('Failed to initialize upload service');
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
