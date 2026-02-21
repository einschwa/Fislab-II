const database = firebase.database();

// ====== Auth Guard: Hanya Admin Asisten Laboratorium ======
function ensureAdminOrRedirect() {
    const loggedInNrp = localStorage.getItem('fislab-nrp');
    if (!loggedInNrp) {
        alert('Anda belum login.');
        window.location.href = 'index.html';
        return Promise.reject(new Error('Not logged in'));
    }
    return database.ref('users/' + loggedInNrp).once('value').then((snap) => {
        if (!snap.exists()) {
            alert('Data pengguna tidak ditemukan.');
            window.location.href = 'index.html';
            throw new Error('User not found');
        }
        const user = snap.val() || {};
        if (user.role) {
            localStorage.setItem('fislab-role', user.role);
        }
        const isAsisten = String(user.role || '').toLowerCase() === 'asisten laboratorium';
        const isAdmin = !!user.admin;
        if (!isAsisten || !isAdmin) {
            alert('Akses ditolak. Laman khusus Admin.');
            window.location.href = 'home.html';
            throw new Error('Not admin');
        }
        // Tandai admin di localStorage untuk pemakaian lain bila perlu
        localStorage.setItem('fislab-admin', 'true');
        return { user, nrp: loggedInNrp };
    });
}

// ====== Konfigurasi aspek & pembantu nilai ======
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

const MODULE_KEYS = ['MP1', 'MP2', 'MP3', 'MP4', 'MP5', 'W1', 'W2', 'W3', 'W4', 'W5'];

function computeFinalTotal(n) {
    if (!n) return null;
    let total = 0;
    let hasAnyPositive = false;
    for (const a of ASPEK) {
        const val = parseFloat(n[a.key]);
        // Nilai nol atau kosong TIDAK dihitung sebagai nilai terisi
        if (!isNaN(val) && val > 0) {
            total += (val * a.weight) / 100;
            hasAnyPositive = true;
        }
    }
    if (!hasAnyPositive) return null;
    const plg = parseFloat(n['plagiasi, dan tidak bisa mengurai AI']);
    const plgPct = isNaN(plg) ? 0 : Math.max(0, Math.min(100, plg));
    const finalTotal = total * (1 - plgPct / 100);
    // Jika total akhir nol atau negatif, anggap tidak ada nilai
    if (!isFinite(finalTotal) || finalTotal <= 0) return null;
    return +finalTotal.toFixed(2);
}

function fmtNumber(v) {
    if (v === null || v === undefined || isNaN(v)) return '-';
    return Number(v).toFixed(2);
}

function fmtDetail(v) {
    if (v === null || v === undefined || isNaN(v)) return '-';
    return Number(v).toFixed(1);
}

function escAttr(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

// ====== Chart helpers (tema mengikuti dark mode) ======
let studentChartInstance = null;
let studentChartDetailMap = {};

function getPrimaryGold() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--primary-gold');
    return (v && v.trim()) || '#3b82f6';
}

function colorToRgba(color, alpha = 1) {
    const m = String(color).trim().match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\)$/i);
    if (m) {
        const r = +m[1], g = +m[2], b = +m[3];
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const hex = String(color).trim();
    if (/^#([0-9a-f]{3}){1,2}$/i.test(hex)) {
        let h = hex.substring(1);
        if (h.length === 3) h = h.split('').map((c) => c + c).join('');
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
}

function getStudentChartTheme() {
    const canvas = document.getElementById('studentChart');
    const card = canvas?.closest('.admin-modal-section') || document.body;
    const isDark = document.body.classList.contains('dark');
    const primaryGold = getPrimaryGold();
    const baseText = getComputedStyle(card).color || (isDark ? '#ffffff' : '#1a1a1a');
    const axis = isDark ? baseText : primaryGold;
    return {
        axisColor: axis,
        gridColor: colorToRgba(axis, isDark ? 0.15 : 0.25),
    };
}

function getStudentDatasetColors() {
    const canvas = document.getElementById('studentChart');
    const card = canvas?.closest('.admin-modal-section') || document.body;
    const isDark = document.body.classList.contains('dark');
    const textColor = getComputedStyle(card).color || (isDark ? '#fff' : '#000');
    const base = isDark ? textColor : getPrimaryGold();
    return {
        bg: colorToRgba(base, 0.7),
        border: colorToRgba(base, 1),
    };
}

function buildStudentChart(labels, data) {
    const canvas = document.getElementById('studentChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const theme = getStudentChartTheme();
    const colors = getStudentDatasetColors();
    if (studentChartInstance) {
        studentChartInstance.destroy();
    }
    studentChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Total Akhir',
                    data,
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    borderWidth: 1,
                },
            ],
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
                    callbacks: {
                        title: (items) => {
                            const it = items && items[0];
                            if (!it) return '';
                            const label = it.label || '';
                            const v = it.parsed && typeof it.parsed.y === 'number' ? it.parsed.y : NaN;
                            return `${label} • Total akhir: ${fmtNumber(v)}`;
                        },
                        // Detail lengkap dipindah ke afterBody
                        label: () => '',
                        afterBody: (items) => {
                            const it = items && items[0];
                            if (!it) return [];
                            const mid = it.label;
                            const d = studentChartDetailMap[mid] || {};
                            const lines = [
                                `Pre-lab (10%): ${fmtDetail(d['pre-lab'])}`,
                                `In-lab (10%): ${fmtDetail(d['in-lab'])}`,
                                `Abstrak (5%): ${fmtDetail(d['abstrak'])}`,
                                `Pendahuluan (10%): ${fmtDetail(d['pendahuluan'])}`,
                                `Metodologi (5%): ${fmtDetail(d['metodologi'])}`,
                                `Analisis+Perhitungan (20%): ${fmtDetail(d['analisis data dan perhitungan'])}`,
                                `Pembahasan (25%): ${fmtDetail(d['pembahasan'])}`,
                                `Kesimpulan (10%): ${fmtDetail(d['kesimpulan'])}`,
                                `Format (5%): ${fmtDetail(d['format'])}`,
                            ];
                            const plgPct = d._plgPct;
                            if (plgPct !== null && plgPct !== undefined && !isNaN(plgPct)) {
                                lines.push(`Plagiasi/AI: ${fmtDetail(plgPct)}%`);
                            }
                            const asistenLabel = d._byLabel || '-';
                            lines.push(`Asisten penilai: ${asistenLabel}`);
                            return lines;
                        },
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: theme.axisColor },
                    grid: { color: theme.gridColor },
                    border: { color: theme.axisColor },
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 100,
                    ticks: { color: theme.axisColor },
                    grid: { color: theme.gridColor },
                    border: { color: theme.axisColor },
                },
            },
        },
    });
}

