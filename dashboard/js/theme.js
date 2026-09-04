// =========================================================
// CREVIO — THEME TOGGLE (Permanent Solution)
// =========================================================

(function() {
    function applyTheme(theme) {
        var actualTheme = theme;
        if (theme === 'system') {
            actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', actualTheme);
        document.body.style.background = actualTheme === 'dark' ? '#0F172A' : '#F1F5F9';
        localStorage.setItem('crevio_theme', theme);
        updateToggleIcon(theme);
    }

    function updateToggleIcon(theme) {
        var btn = document.getElementById('themeToggleBtn');
        if (!btn) return;
        var icon = btn.querySelector('.icon');
        if (icon) {
            var actualTheme = theme === 'system' ? 
                (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
            icon.setAttribute('data-lucide', actualTheme === 'dark' ? 'moon' : 'sun');
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    window.toggleTheme = function() {
        var current = localStorage.getItem('crevio_theme') || 'dark';
        var next = current === 'dark' ? 'light' : (current === 'light' ? 'system' : 'dark');
        applyTheme(next);
    };

    document.addEventListener('DOMContentLoaded', function() {
        var saved = localStorage.getItem('crevio_theme') || 'dark';
        applyTheme(saved);
        var btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                toggleTheme();
            });
        }
    });

    window.applyTheme = applyTheme;
})();