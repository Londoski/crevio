// =========================================================
// CREVIO — PROFILE JS (with avatar fix)
// =========================================================

const profileImage = document.getElementById('profileImagePreview');
const profileInitials = document.getElementById('profileInitials');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const removeBtn = document.getElementById('removeBtn');
const previewArea = document.getElementById('previewArea');
const cropImage = document.getElementById('cropImage');
const saveCropBtn = document.getElementById('saveCropBtn');
const cancelCropBtn = document.getElementById('cancelCropBtn');
const messageEl = document.getElementById('profileMessage');

let cropper = null;
let selectedFile = null;

// ---- AUTH ----
function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ---- LOAD USER PROFILE ----
function loadUserProfile() {
    const token = getToken();
    if (!token) return;

    fetch('/api/users/me', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        if (res.status === 401) {
            localStorage.removeItem('crevio_token');
            window.location.href = '/admin/pages/login.html';
            return;
        }
        return res.json();
    })
    .then(data => {
        if (data && data.success && data.user) {
            const user = data.user;

            // Update header avatar (using avatar.js will also handle it, but we do it here too)
            const avatar = document.getElementById('userAvatar');
            const nameDisplay = document.getElementById('userNameDisplay');
            if (avatar && user.display_name) {
                avatar.textContent = user.display_name.charAt(0).toUpperCase();
            }
            if (nameDisplay && user.display_name) {
                nameDisplay.textContent = user.display_name;
            }

            // Profile picture
            if (user.profile_image) {
                profileImage.src = user.profile_image + '?t=' + Date.now();
                profileImage.style.display = 'block';
                profileInitials.style.display = 'none';
            } else {
                profileImage.style.display = 'none';
                profileInitials.style.display = 'block';
                if (user.display_name) {
                    const names = user.display_name.split(' ');
                    const initials = names.map(n => n.charAt(0).toUpperCase()).join('');
                    profileInitials.textContent = initials || 'JD';
                }
            }

            // Also update the header avatar to show the image (not just initials)
            if (avatar && user.profile_image) {
                avatar.innerHTML = `<img src="${user.profile_image}?t=${Date.now()}" alt="Profile" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            }
        }
    })
    .catch(err => console.error('Error loading profile:', err));
}

// ---- SHOW MESSAGE ----
function showMessage(text, type = 'success') {
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    setTimeout(() => {
        messageEl.className = 'message';
        messageEl.textContent = '';
    }, 5000);
}

// ---- UPLOAD BUTTON ----
uploadBtn.addEventListener('click', function() {
    fileInput.click();
});

// ---- FILE SELECT ----
fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showMessage('Unsupported image format. Use JPG, PNG, or WebP.', 'error');
        this.value = '';
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showMessage('Image is too large. Maximum size is 5MB.', 'error');
        this.value = '';
        return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = function(e) {
        cropImage.src = e.target.result;
        previewArea.classList.remove('hidden');

        if (cropper) {
            cropper.destroy();
        }
        cropper = new Cropper(cropImage, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    };
    reader.readAsDataURL(file);
});

// ---- CANCEL CROP ----
cancelCropBtn.addEventListener('click', function() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    previewArea.classList.add('hidden');
    fileInput.value = '';
    selectedFile = null;
});

// ---- SAVE CROP ----
saveCropBtn.addEventListener('click', function() {
    if (!cropper || !selectedFile) {
        showMessage('No image selected or crop not ready.', 'error');
        return;
    }

    const canvas = cropper.getCroppedCanvas({
        width: 400,
        height: 400,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    });

    if (!canvas) {
        showMessage('Unable to process image.', 'error');
        return;
    }

    canvas.toBlob(function(blob) {
        if (!blob) {
            showMessage('Unable to process image.', 'error');
            return;
        }
        uploadProfilePicture(blob);
    }, 'image/jpeg', 0.92);
});

// ---- UPLOAD ----
async function uploadProfilePicture(blob) {
    const token = getToken();
    if (!token) return;

    const formData = new FormData();
    formData.append('profilePicture', blob, 'profile.jpg');

    uploadBtn.disabled = true;
    saveCropBtn.disabled = true;
    cancelCropBtn.disabled = true;

    try {
        const res = await fetch('/api/users/profile-picture', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Upload failed.');
        }

        showMessage('✅ Profile picture updated!', 'success');

        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        previewArea.classList.add('hidden');
        fileInput.value = '';
        selectedFile = null;

        // Update localStorage and avatar
        const userData = localStorage.getItem('crevio_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                user.profile_image = data.profile_image;
                localStorage.setItem('crevio_user', JSON.stringify(user));
            } catch (e) {}
        }

        loadUserProfile(); // reload to show new image

    } catch (err) {
        console.error('Upload error:', err);
        showMessage(err.message || 'Upload failed.', 'error');
    } finally {
        uploadBtn.disabled = false;
        saveCropBtn.disabled = false;
        cancelCropBtn.disabled = false;
    }
}

// ---- REMOVE ----
removeBtn.addEventListener('click', function() {
    if (!confirm('Remove your profile picture?')) return;

    const token = getToken();
    if (!token) return;

    fetch('/api/users/profile-picture', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showMessage('✅ Profile picture removed.', 'success');
            // Update localStorage
            const userData = localStorage.getItem('crevio_user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    user.profile_image = null;
                    localStorage.setItem('crevio_user', JSON.stringify(user));
                } catch (e) {}
            }
            loadUserProfile();
        } else {
            showMessage(data.message || 'Unable to remove.', 'error');
        }
    })
    .catch(err => {
        console.error('Remove error:', err);
        showMessage('An error occurred.', 'error');
    });
});

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
});