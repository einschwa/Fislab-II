const database = firebase.database();

// UI Elements
const modeToggleBtn = document.getElementById('mode-toggle');
const loadingScreen = document.getElementById('loading-screen');

// Tips array
const tips = [
    "Gunakan fitur dark mode untuk pengalaman belajar yang nyaman di malam hari",
    "Simpan progress belajar Anda secara berkala",
    "Jangan ragu untuk bertanya jika ada yang kurang jelas",
    "Latihan rutin akan meningkatkan pemahaman Anda"
];

// State variables
let currentTipIndex = 0;
let tipInterval;
let avatarTimer = null;
let avatarFrame = 0;
let progressInterval = null;
let finishTimer = null;
let progressValue = 0;
let isLoggingIn = false;

const DEFAULT_AVATAR_SEQUENCE = [
    'Epstein Files/Eins1.png',
    'Epstein Files/Eins5.png',
    'Epstein Files/Eins8.png',
    'Epstein Files/Eins10.png'
];

function startAvatarAnimation(opts){
    const img = document.getElementById('loading-avatar');
    if(!img) return;
    const frames = (opts && opts.frames) ? opts.frames : DEFAULT_AVATAR_SEQUENCE;
    const interval = (opts && typeof opts.interval === 'number') ? opts.interval : 500;
    stopAvatarAnimation();
    avatarFrame = 0;
    img.src = encodeURI(frames[0]);
    avatarTimer = setInterval(()=>{
        avatarFrame = (avatarFrame + 1) % frames.length;
        img.src = encodeURI(frames[avatarFrame]);
    }, Math.max(50, Math.min(300, interval)));
}

function stopAvatarAnimation(){
    if(avatarTimer){ clearInterval(avatarTimer); avatarTimer = null; }
}

function showLoadingScreen(opts){
    const options = opts || {};
    if (!loadingScreen) {
        console.error('Loading screen element not found');
        return;
    }
    
    loadingScreen.classList.add('active');
    clearInterval(progressInterval);
    progressValue = 0;
    
    const target = 90;
    const duration = 4500;
    const stepMs = 60;
    const step = (target / (duration / stepMs));
    
    progressInterval = setInterval(()=>{
        progressValue = Math.min(target, progressValue + step);
        const bar = document.getElementById('progress-bar');
        const txt = document.querySelector('#loading-text #progress-text') || document.getElementById('progress-text');
        if(bar) bar.style.width = Math.round(progressValue) + '%';
        if(txt) txt.textContent = Math.round(progressValue) + '%';
    }, stepMs);

    startAvatarAnimation({ frames: options.frames || DEFAULT_AVATAR_SEQUENCE, interval: options.interval || 500 });

    if(finishTimer){ clearTimeout(finishTimer); finishTimer = null; }
    if (options.autoFinish !== false) {
        const ms = (typeof options.autoFinishDuration === 'number') ? options.autoFinishDuration : 6000;
        finishTimer = setTimeout(()=> finishLoading(options.redirect || null), ms);
    }
}

function finishLoading(redirectUrl){
    if(progressInterval){ clearInterval(progressInterval); progressInterval = null; }
    if(finishTimer){ clearTimeout(finishTimer); finishTimer = null; }
    
    progressValue = 100;
    const bar = document.getElementById('progress-bar');
    const txt = document.querySelector('#loading-text #progress-text') || document.getElementById('progress-text');
    if(bar) bar.style.width = '100%';
    if(txt) txt.textContent = '100%';
    
    stopAvatarAnimation();
    
    const el = document.getElementById('loading-screen');
    if(el){ el.classList.remove('active'); el.style.opacity = '0'; }
    
    setTimeout(()=>{
        if(el && el.parentNode) el.parentNode.removeChild(el);
        if(redirectUrl) {
            console.log('Redirecting to:', redirectUrl);
            window.location.href = redirectUrl;
        }
        isLoggingIn = false;
    }, 520);
}

function changeTip() {
    if (!tips.length) return;
    const tipsContent = document.getElementById('tips-content');
    if (!tipsContent) return;
    tipsContent.textContent = tips[currentTipIndex];
    currentTipIndex = (currentTipIndex + 1) % tips.length;
}

function startTipRotation() {
    if (tipInterval) { clearInterval(tipInterval); tipInterval = null; }
    changeTip();
    tipInterval = setInterval(changeTip, 2000);
}

