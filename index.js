    const database = firebase.database();

        // Variabel UI yang sudah ada
        const initialLoginBtn = document.getElementById('initial-login-btn');
        const loginFormWrapper = document.getElementById('login-form-wrapper');
        const loginContainer = document.querySelector('.login-container');
        const modeToggleBtn = document.getElementById('mode-toggle');
        const loginForm = document.getElementById('login-form');
        const loadingScreen = document.getElementById('loading-screen');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const tipsContent = document.getElementById('tips-content');

        // Array tips yang sudah ada
        const tips = [
            "Gunakan fitur dark mode untuk pengalaman belajar yang nyaman di malam hari",
            "Simpan progress belajar Anda secara berkala",
            "Jangan ragu untuk bertanya jika ada yang kurang jelas",
            "Latihan rutin akan meningkatkan pemahaman Anda"
        ];
        let currentTipIndex = 0;
        let tipInterval;
        
        // Avatar frame-by-frame animation + loading bar
        let avatarTimer = null;
        let avatarFrame = 0;
        let progressInterval = null;
        let finishTimer = null;
        let progressValue = 0;

        const AVATAR_FRAMES = Array.from({length:12}, (_,i)=>`Epstein Files/Eins${i+1}.png`);
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
            loadingScreen.classList.add('active');
            clearInterval(progressInterval);
            progressValue = 0;
            // animate progress to ~90% over ~4.5s
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

            // start avatar frame loop once first frame exists
            startAvatarAnimation({ frames: options.frames || DEFAULT_AVATAR_SEQUENCE, interval: options.interval || 500 });

            // schedule auto-finish at 6 seconds (6000ms) unless disabled
            if(finishTimer){ clearTimeout(finishTimer); finishTimer = null; }
            if (options.autoFinish === false) {
                // do not schedule
            } else {
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
                if(redirectUrl) window.location.href = redirectUrl;
            }, 520);
        }

        function hideLoadingScreen(){ finishLoading(); }

        function changeTip() {
            const el = document.getElementById('tips-content');
            if (!el) {
                if (tipInterval) { clearInterval(tipInterval); tipInterval = null; }
                return;
            }
            el.textContent = tips[currentTipIndex];
            currentTipIndex = (currentTipIndex + 1) % tips.length;
        }

        function startTipRotation() {
            const el = document.getElementById('tips-content');
            if (!el) return;
            if (tipInterval) { clearInterval(tipInterval); tipInterval = null; }
            changeTip();
            tipInterval = setInterval(changeTip, 2000);
        }
        
        initialLoginBtn.addEventListener('click', () => {
            initialLoginBtn.classList.add('hidden');
            loginContainer.classList.add('form-visible');
            loginFormWrapper.classList.add('visible');
        });

        // Toggle visible password
        const passwordInput = document.getElementById('password');
        const togglePasswordBtn = document.getElementById('toggle-password');
        if (passwordInput && togglePasswordBtn) {
            const updateToggleState = (visible) => {
                togglePasswordBtn.classList.toggle('active', visible);
                togglePasswordBtn.setAttribute('aria-pressed', String(visible));
                togglePasswordBtn.setAttribute('aria-label', visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
            };
            togglePasswordBtn.addEventListener('click', () => {
                const visible = passwordInput.type === 'text';
                passwordInput.type = visible ? 'password' : 'text';
                updateToggleState(!visible);
            });
        }

        // 3. Modifikasi Logika Login
        loginForm.addEventListener('submit', async (event) => {
                    event.preventDefault(); // Mencegah form me-reload halaman

                    const nrp = document.getElementById('nrp').value;
                    const password = document.getElementById('password').value;
                    const submitButton = loginForm.querySelector('button[type="submit"]');

                    if (!nrp || !password) {
                        alert('NRP dan Kata Sandi tidak boleh kosong.');
                        return;
                    }

                    // Ubah teks tombol untuk memberi feedback
                    submitButton.textContent = 'Memverifikasi...';
                    submitButton.disabled = true;

                    // 1) Try local JSON data if available
                    try {
                        if (window.__FISLAB && typeof window.__FISLAB.loadLocal === 'function') {
                            await window.__FISLAB.loadLocal();
                            const userData = window.__FISLAB.getUser(nrp);
                            if (userData) {
                                if (userData.password === password) {
                                    localStorage.setItem('fislab-nrp', nrp);
                                    if (userData.role) localStorage.setItem('fislab-role', userData.role);
                                    localStorage.setItem('fislab-admin', userData.admin ? 'true' : 'false');
                                    startTipRotation();
                                    showLoadingScreen({ redirect: 'home.html' });
                                    return;
                                } else {
                                    alert('Login Gagal! NRP atau Kata Sandi salah.');
                                    submitButton.textContent = 'Login';
                                    submitButton.disabled = false;
                                    return;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('Local data lookup failed', e);
                    }

                    // 2) Fallback to Firebase realtime database if available
                    try {
                        if (typeof database !== 'undefined' && database && typeof database.ref === 'function') {
                            const userRef = database.ref('users/' + nrp);
                            userRef.once('value', (snapshot) => {
                                if (snapshot.exists()) {
                                    const userData = snapshot.val();
                                    if (userData.password === password) {
                                        localStorage.setItem('fislab-nrp', nrp);
                                        if (userData.role) localStorage.setItem('fislab-role', userData.role);
                                        localStorage.setItem('fislab-admin', userData.admin ? 'true' : 'false');
                                        startTipRotation();
                                        showLoadingScreen({ redirect: 'home.html' });
                                        return;
                                    } else {
                                        alert('Login Gagal! NRP atau Kata Sandi salah.');
                                        submitButton.textContent = 'Login';
                                        submitButton.disabled = false;
                                        return;
                                    }
                                } else {
                                    alert('Login Gagal! NRP atau Kata Sandi salah.');
                                    submitButton.textContent = 'Login';
                                    submitButton.disabled = false;
                                    return;
                                }
                            }).catch((error) => {
                                console.error('Firebase read failed: ' + (error && error.message));
                                alert('Terjadi kesalahan saat menghubungkan ke server. Silakan coba lagi.');
                                submitButton.textContent = 'Login';
                                submitButton.disabled = false;
                                return;
                            });
                        } else {
                            // No data source available
                            alert('Sumber data tidak tersedia. Tidak dapat memverifikasi login.');
                            submitButton.textContent = 'Login';
                            submitButton.disabled = false;
                        }
                    } catch (err) {
                        console.error('Login fallback failed', err);
                        alert('Terjadi kesalahan saat memverifikasi login.');
                        submitButton.textContent = 'Login';
                        submitButton.disabled = false;
                    }
                });

    // Cleanup when navigating away
    window.addEventListener('beforeunload', ()=>{
        stopAvatarAnimation && stopAvatarAnimation();
        if(progressInterval) { clearInterval(progressInterval); progressInterval = null; }
        if(finishTimer) { clearTimeout(finishTimer); finishTimer = null; }
    });