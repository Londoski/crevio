// =========================================================
// CREVIO — AVATAR HELPER
// =========================================================

function updateAvatar() {
    const userData = localStorage.getItem('crevio_user');
    const avatarEl = document.getElementById('userAvatar');
    if (!avatarEl) return;

    if (userData) {
        try {
            const user = JSON.parse(userData);
            if (user.profile_image) {
                avatarEl.innerHTML = `<img src="${user.profile_image}" alt="Profile" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                const initials = user.display_name ? user.display_name.split(' ').map(n => n.charAt(0).toUpperCase()).join('') : 'C';
                avatarEl.textContent = initials;
                avatarEl.style.background = 'var(--accent)';
                avatarEl.style.color = '#fff';
                avatarEl.style.display = 'flex';
                avatarEl.style.alignItems = 'center';
                avatarEl.style.justifyContent = 'center';
            }
        } catch (e) {}
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', updateAvatar);