function updateStudentChartTheme() {
    if (!studentChartInstance) return;
    const theme = getStudentChartTheme();
    const colors = getStudentDatasetColors();
    const opts = studentChartInstance.options;
    if (opts.plugins && opts.plugins.legend && opts.plugins.legend.labels) {
        opts.plugins.legend.labels.color = theme.axisColor;
    }
    if (opts.plugins && opts.plugins.tooltip) {
        opts.plugins.tooltip.titleColor = theme.axisColor;
        opts.plugins.tooltip.bodyColor = theme.axisColor;
    }
    if (opts.scales && opts.scales.x && opts.scales.y) {
        opts.scales.x.ticks.color = theme.axisColor;
        opts.scales.x.grid.color = theme.gridColor;
        opts.scales.x.border = opts.scales.x.border || {};
        opts.scales.x.border.color = theme.axisColor;
        opts.scales.y.ticks.color = theme.axisColor;
        opts.scales.y.grid.color = theme.gridColor;
        opts.scales.y.border = opts.scales.y.border || {};
        opts.scales.y.border.color = theme.axisColor;
    }
    studentChartInstance.data.datasets.forEach((ds) => {
        ds.backgroundColor = colors.bg;
        ds.borderColor = colors.border;
    });
    studentChartInstance.update();
}

// ====== Render helpers ======
let praktikanList = [];
let assistantList = [];
let assistantNameByNrp = {};
let absensiData = {};
let adminKelompokCache = {}; // kelompok data: deadline week dari kelompok[kId][modulId].week
let kelompokOrder = []; // sorted group IDs for columns (max 20)
let judulPraktikumCache = {};
let adminUsersCache = {}; // for progress modal: list praktikan per kelompok

function buildKelompokAsistenMap(kelompok, users) {
    const result = {};
    const asistenLookup = {};
    assistantNameByNrp = {};
    Object.keys(users || {}).forEach((uid) => {
        const u = users[uid];
        if (String(u.role || '').toLowerCase() === 'asisten laboratorium') {
            const nrp = u.nrp || uid;
            const label = `${nrp} - ${u.nama || ''}`;
            asistenLookup[nrp] = label;
            assistantNameByNrp[nrp] = label;
        }
    });
    Object.keys(kelompok || {}).forEach((kId) => {
        const k = kelompok[kId];
        const set = new Set();
        Object.keys(k).forEach((mid) => {
            if (!/^(W|MP)\d+$/i.test(mid)) return;
            const j = k[mid];
            if (j && Array.isArray(j.aslab)) {
                j.aslab.forEach((nrp) => set.add(nrp));
            }
        });
        const list = Array.from(set).map((nrp) => asistenLookup[nrp] || nrp);
        result[kId] = list.length ? list.join(', ') : '-';
    });
    return result;
}

function buildPraktikanList(users, kelompok, judulPraktikum) {
    const kelompokAsistenMap = buildKelompokAsistenMap(kelompok, users);
    const list = [];
    let totalPraktikan = 0;
    let sumAllNilai = 0;
    let countAllNilai = 0;

    Object.keys(users || {}).forEach((uid) => {
        const u = users[uid];
        if (String(u.role || '').toLowerCase() !== 'praktikan') return;
        totalPraktikan++;
        const nrp = u.nrp || uid;
        const nama = u.nama || '-';
        const kelompokId = u.kelompokId || '-';
        const fotoUrl = u.fotoUrl || null;
        const nilaiPerUser = u.nilai || {};
        const perModule = {};
        let sum = 0;
        let count = 0;
        let modulesDone = 0;

        MODULE_KEYS.forEach((mid) => {
            const n = nilaiPerUser[mid] || {};
            const total = computeFinalTotal(n);
            perModule[mid] = {
                total,
                raw: n,
            };
            // Hanya hitung modul yang benar-benar punya nilai (total > 0)
            if (total !== null && !isNaN(total) && total > 0) {
                sum += total;
                count++;
                modulesDone++;
                sumAllNilai += total;
                countAllNilai++;
            }
        });

        const avg = count ? sum / count : null;
        list.push({
            uid,
            nrp,
            nama,
            kelompokId,
            fotoUrl,
            email: u.email || '-',
            telepon: u.telepon || '-',
            asistenPengampu: kelompokAsistenMap[kelompokId] || '-',
            perModule,
            modulesDone,
            avg,
        });
    });

    // Update summary cards
    const elTotal = document.getElementById('summary-total-praktikan');
    const elAvg = document.getElementById('summary-avg-nilai');
    const elEntry = document.getElementById('summary-total-entry');
    if (elTotal) elTotal.textContent = String(totalPraktikan);
    if (elAvg) elAvg.textContent = countAllNilai ? fmtNumber(sumAllNilai / countAllNilai) : '-';
    if (elEntry) elEntry.textContent = String(countAllNilai);

    // Sort by kelompok, lalu nama
    list.sort((a, b) => {
        if (a.kelompokId !== b.kelompokId) return String(a.kelompokId).localeCompare(String(b.kelompokId));
        return String(a.nrp).localeCompare(String(b.nrp));
    });
    return list;
}

