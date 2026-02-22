        const database = firebase.database();
    let __CURRENT_USER__ = null;

        // Event listener untuk tombol "Mulai"
        const mulaiBtn = document.getElementById('mulai-btn');
        if (mulaiBtn) {
            mulaiBtn.addEventListener('click', () => {
            const role = String((__CURRENT_USER__ && __CURRENT_USER__.role) || localStorage.getItem('fislab-role') || '').toLowerCase();
            let target = 'jadwal.html';
            if (role === 'Asisten Laboratorium') {
                target = 'penjadwal.html';
            } else if (role === 'Praktikan') {
                target = 'jadwal.html';
            }
            window.location.href = target;
            });
        }

    // Utilities untuk Chart
    let nilaiChartInstance = null;
    let chartDetailMap = {};
    function fmt(v) { return Number.isFinite(v) ? Number(v).toFixed(1) : '-'; }

    function getPrimaryGold() {
            const v = getComputedStyle(document.documentElement).getPropertyValue('--primary-gold');
            return (v && v.trim()) || '#3b82f6';
        }

    function getThemeForChart() {
            const canvas = document.getElementById('nilaiChart');
            const card = canvas?.closest('.chart-card') || document.body;
            const isDark = document.body.classList.contains('dark');
            const primaryGold = getPrimaryGold();
            const baseText = getComputedStyle(card).color || (isDark ? '#ffffff' : '#1a1a1a');
            const axis = isDark ? baseText : primaryGold; // force gold on light mode
            return {
                axisColor: axis,
                gridColor: colorToRgba(axis, isDark ? 0.15 : 0.25),
                avgBgColor: 'rgba(57, 180, 218, 0.7)', // fallback if needed
                avgBorderColor: 'rgba(207, 163, 72, 1)'
            };
        }

    // Convert CSS color string to rgba with custom alpha
    function colorToRgba(color, alpha = 1) {
            // rgb or rgba
            const m = String(color).trim().match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\)$/i);
            if (m) {
                const r = +m[1], g = +m[2], b = +m[3];
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            // hex #rgb or #rrggbb
            const hex = String(color).trim();
            if (/^#([0-9a-f]{3}){1,2}$/i.test(hex)) {
                let h = hex.substring(1);
                if (h.length === 3) h = h.split('').map(c => c + c).join('');
                const r = parseInt(h.substring(0,2),16);
                const g = parseInt(h.substring(2,4),16);
                const b = parseInt(h.substring(4,6),16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            // fallback
            return color;
        }

    function getDatasetColors() {
            const canvas = document.getElementById('nilaiChart');
            const card = canvas?.closest('.chart-card') || document.body;
            const isDark = document.body.classList.contains('dark');
            const textColor = getComputedStyle(card).color || (isDark ? '#fff' : '#000');
            const base = isDark ? textColor : getPrimaryGold();
            return { bg: colorToRgba(base, 0.7), border: colorToRgba(base, 1) };
        }

    function buildNilaiChart(ctx, labels, dataAvg) {
            const theme = getThemeForChart();
            const dsColors = getDatasetColors();
            if (nilaiChartInstance) {
                nilaiChartInstance.destroy();
            }
            nilaiChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
            datasets: [
            { label: 'Total akhir', data: dataAvg, backgroundColor: dsColors.bg, borderColor: dsColors.border, borderWidth: 1 }
            ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { labels: { color: theme.axisColor } },
                        tooltip: {
                            titleColor: theme.axisColor,
                            bodyColor: theme.axisColor,
                            footerColor: theme.axisColor,
                            callbacks: { title: (items) => items[0]?.label || '' }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: theme.axisColor, maxRotation: 0, autoSkip: true },
                            grid: { color: theme.gridColor },
                            border: { color: theme.axisColor },
                        },
                        y: {
                            beginAtZero: true,
                            suggestedMax: 100,
                            ticks: { color: theme.axisColor },
                            grid: { color: theme.gridColor },
                            border: { color: theme.axisColor }
                        }
                    }
                }
            });
        }

        function updateChartTheme() {
            if (!nilaiChartInstance) return;
            const theme = getThemeForChart();
            const opts = nilaiChartInstance.options;
            opts.plugins.legend.labels.color = theme.axisColor;
            opts.scales.x.ticks.color = theme.axisColor;
            opts.scales.x.grid.color = theme.gridColor;
            opts.scales.x.border = opts.scales.x.border || {};
            opts.scales.x.border.color = theme.axisColor;
            opts.scales.y.ticks.color = theme.axisColor;
            opts.scales.y.grid.color = theme.gridColor;
            opts.scales.y.border = opts.scales.y.border || {};
            opts.scales.y.border.color = theme.axisColor;
            // Tooltip text colors
            if (opts.plugins && opts.plugins.tooltip) {
                opts.plugins.tooltip.titleColor = theme.axisColor;
                opts.plugins.tooltip.bodyColor = theme.axisColor;
                opts.plugins.tooltip.footerColor = theme.axisColor;
            }
            // Update dataset colors to follow current text color
            const dsColors = getDatasetColors();
            nilaiChartInstance.data.datasets.forEach(ds => {
                ds.backgroundColor = dsColors.bg;
                ds.borderColor = dsColors.border;
            });
            nilaiChartInstance.update();
        }

    // Logika utama saat halaman dimuat
        document.addEventListener('DOMContentLoaded', () => {
            // 1. Cek apakah ada NRP yang tersimpan di localStorage
            const loggedInNrp = localStorage.getItem('fislab-nrp');

            if (loggedInNrp) {
                // 2. Jika ada, ambil data pengguna dari Firebase
                const userRef = database.ref('users/' + loggedInNrp);
                userRef.once('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        __CURRENT_USER__ = userData;
                        const welcomeTitle = document.getElementById('welcome-title');
                        const welcomeSubtitle = document.querySelector('.welcome-subtitle');
                        const chartSection = document.querySelector('.chart-card');

                        // 3. Ubah teks sapaan dengan nama pengguna
                        welcomeTitle.textContent = `Selamat Datang, ${userData.nama || 'Pengguna'}!`;
                        welcomeSubtitle.textContent = `Anda masuk sebagai ${userData.role || 'user'}. Silakan lanjutkan ke menu yang tersedia.`;

                        // Simpan role ke localStorage untuk digunakan oleh sidebar.js
                        if (userData.role) {
                            localStorage.setItem('fislab-role', userData.role);
                        }

                        // 4a. Jika role praktikan, ambil judulPraktikum dan nilai lalu render chart (rata-rata per modul)
                        if ((userData.role || '').toLowerCase() === 'praktikan') {
                            const chartSubtitle = document.getElementById('chart-subtitle');
                            // Ambil judul dan nilai dari ref spesifik untuk performa lebih baik
                            Promise.all([
                                database.ref('judulPraktikum').once('value'),
                                database.ref('users/' + loggedInNrp + '/nilai').once('value')
                            ]).then(([judulSnap, nilaiSnap]) => {
                                const judul = judulSnap.val() || {};
                                const nilai = nilaiSnap.val() || {};
                                // Susun label E1..En urut
                                const labels = Object.keys(judul).filter(k => /^W\d+|MP\d+$/i.test(k))
                                    .sort((a,b)=> parseInt(a.replace(/\D/g,'')) - parseInt(b.replace(/\D/g,'')));
                                if (labels.length === 0) { chartSubtitle.textContent = 'Belum ada judul praktikum.'; return; }
                                // 9 aspek berbobot (sinkron dengan penilaian.html)
                                const ASPEK = [
                                    { key: 'pre-lab', label: 'Pre-lab', weight: 10 },
                                    { key: 'in-lab', label: 'In-lab', weight: 10 },
                                    { key: 'abstrak', label: 'Abstrak', weight: 5 },
                                    { key: 'pendahuluan', label: 'Pendahuluan', weight: 10 },
                                    { key: 'metodologi', label: 'Metodologi', weight: 5 },
                                    { key: 'analisis data dan perhitungan', label: 'Analisis data dan perhitungan', weight: 20 },
                                    { key: 'pembahasan', label: 'Pembahasan', weight: 25 },
                                    { key: 'kesimpulan', label: 'Kesimpulan', weight: 10 },
                                    { key: 'format', label: 'Format', weight: 5 },
                                ];
                                // Siapkan detail nilai dan total berbobot per modul
                                const detailMap = {};
                                const dataAvg = labels.map(mid => {
                                    let total = 0; let any = false;
                                    const detail = {};
                                    for (const a of ASPEK) {
                                        const v = parseFloat(nilai[mid]?.[a.key]);
                                        detail[a.key] = Number.isFinite(v) ? v : null;
                                        if (Number.isFinite(v)) { total += v * a.weight / 100; any = true; }
                                    }
                                    // Plagiasi/AI deduction (0-100%)
                                    const plg = parseFloat(nilai[mid]?.['plagiasi, dan tidak bisa mengurai AI']);
                                    const plgPct = Number.isFinite(plg) ? Math.max(0, Math.min(100, plg)) : 0;
                                    const finalTotal = any ? total * (1 - plgPct/100) : null;
                                    detail._plgPct = plgPct;
                                    detailMap[mid] = detail;
                                    return finalTotal;
                                });
                                chartDetailMap = detailMap;

                                // Tampilkan kode modul sebagai label. Tooltip akan menampilkan nama lengkap
                                const ctx = document.getElementById('nilaiChart').getContext('2d');
                                buildNilaiChart(ctx, labels, dataAvg);
                                chartSubtitle.textContent = 'Sentuh/hover untuk detail.';

                                // Tooltip: judul modul + breakdown nilai
                                if (nilaiChartInstance) {
                                    nilaiChartInstance.options.plugins.tooltip.callbacks = {
                                        title: (items) => {
                                            const idx = items?.[0]?.dataIndex ?? 0;
                                            const mid = labels[idx];
                                            const name = judul[mid]?.namaJudul || '';
                                            return name ? `${mid} • ${name}` : mid;
                                        },
                                        label: (ctx) => `Total akhir: ${fmt(ctx.parsed.y)}`,
                                        afterBody: (items) => {
                                            const idx = items?.[0]?.dataIndex ?? 0;
                                            const mid = labels[idx];
                                            const d = chartDetailMap[mid] || {};
                                            const lines = [
                                                `Pre-lab (10%): ${fmt(d['pre-lab'])}`,
                                                `In-lab (10%): ${fmt(d['in-lab'])}`,
                                                `Abstrak (5%): ${fmt(d['abstrak'])}`,
                                                `Pendahuluan (10%): ${fmt(d['pendahuluan'])}`,
                                                `Metodologi (5%): ${fmt(d['metodologi'])}`,
                                                `Analisis+Perhitungan (20%): ${fmt(d['analisis data dan perhitungan'])}`,
                                                `Pembahasan (25%): ${fmt(d['pembahasan'])}`,
                                                `Kesimpulan (10%): ${fmt(d['kesimpulan'])}`,
                                                `Format (5%): ${fmt(d['format'])}`
                                            ];
                                            const plgPct = Number.isFinite(d._plgPct) ? d._plgPct : 0;
                                            lines.push(`Plagiasi/AI: ${fmt(plgPct)}%`);
                                            return lines;
                                        }
                                    };
                                    nilaiChartInstance.update();
                                }

                                // Re-theme chart saat toggle mode gelap
                                const toggleBtn = document.getElementById('mode-toggle');
                                if (toggleBtn) {
                                    toggleBtn.addEventListener('click', () => {
                                        // tunggu class body.dark berubah oleh sidebar.js
                                        setTimeout(updateChartTheme, 0);
                                    });
                                }
                            }).catch((error) => {
                                console.error('Error loading chart data:', error);
                                chartSubtitle.textContent = 'Error memuat data.';
                            });
                        }

                        // 4b. Jika role asisten laboratorium, sembunyikan chart dan tampilkan fitur kehadiran
                        if ((userData.role || '').toLowerCase() === 'asisten laboratorium') {
                            if (chartSection) chartSection.style.display = 'none';
                            const attnSection = document.querySelector('.attendance-card');
                            const attnKelompok = document.getElementById('attn-kelompok');
                            const attnTanggal = document.getElementById('attn-tanggal');
                            const attnTableBody = document.querySelector('#attendance-table tbody');
                            const btnSave = document.getElementById('attn-save');
                            const btnReset = document.getElementById('attn-reset');

                            if (attnSection) attnSection.style.display = 'block';

                            // Modul asisten dari cache login (users/<nrp>/judul), sama seperti penilaian.js
                            const asistenJudul = userData.judul;
                            const assignedModules = Array.isArray(asistenJudul)
                                ? asistenJudul
                                : (typeof asistenJudul === 'string' && asistenJudul.trim() ? [asistenJudul.trim()] : []);
                            const modulId = assignedModules[0] || null;

                            // Optimasi: Ambil data dari ref spesifik untuk performa lebih baik
                            Promise.all([
                                database.ref('kelompok').once('value'),
                                database.ref('judulPraktikum').once('value'),
                                database.ref('users').once('value')
                            ]).then(([kelompokSnap, judulSnap, usersSnap]) => {
                                const kelompok = kelompokSnap.val() || {};
                                const judulPraktikum = judulSnap.val() || {};
                                const users = usersSnap.val() || {};
                                const assistantNrp = userData.nrp || loggedInNrp;

                                // Kelompok yang memiliki modul asisten ini dengan aslab mencakup NRP asisten
                                const matchingKelompok = modulId
                                    ? Object.keys(kelompok).filter(kId => {
                                        const k = kelompok[kId];
                                        return k[modulId] && Array.isArray(k[modulId].aslab) && k[modulId].aslab.includes(assistantNrp);
                                    })
                                    : [];
                                attnKelompok.innerHTML = '<option value="">Pilih Kelompok</option>' + matchingKelompok.map(kId => `<option value="${kId}">${kId}</option>`).join('');

                                function renderTableFromUsers() {
                                    const kId = attnKelompok.value;
                                    const tanggal = attnTanggal.value;
                                    attnTableBody.innerHTML = '';
                                    if (!kId || !modulId || !tanggal) return;
                                    // Ambil semua praktikan users.* dengan kelompokId === kId
                                    const praktikanList = Object.values(users).filter(u => 
                                        u.role === 'Praktikan' && 
                                        (u.kelompokId || '').trim().toLowerCase() === kId.trim().toLowerCase()
                                    );
                                    // Ambil kehadiran terkini dari Firebase (hindari snapshot root yang stale)
                                    database.ref(`absensi/${kId}/${modulId}/${tanggal}`).once('value', (attnSnap) => {
                                        const attnData = attnSnap.val() || {};
                                        for (const u of praktikanList) {
                                            const existing = attnData[u.nrp] || 'tanpa-keterangan';
                                            const tr = document.createElement('tr');
                                            tr.innerHTML = `
                                                <td>${u.nrp}</td>
                                                <td>${u.nama || ''}</td>
                                                <td>
                                                    <div class="status-radio" role="group" aria-label="Status kehadiran">
                                                        ${['hadir','sakit','izin','tanpa-keterangan'].map(s => `
                                                            <label><input type="radio" name="status-${u.nrp}" value="${s}" ${existing===s?'checked':''}/> ${s.replace('-', ' ')}</label>
                                                        `).join('')}
                                                    </div>
                                                </td>`;
                                            attnTableBody.appendChild(tr);
                                        }
                                    });
                                }

                                attnKelompok.addEventListener('change', () => { attnTableBody.innerHTML = ''; renderTableFromUsers(); });
                                attnTanggal.addEventListener('change', renderTableFromUsers);

                                btnReset?.addEventListener('click', () => {
                                    const kId = attnKelompok.value;
                                    const tanggal = attnTanggal.value;
                                    if (!kId || !modulId || !tanggal) { alert('Pilih Kelompok dan Tanggal.'); return; }
                                    if (!confirm('Hapus data kehadiran untuk tanggal ini?')) return;
                                    const ref = database.ref(`absensi/${kId}/${modulId}/${tanggal}`);
                                    ref.remove().then(() => {
                                        // Bersihkan pilihan di UI dan reload dari DB untuk memastikan kosong
                                        attnTableBody.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
                                        renderTableFromUsers();
                                        alert('Data kehadiran telah dihapus.');
                                    }).catch(err => alert('Gagal menghapus: ' + err.message));
                                });

                                btnSave?.addEventListener('click', () => {
                                    const kId = attnKelompok.value;
                                    const tanggal = attnTanggal.value;
                                    if (!kId || !modulId || !tanggal) { alert('Pilih Kelompok dan Tanggal.'); return; }
                                    const rows = Array.from(attnTableBody.querySelectorAll('tr'));
                                    const payload = {};
                                    for (const row of rows) {
                                        const nrp = row.children[0].textContent.trim();
                                        const sel = row.querySelector('input[type="radio"]:checked');
                                        payload[nrp] = sel ? sel.value : 'tanpa-keterangan';
                                    }
                                    const ref = database.ref(`absensi/${kId}/${modulId}/${tanggal}`);
                                    // Show loading state
                                    btnSave.classList.add('loading');
                                    btnSave.disabled = true;
                                    const originalText = btnSave.textContent;
                                    btnSave.textContent = 'Menyimpan...';
                                    
                                    ref.set(payload).then(() => {
                                        btnSave.classList.remove('loading');
                                        btnSave.disabled = false;
                                        btnSave.textContent = originalText;
                                        alert('Kehadiran tersimpan');
                                    }).catch(err => {
                                        btnSave.classList.remove('loading');
                                        btnSave.disabled = false;
                                        btnSave.textContent = originalText;
                                        alert('Gagal menyimpan: ' + err.message);
                                    });
                                });
                            }).catch((error) => {
                                console.error('Error loading attendance data:', error);
                                alert('Error memuat data kehadiran.');
                            });
                        } else {

                            // Sembunyikan kehadiran untuk non-asisten
                            const attnSection = document.querySelector('.attendance-card');
                            if (attnSection) attnSection.style.display = 'none';
                        }
                    } else {
                        // Jika NRP ada tapi data tidak ditemukan di database
                        alert('Data pengguna tidak ditemukan. Silakan login kembali.');
                        window.location.href = 'index.html';
                    }
                });
            } else {
                // 4. Jika tidak ada NRP, paksa pengguna untuk login
                alert('Anda belum login. Silakan login terlebih dahulu.');
                window.location.href = 'index.html';
            }
        });

        // Bug report: send WhatsApp message with prefilled context
        document.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('bug-send');
            const ta = document.getElementById('bug-message');
            if (!btn || !ta) return;
            btn.addEventListener('click', () => {
                const base = (ta.value || '').trim();
                if (!base) { alert('Tulis deskripsi bug terlebih dahulu.'); return; }
                const u = __CURRENT_USER__ || {};
                const nama = u.nama || '-';
                const nrp = u.nrp || localStorage.getItem('fislab-nrp') || '-';
                const role = u.role || localStorage.getItem('fislab-role') || '-';
                const page = 'home.html';
                const when = new Date().toLocaleString();
                const msg = `Laporan Bug FISLAB II\n\nNama: ${nama}\nNRP: ${nrp}\nRole: ${role}\nWaktu: ${when}\n\nDeskripsi:\n${base}`;
                const phone = '6281393516150';
                const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                window.open(url, '_blank');
            });
        });
