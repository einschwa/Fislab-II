// Common sidebar and UI behavior for all pages
document.addEventListener('DOMContentLoaded', () => {
    // Global auth guard: require login for all pages except the login page
    const path = (location.pathname || '').split('/');
    const page = (path[path.length - 1] || '').toLowerCase();
    const isLoginPage = page === '' || page === 'index.html';
    const loggedInNrp = localStorage.getItem('fislab-nrp');

    if (!loggedInNrp && !isLoginPage) {
        // Not logged in and trying to access a protected page → redirect to login
        window.location.href = 'index.html';
        return; // stop initializing UI on protected pages
    }
    if (loggedInNrp && isLoginPage) {
        // Already logged in and opened the login page → go to home
        window.location.href = 'home.html';
        return;
    }

    // If auth state changes in another tab, enforce guards here as well
    window.addEventListener('storage', (e) => {
        if (e.key === 'fislab-nrp') {
            const nowLoggedIn = !!localStorage.getItem('fislab-nrp');
            const pathBits = (location.pathname || '').split('/');
            const cur = (pathBits[pathBits.length - 1] || '').toLowerCase();
            const onLogin = cur === '' || cur === 'index.html';
            if (!nowLoggedIn && !onLogin) {
                window.location.href = 'index.html';
            } else if (nowLoggedIn && onLogin) {
                window.location.href = 'home.html';
            }
        }
    });

    const header = document.querySelector('.top-left-header');
    const hamburger = document.getElementById('hamburger');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const modeToggleBtn = document.getElementById('mode-toggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    const navLogout = document.getElementById('nav-logout');

    // Header animation
    if (header) {
        window.requestAnimationFrame(() => header.classList.add('menu-visible'));
    }

    // Sidebar toggle helpers
    function setSidebarOpen(isOpen) {
        document.body.classList.toggle('sidebar-open', isOpen);
        if (hamburger) {
            hamburger.setAttribute('aria-expanded', String(isOpen));
        }
    }

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            const willOpen = !document.body.classList.contains('sidebar-open');
            setSidebarOpen(willOpen);
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => setSidebarOpen(false));
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setSidebarOpen(false);
    });

    // Dark mode restore and toggle
    const prefersDark = localStorage.getItem('fislab-theme') === 'dark';
    document.body.classList.toggle('dark', prefersDark);
    if (sunIcon) sunIcon.style.display = prefersDark ? 'none' : 'block';
    if (moonIcon) moonIcon.style.display = prefersDark ? 'block' : 'none';

    if (modeToggleBtn) {
        modeToggleBtn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark');
            localStorage.setItem('fislab-theme', isDark ? 'dark' : 'light');
            if (sunIcon) sunIcon.style.display = isDark ? 'none' : 'block';
            if (moonIcon) moonIcon.style.display = isDark ? 'block' : 'none';
        });
    }

    // Logout handler
    if (navLogout) {
        navLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('fislab-nrp');
            localStorage.removeItem('fislab-role');
            localStorage.removeItem('fislab-admin');
            window.location.href = 'index.html';
        });
    }

    // Role-based navigation visibility
    const role = localStorage.getItem('fislab-role');
    const isAdmin = localStorage.getItem('fislab-admin') === 'true';
    const navNilai = document.getElementById('nav-nilai');
    const navPenilaian = document.getElementById('nav-penilaian');
    const navPenjadwalan = document.getElementById('nav-penjadwalan');
    const navAdmin = document.getElementById('nav-admin');

    [navNilai, navPenilaian, navPenjadwalan, navAdmin].forEach((el) => {
        if (el) el.style.display = 'none';
    });

    const isAslab = role === 'Asisten Laboratorium';
    if (isAslab) {
        if (navPenilaian) navPenilaian.style.display = 'flex';
        if (navPenjadwalan) navPenjadwalan.style.display = 'flex';
        if (isAdmin && navAdmin) navAdmin.style.display = 'flex';
    } else if (role === 'Praktikan') {
        if (navNilai) navNilai.style.display = 'flex';
    }
});