// Minggu praktikum: prioritaskan kelompok[kelompokId][modulId].week, fallback ke absensi
// Return week number (1–53) atau null. Deadline = week + 2.
function getWeekForModule(kelompokId, modulId, absensi, kelompok) {
    if (!kelompokId || !modulId) return null;
    const kId = String(kelompokId).trim();
    const mId = String(modulId).trim();
    if (!kId || !mId) return null;

    // 1. Ambil dari data kelompok (kelompok[kelompokId][modulId].week)
    if (kelompok && kelompok[kId]) {
        const entry = kelompok[kId][mId];
        if (entry && typeof entry.week === 'number' && entry.week >= 1 && entry.week <= 53) {
            return entry.week;
        }
    }

    // 2. Fallback: hitung dari tanggal di absensi
    if (!absensi) return null;
    const byKel = absensi[kId];
    if (!byKel) return null;
    const byMod = byKel[mId];
    if (!byMod || typeof byMod !== 'object') return null;
    const dates = Object.keys(byMod).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) || /^\d+$/.test(k));
    if (!dates.length) return null;
    const first = dates.sort()[0];
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(first)) {
        d = new Date(first);
    } else {
        d = new Date(parseInt(first, 10));
        if (isNaN(d.getTime())) return null;
    }
    const start = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
    return week >= 1 && week <= 53 ? week : null;
}

function buildAssistantList(users, kelompok, judulPraktikum) {
    judulPraktikumCache = judulPraktikum || {};
    const rawKeys = Object.keys(kelompok || {});
    const groupIds = rawKeys.filter((k) => k && typeof k === 'string' && !/^(W|MP)\d+$/i.test(k.trim()));
    kelompokOrder = groupIds.sort((a, b) => {
        const na = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
        const nb = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
        return na - nb;
    }).slice(0, 20);

    const list = [];
    Object.keys(users || {}).forEach((uid) => {
        const u = users[uid];
        if (String(u.role || '').toLowerCase() !== 'asisten laboratorium') return;
        const judul = (u.judul || '').trim().toUpperCase();
        if (!judul || !/^(W|MP)\d+$/i.test(judul)) return;

        const nrp = u.nrp || uid;
        const nama = u.nama || '-';
        const modulLabel = judulPraktikum[judul]?.namaJudul ? `${judul} - ${judulPraktikum[judul].namaJudul}` : judul;

        const kelompokStatus = {};
        kelompokOrder.forEach((kId) => {
            const k = kelompok[kId];
            if (!k) {
                kelompokStatus[kId] = 'Tidak Diampu';
                return;
            }
            const j = k[judul];
            const aslab = (j && Array.isArray(j.aslab)) ? j.aslab : [];
            const teaches = aslab.some((n) => String(n).trim() === String(nrp).trim());
            if (!teaches) {
                kelompokStatus[kId] = 'Tidak Diampu';
                return;
            }
            const praktikanInGroup = Object.keys(users).filter(
                (id) => String(users[id].kelompokId || '').trim().toLowerCase() === String(kId).trim().toLowerCase()
                    && String(users[id].role || '').toLowerCase() === 'praktikan'
            );
            const total = praktikanInGroup.length;
            if (total === 0) {
                kelompokStatus[kId] = 'Selesai';
                return;
            }
            let withGrade = 0;
            praktikanInGroup.forEach((id) => {
                const n = (users[id].nilai && users[id].nilai[judul]) || {};
                const tot = computeFinalTotal(n);
                if (tot !== null && !isNaN(tot) && tot > 0) withGrade++;
            });
            if (withGrade === 0) kelompokStatus[kId] = 'Belum';
            else if (withGrade < total) kelompokStatus[kId] = 'Dalam Proses';
            else kelompokStatus[kId] = 'Selesai';
        });

        list.push({
            uid,
            nrp,
            nama,
            judul,
            modulLabel,
            fotoUrl: u.fotoUrl || null,
            email: u.email || '-',
            telepon: u.telepon || u.noHp || '-',
            kelompokStatus,
        });
    });

    list.sort((a, b) => {
        const j = (a.judul || '').localeCompare(b.judul || '');
        if (j !== 0) return j;
        return String(a.nrp).localeCompare(String(b.nrp));
    });
    return list;
}

