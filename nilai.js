
        const database = firebase.database();

        // Konfigurasi aspek & bobot (sinkron dengan penilaian.html)
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


        // Render nilai from Firebase
        function renderNilai(allData, userData){
            const tbody = document.getElementById('nilai-body');
            const subtitle = document.getElementById('nilai-subtitle');
            const { judulPraktikum } = allData;
            const nilai = userData.nilai || {};
            const kelompokId = userData.kelompokId || '-';
            subtitle.textContent = `NRP ${userData.nrp} • ${userData.nama} • ${kelompokId}`;
            const modulIds = Object.keys(judulPraktikum).sort((a,b)=>{
                const na = parseInt(a.replace('E',''),10); const nb = parseInt(b.replace('E',''),10); return na-nb;
            });
            tbody.innerHTML = modulIds.map(mid => {
                const n = nilai[mid] || {};
                let total = 0; let filledCount = 0;
                const parts = ASPEK.map(a => {
                    const v = parseFloat(n[a.key]);
                    const isValidScore = !isNaN(v) && v > 0;  // nilai harus > 0 dianggap terisi
                    if (isValidScore) { total += v * a.weight / 100; filledCount++; }
                    return `${a.label}: ${!isValidScore ? '-' : v} (${a.weight}%)`;
                });
                // Deduksi karena plagiasi/AI (tidak memengaruhi status penentuan sedang/sudah/belum)
                const plg = parseFloat(n['plagiasi, dan tidak bisa mengurai AI']);
                const plgPct = isNaN(plg) ? 0 : Math.max(0, Math.min(100, plg));
                const hasAny = filledCount > 0;
                const allFilled = filledCount === ASPEK.length;
                const finalTotal = hasAny ? total * (1 - plgPct/100) : null;
                if (hasAny) parts.push(`Plagiasi/AI: ${plgPct}%`);
                const totalStr = hasAny ? finalTotal.toFixed(2) : '-';
                let statusCls, statusTxt;
                if (!hasAny) { statusCls = 'status-not-started'; statusTxt = 'Belum Dinilai'; }
                else if (allFilled) { statusCls = 'status-completed'; statusTxt = 'Sudah Dinilai'; }
                else { statusCls = 'status-pending'; statusTxt = 'Sedang Dinilai'; }
                const detail = parts.join(' | ');
                const note = (n['catatan']||'-');
                const updatedAt = n._updatedAt ? new Date(n._updatedAt).toLocaleString() : '-';
                return `<tr>
                    <td>${mid} - ${judulPraktikum[mid].namaJudul}</td>
                    <td><span class="${statusCls}">${statusTxt}</span></td>
                    <td><button class="avg-btn" data-mid="${mid}" data-detail="${detail}" data-total="${totalStr}" data-modul="${mid} - ${judulPraktikum[mid].namaJudul}" title="Klik untuk melihat detail">${totalStr}</button></td>
                    <td>${updatedAt}</td>
                    <td>${note}</td>
                </tr>`;
            }).join('');
            // wiring modal detail
            tbody.addEventListener('click', (e)=>{
                const btn = e.target && e.target.closest('.avg-btn');
                if (!btn) return;
                const modal = document.getElementById('nilai-modal');
                const title = document.getElementById('modal-title');
                const body = document.getElementById('modal-body');
                title.textContent = btn.dataset.modul + ` • Total akhir: ${btn.dataset.total}`;
                body.innerHTML = 'Rincian:<br>' + (btn.dataset.detail || '').split(' | ').join('<br>');
                modal.style.display = 'flex';
                modal.setAttribute('aria-hidden','false');
            });
            const modal = document.getElementById('nilai-modal');
            const modalClose = document.getElementById('modal-close');
            modalClose.addEventListener('click', ()=>{ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); });
            modal.addEventListener('click', (e)=>{ if(e.target === modal){ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); }});
        }

        document.addEventListener('DOMContentLoaded', () => {
            const loggedInNrp = localStorage.getItem('fislab-nrp');
            if (!loggedInNrp) { alert('Anda belum login.'); window.location.href = 'index.html'; return; }
            database.ref('users/' + loggedInNrp).once('value', (snap)=>{
                if (!snap.exists()) { alert('Data pengguna tidak ditemukan.'); window.location.href = 'index.html'; return; }
                const userData = snap.val();
                if (userData.role) localStorage.setItem('fislab-role', userData.role);
                database.ref('/').once('value', (dbSnap)=>{
                    if (dbSnap.exists()) renderNilai(dbSnap.val(), userData);
                });
            });
        });
    