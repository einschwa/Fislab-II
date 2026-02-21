        
        const database = firebase.database();

        // Modul asisten (auto-detect dari users[loggedInNrp].judul), dipakai untuk input nilai
        let _currentAssistantModul = null;

        // Require asisten role
        function ensureAssistantOrRedirect(){
            const role = localStorage.getItem('fislab-role');
            if (role !== 'Asisten Laboratorium'){
                alert('Halaman ini hanya untuk asisten laboratorium.');
                window.location.href = 'home.html';
            }
        }

        // Konfigurasi aspek & bobot
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

        function clampScore(v){
            const n = parseFloat(v);
            if (isNaN(n)) return null;
            return Math.max(0, Math.min(100, n));
        }

        // Update avatar gambar praktikan (foto dari DB sama seperti profile: users/<nrp>/fotoUrl)
        function updatePraktikanAvatar(nrp) {
            const img = document.getElementById('praktikan-avatar');
            if (!img) return;
            const allData = window._allDataCache;
            const user = allData && allData.users && nrp ? allData.users[nrp] : null;
            const nama = user && user.nama ? String(user.nama).trim() : 'Praktikan';
            const photoUrl = user && (user.fotoUrl || user.foto || user.photoURL || user.photoUrl);
            if (photoUrl) {
                img.src = photoUrl;
                img.alt = nama;
            } else {
                const encoded = encodeURIComponent(nama.replace(/\s+/g, '+'));
                img.src = `https://ui-avatars.com/api/?name=${encoded}&background=random&size=120`;
                img.alt = nama;
            }
        }

        // Mengisi opsi kelompok dan praktikan berdasarkan modul asisten (auto-detect dari judul)
        function populateFormOptions(allData, assistantNrp){
            const kelompokSelect = document.getElementById('kelompok');
            const praktikanSelect = document.getElementById('praktikan');
            const helper = document.getElementById('helper-text');
            if (!allData || !allData.users || !allData.kelompok) {
                console.warn('Struktur data tidak lengkap untuk populateFormOptions');
                return;
            }
            const asisten = allData.users[assistantNrp];
            const assignedModules = Array.isArray(asisten?.judul)
                ? asisten.judul
                : (typeof asisten?.judul === 'string' && asisten.judul.trim() ? [asisten.judul] : []);
            // Modul default: satu modul untuk form (asisten hanya menilai modul yang diampu)
            _currentAssistantModul = assignedModules.length ? assignedModules[0] : null;
            if (!_currentAssistantModul) {
                helper.textContent = 'Anda belum memiliki modul terdaftar pada data (users/<nrp>/judul).';
                kelompokSelect.innerHTML = '<option value="">Pilih Kelompok</option>';
                praktikanSelect.innerHTML = '<option value="">Pilih Praktikan</option>';
                return;
            }
            const modulId = _currentAssistantModul;
            // Filter kelompok: hanya kelompok yang diampu asisten untuk modul ini
            const matchingKelompok = Object.keys(allData.kelompok).filter(kId => {
                const k = allData.kelompok[kId];
                const j = k[modulId];
                return j && Array.isArray(j.aslab) && j.aslab.includes(String(assistantNrp));
            });
            kelompokSelect.innerHTML = '<option value="">Pilih Kelompok</option>' +
                matchingKelompok.map(kId => `<option value="${kId}">${kId} - ${(allData.kelompok[kId].namaKelompok || kId)}</option>`).join('');
            praktikanSelect.innerHTML = '<option value="">Pilih Praktikan</option>';
            helper.textContent = matchingKelompok.length ? `Modul: ${modulId}. Anda mengampu ${matchingKelompok.length} kelompok.` : 'Tidak ada kelompok untuk modul Anda.';

            kelompokSelect.addEventListener('change', () => {
                const selectedKelompok = kelompokSelect.value;
                praktikanSelect.innerHTML = '<option value="">Pilih Praktikan</option>';
                if (!selectedKelompok) {
                    clearScoreInputs();
                    updatePraktikanAvatar(null);
                    return;
                }
                const praktikanList = Object.values(allData.users).filter(u => {
                    const role = String(u.role || '').trim().toLowerCase();
                    return role === 'praktikan' &&
                        (String(u.kelompokId || '').trim().toLowerCase() === String(selectedKelompok).trim().toLowerCase());
                });
                praktikanList.forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = u.nrp;
                    opt.textContent = `${u.nrp} - ${u.nama || ''}`;
                    praktikanSelect.appendChild(opt);
                });
                clearScoreInputs();
                updatePraktikanAvatar(null);
                maybeLoadExisting();
            });

            praktikanSelect.addEventListener('change', () => {
                const nrp = praktikanSelect.value;
                updatePraktikanAvatar(nrp || null);
                maybeLoadExisting();
            });
        }

        /* === Tambahan: pre-fill & auto-save nilai === */
        const KEY_ID_OVERRIDE = { 'plagiasi, dan tidak bisa mengurai AI': 'plagiasi-ai' };
        function idFromKey(key){ return KEY_ID_OVERRIDE[key] || key.toLowerCase().replace(/[,]/g,'').replace(/\s+/g,'-'); }
        function clearScoreInputs(){
            ASPEK.forEach(a=>{ const el=document.getElementById(idFromKey(a.key)); if(el) el.value=''; });
            const plag=document.getElementById('plagiasi-ai'); if(plag) plag.value='';
            const cat=document.getElementById('catatan'); if(cat) cat.value='';
        }
        function loadExistingScores(nrp, modulId){
            if(!nrp||!modulId) return;
            database.ref(`users/${nrp}/nilai/${modulId}`).once('value').then(snap=>{
                const data=snap.val()||{};
                ASPEK.forEach(a=>{ const el=document.getElementById(idFromKey(a.key)); if(!el) return; const v=data[a.key]; el.value=(v===null||v===undefined||v==='')?'':v; });
                const plag=document.getElementById('plagiasi-ai'); if(plag) plag.value = (data['plagiasi, dan tidak bisa mengurai AI'] ?? '');
                const cat=document.getElementById('catatan'); if(cat) cat.value = (data.catatan ?? '');
            }).catch(()=>{});
        }
        let autoSaveTimer=null;
        function scheduleFieldAutoSave(fieldKey){
            clearTimeout(autoSaveTimer);
            autoSaveTimer=setTimeout(()=>{
                const modulId = _currentAssistantModul;
                const nrp=document.getElementById('praktikan').value;
                if(!modulId||!nrp) return;
                const el=document.getElementById(idFromKey(fieldKey));
                const raw = el ? el.value.trim() : '';
                let val;
                if (raw==='') {
                    val = null;
                } else if (fieldKey === 'catatan') {
                    // Simpan teks apa adanya (batasi panjang agar aman)
                    val = raw.slice(0, 4000);
                } else {
                    // Field numeric -> clamp
                    val = clampScore(raw);
                }
                const updateObj={ [fieldKey]: val, _updatedAt: Date.now(), _by: localStorage.getItem('fislab-nrp')||'' };
                
                // Juga hitung dan simpan total ke database
                database.ref(`users/${nrp}/nilai/${modulId}`).update(updateObj).then(()=>{
                    // Setelah update, ambil data terbaru dan hitung total
                    database.ref(`users/${nrp}/nilai/${modulId}`).once('value').then(snap=>{
                        const nilaiData = snap.val() || {};
                        const finalTotal = computeFinalTotal(nilaiData);
                        if (finalTotal !== null) {
                            database.ref(`users/${nrp}/nilai/${modulId}/total`).set(finalTotal).catch(()=>{});
                        }
                    }).catch(()=>{});
                }).catch(()=>{});
            },600);
        }
        function wireAutoSaveInputs(){
            ASPEK.forEach(a=>{ const el=document.getElementById(idFromKey(a.key)); if(el) el.addEventListener('input',()=>scheduleFieldAutoSave(a.key)); });
            const plag=document.getElementById('plagiasi-ai'); if(plag) plag.addEventListener('input',()=>scheduleFieldAutoSave('plagiasi, dan tidak bisa mengurai AI'));
            const cat=document.getElementById('catatan'); if(cat) cat.addEventListener('input',()=>scheduleFieldAutoSave('catatan'));
        }
        function maybeLoadExisting(){
            const modulId = _currentAssistantModul;
            const nrp=document.getElementById('praktikan').value;
            if(modulId && nrp){ loadExistingScores(nrp, modulId); } else { clearScoreInputs(); }
        }
        /* === End tambahan === */

        // ====== Export nilai ke XLSX ======
        const EXPORT_HEADERS = [
            'Kelompok', 'Nama Kelompok', 'NRP', 'Nama', 'Modul', 'Judul',
            'Pre-lab', 'In-lab', 'Abstrak', 'Pendahuluan', 'Metodologi',
            'Analisis data dan perhitungan', 'Pembahasan', 'Kesimpulan', 'Format',
            'Plagiasi/AI %', 'Total (bobot)', 'Terakhir Diubah', 'Diubah Oleh', 'Catatan'
        ];

        // Header untuk semua (sama, bisa direuse)
        const EXPORT_HEADERS_ALL = EXPORT_HEADERS;

        function toNumOrNull(v){
            const n = parseFloat(v);
            return isNaN(n) ? null : n;
        }

        function computeFinalTotal(n){
            if (!n) return null;
            let total = 0; let hasAny = false;
            for (const a of ASPEK){
                const val = parseFloat(n[a.key]);
                if (!isNaN(val)) { total += val * a.weight / 100; hasAny = true; }
            }
            if (!hasAny) return null;
            const plg = parseFloat(n['plagiasi, dan tidak bisa mengurai AI']);
            const plgPct = isNaN(plg) ? 0 : Math.max(0, Math.min(100, plg));
            return +(total * (1 - plgPct/100)).toFixed(2);
        }

        function gatherAssistantRows(allData, assistantNrp){
            const rows = [];
            if (!allData || !allData.kelompok || !allData.users) return rows;
            const modulTitle = allData.judulPraktikum || {};

            for (const kId in allData.kelompok){
                const k = allData.kelompok[kId];
                const namaKel = k.namaKelompok || '';
                for (const mid in k){
                    if (!/^(W|MP)\d+$/i.test(mid)) continue;
                    const j = k[mid];
                    if (!j || !Array.isArray(j.aslab) || !j.aslab.includes(assistantNrp)) continue;
                    // Praktikan pada kelompok ini
                    for (const uid in allData.users){
                        const u = allData.users[uid];
                        if ((u.kelompokId || '').trim().toLowerCase() !== kId.trim().toLowerCase()) continue;
                        const n = (u.nilai && u.nilai[mid]) || {};
                        const updatedAt = n._updatedAt ? new Date(n._updatedAt).toLocaleString() : '';
                        const by = n._by || '';
                        const cleanMid = mid.toUpperCase();
                        const row = {
                            'Kelompok': kId,
                            'Nama Kelompok': namaKel,
                            'NRP': String(u.nrp || ''),
                            'Nama': u.nama || '',
                            'Modul': cleanMid,
                            'Judul': (modulTitle[cleanMid] && modulTitle[cleanMid].namaJudul) ? modulTitle[cleanMid].namaJudul : (modulTitle[mid] && modulTitle[mid].namaJudul) ? modulTitle[mid].namaJudul : '',
                            'Pre-lab': toNumOrNull(n['pre-lab']),
                            'In-lab': toNumOrNull(n['in-lab']),
                            'Abstrak': toNumOrNull(n['abstrak']),
                            'Pendahuluan': toNumOrNull(n['pendahuluan']),
                            'Metodologi': toNumOrNull(n['metodologi']),
                            'Analisis data dan perhitungan': toNumOrNull(n['analisis data dan perhitungan']),
                            'Pembahasan': toNumOrNull(n['pembahasan']),
                            'Kesimpulan': toNumOrNull(n['kesimpulan']),
                            'Format': toNumOrNull(n['format']),
                            'Plagiasi/AI %': toNumOrNull(n['plagiasi, dan tidak bisa mengurai AI']),
                            'Total (bobot)': computeFinalTotal(n),
                            'Terakhir Diubah': updatedAt,
                            'Diubah Oleh': by,
                            'Catatan': (typeof n.catatan === 'string' ? n.catatan : '')
                        };
                        rows.push(row);
                    }
                }
            }
            // Optional: sort by Kelompok, Modul, NRP
            rows.sort((a,b)=>{
                if (a.Kelompok !== b.Kelompok) return a.Kelompok.localeCompare(b.Kelompok);
                const modNum = m=> {
                    const str = String(m.Modul).toUpperCase();
                    if (str.startsWith('W')) return parseInt(str.substring(1)) || 9999;
                    if (str.startsWith('MP')) return 100 + parseInt(str.substring(2)) || 9999;
                    return parseInt(str.replace(/\D/g,'')) || 9999;
                };
                const d = modNum(a) - modNum(b);
                if (d !== 0) return d;
                return String(a.NRP).localeCompare(String(b.NRP));
            });
            return rows;
        }

        function exportGradesXLSX(allData, assistantNrp){
            try{
                if (typeof XLSX === 'undefined'){ alert('Library XLSX belum termuat. Coba muat ulang halaman.'); return; }
                const rows = gatherAssistantRows(allData, assistantNrp);
                if (!rows.length){ alert('Tidak ada data nilai untuk diunduh.'); return; }
                const ws = XLSX.utils.json_to_sheet(rows, { header: EXPORT_HEADERS, skipHeader: false });
                // Set column widths kasar
                const colWidths = EXPORT_HEADERS.map(h=>({ wch: Math.max(12, String(h).length + 2) }));
                ws['!cols'] = colWidths;
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Nilai Praktikum');
                const ts = new Date();
                const pad = n => String(n).padStart(2,'0');
                const fname = `nilai_${assistantNrp}_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.xlsx`;
                XLSX.writeFile(wb, fname);
            }catch(err){
                console.error('Export XLSX gagal:', err);
                alert('Gagal mengekspor XLSX: ' + (err && err.message ? err.message : err));
            }
        }

        // ===== Export ALL praktikan (tanpa filter aslab) =====
        function gatherAllRows(allData){
            const rows = [];
            if (!allData || !allData.kelompok || !allData.users) return rows;
            const modulTitle = allData.judulPraktikum || {};

            // Map modul per kelompok dari struktur kelompok
            for (const kId in allData.kelompok){
                const k = allData.kelompok[kId];
                const namaKel = k.namaKelompok || '';
                // Ambil semua modul W* dan MP* yang punya entry
                const modulIds = Object.keys(k).filter(mid => /^(W|MP)\d+$/i.test(mid));
                for (const mid of modulIds){
                    // Untuk setiap praktikan yang kelompokId == kId
                    for (const uid in allData.users){
                        const u = allData.users[uid];
                        if ((u.kelompokId || '').trim().toLowerCase() !== kId.trim().toLowerCase()) continue;
                        const n = (u.nilai && u.nilai[mid]) || {};
                        const updatedAt = n._updatedAt ? new Date(n._updatedAt).toLocaleString() : '';
                        const by = n._by || '';
                        const cleanMid = mid.toUpperCase();
                        rows.push({
                            'Kelompok': kId,
                            'Nama Kelompok': namaKel,
                            'NRP': String(u.nrp || ''),
                            'Nama': u.nama || '',
                            'Modul': cleanMid,
                            'Judul': (modulTitle[cleanMid] && modulTitle[cleanMid].namaJudul) ? modulTitle[cleanMid].namaJudul : (modulTitle[mid] && modulTitle[mid].namaJudul) ? modulTitle[mid].namaJudul : '',
                            'Pre-lab': toNumOrNull(n['pre-lab']),
                            'In-lab': toNumOrNull(n['in-lab']),
                            'Abstrak': toNumOrNull(n['abstrak']),
                            'Pendahuluan': toNumOrNull(n['pendahuluan']),
                            'Metodologi': toNumOrNull(n['metodologi']),
                            'Analisis data dan perhitungan': toNumOrNull(n['analisis data dan perhitungan']),
                            'Pembahasan': toNumOrNull(n['pembahasan']),
                            'Kesimpulan': toNumOrNull(n['kesimpulan']),
                            'Format': toNumOrNull(n['format']),
                            'Plagiasi/AI %': toNumOrNull(n['plagiasi, dan tidak bisa mengurai AI']),
                            'Total (bobot)': computeFinalTotal(n),
                            'Terakhir Diubah': updatedAt,
                            'Diubah Oleh': by,
                            'Catatan': (typeof n.catatan === 'string' ? n.catatan : '')
                        });
                    }
                }
            }
            rows.sort((a,b)=>{
                if (a.Kelompok !== b.Kelompok) return a.Kelompok.localeCompare(b.Kelompok);
                const modNum = m=> {
                    const str = String(m.Modul).toUpperCase();
                    if (str.startsWith('W')) return parseInt(str.substring(1)) || 9999;
                    if (str.startsWith('MP')) return 100 + parseInt(str.substring(2)) || 9999;
                    return parseInt(str.replace(/\D/g,'')) || 9999;
                };
                const d = modNum(a) - modNum(b);
                if (d !== 0) return d;
                return String(a.NRP).localeCompare(String(b.NRP));
            });
            return rows;
        }

        function exportAllGradesXLSX(allData){
            try{
                if (typeof XLSX === 'undefined'){ alert('Library XLSX belum termuat. Coba muat ulang halaman.'); return; }
                const rows = gatherAllRows(allData);
                if (!rows.length){ alert('Tidak ada data nilai untuk diunduh.'); return; }
                const ws = XLSX.utils.json_to_sheet(rows, { header: EXPORT_HEADERS_ALL, skipHeader: false });
                ws['!cols'] = EXPORT_HEADERS_ALL.map(h=>({ wch: Math.max(12, String(h).length + 2) }));
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Semua Nilai');
                const ts = new Date();
                const pad = n => String(n).padStart(2,'0');
                const fname = `nilai_semua_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.xlsx`;
                XLSX.writeFile(wb, fname);
            }catch(err){
                console.error('Export XLSX ALL gagal:', err);
                alert('Gagal mengekspor semua nilai: ' + (err && err.message ? err.message : err));
            }
        }

        // Render history for groups handled by the assistant (improved, robust)
        function renderHistory(allData, assistantNrp) {
            console.log("=== renderHistory DEBUG ===");
            console.log("Memulai renderHistory untuk asisten:", assistantNrp);
            console.log("allData tersedia?", !!allData);
            console.log("allData.kelompok tersedia?", !!(allData && allData.kelompok));
            console.log("allData.users tersedia?", !!(allData && allData.users));
            if (allData && allData.kelompok) {
                console.log("Kelompok yang tersedia:", Object.keys(allData.kelompok));
            }
            if (allData && allData.users) {
                console.log("Total users:", Object.keys(allData.users).length);
                // Tampilkan sample kelompokId dari users
                const sampleKelompokIds = new Set();
                for (const uid in allData.users) {
                    const u = allData.users[uid];
                    if (u.kelompokId) sampleKelompokIds.add(u.kelompokId);
                    if (sampleKelompokIds.size >= 10) break;
                }
                console.log("Sample kelompokId dari users:", Array.from(sampleKelompokIds));
            }

            const tbody = document.getElementById('history-body');
            if (!tbody) {
                console.error("tbody dengan id='history-body' tidak ditemukan!");
                return;
            }
            tbody.innerHTML = '';
            const rows = [];

            // Helper urutan modul
            const modulOrder = (m) => {
                if (!m) return 9999;
                const str = String(m).toUpperCase();
                if (str.startsWith('W')) return parseInt(str.substring(1)) || 9999;
                if (str.startsWith('MP')) return 100 + parseInt(str.substring(2)) || 9999;
                return parseInt(str.replace(/[^0-9]/g, '')) || 9999;
            };

            const earliestModPerKelompok = {};

            // --- ITERASI DATA ---
            if (allData && allData.kelompok) {
                for (const kId in allData.kelompok) {
                    const k = allData.kelompok[kId];
                    for (const mid in k) {
                        // Filter key yang bukan modul (misal meta key)
                        if (!/^(W|MP)\d+$/i.test(mid)) continue;

                        const j = k[mid];
                        if (!j) continue;

                        // Normalisasi list aslab agar selalu Array of Strings
                        let aslabList = [];
                        if (Array.isArray(j.aslab)) {
                            aslabList = j.aslab.map(String);
                        } else if (j.aslab) {
                            aslabList = [String(j.aslab)];
                        }

                        // Pastikan assistantNrp juga String untuk perbandingan
                        const currentAslabStr = String(assistantNrp);

                        console.log(`Kelompok: ${kId}, Modul: ${mid}, aslab: ${aslabList.join(', ')}, assistantNrp: ${currentAslabStr}`);

                        if (!aslabList.includes(currentAslabStr)) {
                            console.log(`  → Skip: asisten ${currentAslabStr} tidak dalam list aslab`);
                            continue;
                        }

                        console.log(`  ✓ Asisten matched! Mencari users untuk kelompok ${kId}, modul ${mid}`);

                        const mNum = modulOrder(mid);
                        if (earliestModPerKelompok[kId] === undefined || mNum < earliestModPerKelompok[kId]) {
                            earliestModPerKelompok[kId] = mNum;
                        }

                        // Ambil praktikan
                        if (allData.users) {
                            let usersInKelompok = 0;
                            let usersWithGrade = 0;
                            console.log(`  DEBUG: Checking users for kId="${kId}" (after trim: "${String(kId).trim()}")`);
                            for (const uid in allData.users) {
                                const u = allData.users[uid];
                                const userKelompok = String(u.kelompokId || '').trim().toLowerCase();
                                const targetKelompok = String(kId).trim().toLowerCase();
                                if (userKelompok !== targetKelompok) {
                                    // Hanya log beberapa saja untuk menghindari spam
                                    if (usersInKelompok < 3) {
                                        console.log(`    User ${u.nrp}: kelompokId="${userKelompok}" !== target="${targetKelompok}"`);
                                    }
                                    continue;
                                }
                                
                                usersInKelompok++;
                                const n = (u.nilai && u.nilai[mid]) || {};
                                
                                if (n && Object.keys(n).length > 0) {
                                    usersWithGrade++;
                                    console.log(`    → User ${u.nrp} (${u.nama}) di ${kId}: ada grade`);
                                } else {
                                    console.log(`    → User ${u.nrp} (${u.nama}) di ${kId}: BELUM ada grade`);
                                }

                                const updatedAt = n._updatedAt ? new Date(n._updatedAt).toLocaleString() : '-';

                                let total = 0;
                                let hasAny = false;
                                const parts = [];

                                if (typeof ASPEK !== 'undefined') {
                                    for (const a of ASPEK) {
                                        const val = parseFloat(n[a.key]);
                                        if (!isNaN(val)) {
                                            total += val * a.weight / 100;
                                            hasAny = true;
                                        }
                                        parts.push(`${a.label.split(' ')[0]}:${isNaN(val) ? '-' : val}`);
                                    }
                                }

                                const plg = parseFloat(n['plagiasi, dan tidak bisa mengurai AI']);
                                const plgPct = isNaN(plg) ? 0 : Math.max(0, Math.min(100, plg));
                                const finalTotal = hasAny ? total * (1 - plgPct / 100) : null;
                                const totalStr = hasAny ? (finalTotal ? finalTotal.toFixed(2) : '0.00') : '-';
                                const rincian = parts.concat([`Plagiasi/AI%:${isNaN(plg) ? '-' : plgPct}`]).join(', ');

                                rows.push({ kId, u, mid, totalStr, updatedAt, rincian });
                            }
                            console.log(`  Ringkasan: ${usersInKelompok} user di kelompok, ${usersWithGrade} sudah punya grade`);
                        }
                    }
                }
            }

            console.log("Total baris ditemukan:", rows.length);

            // Sorting
            rows.forEach(r => {
                r._earliest = earliestModPerKelompok[r.kId] ?? 9999;
                r._modNum = modulOrder(r.mid);
            });
            rows.sort((a, b) => {
                if (a._earliest !== b._earliest) return a._earliest - b._earliest;
                if (a.kId !== b.kId) return a.kId.localeCompare(b.kId);
                if (a._modNum !== b._modNum) return a._modNum - b._modNum;
                return String(a.u.nrp).localeCompare(String(b.u.nrp));
            });

            // Render Filter & Table
            const kelompokFilter = document.getElementById('history-kelompok');
            const nrpFilter = document.getElementById('history-nrp');

            const kelompokSet = new Set();
            const nrpByKelompok = {};
            rows.forEach(r => {
                kelompokSet.add(r.kId);
                if (!nrpByKelompok[r.kId]) nrpByKelompok[r.kId] = new Set();
                nrpByKelompok[r.kId].add(r.u.nrp);
            });

            if (kelompokFilter) {
                const oldValue = kelompokFilter.value;
                const options = Array.from(kelompokSet).sort().map(kId => `<option value="${kId}">${kId}</option>`).join('');
                kelompokFilter.innerHTML = `<option value="">Semua Kelompok</option>${options}`;
                if (oldValue && kelompokSet.has(oldValue)) kelompokFilter.value = oldValue;
            }

            const renderTableContent = (filteredRows) => {
                if (filteredRows.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada data penilaian untuk asisten ini.</td></tr>';
                    return;
                }
                tbody.innerHTML = filteredRows.map(r => {
                    return `<tr>
                <td>${r.updatedAt}</td>
                <td>${r.kId}</td>
                <td>${r.u.nrp}</td>
                <td>${r.u.nama}</td>
                <td>${r.mid}</td>
                <td title="${r.rincian}">${r.totalStr}</td>
                <td><button class="cancel-grade" data-nrp="${r.u.nrp}" data-modul="${r.mid}">Batalkan Nilai</button></td>
            </tr>`;
                }).join('');
            };

            function populateNrpOptions(kelompokId) {
                if (!nrpFilter) return;
                if (!kelompokId) {
                    nrpFilter.innerHTML = '<option value="">Semua NRP</option>';
                    nrpFilter.disabled = true;
                    return;
                }
                const list = Array.from(nrpByKelompok[kelompokId] || []).sort();
                const oldVal = nrpFilter.value;
                nrpFilter.innerHTML = '<option value="">Semua NRP</option>' +
                    list.map(nrp => `<option value="${nrp}">${nrp}</option>`).join('');
                nrpFilter.disabled = false;
                if (oldVal && list.includes(oldVal)) nrpFilter.value = oldVal;
            }

            function applyFiltersAndRender() {
                const kVal = kelompokFilter ? kelompokFilter.value : '';
                const nrpVal = nrpFilter ? nrpFilter.value : '';
                const filtered = rows.filter(r => {
                    if (kVal && r.kId !== kVal) return false;
                    if (nrpVal && String(r.u.nrp) !== nrpVal) return false;
                    return true;
                });
                renderTableContent(filtered);
            }

            if (kelompokFilter) {
                kelompokFilter.onchange = () => {
                    populateNrpOptions(kelompokFilter.value);
                    applyFiltersAndRender();
                };
            }
            if (nrpFilter) {
                nrpFilter.onchange = () => {
                    applyFiltersAndRender();
                };
            }

            // Render Awal
            populateNrpOptions(kelompokFilter ? kelompokFilter.value : '');
            applyFiltersAndRender();

            // Delegasi klik pembatalan nilai (preserve original behavior)
            tbody.addEventListener('click', (e) => {
                const btn = e.target && e.target.closest('.cancel-grade');
                if (!btn) return;
                const nrp = btn.dataset.nrp; const mid = btn.dataset.modul;
                if (!confirm(`Batalkan nilai ${mid} untuk ${nrp}?`)) return;
                const ref = database.ref(`users/${nrp}/nilai/${mid}`);
                ref.update({
                    'pre-lab': null,
                    'in-lab': null,
                    'abstrak': null,
                    'pendahuluan': null,
                    'metodologi': null,
                    'analisis data dan perhitungan': null,
                    'pembahasan': null,
                    'kesimpulan': null,
                    'format': null,
                    'plagiasi, dan tidak bisa mengurai AI': null,
                    'total': null,
                    'catatan': null,
                    _updatedAt: null,
                    _by: null
                })
                    .then(() => ref.once('value'))
                    .then(snap => {
                        const val = snap.val() || {};
                        const keys = ['pre-lab', 'in-lab', 'abstrak', 'pendahuluan', 'metodologi', 'analisis data dan perhitungan', 'pembahasan', 'kesimpulan', 'format', 'plagiasi, dan tidak bisa mengurai AI', 'total', '_updatedAt', '_by', 'catatan'];
                        const still = keys.filter(k => Object.prototype.hasOwnProperty.call(val, k));
                        if (still.length) {
                            keys.forEach(k => ref.child(k).remove().catch(() => { }));
                        }
                        // Refresh baris tanpa reload penuh
                        const tr = btn.closest('tr');
                        if (tr) tr.querySelectorAll('td')[5].textContent = '-';
                    })
                    .catch(err => alert('Gagal membatalkan nilai: ' + (err && err.message ? err.message : err)));
            });
        }

        document.addEventListener('DOMContentLoaded', ()=>{
            const loggedInNrp = localStorage.getItem('fislab-nrp');
            if (!loggedInNrp){ alert('Anda belum login.'); window.location.href='index.html'; return; }
            database.ref('users/'+loggedInNrp).once('value', (snap)=>{
                if (!snap.exists()){ alert('Data pengguna tidak ditemukan.'); window.location.href='index.html'; return; }
                const user = snap.val();
        if (user.role) localStorage.setItem('fislab-role', user.role);
                ensureAssistantOrRedirect();
                database.ref('/').once('value', (dbSnap)=>{
                    if (dbSnap.exists()){
                        const allData = dbSnap.val();
                        // Cache untuk eksport
                        window._allDataCache = allData;
                        window._assistantNrp = loggedInNrp;
                        // Enable tombol export
                        const exportBtn = document.getElementById('export-xlsx');
                        const exportAllBtn = document.getElementById('export-xlsx-all');
                        if (exportBtn){
                            exportBtn.disabled = false;
                            exportBtn.addEventListener('click', ()=> exportGradesXLSX(allData, loggedInNrp));
                        }
                        if (exportAllBtn){
                            exportAllBtn.disabled = false;
                            exportAllBtn.addEventListener('click', ()=> exportAllGradesXLSX(allData));
                        }

                        populateFormOptions(allData, loggedInNrp);
                        renderHistory(allData, loggedInNrp);
                        wireAutoSaveInputs();
                        // Cegah submit default (Enter) karena autosave sudah aktif
                        const form = document.getElementById('assessment-form');
                        form.addEventListener('submit', e => e.preventDefault());
                    }
                });
            });
        });
  