function renderCardView() {
    const container = document.getElementById('admin-card-grid');
    if (!container) return;
    if (!praktikanList.length) {
        container.innerHTML = '<p>Data praktikan tidak ditemukan.</p>';
        return;
    }
    container.innerHTML = '';
    praktikanList.forEach((p) => {
        const card = document.createElement('div');
        card.className = 'contact-card admin-praktikan-card';
        card.dataset.nrp = String(p.nrp || '');
        card.dataset.nama = String(p.nama || '').toLowerCase();
        card.dataset.kelompok = String(p.kelompokId || '').toLowerCase();

        const initials = (p.nama || '?').trim().charAt(0).toUpperCase();
        const avgStr = p.avg !== null && !isNaN(p.avg) ? fmtNumber(p.avg) : '-';

        // Buat struktur avatar dengan foto atau inisial
        let avatarHtml = '';
        if (p.fotoUrl) {
            avatarHtml = `<img src="${escAttr(p.fotoUrl)}" alt="Foto ${escAttr(p.nama)}" class="contact-avatar-img" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            avatarHtml = `<div class="contact-avatar">${initials}</div>`;
        }

        card.innerHTML = `
            <div class="contact-header">
                <div class="contact-avatar-wrapper" style="position: relative; width: 48px; height: 48px; border-radius: 50%; overflow: hidden; background-color: var(--primary-gold, #3b82f6);">
                    ${avatarHtml}
                </div>
                <div class="contact-info">
                    <h3>${p.nama}</h3>
                    <p class="contact-role">Praktikan • Kelompok ${p.kelompokId || '-'}</p>
                </div>
            </div>
            <div class="contact-details">
                <div class="contact-item">
                    <span>NRP</span>
                    <span>${p.nrp}</span>
                </div>
                <div class="contact-item">
                    <span>Rerata Nilai</span>
                    <span>${avgStr}</span>
                </div>
                <div class="contact-item">
                    <span>Modul dinilai</span>
                    <span>${p.modulesDone}</span>
                </div>
            </div>
            <div class="module-list">
                <h4 class="module-list-title">Asisten Pengampu</h4>
                <p>${p.asistenPengampu || '-'}</p>
            </div>
            <div class="contact-card-overlay-action" aria-hidden="true">Lihat detail & grafik</div>
        `;

        card.addEventListener('click', () => openPraktikanModal(p));
        container.appendChild(card);
    });
}

function renderStudentTable() {
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!praktikanList.length) return;

    praktikanList.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'admin-table-row';
        tr.dataset.nrp = String(p.nrp || '');
        tr.dataset.nama = String(p.nama || '').toLowerCase();
        tr.dataset.kelompok = String(p.kelompokId || '').toLowerCase();

        const cells = [];
        cells.push(`<td>${idx + 1}</td>`);
        cells.push(`<td>${p.nama}</td>`);
        cells.push(`<td>${p.nrp}</td>`);
        cells.push(`<td>${p.kelompokId || '-'}</td>`);
        MODULE_KEYS.forEach((mid) => {
            const entry = p.perModule[mid] || {};
            const n = entry.raw || {};
            const total = entry.total;
            let text = '-';
            let title = '';
            if (total !== null && !isNaN(total) && total > 0) {
                text = fmtNumber(total);
                const detail = {};
                ASPEK.forEach((a) => {
                    const v = parseFloat(n[a.key]);
                    detail[a.key] = Number.isFinite(v) ? v : null;
                });
                const plg = parseFloat(n['plagiasi, dan tidak bisa mengurai AI']);
                const plgPct = Number.isFinite(plg) ? Math.max(0, Math.min(100, plg)) : null;
                const byNrp = n._by || '';
                const byLabel = byNrp ? (assistantNameByNrp[byNrp] || byNrp) : '-';
                const lines = [
                    `${mid} • Total akhir: ${fmtNumber(total)}`,
                    `Pre-lab (10%): ${fmtDetail(detail['pre-lab'])}`,
                    `In-lab (10%): ${fmtDetail(detail['in-lab'])}`,
                    `Abstrak (5%): ${fmtDetail(detail['abstrak'])}`,
                    `Pendahuluan (10%): ${fmtDetail(detail['pendahuluan'])}`,
                    `Metodologi (5%): ${fmtDetail(detail['metodologi'])}`,
                    `Analisis+Perhitungan (20%): ${fmtDetail(detail['analisis data dan perhitungan'])}`,
                    `Pembahasan (25%): ${fmtDetail(detail['pembahasan'])}`,
                    `Kesimpulan (10%): ${fmtDetail(detail['kesimpulan'])}`,
                    `Format (5%): ${fmtDetail(detail['format'])}`,
                ];
                if (plgPct !== null) {
                    lines.push(`Plagiasi/AI: ${fmtDetail(plgPct)}%`);
                }
                lines.push(`Asisten penilai: ${byLabel}`);
                title = lines.join('\n');
            } else {
                title = 'Belum ada nilai';
            }
            cells.push(`<td${title ? ` title="${escAttr(title)}"` : ''}>${text}</td>`);
        });
        const avg = p.avg;
        let avgTitle = '';
        if (avg !== null && !isNaN(avg) && avg > 0) {
            avgTitle = `Rerata dari ${p.modulesDone} modul dinilai: ${fmtNumber(avg)}`;
        }
        cells.push(`<td${avgTitle ? ` title="${escAttr(avgTitle)}"` : ''}>${avg !== null && !isNaN(avg) ? fmtNumber(avg) : '-'}</td>`);
        tr.innerHTML = cells.join('');
        tbody.appendChild(tr);
    });
}

function renderAssistantTable() {
    const theadRow = document.getElementById('admin-asisten-thead-row');
    const tbody = document.getElementById('admin-asisten-table-body');
    if (!theadRow || !tbody) return;

    const groupHeaders = kelompokOrder.map((kId) => `<th>${escAttr(kId)}</th>`).join('');
    theadRow.innerHTML = `<th>No</th><th>Nama Asisten</th><th>NRP</th><th>Kode & Judul Modul</th>${groupHeaders}`;

    tbody.innerHTML = '';
    if (!assistantList.length) {
        tbody.innerHTML = '<tr><td colspan="' + (4 + kelompokOrder.length) + '" style="text-align:center;">Tidak ada data asisten.</td></tr>';
        return;
    }

    assistantList.forEach((a, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'admin-asisten-row';
        tr.dataset.nrp = String(a.nrp || '');
        tr.dataset.nama = String(a.nama || '').toLowerCase();

        const cells = [];
        cells.push(`<td>${idx + 1}</td>`);
        cells.push(`<td class="admin-asisten-name-cell"><button type="button" class="admin-asisten-name-btn" data-nrp="${escAttr(a.nrp)}" data-nama="${escAttr(a.nama)}" data-judul="${escAttr(a.judul)}">${escAttr(a.nama)}</button></td>`);
        cells.push(`<td>${escAttr(a.nrp)}</td>`);
        cells.push(`<td>${escAttr(a.modulLabel)}</td>`);

        kelompokOrder.forEach((kId) => {
            const status = a.kelompokStatus[kId] || 'Tidak Diampu';
            const statusClass = status === 'Selesai' ? 'status-selesai' : status === 'Dalam Proses' ? 'status-proses' : status === 'Belum' ? 'status-belum' : 'status-tidak-diampu';
            cells.push(
                `<td class="admin-status-cell ${statusClass}" data-nrp="${escAttr(a.nrp)}" data-nama="${escAttr(a.nama)}" data-judul="${escAttr(a.judul)}" data-kelompok="${escAttr(kId)}" data-status="${escAttr(status)}" role="button" tabindex="0">${escAttr(status)}</td>`
            );
        });
        tr.innerHTML = cells.join('');
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.admin-asisten-name-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const nrp = btn.dataset.nrp;
            const asisten = assistantList.find((x) => String(x.nrp) === String(nrp));
            if (asisten) openAsistenModal(asisten);
        });
    });
    document.querySelectorAll('.admin-status-cell').forEach((cell) => {
        const openProgress = () => {
            const nrp = cell.dataset.nrp;
            const judul = cell.dataset.judul;
            const kelompokId = cell.dataset.kelompok;
            openProgressModal(nrp, judul, kelompokId);
        };
        cell.addEventListener('click', openProgress);
        cell.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProgress(); } });
    });
}

// ====== Modal Detail Praktikan ======
function openPraktikanModal(p) {
    const overlay = document.getElementById('praktikan-modal');
    if (!overlay) return;
    const title = document.getElementById('praktikan-modal-title');
    const elNama = document.getElementById('modal-nama');
    const elNrp = document.getElementById('modal-nrp');
    const elKel = document.getElementById('modal-kelompok');
    const elEmail = document.getElementById('modal-email');
    const elTel = document.getElementById('modal-telepon');
    const elAsisten = document.getElementById('modal-asisten');
    
    // Elemen foto
    const fotoImg = document.getElementById('modal-foto-img');
    const fotoInitial = document.getElementById('modal-foto-initial');

    if (title) title.textContent = `Detail Praktikan • ${p.nama}`;
    if (elNama) elNama.textContent = p.nama || '-';
    if (elNrp) elNrp.textContent = p.nrp || '-';
    if (elKel) elKel.textContent = p.kelompokId || '-';
    if (elEmail) elEmail.textContent = p.email || '-';
    if (elTel) elTel.textContent = p.telepon || '-';
    if (elAsisten) elAsisten.textContent = p.asistenPengampu || '-';
    
    // Tampilkan foto atau inisial
    if (p.fotoUrl && fotoImg) {
        fotoImg.src = p.fotoUrl;
        fotoImg.style.display = 'block';
        if (fotoInitial) fotoInitial.style.display = 'none';
    } else if (fotoInitial) {
        fotoInitial.style.display = 'flex';
        fotoInitial.textContent = (p.nama || '?').trim().charAt(0).toUpperCase();
        if (fotoImg) fotoImg.style.display = 'none';
    }

    // Build chart data (10 modul) + detail map untuk tooltip
    const labels = MODULE_KEYS.slice();
    const data = [];
    studentChartDetailMap = {};
    labels.forEach((mid) => {
        const entry = p.perModule[mid] || {};
        const n = entry.raw || {};
        const total = entry.total;
        data.push(total !== null && !isNaN(total) ? total : null);

        const detail = {};
        ASPEK.forEach((a) => {
            const v = parseFloat(n[a.key]);
            detail[a.key] = Number.isFinite(v) ? v : null;
        });
        const plg = parseFloat(n['plagiasi, dan tidak bisa mengurai AI']);
        detail._plgPct = Number.isFinite(plg) ? Math.max(0, Math.min(100, plg)) : null;
        const byNrp = n._by || '';
        detail._by = byNrp;
        detail._byLabel = byNrp ? (assistantNameByNrp[byNrp] || byNrp) : '-';
        studentChartDetailMap[mid] = detail;
    });
    buildStudentChart(labels, data);

    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
}

function wireModalClose() {
    const overlay = document.getElementById('praktikan-modal');
    const btnClose = document.getElementById('praktikan-modal-close');
    if (!overlay) return;
    const close = () => {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    };
    if (btnClose) btnClose.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') {
            close();
        }
    });
}

// ====== Modal Detail Progress (klik sel status) ======
function openProgressModal(asistenNrp, modulId, kelompokId) {
    const overlay = document.getElementById('progress-modal');
    const titleEl = document.getElementById('progress-modal-title');
    const deadlineEl = document.getElementById('progress-deadline-info');
    const listEl = document.getElementById('progress-praktikan-list');
    if (!overlay || !listEl) return;

    const week = getWeekForModule(kelompokId, modulId, absensiData, adminKelompokCache);
    const deadlineWeek = week != null ? week + 2 : null;
    const deadlineText = deadlineWeek != null
        ? `Deadline penilaian: Minggu ke- ${deadlineWeek}.`
        : 'Deadline: tidak diketahui (belum ada data week di kelompok atau absensi).';
    if (titleEl) titleEl.textContent = `Detail Progress • ${modulId} • ${kelompokId}`;
    if (deadlineEl) deadlineEl.textContent = deadlineText;

    const users = adminUsersCache;
    const praktikanInGroup = Object.keys(users).filter(
        (id) => String(users[id].kelompokId || '').trim().toLowerCase() === String(kelompokId).trim().toLowerCase()
            && String(users[id].role || '').toLowerCase() === 'praktikan'
    );
    listEl.innerHTML = '';
    praktikanInGroup.forEach((id) => {
        const u = users[id];
        const n = (u.nilai && u.nilai[modulId]) || {};
        const total = computeFinalTotal(n);
        const status = total !== null && !isNaN(total) && total > 0 ? fmtNumber(total) : 'Belum Dinilai';
        const li = document.createElement('li');
        li.className = 'admin-progress-item';
        li.innerHTML = `<span class="admin-progress-name">${escAttr(u.nama || u.nrp || id)}</span><span class="admin-progress-value">${status}</span>`;
        listEl.appendChild(li);
    });

    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
}

function wireProgressModalClose() {
    const overlay = document.getElementById('progress-modal');
    const btn = document.getElementById('progress-modal-close');
    if (!overlay) return;
    const close = () => {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    };
    if (btn) btn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') close();
    });
}

// ====== Modal Profil Asisten + Reminder WA ======
function openAsistenModal(asisten) {
    const overlay = document.getElementById('asisten-modal');
    const titleEl = document.getElementById('asisten-modal-title');
    const fotoImg = document.getElementById('asisten-foto-img');
    const fotoInitial = document.getElementById('asisten-foto-initial');
    const elNama = document.getElementById('asisten-modal-nama');
    const elNrp = document.getElementById('asisten-modal-nrp');
    const elHp = document.getElementById('asisten-modal-hp');
    const elEmail = document.getElementById('asisten-modal-email');
    const reminderKel = document.getElementById('reminder-kelompok');
    const reminderDeadline = document.getElementById('reminder-deadline-display');
    const reminderMsg = document.getElementById('reminder-message');
    if (!overlay) return;

    if (titleEl) titleEl.textContent = `Profil Asisten • ${asisten.nama}`;
    if (elNama) elNama.textContent = asisten.nama || '-';
    if (elNrp) elNrp.textContent = asisten.nrp || '-';
    if (elHp) elHp.textContent = asisten.telepon || '-';
    if (elEmail) elEmail.textContent = asisten.email || '-';

    if (asisten.fotoUrl && fotoImg) {
        fotoImg.src = asisten.fotoUrl;
        fotoImg.style.display = 'block';
        if (fotoInitial) fotoInitial.style.display = 'none';
    } else if (fotoInitial) {
        fotoInitial.style.display = 'flex';
        fotoInitial.textContent = (asisten.nama || '?').trim().charAt(0).toUpperCase();
        if (fotoImg) fotoImg.style.display = 'none';
    }

    if (reminderKel) {
        reminderKel.innerHTML = '<option value="">Pilih Kelompok (1–20)</option>' +
            kelompokOrder.map((kId) => `<option value="${escAttr(kId)}">${escAttr(kId)}</option>`).join('');
        reminderKel.value = '';
        reminderKel.dataset.asistenNrp = asisten.nrp;
        reminderKel.dataset.asistenNama = asisten.nama;
        reminderKel.dataset.asistenJudul = asisten.judul;
    }
    if (reminderDeadline) reminderDeadline.textContent = '-';
    if (reminderMsg) reminderMsg.value = '';

    overlay.dataset.asistenNrp = asisten.nrp;
    overlay.dataset.asistenNama = asisten.nama;
    overlay.dataset.asistenJudul = asisten.judul;
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
}

function wireAsistenModalClose() {
    const overlay = document.getElementById('asisten-modal');
    const btn = document.getElementById('asisten-modal-close');
    if (!overlay) return;
    const close = () => {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    };
    if (btn) btn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') close();
    });
}

function wireReminderKirimWa() {
    const btn = document.getElementById('reminder-kirim-wa');
    const selectKel = document.getElementById('reminder-kelompok');
    const customMsg = document.getElementById('reminder-message');
    const deadlineDisplay = document.getElementById('reminder-deadline-display');
    if (selectKel && deadlineDisplay) {
        selectKel.addEventListener('change', () => {
            const overlay = document.getElementById('asisten-modal');
            const judul = overlay?.dataset?.asistenJudul || selectKel.dataset?.asistenJudul;
            const kId = selectKel.value;
            if (!kId || !judul) {
                deadlineDisplay.textContent = '-';
                return;
            }
            const week = getWeekForModule(kId, judul, absensiData, adminKelompokCache);
            const deadlineWeek = week != null ? week + 2 : null;
            deadlineDisplay.textContent = deadlineWeek != null ? `Week ${deadlineWeek}` : 'Tidak diketahui';
        });
    }
    if (!btn || !selectKel) return;
    btn.addEventListener('click', () => {
        const nrp = selectKel.dataset.asistenNrp || document.getElementById('asisten-modal').dataset.asistenNrp;
        const nama = selectKel.dataset.asistenNama || document.getElementById('asisten-modal').dataset.asistenNama;
        const judul = selectKel.dataset.asistenJudul || document.getElementById('asisten-modal').dataset.asistenJudul;
        const kId = selectKel.value;
        const asisten = assistantList.find((a) => String(a.nrp) === String(nrp));
        const noHp = (asisten && asisten.telepon) ? String(asisten.telepon).replace(/\D/g, '') : '';
        if (!noHp) {
            alert('Nomor HP asisten tidak tersedia.');
            return;
        }
        const weekVal = kId ? getWeekForModule(kId, judul, absensiData, adminKelompokCache) : null;
        const deadlineWeek = weekVal != null ? weekVal + 2 : null;
        const baseMsg = `Halo ${nama || 'Asisten'}, tolong segera selesaikan penilaian Modul ${judul || ''} untuk Kelompok ${kId || '-'}. Deadline penilaian adalah Week ${deadlineWeek != null ? deadlineWeek : '?'}. Terima kasih.`;
        const extra = (customMsg && customMsg.value) ? '\n\n' + customMsg.value.trim() : '';
        const text = encodeURIComponent(baseMsg + extra);
        window.open(`https://wa.me/${noHp}?text=${text}`, '_blank', 'noopener,noreferrer');
    });
}

// ====== Search & View Toggle ======
function applySearchFilter() {
    const input = document.getElementById('praktikan-search');
    const fieldSel = document.getElementById('praktikan-search-field');
    const info = document.getElementById('praktikan-search-info');
    const query = (input?.value || '').trim().toLowerCase();
    const field = fieldSel?.value || 'nama';

    const cards = document.querySelectorAll('.admin-praktikan-card');
    const rows = document.querySelectorAll('.admin-table-row');
    const asistenRows = document.querySelectorAll('.admin-asisten-row');
    let visibleCards = 0;
    let totalCards = 0;

    cards.forEach((el) => {
        totalCards++;
        const v =
            field === 'nrp'
                ? el.dataset.nrp || ''
                : field === 'kelompok'
                ? el.dataset.kelompok || ''
                : el.dataset.nama || '';
        const show = !query || v.toLowerCase().includes(query);
        el.style.display = show ? '' : 'none';
        if (show) visibleCards++;
    });

    rows.forEach((el) => {
        const v =
            field === 'nrp'
                ? el.dataset.nrp || ''
                : field === 'kelompok'
                ? el.dataset.kelompok || ''
                : el.dataset.nama || '';
        const show = !query || v.toLowerCase().includes(query);
        el.style.display = show ? '' : 'none';
    });

    asistenRows.forEach((el) => {
        const nama = (el.dataset.nama || '').toLowerCase();
        const nrp = (el.dataset.nrp || '').toLowerCase();
        const show = !query || nama.includes(query) || nrp.includes(query);
        el.style.display = show ? '' : 'none';
    });

    if (info) {
        if (!query || !totalCards) {
            info.textContent = '';
        } else {
            info.textContent = `${visibleCards} dari ${totalCards} praktikan ditampilkan`;
        }
    }
}

function wireSearch() {
    const input = document.getElementById('praktikan-search');
    const clearBtn = document.getElementById('praktikan-search-clear');
    const fieldSel = document.getElementById('praktikan-search-field');
    if (input) {
        input.addEventListener('input', applySearchFilter);
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            input.value = '';
            applySearchFilter();
            input.focus();
        });
    }
    if (fieldSel) {
        fieldSel.addEventListener('change', applySearchFilter);
    }
}

