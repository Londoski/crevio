// =========================================================
// CREVIO — AVATAR SETUP (with fallback)
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const user = window.getCurrentUser ? window.getCurrentUser() : {};
    const avatarEl = document.getElementById("userAvatar");
    if (!avatarEl) return;

    const name = user.display_name || user.username || user.email || "User";
    const initial = name.charAt(0).toUpperCase();

    if (user.profile_image) {
        const img = document.createElement("img");
        img.src = user.profile_image;
        img.alt = "Avatar";
        img.onerror = function () {
            avatarEl.innerHTML = "";
            avatarEl.textContent = initial;
        };
        avatarEl.innerHTML = "";
        avatarEl.appendChild(img);
    } else {
        avatarEl.textContent = initial;
    }
});