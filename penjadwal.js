    const database = firebase.database();
        
        // Sesi default untuk semua minggu kecuali week 3 dan 4
        const DEFAULT_SESSIONS = [
            { id: 1, start: '07:00', end: '09:00' },
            { id: 2, start: '09:00', end: '11:00' },
            { id: 3, start: '11:00', end: '13:00' },
            { id: 4, start: '13:30', end: '15:30' },
            { id: 5, start: '15:30', end: '17:30' },
            { id: 6, start: '18:00', end: '20:00' }
        ];
        
        // Sesi khusus untuk week 3 dan week 4
        const WEEK3_4_SESSIONS = [
            { id: 1, start: '07:30', end: '08:50' },
            { id: 2, start: '09:00', end: '10:20' },
            { id: 4, start: '13:00', end: '14:20' },
            { id: 5, start: '14:30', end: '15:50' },
            { id: 3, start: '10:30', end: '11:50' },
            { id: 6, start: '15:50', end: '17:10' }
        ];
        
        // Fungsi untuk mendapatkan sesi yang sesuai berdasarkan week dari database
        function getSessionsForWeek(weekNumber) {
            if (weekNumber === 3 || weekNumber === 4) {
                return WEEK3_4_SESSIONS;
            }
            return DEFAULT_SESSIONS;
        }
        
        // Fungsi untuk mendapatkan week asli dari data (sama seperti jadwal.js)
        function rawWeek(j) { 
            return (j && typeof j.week === 'number') ? j.week : 0; 
        }
        
        // Fungsi untuk menampilkan week dengan offset khusus (sama seperti jadwal.js)
        function displayWeek(j) {
            const w = rawWeek(j);
            if (w >= 3 && w <= 4) 
                return w - 1; // geser khusus minggu 3-4
            return w; // minggu lain tidak berubah
        }
        
        let __ALL_DATA__ = null;

        // Sidebar visibility handled by sidebar.js
        
        function displaySchedulingInterface(allData, assistantNrp) {
            __ALL_DATA__ = allData;
            const { kelompok, judulPraktikum } = allData;
            const grid = document.getElementById('scheduling-grid');
            grid.innerHTML = '';

            let tasksFound = 0;
            for (const kelompokId in kelompok) {
                for (const modulId in kelompok[kelompokId]) {
                    if ((modulId.startsWith('W') || modulId.startsWith('MP')) && kelompok[kelompokId][modulId].aslab.includes(assistantNrp)) {
                        tasksFound++;
                        const jadwal = kelompok[kelompokId][modulId];
                        const kelompokNama = kelompok[kelompokId].namaKelompok;
                        const modulNama = judulPraktikum[modulId] ? judulPraktikum[modulId].namaJudul : 'N/A';
                        
                        const card = document.createElement('div');
                        card.className = 'scheduling-card';
                        
                        // Dapatkan sesi berdasarkan week dari database
                        const weekNumber = jadwal.week || null;
                        const currentSessions = getSessionsForWeek(weekNumber);
                        
                        const selectedSessionId = (function(){
                            if (jadwal['jam-awal'] && jadwal['jam-akhir']) {
                                const match = currentSessions.find(s => s.start === jadwal['jam-awal'] && s.end === jadwal['jam-akhir']);
                                return match ? match.id : '';
                            }
                            return '';
                        })();
                        card.innerHTML = `
                            <div class="toast-banner" id="toast-${kelompokId}-${modulId}" role="status" aria-live="polite" aria-atomic="true" style="display:none;">Berhasil</div>
                            <div class="scheduling-header">
                                <h3>${modulId}: ${modulNama}</h3>
                                <p>${kelompokNama}</p>
                                <p style="font-size:0.9rem; color:#666; margin-top:0.25rem;">Minggu ke-${displayWeek(jadwal)}</p>
                            </div>
                            <div class="form-group">
                                <label for="jam-awal-${kelompokId}-${modulId}">Jam Awal</label>
                                <input type="time" id="jam-awal-${kelompokId}-${modulId}" value="${jadwal['jam-awal'] || ''}" readonly>
                            </div>
                            <div class="form-group">
                                <label for="jam-akhir-${kelompokId}-${modulId}">Jam Akhir</label>
                                <input type="time" id="jam-akhir-${kelompokId}-${modulId}" value="${jadwal['jam-akhir'] || ''}" readonly>
                            </div>
                            <div class="form-group">
                                <label for="tanggal-${kelompokId}-${modulId}">Tanggal</label>
                                <input type="date" id="tanggal-${kelompokId}-${modulId}" value="${(jadwal['tanggal'] && jadwal['tanggal'] !== 0) ? jadwal['tanggal'] : ''}">
                            </div>
                            <div class="form-group">
                                <label for="sesi-${kelompokId}-${modulId}">Sesi (2 jam)</label>
                                <select id="sesi-${kelompokId}-${modulId}">
                                    <option value="">Pilih sesi</option>
                                    ${currentSessions.map(s => `<option value="${s.id}" ${String(selectedSessionId)===String(s.id)?'selected':''}>Sesi ${s.id} (${s.start} - ${s.end})</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <div id="week-info-${kelompokId}-${modulId}" style="font-size:0.85rem; color:#666; margin-bottom:0.5rem;"></div>
                                <div id="sesi-status-${kelompokId}-${modulId}" style="font-size:0.9rem;"></div>
                                <div id="sesi-tersedia-${kelompokId}-${modulId}" style="font-size:0.9rem; opacity:0.85;"></div>
                            </div>
                            <button class="save-btn" data-kelompok="${kelompokId}" data-modul="${modulId}">Simpan Jadwal</button>
                            <button class="cancel-btn" data-kelompok="${kelompokId}" data-modul="${modulId}">Batalkan Jadwal</button>
                        `;
                        grid.appendChild(card);

                        const tanggalInput = document.getElementById(`tanggal-${kelompokId}-${modulId}`);
                        const sesiSelect = document.getElementById(`sesi-${kelompokId}-${modulId}`);
                        const jamAwalEl = document.getElementById(`jam-awal-${kelompokId}-${modulId}`);
                        const jamAkhirEl = document.getElementById(`jam-akhir-${kelompokId}-${modulId}`);
                        const statusEl = document.getElementById(`sesi-status-${kelompokId}-${modulId}`);
                        const tersediaEl = document.getElementById(`sesi-tersedia-${kelompokId}-${modulId}`);
                        const weekInfoEl = document.getElementById(`week-info-${kelompokId}-${modulId}`);

                        function countBookingsFor(tanggal, sessionObj, excludeKey){
                            if (!tanggal || !sessionObj) return 0;
                            let cnt = 0;
                            for (const kId in __ALL_DATA__.kelompok){
                                const kg = __ALL_DATA__.kelompok[kId];
                                for (const mId in kg){
                                    if (!mId.startsWith('W') && !mId.startsWith('MP')) continue;
                                    const j = kg[mId];
                                    const key = `${kId}/${mId}`;
                                    if (excludeKey && key === excludeKey) continue;
                                    if (j['tanggal'] && j['tanggal'] !== 0 && j['jam-awal'] && j['jam-akhir']){
                                        if (j['tanggal'] === tanggal && j['jam-awal'] === sessionObj.start && j['jam-akhir'] === sessionObj.end){
                                            cnt++;
                                        }
                                    }
                                }
                            }
                            return cnt;
                        }

                        // Cek apakah modul yang sama (e.g. MP1) sudah dipakai di sesi ini pada tanggal ini oleh kelompok lain
                        function isSessionTakenBySameModule(tanggal, sessionObj, modulId, excludeKey){
                            if (!tanggal || !sessionObj) return false;
                            for (const kId in __ALL_DATA__.kelompok){
                                const kg = __ALL_DATA__.kelompok[kId];
                                if (!kg[modulId]) continue;
                                const j = kg[modulId];
                                const key = `${kId}/${modulId}`;
                                if (excludeKey && key === excludeKey) continue;
                                if (j['tanggal'] && j['tanggal'] !== 0 && j['jam-awal'] && j['jam-akhir']){
                                    if (j['tanggal'] === tanggal && j['jam-awal'] === sessionObj.start && j['jam-akhir'] === sessionObj.end){
                                        return true;
                                    }
                                }
                            }
                            return false;
                        }

                        function updateWeekInfo() {
                            if (!weekNumber) {
                                weekInfoEl.textContent = '';
                                return;
                            }
                            if (weekNumber === 3 || weekNumber === 4) {
                                weekInfoEl.textContent = `📅 Week ${weekNumber} - Menggunakan sesi khusus (6 sesi tersedia)`;
                                weekInfoEl.style.color = '#0066cc';
                            } else {
                                weekInfoEl.textContent = `📅 Week ${weekNumber} - Menggunakan sesi standar (6 sesi tersedia)`;
                                weekInfoEl.style.color = '#666';
                            }
                        }
                        
                        function listAvailableSessions(tanggal, excludeKey){
                            if (!tanggal){
                                tersediaEl.textContent = 'Pilih tanggal untuk melihat sesi yang tersedia.';
                                return;
                            }
                            const sessionsForDate = getSessionsForWeek(weekNumber);
                            const avail = sessionsForDate.map(s => ({
                                s,
                                sameModul: isSessionTakenBySameModule(tanggal, s, modulId, excludeKey),
                                used: countBookingsFor(tanggal, s, excludeKey)
                            }))
                                .filter(x => !x.sameModul && x.used < 4)
                                .map(x => `Sesi ${x.s.id} (${x.s.start}-${x.s.end}) tersisa ${4 - x.used}`);
                            tersediaEl.textContent = avail.length ? ('Sesi tersedia: ' + avail.join(', ')) : 'Semua sesi penuh atau modul ini sudah ada di sesi lain pada tanggal ini.';
                        }

                        function updateSessionBinding(){
                            const tanggal = tanggalInput.value;
                            
                            // Update info minggu
                            updateWeekInfo();
                            
                            // Dapatkan sesi yang sesuai berdasarkan week dari database
                            const sessionsForDate = getSessionsForWeek(weekNumber);
                            
                            // Update dropdown sesi
                            const currentSesiValue = sesiSelect.value;
                            sesiSelect.innerHTML = '<option value="">Pilih sesi</option>' + 
                                sessionsForDate.map(s => `<option value="${s.id}">Sesi ${s.id} (${s.start} - ${s.end})</option>`).join('');
                            
                            // Restore nilai jika masih valid
                            if (currentSesiValue && sessionsForDate.find(s => String(s.id) === currentSesiValue)) {
                                sesiSelect.value = currentSesiValue;
                            }
                            
                            const sesiId = sesiSelect.value ? parseInt(sesiSelect.value, 10) : null;
                            const sesiObj = sesiId ? sessionsForDate.find(s => s.id === sesiId) : null;
                            
                            if (sesiObj){
                                jamAwalEl.value = sesiObj.start;
                                jamAkhirEl.value = sesiObj.end;
                            } else {
                                jamAwalEl.value = '';
                                jamAkhirEl.value = '';
                            }
                            
                            const excludeKey = `${kelompokId}/${modulId}`;
                            if (tanggal && sesiObj){
                                const sameModulTaken = isSessionTakenBySameModule(tanggal, sesiObj, modulId, excludeKey);
                                if (sameModulTaken){
                                    statusEl.textContent = `Sesi ${sesiObj.id} (${sesiObj.start}-${sesiObj.end}) tidak tersedia: ${modulId} sudah dijadwalkan di sesi ini pada tanggal ${tanggal} oleh kelompok lain.`;
                                } else {
                                    const used = countBookingsFor(tanggal, sesiObj, excludeKey);
                                    const remaining = 4 - used;
                                    if (remaining <= 0){
                                        statusEl.textContent = `Sesi ${sesiObj.id} (${sesiObj.start}-${sesiObj.end}) penuh untuk tanggal ${tanggal}.`;
                                    } else {
                                        statusEl.textContent = `Sesi ${sesiObj.id} (${sesiObj.start}-${sesiObj.end}) tersedia: sisa ${remaining} untuk tanggal ${tanggal}.`;
                                    }
                                }
                            } else {
                                statusEl.textContent = '';
                            }
                            listAvailableSessions(tanggal, excludeKey);
                        }

                        tanggalInput.addEventListener('change', updateSessionBinding);
                        sesiSelect.addEventListener('change', updateSessionBinding);
                        updateSessionBinding();
                    }
                }
            }

            if (tasksFound === 0) {
                grid.innerHTML = '<p>Tidak ada jadwal yang perlu Anda atur saat ini.</p>';
            }
        }

        document.getElementById('scheduling-grid').addEventListener('click', function(e) {
            const saveBtn = e.target.closest && e.target.closest('.save-btn');
            const cancelBtn = e.target.closest && e.target.closest('.cancel-btn');
            if (saveBtn) {
                const btn = saveBtn;
                const { kelompok, modul } = btn.dataset;
                
                const jamAwal = document.getElementById(`jam-awal-${kelompok}-${modul}`).value;
                const jamAkhir = document.getElementById(`jam-akhir-${kelompok}-${modul}`).value;
                const tanggal = document.getElementById(`tanggal-${kelompok}-${modul}`)?.value || '';
                const sesiIdStr = document.getElementById(`sesi-${kelompok}-${modul}`)?.value || '';

                if (!tanggal) {
                    alert('Harap pilih tanggal.');
                    return;
                }
                if (!sesiIdStr) {
                    alert('Harap pilih sesi.');
                    return;
                }
                if (!jamAwal || !jamAkhir) {
                    alert('Jam akan terisi otomatis setelah memilih sesi.');
                    return;
                }

                const scheduleRef = database.ref(`kelompok/${kelompok}/${modul}`);
                
                // Ambil week dari database
                const weekFromDb = __ALL_DATA__.kelompok[kelompok][modul].week || null;
                const sessionsForDate = getSessionsForWeek(weekFromDb);
                const sesiObj = sessionsForDate.find(s => String(s.id) === String(sesiIdStr));
                
                if (!sesiObj) {
                    alert('Sesi tidak valid untuk tanggal yang dipilih.');
                    return;
                }
                
                const excludeKey = `${kelompok}/${modul}`;
                // Cek: modul yang sama (e.g. MP1) tidak boleh di sesi yang sama pada hari yang sama
                let sameModulInSession = false;
                for (const kId in __ALL_DATA__.kelompok){
                    const kg = __ALL_DATA__.kelompok[kId];
                    if (!kg[modul]) continue;
                    const j = kg[modul];
                    const key = `${kId}/${modul}`;
                    if (key === excludeKey) continue;
                    if (j['tanggal'] && j['tanggal'] !== 0 && j['jam-awal'] && j['jam-akhir']){
                        if (j['tanggal'] === tanggal && j['jam-awal'] === sesiObj.start && j['jam-akhir'] === sesiObj.end){
                            sameModulInSession = true;
                            break;
                        }
                    }
                }
                if (sameModulInSession){
                    alert(`${modul} sudah dijadwalkan di Sesi ${sesiObj.id} (${sesiObj.start}-${sesiObj.end}) pada tanggal ${tanggal} oleh kelompok lain. Satu modul hanya boleh satu kali per sesi per hari.`);
                    return;
                }
                // Cek kuota sesi (maks 3) untuk tanggal+sesi
                let used = 0;
                for (const kId in __ALL_DATA__.kelompok){
                    const kg = __ALL_DATA__.kelompok[kId];
                    for (const mId in kg){
                        if (!mId.startsWith('W') && !mId.startsWith('MP')) continue;
                        const j = kg[mId];
                        const key = `${kId}/${mId}`;
                        if (key === excludeKey) continue;
                        if (j['tanggal'] && j['tanggal'] !== 0 && j['jam-awal'] && j['jam-akhir']){
                            if (j['tanggal'] === tanggal && j['jam-awal'] === sesiObj.start && j['jam-akhir'] === sesiObj.end){
                                used++;
                            }
                        }
                    }
                }
                if (used >= 4){
                    alert(`Sesi ${sesiObj.id} (${sesiObj.start}-${sesiObj.end}) pada tanggal ${tanggal} sudah penuh. Pilih sesi lain.`);}
                    return;
                }

                // Show loading state
                btn.classList.add('loading');
                btn.disabled = true;
                const originalText = btn.textContent;
                btn.textContent = 'Menyimpan...';
                
                scheduleRef.update({
                    'jam-awal': sesiObj.start,
                    'jam-akhir': sesiObj.end,
                    'tanggal': tanggal || 0
                }).then(() => {
                    // Remove loading state
                    btn.classList.remove('loading');
                    btn.disabled = false;
                    btn.textContent = originalText;
                    // Update cache agar status langsung terbarui tanpa reload
                    if (__ALL_DATA__ && __ALL_DATA__.kelompok && __ALL_DATA__.kelompok[kelompok] && __ALL_DATA__.kelompok[kelompok][modul]){
                        __ALL_DATA__.kelompok[kelompok][modul]['jam-awal'] = sesiObj.start;
                        __ALL_DATA__.kelompok[kelompok][modul]['jam-akhir'] = sesiObj.end;
                        __ALL_DATA__.kelompok[kelompok][modul]['tanggal'] = tanggal || 0;
                    }
                    const toast = document.getElementById(`toast-${kelompok}-${modul}`);
                    if (toast){
                        toast.textContent = 'Jadwal tersimpan';
                        toast.style.display = 'block';
                        toast.classList.remove('error');
                        requestAnimationFrame(()=> toast.classList.add('show'));
                        setTimeout(()=>{ toast.classList.remove('show'); setTimeout(()=> toast.style.display = 'none', 200); }, 1600);
                    }
                }).catch((error) => {
                    // Remove loading state on error
                    btn.classList.remove('loading');
                    btn.disabled = false;
                    btn.textContent = originalText;
                    alert('Gagal menyimpan: ' + error.message);
                });
            } else if (cancelBtn) {
                const btn = cancelBtn;
                const { kelompok, modul } = btn.dataset;
                if (!confirm('Batalkan jadwal untuk modul ini? Jam dan tanggal akan dikosongkan.')) return;

                const scheduleRef = database.ref(`kelompok/${kelompok}/${modul}`);
                const toast = document.getElementById(`toast-${kelompok}-${modul}`);

                // GUNAKAN SATU OPERASI UPDATE UNTUK MENGHAPUS SEMUA FIELD
                scheduleRef.update({
                    'jam-awal': null,
                    'jam-akhir': null,
                    'tanggal': null
                }).then(() => {
                    // -- PROSES JIKA BERHASIL --

                    // 1. Reset tampilan antarmuka (UI)
                    document.getElementById(`jam-awal-${kelompok}-${modul}`).value = '';
                    document.getElementById(`jam-akhir-${kelompok}-${modul}`).value = '';
                    document.getElementById(`tanggal-${kelompok}-${modul}`).value = '';
                    document.getElementById(`sesi-${kelompok}-${modul}`).value = '';
                    const statusEl = document.getElementById(`sesi-status-${kelompok}-${modul}`);
                    const tersediaEl = document.getElementById(`sesi-tersedia-${kelompok}-${modul}`);
                    if (statusEl) statusEl.textContent = '';
                    if (tersediaEl) tersediaEl.textContent = 'Pilih tanggal untuk melihat sesi yang tersedia.';

                    // 2. Perbarui cache data lokal agar UI konsisten
                    if (__ALL_DATA__?.kelompok?.[kelompok]?.[modul]) {
                        delete __ALL_DATA__.kelompok[kelompok][modul]['jam-awal'];
                        delete __ALL_DATA__.kelompok[kelompok][modul]['jam-akhir'];
                        delete __ALL_DATA__.kelompok[kelompok][modul]['tanggal'];
                    }

                    // 3. Tampilkan notifikasi berhasil
                    if (toast) {
                        toast.textContent = 'Jadwal berhasil dibatalkan';
                        toast.style.display = 'block';
                        toast.classList.remove('error');
                        requestAnimationFrame(() => toast.classList.add('show'));
                        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.style.display = 'none', 200); }, 1400);
                    }
                }).catch((error) => {
                    // -- PROSES JIKA GAGAL --
                    console.error("Firebase update failed: ", error);
                    if (toast) {
                        toast.textContent = 'Gagal membatalkan di database. Coba lagi.';
                        toast.style.display = 'block';
                        toast.classList.add('error');
                        requestAnimationFrame(() => toast.classList.add('show'));
                        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.style.display = 'none', 200); }, 2000);
                    } else {
                        alert('Gagal membatalkan jadwal: ' + error.message);
                    }
                });
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            // Common UI handled by sidebar.js

            const loggedInNrp = localStorage.getItem('fislab-nrp');
            if (loggedInNrp) {
                database.ref('users/' + loggedInNrp).once('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        if (userData.role) {
                            localStorage.setItem('fislab-role', userData.role);
                        }
                        if (userData.role !== 'Asisten Laboratorium') {
                            alert('Halaman ini hanya untuk asisten laboratorium.');
                            window.location.href = 'jadwal.html';
                            return;
                        }

                        database.ref('/').once('value', (dbSnapshot) => {
                            if (dbSnapshot.exists()) {
                                displaySchedulingInterface(dbSnapshot.val(), loggedInNrp);
                            }
                        });
                    } else {
                        alert('Data pengguna tidak ditemukan.');
                        navLogout.click();
                    }
                });
            } else {
                alert('Anda belum login.');
                window.location.href = 'index.html';
            }
        });
    