function setViewMode(mode) {
    const cardSection = document.getElementById('card-view-section');
    const tableSection = document.getElementById('table-view-section');
    const btn = document.getElementById('view-toggle');
    const isCard = mode === 'card';
    if (cardSection) cardSection.classList.toggle('hidden', !isCard);
    if (tableSection) tableSection.classList.toggle('hidden', isCard);
    if (btn) {
        btn.dataset.view = mode;
        btn.textContent = isCard ? 'Card View' : 'Table View';
        btn.setAttribute('aria-pressed', String(!isCard));
    }
}

function setTableDataMode(dataMode) {
    const praktikanWrap = document.getElementById('admin-praktikan-table-wrapper');
    const asistenWrap = document.getElementById('admin-asisten-table-wrapper');
    const modeBtn = document.getElementById('admin-mode-toggle');
    const downloadBtn = document.getElementById('download-table-btn');
    const isPraktikan = dataMode === 'praktikan';
    if (praktikanWrap) praktikanWrap.classList.toggle('hidden', !isPraktikan);
    if (asistenWrap) asistenWrap.classList.toggle('hidden', isPraktikan);
    if (modeBtn) {
        modeBtn.dataset.dataMode = dataMode;
        modeBtn.textContent = isPraktikan ? 'Mode: Praktikan' : 'Mode: Asisten';
    }
    if (downloadBtn) downloadBtn.style.display = isPraktikan ? '' : 'none';
}

