    const database = firebase.database();

    // Sidebar visibility handled in sidebar.js

    // Globals for view/state
    let gAllData = null;
    let gUserData = null;
    let gRole = '';
    let gSelectedKelompokId = '';
    let viewMode = localStorage.getItem('fislab-jadwal-view') || 'list'; // 'list' | 'calendar'
    const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const DOW_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    let cur = new Date();
    let curMonth = cur.getMonth();
    let curYear = cur.getFullYear();
    // Penyesuaian minggu: hanya geser label minggu 2 s.d. 6 (+1). Minggu lain tetap.
    // Urutan internal tetap memakai minggu asli agar konsisten.
    let gWeekOffset = 0; // masih bisa dipakai jika ingin offset global tambahan (optional)
    function rawWeek(j){ return (j && typeof j.week === 'number') ? j.week : 0; }
    function displayWeek(j){
        const w = rawWeek(j);
         // geser khusus minggu 2-6 (untuk pengubahan bisa disini)
        return w + gWeekOffset; // minggu lain tidak berubah
    }
        
    function displayUserSchedule(allData, userData, selectedKelompokId) {
            const { kelompok, judulPraktikum, users } = allData;
            const scheduleGrid = document.getElementById('schedule-grid');
            const pageSubtitle = document.getElementById('page-subtitle');
            // Normalisasi kelompokId: convert "Kelompok 11" menjadi "kelompok 11"
            const rawKelompokId = selectedKelompokId || userData.kelompokId;
            const userKelompokId = rawKelompokId ? rawKelompokId.toLowerCase() : '';
            if (!userKelompokId || !kelompok[userKelompokId]) {
                if ((userData.role || '').toLowerCase() === 'asisten laboratorium' && !selectedKelompokId) {
                    pageSubtitle.textContent = 'Pilih kelompok untuk melihat jadwal.';
                    scheduleGrid.innerHTML = '';
                } else {
                    pageSubtitle.textContent = 'Anda tidak terdaftar di kelompok manapun.';
                    scheduleGrid.innerHTML = '<p>Silakan hubungi asisten laboratorium untuk informasi lebih lanjut.</p>';
                }
                return;
            }

            const userSchedule = kelompok[userKelompokId];
            pageSubtitle.textContent = `Jadwal untuk ${userSchedule.namaKelompok}`;
            scheduleGrid.innerHTML = ''; // Clear loading text

            const modulIds = Object.keys(userSchedule)
                .filter((k) => k.startsWith('W') || k.startsWith('MP'))
                .sort((a, b) => {
                    // tetap pakai minggu asli untuk urutan
                    const wa = rawWeek(userSchedule[a]);
                    const wb = rawWeek(userSchedule[b]);
                    return wa - wb;
                });

            for (const modulId of modulIds) {
                const jadwal = userSchedule[modulId];
                    const asistenNrp = jadwal.aslab[0];
                    const asistenNama = users[asistenNrp] ? users[asistenNrp].nama : 'N/A';
                    const modulNama = judulPraktikum[modulId] ? judulPraktikum[modulId].namaJudul : 'Nama Modul Tidak Ditemukan';

                    const tanggalText = (jadwal['tanggal'] && jadwal['tanggal'] !== 0) ? jadwal['tanggal'] : null;
                    const timeInfo = (jadwal['jam-awal'] && jadwal['jam-akhir']) 
                        ? `<div class="schedule-time"><strong>${jadwal['jam-awal']} - ${jadwal['jam-akhir']}${tanggalText ? ` | ${tanggalText}` : ''}</strong></div>`
                        : `<div class="schedule-time not-set"><strong>Jadwal Belum Ditentukan${tanggalText ? ` | ${tanggalText}` : ''}</strong></div>`;

                    const cardHTML = `
                        <div class="schedule-card">
                            <div class="schedule-header">
                                <div class="schedule-icon">${modulId}</div>
                                <div class="schedule-title">
                                    <h3>${modulNama}</h3>
                                    <p>Minggu ke-${displayWeek(jadwal)}</p>
                                </div>
                            </div>
                            <div class="schedule-details">
                                <div class="schedule-item">
                                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                    <span>Asisten: ${asistenNama}</span>
                                </div>
                            </div>
                            ${timeInfo}
                        </div>`;
                    scheduleGrid.innerHTML += cardHTML;
            }
        }

        function parseDateFlexible(input) {
            if (!input || input === 0) return null;
            if (typeof input === 'number') {
                // assume epoch ms or yyyymmdd? If it's <= 10^12, treat as ms; else ignore
                const d = new Date(input);
                return isNaN(d) ? null : d;
            }
            if (typeof input !== 'string') return null;
            // Try ISO first
            let d = new Date(input);
            if (!isNaN(d)) return d;
            // Try DD-MM-YYYY or DD/MM/YYYY
            const m = input.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (m) {
                const dd = parseInt(m[1], 10);
                const mm = parseInt(m[2], 10) - 1;
                const yy = parseInt(m[3], 10);
                d = new Date(yy, mm, dd);
                return isNaN(d) ? null : d;
            }
            return null;
        }

        function collectEventsForMonth(month, year) {
            // returns map: yyyy-mm-dd => [event]
            const res = {};
            if (!gAllData || !gAllData.kelompok) return res;
            const role = (gRole || '').toLowerCase();
            const forAll = role === 'asisten laboratorium';
            const targets = forAll
                ? Object.keys(gAllData.kelompok)
                : (gUserData && gUserData.kelompokId ? [gUserData.kelompokId] : []);
            for (const kid of targets) {
                const k = gAllData.kelompok[kid];
                if (!k) continue;
                for (const key of Object.keys(k)) {
                    if (!key.startsWith('E')) continue;
                    const jadwal = k[key] || {};
                    const d = parseDateFlexible(jadwal['tanggal']);
                    if (!d || d.getMonth() !== month || d.getFullYear() !== year) continue;
                    const pad = (n) => (n < 10 ? '0' + n : '' + n);
                    const dtKey = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
                    const asistenNrp = (jadwal.aslab && jadwal.aslab[0]) ? jadwal.aslab[0] : '';
                    const asistenNama = (gAllData.users && gAllData.users[asistenNrp]) ? gAllData.users[asistenNrp].nama : 'N/A';
                    const modulNama = (gAllData.judulPraktikum && gAllData.judulPraktikum[key]) ? gAllData.judulPraktikum[key].namaJudul : key;
                    const event = {
                        kelompokId: kid,
                        kelompokNama: k.namaKelompok || kid,
                        modulId: key,
                        modulNama,
                        jamAwal: jadwal['jam-awal'] || '',
                        jamAkhir: jadwal['jam-akhir'] || '',
                        asistenNama
                    };
                    if (!res[dtKey]) res[dtKey] = [];
                    res[dtKey].push(event);
                }
            }
            return res;
        }

        function buildCalendar(month, year) {
            const grid = document.getElementById('calendar-grid');
            const title = document.getElementById('calendar-title');
            const pageSubtitle = document.getElementById('page-subtitle');
            grid.innerHTML = '';
            title.textContent = `${MONTH_NAMES[month]} ${year}`;
            pageSubtitle.textContent = `Kalender jadwal bulan ${MONTH_NAMES[month]} ${year}`;

            // DOW header
            for (let i = 0; i < 7; i++) {
                const h = document.createElement('div');
                h.className = 'calendar-dow';
                h.textContent = DOW_SHORT[i];
                grid.appendChild(h);
            }

            const firstDay = new Date(year, month, 1);
            const startDow = firstDay.getDay(); // 0=Sun
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const prevMonthDays = new Date(year, month, 0).getDate();

            const events = collectEventsForMonth(month, year);
            const today = new Date();

            // leading days from prev month
            for (let i = 0; i < startDow; i++) {
                const d = document.createElement('div');
                d.className = 'calendar-day not-in-month';
                d.innerHTML = `<div class="date-num">${prevMonthDays - startDow + 1 + i}</div>`;
                grid.appendChild(d);
            }

            const pad = (n) => (n < 10 ? '0' + n : '' + n);
            for (let day = 1; day <= daysInMonth; day++) {
                const dEl = document.createElement('div');
                dEl.className = 'calendar-day';
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                if (isToday) dEl.classList.add('today');
                dEl.innerHTML = `<div class="date-num">${day}</div>`;
                const key = `${year}-${pad(month+1)}-${pad(day)}`;
                if (events[key] && events[key].length) {
                    dEl.classList.add('has-events');
                    dEl.setAttribute('role', 'button');
                    dEl.setAttribute('tabindex', '0');
                    dEl.setAttribute('aria-label', `Jadwal pada tanggal ${day} ${MONTH_NAMES[month]} ${year}`);
                    dEl.addEventListener('click', () => openEventsModal(key, events[key], month, year, day));
                    dEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') openEventsModal(key, events[key], month, year, day); });
                }
                grid.appendChild(dEl);
            }

            // trailing days to fill weeks (optional)
            const cellsSoFar = 7 + startDow + daysInMonth; // header+days
            const remainder = cellsSoFar % 7;
            if (remainder !== 0) {
                const need = 7 - remainder;
                for (let i = 1; i <= need; i++) {
                    const d = document.createElement('div');
                    d.className = 'calendar-day not-in-month';
                    d.innerHTML = `<div class=\"date-num\">${i}</div>`;
                    grid.appendChild(d);
                }
            }
        }

        function openEventsModal(key, list, month, year, day) {
            const overlay = document.getElementById('jadwal-modal');
            const title = document.getElementById('jadwal-modal-title');
            const body = document.getElementById('jadwal-modal-body');
            title.textContent = `Jadwal ${day} ${MONTH_NAMES[month]} ${year}`;
            if (!list || !list.length) {
                body.innerHTML = '<p>Tidak ada jadwal.</p>';
            } else {
                const role = (gRole || '').toLowerCase();
                body.innerHTML = '<ul style="padding-left: 18px;">' + list.map(ev => {
                    const waktu = (ev.jamAwal && ev.jamAkhir) ? `${ev.jamAwal} - ${ev.jamAkhir}` : 'Waktu belum ditentukan';
                    if (role === 'asisten laboratorium') {
                        return `<li><strong>${ev.kelompokNama}</strong> — ${ev.modulNama} (${waktu}) • Asisten: ${ev.asistenNama}</li>`;
                    }
                    return `<li>${ev.modulNama} (${waktu}) • Asisten: ${ev.asistenNama}</li>`;
                }).join('') + '</ul>';
            }
            overlay.style.display = 'flex';
            overlay.setAttribute('aria-hidden', 'false');
        }

        function closeEventsModal() {
            const overlay = document.getElementById('jadwal-modal');
            overlay.style.display = 'none';
            overlay.setAttribute('aria-hidden', 'true');
        }

        function updateViewModeUI() {
            const toggleBtn = document.getElementById('view-mode-toggle');
            const grid = document.getElementById('schedule-grid');
            const cal = document.getElementById('calendar-container');
            const asCtrl = document.getElementById('asisten-controls');
            if (viewMode === 'calendar') {
                toggleBtn.classList.add('active');
                toggleBtn.setAttribute('aria-label', 'Kembali ke tampilan daftar');
                grid.style.display = 'none';
                cal.classList.add('active');
                // Asisten: kalender menampilkan semua kelompok; hapus kontrol pilih kelompok
                if ((gRole || '').toLowerCase() === 'asisten laboratorium' && asCtrl) {
                    asCtrl.remove();
                }
                buildCalendar(curMonth, curYear);
            } else {
                toggleBtn.classList.remove('active');
                toggleBtn.setAttribute('aria-label', 'Buka mode kalender');
                cal.classList.remove('active');
                grid.style.display = '';
                // Tampilkan kembali kontrol asisten jika role asisten (buat ulang jika hilang)
                if ((gRole || '').toLowerCase() === 'asisten laboratorium') {
                    ensureAsistenControls();
                }
                // refresh list view
                if (gAllData && gUserData) {
                    displayUserSchedule(gAllData, gUserData, gSelectedKelompokId);
                }
            }
        }

        function ensureAsistenControls() {
            if ((gRole || '').toLowerCase() !== 'asisten laboratorium') return;
            let ctrl = document.getElementById('asisten-controls');
            if (!ctrl) {
                // create block and insert before schedule grid
                const container = document.createElement('div');
                container.id = 'asisten-controls';
                container.className = 'attendance-controls';
                const inner = document.createElement('div');
                inner.className = 'jadwal-kelompok';
                inner.innerHTML = '<label for="kelompok-select">Pilih Kelompok</label>\n<select id="kelompok-select"><option value="">Pilih Kelompok</option></select>';
                container.appendChild(inner);
                const grid = document.getElementById('schedule-grid');
                grid.parentNode.insertBefore(container, grid);
                ctrl = container;
            }
            // populate select
            const sel = document.getElementById('kelompok-select');
            if (!sel) return;
            const allKel = Object.keys((gAllData && gAllData.kelompok) || {}).sort();
            sel.innerHTML = '<option value="">Pilih Kelompok</option>' + allKel.map(k => {
                const name = (gAllData.kelompok[k] && gAllData.kelompok[k].namaKelompok) ? ` - ${gAllData.kelompok[k].namaKelompok}` : '';
                return `<option value="${k}">${k}${name}</option>`;
            }).join('');
            if (gSelectedKelompokId && allKel.includes(gSelectedKelompokId)) {
                sel.value = gSelectedKelompokId;
            } else if (allKel.length) {
                sel.value = allKel[0];
                gSelectedKelompokId = sel.value;
            }
            // bind listener (remove old first by cloning)
            const newSel = sel.cloneNode(true);
            sel.parentNode.replaceChild(newSel, sel);
            newSel.addEventListener('change', () => {
                gSelectedKelompokId = newSel.value;
                if (viewMode === 'list') displayUserSchedule(gAllData, gUserData, newSel.value);
            });
        }

        document.addEventListener('DOMContentLoaded', () => {
            // Common UI handled by sidebar.js

            const loggedInNrp = localStorage.getItem('fislab-nrp');
            if (loggedInNrp) {
                database.ref('users/' + loggedInNrp).once('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        gUserData = userData;
                        if (userData.role) {
                            localStorage.setItem('fislab-role', userData.role);
                        }
                        database.ref('/').once('value', (dbSnapshot) => {
                            if (dbSnapshot.exists()) {
                                const allData = dbSnapshot.val();
                                // Ambil offset minggu dari config jika ada
                                if (allData.config && typeof allData.config.weekOffset === 'number') {
                                    gWeekOffset = allData.config.weekOffset; // ditambahkan ke perhitungan displayWeek
                                }
                                gAllData = allData;
                                const role = (userData.role || '').toLowerCase();
                                gRole = role;
                                // Hook up calendar controls now that data is ready
                                const btn = document.getElementById('view-mode-toggle');
                                const calPrev = document.getElementById('cal-prev');
                                const calNext = document.getElementById('cal-next');
                                const calToday = document.getElementById('cal-today');
                                btn.addEventListener('click', () => {
                                    viewMode = (viewMode === 'list') ? 'calendar' : 'list';
                                    localStorage.setItem('fislab-jadwal-view', viewMode);
                                    updateViewModeUI();
                                });
                                calPrev.addEventListener('click', () => { curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; } buildCalendar(curMonth, curYear); });
                                calNext.addEventListener('click', () => { curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; } buildCalendar(curMonth, curYear); });
                                calToday.addEventListener('click', () => { const t=new Date(); curMonth=t.getMonth(); curYear=t.getFullYear(); buildCalendar(curMonth, curYear); });
                                document.getElementById('jadwal-modal-close').addEventListener('click', closeEventsModal);
                                document.getElementById('jadwal-modal').addEventListener('click', (e)=>{ if (e.target.id==='jadwal-modal') closeEventsModal(); });
                                if (role === 'asisten laboratorium') {
                                    // Buat kontrol pilih kelompok hanya bila di list mode
                                    if (viewMode === 'list') {
                                        ensureAsistenControls();
                                        // initial render list with current selection
                                        displayUserSchedule(allData, userData, gSelectedKelompokId);
                                    } else {
                                        // calendar mode: pastikan kontrol tidak ada
                                        const ctrl = document.getElementById('asisten-controls');
                                        if (ctrl) ctrl.remove();
                                    }
                                } else {
                                    // Praktikan: hapus kontrol pilih kelompok dan tampilkan hanya kelompok sendiri
                                    const ctrl = document.getElementById('asisten-controls');
                                    if (ctrl) ctrl.remove();
                                    displayUserSchedule(allData, userData);
                                }
                                // Apply initial view mode
                                updateViewModeUI();
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