// Main login function - handles both local and Firebase auth
async function performLogin(nrp, password, submitButton, closeModalCallback) {
    if (isLoggingIn) {
        console.warn('Login already in progress');
        return;
    }

    if (!nrp || !password) {
        alert('NRP dan Kata Sandi tidak boleh kosong.');
        if (submitButton) {
            submitButton.textContent = 'Login';
            submitButton.disabled = false;
        }
        return;
    }

    isLoggingIn = true;
    
    if (submitButton) {
        submitButton.textContent = 'Memverifikasi...';
        submitButton.disabled = true;
    }

    try {
        // 1) Try local JSON data first
        if (window.__FISLAB && typeof window.__FISLAB.loadLocal === 'function') {
            try {
                await window.__FISLAB.loadLocal();
                const userData = window.__FISLAB.getUser(nrp);
                if (userData && userData.password === password) {
                    console.log('Login successful with local data');
                    localStorage.setItem('fislab-nrp', nrp);
                    if (userData.role) localStorage.setItem('fislab-role', userData.role);
                    localStorage.setItem('fislab-admin', userData.admin ? 'true' : 'false');
                    
                    if (closeModalCallback) closeModalCallback();
                    startTipRotation();
                    showLoadingScreen({ redirect: 'home.html' });
                    return;
                }
            } catch (e) {
                console.warn('Local data lookup failed', e);
            }
        }

        // 2) Fallback to Firebase
        if (typeof database === 'undefined' || !database || typeof database.ref !== 'function') {
            alert('Database tidak siap. Silakan refresh halaman.');
            if (submitButton) {
                submitButton.textContent = 'Login';
                submitButton.disabled = false;
            }
            isLoggingIn = false;
            return;
        }

        // Set timeout for Firebase query (3 seconds)
        let isResolved = false;
        const timeoutId = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                alert('Koneksi ke server timeout. Silakan coba lagi.');
                if (submitButton) {
                    submitButton.textContent = 'Login';
                    submitButton.disabled = false;
                }
                isLoggingIn = false;
            }
        }, 3000);

        const userRef = database.ref('users/' + nrp);
        userRef.once('value', (snapshot) => {
            if (isResolved) return;
            isResolved = true;
            clearTimeout(timeoutId);

            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.password === password) {
                    console.log('Login successful with Firebase');
                    localStorage.setItem('fislab-nrp', nrp);
                    if (userData.role) localStorage.setItem('fislab-role', userData.role);
                    localStorage.setItem('fislab-admin', userData.admin ? 'true' : 'false');
                    
                    if (closeModalCallback) closeModalCallback();
                    startTipRotation();
                    showLoadingScreen({ redirect: 'home.html' });
                    return;
                }
            }
            
            alert('Login Gagal! NRP atau Kata Sandi salah.');
            if (submitButton) {
                submitButton.textContent = 'Login';
                submitButton.disabled = false;
            }
            isLoggingIn = false;
        }).catch((error) => {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeoutId);
                console.error('Firebase error:', error);
                alert('Kesalahan server: ' + (error?.message || 'Unknown error'));
                if (submitButton) {
                    submitButton.textContent = 'Login';
                    submitButton.disabled = false;
                }
                isLoggingIn = false;
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        alert('Terjadi kesalahan saat login');
        if (submitButton) {
            submitButton.textContent = 'Login';
            submitButton.disabled = false;
        }
        isLoggingIn = false;
    }
}

// Handle Modal Login Event dari hero.js
document.addEventListener('login-attempt', (event) => {
    console.log('Login attempt event received from modal');
    const { nrp, password, closeModal } = event.detail;
    const submitButton = document.querySelector('#login-form-modal button[type="submit"]');
    performLogin(nrp, password, submitButton, closeModal);
});

// Dark Mode Toggle
if (modeToggleBtn) {
    modeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('dark-mode', document.documentElement.classList.contains('dark'));
    });

    // Load dark mode preference
    const darkMode = localStorage.getItem('dark-mode');
    if (darkMode === 'true') {
        document.documentElement.classList.add('dark');
    }
}

// Cleanup when navigating away
window.addEventListener('beforeunload', ()=>{
    stopAvatarAnimation();
    if(progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    if(finishTimer) { clearTimeout(finishTimer); finishTimer = null; }
});

console.log('index.js loaded successfully');