// ====== Export Tabel ke Excel ======
function exportTableToExcel() {
    if (!praktikanList || praktikanList.length === 0) {
        alert('Tidak ada data untuk diunduh.');
        return;
    }

    try {
        // Persiapkan data untuk Excel
        const excelData = [];
        
        // Header
        const header = ['No', 'Nama', 'NRP', 'Kelompok', 'MP1', 'MP2', 'MP3', 'MP4', 'MP5', 'W1', 'W2', 'W3', 'W4', 'W5', 'Rerata'];
        excelData.push(header);
        
        // Data praktikan
        praktikanList.forEach((p, idx) => {
            const row = [];
            row.push(idx + 1); // No
            row.push(p.nama || '-');
            row.push(p.nrp || '-');
            row.push(p.kelompokId || '-');
            
            // Nilai per modul
            MODULE_KEYS.forEach((mid) => {
                const entry = p.perModule[mid] || {};
                const total = entry.total;
                row.push(total !== null && !isNaN(total) && total > 0 ? Number(total).toFixed(2) : '-');
            });
            
            // Rerata
            row.push(p.avg !== null && !isNaN(p.avg) && p.avg > 0 ? Number(p.avg).toFixed(2) : '-');
            
            excelData.push(row);
        });
        
        // Buat worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        
        // Set lebar kolom
        const columnWidths = [
            { wch: 5 },    // No
            { wch: 20 },   // Nama
            { wch: 12 },   // NRP
            { wch: 12 },   // Kelompok
            { wch: 10 },   // MP1-MP5
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },   // W1-W5
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },   // Rerata
        ];
        worksheet['!cols'] = columnWidths;
        
        // Format header (bold, background color)
        const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
            const cellAddress = XLSX.utils.encode_col(col) + '1';
            if (!worksheet[cellAddress]) continue;
            worksheet[cellAddress].s = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: '3b82f6' } },
                alignment: { horizontal: 'center', vertical: 'center' }
            };
        }
        
        // Buat workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Nilai Praktikum');
        
        // Tentukan nama file dengan tanggal
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const filename = `Nilai_Praktikum_FISLAB_${dateStr}.xlsx`;
        
        // Download file
        XLSX.writeFile(workbook, filename);
        
        console.log('File Excel berhasil diunduh:', filename);
    } catch (err) {
        console.error('Gagal mengunduh Excel:', err);
        alert('Gagal mengunduh file Excel. Silakan coba lagi.');
    }
}

function wireViewToggle() {
    const btn = document.getElementById('view-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const current = btn.dataset.view || 'card';
        const next = current === 'card' ? 'table' : 'card';
        setViewMode(next);
    });
    setViewMode('card');
}

function wireDownloadButton() {
    const downloadBtn = document.getElementById('download-table-btn');
    if (!downloadBtn) return;
    downloadBtn.addEventListener('click', () => {
        exportTableToExcel();
    });
}

function wireAdminModeToggle() {
    const modeBtn = document.getElementById('admin-mode-toggle');
    if (!modeBtn) return;
    modeBtn.addEventListener('click', () => {
        const current = modeBtn.dataset.dataMode || 'praktikan';
        const next = current === 'praktikan' ? 'asisten' : 'praktikan';
        setTableDataMode(next);
    });
    setTableDataMode('praktikan');
}


// ====== Inisialisasi utama ======
document.addEventListener('DOMContentLoaded', () => {
    const subtitle = document.getElementById('admin-subtitle');

    ensureAdminOrRedirect()
        .then(() => {
            if (subtitle) subtitle.textContent = 'Mengambil data praktikan & nilai dari database...';
            return Promise.all([
                database.ref('users').once('value'),
                database.ref('kelompok').once('value'),
                database.ref('judulPraktikum').once('value'),
                database.ref('absensi').once('value'),
            ]);
        })
        .then(([usersSnap, kelompokSnap, judulSnap, absensiSnap]) => {
            const users = usersSnap.val() || {};
            const kelompok = kelompokSnap.val() || {};
            const judulPraktikum = judulSnap.val() || {};
            absensiData = absensiSnap.val() || {};
            adminKelompokCache = kelompok;
            adminUsersCache = users;

            praktikanList = buildPraktikanList(users, kelompok, judulPraktikum);
            assistantList = buildAssistantList(users, kelompok, judulPraktikum);

            renderCardView();
            renderStudentTable();
            renderAssistantTable();
            wireModalClose();
            wireProgressModalClose();
            wireAsistenModalClose();
            wireReminderKirimWa();
            wireSearch();
            wireViewToggle();
            wireDownloadButton();
            wireAdminModeToggle();
            applySearchFilter();

            if (subtitle) {
                subtitle.textContent = 'Rekapitulasi data praktikan, nilai, dan statistik praktikum.';
            }

            // Re-theme chart ketika mode gelap berubah
            const modeToggleBtn = document.getElementById('mode-toggle');
            if (modeToggleBtn) {
                modeToggleBtn.addEventListener('click', () => {
                    setTimeout(updateStudentChartTheme, 0);
                });
            }
        })
        .catch((err) => {
            console.error('Gagal memuat dashboard admin:', err);
            if (subtitle) subtitle.textContent = 'Gagal memuat data dashboard admin.';
        });
});



